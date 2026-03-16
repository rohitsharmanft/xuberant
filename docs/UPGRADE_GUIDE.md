# Upgrade Guide (Angular + Ionic + Capacitor/Cordova)

This project is currently based on Angular 11 and Ionic 5 with a mixed Capacitor/Cordova plugin setup.

## 1) Baseline and branch

```bash
git checkout -b chore/upgrade-framework-stack
npm ci
npm run build
npm run test
```

If `npm ci` fails because of old lockfile/deps, run `npm install` once to regenerate the lockfile in a dedicated commit.

## 2) Determine latest versions in your environment

Use the helper script from the repository root:

```bash
bash scripts/check-latest-versions.sh
```

If your environment blocks public npm, configure your internal registry and retry.

## 3) Upgrade strategy

Upgrade in controlled layers:

1. Angular + TypeScript
2. Ionic Angular + Ionic tooling
3. Capacitor (align all `@capacitor/*` packages to one major)
4. Cordova runtime/plugins (or migrate plugin-by-plugin to Capacitor)

Do not attempt all layers in one commit.

## 4) Angular major upgrades (recommended stepwise)

Run one major at a time so migrations are applied correctly.

```bash
npx ng update @angular/core@12 @angular/cli@12
npx ng update @angular/core@13 @angular/cli@13
npx ng update @angular/core@14 @angular/cli@14
npx ng update @angular/core@15 @angular/cli@15
npx ng update @angular/core@16 @angular/cli@16
npx ng update @angular/core@17 @angular/cli@17
```

After each step:

```bash
npm run build
npm run test
```

If linting is configured and available:

```bash
npm run lint
```

## 5) Ionic and toolkit

Once Angular reaches your target major, update Ionic packages compatible with that Angular version.

```bash
npm install @ionic/angular@latest @ionic/angular-toolkit@latest
```

Then validate routing, overlays, and form-heavy screens.

## 6) Capacitor alignment

This repo currently mixes Capacitor 4 core/cli with 1.x plugins; that should be unified.

```bash
npm install @capacitor/core@latest @capacitor/cli@latest \
  @capacitor/app@latest @capacitor/camera@latest @capacitor/filesystem@latest \
  @capacitor/haptics@latest @capacitor/keyboard@latest
```

If you still use storage, migrate from deprecated packages to current Capacitor preferences/storage alternatives.

Sync native projects:

```bash
npx cap sync
```

## 7) Cordova compatibility review

This repository uses multiple Cordova plugins and custom Android support version pins. Review each plugin for compatibility with your Android target SDK.

Typical workflow:

```bash
npm outdated
npm install cordova@latest cordova-android@latest
```

Then test each feature area:

- Camera
- Geolocation
- Barcode scanner
- File access / media viewer

Consider replacing Cordova plugins with Capacitor equivalents where possible.

## 8) Regression checklist

- App starts and navigates correctly
- Authentication flow works
- Camera capture and photo selection work
- Geolocation permissions + retrieval work
- Barcode scan flow works
- Build artifacts generated successfully
- Android build succeeds

## 9) Suggested commit slicing

1. `chore: add upgrade tooling and docs`
2. `chore: upgrade angular to v12`
3. `chore: upgrade angular to v13`
4. `chore: align ionic packages`
5. `chore: align capacitor packages`
6. `chore: cordova plugin compatibility updates`

Small, testable commits make rollback and debugging much easier.
