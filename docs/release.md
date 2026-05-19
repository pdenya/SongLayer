# SongLayer release process

## Channels

| EAS profile | EAS Update channel | Distribution                         | Auto-increment |
| ----------- | ------------------ | ------------------------------------ | -------------- |
| development | `development`      | dev-client, internal                 | no             |
| preview     | `preview`          | internal (TestFlight + Firebase ADP) | no             |
| production  | `production`       | App Store + Play Store               | yes            |

The `appVersionSource` is `remote`, so EAS owns the version vector. Builds
pull the current version on each run; `production` auto-increments.

## Runtime version

`runtimeVersion.policy = "appVersion"` in `app.json`. Every JS-only change
ships via `eas update --channel <channel>` against the matching channel —
no store review needed. Any change inside `modules/songlayer-compositor`
(or any other native module) **bumps the app version** and requires a
fresh store build. The runtime version then mismatches the cached JS
bundle, EAS Update stops serving the old bundle to the new clients, and
existing clients keep their last working bundle until they pick up the
store update.

## Bundle identifier

- iOS `bundleIdentifier`: `com.songlayer.app`
- Android `package`: `com.songlayer.app`
- iOS background task id: `com.songlayer.app.export` (must be prefixed
  with the bundle id per Apple's `BGTaskScheduler` rules; declared in
  `BGTaskSchedulerPermittedIdentifiers`).

If you fork the project under a different organization, update the four
identifiers above together — they are coupled.

## Cutting a release

1. `pnpm exec vp check && pnpm exec vp test` — green floor.
2. Bump version in `app.json` if releasing a store build (the runtime
   version follows the app version).
3. `eas build --platform all --profile production`.
4. `eas submit --platform all --profile production` once the build is
   green.
5. After App Store / Play Store review approves, run `eas update
--channel production` for any subsequent JS-only fixes.

## Native module gates

Anything that changes:

- `modules/songlayer-compositor/ios/**`
- `modules/songlayer-compositor/android/**`
- `app.json` ios/android entries
- Plugin versions or native deps in `package.json`

must go through a fresh `production` build — OTA is not enough. The
`docs/native-module-dev.md` runbook covers the local dev loop.

## Pre-build hygiene

`ios/` and `android/` are gitignored (regenerate via `pnpm exec expo
prebuild`). Plugin versions in `app.json` are the source of truth. If
something breaks after dependency updates, blow away the native dirs and
prebuild fresh rather than hand-editing the generated files.
