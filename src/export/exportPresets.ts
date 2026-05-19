import type { Aspect } from '../model/types.ts';

// Default export presets — three deliverable aspects with bitrates calibrated
// to the README's social posting targets (TikTok/Reels/Shorts at 9:16, feed
// at 1:1, YouTube at 16:9). H.264 6–8 Mbps + AAC 192 kbps lands ~25–35 MB
// per 30s, well under feed-platform upload caps.

export type ExportPreset = Readonly<{
  aspect: Aspect;
  audioBitrateKbps: number;
  codec: 'h264' | 'hevc';
  height: number;
  recommendedPlatforms: ReadonlyArray<'tiktok' | 'reels' | 'shorts' | 'feed' | 'youtube'>;
  videoBitrateKbps: number;
  width: number;
}>;

export const EXPORT_PRESETS: Readonly<Record<Aspect, ExportPreset>> = {
  '1:1': {
    aspect: '1:1',
    audioBitrateKbps: 192,
    codec: 'h264',
    height: 1080,
    recommendedPlatforms: ['feed'],
    videoBitrateKbps: 7000,
    width: 1080,
  },
  '16:9': {
    aspect: '16:9',
    audioBitrateKbps: 192,
    codec: 'h264',
    height: 1080,
    recommendedPlatforms: ['youtube'],
    videoBitrateKbps: 8000,
    width: 1920,
  },
  '9:16': {
    aspect: '9:16',
    audioBitrateKbps: 192,
    codec: 'h264',
    height: 1920,
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    videoBitrateKbps: 7000,
    width: 1080,
  },
};

export function presetFor(aspect: Aspect): ExportPreset {
  return EXPORT_PRESETS[aspect];
}
