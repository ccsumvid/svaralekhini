/**
 * Export Functionality Tests for Svara Lekhini
 */

describe('Export Functionality', () => {
    describe('Text Processing', () => {
        test('should remove HTML tags from text', () => {
            const htmlText = '<img src="svara-images/ma-middle.svg" alt="Ma" class="svara-image">';
            // Extract alt text first, then remove HTML tags
            const altMatch = htmlText.match(/alt="([^"]*)"/);
            const cleanText = altMatch ? altMatch[1] : htmlText.replace(/<[^>]*>/g, '');
            expect(cleanText).toBe('Ma');
        });

        test('should handle mixed text and HTML content', () => {
            const mixedContent = [
                'Sa',
                'Ri',
                '<img src="svara-images/ga-middle.svg" alt="Ga" class="svara-image">',
                'Ma',
                '<img src="svara-images/pa-middle.svg" alt="Pa" class="svara-image">'
            ];
            
            const cleanContent = mixedContent.map(item => {
                if (item.includes('<img')) {
                    // Extract alt text
                    const altMatch = item.match(/alt="([^"]*)"/);
                    return altMatch ? altMatch[1] : item.replace(/<[^>]*>/g, '');
                }
                return item;
            });
            
            expect(cleanContent).toEqual(['Sa', 'Ri', 'Ga', 'Ma', 'Pa']);
        });

        test('should format duration markers correctly', () => {
            // Test traditional Carnatic duration notation
            const formatDuration = (duration) => {
                if (duration <= 300) return '';
                
                const additionalUnits = Math.floor((duration - 300) / 200);
                let marker = '';
                let remainingUnits = additionalUnits;
                
                while (remainingUnits >= 2) {
                    marker += ';';
                    remainingUnits -= 2;
                }
                while (remainingUnits > 0) {
                    marker += ',';
                    remainingUnits -= 1;
                }
                
                return marker;
            };
            
            expect(formatDuration(300)).toBe('');
            expect(formatDuration(500)).toBe(',');
            expect(formatDuration(700)).toBe(';');
            expect(formatDuration(900)).toBe(';,');
        });
    });

    describe('Data Export Format', () => {
        test('should create proper CSV-like format for frequency data', () => {
            const mockData = [
                { time: 0, pitch: 261.63, svara: 'Sa' },
                { time: 500, pitch: 293.66, svara: 'Ri' },
                { time: 1000, pitch: 329.63, svara: 'Ga' }
            ];
            
            const csvContent = mockData.map(item => 
                `${item.time},${item.pitch},${item.svara}`
            ).join('\n');
            
            expect(csvContent).toContain('261.63');
            expect(csvContent).toContain('Sa');
            expect(csvContent.split('\n')).toHaveLength(3);
        });

        test('should handle empty data gracefully', () => {
            const emptyData = [];
            const csvContent = emptyData.map(item => 
                `${item.time},${item.pitch},${item.svara}`
            ).join('\n');
            
            expect(csvContent).toBe('');
        });
    });
});
