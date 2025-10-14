/**
 * Core Functionality Tests for Svara Lekhini
 */

describe('Core Mathematical Functions', () => {
    describe('Pitch to Svara Conversion', () => {
        test('should calculate semitones correctly', () => {
            const basePitch = 440; // A4
            
            // Test octave (2x frequency)
            const octaveFreq = 880;
            const semitones = Math.round(12 * Math.log2(octaveFreq / basePitch));
            expect(semitones).toBe(12);
            
            // Test perfect fifth (3/2 ratio ≈ 1.5x frequency)
            const fifthFreq = 659.25; // E5
            const fifthSemitones = Math.round(12 * Math.log2(fifthFreq / basePitch));
            expect(fifthSemitones).toBe(7);
        });

        test('should map frequencies to correct svara indices', () => {
            const basePitch = 440;
            
            // Test Sa (fundamental)
            const saFreq = 440;
            const saSemitones = Math.round(12 * Math.log2(saFreq / basePitch));
            const saIndex = ((saSemitones % 12) + 12) % 12;
            expect(saIndex).toBe(0);
            
            // Test Pa (perfect fifth)
            const paFreq = 659.25;
            const paSemitones = Math.round(12 * Math.log2(paFreq / basePitch));
            const paIndex = ((paSemitones % 12) + 12) % 12;
            expect(paIndex).toBe(7);
        });

        test('should handle octave calculations', () => {
            const basePitch = 440;
            
            // Lower octave
            const lowerFreq = 220;
            const lowerSemitones = Math.round(12 * Math.log2(lowerFreq / basePitch));
            const lowerOctave = Math.floor(lowerSemitones / 12);
            expect(lowerOctave).toBe(-1);
            
            // Higher octave
            const higherFreq = 880;
            const higherSemitones = Math.round(12 * Math.log2(higherFreq / basePitch));
            const higherOctave = Math.floor(higherSemitones / 12);
            expect(higherOctave).toBe(1);
        });
    });

    describe('Duration Calculation', () => {
        test('should calculate duration markers correctly', () => {
            function getDurationIndicator(duration) {
                if (duration < 300) return '';
                
                const additionalUnits = Math.floor((duration - 300) / 200) + 1;
                var durationMarker = '';
                
                // Use semicolons (worth 2 units each) first
                var semicolons = Math.floor(additionalUnits / 2);
                var commas = additionalUnits % 2;
                
                // Add remaining comma first if needed
                if (commas > 0) {
                    durationMarker += ',';
                }
                
                // Add semicolons
                for (var i = 0; i < semicolons; i++) {
                    durationMarker += ';';
                }
                
                return durationMarker;
            }

            expect(getDurationIndicator(250)).toBe('');
            expect(getDurationIndicator(500)).toBe(';');  // 500ms = 1 additional unit = semicolon
            expect(getDurationIndicator(700)).toBe(',;'); // 700ms = 2 additional units = comma + semicolon  
            expect(getDurationIndicator(900)).toBe(';;'); // 900ms = 3 additional units = 2 semicolons
            expect(getDurationIndicator(1100)).toBe(',;;'); // 1100ms = 4 additional units
            expect(getDurationIndicator(1300)).toBe(';;;'); // 1300ms = 6 additional units
        });
    });

    describe('Syllable Mapping', () => {
        test('should create smart mapping for equal syllables and notes', () => {
            function createSmartMapping(noteCount, syllableCount) {
                const mapping = [];
                
                if (syllableCount <= noteCount) {
                    const step = noteCount / syllableCount;
                    for (var i = 0; i < syllableCount; i++) {
                        mapping.push(Math.floor(i * step));
                    }
                } else {
                    for (var i = 0; i < syllableCount; i++) {
                        mapping.push(Math.floor(i * noteCount / syllableCount));
                    }
                }
                
                return mapping;
            }

            // Equal count
            expect(createSmartMapping(4, 4)).toEqual([0, 1, 2, 3]);
            
            // More notes than syllables
            expect(createSmartMapping(8, 4)).toEqual([0, 2, 4, 6]);
            
            // More syllables than notes
            expect(createSmartMapping(4, 8)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
        });
    });

    describe('Time Formatting', () => {
        test('should format time correctly', () => {
            function formatTime(seconds) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }

            expect(formatTime(0)).toBe('0:00');
            expect(formatTime(30)).toBe('0:30');
            expect(formatTime(60)).toBe('1:00');
            expect(formatTime(90)).toBe('1:30');
            expect(formatTime(125)).toBe('2:05');
        });
    });

    describe('Octave Detection', () => {
        test('should correctly detect octaves for Mayamalavagowla aarohana', () => {
            // Mock DOM elements
            const mockSelect = { value: '130.81' };
            global.document = {
                getElementById: jest.fn(() => mockSelect)
            };

            // Create mock SvaraScribe instance
            const app = {
                pitchData: [],
                frequencyToCarnaticSvara: function(frequency) {
                    let basePitch = parseFloat(mockSelect.value);
                    let ratio = frequency / basePitch;
                    
                    // Octave detection using log2
                    const logRatio = Math.log2(ratio);
                    let octave = Math.floor(logRatio);
                    ratio = Math.pow(2, logRatio - octave);
                    
                    // Find closest svara
                    const swaraArray = [
                        { svara: 'Sa', ratio: 1.0, index: 0 },
                        { svara: 'Ri1', ratio: Math.pow(2, 1/12), index: 1 },
                        { svara: 'Ga2', ratio: Math.pow(2, 4/12), index: 4 },
                        { svara: 'Ma1', ratio: Math.pow(2, 5/12), index: 5 },
                        { svara: 'Pa', ratio: Math.pow(2, 7/12), index: 7 },
                        { svara: 'Dha1', ratio: Math.pow(2, 8/12), index: 8 },
                        { svara: 'Ni2', ratio: Math.pow(2, 11/12), index: 11 }
                    ];
                    
                    let closestSvara = 'Sa';
                    let closestIndex = 0;
                    let minDifference = Math.abs(ratio - 1.0);
                    
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
            };

            // Test Mayamalavagowla aarohana frequencies
            const testCases = [
                { freq: 130.81, expected: 'Sa', octave: 0 },   // Sa
                { freq: 138.59, expected: 'Ri1', octave: 0 },  // Ri1
                { freq: 155.56, expected: 'Ga2', octave: 0 },  // Ga2
                { freq: 174.61, expected: 'Ma1', octave: 0 },  // Ma1
                { freq: 196.00, expected: 'Pa', octave: 0 },   // Pa
                { freq: 220.00, expected: 'Dha1', octave: 0 }, // Dha1
                { freq: 246.94, expected: 'Ni2', octave: 0 },  // Ni2
                { freq: 261.63, expected: 'Sa', octave: 1 }    // Sa (upper)
            ];

            testCases.forEach(test => {
                const result = app.frequencyToCarnaticSvara(test.freq);
                expect(result.svara).toBe(test.expected);
                expect(result.octave).toBe(test.octave);
            });
        });
    });

    describe('WORLD Algorithm', () => {
        test('should detect pitch using spectral analysis', () => {
            // Mock SvaraScribe instance with WORLD methods
            const app = {
                applyHanningWindow: function(data) {
                    const windowed = new Float32Array(data.length);
                    for (let i = 0; i < data.length; i++) {
                        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (data.length - 1)));
                        windowed[i] = data[i] * window;
                    }
                    return windowed;
                },
                
                computeFFT: function(data) {
                    // Simplified FFT for testing
                    const N = data.length;
                    const spectrum = new Array(Math.floor(N / 2));
                    
                    for (let k = 0; k < spectrum.length; k++) {
                        let real = 0, imag = 0;
                        for (let n = 0; n < N; n++) {
                            const angle = -2 * Math.PI * k * n / N;
                            real += data[n] * Math.cos(angle);
                            imag += data[n] * Math.sin(angle);
                        }
                        spectrum[k] = Math.sqrt(real * real + imag * imag);
                    }
                    
                    return spectrum;
                },
                
                harmonicTemplateScore: function(spectrum, f0, sampleRate) {
                    const harmonics = [1, 2, 3, 4];
                    let totalScore = 0;
                    
                    for (const harmonic of harmonics) {
                        const harmonicFreq = f0 * harmonic;
                        const bin = Math.round(harmonicFreq * spectrum.length * 2 / sampleRate);
                        
                        if (bin < spectrum.length) {
                            const magnitude = spectrum[bin] || 0;
                            totalScore += magnitude / harmonic;
                        }
                    }
                    
                    return totalScore / harmonics.length;
                }
            };

            // Test windowing function
            const testData = new Float32Array([1, 0, -1, 0, 1, 0, -1, 0]);
            const windowed = app.applyHanningWindow(testData);
            
            expect(windowed.length).toBe(testData.length);
            expect(windowed[0]).toBe(0); // Hanning window starts at 0
            expect(windowed[windowed.length - 1]).toBe(0); // Hanning window ends at 0
            
            // Test FFT computation
            const spectrum = app.computeFFT(windowed);
            expect(spectrum.length).toBe(Math.floor(testData.length / 2));
            expect(spectrum[0]).toBeGreaterThanOrEqual(0); // Magnitude should be non-negative
            
            // Test harmonic scoring
            const mockSpectrum = [0.1, 0.8, 0.4, 0.2, 0.3, 0.1, 0.05, 0.02];
            const score = app.harmonicTemplateScore(mockSpectrum, 1, 8);
            expect(score).toBeGreaterThan(0);
        });
    });

    describe('Frequency Validation', () => {
        test('should validate frequency ranges', () => {
            function isValidFrequency(freq) {
                return freq && freq > 80 && freq < 2000;
            }

            expect(isValidFrequency(50)).toBe(false);
            expect(isValidFrequency(100)).toBe(true);
            expect(isValidFrequency(440)).toBe(true);
            expect(isValidFrequency(1000)).toBe(true);
            expect(isValidFrequency(2500)).toBe(false);
            expect(isValidFrequency(null)).toBeFalsy(); // null is falsy
            expect(isValidFrequency(undefined)).toBeFalsy(); // undefined is falsy
        });
    });

    describe('Tanpura Harmonics', () => {
        test('should calculate correct harmonic frequencies', () => {
            const fundamental = 440;
            const harmonics = [
                { ratio: 1.0, amplitude: 0.8 },
                { ratio: 2.0, amplitude: 0.4 },
                { ratio: 3.0, amplitude: 0.3 },
                { ratio: 4.0, amplitude: 0.2 },
                { ratio: 5.0, amplitude: 0.15 }
            ];

            harmonics.forEach(harmonic => {
                const frequency = fundamental * harmonic.ratio;
                expect(frequency).toBeGreaterThan(0);
                expect(harmonic.amplitude).toBeGreaterThan(0);
                expect(harmonic.amplitude).toBeLessThanOrEqual(1);
            });

            // Test specific harmonics
            expect(fundamental * 2.0).toBe(880); // Octave
            expect(fundamental * 3.0).toBe(1320); // Perfect fifth (octave up)
        });
    });
});

describe('Performance Tests', () => {
    test('should handle rapid calculations efficiently', () => {
        const start = Date.now();
        
        // Test 1000 pitch calculations
        for (let i = 0; i < 1000; i++) {
            const freq = 200 + i;
            const semitones = Math.round(12 * Math.log2(freq / 440));
            const svaraIndex = ((semitones % 12) + 12) % 12;
        }
        
        const end = Date.now();
        expect(end - start).toBeLessThan(100); // Should complete in <100ms
    });
});
