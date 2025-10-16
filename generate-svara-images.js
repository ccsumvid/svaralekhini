#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Telugu svaras
const teluguSvaras = {
    'sa': 'స',
    'ri1': 'రి₁',
    'ri2': 'రి₂',
    'ga1': 'గ₁', 
    'ga2': 'గ₂',
    'ma1': 'మ₁',
    'ma2': 'మ₂',
    'pa': 'ప',
    'dha1': 'ధ₁',
    'dha2': 'ధ₂', 
    'ni1': 'ని₁',
    'ni2': 'ని₂'
};

// Generate SVG for a svara with optional octave indicator
function generateSvaraSVG(svara, octave = 0, svaraKey = '') {
    const width = 40;
    const height = 40;
    const fontSize = 34;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="20" y="25" text-anchor="middle" font-family="Noto Sans Telugu, Arial" font-size="${fontSize}" fill="var(--text-primary, #333)">${svara}</text>`;
    
    // Add octave indicators
    if (octave < 0) {
        // Dot below
        svg += `<circle cx="20" cy="35" r="2" fill="var(--text-primary, #333)"/>`;
    } else if (octave > 0) {
        // Dot above - special positioning for different Telugu letter heights
        let dotY = 6; // Default position
        
        if (svaraKey.startsWith('ni') || svaraKey.startsWith('ma') || svaraKey === 'sa') {
            dotY = -5; // Move 5px higher: 0 - 5 = -5
        } else if (svaraKey.startsWith('ri') || svaraKey === 'pa' || svaraKey.startsWith('dha')) {
            dotY = -2; // Move 5px higher: 3 - 5 = -2
        }
        
        svg += `<circle cx="20" cy="${dotY}" r="2" fill="var(--text-primary, #333)"/>`;
    }
    
    svg += `</svg>`;
    return svg;
}

// Create images directory
const imagesDir = path.join(__dirname, 'images', 'svaras', 'telugu');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Generate all svara images
Object.entries(teluguSvaras).forEach(([key, svara]) => {
    // Normal octave
    const normalSVG = generateSvaraSVG(svara, 0, key);
    fs.writeFileSync(path.join(imagesDir, `${key}.svg`), normalSVG);
    
    // Lower octave
    const lowerSVG = generateSvaraSVG(svara, -1, key);
    fs.writeFileSync(path.join(imagesDir, `${key}_lower.svg`), lowerSVG);
    
    // Upper octave
    const upperSVG = generateSvaraSVG(svara, 1, key);
    fs.writeFileSync(path.join(imagesDir, `${key}_upper.svg`), upperSVG);
});

console.log('Telugu svara images generated successfully!');
