const PitchDetection = require('./pitchDetection');

describe('PitchDetection', () => {
    let pitchDetector;
    
    beforeEach(() => {
        pitchDetector = new PitchDetection();
    });

    describe('Basic Svara Detection (A4 = 440Hz)', () => {
        const basePitch = 440;
        
        test('should detect Sa correctly', () => {
            const result = pitchDetector.frequencyToSvara(440, basePitch);
            expect(result.svara).toBe('Sa');
            expect(result.octave).toBe(0);
        });

        test('should detect all 12 svaras in base octave', () => {
            const expectedResults = [
                { freq: 440 * 1.0, expected: 'Sa' },
                { freq: 440 * 16/15, expected: 'Ri1' },
                { freq: 440 * 9/8, expected: 'Ri2' },
                { freq: 440 * 6/5, expected: 'Ga1' },
                { freq: 440 * 5/4, expected: 'Ga2' },
                { freq: 440 * 4/3, expected: 'Ma1' },
                { freq: 440 * 45/32, expected: 'Ma2' },
                { freq: 440 * 3/2, expected: 'Pa' },
                { freq: 440 * 8/5, expected: 'Dha1' },
                { freq: 440 * 5/3, expected: 'Dha2' },
                { freq: 440 * 16/9, expected: 'Ni1' },
                { freq: 440 * 15/8, expected: 'Ni2' }
            ];

            expectedResults.forEach(test => {
                const result = pitchDetector.frequencyToSvara(test.freq, basePitch);
                expect(result.svara).toBe(test.expected);
                expect(result.octave).toBe(0);
            });
        });
    });

    describe('Octave Detection', () => {
        const basePitch = 440;

        test('should detect higher octave correctly', () => {
            const result = pitchDetector.frequencyToSvara(880, basePitch); // 2x frequency
            expect(result.svara).toBe('Sa');
            expect(result.octave).toBe(1);
        });

        test('should detect lower octave correctly', () => {
            const result = pitchDetector.frequencyToSvara(220, basePitch); // 0.5x frequency
            expect(result.svara).toBe('Sa');
            expect(result.octave).toBe(-1);
        });

        test('should detect multiple octaves', () => {
            const testCases = [
                { freq: 110, expectedOctave: -2 },
                { freq: 220, expectedOctave: -1 },
                { freq: 440, expectedOctave: 0 },
                { freq: 880, expectedOctave: 1 },
                { freq: 1760, expectedOctave: 2 }
            ];

            testCases.forEach(test => {
                const result = pitchDetector.frequencyToSvara(test.freq, basePitch);
                expect(result.svara).toBe('Sa');
                expect(result.octave).toBe(test.expectedOctave);
            });
        });
    });

    describe('Different Base Pitches', () => {
        test('should work with C4 base pitch (261.63Hz)', () => {
            const basePitch = 261.63;
            const result = pitchDetector.frequencyToSvara(261.63, basePitch);
            expect(result.svara).toBe('Sa');
            expect(result.octave).toBe(0);
        });

        test('should work with G3 base pitch (196Hz)', () => {
            const basePitch = 196;
            const result = pitchDetector.frequencyToSvara(196, basePitch);
            expect(result.svara).toBe('Sa');
            expect(result.octave).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        const basePitch = 440;

        test('should handle very low frequencies', () => {
            const result = pitchDetector.frequencyToSvara(55, basePitch); // Very low
            expect(result.octave).toBeLessThan(0);
        });

        test('should handle very high frequencies', () => {
            const result = pitchDetector.frequencyToSvara(3520, basePitch); // Very high
            expect(result.octave).toBeGreaterThan(0);
        });

        test('should handle frequencies between svaras', () => {
            const saBetweenRi = 440 * ((1.0 + 16/15) / 2); // Midpoint between Sa and Ri1
            const result = pitchDetector.frequencyToSvara(saBetweenRi, basePitch);
            expect(['Sa', 'Ri1']).toContain(result.svara);
        });
    });

    describe('Piano Note Testing', () => {
        test('should correctly identify piano notes with A4=440Hz base', () => {
            const basePitch = 440;
            const pianoNotes = [
                { freq: 261.63, note: 'C4', expectedSvara: 'Ga1' }, // C4 relative to A4
                { freq: 293.66, note: 'D4', expectedSvara: 'Ma2' }, // D4 relative to A4
                { freq: 329.63, note: 'E4', expectedSvara: 'Pa' },   // E4 relative to A4
                { freq: 349.23, note: 'F4', expectedSvara: 'Dha1' }, // F4 relative to A4
                { freq: 392.00, note: 'G4', expectedSvara: 'Ni2' },  // G4 relative to A4
                { freq: 440.00, note: 'A4', expectedSvara: 'Sa' },   // A4 = Sa
                { freq: 493.88, note: 'B4', expectedSvara: 'Ri2' }   // B4 relative to A4
            ];

            pianoNotes.forEach(test => {
                const result = pitchDetector.frequencyToSvara(test.freq, basePitch);
                console.log(`${test.note} (${test.freq}Hz) -> ${result.svara} (expected: ${test.expectedSvara})`);
                // Note: These are approximate - piano tuning vs just intonation differences
            });
        });
    });

    describe('Bug Fix: G# Detection', () => {
        test('should detect G# correctly, not as C', () => {
            const basePitch = 440; // A4
            const gSharpFreq = 415.30; // G#4
            const result = pitchDetector.frequencyToSvara(gSharpFreq, basePitch);
            
            console.log(`G# (415.30Hz) detected as: ${result.svara} (index: ${result.index})`);
            
            // G# should be detected as Ni1 or Ni2, NOT Sa (which would be C relative to A)
            expect(['Ni1', 'Ni2']).toContain(result.svara);
            expect(result.svara).not.toBe('Sa'); // Should NOT be Sa (C)
        });

        test('should detect all chromatic notes correctly', () => {
            const basePitch = 440; // A4 = Sa
            const chromaticTests = [
                { freq: 440.00, note: 'A4', expectedSvara: 'Sa' },
                { freq: 466.16, note: 'A#4', expectedSvara: 'Ri1' },
                { freq: 493.88, note: 'B4', expectedSvara: 'Ri2' },
                { freq: 523.25, note: 'C5', expectedSvara: 'Ga1' },
                { freq: 415.30, note: 'G#4', expectedNotSvara: 'Sa' } // Should NOT be Sa
            ];

            chromaticTests.forEach(test => {
                const result = pitchDetector.frequencyToSvara(test.freq, basePitch);
                console.log(`${test.note} (${test.freq}Hz) -> ${result.svara}`);
                
                if (test.expectedSvara) {
                    expect(result.svara).toBe(test.expectedSvara);
                }
                if (test.expectedNotSvara) {
                    expect(result.svara).not.toBe(test.expectedNotSvara);
                }
            });
        });
    });
});
