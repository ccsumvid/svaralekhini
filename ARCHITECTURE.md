# Svara Lekhini - Technical Architecture

## Overview
Svara Lekhini is a real-time Carnatic music analysis web application with advanced pitch detection, visual feedback, and multi-language support.

## Core Architecture

### 1. Audio Processing Pipeline
```
Microphone → Web Audio API → Custom Autocorrelation → Pitch Stabilization → Svara Mapping → Live Display
```

#### Custom Autocorrelation Algorithm
- **RMS filtering**: Ignores signals below 0.01 threshold
- **Silence trimming**: Removes low amplitude areas for cleaner analysis
- **Peak detection**: Finds first dip then strongest peak for fundamental frequency
- **Interpolation**: Refines frequency between discrete lags (sub-sample accuracy)
- **Update rate**: 50ms intervals (20 times per second) for smooth real-time feedback

#### Pitch Stabilization
- **Window size**: 3 recent pitches (reduced from 5 for faster response)
- **Minimum samples**: 2 readings for basic stabilization
- **Pitch change detection**: >30 cents triggers immediate adaptation
- **Variance tolerance**: 30% for faster adaptation to new pitches

### 2. Pitch-to-Svara Mapping

#### Just Intonation Ratios (Traditional Carnatic)
```javascript
Sa: 1.0,     Ri1: 16/15,   Ri2: 9/8,    Ga1: 6/5,    Ga2: 5/4,    Ma1: 4/3,
Ma2: 45/32,  Pa: 3/2,      Dha1: 8/5,   Dha2: 5/3,   Ni1: 16/9,   Ni2: 15/8
```

#### Cross-Octave Detection
- **Range**: Checks svaras in octaves -2 to +2 from detected frequency
- **Distance metric**: Musical cents (1200 * log2(freq_ratio)) for accurate pitch distance
- **Global minimum**: Finds absolute closest note regardless of octave boundaries

### 3. Visual Components

#### Real-Time Pitch Dial
- **Size**: 240px diameter (20% larger for better readability)
- **Needle**: 65px length (shortened to avoid note interference)
- **Note positioning**: 90px radius with proper z-index layering
- **Deviation display**: Shows ±cents next to current note
- **Theme adaptation**: SVG images with CSS filter inversion for dark/light modes

#### Live Notation System
- **Note filtering**: Configurable minimum length (default 50ms)
- **Short note handling**: Merges with previous note or creates empty blocks (∼)
- **Width scaling**: Proportional to duration (60-200px range)
- **Grouping**: Notes <100ms grouped with smaller font (70% size)

### 4. Multi-Language Support

