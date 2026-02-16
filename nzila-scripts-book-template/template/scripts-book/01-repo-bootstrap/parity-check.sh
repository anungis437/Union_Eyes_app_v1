#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# parity-check.sh — Verify every .sh script has a matching .ps1 (and vice versa)
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

EXIT_CODE=0

echo "==> Checking .sh / .ps1 parity in $BOOK_ROOT ..."

# Check that every .sh has a .ps1
while IFS= read -r sh_file; do
  ps1_file="${sh_file%.sh}.ps1"
  if [ ! -f "$ps1_file" ]; then
    echo "MISSING .ps1 for: $sh_file"
    EXIT_CODE=1
  fi
done < <(find "$BOOK_ROOT" -name "*.sh" -type f)

# Check that every .ps1 has a .sh
while IFS= read -r ps1_file; do
  sh_file="${ps1_file%.ps1}.sh"
  if [ ! -f "$sh_file" ]; then
    echo "MISSING .sh for: $ps1_file"
    EXIT_CODE=1
  fi
done < <(find "$BOOK_ROOT" -name "*.ps1" -type f)

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "==> All scripts have matching pairs. Parity OK."
else
  echo "==> Parity check FAILED. See mismatches above."
fi

exit $EXIT_CODE
