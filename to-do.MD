# SongLayer — Implementation To-Do

Synthesis of research and review into how to build SongLayer on top of the existing Expo template (Expo SDK 55, React Native 0.83, New Architecture, React 19 + React Compiler, Uniwind+Tailwind, Reanimated 4, MMKV, expo-router, fbtee, vitest-react-native, EAS).

Update this file as the project moves. Tickboxes (`[ ]` / `[x]`) on every task.

---

## 1. Technology decisions

Locked-in choices from research. Revisit only if a phase blocker forces it.

- **Capture:** `react-native-vision-camera` v5.x (current 5.0.9). V5 is a Nitro-Modules rewrite — the V4 Formats API (`useCameraFormat`, `format` prop) is gone, replaced by an explicit Output objects + Constraints API. Not `expo-camera` — its video path has a per-SDK regression history and lacks fps control. Requires `npx expo prebuild` and the VisionCamera config plugin.
- **Playback:** `expo-video` (first-party, New-Arch-native; replaces `expo-av`, which is removed from Expo Go in SDK 55 and unmaintained as a standalone). One `VideoPlayer` per take — `expo-video` explicitly documents that one player can't drive multiple `VideoView`s on Android.
- **Audio capture / playback session:** `AVAudioSession` category `.playAndRecord`, options `[.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP, .allowBluetoothHFP]`. Note `.allowBluetooth` was deprecated in Xcode 26 / iOS 26 in favor of `.allowBluetoothHFP`. Every `expo-video` `VideoPlayer.audioMixingMode = 'mixWithOthers'`. Likely needs a small native session-manager TurboModule (VisionCamera doesn't expose `.mixWithOthers` declaratively, and we need to sequence session activation before `camera.startRecording`).
- **Audio (non-video) module:** `expo-audio` for click-track playback, headphone-tone preview, and any non-video audio. Locked in.
- **Headphones required for take 2+.** Detect via `AVAudioSession.currentRoute` on iOS and `AudioManager.getDevices(GET_DEVICES_OUTPUTS)` + `AudioDeviceCallback` on Android. Mic AEC in `.playAndRecord` is unusable for singing.
- **Export compositor:** Custom Expo Module wrapping `AVFoundation` (`AVMutableComposition` + per-track `AVMutableVideoCompositionLayerInstruction` with `setTransform(_:at:)` + `AVMutableAudioMix` + `AVAssetExportSession`) on iOS, and `Jetpack Media3 Transformer` (pin **≥ 1.6.x**, prefer current 1.8.x) on Android. **Do not use any `ffmpeg-kit` fork** — original archived April 2025; forks unmaintained; full-gpl variants bundle x264 (licensing risk).
- **Cloud render fallback (Phase 7+, feature-flagged):** Shotstack JSON timeline. Used on device-export failure or as a "HD remix" upsell.
- **Storage:**
  - Raw take files → `Paths.document/projects/<projectId>/takes/` using the new class-based `expo-file-system` API (`File`, `Directory`, `Paths`). `expo-file-system/legacy` is deprecated.
  - Project folder excluded from iCloud backup via the new API's `excludeFromBackup` mechanism (wraps `NSURLIsExcludedFromBackupKey` on iOS; no-op on Android).
  - Export intermediates + thumbnails → `Paths.cache`.
- **Metadata:**
  - `react-native-mmkv` for app-level state (current project id, prefs, last-used layout, detected `deviceCaps`).
  - `expo-sqlite` for the project/take catalog. Hot-path: `runAsync` (INSERT/UPDATE) and `getAllAsync` (SELECT); `prepareAsync` + `executeAsync` only for prepared paths. Slot assignments + timing offsets as a JSON column on `takes`.
- **Grid model:** Pure JSON, relative rects in `[0,1]`. Same data drives capture preview, playback preview, and the export compositor. Reanimated 4 `entering`/`exiting`/`layout` for grid reflow; animate a wrapping `Animated.View`, never the `VideoView` itself.
- **Performance ceiling for live playback:**
  - iOS: 6 concurrent HD streams on A14+, drop to 4 on older silicon.
  - Android: 4 concurrent only on **flagship-detected** devices; **2–3 H.264 1080p decoders** is the realistic mid-range ceiling. Beyond that, pre-transcode 720p proxies after each take and play those during recording; keep originals for export.
  - Default capture profile: **720p, 30 fps, H.264, ~6 Mbps, AAC 128 kbps stereo.** Promote to 1080p only when `deviceCaps.flagship === true`.
  - Flagship detection: iOS A14+ (chipset string match), Android `Build.SOC_MODEL` in an allowlist or `ActivityManager.getMemoryClass() >= 512`.
- **Master clock for sync:** iOS `CMClockGetHostTimeClock()` / `mach_absolute_time`; Android `System.nanoTime`. Same clock writes the recording start timestamp and the drift-correction sample window.
- **Project types:** `"music"` and `"multi-cam"` (set at project creation). Multi-cam mode disables the headphone gate, click track, count-in, and audio-summing UI; otherwise the pipeline is identical. The README promises this dual use case — first-class, not an afterthought.

---

## 2. Scope (in / out)

**In scope for MVP:**
- Layered-take recording with prior takes playing back, music mode + multi-cam mode.
- Evolving grid with a finite layout catalog the user can swap among.
- Three aspect targets: vertical 9:16, square 1:1, horizontal 16:9.
- On-device export via native compositor.
- Project list with create/rename/duplicate/delete.

**Out of scope for MVP, document so we don't accidentally build:**
- **Web target.** `react-native-web` is in `package.json`; we will not ship the web bundle. Phase 0 disables the web entry or ships a stub landing page.
- Audio-only takes (visualizer slot).
- Multi-user collaboration / cloud sync of project state.
- In-app effects, filters, AR, lyric overlays.
- HD-remix cloud render (deferred to a flagged Phase 7+ task).

---

## 3. Phased implementation plan

### Phase 0 — Project hygiene & shop floor

- [ ] Rename app from "NKZW App" / `nkzw-app` to SongLayer in `app.json`, `package.json`, bundle identifiers, scheme.
- [ ] Replace template `assets/icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png` with SongLayer art.
- [ ] Delete template surface: `src/app/(app)/(tabs)/two.tsx`, login screen, sample bottom-sheet usages — keep layout shells.
- [ ] Auth: anonymous-only for MVP. Remove `/login` route; `useViewerContext` returns an anonymous viewer with a stable device-id (MMKV-backed).
- [ ] Set `orientation: 'portrait'` in `app.json`. No hedge.
- [ ] iOS infoPlist: camera + mic usage strings, `UIBackgroundModes: ["audio", "processing"]`, register a `BGProcessingTask` identifier for export continuation.
- [ ] Android manifest: `CAMERA`, `RECORD_AUDIO`, foreground service type `mediaProcessing` (for export).
- [ ] Update `babel.config.js` to use `react-native-worklets/plugin` (required by Reanimated 4). `react-native-worklets` is already at 0.7.4 in `package.json`.
- [ ] Disable the web target: remove `web` script from `package.json`, or ship a static "Use the mobile app" landing in `+html.tsx`.
- [ ] **CI (GitHub Actions):** PR pipeline runs `tsc --noEmit`, `oxlint`, `eslint`, `vitest run`, `expo prebuild --no-install` dry-run, `fbtee:all` (must succeed with no untranslated strings), and `license-checker --production --summary` failing on GPL/AGPL/LGPL.
- [ ] **EAS Build profiles:** `development` (dev-client, internal), `preview` (release build, internal distribution — TestFlight + Firebase App Distribution), `production` (store). Locked plugin versions in `app.json`; `ios/` and `android/` **not** committed (regenerate via `expo prebuild`); write `docs/prebuild-runbook.md`.
- [ ] **Sentry (sentry-expo)** wired in `_layout.tsx` with sourcemap upload via EAS post-build hook. Track export-success/failure rate, decoder-exhaustion events, audio-session interruptions as breadcrumbs.
- [ ] **i18n policy:** all user-visible strings wrapped in `<fbt>` / `fbt()` from first write. `fbtee:all` runs in CI and fails on untranslated.
- [ ] **TypeScript policy:** no new `any`; no `// @ts-ignore` without a linked issue. ESLint rule `@typescript-eslint/no-explicit-any` enforced.
- [ ] **Test plumbing:**
  - Unit tests via `vitest-react-native` (already installed) for slot-rect math, drift-correction, `1/sqrt(N)` attenuation, SQLite repo.
  - Component tests for `<GridSurface>` snapshots per layout/aspect.
  - Detox or Maestro selected (pick one) for on-device smoke; first smoke job lands in Phase 1.
- [ ] **Logger:** thin wrapper around `console` with levels + redaction; native module emits typed `onProgress` / `onWarning` / `onError` events through a single `EventEmitter`. No `print` / `Log.d` for user-visible signals.
- [ ] **EAS Update policy:** `runtimeVersion` = `appVersion`. JS-only updates ship via OTA; any change inside `songlayer-compositor` requires a store release. Documented in `docs/release.md`.

### Phase 1 — Foundation (capture + playback dev loop)

**Real-device requirement starts here.** Simulator is acceptable for layout/UI only; every record/playback task is verified on at least one iPhone and one Android device before checkoff.

- [ ] `npx expo install react-native-vision-camera expo-video expo-audio`. Add VisionCamera config plugin block in `app.json` (camera + mic permission strings, `enableMicrophonePermission: true`).
- [ ] `npx expo prebuild`; verify clean iOS + Android local builds.
- [ ] **Verify VisionCamera V5 Output API** for video recording (V4 issues #2186 & #3560 referenced in research are V4-era — confirm whether they reproduce on V5 before relying on workarounds).
- [ ] **Audio session helper module** (small TurboModule or Expo native module): `activate({ mode: 'record' | 'playback' })`, idempotent; sets `.playAndRecord, [.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP, .allowBluetoothHFP]`; emits `interruption` events.
- [ ] **Headphone detection helper**: iOS `currentRoute.outputs`, Android `AudioDeviceCallback`. Single JS API `useHeadphoneState()` returning `{ connected, transport: 'wired' | 'bt' | 'none' }`.
- [ ] Smoke test screen A: record a clip with VisionCamera; assert file on disk has audio + expected duration ±50 ms.
- [ ] Smoke test screen B: play a clip with `expo-video`.
- [ ] Smoke test screen C: play 4 sample clips simultaneously in a 2x2 grid; pre-warm players, start in one JS tick. **Measure drift** between players on real devices; commit numbers to `docs/measurements.md` with device / OS / fps / codec.
- [ ] Smoke test screen D: capture + simultaneous 4-clip playback; same drift measurement against the master capture clock.
- [ ] First Detox/Maestro on-device smoke job in CI.

### Phase 2 — Project + storage model + project CRUD

- [ ] Adopt class-based `expo-file-system` API (`File`, `Directory`, `Paths`).
- [ ] **SQLite schema** (with migrations):
  - `schema_version(version INT PK)` populated to 1.
  - `projects(id TEXT PK, title TEXT, projectType TEXT CHECK(projectType IN ('music','multi-cam')), layoutId TEXT, aspectRatio TEXT, schemaVersion INT, createdAt INT, updatedAt INT, deletedAt INT NULL)`.
  - `takes(id TEXT PK, projectId TEXT FK, fileUri TEXT, durationMs INT, slotIndex INT, slotMeta JSON, mutedInExport INT, gain REAL, createdAt INT)`.
  - `pending_takes(id TEXT PK, projectId TEXT, fileUri TEXT, slotIndex INT, recordingStartedAt INT, interruptedAt INT, reason TEXT)`.
  - Indices on `projects(updatedAt)`, `takes(projectId)`.
- [ ] **Migration runner**: forward-only; reads `schema_version`, runs `migrations/NNN-*.sql` in order, bumps the row. Unit-tested with fixture databases.
- [ ] MMKV keys: `currentProjectId`, `lastLayoutId`, `userPrefs`, `deviceCaps`.
- [ ] Helper: `projectDir(id)` → `Paths.document/projects/<id>/`; mark excluded from iCloud backup via the new API.
- [ ] Helper: `cacheDir(id)` → `Paths.cache/projects/<id>/`.
- [ ] **Orphan cleanup**: on app launch, diff `Paths.document/projects/*` against `projects` table; delete folders with no DB row older than 24h.
- [ ] **Project list + CRUD UI (basic):** list sorted by `updatedAt`; create (named or untitled with default name); open; rename; duplicate (clones row + symlinks/copies take files); soft-delete (sets `deletedAt`); restore from a "Recently deleted" section; hard-delete after 30 days.
- [ ] Storage size per project shown in the list (sum of file sizes under `projectDir`).
- [ ] **Flagship detection** helper returning `deviceCaps.flagship: boolean`; cached in MMKV; iOS A14+ allowlist, Android `Build.SOC_MODEL` allowlist or `getMemoryClass() >= 512`.

### Phase 3 — Layouts as data + layout picker

- [ ] Define `Layout` and `LayoutSet` types:
  ```ts
  type Slot = { id: string; x: number; y: number; w: number; h: number }; // 0..1
  type Layout = {
    id: string;
    aspect: '9:16' | '1:1' | '16:9';
    slotCount: number;
    slots: Slot[];
    gap?: number;
    cornerRadius?: number;
  };
  ```
- [ ] Seed layout catalog per aspect (9:16, 1:1, 16:9): 1-up, 2-split (h + v), 2x2, 3-up (1+2 and 3-row), 4-up. Minimum 4 layouts × 3 aspects.
- [ ] One renderer `<GridSurface layout={...} renderSlot={...} />` shared by capture preview, playback preview, and the export plan.
- [ ] `useGridGeometry(layoutId, canvasSize)` → memoized absolute rects.
- [ ] **WYSIWYG validation:** snapshot test renders each layout at 1080×1920 and pixel-diffs against a fixture export frame (≤1% diff).
- [ ] **Layout picker UX (lives next to preview, Phase 6):** swap layouts at any slot count, reorder which take occupies which slot (drag-and-drop with Reanimated + GH), change aspect mid-project with reflow + a confirm modal.

### Phase 4 — Recording flow (the core loop)

- [ ] `RecordSessionContext` (using `@nkzw/create-context-hook`): active project, project type, ordered existing takes, currently-recording slot index, audio-session state.
- [ ] **Project-type aware UX**: music mode shows headphone gate, count-in, click track; multi-cam mode shows none of those, uses neutral copy ("Record next angle" vs "Record next part").
- [ ] **First-take onboarding (project's first take):** no existing playback, no headphone gate, welcome copy explaining the workflow, optional skip-the-tutorial.
- [ ] **Pre-flight permission gate** before navigating into camera route: camera + mic; if denied, deep-link to Settings via `Linking.openSettings()`; re-check on `AppState` foreground. Mic re-verified at recording start, not just app launch.
- [ ] Pre-record screen: grid renders with existing takes placed; empty cell highlighted; camera preview fills it.
- [ ] On "Record":
  1. Music mode: verify headphones (`useHeadphoneState`); modal block if `transport === 'none'`.
  2. Activate audio session.
  3. Pre-warm all existing `VideoPlayer` instances; wait on each "ready" event.
  4. **Click track (music mode, optional):** user-configurable BPM + bars of count-in. 3-2-1 (or N-bar) countdown both visible and audible via `expo-audio`. Emit a 1 kHz 50 ms marker click into the recorded audio at t=0 for later onset alignment.
  5. Single JS tick: `camera.startRecording({ ... })` and `player.play()` on every existing-take player.
  6. Persist `recordingStartedAt` host-time stamp.
- [ ] On stop: receive video URI; move into `projectDir/takes/`; persist `takes` row.
- [ ] **Drift correction loop** (running every ~500 ms): for each playback player, compare `currentTime` to (elapsed since `recordingStartedAt`, measured against `mach_absolute_time` / `System.nanoTime`). Apply `playbackRate` nudge (1.02 / 0.98) for drift < 150 ms; hard-seek otherwise.
- [ ] **Failure modes (Phase 4.5)**:
  - Free disk-space check before record: require ≥ 500 MB; block with actionable message otherwise.
  - Capture-start failure (codec / permission / hardware): surface recoverable message; do not crash.
  - Android `MediaCodec` `IllegalStateException` (decoder exhausted): drop existing-take players to 480p proxies; if still failing, fall back to playing only the most recent take.
  - Mic permission revoked mid-record: stop capture, save partial, prompt.
  - Export errors: see Phase 7.
- [ ] **Interruption recovery**: subscribe to `AVAudioSessionInterruptionNotification` (iOS) and `AudioManager.OnAudioFocusChangeListener` (Android). On interruption, stop capture, persist URI to `pending_takes` (state `interrupted`). On app resume, prompt "keep / discard" with the partial duration shown.
- [ ] **Memory-pressure response**: iOS `UIApplication.didReceiveMemoryWarningNotification`, Android `onTrimMemory`. On warning, drop live playback to 480p proxies; pause any background decoder pre-warm.
- [ ] Mute toggle per existing take (drop a layer temporarily during the next take).
- [ ] **Retake any slot**, not just the most recent: select a slot, re-record replaces the file in place.
- [ ] **Trim head/tail** of any take (lightweight; uses `AVAssetExportSession` for iOS, `Transformer` clip for Android; native module provides the primitive).
- [ ] **Reorder slots** without re-recording (drag in the layout picker).

### Phase 5 — Layout reflow as clips are added

- [ ] After a take is committed, propose the next default layout for `slotCount + 1` in the current aspect. Show alternative layouts for the same slot count inline.
- [ ] Reanimated 4 `layout` transitions on each slot wrapper. Stable `key` per slot id. Animate the wrapper; not `VideoView`.
- [ ] **Reanimated 4 smoke test**: render 6 animated slot wrappers reflowing between 2x2 → 3-up → 4-up; verify 60fps on a mid-range Android.
- [ ] **Reduce-motion fallback**: if `useReducedMotion()` is true, replace reflow with a crossfade.

### Phase 6 — Preview screen

- [ ] Full-mix preview: every take's `VideoPlayer` plays simultaneously, audio summed. Pre-attenuate per-player to ~`1/sqrt(N)` (RMS-preserving). Decide capture-time normalization vs mix-time limiter when summing > 4 tracks.
- [ ] Scrubber + transport. Master player drives `currentTime`; on user scrub, seek all others.
- [ ] Per-take controls: mute (`mutedInExport`), solo, gain trim.
- [ ] Visual sync indicator if measured drift exceeds threshold.
- [ ] Layout picker UX lives here (see Phase 3).

### Phase 7 — Export (custom native module + share flow)

- [ ] Scaffold Expo Module `songlayer-compositor` via the create-module template. Document the local dev workflow in `docs/native-module-dev.md`: open `ios/SongLayer.xcworkspace` in Xcode and `android/` in Android Studio alongside Metro; `expo run:ios --device` for hot-reload JS + full rebuild for native; `pod install` / Gradle sync after any native API change; breakpoint recipes.
- [ ] **iOS (Swift)** `composeGrid({ takes, layout, aspect, bitrate, codec, includeClickTrack }) -> Promise<{ uri }>`:
  - `AVMutableComposition` with N video + N audio tracks.
  - `AVMutableVideoCompositionLayerInstruction` per track: `setTransform(_:at:)` derived from the slot rect (translate + scale to output size).
  - `AVMutableAudioMix` per-track volume = take's gain × (1 / √N).
  - `AVAssetExportSession` preset; codec H.264 / HEVC.
  - Click-track audio track included only if `includeClickTrack === true`.
  - Progress events; cancellation; `beginBackgroundTask` for short renders; `BGProcessingTask` for long renders. Use `backgroundTimeRemaining` rather than assuming a fixed ~30 s.
- [ ] **Android (Kotlin)** with **Media3 Transformer (≥ 1.6, current 1.8.x)**:
  - `Composition` with N `EditedMediaItem`s.
  - Slot positioning via `Presentation` / `OverlayEffect` / `VideoCompositorSettings`.
  - Mux H.264 1080p (or 720p); progress via `Transformer.Listener`.
  - Foreground service for export so it survives backgrounding.
- [ ] **Native-module contract tests**: golden-file MD5 or per-frame SSIM comparison of `composeGrid` output for a fixture project on both platforms.
- [ ] Export presets: 9:16 1080×1920, 1:1 1080×1080, 16:9 1920×1080. H.264 6–8 Mbps, AAC 192 kbps. Target ~25–35 MB / 30 s.
- [ ] **Re-export at a different aspect without re-rendering takes** — only the composition step reruns.
- [ ] Optional title / caption text overlay (single field, single style; not a creative editor).
- [ ] **Share flow:**
  - Aspect picker (vertical / square / horizontal) before export.
  - Platform recommendation chips (TikTok / Reels / Shorts / Feed / YouTube) preselect an aspect.
  - Share sheet (`expo-sharing`).
  - Save to camera roll (`expo-media-library`) with permission preflight.
- [ ] Thumbnail generation from the export for the project list.
- [ ] **Cloud-render fallback (Shotstack)**: behind a feature flag; triggered automatically if on-device export fails twice or by the user via "Render in cloud (HD)."

### Phase 8 — UX polish

- [ ] Per-project storage size displayed on the project list (already wired in Phase 2 — verify).
- [ ] "Delete raw takes (keep export)" action per project.
- [ ] Global storage screen with total + per-project breakdown.
- [ ] Onboarding intro carousel for first launch (workflow, headphones, multi-cam mode).
- [ ] Empty-state copy on the project list.
- [ ] **Accessibility**: VoiceOver / TalkBack labels on every capture and transport control; `accessibilityRole` on grid slots; `useReducedMotion()` fallbacks (already wired in Phase 5); option to burn a generated caption / title on the export.
- [ ] Light / dark surface review (template ships `userInterfaceStyle: 'light'` — decide whether to lift the lock).

### Phase 9 — Quality, testing, ship

- [ ] Real-device test matrix: iPhone A14+, an iPhone A11/A12, one Pixel, one Samsung mid-range, one Xiaomi.
- [ ] Measure live-playback ceiling per device class; persist as `MMKV.deviceCaps` with default ceiling and an explicit user-override path.
- [ ] **Music-mode sync regression test**: record a known click-track clip against itself; assert audio-onset alignment within ±20 ms in the final export.
- [ ] **Multi-cam mode test pass**: record without headphones, no click track, confirm UX never blocks and audio is captured cleanly.
- [ ] Audio fidelity A/B: capture quality with `.playAndRecord + .mixWithOthers` vs `.playAndRecord` alone. Verify sample-rate / bit-depth on export.
- [ ] App Store / Play Store readiness: privacy disclosures (camera, mic, photos), license review pass (CI already enforces, double-check), App Store Connect copy, screenshots in the three aspects.

---

## 4. Known risks / unresolved

- **Concurrent decoder slots on mid-range Android.** Often only 2–3 H.264 1080p decoders. Mitigation: 720p proxies after each take; flagship gating on the live playback ceiling.
- **VisionCamera `.mixWithOthers`.** Not exposed declaratively. Native session-manager module is on the path.
- **VisionCamera V5 newness.** Major rewrite; V4 issue numbers (#2186, #3560) may or may not reproduce. Phase 1 verifies before relying on V4 workarounds.
- **iOS audio downgrade.** `.playAndRecord` can yield mono / lo-fi playback on some routes. Phase 9 verifies post-export sample rate / bit depth.
- **Bluetooth headphone latency.** 100–250 ms, uncontrollable. UX nudges wired / USB-C / Lightning for music mode.
- **Background export on iOS.** `beginBackgroundTask` budget is iOS-version-dependent; design for "best effort under 25 s" using `backgroundTimeRemaining`; longer renders need `BGProcessingTask` (registered in Phase 0).
- **Media3 Transformer multi-input maturity.** Matured through 1.5–1.6; pin ≥ 1.6, prefer 1.8.x. Validate on Samsung / Pixel / Xiaomi.
- **Reanimated 4 perf on Fabric with many animated views.** Slot count capped at 6, but profile reflow on mid-range Android.
- **Audio clipping on 6-track sum.** Pre-attenuate per-player to ~`1/sqrt(N)`, plus mix-time limiter when N > 4.
- **expo-camera SDK 55 video stability.** Not in our path, but track for indirect signals about AVFoundation changes in the SDK.
- **AVAudioSession `.allowBluetooth` deprecation.** Already accounted for via `.allowBluetoothHFP`; revisit when iOS bumps again.

---

## 5. References

### Capture
- [VisionCamera — Recording Videos](https://react-native-vision-camera.com/docs/guides/recording-videos)
- [VisionCamera — Camera Formats](https://react-native-vision-camera.com/docs/guides/formats)
- [What's New in VisionCamera V5 (Margelo blog)](https://blog.margelo.com/whats-new-in-visioncamera-v5)
- [Apple — AVAudioSession `.playAndRecord`](https://developer.apple.com/documentation/avfoundation/avaudiosession/category/1616568-playandrecord)
- [Swift Forums — `.allowBluetooth` deprecation in Xcode 26](https://forums.swift.org/t/xcode-26-avaudiosession-categoryoptions-allowbluetooth-deprecated/80956)

### Playback
- [expo-video API](https://docs.expo.dev/versions/latest/sdk/video/)
- [Software Mansion — The Future of Video in React Native](https://swmansion.com/blog/the-future-of-video-in-react-native-moving-from-expo-av-to-expo-video-6f4f78e51196/)
- [Apple — `AVPlayer.setRate(_:time:atHostTime:)`](https://developer.apple.com/documentation/avfoundation/avplayer/1386591-setrate)

### Composition / export
- [Saying Goodbye to FFmpegKit (Taner Sener, Jan 2025)](https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1)
- [Expo Modules tutorial](https://docs.expo.dev/modules/native-module-tutorial/)
- [AVFoundation merge / overlay walkthrough](https://medium.com/@pokharel.ashwin1/using-avfoundation-to-merge-and-overlay-multiple-videos-afd594c7470e)
- [Apple — `AVMutableVideoCompositionLayerInstruction`](https://developer.apple.com/documentation/avfoundation/avmutablevideocompositionlayerinstruction)
- [Media3 Transformer — Multi-asset editing](https://developer.android.com/media/media3/transformer/multi-asset)
- [Media3 1.8.0 release blog](https://android-developers.googleblog.com/2025/08/media3-180-whats-new.html)
- [AOSP — MediaCodec resource manager (concurrent decoder limits)](https://source.android.com/docs/core/media/oem)
- [Shotstack pricing / docs](https://shotstack.io/pricing/)

### Storage / layout / tooling
- [Expo SDK 55 changelog](https://expo.dev/changelog/sdk-55)
- [Expo FileSystem (SDK 55, new API)](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo SQLite (SDK 55)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Reanimated 3 → 4 migration](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
- [iOS storage best practices](https://swiftlyanand.medium.com/ios-storage-best-practices-294fca83ad9)

### Prior art
- [Acapella by Mixcord](https://www.mixcord.co/pages/acapella) — canonical reference for the layered-takes UX (up to 9-slot grids, click-track-during-recording).
