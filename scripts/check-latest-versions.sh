#!/usr/bin/env bash
set -euo pipefail

PACKAGES=(
  "@angular/core"
  "@angular/cli"
  "@ionic/angular"
  "@ionic/angular-toolkit"
  "@capacitor/core"
  "@capacitor/cli"
  "@capacitor/camera"
  "@capacitor/filesystem"
  "cordova"
  "cordova-android"
  "typescript"
  "rxjs"
  "zone.js"
)

echo "Checking latest versions from npm registry..."
echo

for pkg in "${PACKAGES[@]}"; do
  if latest=$(npm view "$pkg" version 2>/dev/null); then
    printf "%-32s %s\n" "$pkg" "$latest"
  else
    printf "%-32s %s\n" "$pkg" "<unavailable: check npm registry/network policy>"
  fi
done