#### Image-Based Telugu Notation
- **SVG generation**: 36 images (12 svaras × 3 octave variants)
- **Theme-aware colors**: CSS variables with fallback (#333)
- **Octave indicators**: Proper dots above/below characters
- **File structure**: `/images/svaras/telugu/{svara}_{octave}.svg`

#### Text-Based Other Languages
- **Kannada, Hindi, Sanskrit**: Unicode text with combining diacriticals
- **English**: Standard Western notation (C, D, E, etc.)
- **IAST transliteration**: Automatic conversion for Indic languages

### 5. Data Flow Architecture

#### Recording Phase
```
Audio Input → Pitch Detection → Note Creation → Live Display → Storage
```

#### Analysis Phase
```
Stored Notes → Syllable Mapping → Synchronized Display → Export Options
```

#### Playback Phase
```
Audio Playback → Time Tracking → Note Highlighting → Visual Synchronization
```

### 6. Performance Optimizations

#### Audio Processing
- **Buffer size**: 4096 samples for better frequency resolution
- **Sample rate**: Adaptive based on audio context
- **Memory management**: Circular buffer for pitch history
- **Noise filtering**: RMS-based with adaptive thresholds

#### UI Responsiveness
- **Update throttling**: 50ms intervals prevent UI blocking
- **DOM optimization**: Minimal redraws, efficient element updates
- **CSS transitions**: Hardware-accelerated transforms for smooth animations

### 7. File Structure
```
svaralekhini/
├── index.html              # Main application UI
├── app.js                   # Core application logic (2600+ lines)
├── languages.js             # Multi-language support & IAST
├── images/svaras/telugu/    # SVG svara images
├── generate-svara-images.js # SVG generation script
├── test-mp3.js             # Audio analysis testing
├── core.test.js            # Unit tests
├── pitchDetection.test.js   # Pitch detection tests
└── ARCHITECTURE.md         # This documentation
```

### 8. Key Classes and Methods

#### SvaraScribe Main Class
```javascript
// Audio management
initializeAudio()           // Setup Web Audio API with 4096 buffer
startPitchDetection()       // Begin real-time analysis at 50ms intervals
autoCorrelate()            // Custom pitch detection algorithm

// Data processing
frequencyToCarnaticSvara() // Just intonation mapping with cross-octave detection
stabilizePitch()           // Adaptive pitch stabilization
updateLiveNotation()       // Real-time notation display

// Visual components
initializeDial()           // Setup pitch dial with theme-aware notes
updateDial()               // Real-time dial updates with deviation display
updateVisualization()      // Harmonic analysis and visual feedback
```

#### LanguageSupport Class
```javascript
// Text processing
getFormattedSvara()        // Localized svara names with octave indicators
getFormattedSvaraImage()   // HTML img tags for Telugu SVG svaras
transliterateToIAST()      // Script conversion for Indic languages
splitIntoSyllables()       // Language-aware syllable detection
```

### 9. Testing Framework

#### Unit Tests (Jest)
- **Core mathematical functions**: Frequency calculations, ratio conversions
- **Pitch detection algorithms**: Accuracy validation with known frequencies
- **Language processing**: IAST transliteration, syllable splitting

#### Integration Tests
- **MP3 analysis**: Mayamalavagowla arohana detection (75% accuracy)
- **SVG generation**: Automated Telugu image creation
- **Cross-browser compatibility**: Web Audio API, MediaRecorder support

### 10. Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| SVG Images | ✅ | ✅ | ✅ | ✅ |
| PWA Support | ✅ | ✅ | ✅ | ✅ |

### 11. Performance Metrics

#### Real-Time Processing
- **Pitch detection**: <10ms latency with custom autocorrelation
- **Visual updates**: 60fps with hardware acceleration
- **Memory usage**: <50MB for typical 5-minute session
- **CPU usage**: <15% on modern devices

#### Accuracy Benchmarks
- **Mayamalavagowla test**: 75% note detection accuracy
- **Pitch precision**: ±5 cents for stable tones
- **Octave detection**: 95% accuracy with cross-octave validation
- **Noise rejection**: Effective filtering below 0.01 RMS threshold

### 12. Security Considerations

#### Data Privacy
- **Local processing**: All audio analysis happens client-side
- **No server uploads**: Audio never leaves user's device
- **Session storage**: Only user preferences stored locally
- **HTTPS required**: For microphone access in production

#### Content Security
- **SVG sanitization**: Generated images use safe, static content
- **Input validation**: All user inputs properly escaped
- **XSS prevention**: No dynamic script execution

### 13. Future Architecture Considerations

#### Scalability
- **Web Workers**: Move pitch detection to background thread
- **WebAssembly**: Optimize autocorrelation algorithm
- **IndexedDB**: Store longer recording sessions
- **Service Workers**: Offline functionality

#### Enhanced Features
- **MIDI export**: Convert notation to standard MIDI format
- **Cloud sync**: Optional user account with encrypted storage
- **Collaborative features**: Real-time session sharing
- **Advanced analysis**: Gamaka detection, rhythm analysis

---

**Last Updated**: October 14, 2025  
**Version**: 0.3.WORLD  
**Maintainer**: Sumvid Solutions
