#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// G4 frequency (392 Hz)
const G4_FREQUENCY = 392.0;

// Expected Mayamalavagowla aarohana sequence
const EXPECTED_SVARAS = ['Sa', 'Ri1', 'Ga2', 'Ma1', 'Pa', 'Da1', 'Ni2', 'Sa'];

// Svara frequency ratios (equal temperament)
const SVARA_RATIOS = {
    'Sa': 1.0,                    // 0 semitones
    'Ri1': Math.pow(2, 1/12),     // 1 semitone
    'Ri2': Math.pow(2, 2/12),     // 2 semitones  
    'Ga1': Math.pow(2, 2/12),     // 2 semitones
    'Ga2': Math.pow(2, 3/12),     // 3 semitones (minor third)
    'Ma1': Math.pow(2, 5/12),     // 5 semitones
    'Ma2': Math.pow(2, 6/12),     // 6 semitones
    'Pa': Math.pow(2, 7/12),      // 7 semitones
    'Da1': Math.pow(2, 8/12),     // 8 semitones
    'Da2': Math.pow(2, 9/12),     // 9 semitones
    'Ni1': Math.pow(2, 9/12),     // 9 semitones
    'Ni2': Math.pow(2, 11/12)     // 11 semitones
};

function frequencyToSvara(frequency, basePitch) {
    if (!frequency || frequency < 50) return 'Unknown';
    
    const ratio = frequency / basePitch;
    let octaveRatio = ratio;
    
    // Normalize to first octave
    while (octaveRatio >= 2) octaveRatio /= 2;
    while (octaveRatio < 1) octaveRatio *= 2;
    
    let closestSvara = 'Sa';
    let minDiff = Math.abs(octaveRatio - SVARA_RATIOS['Sa']);
    
    for (const [svara, svaraRatio] of Object.entries(SVARA_RATIOS)) {
        const diff = Math.abs(octaveRatio - svaraRatio);
        if (diff < minDiff) {
            minDiff = diff;
            closestSvara = svara;
        }
    }
    
    return closestSvara;
}

// Simple autocorrelation pitch detection
function detectPitch(audioData, sampleRate) {
    return autoCorrelate(audioData, sampleRate);
}

