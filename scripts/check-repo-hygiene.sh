#!/bin/bash
# Repo Hygiene Check
# Ensures no build artifacts are tracked in git
# 
# This script fails if any build artifacts are found tracked in git.
# Run before committing to ensure clean source-only repository.

set -euo pipefail

echo "🔍 Checking repository hygiene..."
echo ""

# Define patterns for artifacts that should NEVER be tracked
FORBIDDEN_PATTERNS=(
  "^\.next/"
  "^node_modules/"
  "^dist/"
  "^build/"
  "^\.turbo/"
  "^\.cache/"
  "^coverage/"
  "^out/"
  "\.tsbuildinfo$"
  "^\.pnpm-cache/"
)

# Track findings
VIOLATIONS_FOUND=0
TOTAL_VIOLATIONS=0

# Check each pattern
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  echo "Checking pattern: $pattern"
  
  # Use git ls-files to find tracked files matching pattern
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
  echo "  git rm --cached -r .turbo/ .next/ dist/ build/ coverage/ out/"
  echo "  git commit -m 'chore: remove tracked build artifacts'"
  echo ""
  echo "Then ensure .gitignore includes these patterns."
  exit 1
fi
