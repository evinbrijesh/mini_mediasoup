#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <major|minor|patch>"
  exit 1
fi

PART="$1"

if [[ ! -f package.json ]]; then
  echo "package.json not found at repo root"
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$PART" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Invalid part: $PART (expected major|minor|patch)"
    exit 1
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

node -e "const fs=require('fs'); const p='package.json'; const data=JSON.parse(fs.readFileSync(p,'utf8')); data.version='${NEW_VERSION}'; fs.writeFileSync(p, JSON.stringify(data,null,2)+'\n');"

if [[ -f CHANGELOG.md ]]; then
  DATE=$(date +%Y-%m-%d)
  TMP_FILE=$(mktemp)
  awk -v version="$NEW_VERSION" -v date="$DATE" '
    BEGIN { inserted=0 }
    {
      print $0
      if (!inserted && $0 ~ /^## \[Unreleased\]/) {
        print ""
        print "## [" version "] - " date
        inserted=1
      }
    }
  ' CHANGELOG.md > "$TMP_FILE"
  mv "$TMP_FILE" CHANGELOG.md
fi

echo "Bumped version: ${CURRENT_VERSION} -> ${NEW_VERSION}"
echo "Next steps:"
echo "  1) Review CHANGELOG.md"
echo "  2) git add package.json CHANGELOG.md"
echo "  3) git commit -m 'chore(release): v${NEW_VERSION}'"
echo "  4) git tag v${NEW_VERSION}"
