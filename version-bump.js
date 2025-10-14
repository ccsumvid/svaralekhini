#!/usr/bin/env node
const fs = require('fs');

const changeWord = process.argv[2];
if (!changeWord) {
  console.error('Usage: npm run version:bump <CHANGE_WORD>');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor] = pkg.version.split('.');
const newMinor = parseInt(minor) + 1;
pkg.version = `${major}.${newMinor}.${changeWord.toUpperCase()}`;

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version bumped to ${pkg.version}`);
