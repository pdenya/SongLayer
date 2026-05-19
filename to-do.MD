# SongLayer — Implementation To-Do

Synthesis of research into how to build SongLayer on top of the existing Expo template (Expo SDK 55, React Native 0.83, New Architecture, React 19 + React Compiler, Uniwind+Tailwind, Reanimated 4, MMKV, expo-router).

Update this file as the project moves. Tickboxes (`[ ]` / `[x]`) on every task.

---

## 1. Technology decisions

These are the locked-in choices from research; revisit only if a phase blocker forces it.

- **Capture:** `react-native-vision-camera` v5.x. Not `expo-camera` — its video path has a per-SDK regression history and lacks fps/format controls. Requires `npx expo prebuild` and a config plugin.
- **Playback:** `expo-video` (first-party, New-Arch-native, replaces `expo-av`, which is removed in SDK 55). One `VideoPlayer` per take.
- **Audio session:** `AVAudioSession` category `.playAndRecord` with options `[.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP]`. Set every `VideoPlayer.audioMixingMode = 'mixWithOthers'`. Likely needs a small native session-manager module (VisionCamera doesn't expose `.mixWithOthers` declaratively).
- **Headphones required for take 2+.** Detect via `AVAudioSession.currentRoute`; block recording if the only output is `builtInSpeaker`. Mic AEC in `.playAndRecord` is unusable for singing.
- **Export compositor:** Custom Expo Module wrapping `AVFoundation` (`AVMutableComposition` + `AVMutableVideoComposition` + `AVAssetExportSession`) on iOS, and `Jetpack Media3 Transformer` (pin >= 1.4.x) on Android. **Do not use any `ffmpeg-kit` fork** — original was archived June 2025; forks are unmaintained and full-gpl variants bundle x264 (licensing risk).
- **Cloud render fallback (optional, Phase 5+):** Shotstack JSON timeline. Feature-flagged, used on device-export failure or as a "HD remix" upsell.
- **Storage:**
  - Raw take files → `Paths.document/projects/<projectId>/takes/` (new class-based `expo-file-system` API; `expo-file-system/legacy` is deprecated).
  - Project folder marked `NSURLIsExcludedFromBackupKey` so multi-hundred-MB takes don't bloat iCloud.
  - Export intermediates + thumbnails → `Paths.cache`.
- **Metadata:**
  - `react-native-mmkv` for app-level state (current project id, prefs, last-used layout).
  - `expo-sqlite` (async API) for the project/take catalog. Slot assignments + timing offsets as a JSON column on `takes`.
- **Grid model:** Pure JSON, relative rects in `[0,1]`. Same data drives capture preview, playback preview, and the export compositor. Reanimated 4 `entering`/`exiting`/`layout` for the "grid evolves" transition; animate a wrapping `Animated.View`, not the `VideoView` itself.
- **Performance ceiling for live playback:** 4 concurrent HD streams on Android, 6 on modern iOS, **720p H.264**. Beyond that, pre-transcode proxies or fall back to cloud render.
- **Default take recording profile:** 720p, 30 fps, H.264, ~6 Mbps, AAC 128 kbps stereo. Bump to 1080p only on flagship-detected devices.

---

## 2. Phased implementation plan

### Phase 0 — Project hygiene

- [ ] Rename the app from "NKZW App" / `nkzw-app` to SongLayer in `app.json`, `package.json`, bundle identifiers, scheme.
- [ ] Replace template `assets/icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png` with SongLayer art.
- [ ] Delete unused template surface: `src/app/(app)/(tabs)/two.tsx`, sample login, sample bottom-sheet usages — keep the layout shells.
- [ ] Decide auth model (anonymous-only for MVP? defer login screen?). Keep `useViewerContext` plumbing.
- [ ] Update `app.json` `orientation` — likely `"portrait"` is fine for MVP. Lock it.
- [ ] Add the new permission strings (camera, mic) to `ios.infoPlist` and Android permissions when wiring VisionCamera.
- [ ] Add `UIBackgroundModes: ["audio"]` to iOS infoPlist so the session survives screen-lock mid-take.

### Phase 1 — Foundation (capture + playback dev loop)

- [ ] `npx expo install react-native-vision-camera expo-video expo-audio`.
- [ ] `npx expo prebuild` and verify clean iOS + Android local builds.
- [ ] Add VisionCamera config plugin block to `app.json` (camera + mic permission strings, `enableMicrophonePermission: true`, no location).
- [ ] Build a one-screen "record a clip" smoke test. Confirm video file lands on disk with audio.
- [ ] Build a one-screen "play a clip" smoke test using `expo-video` `VideoPlayer` + `VideoView`.
- [ ] Build a "play 4 clips at once" smoke test — drop 4 short sample clips into the bundle, instantiate 4 `VideoPlayer`s, render 4 `VideoView`s in a 2x2 grid, hit play simultaneously. Measure perceived sync drift on real devices.
- [ ] Write down measured drift numbers (iOS, Android, mid-range Android) — this calibrates the drift-correction loop later.

### Phase 2 — Project + storage model

- [ ] Adopt the new class-based `expo-file-system` API (`File`, `Directory`, `Paths`).
- [ ] Set up `expo-sqlite` schema:
  - `projects(id TEXT PK, title TEXT, layoutId TEXT, aspectRatio TEXT, createdAt INT, updatedAt INT, deletedAt INT NULL)`
  - `takes(id TEXT PK, projectId TEXT FK, fileUri TEXT, durationMs INT, slotIndex INT, slotMeta JSON, mutedInExport INT, gain REAL, createdAt INT)`
  - Indices on `projects(updatedAt)`, `takes(projectId)`.
- [ ] MMKV keys: `currentProjectId`, `lastLayoutId`, `userPrefs`.
- [ ] Helper: `projectDir(id)` → `Paths.document/projects/<id>/`; mark it excluded from iCloud backup.
- [ ] Helper: `cacheDir(id)` → `Paths.cache/projects/<id>/` for thumbnails + export intermediates.
- [ ] Background job (or app-launch task) to clean orphaned project folders.

### Phase 3 — Layouts as data

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
- [ ] Seed the layout catalog. Minimum set for MVP, per aspect: 1-up, 2-split (h + v), 2x2, 3-up (1+2 and 3-row), 4-up — repeat for 9:16, 1:1, 16:9.
- [ ] One renderer `<GridSurface layout={...} renderSlot={...} />` that all three consumers (capture preview, playback preview, export plan) share.
- [ ] `useGridGeometry(layoutId, canvasSize)` → absolute rects, memoized.
- [ ] Validate "what you see is what you export" by snapshot-rendering each layout at canvas sizes matching the export resolution.

### Phase 4 — Recording flow (the core loop)

- [ ] `RecordSessionContext` (using `@nkzw/create-context-hook`) holding: active project, ordered list of existing takes, currently-recording slot index, audio session state.
- [ ] Pre-record screen: shows the chosen grid with existing takes placed in their slots and an empty cell highlighted for the next take. Camera preview occupies the empty cell.
- [ ] On "Record":
  1. Verify headphones connected (Phase 4 sub-task).
  2. Configure audio session `.playAndRecord, [.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP]`.
  3. Pre-warm all existing-take `VideoPlayer`s; wait for every "ready" event.
  4. Display a visible+audible 3-2-1 countdown (also a click marker for later re-alignment).
  5. In a single JS tick: `camera.startRecording({ ... })` and `.play()` every player.
  6. Persist a `recordingStartedAt` host-time stamp.
- [ ] On stop: receive video URI from VisionCamera, move into `projectDir(id)/takes/`, persist a `takes` row with `slotIndex`.
- [ ] Drift-correction loop (lightweight): every ~500 ms, compare each playback player's `currentTime` against the master clock (recording elapsed). Apply small `playbackRate` nudges (1.02 / 0.98); hard-seek only if drift > ~150 ms.
- [ ] Headphone detection: native helper exposing `AVAudioSession.currentRoute.outputs`. Surface a friendly modal if the user has none plugged in.
- [ ] Mute toggle per existing take (so a user can "drop" a layer temporarily during the next take).
- [ ] Retake: replace the most recent take in its slot.

### Phase 5 — Layout reflow as clips are added

- [ ] After a take is committed, propose the next default layout for `slotCount + 1` in the current aspect. Show a row of alternative layouts for the same slot count.
- [ ] Reanimated 4 `layout` transitions on each slot wrapper as the layout changes. Stable `key` per slot id. Animate the wrapper, never `VideoView`.
- [ ] Sanity-check Reanimated 4 New-Arch caveats (worklets package, springs `energyThreshold`, no `useAnimatedGestureHandler`).

### Phase 6 — Preview screen

- [ ] Full-mix preview: every take's `VideoPlayer` plays simultaneously, audio summed. Pre-attenuate volumes to ~`1/sqrt(N)` to avoid clipping.
- [ ] Scrubber + transport. Use one player as master; seek others to the same `currentTime` on user scrub.
- [ ] Per-take controls in preview: mute, solo, gain trim.
- [ ] Visual sync indicator if measured drift exceeds threshold.

### Phase 7 — Export (custom native module)

- [ ] Scaffold an Expo Module `songlayer-compositor` with the create-module template.
- [ ] iOS implementation (Swift):
  - `composeGrid({ takes: [{uri, slot}], layout, aspect, bitrate, codec }) -> Promise<{uri}>`
  - `AVMutableComposition` with N video tracks + N audio tracks.
  - `AVMutableVideoCompositionLayerInstruction` per track: `setTransform(CGAffineTransform)` from the slot rect (translate + scale to output size).
  - `AVMutableAudioMix` with per-track volume from the take's gain.
  - `AVAssetExportSession` preset `AVAssetExportPreset1920x1080` or `Highest`, codec H.264/HEVC.
  - Progress event emitter; cancellation; `beginBackgroundTask` to survive backgrounding.
- [ ] Android implementation (Kotlin) using **Media3 Transformer**:
  - `Composition` with N `EditedMediaItem`s.
  - `Presentation`/`OverlayEffect` for slot positioning, or compose via `VideoCompositorSettings` (1.4+).
  - Mux to H.264 1080p; progress via `Transformer.Listener`.
- [ ] JS layer: `compose(project)` → reads `takes` from SQLite, hands them with the active layout to the native module.
- [ ] Export presets: 9:16 1080x1920, 1:1 1080x1080, 16:9 1920x1080. H.264 6–8 Mbps, AAC 192 kbps. Target ~25–35 MB / 30 s.
- [ ] Thumbnail generation from the export for the project list.
- [ ] Optional Phase 5+: cloud-render fallback via Shotstack behind a feature flag.

### Phase 8 — UX polish

- [ ] Project list screen, list of projects sorted by `updatedAt`.
- [ ] Per-project storage size shown in UI; "Delete raw takes (keep export)" action.
- [ ] Global storage screen.
- [ ] Onboarding: explain the headphone requirement and the take-by-take workflow.
- [ ] Share sheet integration after export.
- [ ] Empty-state copy + first-launch demo project.

### Phase 9 — Quality, testing, ship

- [ ] Real-device test matrix: iPhone (A14+ and an older A11), one Pixel, one Samsung mid-range, one Xiaomi.
- [ ] Measure live-playback ceiling per device class; gate take count accordingly.
- [ ] Audio fidelity A/B: capture quality with `.playAndRecord + .mixWithOthers` vs `.playAndRecord` alone.
- [ ] Sync regression test: a known click-track clip recorded against itself; assert audio onset alignment within ±20 ms in the final export.
- [ ] App Store / Play Store readiness: privacy disclosures (camera, mic, photos if we offer "save to camera roll"), license review (no GPL deps).

---

## 3. Known risks / unresolved

- **Concurrent decoder slots on mid-range Android.** Capped roughly 4-8 hardware H.264 decoders. Mitigation: pre-transcode 720p proxies after each take and play those during recording; keep originals for export.
- **VisionCamera `.mixWithOthers`.** Library doesn't expose it declaratively. Either patch VisionCamera, ship a small TurboModule, or use `react-native-volume-manager`-style approach.
- **iOS audio downgrade.** `.playAndRecord` historically caused some apps to receive mono/lo-fi playback. Validate the final mixdown sample rate / bit depth post-export.
- **Bluetooth headphone latency.** 100-250 ms, uncontrollable. UX should strongly nudge wired/USB-C/Lightning for serious sessions.
- **Background export on iOS.** `beginBackgroundTask` only buys ~30 s. Longer renders need a `BGProcessingTask` or finish-before-suspend UX.
- **Media3 Transformer multi-input maturity.** Multi-asset composition matured in 1.3/1.4 — pin a version and test on Samsung/Pixel/Xiaomi.
- **VisionCamera open issues to watch:** #2186 (A/V sync drift on rapid start/stop), #3560 (iOS audio occasionally missing).
- **expo-camera SDK 55 video stability.** Even though we're not using it, regressions there sometimes indicate iOS-side AVFoundation changes worth tracking.
- **Reanimated 4 perf on Fabric with many animated views.** Reportedly degraded; we're already capped at 6 slots, so likely fine, but profile when reflowing.
- **Audio clipping on 6-track sum.** Pre-attenuate per-player volume to ~`1/sqrt(N)`, or normalize each take at capture.

---

## 4. References

### Capture
- [VisionCamera — Recording Videos](https://react-native-vision-camera.com/docs/guides/recording-videos)
- [VisionCamera — Camera Formats](https://react-native-vision-camera.com/docs/guides/formats)
- [VisionCamera — CameraProps API](https://react-native-vision-camera.com/docs/api/interfaces/CameraProps)
- [Apple — AVAudioSession `.playAndRecord`](https://developer.apple.com/documentation/avfoundation/avaudiosession/category/1616568-playandrecord)
- [VisionCamera vs expo-camera 2026 (PkgPulse)](https://www.pkgpulse.com/guides/react-native-vision-camera-vs-expo-camera-vs-expo-image-2026)

### Playback
- [expo-video API](https://docs.expo.dev/versions/latest/sdk/video/)
- [Software Mansion — The Future of Video in React Native](https://swmansion.com/blog/the-future-of-video-in-react-native-moving-from-expo-av-to-expo-video-6f4f78e51196/)
- [Apple — `AVPlayer.setRate(_:time:atHostTime:)`](https://developer.apple.com/documentation/avfoundation/avplayer/1386591-setrate)
- [ExoPlayer multi-instance drift discussion](https://github.com/google/ExoPlayer/issues/2855)

### Composition / export
- [Saying Goodbye to FFmpegKit (Taner Sener, 2025)](https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1)
- [Expo Modules tutorial](https://docs.expo.dev/modules/native-module-tutorial/)
- [AVFoundation merge/overlay walkthrough](https://medium.com/@pokharel.ashwin1/using-avfoundation-to-merge-and-overlay-multiple-videos-afd594c7470e)
- [Shotstack pricing / docs](https://shotstack.io/pricing/)

### Storage / layout
- [Expo FileSystem (SDK 55, new API)](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo SQLite (SDK 55)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Reanimated 3 → 4 migration](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
- [iOS storage best practices](https://swiftlyanand.medium.com/ios-storage-best-practices-294fca83ad9)

### Prior art
- [Acapella by Mixcord](https://www.mixcord.co/pages/acapella) — canonical reference for the layered-takes UX, up to 9-slot grids, click-track-during-recording approach.
