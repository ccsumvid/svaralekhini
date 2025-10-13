// Language support and IAST transliteration
class LanguageSupport {
    constructor() {
        // Basic IAST transliteration mappings
        this.devanagariToIAST = {
            'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū',
            'ऋ': 'ṛ', 'ॠ': 'ṝ', 'ऌ': 'ḷ', 'ॡ': 'ḹ', 'ए': 'e', 'ऐ': 'ai',
            'ओ': 'o', 'औ': 'au', 'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha',
            'ङ': 'ṅa', 'च': 'ca', 'छ': 'cha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'ña',
            'ट': 'ṭa', 'ठ': 'ṭha', 'ड': 'ḍa', 'ढ': 'ḍha', 'ण': 'ṇa',
            'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
            'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
            'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'śa',
            'ष': 'ṣa', 'स': 'sa', 'ह': 'ha', 'ं': 'ṃ', 'ः': 'ḥ'
        };

        this.kannadaToIAST = {
            'ಅ': 'a', 'ಆ': 'ā', 'ಇ': 'i', 'ಈ': 'ī', 'ಉ': 'u', 'ಊ': 'ū',
            'ಋ': 'ṛ', 'ೠ': 'ṝ', 'ಌ': 'ḷ', 'ೡ': 'ḹ', 'ಎ': 'e', 'ಏ': 'ē',
            'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'ō', 'ಔ': 'au', 'ಕ': 'ka', 'ಖ': 'kha',
            'ಗ': 'ga', 'ಘ': 'gha', 'ಙ': 'ṅa', 'ಚ': 'ca', 'ಛ': 'cha',
            'ಜ': 'ja', 'ಝ': 'jha', 'ಞ': 'ña', 'ಟ': 'ṭa', 'ಠ': 'ṭha',
            'ಡ': 'ḍa', 'ಢ': 'ḍha', 'ಣ': 'ṇa', 'ತ': 'ta', 'ಥ': 'tha',
            'ದ': 'da', 'ಧ': 'dha', 'ನ': 'na', 'ಪ': 'pa', 'ಫ': 'pha',
            'ಬ': 'ba', 'ಭ': 'bha', 'ಮ': 'ma', 'ಯ': 'ya', 'ರ': 'ra',
            'ಲ': 'la', 'ವ': 'va', 'ಶ': 'śa', 'ಷ': 'ṣa', 'ಸ': 'sa', 'ಹ': 'ha'
        };

        this.teluguToIAST = {
            'అ': 'a', 'ఆ': 'ā', 'ఇ': 'i', 'ఈ': 'ī', 'ఉ': 'u', 'ఊ': 'ū',
            'ఋ': 'ṛ', 'ౠ': 'ṝ', 'ఌ': 'ḷ', 'ౡ': 'ḹ', 'ఎ': 'e', 'ఏ': 'ē',
            'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'ō', 'ఔ': 'au', 'క': 'ka', 'ఖ': 'kha',
            'గ': 'ga', 'ఘ': 'gha', 'ఙ': 'ṅa', 'చ': 'ca', 'ఛ': 'cha',
            'జ': 'ja', 'ఝ': 'jha', 'ఞ': 'ña', 'ట': 'ṭa', 'ఠ': 'ṭha',
            'డ': 'ḍa', 'ఢ': 'ḍha', 'ణ': 'ṇa', 'త': 'ta', 'థ': 'tha',
            'ద': 'da', 'ధ': 'dha', 'న': 'na', 'ప': 'pa', 'ఫ': 'pha',
            'బ': 'ba', 'భ': 'bha', 'మ': 'ma', 'య': 'ya', 'ర': 'ra',
            'ల': 'la', 'వ': 'va', 'శ': 'śa', 'ష': 'ṣa', 'స': 'sa', 'హ': 'ha'
        };
    }

    transliterateToIAST(text, language) {
        let mapping;
        switch (language) {
            case 'hindi':
            case 'sanskrit':
                mapping = this.devanagariToIAST;
                break;
            case 'kannada':
                mapping = this.kannadaToIAST;
                break;
            case 'telugu':
                mapping = this.teluguToIAST;
                break;
            default:
                return text; // Return as-is for English
        }

        return text.split('').map(char => mapping[char] || char).join('');
    }

    splitIntoSyllables(text, language) {
        switch (language) {
            case 'english':
                return text.split(/[\s\-]+/).filter(function(s) { return s.length > 0; });
            case 'hindi':
            case 'sanskrit':
            case 'kannada':
            case 'telugu':
                return this.splitIndicSyllables(text);
            default:
                return text.split(/[\s\-]+/).filter(function(s) { return s.length > 0; });
        }
    }

