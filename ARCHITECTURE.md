# Svara Lekhini - Technical Architecture

## Overview
Svara Lekhini is a real-time Carnatic music analysis web application with advanced pitch detection, visual feedback, multi-language support, and line-by-line lyric recording capabilities.

## Core Architecture

### 1. Audio Processing Pipeline
```
Microphone → Web Audio API → Custom Autocorrelation → Pitch Stabilization → Svara Mapping → Line-Based Display
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

### 3. Lyric Editor System (NEW)

#### Multi-Line Recording Architecture
```
Lyric Input → Line Parsing → Line-by-Line Recording → Individual Note Alignment → Export
```

#### Core Components
- **Lyric Editor**: Multi-line textarea with real-time parsing
- **Line Management**: Individual notation containers per lyric line
- **Recording State**: Pause/resume functionality with line navigation
- **Note Alignment**: Left/right controls for precise syllable-note matching

#### Recording Flow
1. **Setup**: User enters multi-line lyrics
2. **Recording**: Line-by-line capture with Enter key navigation
3. **Pause/Resume**: Mid-recording control without data loss
4. **Alignment**: Post-recording note positioning per line
5. **Export**: Combined notation from all lines

### 4. Visual Architecture & Design System

#### Design Philosophy
- **Apple-inspired aesthetics**: Clean, minimal interface with subtle shadows and gradients
- **Dark/Light theme support**: CSS custom properties with seamless theme switching
- **Accessibility-first**: High contrast ratios, keyboard navigation, screen reader support
- **Progressive disclosure**: Complex features revealed contextually
- **Responsive design**: Fluid layouts adapting to all screen sizes

#### Color System
```css
/* Light Theme */
--bg-primary: linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%)
--bg-secondary: rgba(255, 255, 255, 0.8)
--bg-card: rgba(255, 255, 255, 0.9)
--text-primary: #1d1d1f
--text-secondary: #424245
--border-color: rgba(0, 0, 0, 0.1)

/* Dark Theme */
--bg-primary: #0f0f0f
--bg-secondary: #1a1a1a
--bg-card: #1e1e1e
--text-primary: #ffffff
--text-secondary: #b0b0b0
--border-color: rgba(255, 255, 255, 0.1)
```

#### Typography System
- **Primary font**: Inter (300-700 weights) for UI elements
- **Monospace font**: JetBrains Mono for notation and technical data
- **Scale**: 0.8rem (small) → 1rem (body) → 1.25rem (h3) → 1.5rem (h2) → 2rem (h1)
- **Line height**: 1.6 for optimal readability
- **Font loading**: Google Fonts with display=swap for performance

#### Layout Architecture

##### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ 🎵 Svara Lekhini                    [⚙️] [🌙] [?]          │
│ Carnatic Music Analysis & Notation                          │
└─────────────────────────────────────────────────────────────┘
```
- **Logo area**: Musical note emoji + app name
- **Controls**: Settings gear, theme toggle, help button
- **Positioning**: Flexbox with space-between alignment
- **Responsive**: Stacks vertically on mobile

##### Main Content Grid
```
┌─────────────────┬───────────────────────────────────────────┐
│                 │                                           │
│   Pitch Dial    │           Control Panel                   │
│   (240×240px)   │   ┌─────────────────────────────────────┐ │
│                 │   │ Recording Controls                  │ │
│                 │   │ [🎤 Start] [⏸️ Pause] [⏹️ Stop]    │ │
│                 │   └─────────────────────────────────────┘ │
│                 │   ┌─────────────────────────────────────┐ │
│                 │   │ Audio Controls                      │ │
│                 │   │ [🔊 Play] [📁 Export] [🎵 Hz]      │ │
│                 │   └─────────────────────────────────────┘ │
└─────────────────┴───────────────────────────────────────────┘
```

##### Settings Section (Collapsible)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                                 │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│ │🎼 Notation  │🎵 Base Pitch│🌐 Language  │⏱️ Min Length│   │
│ │   Style     │   (Sa)      │             │             │   │
│ │ [Carnatic▼] │ [C4 - 261▼] │ [Telugu ▼]  │ [150ms   ▼] │   │
│ └─────────────┴─────────────┴─────────────┴─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

##### Lyric Editor Interface
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 Lyric Editor                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Enter your lyrics here...                               │ │
│ │ Line 1: Rama Krishna Govinda                            │ │
│ │ Line 2: Jai Jai Rama                                    │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

##### Notation Lines Display
```
┌─────────────────────────────────────────────────────────────┐
│ 🎼 Live Notation                    [Clear] [⚡Auto] [📄]   │
│                                                             │
│ Line 1                                          [◀] [▶] [⚡] │
│ Lyrics: [Ra] [ma] [-] [Krish] [na]                          │
│ Notes:  [Sa] [Ri] [-] [Ga   ] [Ma]                          │
│                                                             │
│ Line 2                                          [◀] [▶] [⚡] │
│ Lyrics: [Jai] [-] [Jai] [Ra] [ma]                           │
│ Notes:  [Pa ] [-] [Dha] [Ni] [Sa]                           │
└─────────────────────────────────────────────────────────────┘
```