// Improved autocorrelation function
function autoCorrelate(buffer, sampleRate) {
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

async function analyzeMP3() {
    const mp3Path = '/Volumes/ssd1/video-capture/sarali1.mp3';
    
    if (!fs.existsSync(mp3Path)) {
        console.error('MP3 file not found:', mp3Path);
        return;
    }
    
    console.log('Analyzing MP3:', mp3Path);
    console.log('Expected sequence:', EXPECTED_SVARAS.join(' → '));
    
    try {
        // Extract raw audio using ffmpeg
        const rawPath = '/tmp/audio.raw';
        execSync(`ffmpeg -i "${mp3Path}" -f f32le -ac 1 -ar 22050 "${rawPath}" -y`, {stdio: 'pipe'});
        
        const audioBuffer = fs.readFileSync(rawPath);
        const audioData = new Float32Array(audioBuffer.buffer);
        const sampleRate = 22050;
        
        console.log(`\nAudio loaded: ${audioData.length} samples at ${sampleRate}Hz`);
        console.log(`Duration: ${(audioData.length / sampleRate).toFixed(2)}s`);
        
        // Analyze in segments to find base pitch
        const segmentDuration = 0.5; // 500ms segments
        const segmentSize = Math.floor(segmentDuration * sampleRate);
        const allPitches = [];
        
        console.log('\n--- Pitch Detection Results ---');
        
        for (let i = 0; i < audioData.length - segmentSize; i += segmentSize) {
            const segment = audioData.slice(i, i + segmentSize);
            const pitch = detectPitch(segment, sampleRate);
            const time = (i / sampleRate).toFixed(1);
            
            if (pitch > 0 && pitch > 80 && pitch < 800) { // Valid pitch range, exclude -1 returns
                console.log(`${time}s: ${pitch.toFixed(1)}Hz`);
                allPitches.push(pitch);
            }
        }
        
        // Auto-detect base pitch from first few stable notes
        const stablePitches = allPitches.slice(2, 6); // Skip first 2, take next 4
        const avgBasePitch = stablePitches.reduce((a, b) => a + b, 0) / stablePitches.length;
        
        console.log(`\nAuto-detected base pitch (Sa): ${avgBasePitch.toFixed(1)}Hz`);
        console.log(`Original assumption was G4: ${G4_FREQUENCY}Hz`);
        
        // Re-analyze with detected base pitch
        const detectedSvaras = allPitches.map(pitch => frequencyToSvara(pitch, avgBasePitch));
        
        // Clean up
        fs.unlinkSync(rawPath);
        
        console.log('\n--- Svara Detection ---');
        allPitches.forEach((pitch, i) => {
            const svara = frequencyToSvara(pitch, avgBasePitch);
            const time = (i * 0.5).toFixed(1);
            console.log(`${time}s: ${pitch.toFixed(1)}Hz → ${svara}`);
        });
        
        console.log('\n--- Comparison ---');
        console.log('Expected:', EXPECTED_SVARAS.join(' → '));
        console.log('Detected:', detectedSvaras.join(' → '));
        
        // Extract clean sequence by looking for consecutive unique svaras
        const cleanSequence = [];
        let lastSvara = '';
        
        for (const svara of detectedSvaras) {
            if (svara !== lastSvara) {
                cleanSequence.push(svara);
                lastSvara = svara;
            }
        }
        
        console.log('Clean sequence:', cleanSequence.join(' → '));
        
        // Find the best matching subsequence
        let bestMatch = 0;
        let bestStart = 0;
        
        // Try all possible starting positions
        for (let start = 0; start <= cleanSequence.length - EXPECTED_SVARAS.length; start++) {
            let matches = 0;
            for (let i = 0; i < EXPECTED_SVARAS.length; i++) {
                if (cleanSequence[start + i] === EXPECTED_SVARAS[i]) {
                    matches++;
                }
            }
            if (matches > bestMatch) {
                bestMatch = matches;
                bestStart = start;
            }
        }
        
        // Also check for the core arohana pattern (Sa → Ri1 → Ga2 → Ma1 → Pa → Da1 → Ni2)
        const corePattern = ['Sa', 'Ri1', 'Ga2', 'Ma1', 'Pa', 'Da1', 'Ni2'];
        for (let start = 0; start <= cleanSequence.length - corePattern.length; start++) {
            let matches = 0;
            for (let i = 0; i < corePattern.length; i++) {
                if (cleanSequence[start + i] === corePattern[i]) {
                    matches++;
                }
            }
            if (matches > bestMatch) {
                bestMatch = matches;
                bestStart = start;
                console.log(`Found better match with core pattern: ${matches}/${corePattern.length}`);
            }
        }
        
        // Check for partial matches (6 out of 7 notes, allowing for missing Da1)
        const partialPattern = ['Sa', 'Ri1', 'Ga2', 'Ma1', 'Pa', 'Ni2'];
        for (let start = 0; start <= cleanSequence.length - partialPattern.length; start++) {
            let matches = 0;
            for (let i = 0; i < partialPattern.length; i++) {
                if (cleanSequence[start + i] === partialPattern[i]) {
                    matches++;
                }
            }
            if (matches >= 5 && matches > bestMatch) { // At least 5/6 match
                bestMatch = matches;
                bestStart = start;
                console.log(`Found partial arohana pattern: ${matches}/${partialPattern.length}`);
            }
        }
        
        console.log(`\nBest match in clean sequence starting at position ${bestStart}:`);
        for (let i = 0; i < EXPECTED_SVARAS.length; i++) {
            const expected = EXPECTED_SVARAS[i];
            const detected = cleanSequence[bestStart + i] || 'Missing';
            const match = expected === detected ? '✓' : '✗';
            console.log(`${i + 1}. Expected: ${expected}, Detected: ${detected} ${match}`);
        }
        
        const accuracy = (bestMatch / EXPECTED_SVARAS.length) * 100;
        console.log(`\nFinal accuracy: ${bestMatch}/${EXPECTED_SVARAS.length} (${accuracy.toFixed(1)}%)`);
        
        // Show the detected aarohana
        const detectedAarohana = cleanSequence.slice(bestStart, bestStart + EXPECTED_SVARAS.length);
        console.log(`\nDetected Mayamalavagowla aarohana: ${detectedAarohana.join(' → ')}`);
        
        if (accuracy >= 87.5) { // 7/8 or better
            console.log('🎵 SUCCESS: Aarohana detected correctly!');
        } else if (accuracy >= 62.5) { // 5/8 or better  
            console.log('⚠️  PARTIAL: Most notes detected correctly, minor issues remain');
        } else {
            console.log('❌ FAILED: Significant detection issues found');
        }
    } catch (error) {
        console.error('Error analyzing MP3:', error.message);
    }
}

analyzeMP3().catch(console.error);
