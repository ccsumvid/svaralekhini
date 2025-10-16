# Testing Rules for Svara Lekhini

## Mandatory Testing Requirements

### 1. **Test-First Development**
- **Every new feature MUST have tests** before implementation
- **No feature is complete** without corresponding test cases
- **Minimum 80% code coverage** for new functionality

### 2. **Test Categories Required**

#### **Unit Tests** (Jest)
- Test individual functions and methods
- Mock external dependencies
- Fast execution (<100ms per test)

#### **Integration Tests**
- Test component interactions
- Test audio processing pipeline
- Test lyric editor functionality

#### **Regression Tests**
- Run full test suite after every major backlog completion
- Ensure existing functionality remains intact
- Automated via npm scripts

### 3. **Test File Naming Convention**
```
feature-name.test.js     # Unit tests for feature
feature-name.integration.test.js  # Integration tests
```

### 4. **Required Test Structure**
```javascript
describe('FeatureName', () => {
    beforeEach(() => {
        // Setup test environment
    });
    
    afterEach(() => {
        // Cleanup
    });
    
    describe('Core Functionality', () => {
        test('should handle normal case', () => {
            // Test implementation
        });
        
        test('should handle edge cases', () => {
            // Edge case testing
        });
        
        test('should handle error conditions', () => {
            // Error handling tests
        });
    });
});
```

### 5. **Regression Testing Schedule**
- **After every major feature**: Run `npm test`
- **Before any release**: Run `npm run test:coverage`
- **Weekly**: Full regression suite including performance tests

### 6. **Test Coverage Requirements**
- **New functions**: 100% coverage
- **Modified functions**: Maintain existing coverage
- **Critical paths**: Audio processing, undo/redo, alignment algorithms

### 7. **Performance Testing**
- **Audio processing**: <50ms latency tests
- **UI interactions**: <100ms response time tests
- **Memory usage**: No memory leaks in 5-minute sessions

## Implementation Checklist

For every new feature:
- [ ] Write test cases first
- [ ] Implement feature
- [ ] Ensure all tests pass
- [ ] Run regression suite
- [ ] Update documentation
- [ ] Code review with test focus

## Test Commands
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Coverage report
npm run test:regression    # Full regression suite
```
