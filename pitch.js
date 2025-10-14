/**
 * Shared Pitch Detection Module
 * Used by both main app and practice page
 */

class PitchDetector {
    constructor() {
        this.westernNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
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

    frequencyToSvara(frequency, basePitch) {
        const ratio = frequency / basePitch;
        
        let octave = 0;
        let normalizedRatio = ratio;
        
        while (normalizedRatio >= 2.0) {
            normalizedRatio /= 2.0;
            octave++;
        }
        while (normalizedRatio < 1.0) {
            normalizedRatio *= 2.0;
            octave--;
        }
        
        // Use just intonation ratios for Carnatic music
        const ratios = [1.0, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 16/9, 15/8];
        
        let closestIndex = 0;
        let minDifference = Math.abs(normalizedRatio - ratios[0]);
        
        for (let i = 1; i < ratios.length; i++) {
            const difference = Math.abs(normalizedRatio - ratios[i]);
            if (difference < minDifference) {
                minDifference = difference;
                closestIndex = i;
            }
        }
        
        return { index: closestIndex, octave: octave, pitch: frequency };
    }

    getExpectedFrequency(noteIndex, octave, basePitch) {
        const ratios = [1.0, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 16/9, 15/8];
        return basePitch * ratios[noteIndex] * Math.pow(2, octave);
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PitchDetector;
}
if (typeof window !== 'undefined') {
    window.PitchDetector = PitchDetector;
}
