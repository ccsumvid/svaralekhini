# Audio Analysis Libraries Research

## JavaScript Pitch Detection Libraries

### 1. **Pitchy** (Recommended)
- Fast, accurate pitch detection
- Real-time processing capability
- Small footprint (~10KB)
- Good for musical applications

### 2. **ML5.js Pitch Detection**
- Machine learning based
- Good accuracy for voice
- Larger size but more robust

### 3. **Web Audio API + FFT**
- Native browser support
- Custom implementation possible
- Maximum performance control

### 4. **Aubio.js**
- Port of aubio library
- Multiple pitch detection algorithms
- Good for music analysis

## Recommended Stack:
- **Pitchy** for real-time pitch detection
- **Web Audio API** for recording/playback
- **Canvas API** for visualization
- **IndexedDB** for local storage

## Carnatic Music Requirements:
- 12 swarasthanas mapping
- Glide detection (pitch bend analysis)
- Seminote filtering (duration threshold)
- Base pitch (Sa) reference system
