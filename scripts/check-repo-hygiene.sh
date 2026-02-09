#!/bin/bash
# Repo Hygiene Check
# Ensures no build artifacts are tracked in git
#
# This script fails if any build artifacts are found tracked in git,
# regardless of where they are located in the repository.
# Run before committing to ensure clean source-only repository.

set -euo pipefail

echo "🔍 Checking repository hygiene..."
echo ""

# Define patterns for artifacts that should NEVER be tracked
# These patterns match ANYWHERE in the repo, not just root level
FORBIDDEN_PATTERNS=(
  "(^|/)"'.next/"'          # Next.js build output (any directory)
  "(^|/)"node_modules/"'   # Node dependencies (any directory)
  "(^|/)"dist/"'           # TypeScript/Webpack build output (any directory)
  "(^|/)"build/"'          # Build output (any directory)
  "(^|/)"'.turbo/"'        # Turbo cache (any directory)
  "(^|/)"'.cache/"'        # Cache directories (any directory)
  "(^|/)"coverage/"'       # Test coverage (any directory)
  "(^|/)"out/"'            # Output directories (any directory)
  "\.tsbuildinfo$"         # TypeScript build info files
  "(^|/)"'.pnpm-cache/"'   # pnpm cache
)

# Track findings
VIOLATIONS_FOUND=0
TOTAL_VIOLATIONS=0

# Check each pattern
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  echo "Checking pattern: $pattern"
  
  # Use git ls-files to find tracked files matching pattern
  # The pattern must match anywhere in the file path
  if git ls-files | grep -E "$pattern" > /dev/null 2>&1; then
    echo "❌ VIOLATION: Found tracked artifacts matching '$pattern':"
    git ls-files | grep -E "$pattern" | head -n 5
    COUNT=$(git ls-files | grep -E "$pattern" | wc -l)
    echo "   ($COUNT files total)"
    echo ""
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT))
  else
    echo "✅ No violations for '$pattern'"
  fi
  echo ""
done

# Also check for nested .next, node_modules, dist, build directories in subpackages
NESTED_DIRS=(".next" "node_modules" "dist" "build" ".turbo" "coverage" "out")
for dir in "${NESTED_DIRS[@]}"; do
  echo "Checking for nested $dir directories..."
  
  # Find any tracked directory named $dir at any depth
  if git ls-files | grep -E "(^|/)$dir/" > /dev/null 2>&1; then
    echo "❌ VIOLATION: Found tracked $dir directories:"
    git ls-files | grep -E "(^|/)$dir/" | head -n 5
    COUNT=$(git ls-files | grep -E "(^|/)$dir/" | wc -l)
    echo "   ($COUNT files total)"
    echo ""
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT))
  else
    echo "✅ No nested $dir directories found"
  fi
  echo ""
done

# Report results
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $VIOLATIONS_FOUND -eq 0 ]; then
  echo "✅ PASS: Repository hygiene check passed!"
  echo "   No build artifacts are tracked in git."
  exit 0
else
  echo "❌ FAIL: Repository hygiene check failed!"
  echo "   Found $VIOLATIONS_FOUND pattern violations ($TOTAL_VIOLATIONS files)"
  echo ""
  echo "To fix, run:"
  echo "  git rm --cached -r .turbo/ .next/ dist/ build/ coverage/ out/ node_modules/"
  echo "  git commit -m 'chore: remove tracked build artifacts'"
  echo ""
  echo "Then ensure .gitignore includes patterns like:"
  echo "  **/.next/"
  echo "  **/node_modules/"
  echo "  **/dist/"
  echo "  **/build/"
  echo "  **/.turbo/"
  echo "  **/coverage/"
  echo "  **/out/"
  exit 1
fi
