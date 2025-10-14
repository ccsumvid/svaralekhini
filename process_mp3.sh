#!/bin/bash

# Svara Lekhini MP3 Batch Processor
# Usage: ./process_mp3.sh input.mp3 [base_pitch_hz]

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input.mp3> [base_pitch_hz]"
    echo "Example: $0 recording.mp3 440"
    exit 1
fi

INPUT_FILE="$1"
BASE_PITCH="${2:-440}"  # Default to A4 (440 Hz)
OUTPUT_FILE="${INPUT_FILE%.*}_tones.txt"
TEMP_WAV="${INPUT_FILE%.*}_temp.wav"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Check dependencies
command -v ffmpeg >/dev/null 2>&1 || { echo "Error: ffmpeg is required but not installed"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed"; exit 1; }

echo "Processing: $INPUT_FILE"
echo "Base Pitch: $BASE_PITCH Hz"
echo "Output: $OUTPUT_FILE"

# Convert MP3 to WAV for processing
echo "Converting MP3 to WAV..."
ffmpeg -i "$INPUT_FILE" -ar 44100 -ac 1 -f wav "$TEMP_WAV" -y >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Failed to convert MP3 to WAV"
    exit 1
fi

# Create Node.js processor script
cat > mp3_processor.js << 'EOF'
const fs = require('fs');
const path = require('path');

class MP3ToneProcessor {
    constructor(basePitch = 440) {
        this.basePitch = basePitch;
        this.sampleRate = 44100;
        this.frameSize = 1024;
        this.carnaticNotes = ['Sa', 'Ri₁', 'Ri₂', 'Ga₁', 'Ga₂', 'Ma₁', 'Ma₂', 'Pa', 'Dha₁', 'Dha₂', 'Ni₁', 'Ni₂'];
    }

    // Simple autocorrelation pitch detection
    detectPitch(buffer) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        let bestOffset = -1;
        let bestCorrelation = 0;
        let rms = 0;
        
        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        
        if (rms < 0.01) return null; // Too quiet
        
        let lastCorrelation = 1;
        for (let offset = 1; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;
            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs(buffer[i] - buffer[i + offset]);
            }
            correlation = 1 - (correlation / MAX_SAMPLES);
            
            if (correlation > 0.9 && correlation > lastCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
            lastCorrelation = correlation;
        }
        
        if (bestOffset === -1) return null;
        return this.sampleRate / bestOffset;
    }

    // Convert frequency to Carnatic svara
    frequencyToSvara(frequency) {
        const semitonesFromSa = Math.round(12 * Math.log2(frequency / this.basePitch));
        const svaraIndex = ((semitonesFromSa % 12) + 12) % 12;
        const octave = Math.floor(semitonesFromSa / 12);
        
        let svara = this.carnaticNotes[svaraIndex];
        if (octave < 0) svara += '̣'.repeat(Math.abs(octave));
        else if (octave > 0) svara += '̇'.repeat(octave);
        
        return { svara, frequency: Math.round(frequency * 100) / 100, octave };
    }

    // Process WAV file
    processWAV(inputFile, outputFile) {
        console.log('Reading WAV file...');
        const buffer = fs.readFileSync(inputFile);
        
        // Skip WAV header (44 bytes) and read 16-bit PCM data
        const dataStart = 44;
        const samples = [];
        
        for (let i = dataStart; i < buffer.length - 1; i += 2) {
            const sample = buffer.readInt16LE(i) / 32768.0; // Normalize to -1 to 1
            samples.push(sample);
        }
        
        console.log(`Processing ${samples.length} samples...`);
        
        const results = [];
        const hopSize = this.frameSize / 2;
        
        for (let i = 0; i < samples.length - this.frameSize; i += hopSize) {
            const frame = samples.slice(i, i + this.frameSize);
            const pitch = this.detectPitch(frame);
            
            if (pitch && pitch > 80 && pitch < 2000) {
                const timeMs = Math.round((i / this.sampleRate) * 1000);
                const svaraData = this.frequencyToSvara(pitch);
                
                results.push({
                    time: timeMs,
                    frequency: svaraData.frequency,
                    svara: svaraData.svara,
                    octave: svaraData.octave
                });
            }
        }
        
        // Write results
        let output = `Svara Lekhini MP3 Analysis\n`;
        output += `Input File: ${path.basename(inputFile)}\n`;
        output += `Base Pitch: ${this.basePitch} Hz\n`;
        output += `Analysis Time: ${new Date().toISOString()}\n\n`;
        output += `Time(ms)\tFrequency(Hz)\tSvara\tOctave\n`;
        
        results.forEach(result => {
            output += `${result.time}\t${result.frequency}\t${result.svara}\t${result.octave}\n`;
        });
        
        fs.writeFileSync(outputFile, output);
        console.log(`Analysis complete! Found ${results.length} tones.`);
        console.log(`Results saved to: ${outputFile}`);
    }
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node mp3_processor.js <wav_file> <output_file> [base_pitch]');
    process.exit(1);
}

const processor = new MP3ToneProcessor(parseFloat(args[2]) || 440);
processor.processWAV(args[0], args[1]);
EOF

# Run the processor
echo "Analyzing tones..."
node mp3_processor.js "$TEMP_WAV" "$OUTPUT_FILE" "$BASE_PITCH"

# Cleanup
rm -f "$TEMP_WAV" mp3_processor.js

if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Processing complete!"
    echo "📄 Output saved to: $OUTPUT_FILE"
    echo "📊 Preview:"
    head -10 "$OUTPUT_FILE"
else
    echo "❌ Processing failed"
    exit 1
fi
