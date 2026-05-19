# SongLayer architecture

A bird's-eye view of how the modules in `src/` fit the README's product
description (and the phased plan in `to-do.MD`).

## Layered-takes pipeline

```
                ┌─────────────┐
   record       │  Camera     │  visionc-camera v5 (native)
   ────────►    │  (capture)  │  → fileUri.mov, durationMs
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │ Take row    │  src/storage/projectStore.ts
                │ (sqlite)    │
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
   playback     │ Take player │  expo-video (one VideoPlayer / take)
   ────────►    │ + drift     │  src/model/drift.ts
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
   preview /    │ GridSurface │  src/ui/GridSurface.tsx
   export       │ + Layout    │  src/model/layouts.ts
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │ Compose     │  src/export/composeGrid.ts → native:
                │ (native)    │   iOS: AVFoundation
                └─────────────┘    Android: Media3 Transformer
```

## Project state

- `Project` (sqlite row + JSON column for `slotMeta`).
- `Take` (one row per recorded clip, ordered by `slotIndex`).
- `PendingTake` (interrupted recording, used by the recovery prompt).

Schema details live in `src/storage/migrations.ts`. The in-memory store at
`src/storage/projectStore.ts` is the contract shape that the SQLite backing
must satisfy.

## Grid model

A `Layout` is pure JSON: an aspect, a slot count, and an array of
normalized `[0,1]` rects. The same `Layout` instance feeds:

1. The recording screen (`GridSurface` renders the camera into the empty
   slot, prior takes into the populated slots).
2. The preview screen (`GridSurface` renders every take + the play/pause
   master transport).
3. The compose plan handed to the native compositor (`planComposeGrid`
   converts the rects to absolute pixel positions on the export canvas).

Adding a new layout is a one-file change in `src/model/layouts.ts`; the
tiling validator and rendering paths pick it up automatically.

## Audio mixing math

`combinedGain(N, takeGain)` in `src/model/audioMath.ts` implements the
1/√N RMS-preserving attenuation with an additional 0.5 dB / layer makeup
limiter past N = 4. The same formula runs in the JS preview (per-player
volume) and in the native compose plan (per-track gain envelope).

## Project-type aware UX

Music mode (the README's "sing along with yourself" flow) gates recording
on a connected headphone (`src/capture/headphoneState.ts`) and exposes an
optional count-in. Multi-cam mode (the README's "multi-cam capture" flow)
drops the gate and the count-in entirely — every other module stays the
same.