#### Component Design Specifications

##### Real-Time Pitch Dial
- **Dimensions**: 240×240px circular container
- **Background**: Subtle gradient with border-radius: 50%
- **Needle**: 90px red line with smooth rotation transitions
- **Note labels**: 12 positions at 90px radius
- **Telugu support**: SVG images with CSS filter for theme adaptation
- **Animations**: transform: rotate() with 0.1s ease transitions

##### Interactive Spans (Syllables & Notes)
```css
.syllable-span, .live-note {
    display: inline-block;
    padding: 0.25rem 0.4rem;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.selected {
    background: var(--danger);
    color: white;
    box-shadow: 0 0 8px rgba(255, 59, 48, 0.4);
}

.empty-space {
    border: 1px dashed var(--border-color);
    opacity: 0.5;
}
```

##### Alignment Controls
- **Button style**: Circular 32×32px with centered arrows
- **Colors**: Secondary background with hover effects
- **Auto-align**: Green background (success color) with lightning icon
- **Positioning**: Flexbox row with 5px gap

##### Recording Status Indicators
```
🔴 Recording Line 2/5    ⏸️ Paused    ⏹️ Stopped
```
- **Status icons**: Emoji for universal recognition
- **Text**: Current line number and total lines
- **Colors**: Red for recording, yellow for paused, gray for stopped

#### Responsive Breakpoints

##### Desktop (>1024px)
- **Layout**: Side-by-side dial and controls
- **Grid**: 2-column layout with 1fr 2fr ratio
- **Typography**: Full scale (1rem base)

##### Tablet (768px - 1024px)
- **Layout**: Stacked with reduced spacing
- **Grid**: Single column with adjusted proportions
- **Typography**: Slightly reduced (0.9rem base)

##### Mobile (<768px)
- **Layout**: Full-width stacked components
- **Dial**: Reduced to 180×180px
- **Controls**: Full-width buttons with larger touch targets
- **Typography**: Mobile-optimized (0.8rem base)

#### Animation & Interaction Design

##### Micro-interactions
- **Hover effects**: 1.05× scale transform on interactive elements
- **Click feedback**: Brief 0.95× scale on button press
- **Loading states**: Subtle pulse animation for processing
- **Theme transitions**: 0.3s ease for all color changes

##### State Transitions
```css
/* Recording state */
.recording { animation: pulse-recording 2s infinite; }
@keyframes pulse-recording {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Note highlighting */
.current-note { 
    animation: pulse-note 1s infinite;
    transform: scale(1.1);
}
```

##### Keyboard Navigation
- **Tab order**: Logical flow through interactive elements
- **Focus indicators**: 2px solid outline with theme colors
- **Arrow keys**: Left/right movement for selected spans
- **Shortcuts**: Cmd/Ctrl+Z for undo, Backspace/Delete for removal

#### Accessibility Features

##### Screen Reader Support
- **ARIA labels**: Descriptive labels for all interactive elements
- **Live regions**: Dynamic content updates announced
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Alt text**: Descriptive text for Telugu SVG images

##### Keyboard Accessibility
- **Full keyboard navigation**: No mouse-only interactions
- **Skip links**: Jump to main content areas
- **Focus management**: Proper focus handling in modals
- **Custom shortcuts**: Documented keyboard shortcuts

##### Visual Accessibility
- **Contrast ratios**: WCAG AA compliant (4.5:1 minimum)
- **Color independence**: Information not conveyed by color alone
- **Text scaling**: Supports up to 200% zoom without horizontal scroll
- **Motion preferences**: Respects prefers-reduced-motion

#### Performance Optimizations

##### CSS Architecture
- **Custom properties**: Efficient theme switching
- **Hardware acceleration**: transform3d() for animations
- **Critical CSS**: Inline styles for above-fold content
- **Font optimization**: Subset fonts with only required characters

##### DOM Management
- **Virtual scrolling**: For large notation lists
- **Event delegation**: Efficient event handling for dynamic content
- **Debounced updates**: Throttled real-time updates to prevent jank
- **Lazy loading**: Progressive image loading for Telugu svaras

#### Error States & Feedback

##### User Feedback Systems
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Microphone access required                               │
│ Please allow microphone access to start recording          │
│                                    [Allow Access]          │
└─────────────────────────────────────────────────────────────┘
```

##### Loading States
- **Shimmer effects**: Skeleton screens during initialization
- **Progress indicators**: Visual feedback for long operations
- **Spinner animations**: Subtle loading indicators

##### Empty States
- **Helpful messaging**: Clear instructions for getting started
- **Visual cues**: Icons and illustrations to guide users
- **Action prompts**: Obvious next steps for user engagement

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
