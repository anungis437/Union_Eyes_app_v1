# Test Coverage Guide for Union Eyes

## Overview
This project uses **Vitest** with **Istanbul** coverage provider for comprehensive test coverage reporting.

## Coverage Configuration

### Current Setup
- **Provider**: Istanbul (industry-standard)
- **Reporters**: Text, Text-Summary, JSON, JSON-Summary, HTML, LCOV
- **Thresholds**:
  - Lines: 70%
  - Functions: 70%
  - Branches: 60%
  - Statements: 70%

### Configuration Location
All coverage settings are defined in [`vitest.config.ts`](vitest.config.ts)

## Available Scripts

### Run Coverage
```bash
# Run all tests with coverage
pnpm test:coverage

# Run unit tests with coverage
pnpm test:unit:coverage

# Run integration tests with coverage
pnpm test:integration:coverage

# Watch mode with coverage (updates on file changes)
pnpm test:coverage:watch
```

### View Coverage Reports
```bash
# Open HTML coverage report in browser
pnpm test:coverage:open

# Or manually open:
# coverage/index.html
```

## Coverage Reports

After running `pnpm test:coverage`, the following reports are generated in the `coverage/` directory:

### 1. HTML Report (`coverage/index.html`)
- **Best for**: Interactive exploration
- **Features**: 
  - Visual file tree
  - Highlighted source code
  - Missing line indicators
  - Drill-down by file/directory
- **Open with**: `pnpm test:coverage:open`

### 2. Text Report (Console)
- **Best for**: Quick overview in terminal
- **Shows**: Coverage percentages by file
- **Format**: Table with percentages

### 3. JSON Reports
- **Files**: 
  - `coverage/coverage-final.json` (detailed)
  - `coverage/coverage-summary.json` (aggregated)
- **Best for**: CI/CD integration, custom tooling

### 4. LCOV Report (`coverage/lcov.info`)
- **Best for**: Integration with coverage tools (Codecov, Coveralls, SonarQube)
- **Format**: Industry-standard LCOV format

## Understanding Coverage Metrics

### Lines Coverage (70% threshold)
Percentage of executable lines run during tests

### Functions Coverage (70% threshold)
Percentage of functions/methods called during tests

### Branches Coverage (60% threshold)
Percentage of conditional branches (if/else, switch, ternary) executed

### Statements Coverage (70% threshold)
Percentage of statements executed (similar to lines but counts logical statements)

## Excluded from Coverage

The following are automatically excluded from coverage reports:
- `node_modules/` and dependencies
- Build outputs (`.next/`, `dist/`, `build/`, `.turbo/`)
- Test files (`__tests__/`, `*.test.ts`, `*.spec.ts`)
- Configuration files (`*.config.*`)
- Type definitions (`*.d.ts`)
- Setup files and middleware
- Database migrations
- Scripts directory
- Documentation and archive folders

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run tests with coverage
  run: pnpm test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

### Coverage Thresholds
Tests will fail if any coverage metric falls below:
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 60%
- **Statements**: 70%

To adjust thresholds, edit the `thresholds` section in [`vitest.config.ts`](vitest.config.ts#L75)

## Best Practices

### 1. Run Coverage Regularly
```bash
# Before committing
pnpm test:coverage

# During development (watch mode)
pnpm test:coverage:watch
```

### 2. Focus on Untested Code
- Open `coverage/index.html`
- Red/pink lines indicate uncovered code
- Green lines indicate covered code
- Yellow indicates partially covered branches

### 3. Improve Coverage Gradually
- Don't aim for 100% immediately
- Focus on critical business logic first
- Add tests for new features before implementation (TDD)

### 4. Monitor Coverage Trends
- Track coverage over time
- Add coverage badges to README
- Set up coverage reporting in CI/CD

## Troubleshooting

### Coverage Not Generated
```bash
# Ensure Istanbul provider is installed
pnpm add -D -w @vitest/coverage-istanbul

# Verify configuration
cat vitest.config.ts
```

### Coverage Too Low
- Review excluded patterns in `vitest.config.ts`
- Check if test files are being discovered
- Ensure tests are actually running

### HTML Report Not Opening
```bash
# Windows - use `start`
start coverage/index.html

# Mac/Linux - use `open` or `xdg-open`
open coverage/index.html
```

## Advanced Usage

### Custom Coverage Run
```bash
# Run specific test with coverage
pnpm vitest run __tests__/specific-test.test.ts --coverage

# Set custom threshold
pnpm vitest run --coverage --coverage.lines=80
```

### Coverage for Changed Files Only
```bash
# Git diff coverage
pnpm vitest run --coverage --changed
```

## Integration with IDEs

### VS Code
Install the **Coverage Gutters** extension:
1. Install extension: `Coverage Gutters` (ryanluker.vscode-coverage-gutters)
2. Run tests with coverage
3. Click "Watch" in status bar
4. See coverage indicators in editor

## Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Istanbul Documentation](https://istanbul.js.org/)
- [Understanding Code Coverage](https://martinfowler.com/bliki/TestCoverage.html)

## Summary

✅ Istanbul coverage provider configured
✅ Multiple report formats (HTML, JSON, LCOV, Text)
✅ Balanced thresholds (70/70/60/70)
✅ Comprehensive exclusion patterns
✅ Easy-to-use npm scripts
✅ CI/CD ready

Run `pnpm test:coverage` to get started!
