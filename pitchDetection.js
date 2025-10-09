// Standalone pitch detection module for testing
class PitchDetection {
    constructor() {
        // Carnatic swarasthana ratios (12 notes)
        this.swaraArray = [
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
    }

    frequencyToSvara(frequency, basePitch = 440) {
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
        
        // Find closest match
        this.swaraArray.forEach((swaraData) => {
            const difference = Math.abs(ratio - swaraData.ratio);
            if (difference < minDifference) {
                minDifference = difference;
                closestSvara = swaraData.svara;
                closestIndex = swaraData.index;
            }
        });
        
        return { svara: closestSvara, index: closestIndex, octave: octave };
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PitchDetection;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PitchDetection = PitchDetection;
}
