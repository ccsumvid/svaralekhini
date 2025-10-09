class SvaraScribe {
    constructor() {
        this.audioContext = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.analyser = null;
        this.pitchDetector = null;
        this.droneOscillator = null;
        this.droneGain = null;
        this.isDronePlaying = false;
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.pitchData = [];
        this.timeData = [];
        this.syllables = [];
        this.currentSyllableIndex = 0;
        this.liveNotation = [];
        this.lastNoteTime = 0;
        this.currentNote = null;
        
        // Pitch stabilization
        this.recentPitches = [];
        this.stablePitch = null;
        
        // Initialize language support
        this.languageSupport = new LanguageSupport();
        
        // Carnatic swarasthana ratios (12 notes)
        this.swaraRatios = {
            'Sa': 1.0,      // Shadja
            'Ri1': 16/15,   // Shuddha Rishabha
            'Ri2': 9/8,     // Chatushruti Rishabha
            'Ga1': 6/5,     // Sadharana Gandhara
            'Ga2': 5/4,     // Antara Gandhara
            'Ma1': 4/3,     // Shuddha Madhyama
            'Ma2': 45/32,   // Prati Madhyama
            'Pa': 3/2,      // Panchama
            'Dha1': 8/5,    // Shuddha Dhaivata
            'Dha2': 5/3,    // Chatushruti Dhaivata
            'Ni1': 16/9,    // Kaisiki Nishada
            'Ni2': 15/8     // Kakali Nishada
        };

        this.westernNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.carnaticNotes = ['Sa', 'Ri1', 'Ri2', 'Ga1', 'Ga2', 'Ma1', 'Ma2', 'Pa', 'Dha1', 'Dha2', 'Ni1', 'Ni2'];
        
        this.initializeEventListeners();
        this.setupCanvas();
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            return false;
        }
    }

    initializeEventListeners() {
        document.getElementById('startRecord').addEventListener('click', () => this.startRecording());
        document.getElementById('stopRecord').addEventListener('click', () => this.stopRecording());
        document.getElementById('playback').addEventListener('click', () => this.playback());
        document.getElementById('toggleDrone').addEventListener('click', () => this.toggleDrone());
        document.getElementById('exportAudio').addEventListener('click', () => this.exportAudio());
        document.getElementById('exportNotation').addEventListener('click', () => this.exportNotation());
        document.getElementById('lyricsInput').addEventListener('input', () => this.processLyrics());
        
        // Progressive disclosure for notation style
        document.getElementById('notationStyle').addEventListener('change', () => this.handleNotationStyleChange());
        
        // Help modal
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        document.querySelector('.close').addEventListener('click', () => this.hideHelp());
        document.getElementById('helpModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('helpModal')) this.hideHelp();
        });
        
        // Clear live notation
        document.getElementById('clearLive').addEventListener('click', () => this.clearLiveNotation());
        
        // Initialize UI state
        this.handleNotationStyleChange();
    }

    toggleDrone() {
        if (this.isDronePlaying) {
            this.stopDrone();
        } else {
            this.playDrone();
        }
    }

    playDrone() {
        if (!this.audioContext) {
            this.initializeAudio();
        }
        
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        
        this.droneOscillator = this.audioContext.createOscillator();
        this.droneGain = this.audioContext.createGain();
        
        this.droneOscillator.frequency.setValueAtTime(basePitch, this.audioContext.currentTime);
        this.droneOscillator.type = 'sine';
        
        this.droneGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        this.droneOscillator.connect(this.droneGain);
        this.droneGain.connect(this.audioContext.destination);
        
        this.droneOscillator.start();
        this.isDronePlaying = true;
        
        // Update button appearance
        this.updateDroneButton();
        
        // Check for volume issues after a brief delay
        setTimeout(() => this.checkVolumeLevel(), 1000);
    }

    stopDrone() {
        if (this.droneOscillator) {
            this.droneOscillator.stop();
            this.droneOscillator = null;
            this.droneGain = null;
            this.isDronePlaying = false;
            
            // Update button appearance
            this.updateDroneButton();
        }
    }

    updateDroneButton() {
        const button = document.getElementById('toggleDrone');
        const icon = button?.querySelector('.btn-icon');
        const text = button?.querySelector('.btn-text');
        
        if (!button || !icon || !text) {
            console.error('Drone button elements not found:', { button, icon, text });
            return;
        }
        
        if (this.isDronePlaying) {
            icon.textContent = '⏹️';
            text.textContent = 'Stop';
            button.classList.add('btn-active');
        } else {
            icon.textContent = '▶️';
            text.textContent = 'Play';
            button.classList.remove('btn-active');
        }
    }

    handleNotationStyleChange() {
        const notationStyle = document.getElementById('notationStyle').value;
        const basePitchCard = document.getElementById('basePitchCard');
        
        if (notationStyle === 'western') {
            basePitchCard.classList.add('hidden');
            basePitchCard.style.opacity = '0.3';
            basePitchCard.style.pointerEvents = 'none';
        } else {
            basePitchCard.classList.remove('hidden');
            basePitchCard.style.opacity = '1';
            basePitchCard.style.pointerEvents = 'auto';
        }
    }

    clearLiveNotation() {
        this.liveNotation = [];
        this.currentNote = null;
        document.getElementById('liveNotation').innerHTML = '';
    }

    showHelp() {
        document.getElementById('helpModal').style.display = 'block';
    }

    hideHelp() {
        document.getElementById('helpModal').style.display = 'none';
    }

    // Test function - call this from browser console: app.testPitchDetection()
    testPitchDetection() {
        console.log('Testing pitch detection with current base pitch:');
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        console.log(`Base pitch: ${basePitch}Hz`);
        
        const expectedResults = [
            { freq: basePitch * 1.0, expected: 'Sa', octave: 0 },
            { freq: basePitch * 16/15, expected: 'Ri1', octave: 0 },
            { freq: basePitch * 9/8, expected: 'Ri2', octave: 0 },
            { freq: basePitch * 6/5, expected: 'Ga1', octave: 0 },
            { freq: basePitch * 5/4, expected: 'Ga2', octave: 0 },
            { freq: basePitch * 4/3, expected: 'Ma1', octave: 0 },
            { freq: basePitch * 45/32, expected: 'Ma2', octave: 0 },
            { freq: basePitch * 3/2, expected: 'Pa', octave: 0 },
            { freq: basePitch * 8/5, expected: 'Dha1', octave: 0 },
            { freq: basePitch * 5/3, expected: 'Dha2', octave: 0 },
            { freq: basePitch * 16/9, expected: 'Ni1', octave: 0 },
            { freq: basePitch * 15/8, expected: 'Ni2', octave: 0 },
            { freq: basePitch * 2.0, expected: 'Sa', octave: 1 },
            { freq: basePitch * 0.5, expected: 'Sa', octave: -1 },
        ];
        
        let errors = 0;
        expectedResults.forEach(test => {
            const result = this.frequencyToSvara(test.freq);
            const correct = result.svara === test.expected && result.octave === test.octave;
            
            if (!correct) {
                console.error(`❌ ${test.freq.toFixed(1)}Hz: Expected ${test.expected} (octave ${test.octave}), got ${result.svara} (octave ${result.octave})`);
                errors++;
            } else {
                console.log(`✅ ${test.freq.toFixed(1)}Hz -> ${result.svara} (octave ${result.octave})`);
            }
        });
        
        console.log(`\n=== TEST SUMMARY ===`);
        console.log(`Total tests: ${expectedResults.length}`);
        console.log(`Passed: ${expectedResults.length - errors}`);
        console.log(`Failed: ${errors}`);
        
        if (errors > 0) {
            console.log('\n🐛 BUGS FOUND - Check the failed tests above');
        } else {
            console.log('\n✅ All tests passed!');
        }
        
        return errors === 0;
    }

    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = 200;
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    async startRecording() {
        if (!this.audioContext) {
            const initialized = await this.initializeAudio();
            if (!initialized) return;
        }

        this.recordedChunks = [];
        this.pitchData = [];
        this.timeData = [];
        this.liveNotation = [];
        this.lastNoteTime = Date.now();
        this.currentNote = null;
        
        // Reset pitch stabilization
        this.recentPitches = [];
        this.stablePitch = null;
        
        // Clear live notation display
        document.getElementById('liveNotation').innerHTML = '';
        
        this.mediaRecorder.start();
        this.isRecording = true;
        
        document.getElementById('startRecord').disabled = true;
        document.getElementById('stopRecord').disabled = false;
        
        this.startPitchDetection();
    }

    stopRecording() {
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        document.getElementById('startRecord').disabled = false;
        document.getElementById('stopRecord').disabled = true;
        document.getElementById('playback').disabled = false;
        document.getElementById('exportAudio').disabled = false;
        
        this.stopPitchDetection();
        
        // Automatically analyze and display synchronized notation
        this.displaySynchronizedAnalysis();
    }

    displaySynchronizedAnalysis() {
        if (this.syllables.length === 0) return; // No lyrics to sync with
        
        const filteredData = this.filterPitchData();
        this.displayAnalysis(filteredData);
    }

    startPitchDetection() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        
        const detectPitch = () => {
            if (!this.isRecording) return;
            
            this.analyser.getFloatTimeDomainData(dataArray);
            
            try {
                let pitch;
                if (typeof Pitchy !== 'undefined' && Pitchy.findPitch) {
                    pitch = Pitchy.findPitch(dataArray, this.audioContext.sampleRate);
                } else {
                    // Fallback: simple autocorrelation pitch detection
                    pitch = this.simpleAutocorrelation(dataArray, this.audioContext.sampleRate);
                }
                
                if (pitch && pitch > 80 && pitch < 2000) {
                    // Check if this is likely background noise
                    if (this.isBackgroundNoise(pitch, dataArray)) {
                        requestAnimationFrame(detectPitch);
                        return; // Skip this pitch detection but continue loop
                    }
                    
                    // Stabilize pitch to reduce fluctuations
                    const stabilizedPitch = this.stabilizePitch(pitch);
                    if (!stabilizedPitch) {
                        requestAnimationFrame(detectPitch);
                        return;
                    }
                    
                    const svaraData = this.frequencyToSvara(stabilizedPitch);
                    const currentTime = Date.now();
                    
                    // Add to pitch data
                    this.pitchData.push({ pitch: stabilizedPitch, svara: svaraData.svara, svaraIndex: svaraData.index, octave: svaraData.octave, time: currentTime });
                    
                    // Update live notation
                    this.updateLiveNotation(svaraData, currentTime);
                    
                    // Update visualization
                    this.updateVisualization(stabilizedPitch, svaraData);
                }
            } catch (error) {
                console.error('Pitch detection error:', error);
                // Continue even if there's an error
            }
            
            requestAnimationFrame(detectPitch);
        };
        
        detectPitch();
    }

    // Simple autocorrelation fallback for pitch detection
    simpleAutocorrelation(buffer, sampleRate) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        let bestOffset = -1;
        let bestCorrelation = 0;
        let rms = 0;
        
        for (let i = 0; i < SIZE; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        
        if (rms < 0.01) return null; // Too quiet
        
        let lastCorrelation = 1;
        for (let offset = 1; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;
            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
            }
            correlation = 1 - (correlation / MAX_SAMPLES);
            
            if (correlation > 0.9 && correlation > lastCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
            lastCorrelation = correlation;
        }
        
        if (bestCorrelation > 0.01 && bestOffset !== -1) {
            return sampleRate / bestOffset;
        }
        return null;
    }

    stabilizePitch(pitch) {
        // Keep track of recent pitches for stabilization
        this.recentPitches.push(pitch);
        
        // Keep only last 5 pitches
        if (this.recentPitches.length > 5) {
            this.recentPitches.shift();
        }
        
        // Need at least 3 readings for stabilization
        if (this.recentPitches.length < 3) {
            return null;
        }
        
        // Calculate median pitch (more stable than average)
        const sortedPitches = [...this.recentPitches].sort((a, b) => a - b);
        const medianPitch = sortedPitches[Math.floor(sortedPitches.length / 2)];
        
        // Check if pitches are reasonably stable (within 20% variance)
        const maxVariance = medianPitch * 0.20; // 20% tolerance
        const isStable = this.recentPitches.every(p => Math.abs(p - medianPitch) <= maxVariance);
        
        if (isStable) {
            this.stablePitch = medianPitch;
            return medianPitch;
        }
        
        // If not stable, return previous stable pitch if available
        return this.stablePitch;
    }

    isBackgroundNoise(pitch, audioBuffer) {
        // Calculate RMS (volume level)
        let rms = 0;
        for (let i = 0; i < audioBuffer.length; i++) {
            rms += audioBuffer[i] * audioBuffer[i];
        }
        rms = Math.sqrt(rms / audioBuffer.length);
        
        // Much stricter filtering for background noise
        if (rms < 0.015) return true; // Increased from 0.005
        
        // Fan noise is typically low frequency and consistent
        if (pitch < 150 && rms < 0.03) return true; // Broader low-freq filter
        
        // Check for repetitive patterns (fan noise characteristic)
        if (this.pitchData.length > 8) {
            const recentPitches = this.pitchData.slice(-8).map(d => d.pitch);
            const avgPitch = recentPitches.reduce((a, b) => a + b, 0) / recentPitches.length;
            
            // If last 8 pitches are very similar (fan noise pattern)
            const allSimilar = recentPitches.every(p => Math.abs(p - avgPitch) < 20);
            if (allSimilar && rms < 0.025) return true;
            
            // Check for same svara repetition
            const recentSvaras = this.pitchData.slice(-6).map(d => d.svara);
            const sameSvara = recentSvaras.every(s => s === recentSvaras[0]);
            if (sameSvara && rms < 0.02) return true;
        }
        
        return false;
    }

    stopPitchDetection() {
        // Pitch detection stops automatically when isRecording becomes false
    }

    frequencyToSvara(frequency) {
        const notationStyle = document.getElementById('notationStyle').value;
        
        if (notationStyle === 'western') {
            return this.frequencyToWesternNote(frequency);
        } else {
            return this.frequencyToCarnaticSvara(frequency);
        }
    }

    frequencyToWesternNote(frequency) {
        // Western notes use absolute frequencies (A4 = 440Hz reference)
        const A4 = 440.0;
        
        // Calculate semitones from A4
        const semitones = Math.round(12 * Math.log2(frequency / A4));
        
        // Determine octave
        const octave = Math.floor(semitones / 12) + 4; // A4 is octave 4
        
        // Get note within octave (0-11, where 0 = A)
        let noteIndex = ((semitones % 12) + 12) % 12;
        
        // Western note names starting from A
        const westernNotes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
        
        return {
            svara: westernNotes[noteIndex],
            index: noteIndex,
            octave: octave - 4 // Relative to A4
        };
    }

    frequencyToCarnaticSvara(frequency) {
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        let ratio = frequency / basePitch;
        
        // Determine octave and normalize ratio to 1-2 range
        let octave = 0;
        
        // Handle lower octaves
        while (ratio < 1.0) {
            ratio *= 2.0;
            octave--;
        }
        
        // Handle higher octaves  
        while (ratio >= 2.0) {
            ratio /= 2.0;
            octave++;
        }
        
        // Now ratio is between 1.0 and 2.0, find closest svara
        let closestSvara = 'Sa';
        let closestIndex = 0;
        let minDifference = Math.abs(ratio - 1.0);
        
        // Equal temperament ratios for Carnatic svaras
        const swaraArray = [
            { svara: 'Sa', ratio: 1.0, index: 0 },
            { svara: 'Ri1', ratio: Math.pow(2, 1/12), index: 1 },
            { svara: 'Ri2', ratio: Math.pow(2, 2/12), index: 2 },
            { svara: 'Ga1', ratio: Math.pow(2, 3/12), index: 3 },
            { svara: 'Ga2', ratio: Math.pow(2, 4/12), index: 4 },
            { svara: 'Ma1', ratio: Math.pow(2, 5/12), index: 5 },
            { svara: 'Ma2', ratio: Math.pow(2, 6/12), index: 6 },
            { svara: 'Pa', ratio: Math.pow(2, 7/12), index: 7 },
            { svara: 'Dha1', ratio: Math.pow(2, 8/12), index: 8 },
            { svara: 'Dha2', ratio: Math.pow(2, 9/12), index: 9 },
            { svara: 'Ni1', ratio: Math.pow(2, 10/12), index: 10 },
            { svara: 'Ni2', ratio: Math.pow(2, 11/12), index: 11 }
        ];
        
        // Find closest match
        swaraArray.forEach((swaraData) => {
            const difference = Math.abs(ratio - swaraData.ratio);
            if (difference < minDifference) {
                minDifference = difference;
                closestSvara = swaraData.svara;
                closestIndex = swaraData.index;
            }
        });
        
        return { svara: closestSvara, index: closestIndex, octave: octave };
    }

    updateVisualization(pitch, svaraData) {
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        
        // Calculate pitch deviation
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        const { displayNote, deviation } = this.calculatePitchDeviation(pitch, svaraData, basePitch, notationStyle, language);
        
        // Update pitch display
        document.getElementById('pitchDisplay').textContent = displayNote;
        document.getElementById('pitchDeviation').textContent = `${pitch.toFixed(1)} Hz ${deviation}`;
        
        // Clear and redraw canvas (smaller now)
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pitch history
        if (this.pitchData.length > 1) {
            this.ctx.strokeStyle = '#28a745';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            const maxPoints = 50; // Fewer points for smaller canvas
            const recentData = this.pitchData.slice(-maxPoints);
            
            recentData.forEach((data, index) => {
                const x = (index / maxPoints) * this.canvas.width;
                const y = this.canvas.height - ((data.pitch - 200) / 600) * this.canvas.height;
                
                if (index === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            
            this.ctx.stroke();
        }
    }

    calculatePitchDeviation(pitch, svaraData, basePitch, notationStyle, language) {
        // Get expected frequency for this svara
        const swaraArray = [
            { svara: 'Sa', ratio: 1.0, index: 0 },
            { svara: 'Ri1', ratio: 16/15, index: 1 },
            { svara: 'Ri2', ratio: 9/8, index: 2 },
            { svara: 'Ga1', ratio: 6/5, index: 3 },
            { svara: 'Ga2', ratio: 5/4, index: 4 },
            { svara: 'Ma1', ratio: 4/3, index: 5 },
            { svara: 'Ma2', ratio: 45/32, index: 6 },
            { svara: 'Pa', ratio: 3/2, index: 7 },
            { svara: 'Dha1', ratio: 8/5, index: 8 },
            { svara: 'Dha2', ratio: 5/3, index: 9 },
            { svara: 'Ni1', ratio: 16/9, index: 10 },
            { svara: 'Ni2', ratio: 15/8, index: 11 }
        ];
        
        const currentSvara = swaraArray[svaraData.index];
        const expectedFreq = basePitch * currentSvara.ratio * Math.pow(2, svaraData.octave);
        const deviation = ((pitch - expectedFreq) / expectedFreq) * 100;
        
        let displayNote;
        if (notationStyle === 'western') {
            displayNote = this.westernNotes[svaraData.index % 12];
        } else {
            displayNote = this.languageSupport.getFormattedSvara(svaraData.index, language, svaraData.octave);
        }
        
        let deviationText;
        if (Math.abs(deviation) < 5) {
            deviationText = '✓'; // Perfect pitch
        } else if (deviation < -50) {
            // Show next lower note with positive deviation
            const lowerIndex = (svaraData.index - 1 + 12) % 12;
            const lowerOctave = svaraData.index === 0 ? svaraData.octave - 1 : svaraData.octave;
            const lowerSvara = swaraArray[lowerIndex];
            const lowerExpectedFreq = basePitch * lowerSvara.ratio * Math.pow(2, lowerOctave);
            const lowerDeviation = ((pitch - lowerExpectedFreq) / lowerExpectedFreq) * 100;
            
            if (notationStyle === 'western') {
                displayNote = this.westernNotes[lowerIndex % 12];
            } else {
                displayNote = this.languageSupport.getFormattedSvara(lowerIndex, language, lowerOctave);
            }
            deviationText = `+${Math.round(lowerDeviation)}%`;
        } else if (deviation > 50) {
            // Show next higher note with negative deviation
            const higherIndex = (svaraData.index + 1) % 12;
            const higherOctave = svaraData.index === 11 ? svaraData.octave + 1 : svaraData.octave;
            const higherSvara = swaraArray[higherIndex];
            const higherExpectedFreq = basePitch * higherSvara.ratio * Math.pow(2, higherOctave);
            const higherDeviation = ((pitch - higherExpectedFreq) / higherExpectedFreq) * 100;
            
            if (notationStyle === 'western') {
                displayNote = this.westernNotes[higherIndex % 12];
            } else {
                displayNote = this.languageSupport.getFormattedSvara(higherIndex, language, higherOctave);
            }
            deviationText = `${Math.round(higherDeviation)}%`;
        } else {
            // Show current note with deviation
            deviationText = `${deviation > 0 ? '+' : ''}${Math.round(deviation)}%`;
        }
        
        return { displayNote, deviation: deviationText };
    }

    svaraToWestern(svara) {
        const svaraIndex = this.carnaticNotes.indexOf(svara);
        return svaraIndex !== -1 ? this.westernNotes[svaraIndex] : 'C';
    }

    checkVolumeLevel() {
        // Create a test tone to detect if audio is working
        if (!this.audioContext || !this.droneOscillator) return;
        
        // Create analyser to check if audio is actually playing
        const analyser = this.audioContext.createAnalyser();
        this.droneGain.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        // Check if there's any audio output
        const hasAudioOutput = dataArray.some(value => value > 0);
        
        if (!hasAudioOutput) {
            this.showVolumeWarning();
        }
    }

    showVolumeWarning() {
        // Create and show volume warning
        const warning = document.createElement('div');
        warning.className = 'volume-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">🔇</span>
                <div class="warning-text">
                    <strong>Can't hear the drone?</strong>
                    <p>Please check your system volume or unmute your device</p>
                </div>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 5000);
    }

    playback() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
    }

    analyzeRecording() {
        // Filter out brief notes and detect glides
        const filteredData = this.filterPitchData();
        this.displayAnalysis(filteredData);
        document.getElementById('exportNotation').disabled = false;
    }

    filterPitchData() {
        const minDuration = 100; // ms - ignore notes shorter than this
        const filtered = [];
        
        for (let i = 0; i < this.pitchData.length; i++) {
            const current = this.pitchData[i];
            const next = this.pitchData[i + 1];
            
            if (next && (next.time - current.time) >= minDuration) {
                // Check for glides
                const pitchDiff = Math.abs(next.pitch - current.pitch);
                const isGlide = pitchDiff > 20; // Hz threshold for glide detection
                
                filtered.push({
                    ...current,
                    duration: next.time - current.time,
                    isGlide: isGlide
                });
            }
        }
        
        return filtered;
    }

    processLyrics() {
        const lyrics = document.getElementById('lyricsInput').value;
        const language = document.getElementById('language').value;
        
        // Split into syllables using language-aware method
        this.syllables = this.languageSupport.splitIntoSyllables(lyrics, language);
        
        // Auto IAST transliteration for Indic languages
        if (language !== 'english') {
            this.syllablesIAST = this.syllables.map(syllable => 
                this.languageSupport.transliterateToIAST(syllable, language)
            );
        } else {
            this.syllablesIAST = this.syllables;
        }
        
        this.displaySyllablesPreview();
    }

    displaySyllablesPreview() {
        const syllableDisplay = document.getElementById('syllableDisplay');
        const language = document.getElementById('language').value;
        
        syllableDisplay.innerHTML = '<h4>Lyrics Preview:</h4>';
        
        this.syllables.forEach((syllable, index) => {
            const syllableDiv = document.createElement('div');
            syllableDiv.className = 'syllable';
            syllableDiv.id = `syllable-${index}`;
            
            const iast = language !== 'english' ? this.syllablesIAST[index] : '';
            
            syllableDiv.innerHTML = `
                <div>${syllable}</div>
                ${iast ? `<div style="font-size: 12px; color: #666;">${iast}</div>` : ''}
                <div class="svara" id="svara-${index}">-</div>
            `;
            
            syllableDisplay.appendChild(syllableDiv);
        });
    }

    displayAnalysis(data) {
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        const syllableDisplay = document.getElementById('syllableDisplay');
        
        syllableDisplay.innerHTML = '<h3>🎯 Synchronized Notation</h3>';
        
        // Use liveNotation data instead of filtered data to preserve all notes
        const notesToDisplay = this.liveNotation.length > 0 ? this.liveNotation : data;
        
        // Smart initial mapping based on note count vs syllable count
        if (!this.syllableNoteMapping || this.syllableNoteMapping.length !== this.syllables.length) {
            this.syllableNoteMapping = this.createSmartMapping(notesToDisplay.length, this.syllables.length);
        }
        
        // Create container for interactive notation
        const notationContainer = document.createElement('div');
        notationContainer.className = 'interactive-notation';
        notationContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${notesToDisplay.length}, 1fr);
            gap: 10px;
            margin: 20px 0;
            align-items: start;
            position: relative;
        `;
        
        // Create note positions
        const noteElements = [];
        notesToDisplay.forEach((noteData, noteIndex) => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-position';
            noteDiv.style.cssText = `
                text-align: center;
                padding: 10px 5px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--bg-card);
                min-height: 80px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            `;
            
            // Get display note - use existing displayNote if available (from liveNotation)
            let displayNote;
            if (noteData.displayNote) {
                displayNote = noteData.displayNote;
            } else {
                // Fallback for filtered data
                if (notationStyle === 'western') {
                    displayNote = this.westernNotes[noteData.svaraIndex % 12];
                } else {
                    displayNote = this.languageSupport.getFormattedSvara(noteData.svaraIndex, language, noteData.octave);
                    displayNote = this.languageSupport.formatDuration(displayNote, noteData.duration);
                }
            }
            
            const glideIndicator = noteData.isGlide ? ' ~' : '';
            noteDiv.innerHTML = `
                <div class="note-content" style="font-size: 14px; font-weight: bold; color: var(--text-primary);">
                    ${displayNote}${glideIndicator}
                </div>
                <div class="note-timing" style="font-size: 10px; color: var(--text-muted); margin-top: 5px;">
                    ${Math.round(noteData.duration)}ms
                </div>
            `;
            
            noteElements.push(noteDiv);
            notationContainer.appendChild(noteDiv);
        });
        
        // Create syllable elements
        this.syllables.forEach((syllable, syllableIndex) => {
            const syllableDiv = document.createElement('div');
            syllableDiv.className = 'syllable-interactive';
            syllableDiv.dataset.syllableIndex = syllableIndex;
            syllableDiv.style.cssText = `
                position: absolute;
                background: var(--success);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
                cursor: move;
                user-select: none;
                box-shadow: var(--shadow);
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 5px;
            `;
            
            const iast = language !== 'english' ? this.syllablesIAST[syllableIndex] : '';
            syllableDiv.innerHTML = `
                <button class="move-btn" data-direction="left" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px;">◀</button>
                <div style="text-align: center;">
                    <div>${syllable}</div>
                    ${iast ? `<div style="font-size: 10px; opacity: 0.8;">${iast}</div>` : ''}
                </div>
                <button class="move-btn" data-direction="right" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px;">▶</button>
            `;
            
            notationContainer.appendChild(syllableDiv);
        });
        
        syllableDisplay.appendChild(notationContainer);
        
        // Position syllables after DOM is ready
        setTimeout(() => this.positionSyllables(notationContainer, noteElements), 0);
        
        // Add event listeners for moving syllables
        this.addSyllableMoveListeners(notationContainer, noteElements);
    }
    
    createSmartMapping(noteCount, syllableCount) {
        const mapping = [];
        
        if (syllableCount <= noteCount) {
            // Distribute syllables evenly across notes
            const step = noteCount / syllableCount;
            for (let i = 0; i < syllableCount; i++) {
                mapping.push(Math.floor(i * step));
            }
        } else {
            // More syllables than notes - map multiple syllables to some notes
            for (let i = 0; i < syllableCount; i++) {
                mapping.push(Math.floor(i * noteCount / syllableCount));
            }
        }
        
        return mapping;
    }
    
    positionSyllables(container, noteElements) {
        const syllableElements = container.querySelectorAll('.syllable-interactive');
        
        syllableElements.forEach((syllableDiv) => {
            const syllableIndex = parseInt(syllableDiv.dataset.syllableIndex);
            const noteIndex = this.syllableNoteMapping[syllableIndex];
            
            if (noteIndex < noteElements.length) {
                const noteElement = noteElements[noteIndex];
                const rect = noteElement.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Position syllable directly below its corresponding note
                const leftPosition = rect.left - containerRect.left + (rect.width / 2) - 40; // Center align
                syllableDiv.style.left = `${leftPosition}px`;
                syllableDiv.style.top = `80px`; // Below the notes
            }
        });
    }
    
    addSyllableMoveListeners(container, noteElements) {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('move-btn')) {
                const syllableDiv = e.target.closest('.syllable-interactive');
                const syllableIndex = parseInt(syllableDiv.dataset.syllableIndex);
                const direction = e.target.dataset.direction;
                
                this.moveSyllable(syllableIndex, direction, container, noteElements);
            }
        });
    }
    
    moveSyllable(syllableIndex, direction, container, noteElements) {
        const currentNoteIndex = this.syllableNoteMapping[syllableIndex];
        let newNoteIndex = currentNoteIndex;
        
        if (direction === 'left' && currentNoteIndex > 0) {
            newNoteIndex = currentNoteIndex - 1;
        } else if (direction === 'right' && currentNoteIndex < noteElements.length - 1) {
            newNoteIndex = currentNoteIndex + 1;
        }
        
        if (newNoteIndex !== currentNoteIndex) {
            // Update mapping
            this.syllableNoteMapping[syllableIndex] = newNoteIndex;
            
            // Auto-align other syllables
            this.autoAlignSyllables();
            
            // Refresh display
            this.refreshSyllablePositions(container, noteElements);
        }
    }
    
    autoAlignSyllables() {
        // Sort syllables by their current note positions
        const sortedSyllables = this.syllables.map((_, index) => ({
            syllableIndex: index,
            noteIndex: this.syllableNoteMapping[index]
        })).sort((a, b) => a.noteIndex - b.noteIndex);
        
        // Reassign positions to avoid conflicts
        const usedPositions = new Set();
        sortedSyllables.forEach(({ syllableIndex, noteIndex }) => {
            let finalPosition = noteIndex;
            
            // Find next available position if current is taken
            while (usedPositions.has(finalPosition)) {
                finalPosition++;
            }
            
            this.syllableNoteMapping[syllableIndex] = finalPosition;
            usedPositions.add(finalPosition);
        });
    }
    
    refreshSyllablePositions(container, noteElements) {
        const syllableElements = container.querySelectorAll('.syllable-interactive');
        
        syllableElements.forEach((syllableDiv) => {
            const syllableIndex = parseInt(syllableDiv.dataset.syllableIndex);
            const noteIndex = this.syllableNoteMapping[syllableIndex];
            
            if (noteIndex < noteElements.length) {
                const noteElement = noteElements[noteIndex];
                const rect = noteElement.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                syllableDiv.style.transition = 'all 0.3s ease';
                const leftPosition = rect.left - containerRect.left + (rect.width / 2) - 40;
                syllableDiv.style.left = `${leftPosition}px`;
                syllableDiv.style.top = `80px`;
            }
        });
    }

    updateLiveNotation(svaraData, currentTime) {
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        const minNoteDuration = 150; // ms
        
        // Get display note
        let displayNote;
        if (notationStyle === 'western') {
            displayNote = this.westernNotes[svaraData.index % 12];
        } else {
            displayNote = this.languageSupport.getFormattedSvara(svaraData.index, language, svaraData.octave);
        }
        
        // Check if this is the same note as current
        if (this.currentNote && this.currentNote.svara === svaraData.svara && this.currentNote.octave === svaraData.octave) {
            // Same note - update duration
            this.currentNote.duration = currentTime - this.currentNote.startTime;
            this.currentNote.displayNote = displayNote;
        } else {
            // Different note - finalize previous and start new
            if (this.currentNote && (currentTime - this.currentNote.startTime) >= minNoteDuration) {
                this.liveNotation.push({...this.currentNote});
            }
            
            // Start new note
            this.currentNote = {
                svara: svaraData.svara,
                svaraIndex: svaraData.index,
                octave: svaraData.octave,
                displayNote: displayNote,
                startTime: currentTime,
                duration: 0
            };
        }
        
        // Update live display
        this.displayLiveNotation();
    }

    displayLiveNotation() {
        const liveNotationDiv = document.getElementById('liveNotation');
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        
        let html = '';
        
        // Show finalized notes with duration representation
        this.liveNotation.forEach((note, index) => {
            const durationClass = this.getDurationClass(note.duration);
            const durationIndicator = this.getDurationIndicator(note.duration);
            
            html += `<span class="live-note ${durationClass}" title="${note.duration}ms">
                ${note.displayNote}${durationIndicator}
            </span>`;
        });
        
        // Show current note being sung with real-time duration
        if (this.currentNote) {
            const currentDuration = Date.now() - this.currentNote.startTime;
            const durationClass = this.getDurationClass(currentDuration);
            const durationIndicator = this.getDurationIndicator(currentDuration);
            
            html += `<span class="live-note current ${durationClass}" title="${currentDuration}ms">
                ${this.currentNote.displayNote}${durationIndicator}
            </span>`;
        }
        
        // Add syllable context if available
        if (this.syllables.length > 0) {
            html += '<br><br>';
            const notesPerSyllable = Math.max(1, Math.floor(this.liveNotation.length / this.syllables.length));
            const currentSyllableIndex = Math.min(
                Math.floor(this.liveNotation.length / notesPerSyllable),
                this.syllables.length - 1
            );
            
            this.syllables.forEach((syllable, index) => {
                const isActive = index === currentSyllableIndex;
                const iast = language !== 'english' && this.syllablesIAST ? this.syllablesIAST[index] : '';
                
                html += `<div class="live-syllable ${isActive ? 'current' : ''}">
                    <div class="text">${syllable}</div>
                    ${iast ? `<div class="iast">${iast}</div>` : ''}
                </div>`;
            });
        }
        
        liveNotationDiv.innerHTML = html;
        liveNotationDiv.scrollTop = liveNotationDiv.scrollHeight;
    }

    getDurationClass(duration) {
        if (duration < 300) return 'duration-short';
        if (duration < 800) return 'duration-medium';
        if (duration < 1500) return 'duration-long';
        return 'duration-very-long';
    }

    getDurationIndicator(duration) {
        if (duration < 300) return ''; // 1 unit - basic duration
        
        // Calculate additional units beyond basic duration
        const additionalUnits = Math.floor((duration - 300) / 200) + 1;
        
        let durationMarker = '';
        let remainingUnits = additionalUnits;
        
        // Use semicolons for groups of 2 units (more efficient)
        while (remainingUnits >= 2) {
            durationMarker += ';';
            remainingUnits -= 2;
        }
        
        // Use commas for remaining single units
        while (remainingUnits > 0) {
            durationMarker += ',';
            remainingUnits -= 1;
        }
        
        return durationMarker;
    }

    findDominantNote(notes) {
        if (notes.length === 0) return { svara: 'Sa', duration: 0 };
        
        // Find the note with longest duration
        return notes.reduce((longest, current) => 
            current.duration > longest.duration ? current : longest
        );
    }

    exportAudio() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svarascribe_recording_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportNotation() {
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        
        let notation = `SvaraScribe Notation Export\n`;
        notation += `Style: ${notationStyle}\n`;
        notation += `Language: ${language}\n`;
        notation += `Base Pitch: ${document.getElementById('basePitch').value} Hz\n\n`;
        
        // Export live notation if available
        if (this.liveNotation.length > 0) {
            notation += `Live Notation:\n`;
            this.liveNotation.forEach((note, index) => {
                let displayNote = note.displayNote;
                if (notationStyle === 'carnatic') {
                    displayNote = this.languageSupport.formatDuration(displayNote, note.duration);
                }
                notation += `${displayNote} `;
            });
            notation += `\n\n`;
        }
        
        // Export syllable analysis if available
        if (this.syllables.length > 0) {
            notation += `Syllable Analysis:\n`;
            const filteredData = this.filterPitchData();
            const notesPerSyllable = Math.ceil(filteredData.length / this.syllables.length);
            
            this.syllables.forEach((syllable, syllableIndex) => {
                const startNote = syllableIndex * notesPerSyllable;
                const endNote = Math.min(startNote + notesPerSyllable, filteredData.length);
                const syllableNotes = filteredData.slice(startNote, endNote);
                
                if (syllableNotes.length > 0) {
                    const dominantNote = this.findDominantNote(syllableNotes);
                    let displayNote;
                    if (notationStyle === 'western') {
                        displayNote = this.westernNotes[dominantNote.svaraIndex % 12];
                    } else {
                        displayNote = this.languageSupport.getFormattedSvara(dominantNote.svaraIndex, language, dominantNote.octave);
                        displayNote = this.languageSupport.formatDuration(displayNote, dominantNote.duration);
                    }
                    
                    const iast = language !== 'english' && this.syllablesIAST ? this.syllablesIAST[syllableIndex] : '';
                    const glideIndicator = syllableNotes.some(note => note.isGlide) ? ' ~' : '';
                    
                    notation += `${syllable}`;
                    if (iast) notation += ` (${iast})`;
                    notation += `: ${displayNote}${glideIndicator}\n`;
                }
            });
        }
        
        const blob = new Blob([notation], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svarascribe_notation_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
const app = new SvaraScribe();
