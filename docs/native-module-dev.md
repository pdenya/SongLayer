# SongLayer native-module developer loop

The custom Expo module that performs the on-device export lives at
`modules/songlayer-compositor/` (added in Phase 7 of `to-do.MD`). This page
captures the day-to-day workflow that's easy to forget between sessions.

## iOS

1. Generate the native project with `pnpm prebuild` (calls `expo prebuild`).
2. Open `ios/SongLayer.xcworkspace` in Xcode — never the `.xcodeproj`.
3. Run `pnpm ios` from a separate terminal to start Metro + install on the
   simulator. For a wired iPhone use `expo run:ios --device`.
4. Edit Swift sources under `modules/songlayer-compositor/ios/`. Native
   changes require a rebuild; JS-only changes hot-reload via Metro.
5. Re-run `pod install` from `ios/` after touching any `*.podspec` file.

## Android

1. `pnpm prebuild`.
2. Open `android/` as a Gradle project in Android Studio.
3. `expo run:android` to install on the connected device or emulator.
4. Edit Kotlin sources under `modules/songlayer-compositor/android/`. The
   Media3 Transformer dependency is pinned in
   `modules/songlayer-compositor/android/build.gradle`; bump that file when
   updating.
5. Gradle sync after any native API change.

## Debugging

- **iOS**: `print()` lands in the Xcode console only when the app is built
  through Xcode. From `expo run:ios` you see logs via Metro and via the
  Console.app filter `process == "SongLayer"`.
- **Android**: `Log.d(TAG, "...")` shows up in `adb logcat -s SongLayer:*`.
- The JS bridge surfaces typed events through `composeGrid`'s
  `onProgress` / `onWarning` / `onError` channels. Prefer typed events over
  raw `print` / `Log.d` for anything user-visible.

## Contract tests

Each platform ships a golden-file fixture under
`modules/songlayer-compositor/tests/`. The fixture composes a known set of
720p takes into a 9:16 export; assertion uses per-frame SSIM with a 0.95
threshold against the checked-in expected output.