    splitIndicSyllables(text) {
        var words = text.split(/[\s\-।॥]+/).filter(function(s) { return s.length > 0; });
        var syllables = [];
        
        for (var i = 0; i < words.length; i++) {
            var wordSyllables = this.splitWordIntoSyllables(words[i]);
            for (var j = 0; j < wordSyllables.length; j++) {
                syllables.push(wordSyllables[j]);
            }
        }
        
        return syllables;
    }

    splitWordIntoSyllables(word) {
        if (!word || word.length === 0) return [];
        
        var syllables = [];
        var currentSyllable = '';
        
        for (var i = 0; i < word.length; i++) {
            var char = word[i];
            var charCode = char.charCodeAt(0);
            
            var isTeluguConsonant = (charCode >= 0x0C15 && charCode <= 0x0C39);
            var isTeluguVowel = (charCode >= 0x0C05 && charCode <= 0x0C14);
            var isTeluguMatra = (charCode >= 0x0C3E && charCode <= 0x0C4C);
            
            currentSyllable += char;
            
            var nextChar = i < word.length - 1 ? word[i + 1] : null;
            var nextCharCode = nextChar ? nextChar.charCodeAt(0) : 0;
            
            var nextIsConsonant = nextChar && (nextCharCode >= 0x0C15 && nextCharCode <= 0x0C39);
            var nextIsMatra = nextChar && (nextCharCode >= 0x0C3E && nextCharCode <= 0x0C4C);
            
            if (i === word.length - 1 || 
                (isTeluguVowel && nextIsConsonant) ||
                (isTeluguMatra && nextIsConsonant) ||
                (isTeluguConsonant && nextIsConsonant && !nextIsMatra)) {
                
                if (currentSyllable.trim()) {
                    syllables.push(currentSyllable.trim());
                }
                currentSyllable = '';
            }
        }
        
        if (currentSyllable.trim()) {
            syllables.push(currentSyllable.trim());
        }
        
        return syllables.length > 0 ? syllables : [word];
    }

    getSvaraNames(notationStyle, language) {
        if (notationStyle === 'western') {
            return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        }

        // Standard Carnatic notation format
        switch (language) {
            case 'kannada':
                return ['ಸ', 'ರಿ', 'ರಿ', 'ಗ', 'ಗ', 'ಮ', 'ಮ', 'ಪ', 'ಧ', 'ಧ', 'ನಿ', 'ನಿ'];
            case 'telugu':
                return ['స', 'రి', 'రి', 'గ', 'గ', 'మ', 'మ', 'ప', 'ధ', 'ధ', 'ని', 'ని'];
            case 'hindi':
            case 'sanskrit':
                return ['स', 'रि', 'रि', 'ग', 'ग', 'म', 'म', 'प', 'ध', 'ध', 'नि', 'नि'];
            default:
                return ['Sa', 'Ri', 'Ri', 'Ga', 'Ga', 'Ma', 'Ma', 'Pa', 'Dha', 'Dha', 'Ni', 'Ni'];
        }
    }

    // Get svara with proper subscripts/superscripts for variants
    getFormattedSvara(svaraIndex, language, octave = 0) {
        const baseNames = this.getSvaraNames('carnatic', language);
        const baseName = baseNames[svaraIndex];
        
        // Add variant numbers for Ri, Ga, Ma, Dha, Ni
        let formattedName = baseName;
        if ([1, 2].includes(svaraIndex)) { // Ri variants
            formattedName = baseName + (svaraIndex === 1 ? '₁' : '₂');
        } else if ([3, 4].includes(svaraIndex)) { // Ga variants  
            formattedName = baseName + (svaraIndex === 3 ? '₁' : '₂');
        } else if ([5, 6].includes(svaraIndex)) { // Ma variants
            formattedName = baseName + (svaraIndex === 5 ? '₁' : '₂');
        } else if ([8, 9].includes(svaraIndex)) { // Dha variants
            formattedName = baseName + (svaraIndex === 8 ? '₁' : '₂');
        } else if ([10, 11].includes(svaraIndex)) { // Ni variants
            formattedName = baseName + (svaraIndex === 10 ? '₁' : '₂');
        }
        
        // Add octave indicators - use alternative notation for Telugu
        if (language === 'telugu') {
            if (octave < 0) {
                formattedName = formattedName + '̥'; // Use ring below instead of dot below
            } else if (octave > 0) {
                formattedName = formattedName + '̊'; // Use ring above instead of dot above
            }
        } else {
            // For other languages, use standard combining diacritical marks
            if (octave < 0) {
                formattedName = formattedName + '̣'; // Dot below for lower octave
            } else if (octave > 0) {
                formattedName = formattedName + '̇'; // Dot above for higher octave
            }
        }
        
        return formattedName;
    }

    // Format duration with traditional Carnatic notation (commas and semicolons)
    formatDuration(svara, duration) {
        if (duration < 300) return svara; // 1 unit - basic duration
        
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
        
        return svara + durationMarker;
    }
}

// Export for use in main app
window.LanguageSupport = LanguageSupport;
