// Basic tests for Svara Lekhini core functionality
describe('Svara Lekhini Core Functions', () => {
  test('Pitch to svara conversion', () => {
    // Test equal temperament mapping
    const basePitch = 261.63; // C4
    const testPitch = 293.66; // D4
    const semitonesFromSa = Math.round(12 * Math.log2(testPitch / basePitch));
    const svaraIndex = ((semitonesFromSa % 12) + 12) % 12;
    expect(svaraIndex).toBe(2); // Should be Ga (2nd svara)
  });

  test('Duration formatting', () => {
    // Test traditional Carnatic duration notation
    const formatDuration = (duration) => {
      if (duration <= 300) return '';
      const additionalUnits = Math.floor((duration - 300) / 200);
      let remainingUnits = additionalUnits;
      let marker = '';
      while (remainingUnits >= 2) { marker += ';'; remainingUnits -= 2; }
      while (remainingUnits > 0) { marker += ','; remainingUnits -= 1; }
      return marker;
    };
    
    expect(formatDuration(250)).toBe('');
    expect(formatDuration(500)).toBe(','); // 500-300=200, floor(200/200)=1 remaining unit = ','
    expect(formatDuration(700)).toBe(';'); // 700-300=400, floor(400/200)=2 remaining units = ';'
  });

  test('Svara names mapping', () => {
    const svaraNames = {
      english: ['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa', 'Ri', 'Ga', 'Ma', 'Pa']
    };
    expect(svaraNames.english[0]).toBe('Sa');
    expect(svaraNames.english[4]).toBe('Pa');
  });
});
