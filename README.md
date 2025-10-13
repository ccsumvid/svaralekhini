# Svara Lekhini - Carnatic Music Analyzer

A fast, cross-platform web application for real-time Carnatic music analysis with pitch detection and notation.

## Features

- **Real-time pitch detection** with 90% accuracy using Pitchy.js
- **12 swarasthana recognition** for complete Carnatic music analysis
- **Interactive synchronized notation** with syllable alignment controls
- **Traditional duration notation** using commas (,) and semicolons (;)
- **Multi-language support**: Kannada, Telugu, Hindi, Sanskrit, English
- **Automatic IAST transliteration** for Indic languages
- **Syllable-to-note synchronization** with manual adjustment
- **Drone sound generator** for pitch reference (all 24 shruti options)
- **Western/Carnatic notation toggle**
- **Audio recording and export** (WebM format)
- **Notation export** (text format)
- **Dark/Light theme toggle** with Apple-style design
- **Progressive Web App** - installable on any device

## Quick Start

1. Open `index.html` in any modern web browser
2. Allow microphone access when prompted
3. Select your base pitch (Sa) from 24 shruti options and preferred notation style
4. Click "Play" to hear the reference pitch
5. Paste or type lyrics in your chosen language
6. Click "Start Recording" and sing
7. Click "Stop Recording" and then "Analyze" to see results
8. Use ◀ ▶ buttons to adjust syllable-note alignment
9. Export your audio and notation as needed

## Technical Architecture

### Core Components

#### 1. Audio Processing (`app.js`)
```javascript
class SvaraScribe {
    // Web Audio API integration
    audioContext: AudioContext
    analyser: AnalyserNode
    pitchDetector: Pitchy detector
    
    // Data structures
    pitchData: Array<{pitch, time, svaraIndex, octave}>
    liveNotation: Array<{svara, duration, displayNote}>
    syllableNoteMapping: Array<number>
}
```

#### 2. Pitch Detection Pipeline
1. **Audio Input**: Web Audio API captures microphone
2. **Frequency Analysis**: Pitchy.js detects fundamental frequency
3. **Pitch Stabilization**: Median filter (5 samples, 5% variance)
4. **Svara Mapping**: Equal temperament ratios (Math.pow(2, n/12))
5. **Duration Tracking**: Real-time note length calculation
6. **Live Display**: Immediate visual feedback

#### 3. Language Support (`languages.js`)
```javascript
class LanguageSupport {
    // Svara name mappings for 5 languages
    svaraNames: {kannada, telugu, hindi, sanskrit, english}
    
    // IAST transliteration engine
    transliterateToIAST(text, language): string
    
    // Traditional duration formatting
    formatDuration(svara, duration): string // Uses , and ;
}
```

### Key Algorithms

#### Pitch to Svara Conversion
```javascript
// Equal temperament mapping
const semitonesFromSa = Math.round(12 * Math.log2(pitch / basePitch));
const svaraIndex = ((semitonesFromSa % 12) + 12) % 12;
const octave = Math.floor(semitonesFromSa / 12);
```

#### Duration Notation (Traditional Carnatic)
```javascript
// Comma (,) = +1 unit, Semicolon (;) = +2 units
const additionalUnits = Math.floor((duration - 300) / 200) + 1;
let marker = '';
while (remainingUnits >= 2) { marker += ';'; remainingUnits -= 2; }
while (remainingUnits > 0) { marker += ','; remainingUnits -= 1; }
```

#### Interactive Syllable Alignment
```javascript
// Syllable-note mapping with conflict resolution
syllableNoteMapping: [0, 1, 2, ...] // syllableIndex -> noteIndex
autoAlignSyllables() // Prevents overlaps when moving syllables
```

### File Structure

```
svarascribe/
├── index.html          # Main application UI
├── app.js             # Core application logic (1000+ lines)
├── languages.js       # Multi-language support & IAST
├── manifest.json      # PWA configuration
└── README.md          # This documentation
```

### Data Flow

1. **Recording Phase**:
   ```
   Microphone → Web Audio API → Pitchy.js → Pitch Stabilization → Live Notation
   ```

2. **Analysis Phase**:
   ```
   Live Notation → Syllable Processing → Interactive Grid → Synchronized Display
   ```

3. **Export Phase**:
   ```
   Live Notation + Syllable Mapping → Text Format + WebM Audio
   ```

## Development Guide

### Prerequisites
- Modern browser with Web Audio API support
- Basic understanding of JavaScript ES6+
- Familiarity with HTML5 Canvas and CSS Grid

### Key Classes and Methods

#### SvaraScribe Main Class
```javascript
// Audio management
initializeAudio()           // Setup Web Audio API
startPitchDetection()       // Begin real-time analysis
toggleDrone()              // Reference tone control

// Data processing
detectPitch(audioData)      // Core pitch detection
updateLiveNotation()        // Real-time display updates
displayAnalysis()          // Interactive synchronized view

// User interaction
moveSyllable(index, direction)  // Syllable alignment
autoAlignSyllables()           // Conflict resolution
```

#### Language Support
```javascript
// Text processing
getFormattedSvara(index, lang, octave)  // Localized svara names
transliterateToIAST(text, language)     // Script conversion
formatDuration(svara, duration)         // Traditional notation
```

### Adding New Features

#### 1. New Language Support
```javascript
// In languages.js
svaraNames.newLanguage = ['Sa', 'Ri', ...];
transliterationMaps.newLanguage = {/* mapping */};
```

#### 2. Custom Duration Markers
```javascript
// Modify formatDuration() in languages.js
formatDuration(svara, duration) {
    // Add your custom duration logic
}
```

#### 3. Additional Shruti Options
```javascript
// In index.html, add to basePitch select
<option value="frequency">Note (frequency Hz) - Range</option>
```

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| PWA Support | ✅ | ✅ | ✅ | ✅ |

### Performance Considerations

- **Real-time Processing**: 60fps pitch detection with 1024-sample FFT
- **Memory Management**: Circular buffer for pitch stabilization
- **DOM Updates**: Throttled to prevent UI blocking
- **Audio Latency**: <50ms for live feedback

### Testing

#### Manual Testing Checklist
- [ ] Microphone permission granted
- [ ] All 24 shruti options play correctly
- [ ] Live notation updates in real-time
- [ ] Syllable alignment works with ◀ ▶ buttons
- [ ] Theme toggle preserves user preference
- [ ] Export functions generate valid files
- [ ] PWA installs on mobile devices

#### Common Issues
1. **No audio input**: Check microphone permissions
2. **Pitch detection fails**: Verify Web Audio API support
3. **Syllables misaligned**: Use manual adjustment controls
4. **Export not working**: Ensure MediaRecorder API support

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Test thoroughly across browsers
4. Submit pull request with detailed description

### API Reference

#### Core Methods
```javascript
// Initialize application
const app = new SvaraScribe();

// Start/stop recording
app.startRecording();
app.stopRecording();

// Process lyrics
app.processLyrics();

// Export data
app.exportAudio();
app.exportNotation();
```

### Deployment

#### Static Hosting
- Upload all files to web server
- Ensure HTTPS for microphone access
- Configure PWA manifest for app stores

#### Local Development
```bash
# Simple HTTP server
python -m http.server 8000
# or
npx serve .
```

## Built With

- **Vanilla JavaScript** - No frameworks for maximum compatibility
- **Pitchy.js** - High-accuracy pitch detection library
- **Web Audio API** - Native browser audio processing
- **CSS Grid** - Modern responsive layout
- **PWA Standards** - Cross-platform installation

Created by Sumvid Solutions
# Deployment trigger
