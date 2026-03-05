#!/usr/bin/env bash
set -euo pipefail

# Scan staged files only. This avoids blocking on unrelated generated files.
staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"
if [[ -z "$staged_files" ]]; then
  exit 0
fi

# Allowlist example/env files that intentionally contain placeholders.
is_allowed_file() {
  case "$1" in
    *.env.example|*.example|README.md|scripts/privacy-check.sh|.githooks/pre-commit)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Patterns for common sensitive data and local paths.
patterns=(
  '/Users/'
  '/home/'
  'BEGIN (RSA|EC|OPENSSH|PRIVATE) PRIVATE KEY'
  'AKIA[0-9A-Z]{16}'
  'ASIA[0-9A-Z]{16}'
  'ghp_[A-Za-z0-9]{30,}'
  'xox[baprs]-[A-Za-z0-9-]+'
  'sk-(live|test)-[A-Za-z0-9]+'
  'api[_-]?key["[:space:]]*[:=]["[:space:]]*[A-Za-z0-9_\-]{12,}'
  'secret["[:space:]]*[:=]["[:space:]]*[A-Za-z0-9_\-]{12,}'
  'token["[:space:]]*[:=]["[:space:]]*[A-Za-z0-9_\-]{12,}'
)

failed=0
while IFS= read -r file; do
  [[ -f "$file" ]] || continue

  if is_allowed_file "$file"; then
    continue
  fi

  for pattern in "${patterns[@]}"; do
    if rg -n --pcre2 "$pattern" "$file" >/dev/null 2>&1; then
      echo "[privacy-check] blocked: suspicious content in $file"
      echo "  pattern: $pattern"
      failed=1
      break
    fi
  done
done <<< "$staged_files"

if [[ "$failed" -ne 0 ]]; then
  cat <<'MSG'
[privacy-check] Commit aborted.
- Remove secrets/private paths from staged content, or
- move local/private values into ignored files (e.g. .env).
MSG
  exit 1
fi

exit 0
