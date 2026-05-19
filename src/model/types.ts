// Pure type definitions for SongLayer data model.
// No runtime imports — safe to load from anywhere, including native compositor
// payload builders.

export type Aspect = '9:16' | '1:1' | '16:9';

export type ProjectType = 'music' | 'multi-cam';

export type Slot = Readonly<{
  h: number;
  id: string;
  w: number;
  // Normalized [0,1] coordinates relative to the parent grid.
  x: number;
  y: number;
}>;

export type Layout = Readonly<{
  aspect: Aspect;
  cornerRadius?: number;
  // Pixel-equivalent gap at the 1080-pixel reference resolution.
  gap?: number;
  id: string;
  label: string;
  slotCount: number;
  slots: ReadonlyArray<Slot>;
}>;

export type LayoutSet = ReadonlyArray<Layout>;

export type Project = Readonly<{
  aspectRatio: Aspect;
  createdAt: number;
  deletedAt: number | null;
  id: string;
  layoutId: string;
  projectType: ProjectType;
  schemaVersion: number;
  title: string;
  updatedAt: number;
}>;

export type Take = Readonly<{
  createdAt: number;
  durationMs: number;
  fileUri: string;
  gain: number;
  id: string;
  mutedInExport: boolean;
  projectId: string;
  slotIndex: number;
  slotMeta: Readonly<{
    aspectAtRecord: Aspect;
    layoutIdAtRecord: string;
  }>;
}>;

export type PendingTake = Readonly<{
  fileUri: string;
  id: string;
  interruptedAt: number | null;
  projectId: string;
  reason: string | null;
  recordingStartedAt: number;
  slotIndex: number;
}>;

export type DeviceCaps = Readonly<{
  capturePreset: '720p' | '1080p';
  // True for iOS A14+ and known Android flagships; controls live-playback ceiling.
  flagship: boolean;
  liveStreamCeiling: number;
  platform: 'ios' | 'android';
}>;

export type HeadphoneState = Readonly<{
  connected: boolean;
  transport: 'wired' | 'bt' | 'none';
}>;

export type AspectDimensions = Readonly<{ height: number; width: number }>;
