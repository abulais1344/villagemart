#!/usr/bin/env bash
# Run once, after "npx cap add android", from the project root.
# Patches android/app/build.gradle to read keystore credentials from
# android/gradle.properties (gitignored) instead of hardcoding them.
set -euo pipefail

GRADLE_PROPS="android/gradle.properties"
BUILD_GRADLE="android/app/build.gradle"

if [ ! -d android ]; then
  echo "ERROR: android/ directory not found. Run 'npx cap add android' first." >&2
  exit 1
fi

# ── 1. Seed android/gradle.properties with placeholder values ─────────────────
# The file is gitignored; fill in real paths/passwords before building.
if grep -q "MERCHANT_STORE_FILE" "$GRADLE_PROPS" 2>/dev/null; then
  echo "✓ $GRADLE_PROPS already has signing keys — skipping seed."
else
  cat >> "$GRADLE_PROPS" <<'PROPS'

# Merchant release keystore — fill in real values, keep out of git
MERCHANT_STORE_FILE=/CHANGE/ME/merchant-release.jks
MERCHANT_STORE_PASSWORD=CHANGE_ME
MERCHANT_KEY_ALIAS=merchant
MERCHANT_KEY_PASSWORD=CHANGE_ME
PROPS
  echo "✓ Appended signing placeholders to $GRADLE_PROPS"
fi

# ── 2. Patch android/app/build.gradle ─────────────────────────────────────────
# Skip if the patch was already applied.
if grep -q "MERCHANT_STORE_FILE" "$BUILD_GRADLE" 2>/dev/null; then
  echo "✓ $BUILD_GRADLE already patched — nothing to do."
  exit 0
fi

# Insert signingConfigs block and wire it into the release buildType.
# Uses Python for reliable multi-line in-place editing without GNU sed -i issues.
python3 - "$BUILD_GRADLE" <<'PYEOF'
import sys, re

path = sys.argv[1]
text = open(path).read()

# 1. Add signingConfigs before the existing buildTypes block
signing_block = '''
    signingConfigs {
        release {
            storeFile     file(MERCHANT_STORE_FILE)
            storePassword MERCHANT_STORE_PASSWORD
            keyAlias      MERCHANT_KEY_ALIAS
            keyPassword   MERCHANT_KEY_PASSWORD
        }
    }
'''
text = re.sub(r'(\s*buildTypes\s*\{)', signing_block + r'\1', text, count=1)

# 2. Wire signingConfig into the release buildType
text = re.sub(
    r'(release\s*\{)',
    r'\1\n            signingConfig signingConfigs.release',
    text,
    count=1,
)

open(path, 'w').write(text)
print(f"✓ Patched {path}")
PYEOF

echo ""
echo "Done. Next steps:"
echo "  1. Edit android/gradle.properties — set MERCHANT_STORE_FILE, passwords"
echo "  2. npx cap sync android"
echo "  3. cd android && ./gradlew assembleRelease"
echo "  APK → android/app/build/outputs/apk/release/app-release.apk"
