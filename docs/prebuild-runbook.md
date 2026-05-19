# Prebuild runbook

`ios/` and `android/` are **not committed**. They're regenerated from
`app.json` + plugin config every time, which keeps native bumps clean.

## When you need to prebuild

- First clone of the repo.
- After bumping any plugin version in `app.json`.
- After editing the iOS `infoPlist` block or the Android `permissions`
  block.
- After upgrading Expo SDK or React Native.
- After any change to `modules/songlayer-compositor/`.

## Steps

```bash
pnpm install
pnpm exec expo prebuild --clean
```

`--clean` deletes the existing `ios/` and `android/` first so leftover
state doesn't confuse the generator.

For a specific platform: `pnpm exec expo prebuild --platform ios` or
`--platform android`.

## After prebuild

- iOS: `cd ios && pod install` if the script didn't run it. Open
  `ios/SongLayer.xcworkspace` (never the `.xcodeproj`).
- Android: Open `android/` as a Gradle project in Android Studio.

## CI

CI runs `pnpm exec expo prebuild --no-install` as a dry-run to validate
the config without writing files. EAS Build runs the real prebuild in
its own sandbox — local prebuilt directories are not uploaded.

## Common pitfalls

- **Don't commit `ios/` or `android/`.** They're in `.gitignore`. If git
  starts tracking files you regenerated, run `git rm --cached -r ios android`.
- **Bundle id consistency.** iOS `bundleIdentifier`, Android `package`,
  and the BG task id `com.songlayer.app.export` must all stay aligned.
- **Permission strings.** Adding a permission without an accompanying
  usage description string crashes on iOS at first use. Keep the
  `NSCameraUsageDescription`/`NSMicrophoneUsageDescription`/etc. block
  in sync with the permissions you actually request.
