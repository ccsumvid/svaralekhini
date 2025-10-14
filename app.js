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
        this.tanpuraOscillators = [];
        this.tanpuraGains = [];
        this.isPlayingBack = false;
        this.currentAudio = null;
        this.playbackHighlightInterval = null;
        this.isDraggingSlider = false;
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
        this.lastNotationStyle = null;
        
        // Syllable detection data
        this.audioFeatures = [];
        this.detectedSyllables = [];
        this.currentSyllableNotes = [];
        this.lastOnsetTime = 0;
        this.silenceThreshold = 0.01;
        this.onsetThreshold = 0.3;
        
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
        this.loadSessionOptions();
    }

    saveSessionOptions() {
        try {
            const options = {
                notationStyle: document.getElementById('notationStyle').value,
                basePitch: document.getElementById('basePitch').value,
                language: document.getElementById('language').value,
                lyrics: document.getElementById('lyricsInput').value,
                minNoteLength: document.getElementById('minNoteLength').value
            };
            localStorage.setItem('svaraLekhiniOptions', JSON.stringify(options));
        } catch (error) {
            console.error('Error saving session options:', error);
        }
    }

    loadSessionOptions() {
        try {
            const saved = localStorage.getItem('svaraLekhiniOptions');
            if (saved) {
                const options = JSON.parse(saved);
                
                if (options.notationStyle) {
                    document.getElementById('notationStyle').value = options.notationStyle;
                }
                if (options.basePitch) {
                    document.getElementById('basePitch').value = options.basePitch;
                }
                if (options.language) {
                    document.getElementById('language').value = options.language;
                }
                if (options.lyrics) {
                    document.getElementById('lyricsInput').value = options.lyrics;
                    this.processLyrics(); // Process loaded lyrics
                }
                if (options.minNoteLength) {
                    document.getElementById('minNoteLength').value = options.minNoteLength;
                }
                
                // Update UI based on loaded options
                this.handleNotationStyleChange();
            }
        } catch (error) {
            console.error('Error loading session options:', error);
        }
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 4096; // Increased for Aubio.js accuracy
            
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

    initializeDial() {
        const dialNotes = document.querySelector('.dial-notes');
        if (!dialNotes) return;
        
        // Clear existing notes
        dialNotes.innerHTML = '';
        
        const notationStyle = document.getElementById('notationStyle')?.value || 'western';
        const language = document.getElementById('language')?.value || 'english';
        
        // Get appropriate note names
        let notes;
        if (notationStyle === 'western') {
            notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        } else {
            notes = [];
            for (let i = 0; i < 12; i++) {
                const svara = this.languageSupport.getFormattedSvara(i, language, 0);
                // Remove octave indicators for dial display
                notes.push(svara.replace(/[₀₁₂₃₄₅₆₇₈₉̣̇₋⁺]/g, ''));
            }
        }
        
        notes.forEach((note, index) => {
            const angle = (index * 30) - 90; // 30 degrees per note, start at top
            const radian = (angle * Math.PI) / 180;
            const x = 120 + 90 * Math.cos(radian); // Adjusted for 240px dial (120 center, 90 radius)
            const y = 120 + 90 * Math.sin(radian);
            
            const noteElement = document.createElement('div');
            noteElement.textContent = note;
            noteElement.style.position = 'absolute';
            noteElement.style.left = x + 'px';
            noteElement.style.top = y + 'px';
            noteElement.style.transform = 'translate(-50%, -50%)';
            noteElement.style.fontSize = '14px';
            noteElement.style.fontWeight = '600';
            noteElement.style.color = '#495057';
            noteElement.className = 'dial-note';
            noteElement.setAttribute('data-index', index);
            dialNotes.appendChild(noteElement);
        });
    }

    updateDial(pitch, svaraData) {
        const dialNote = document.getElementById('dialNote');
        const dialFreq = document.getElementById('dialFreq');
        const needle = document.querySelector('.dial-needle');
        
        // Check if dial elements exist
        if (!dialNote || !dialFreq || !needle) return;
        
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        
        // Calculate needle angle based on pitch within octave
        const noteIndex = svaraData.index % 12;
        const baseAngle = noteIndex * 30; // 30 degrees per semitone
        
        // Fine-tune angle based on pitch deviation
        const expectedFreq = this.getExpectedFrequency(svaraData.index, svaraData.octave);
        const cents = 1200 * Math.log2(pitch / expectedFreq);
        const deviationAngle = cents * 0.25; // 0.25 degrees per cent
        
        const needleAngle = baseAngle + deviationAngle;
        
        // Update needle rotation
        needle.style.transform = `translate(-50%, -100%) rotate(${needleAngle}deg)`;
        
        // Update center display
        let displayNote;
        if (notationStyle === 'western') {
            const octaveNumber = Math.floor(Math.log2(pitch / 261.63)) + 4;
            displayNote = this.westernNotes[svaraData.index % 12] + octaveNumber;
        } else {
            displayNote = this.languageSupport.getFormattedSvara(svaraData.index, language, svaraData.octave);
        }
        
        dialNote.textContent = displayNote;
        dialFreq.textContent = pitch.toFixed(1) + ' Hz';
        
        // Update deviation display on dial notes
        this.updateDialDeviations(pitch, svaraData, notationStyle, language);
        
        // Update dial notes based on notation style
        if (notationStyle !== this.lastNotationStyle) {
            this.updateDialNotes(notationStyle, language);
            this.lastNotationStyle = notationStyle;
        }
    }

    updateDialDeviations(pitch, svaraData, notationStyle, language) {
        const dialNotes = document.querySelectorAll('.dial-note');
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        
        dialNotes.forEach((noteElement, index) => {
            // Calculate expected frequency for this note
            const expectedFreq = this.getExpectedFrequency(index, svaraData.octave);
            const cents = 1200 * Math.log2(pitch / expectedFreq);
            const deviation = Math.round(cents);
            
            // Clear previous deviation display
            const existingDeviation = noteElement.querySelector('.deviation');
            if (existingDeviation) {
                existingDeviation.remove();
            }
            
            // Show deviation only for the current note (within 50 cents)
            if (Math.abs(cents) < 50 && index === svaraData.index) {
                const deviationElement = document.createElement('div');
                deviationElement.className = 'deviation';
                deviationElement.textContent = deviation > 0 ? `+${deviation}` : `${deviation}`;
                deviationElement.style.fontSize = '10px';
                deviationElement.style.color = Math.abs(deviation) < 10 ? '#28a745' : '#dc3545';
                deviationElement.style.marginTop = '2px';
                noteElement.appendChild(deviationElement);
            }
        });
    }

    updateDialNotes(notationStyle, language) {
        // Reinitialize the entire dial with new notation
        this.initializeDial();
    }

    autoCorrelate(buffer, sampleRate) {
        // 1. Find the signal strength (RMS = root mean square)
        let SIZE = buffer.length;
        let sumOfSquares = 0;
        for (let i = 0; i < SIZE; i++) {
            let val = buffer[i];
            sumOfSquares += val * val;
        }
        let rms = Math.sqrt(sumOfSquares / SIZE);
        if (rms < 0.01) // too quiet, ignore
            return -1;

        // 2. Trim leading and trailing silence
        let r1 = 0, r2 = SIZE - 1;
        const threshold = 0.2;
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
        }

        buffer = buffer.slice(r1, r2);
        SIZE = buffer.length;

        // 3. Compute autocorrelation for each lag (offset)
        const c = new Array(SIZE).fill(0);
        for (let lag = 0; lag < SIZE; lag++) {
            for (let i = 0; i < SIZE - lag; i++) {
                c[lag] = c[lag] + buffer[i] * buffer[i + lag];
            }
        }

        // 4. Find the first dip then the next peak
        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }

        let T0 = maxpos;

        // 5. Optional interpolation for better precision
        const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        // 6. Convert lag (T0) to frequency
        const freq = sampleRate / T0;
        return freq;
    }

    getExpectedFrequency(svaraIndex, octave) {
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        const ratios = [1.0, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 16/9, 15/8];
        return basePitch * ratios[svaraIndex] * Math.pow(2, octave);
    }

    initializeEventListeners() {
        document.getElementById('startRecord').addEventListener('click', () => this.startRecording());
        document.getElementById('stopRecord').addEventListener('click', () => this.stopRecording());
        document.getElementById('playback').addEventListener('click', () => this.togglePlayback());
        document.getElementById('stopPlayback').addEventListener('click', () => this.stopPlayback());
        document.getElementById('toggleDrone').addEventListener('click', () => this.toggleDrone());
        document.getElementById('exportAudio').addEventListener('click', () => this.exportAudio());
        document.getElementById('exportNotation').addEventListener('click', () => this.exportNotation());
        document.getElementById('exportFrequency').addEventListener('click', () => this.exportFrequency());
        document.getElementById('lyricsInput').addEventListener('input', () => {
            this.processLyrics();
            this.saveSessionOptions();
        });
        
        // Progressive disclosure for notation style
        document.getElementById('notationStyle').addEventListener('change', () => {
            this.handleNotationStyleChange();
            this.saveSessionOptions();
        });
        
        // Save options when changed
        document.getElementById('basePitch').addEventListener('change', () => {
            this.saveSessionOptions();
            this.initializeDial(); // Reinitialize dial with new shruti
        });
        document.getElementById('language').addEventListener('change', () => {
            this.saveSessionOptions();
            this.initializeDial(); // Reinitialize dial with new language
        });
        document.getElementById('minNoteLength').addEventListener('change', () => this.saveSessionOptions());
        
        // Help modal
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        document.querySelector('.close').addEventListener('click', () => this.hideHelp());
        document.getElementById('helpModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('helpModal')) this.hideHelp();
        });
        
        // Clear live notation
        document.getElementById('clearLive').addEventListener('click', () => this.clearLiveNotation());
        
        // Floating stop button
        document.getElementById('floatingStop').addEventListener('click', () => this.stopAllAudio());
        
        // Playback controls
        this.initializePlaybackControls();
        
        // Floating navigation
        this.initializeFloatingNav();
        
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
        
        // Create tanpura-like sound with multiple harmonics
        this.createTanpuraSound(basePitch);
        
        this.isDronePlaying = true;
        this.updateDroneButton();
        this.showFloatingStop();
        
        // Check for volume issues after a brief delay
        setTimeout(() => this.checkVolumeLevel(), 1000);
    }

    createTanpuraSound(fundamental) {
        // Tanpura harmonic series with realistic amplitudes
        const harmonics = [
            { ratio: 1.0, amplitude: 0.8 },    // Fundamental
            { ratio: 2.0, amplitude: 0.4 },    // Octave
            { ratio: 3.0, amplitude: 0.3 },    // Perfect fifth
            { ratio: 4.0, amplitude: 0.2 },    // Double octave
            { ratio: 5.0, amplitude: 0.15 },   // Major third (2 octaves up)
            { ratio: 6.0, amplitude: 0.1 },    // Perfect fifth (2 octaves up)
            { ratio: 8.0, amplitude: 0.08 },   // Triple octave
            { ratio: 10.0, amplitude: 0.05 }   // Major third (3 octaves up)
        ];
        
        // Master gain for the entire tanpura sound
        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        this.droneGain.connect(this.audioContext.destination);
        
        // Create each harmonic
        harmonics.forEach((harmonic, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Set frequency and amplitude
            oscillator.frequency.setValueAtTime(fundamental * harmonic.ratio, this.audioContext.currentTime);
            oscillator.type = 'sine';
            gain.gain.setValueAtTime(harmonic.amplitude, this.audioContext.currentTime);
            
            // Add slight detuning for more realistic tanpura sound
            const detune = (Math.random() - 0.5) * 2; // ±1 cent
            oscillator.detune.setValueAtTime(detune, this.audioContext.currentTime);
            
            // Connect oscillator -> gain -> master gain
            oscillator.connect(gain);
            gain.connect(this.droneGain);
            
            // Start the oscillator
            oscillator.start();
            
            // Store references for cleanup
            this.tanpuraOscillators.push(oscillator);
            this.tanpuraGains.push(gain);
        });
        
        // Add subtle amplitude modulation for breathing effect
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        lfo.frequency.setValueAtTime(0.5, this.audioContext.currentTime); // 0.5 Hz breathing
        lfo.type = 'sine';
        lfoGain.gain.setValueAtTime(0.02, this.audioContext.currentTime); // Subtle modulation
        
        lfo.connect(lfoGain);
        lfoGain.connect(this.droneGain.gain);
        lfo.start();
        
        this.tanpuraOscillators.push(lfo);
        this.tanpuraGains.push(lfoGain);
    }

    stopDrone() {
        // Stop all tanpura oscillators
        this.tanpuraOscillators.forEach(oscillator => {
            if (oscillator) {
                oscillator.stop();
            }
        });
        
        // Clear arrays
        this.tanpuraOscillators = [];
        this.tanpuraGains = [];
        
        // Clean up main references
        this.droneOscillator = null;
        this.droneGain = null;
        this.isDronePlaying = false;
        
        // Update button appearance
        this.updateDroneButton();
        this.hideFloatingStop();
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
        document.getElementById('versionDisplay').textContent = 'v0.3.WORLD';
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

    async startRecording() {
        if (!this.audioContext) {
            const initialized = await this.initializeAudio();
            if (!initialized) return;
        }

        this.recordedChunks = [];
        this.pitchData = [];
        this.timeData = [];
        this.liveNotation = [];
        this.detectedSyllables = [];
        this.currentSyllableNotes = [];
        this.lastNoteTime = Date.now();
        this.recordingStartTime = Date.now(); // Initialize recording start time
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
        
        // Finalize the current note if it exists
        if (this.currentNote) {
            const currentTime = Date.now() - this.recordingStartTime;
            this.currentNote.duration = currentTime - this.currentNote.startTime;
            const minNoteDuration = parseInt(document.getElementById('minNoteLength').value) || 50;
            
            // Apply same logic as during recording
            if (this.currentNote.duration >= minNoteDuration) {
                this.liveNotation.push({...this.currentNote});
                this.currentSyllableNotes.push({...this.currentNote});
            } else {
                // Handle short final note
                if (this.liveNotation.length > 0) {
                    // Merge with previous note
                    const lastNote = this.liveNotation[this.liveNotation.length - 1];
                    lastNote.duration += this.currentNote.duration;
                } else {
                    // Create empty block for short final note
                    const emptyBlock = {
                        svara: '',
                        svaraIndex: -1,
                        octave: 0,
                        displayNote: '∼',
                        startTime: this.currentNote.startTime,
                        duration: this.currentNote.duration,
                        pitch: this.currentNote.pitch,
                        waveform: null,
                        isEmpty: true
                    };
                    this.liveNotation.push(emptyBlock);
                    this.currentSyllableNotes.push(emptyBlock);
                }
            }
            
            // Finalize current syllable
            if (this.currentSyllableNotes.length > 0) {
                this.detectedSyllables.push([...this.currentSyllableNotes]);
            }
            
            this.currentNote = null;
            this.currentSyllableNotes = [];
        }
        
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

    async startPitchDetection() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        
        const detectPitch = () => {
            if (!this.isRecording) return;
            
            this.analyser.getFloatTimeDomainData(dataArray);
            this.lastAudioData = dataArray.slice(); // Store for harmonic analysis
            
            try {
                var pitch;
                // Primary: Use improved autocorrelation
                pitch = this.autoCorrelate(dataArray, this.audioContext.sampleRate);
                
                // Try WORLD algorithm as alternative if primary detection seems unreliable
                if (pitch && (pitch < 80 || pitch > 1000)) {
                    // Skip unreliable pitch readings
                    pitch = null;
                }
                
                if (pitch && pitch > 80 && pitch < 2000) {
                    // Get current time for timing calculations
                    const currentTime = Date.now();
                    
                    // Extract audio features for syllable detection
                    const audioFeatures = this.extractAudioFeatures(dataArray, pitch);
                    
                    // Check if this is likely background noise
                    if (this.isBackgroundNoise(pitch, dataArray)) {
                        setTimeout(detectPitch, 50);
                        return; // Skip this pitch detection but continue loop
                    }
                    
                    // Detect syllable boundaries
                    const isNewSyllable = this.detectSyllableBoundary(audioFeatures, currentTime);
                    
                    // Stabilize pitch to reduce fluctuations
                    const stabilizedPitch = this.stabilizePitch(pitch);
                    if (!stabilizedPitch) {
                        setTimeout(detectPitch, 50);
                        return;
                    }
                    
                    const svaraData = this.frequencyToSvara(stabilizedPitch);
                    svaraData.pitch = stabilizedPitch; // Add pitch to svaraData
                    
                    // Add to pitch data
                    this.pitchData.push({ pitch: stabilizedPitch, svara: svaraData.svara, svaraIndex: svaraData.index, octave: svaraData.octave, time: currentTime });
                    
                    // Update live notation with syllable detection
                    this.updateLiveNotationWithSyllables(svaraData, currentTime, isNewSyllable);
                    
                    // Update visualization
                    this.updateVisualization(stabilizedPitch, svaraData);
                }
            } catch (error) {
                console.error('Pitch detection error:', error);
                // Continue even if there's an error
            }
            
            // Use 50ms interval (20 times per second) for smooth continuous updates
            setTimeout(detectPitch, 50);
        };
        
        detectPitch();
    }

    detectHarmonicsWithStrength(fundamentalFreq, audioData, sampleRate) {
        if (!fundamentalFreq || !audioData) return [];
        
        const harmonicData = [];
        const fundamentalStrength = this.getPitchStrength(audioData, sampleRate, fundamentalFreq);
        
        // Always include fundamental
        harmonicData.push({
            frequency: fundamentalFreq,
            harmonic: 1,
            strength: fundamentalStrength,
            normalizedStrength: 1.0
        });
        
        // Check up to 4 harmonics to fit in card
        for (let harmonic = 2; harmonic <= 4; harmonic++) {
            const harmonicFreq = fundamentalFreq * harmonic;
            if (harmonicFreq > sampleRate / 2) break; // Nyquist limit
            
            const strength = this.getPitchStrength(audioData, sampleRate, harmonicFreq);
            const normalizedStrength = fundamentalStrength > 0 ? strength / fundamentalStrength : 0;
            
            harmonicData.push({
                frequency: harmonicFreq,
                harmonic: harmonic,
                strength: strength,
                normalizedStrength: normalizedStrength
            });
        }
        
        return harmonicData;
    }

    getPitchStrength(audioData, sampleRate, frequency) {
        const period = sampleRate / frequency;
        const periodSamples = Math.round(period);
        
        if (periodSamples >= audioData.length / 2) return 0;
        
        let correlation = 0;
        let energy = 0;
        const samples = Math.min(audioData.length - periodSamples, 1024);
        
        for (let i = 0; i < samples; i++) {
            correlation += audioData[i] * audioData[i + periodSamples];
            energy += audioData[i] * audioData[i];
        }
        
        return energy > 0 ? Math.abs(correlation) / energy : 0;
    }
    
    updateHarmonicBars(harmonicData) {
        const container = document.getElementById('harmonicBars');
        if (!container || !harmonicData.length) return;
        
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        container.innerHTML = '';
        
        harmonicData.forEach(data => {
            const barHeight = Math.max(2, data.normalizedStrength * 50); // Max 50px height
            
            // Get Carnatic note for this harmonic frequency
            const svaraData = this.frequencyToCarnaticSvara(data.frequency);
            const noteName = svaraData ? svaraData.displayNote : `H${data.harmonic}`;
            
            const barElement = document.createElement('div');
            barElement.className = 'harmonic-bar';
            
            barElement.innerHTML = `
                <div class="harmonic-bar-fill" style="height: ${barHeight}px;"></div>
                <div class="harmonic-label">
                    ${noteName}<br>
                    ${data.frequency.toFixed(0)}Hz<br>
                    ${(data.normalizedStrength * 100).toFixed(0)}%
                </div>
            `;
            
            container.appendChild(barElement);
        });
    }

    detectHarmonics(fundamentalFreq, audioData, sampleRate) {
        if (!fundamentalFreq || !audioData) return [fundamentalFreq];
        
        const harmonics = [fundamentalFreq];
        const threshold = 0.1; // Minimum strength threshold
        
        // Check up to 6 harmonics
        for (let harmonic = 2; harmonic <= 6; harmonic++) {
            const harmonicFreq = fundamentalFreq * harmonic;
            if (harmonicFreq > sampleRate / 2) break; // Nyquist limit
            
            const strength = this.getPitchStrength(audioData, sampleRate, harmonicFreq);
            const fundamentalStrength = this.getPitchStrength(audioData, sampleRate, fundamentalFreq);
            
            // Include harmonic if it's strong enough relative to fundamental
            if (strength > threshold && strength > fundamentalStrength * 0.3) {
                harmonics.push(harmonicFreq);
            }
        }
        
        return harmonics;
    }

    // Simple autocorrelation fallback for pitch detection
    simpleAutocorrelation(buffer, sampleRate) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        var bestOffset = -1;
        var bestCorrelation = 0;
        var rms = 0;
        
        for (var i = 0; i < SIZE; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        
        if (rms < 0.01) return null; // Too quiet
        
        var lastCorrelation = 1;
        for (var offset = 1; offset < MAX_SAMPLES; offset++) {
            var correlation = 0;
            for (var i = 0; i < MAX_SAMPLES; i++) {
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
        
        // Keep only last 3 pitches for faster response
        if (this.recentPitches.length > 3) {
            this.recentPitches.shift();
        }
        
        // Need at least 2 readings for basic stabilization
        if (this.recentPitches.length < 2) {
            return pitch; // Return immediately for faster response
        }
        
        // Calculate median pitch
        const sortedPitches = [...this.recentPitches].sort((a, b) => a - b);
        const medianPitch = sortedPitches[Math.floor(sortedPitches.length / 2)];
        
        // Check if there's a significant pitch change (more than 30 cents)
        if (this.stablePitch) {
            const cents = Math.abs(1200 * Math.log2(medianPitch / this.stablePitch));
            if (cents > 30) {
                // Clear history for quick adaptation to new pitch
                this.recentPitches = [pitch];
                this.stablePitch = pitch;
                return pitch;
            }
        }
        
        // Use looser variance for faster adaptation (30% tolerance)
        const maxVariance = medianPitch * 0.30;
        const isStable = this.recentPitches.every(p => Math.abs(p - medianPitch) <= maxVariance);
        
        if (isStable || !this.stablePitch) {
            this.stablePitch = medianPitch;
            return medianPitch;
        }
        
        // Return current pitch instead of old stable pitch for responsiveness
        return pitch;
    }
    
    extractAudioFeatures(dataArray, pitch) {
        // Calculate RMS amplitude
        var rms = 0;
        for (var i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            rms += normalized * normalized;
        }
        rms = Math.sqrt(rms / dataArray.length);
        
        // Calculate zero crossing rate
        let zeroCrossings = 0;
        for (let i = 1; i < dataArray.length; i++) {
            if ((dataArray[i] - 128) * (dataArray[i-1] - 128) < 0) {
                zeroCrossings++;
            }
        }
        const zcr = zeroCrossings / dataArray.length;
        
        return { rms, zcr, spectralCentroid: pitch, timestamp: Date.now() };
    }
    
    detectSyllableBoundary(currentFeatures, currentTime) {
        this.audioFeatures.push(currentFeatures);
        
        // Keep only recent features (last 1 second)
        const oneSecondAgo = currentTime - 1000;
        this.audioFeatures = this.audioFeatures.filter(f => f.timestamp > oneSecondAgo);
        
        if (this.audioFeatures.length < 5) return false;
        
        // Get recent features for comparison
        const recent = this.audioFeatures.slice(-5);
        const previous = this.audioFeatures.slice(-10, -5);
        
        if (previous.length === 0) return false;
        
        // Calculate average features
        const avgRecentRMS = recent.reduce((sum, f) => sum + f.rms, 0) / recent.length;
        const avgPrevRMS = previous.reduce((sum, f) => sum + f.rms, 0) / previous.length;
        const avgRecentZCR = recent.reduce((sum, f) => sum + f.zcr, 0) / recent.length;
        const avgPrevZCR = previous.reduce((sum, f) => sum + f.zcr, 0) / previous.length;
        
        // Detect onset conditions
        const amplitudeIncrease = avgRecentRMS > avgPrevRMS * (1 + this.onsetThreshold);
        const spectralChange = Math.abs(avgRecentZCR - avgPrevZCR) > 0.02;
        const timeSinceLastOnset = currentTime - this.lastOnsetTime > 300; // Min 300ms between syllables
        
        // Detect silence gap
        const wasSilent = avgPrevRMS < this.silenceThreshold;
        const nowActive = avgRecentRMS > this.silenceThreshold;
        
        const isNewSyllable = timeSinceLastOnset && (
            (amplitudeIncrease && spectralChange) || 
            (wasSilent && nowActive)
        );
        
        if (isNewSyllable) {
            this.lastOnsetTime = currentTime;
        }
        
        return isNewSyllable;
    }
    
    updateLiveNotationWithSyllables(svaraData, currentTime, isNewSyllable) {
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        const minNoteDuration = parseInt(document.getElementById('minNoteLength').value) || 50;
        
        // Get display note
        let displayNote;
        if (notationStyle === 'western') {
            displayNote = this.westernNotes[svaraData.index % 12];
        } else {
            // Use images for Telugu to avoid font issues
            if (language === 'telugu') {
                displayNote = this.languageSupport.getFormattedSvaraImage(svaraData.index, language, svaraData.octave);
            } else {
                displayNote = this.languageSupport.getFormattedSvara(svaraData.index, language, svaraData.octave);
            }
        }
        
        // Capture current waveform data
        const waveformData = this.captureWaveform();
        
        const noteData = {
            svara: svaraData.svara,
            svaraIndex: svaraData.index,
            octave: svaraData.octave,
            displayNote: displayNote,
            startTime: currentTime,
            duration: 0,
            pitch: svaraData.pitch,
            waveform: waveformData
        };
        
        // Handle syllable grouping
        if (isNewSyllable) {
            // Finalize previous syllable if exists
            if (this.currentSyllableNotes.length > 0) {
                this.detectedSyllables.push([...this.currentSyllableNotes]);
                this.currentSyllableNotes = [];
            }
        }
        
        // Check if this is a significantly different note
        let isNewNote = false;
        if (!this.currentNote) {
            isNewNote = true;
        } else {
            // Check for svara change
            const svaraChanged = this.currentNote.svara !== svaraData.svara || this.currentNote.octave !== svaraData.octave;
            
            // Check for significant pitch change (more than 50 cents)
            const pitchChange = Math.abs(1200 * Math.log2(svaraData.pitch / this.currentNote.pitch));
            const significantPitchChange = pitchChange > 50;
            
            isNewNote = svaraChanged || significantPitchChange || isNewSyllable;
        }
        
        if (!isNewNote) {
            // Same note - update duration and pitch
            this.currentNote.duration = currentTime - this.currentNote.startTime;
            this.currentNote.displayNote = displayNote;
            this.currentNote.pitch = svaraData.pitch;
            this.currentNote.waveform = waveformData;
        } else {
            // Different note or new syllable - finalize previous and start new
            if (this.currentNote) {
                const noteDuration = currentTime - this.currentNote.startTime;
                
                if (noteDuration >= minNoteDuration) {
                    // Note is long enough, add it normally
                    this.liveNotation.push({...this.currentNote});
                    this.currentSyllableNotes.push({...this.currentNote});
                } else {
                    // Note is too short, handle it
                    if (this.liveNotation.length > 0) {
                        // Merge with previous note by extending its duration
                        const lastNote = this.liveNotation[this.liveNotation.length - 1];
                        lastNote.duration += noteDuration;
                    } else {
                        // No previous note, create a small empty block
                        const emptyBlock = {
                            svara: '',
                            svaraIndex: -1,
                            octave: 0,
                            displayNote: '∼',
                            startTime: this.currentNote.startTime,
                            duration: noteDuration,
                            pitch: this.currentNote.pitch,
                            waveform: null,
                            isEmpty: true
                        };
                        this.liveNotation.push(emptyBlock);
                        this.currentSyllableNotes.push(emptyBlock);
                    }
                }
            }
            
            // Start new note
            this.currentNote = noteData;
        }
        
        // Update live display
        this.displayLiveNotation();
    }

    isBackgroundNoise(pitch, audioBuffer) {
        // Calculate RMS (volume level)
        var rms = 0;
        for (var i = 0; i < audioBuffer.length; i++) {
            rms += audioBuffer[i] * audioBuffer[i];
        }
        rms = Math.sqrt(rms / audioBuffer.length);
        
        // Less aggressive filtering for better responsiveness
        if (rms < 0.008) return true; // Reduced threshold
        
        // Only filter very low frequencies that are clearly noise
        if (pitch < 80 && rms < 0.02) return true;
        
        // Reduced repetitive pattern checking for faster response
        if (this.pitchData.length > 4) {
            const recentPitches = this.pitchData.slice(-4).map(d => d.pitch);
            const avgPitch = recentPitches.reduce((a, b) => a + b, 0) / recentPitches.length;
            
            // Only filter if extremely similar and very quiet
            const allSimilar = recentPitches.every(p => Math.abs(p - avgPitch) < 10);
            if (allSimilar && rms < 0.015) return true;
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
        let basePitch = parseFloat(document.getElementById('basePitch').value);
        
        // // Auto-detect base pitch from first few notes if significantly off
        // if (this.pitchData.length < 10) {
        //     const detectedSa = this.autoDetectBasePitch(frequency);
        //     if (detectedSa && Math.abs(detectedSa - basePitch) > basePitch * 0.15) { // More sensitive
        //         basePitch = detectedSa;
        //         // Update UI to show detected base pitch
        //         const closestOption = this.findClosestBasePitchOption(detectedSa);
        //         if (closestOption) {
        //             document.getElementById('basePitch').value = closestOption;
        //         }
        //         console.log(`Auto-detected base pitch: ${detectedSa}Hz (was ${parseFloat(document.getElementById('basePitch').value)}Hz)`);
        //     }
        // }
        
        // Harmonic correction: if frequency is significantly low, try doubling it
        let correctedFrequency = frequency;
        if (frequency < basePitch * 0.5) { // More conservative threshold
            correctedFrequency = frequency * 2;
            console.log(`Harmonic correction: ${frequency}Hz → ${correctedFrequency}Hz`);
        }
        
        let ratio = correctedFrequency / basePitch;
        
        // Determine octave and normalize ratio to 1-2 range
        let octave = 0;
        
        // More precise octave detection - use log2 for better accuracy
        const logRatio = Math.log2(ratio);
        octave = Math.floor(logRatio);
        ratio = Math.pow(2, logRatio - octave); // Normalize to 1-2 range
        
        // Now find the closest svara across all possible octaves
        let closestSvara = 'Sa';
        let closestIndex = 0;
        let closestOctave = 0;
        let minCentsDifference = Infinity;
        
        // Just intonation ratios for Carnatic svaras (more accurate for traditional music)
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
        
        // Check svaras in nearby octaves (-2 to +2)
        for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset++) {
            swaraArray.forEach((swaraData) => {
                const expectedFreq = basePitch * swaraData.ratio * Math.pow(2, octaveOffset);
                const centsDifference = Math.abs(1200 * Math.log2(correctedFrequency / expectedFreq));
                
                if (centsDifference < minCentsDifference) {
                    minCentsDifference = centsDifference;
                    closestSvara = swaraData.svara;
                    closestIndex = swaraData.index;
                    closestOctave = octaveOffset;
                }
            });
        }
        
        return { svara: closestSvara, index: closestIndex, octave: closestOctave };
    }

    autoDetectBasePitch(frequency) {
        // Find the fundamental frequency by checking which octave makes most sense
        const possibleSaFreqs = [
            65.41, 130.81, 261.63, 523.25, 1046.50 // C2, C3, C4, C5, C6
        ];
        
        let bestSa = null;
        let bestScore = -1;
        
        possibleSaFreqs.forEach(sa => {
            const ratio = frequency / sa;
            
            // Score based on how close the ratio is to a simple harmonic ratio
            let score = 0;
            
            // Check if it's close to fundamental (1.0) or simple harmonics (2.0, 0.5)
            const distances = [
                Math.abs(ratio - 1.0),     // Fundamental
                Math.abs(ratio - 0.5),     // Sub-octave
                Math.abs(ratio - 2.0),     // Octave
                Math.abs(ratio - 1.5),     // Perfect fifth
                Math.abs(ratio - 1.25),    // Major third
                Math.abs(ratio - 1.125)    // Major second
            ];
            
            const minDistance = Math.min(...distances);
            score = 1.0 / (minDistance + 0.01); // Higher score for smaller distance
            
            // Prefer lower octaves (more likely to be fundamental)
            if (sa <= 130.81) score *= 1.5;
            
            if (score > bestScore) {
                bestScore = score;
                bestSa = sa;
            }
        });
        
        return bestSa;
    }

    findClosestBasePitchOption(targetFreq) {
        const select = document.getElementById('basePitch');
        let closestValue = null;
        let minDiff = Infinity;
        
        for (let option of select.options) {
            const freq = parseFloat(option.value);
            const diff = Math.abs(freq - targetFreq);
            if (diff < minDiff) {
                minDiff = diff;
                closestValue = option.value;
            }
        }
        
        return closestValue;
    }

    applyHanningWindow(data) {
        const windowed = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (data.length - 1)));
            windowed[i] = data[i] * window;
        }
        return windowed;
    }

    computeFFT(data) {
        // Simple DFT implementation (can be replaced with proper FFT)
        const N = data.length;
        const spectrum = new Array(N / 2);
        
        for (let k = 0; k < N / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                real += data[n] * Math.cos(angle);
                imag += data[n] * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real * real + imag * imag);
        }
        
        return spectrum;
    }

    estimateF0FromSpectrum(spectrum, sampleRate) {
        const minF0 = 80;   // Minimum vocal F0
        const maxF0 = 800;  // Maximum vocal F0
        
        const minBin = Math.floor(minF0 * spectrum.length * 2 / sampleRate);
        const maxBin = Math.floor(maxF0 * spectrum.length * 2 / sampleRate);
        
        // Find spectral peaks
        const peaks = this.findSpectralPeaks(spectrum, minBin, maxBin);
        
        // Use harmonic template matching to find F0
        let bestF0 = 0;
        let bestScore = 0;
        
        for (const peak of peaks) {
            const f0Candidate = peak.frequency * sampleRate / (spectrum.length * 2);
            const score = this.harmonicTemplateScore(spectrum, f0Candidate, sampleRate);
            
            if (score > bestScore) {
                bestScore = score;
                bestF0 = f0Candidate;
            }
        }
        
        return bestScore > 0.2 ? bestF0 : 0;
    }

    findSpectralPeaks(spectrum, minBin, maxBin) {
        const peaks = [];
        
        for (let i = minBin + 1; i < maxBin - 1; i++) {
            if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1]) {
                // Local maximum found
                if (spectrum[i] > 0.1 * Math.max(...spectrum)) { // Threshold
                    peaks.push({
                        bin: i,
                        frequency: i,
                        magnitude: spectrum[i]
                    });
                }
            }
        }
        
        // Sort by magnitude
        return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, 10);
    }

    harmonicTemplateScore(spectrum, f0, sampleRate) {
        const harmonics = [1, 2, 3, 4, 5, 6]; // First 6 harmonics
        let totalScore = 0;
        let harmonicCount = 0;
        
        for (const harmonic of harmonics) {
            const harmonicFreq = f0 * harmonic;
            const bin = Math.round(harmonicFreq * spectrum.length * 2 / sampleRate);
            
            if (bin < spectrum.length) {
                // Check magnitude at harmonic frequency
                const magnitude = spectrum[bin];
                const weight = 1.0 / harmonic; // Lower harmonics weighted more
                totalScore += magnitude * weight;
                harmonicCount++;
            }
        }
        
        return harmonicCount > 0 ? totalScore / harmonicCount : 0;
    }

    analyzeHarmonics(spectrum, f0, sampleRate) {
        const harmonics = [2, 3, 4]; // Check 2nd, 3rd, 4th harmonics
        let harmonicStrength = 0;
        
        const f0Bin = Math.round(f0 * spectrum.length * 2 / sampleRate);
        const f0Magnitude = spectrum[f0Bin] || 0;
        
        if (f0Magnitude === 0) return 0;
        
        for (const harmonic of harmonics) {
            const harmonicBin = Math.round(f0 * harmonic * spectrum.length * 2 / sampleRate);
            if (harmonicBin < spectrum.length) {
                const harmonicMagnitude = spectrum[harmonicBin] || 0;
                harmonicStrength += harmonicMagnitude / f0Magnitude;
            }
        }
        
        return harmonicStrength / harmonics.length;
    }

    updateVisualization(pitch, svaraData) {
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        
        // Calculate pitch deviation
        const basePitch = parseFloat(document.getElementById('basePitch').value);
        const { displayNote, deviation } = this.calculatePitchDeviation(pitch, svaraData, basePitch, notationStyle, language);
        
        // Detect harmonics with strength for display
        const harmonicData = this.detectHarmonicsWithStrength(pitch, this.lastAudioData, this.audioContext.sampleRate);
        
        // Update pitch display
        const pitchDisplay = document.getElementById('pitchDisplay');
        const pitchDeviation = document.getElementById('pitchDeviation');
        
        if (pitchDisplay) pitchDisplay.textContent = displayNote;
        if (pitchDeviation) pitchDeviation.textContent = `${pitch.toFixed(1)} Hz ${deviation}`;
        
        // Update pitch dial
        this.updateDial(pitch, svaraData);
        
        // Update harmonic bars
        this.updateHarmonicBars(harmonicData);
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
            const octaveNumber = Math.floor(Math.log2(pitch / 261.63)) + 4; // C4 = 261.63 Hz
            displayNote = this.westernNotes[svaraData.index % 12] + octaveNumber;
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
                const lowerOctaveNumber = Math.floor(Math.log2(pitch / 261.63)) + 4;
                displayNote = this.westernNotes[lowerIndex % 12] + lowerOctaveNumber;
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
                const higherOctaveNumber = Math.floor(Math.log2(pitch / 261.63)) + 4;
                displayNote = this.westernNotes[higherIndex % 12] + higherOctaveNumber;
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

    togglePlayback() {
        if (this.recordedChunks.length === 0) return;
        
        if (this.isPlayingBack) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.currentAudio && this.currentAudio.paused) {
            // Resume paused audio
            this.currentAudio.play().catch(e => {
                if (e.name !== 'AbortError') console.error('Playback error:', e);
            });
        } else {
            // Start new playback
            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(blob);
            this.currentAudio = new Audio(audioUrl);
            
            this.currentAudio.addEventListener('ended', () => {
                this.stopPlayback();
            });
            
            this.currentAudio.play().catch(e => {
                if (e.name !== 'AbortError') console.error('Playback error:', e);
            });
        }
        
        this.isPlayingBack = true;
        this.updatePlaybackButtons();
        this.showFloatingStop();
        this.showPlaybackControls();
        this.startPlaybackHighlighting();
    }

    pausePlayback() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
        this.isPlayingBack = false;
        this.updatePlaybackButtons();
        this.stopPlaybackHighlighting();
    }

    stopPlayback() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            URL.revokeObjectURL(this.currentAudio.src);
            this.currentAudio = null;
        }
        this.isPlayingBack = false;
        this.updatePlaybackButtons();
        this.hideFloatingStop();
        this.hidePlaybackControls();
        this.stopPlaybackHighlighting();
    }

    updatePlaybackButtons() {
        const playbackBtn = document.getElementById('playback');
        const stopBtn = document.getElementById('stopPlayback');
        const playIcon = playbackBtn.querySelector('.btn-icon');
        const playText = playbackBtn.querySelector('.btn-text');
        
        if (this.isPlayingBack) {
            playIcon.textContent = '⏸️';
            playText.textContent = 'Pause';
            stopBtn.style.display = 'inline-flex';
        } else {
            playIcon.textContent = '▶️';
            playText.textContent = this.currentAudio ? 'Resume' : 'Playback';
            if (!this.currentAudio) {
                stopBtn.style.display = 'none';
            }
        }
    }

    showFloatingStop() {
        const floatingBtn = document.getElementById('floatingStop');
        if (floatingBtn) {
            floatingBtn.classList.add('show');
        }
    }

    hideFloatingStop() {
        const floatingBtn = document.getElementById('floatingStop');
        if (floatingBtn && !this.isDronePlaying && !this.isPlayingBack) {
            floatingBtn.classList.remove('show');
        }
    }

    stopAllAudio() {
        if (this.isDronePlaying) {
            this.stopDrone();
        }
        if (this.isPlayingBack) {
            this.stopPlayback();
        }
    }

    startPlaybackHighlighting() {
        if (!this.currentAudio || this.liveNotation.length === 0) return;
        
        this.playbackHighlightInterval = setInterval(() => {
            this.updatePlaybackHighlight();
        }, 25); // Update every 25ms for smoother highlighting (was 50ms)
    }

    stopPlaybackHighlighting() {
        if (this.playbackHighlightInterval) {
            clearInterval(this.playbackHighlightInterval);
            this.playbackHighlightInterval = null;
        }
        this.clearAllHighlights();
    }

    updatePlaybackHighlight() {
        if (!this.currentAudio || !this.isPlayingBack) return;
        
        const currentTime = this.currentAudio.currentTime * 1000; // Convert to milliseconds
        let cumulativeTime = 0;
        let currentNoteIndex = -1;
        
        // Find which note should be highlighted based on playback time
        for (let i = 0; i < this.liveNotation.length; i++) {
            const note = this.liveNotation[i];
            const noteStart = cumulativeTime;
            const noteEnd = cumulativeTime + note.duration;
            
            if (currentTime >= noteStart && currentTime < noteEnd) {
                currentNoteIndex = i;
                // Debug logging for timing issues
                // if (i % 5 === 0) { // Log every 5th note to avoid spam
                //     const cleanNoteName = note.displayNote.includes('<img') ? 
                //         note.svara || 'Note' : note.displayNote;
                //     console.log(`Highlighting note ${i}: ${cleanNoteName} at ${currentTime.toFixed(0)}ms (${noteStart.toFixed(0)}-${noteEnd.toFixed(0)}ms)`);
                // }
                break;
            }
            cumulativeTime += note.duration;
        }
        
        // Clear previous highlights
        this.clearAllHighlights();
        
        // Check if playback has exceeded total duration
        if (this.liveNotation.length > 0) {
            const totalDuration = this.liveNotation.reduce((sum, note) => sum + note.duration, 0);
            if (currentTime > totalDuration) {
                // Stop playback if we've exceeded the total duration
                this.stopPlayback();
                return;
            }
        }
        
        // Highlight current note in live notation
        if (currentNoteIndex >= 0) {
            this.highlightLiveNote(currentNoteIndex);
            this.highlightSynchronizedNote(currentNoteIndex);
        }
    }

    highlightLiveNote(noteIndex) {
        const liveNotes = document.querySelectorAll('#liveNotation .live-note');
        if (liveNotes[noteIndex]) {
            liveNotes[noteIndex].classList.add('note-highlight');
        }
    }

    highlightSynchronizedNote(noteIndex) {
        // Highlight corresponding note in synchronized notation
        const noteElements = document.querySelectorAll('.note-position');
        if (noteElements[noteIndex]) {
            noteElements[noteIndex].classList.add('note-highlight');
        }
        
        // Highlight corresponding syllable if mapped
        if (this.syllableNoteMapping) {
            const syllableIndex = this.syllableNoteMapping.indexOf(noteIndex);
            if (syllableIndex >= 0) {
                const syllableElements = document.querySelectorAll('.syllable-interactive');
                if (syllableElements[syllableIndex]) {
                    syllableElements[syllableIndex].classList.add('syllable-highlight');
                }
            }
        }
    }

    clearAllHighlights() {
        // Remove all highlighting classes
        document.querySelectorAll('.note-highlight').forEach(el => {
            el.classList.remove('note-highlight');
        });
        document.querySelectorAll('.syllable-highlight').forEach(el => {
            el.classList.remove('syllable-highlight');
        });
    }

    initializePlaybackControls() {
        const slider = document.getElementById('playbackSlider');
        const thumb = document.getElementById('playbackThumb');
        
        // Click on slider to seek
        slider.addEventListener('click', (e) => {
            if (!this.currentAudio) return;
            const rect = slider.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seekToPercent(percent);
        });
        
        // Drag thumb to seek
        thumb.addEventListener('mousedown', (e) => {
            this.isDraggingSlider = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDraggingSlider || !this.currentAudio) return;
            const slider = document.getElementById('playbackSlider');
            const rect = slider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.seekToPercent(percent);
        });
        
        document.addEventListener('mouseup', () => {
            this.isDraggingSlider = false;
        });
    }

    seekToPercent(percent) {
        if (!this.currentAudio) return;
        this.currentAudio.currentTime = percent * this.currentAudio.duration;
        this.updatePlaybackProgress();
    }

    showPlaybackControls() {
        const controls = document.getElementById('playbackControls');
        if (controls && this.currentAudio) {
            controls.classList.add('show');
            this.updateTotalTime();
            this.startProgressUpdates();
        }
    }

    hidePlaybackControls() {
        const controls = document.getElementById('playbackControls');
        if (controls) {
            controls.classList.remove('show');
        }
        this.stopProgressUpdates();
    }

    startProgressUpdates() {
        this.progressInterval = setInterval(() => {
            if (!this.isDraggingSlider) {
                this.updatePlaybackProgress();
            }
        }, 100);
    }

    stopProgressUpdates() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updatePlaybackProgress() {
        if (!this.currentAudio) return;
        
        const percent = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
        const progress = document.getElementById('playbackProgress');
        const thumb = document.getElementById('playbackThumb');
        const currentTime = document.getElementById('currentTime');
        
        if (progress) progress.style.width = `${percent}%`;
        if (thumb) thumb.style.left = `${percent}%`;
        if (currentTime) currentTime.textContent = this.formatTime(this.currentAudio.currentTime);
    }

    updateTotalTime() {
        if (!this.currentAudio) return;
        const totalTime = document.getElementById('totalTime');
        if (totalTime) {
            totalTime.textContent = this.formatTime(this.currentAudio.duration || 0);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    initializeFloatingNav() {
        // Show/hide navigation based on scroll
        window.addEventListener('scroll', () => {
            this.updateFloatingNav();
        });
        
        // Click handlers for navigation buttons
        document.querySelectorAll('.nav-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stepId = e.target.dataset.step;
                this.scrollToStep(stepId);
            });
        });
        
        // Initial check
        this.updateFloatingNav();
    }

    updateFloatingNav() {
        const nav = document.getElementById('floatingNav');
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        
        // Show navigation after scrolling past header
        if (scrollY > 200) {
            nav.classList.add('show');
        } else {
            nav.classList.remove('show');
        }
        
        // Update active step based on scroll position
        this.updateActiveStep();
    }

    updateActiveStep() {
        const steps = ['step1', 'step2', 'step3'];
        const navButtons = document.querySelectorAll('.nav-step');
        let activeStep = null;
        
        // Find which step is currently in view
        steps.forEach((stepId, index) => {
            const element = document.getElementById(stepId);
            if (element) {
                const rect = element.getBoundingClientRect();
                const isInView = rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2;
                
                if (isInView) {
                    activeStep = index;
                }
            }
        });
        
        // Update active state
        navButtons.forEach((btn, index) => {
            if (index === activeStep) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    scrollToStep(stepId) {
        const element = document.getElementById(stepId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
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
        
        // Smart initial mapping based on detected syllables or provided lyrics
        const syllablesToUse = this.detectedSyllables.length > 0 ? this.detectedSyllables : this.syllables;
        const syllableCount = syllablesToUse.length;
        
        if (!this.syllableNoteMapping || this.syllableNoteMapping.length !== syllableCount) {
            this.syllableNoteMapping = this.createSmartMapping(notesToDisplay.length, syllableCount);
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
        
        // Create syllable elements (use detected syllables if available)
        const syllablesToDisplay = this.detectedSyllables.length > 0 ? 
            this.detectedSyllables.map((notes, index) => `Syl-${index + 1}`) : 
            this.syllables;
            
        syllablesToDisplay.forEach((syllable, syllableIndex) => {
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
            
            const iast = (language !== 'english' && this.syllablesIAST && syllableIndex < this.syllablesIAST.length) ? 
                this.syllablesIAST[syllableIndex] : '';
            syllableDiv.innerHTML = `
                <button class="move-btn" data-direction="left" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px;">◀</button>
                <div style="text-align: center;">
                    <div>${syllable}</div>
                    ${iast ? `<div style="font-size: 10px; opacity: 0.8;">${iast}</div>` : ''}
                    ${this.detectedSyllables.length > 0 && syllableIndex < this.detectedSyllables.length ? 
                        `<div style="font-size: 8px; opacity: 0.6;">${this.detectedSyllables[syllableIndex].length} notes</div>` : ''}
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
            for (var i = 0; i < syllableCount; i++) {
                mapping.push(Math.floor(i * step));
            }
        } else {
            // More syllables than notes - map multiple syllables to some notes
            for (var i = 0; i < syllableCount; i++) {
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
        
        // Capture current waveform data
        const waveformData = this.captureWaveform();
        
        // Check if this is the same note as current
        if (this.currentNote && this.currentNote.svara === svaraData.svara && this.currentNote.octave === svaraData.octave) {
            // Same note - update duration, pitch, and waveform
            this.currentNote.duration = currentTime - this.currentNote.startTime;
            this.currentNote.displayNote = displayNote;
            this.currentNote.pitch = svaraData.pitch;
            this.currentNote.waveform = waveformData; // Update with latest waveform
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
                duration: 0,
                pitch: svaraData.pitch,
                waveform: waveformData // Store initial waveform
            };
        }
        
        // Update live display
        this.displayLiveNotation();
    }
    
    captureWaveform() {
        if (!this.analyser) return [];
        
        const bufferLength = 128; // Smaller buffer for tooltip display
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
        
        // Convert to normalized values (-1 to 1)
        return Array.from(dataArray).map(value => (value - 128) / 128);
    }
    
    generateWaveformSVG(waveform, width = 200, height = 60) {
        if (!waveform || waveform.length === 0) return '';
        
        const points = waveform.map((value, index) => {
            const x = (index / waveform.length) * width;
            const y = (height / 2) + (value * height / 4); // Scale to quarter height
            return `${x},${y}`;
        }).join(' ');
        
        return `<svg width="${width}" height="${height}" style="background: rgba(0,0,0,0.1); border-radius: 4px; margin-top: 5px;">
            <polyline points="${points}" fill="none" stroke="#00ff00" stroke-width="1"/>
            <line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        </svg>`;
    }

    displayLiveNotation() {
        const liveNotationDiv = document.getElementById('liveNotation');
        const notationStyle = document.getElementById('notationStyle').value;
        const language = document.getElementById('language').value;
        
        var html = '';
        
        // Show finalized notes with duration representation
        let i = 0;
        while (i < this.liveNotation.length) {
            const note = this.liveNotation[i];
            
            // Check if this note is under 100ms and can be grouped
            if (note.duration < 100) {
                let groupedNotes = [note];
                let totalDuration = note.duration;
                let j = i + 1;
                
                // Collect consecutive notes under 100ms
                while (j < this.liveNotation.length && this.liveNotation[j].duration < 100) {
                    groupedNotes.push(this.liveNotation[j]);
                    totalDuration += this.liveNotation[j].duration;
                    j++;
                }
                
                // Create grouped span
                const durationClass = this.getDurationClass(totalDuration);
                const minWidth = 120; // Increased minimum width for grouped notes
                const maxWidth = 300; // Increased maximum width
                const baseDuration = 500;
                const width = Math.min(maxWidth, Math.max(minWidth, (totalDuration / baseDuration) * 120 + minWidth));
                
                const groupedText = groupedNotes.map(n => n.displayNote).join(' ');
                const avgPitch = groupedNotes.reduce((sum, n) => sum + (n.pitch || 0), 0) / groupedNotes.length;
                
                html += `<span class="live-note ${durationClass}" 
                    style="width: ${width}px; text-align: center; font-size: 0.7em; white-space: nowrap; overflow: hidden;"
                    data-tooltip="Grouped ${groupedNotes.length} notes | Avg Pitch: ${avgPitch.toFixed(2)} Hz | Total Duration: ${totalDuration}ms">
                    ${groupedText}
                </span>`;
                
                i = j; // Skip processed notes
            } else {
                // Single note (duration >= 100ms)
                const durationClass = this.getDurationClass(note.duration);
                const durationIndicator = this.getDurationIndicator(note.duration);
                const pitchHz = note.pitch ? note.pitch.toFixed(2) : 'N/A';
                
                const minWidth = 60;
                const maxWidth = 200;
                const baseDuration = 500;
                const width = Math.min(maxWidth, Math.max(minWidth, (note.duration / baseDuration) * 80 + minWidth));
                
                html += `<span class="live-note ${durationClass}" 
                    style="width: ${width}px; text-align: center;"
                    data-tooltip="Pitch: ${pitchHz} Hz | Duration: ${note.duration}ms">
                    ${note.displayNote}${durationIndicator}
                </span>`;
                
                i++;
            }
        }
        
        // Show current note being sung with real-time duration
        if (this.currentNote) {
            const currentDuration = Date.now() - this.currentNote.startTime;
            const durationClass = this.getDurationClass(currentDuration);
            const durationIndicator = this.getDurationIndicator(currentDuration);
            const pitchHz = this.currentNote.pitch ? this.currentNote.pitch.toFixed(2) : 'N/A';
            const waveformSVG = this.generateWaveformSVG(this.currentNote.waveform);
            
            // Calculate width based on current duration
            const minWidth = 60;
            const maxWidth = 200;
            const baseDuration = 500;
            const width = Math.min(maxWidth, Math.max(minWidth, (currentDuration / baseDuration) * 80 + minWidth));
            
            html += `<span class="live-note current ${durationClass}" 
                style="width: ${width}px; text-align: center;"
                data-tooltip="Pitch: ${pitchHz} Hz | Duration: ${currentDuration}ms">
                ${this.currentNote.displayNote}${durationIndicator}
            </span>`;
        }
        
        liveNotationDiv.innerHTML = html;
        
        // Add tooltip functionality
        this.addTooltipListeners(liveNotationDiv);
    }
    
    addTooltipListeners(container) {
        const tooltip = this.getOrCreateTooltip();
        
        container.querySelectorAll('.live-note[data-tooltip]').forEach(note => {
            note.addEventListener('mouseenter', (e) => {
                const tooltipContent = e.target.getAttribute('data-tooltip');
                const noteData = this.findNoteData(e.target);
                const waveformSVG = noteData ? this.generateWaveformSVG(noteData.waveform) : '';
                
                tooltip.innerHTML = tooltipContent + (waveformSVG ? '<br><br>' + waveformSVG : '');
                tooltip.style.display = 'block';
                this.positionTooltip(tooltip, e);
            });
            
            note.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
            
            note.addEventListener('mousemove', (e) => {
                this.positionTooltip(tooltip, e);
            });
        });
    }
    
    getOrCreateTooltip() {
        let tooltip = document.getElementById('waveform-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'waveform-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 10px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 1000;
                pointer-events: none;
                display: none;
                max-width: 250px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }
    
    positionTooltip(tooltip, event) {
        const x = event.pageX + 10;
        const y = event.pageY - 10;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
    
    findNoteData(element) {
        const noteText = element.textContent.replace(/[,;]/g, ''); // Remove duration markers
        const isCurrent = element.classList.contains('current');
        
        if (isCurrent && this.currentNote) {
            return this.currentNote;
        }
        
        // Find in liveNotation array
        return this.liveNotation.find(note => 
            note.displayNote.replace(/[,;]/g, '') === noteText
        );
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
        
        var notation = `Svara Lekhini Notation Export\n`;
        notation += `Style: ${notationStyle}\n`;
        notation += `Language: ${language}\n`;
        notation += `Base Pitch: ${document.getElementById('basePitch').value} Hz\n\n`;
        
        // Export live notation if available
        if (this.liveNotation.length > 0) {
            notation += `Live Notation:\n`;
            this.liveNotation.forEach((note, index) => {
                var displayNote = note.displayNote;
                if (notationStyle === 'carnatic') {
                    displayNote = this.languageSupport.formatDuration(displayNote, note.duration);
                }
                notation += `${displayNote} `;
            });
            notation += `\n\n`;
        }

        // Export frequency data if available
        if (this.liveNotation.length > 0) {
            notation += `Frequency Data (Hz):\n`;
            this.liveNotation.forEach((note, index) => {
                var displayNote = note.displayNote;
                var frequency = note.pitch || 'N/A';
                var duration = Math.round(note.duration);
                notation += `${displayNote}: ${frequency} Hz (${duration}ms)\n`;
            });
            notation += `\n`;
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
                    var displayNote;
                    if (notationStyle === 'western') {
                        displayNote = this.westernNotes[dominantNote.svaraIndex % 12];
                    } else {
                        displayNote = this.languageSupport.getFormattedSvara(dominantNote.svaraIndex, language, dominantNote.octave);
                        displayNote = this.languageSupport.formatDuration(displayNote, dominantNote.duration);
                    }
                    
                    const iast = language !== 'english' && this.syllablesIAST ? this.syllablesIAST[syllableIndex] : '';
                    const glideIndicator = syllableNotes.some(note => note.isGlide) ? ' ~' : '';
                    const avgFreq = Math.round(syllableNotes.reduce((sum, n) => sum + n.pitch, 0) / syllableNotes.length);
                    
                    notation += `${syllable}`;
                    if (iast) notation += ` (${iast})`;
                    notation += `: ${displayNote}${glideIndicator} - ${avgFreq} Hz\n`;
                }
            });
        }
        
        const blob = new Blob([notation], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svara_lekhini_notation_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportFrequency() {
        if (this.liveNotation.length === 0) {
            alert('No notation data to export. Please record and analyze first.');
            return;
        }

        var frequencyData = `Svara Lekhini Frequency Export\n`;
        frequencyData += `Base Pitch: ${document.getElementById('basePitch').value} Hz\n`;
        frequencyData += `Export Time: ${new Date().toISOString()}\n\n`;
        
        frequencyData += `Time(ms)\tFrequency(Hz)\tNote\tDuration(ms)\n`;
        
        var currentTime = 0;
        this.liveNotation.forEach((note, index) => {
            var frequency = note.pitch ? Math.round(note.pitch * 100) / 100 : 'N/A';
            var duration = Math.round(note.duration);
            var displayNote = note.displayNote || 'Unknown';
            
            frequencyData += `${currentTime}\t${frequency}\t${displayNote}\t${duration}\n`;
            currentTime += duration;
        });
        
        const blob = new Blob([frequencyData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svara_lekhini_frequencies_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
const app = new SvaraScribe();

// Initialize dial after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initializeDial());
} else {
    app.initializeDial();
}
