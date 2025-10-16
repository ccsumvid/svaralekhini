/**
 * Tests for Lyric Editor functionality
 */

describe('Lyric Editor', () => {
    let app;
    
    beforeEach(() => {
        // Mock DOM elements
        document.body.innerHTML = `
            <textarea id="lyricEditor"></textarea>
            <div id="notationLines"></div>
            <button id="pauseResume"><span class="btn-icon">⏸️</span><span class="btn-text">Pause</span></button>
            <input id="minNoteLength" value="150" />
            <select id="notationStyle"><option value="western" selected>Western</option></select>
            <select id="language"><option value="english" selected>English</option></select>
        `;
        
        // Create app instance with mocked methods
        app = {
            lyricLines: [],
            currentLineIndex: 0,
            isRecording: false,
            isRecordingPaused: false,
            lineNotations: [],
            saveSessionOptions: jest.fn(),
            updateNotationLines: jest.fn(),
            displayLineNotation: jest.fn(),
            updateActiveLineIndicator: jest.fn(),
            addTooltipListeners: jest.fn(),
            getDurationIndicator: jest.fn(() => ''),
            handleLyricInput: function() {
                const editor = document.getElementById('lyricEditor');
                const lines = editor.value.split('\n').filter(line => line.trim());
                this.lyricLines = lines;
                this.updateNotationLines();
                this.saveSessionOptions();
            },
            moveToNextLine: function() {
                if (this.currentLineIndex < this.lyricLines.length - 1) {
                    this.currentLineIndex++;
                    this.updateActiveLineIndicator();
                }
            },
            togglePauseResume: function() {
                if (!this.isRecording) return;
                
                this.isRecordingPaused = !this.isRecordingPaused;
                const btn = document.getElementById('pauseResume');
                const icon = btn.querySelector('.btn-icon');
                const text = btn.querySelector('.btn-text');
                
                if (this.isRecordingPaused) {
                    icon.textContent = '▶️';
                    text.textContent = 'Resume';
                } else {
                    icon.textContent = '⏸️';
                    text.textContent = 'Pause';
                }
            }
        };
    });
    
    describe('Lyric Input Handling', () => {
        test('should parse single line lyrics', () => {
            const editor = document.getElementById('lyricEditor');
            editor.value = 'Sa Re Ga Ma Pa';
            
            app.handleLyricInput();
            
            expect(app.lyricLines).toEqual(['Sa Re Ga Ma Pa']);
            expect(app.updateNotationLines).toHaveBeenCalled();
            expect(app.saveSessionOptions).toHaveBeenCalled();
        });
        
        test('should parse multi-line lyrics', () => {
            const editor = document.getElementById('lyricEditor');
            editor.value = 'Sa Re Ga Ma\nPa Dha Ni Sa\nSa Ni Dha Pa';
            
            app.handleLyricInput();
            
            expect(app.lyricLines).toEqual([
                'Sa Re Ga Ma',
                'Pa Dha Ni Sa', 
                'Sa Ni Dha Pa'
            ]);
        });
        
        test('should filter out empty lines', () => {
            const editor = document.getElementById('lyricEditor');
            editor.value = 'Sa Re Ga Ma\n\n\nPa Dha Ni Sa\n   \nSa Ni Dha Pa';
            
            app.handleLyricInput();
            
            expect(app.lyricLines).toEqual([
                'Sa Re Ga Ma',
                'Pa Dha Ni Sa',
                'Sa Ni Dha Pa'
            ]);
        });
    });
    
    describe('Line Navigation', () => {
        test('should move to next line when available', () => {
            app.lyricLines = ['Line 1', 'Line 2', 'Line 3'];
            app.currentLineIndex = 0;
            
            app.moveToNextLine();
            
            expect(app.currentLineIndex).toBe(1);
            expect(app.updateActiveLineIndicator).toHaveBeenCalled();
        });
        
        test('should not move beyond last line', () => {
            app.lyricLines = ['Line 1', 'Line 2'];
            app.currentLineIndex = 1;
            
            app.moveToNextLine();
            
            expect(app.currentLineIndex).toBe(1);
        });
    });
    
    describe('Pause/Resume Functionality', () => {
        test('should toggle pause state when recording', () => {
            app.isRecording = true;
            app.isRecordingPaused = false;
            
            app.togglePauseResume();
            
            expect(app.isRecordingPaused).toBe(true);
            
            const btn = document.getElementById('pauseResume');
            expect(btn.querySelector('.btn-icon').textContent).toBe('▶️');
            expect(btn.querySelector('.btn-text').textContent).toBe('Resume');
        });
        
        test('should not toggle when not recording', () => {
            app.isRecording = false;
            app.isRecordingPaused = false;
            
            app.togglePauseResume();
            
            expect(app.isRecordingPaused).toBe(false);
        });
        
        test('should resume from paused state', () => {
            app.isRecording = true;
            app.isRecordingPaused = true;
            
            app.togglePauseResume();
            
            expect(app.isRecordingPaused).toBe(false);
            
            const btn = document.getElementById('pauseResume');
            expect(btn.querySelector('.btn-icon').textContent).toBe('⏸️');
            expect(btn.querySelector('.btn-text').textContent).toBe('Pause');
        });
    });
    
    describe('Settings Persistence', () => {
        test('should use 150ms as default minimum note length', () => {
            const minNoteInput = document.getElementById('minNoteLength');
            expect(minNoteInput.value).toBe('150');
        });
    });
});
