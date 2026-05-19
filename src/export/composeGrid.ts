import { combinedGain } from '../model/audioMath.ts';
import { ASPECT_DIMENSIONS, rectsForLayout } from '../model/slotRect.ts';
import type { Aspect, Layout, Take } from '../model/types.ts';

// JS interface to the `songlayer-compositor` Expo module that does the
// actual on-device export:
//   * iOS  : Swift, AVMutableComposition / AVMutableVideoCompositionLayerInstruction
//   * Android: Kotlin, Media3 Transformer (pinned >= 1.6, currently 1.8.x)
//
// This module produces the payload the native module consumes and validates
// it (slot count matches takes, aspect supported, etc.). Native module dev
// loop is documented in docs/native-module-dev.md.

export type ExportCodec = 'h264' | 'hevc';

export type ComposeGridArgs = Readonly<{
  aspect: Aspect;
  bitrateKbps: number;
  codec: ExportCodec;
  includeClickTrack: boolean;
  layout: Layout;
  takes: ReadonlyArray<Take>;
}>;

export type ComposeGridPlan = Readonly<{
  audio: Readonly<{
    channels: 1 | 2;
    masterMixDb: number;
    sampleRate: number;
  }>;
  codec: ExportCodec;
  includeClickTrack: boolean;
  outputHeight: number;
  outputWidth: number;
  tracks: ReadonlyArray<{
    destH: number;
    destW: number;
    destX: number;
    destY: number;
    fileUri: string;
    gain: number;
    muted: boolean;
    slotIndex: number;
    takeId: string;
  }>;
  videoBitrateKbps: number;
}>;

export function planComposeGrid(args: ComposeGridArgs): ComposeGridPlan {
  const { aspect, bitrateKbps, codec, includeClickTrack, layout, takes } = args;

  if (layout.aspect !== aspect) {
    throw new Error(`Layout aspect ${layout.aspect} does not match export aspect ${aspect}`);
  }
  if (takes.length > layout.slotCount) {
    throw new Error(
      `Too many takes (${takes.length}) for layout ${layout.id} with ${layout.slotCount} slots`,
    );
  }
  if (takes.length === 0) {
    throw new Error('No takes to compose');
  }

  const canvas = ASPECT_DIMENSIONS[aspect];
  const rects = rectsForLayout(layout, canvas);
  const activeCount = takes.filter((t) => !t.mutedInExport).length;

  const tracks = takes.map((take) => {
    const rect = rects[take.slotIndex] ?? rects[0]!;
    const baseGain = take.mutedInExport ? 0 : combinedGain(activeCount, take.gain);
    return {
      destH: rect.h,
      destW: rect.w,
      destX: rect.x,
      destY: rect.y,
      fileUri: take.fileUri,
      gain: baseGain,
      muted: take.mutedInExport,
      slotIndex: take.slotIndex,
      takeId: take.id,
    };
  });

  return {
    audio: {
      channels: 2,
      // -1 dB master ceiling: a tiny bit of headroom past the per-track gain.
      masterMixDb: -1,
      sampleRate: 48_000,
    },
    codec,
    includeClickTrack,
    outputHeight: canvas.height,
    outputWidth: canvas.width,
    tracks,
    videoBitrateKbps: bitrateKbps,
  };
}

// Bridge to the native module. The factory pattern lets tests swap in a
// fake; the real implementation will require the SongLayerCompositor module
// via Expo's `requireOptionalNativeModule`.
type CompositorImpl = Readonly<{
  cancel(): Promise<void>;
  composeGrid(plan: ComposeGridPlan, outputUri: string): Promise<{ uri: string }>;
  onProgress(cb: (fraction: number) => void): () => void;
}>;

let impl: CompositorImpl | null = null;

export function setCompositorImpl(value: CompositorImpl | null): void {
  impl = value;
}

export async function composeGrid(
  plan: ComposeGridPlan,
  outputUri: string,
): Promise<{ uri: string }> {
  if (!impl) {
    throw new Error(
      'songlayer-compositor native module unavailable. Implement Phase 7 to wire it in.',
    );
  }
  return impl.composeGrid(plan, outputUri);
}

export function onProgress(cb: (fraction: number) => void): () => void {
  if (!impl) {
    return () => undefined;
  }
  return impl.onProgress(cb);
}

export async function cancelCompose(): Promise<void> {
  if (impl) {
    await impl.cancel();
  }
}
