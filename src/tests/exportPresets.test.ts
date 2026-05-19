import { describe, expect, test } from 'vite-plus/test';
import { EXPORT_PRESETS, presetFor } from '../export/exportPresets.ts';
import { ASPECT_DIMENSIONS } from '../model/slotRect.ts';
import type { Aspect } from '../model/types.ts';

const ASPECTS: ReadonlyArray<Aspect> = ['9:16', '1:1', '16:9'];

describe('exportPresets', () => {
  test('each aspect has a preset', () => {
    for (const a of ASPECTS) {
      expect(EXPORT_PRESETS[a]).toBeTruthy();
      expect(presetFor(a).aspect).toBe(a);
    }
  });

  test('preset dimensions match ASPECT_DIMENSIONS', () => {
    for (const a of ASPECTS) {
      const preset = presetFor(a);
      expect(preset.width).toBe(ASPECT_DIMENSIONS[a].width);
      expect(preset.height).toBe(ASPECT_DIMENSIONS[a].height);
    }
  });

  test('vertical preset recommends tiktok/reels/shorts', () => {
    const recs = presetFor('9:16').recommendedPlatforms;
    expect(recs).toContain('tiktok');
    expect(recs).toContain('reels');
    expect(recs).toContain('shorts');
  });

  test('square preset recommends feed', () => {
    expect(presetFor('1:1').recommendedPlatforms).toContain('feed');
  });

  test('horizontal preset recommends youtube', () => {
    expect(presetFor('16:9').recommendedPlatforms).toContain('youtube');
  });

  test('bitrates are within sensible bounds (6–10 Mbps)', () => {
    for (const a of ASPECTS) {
      const preset = presetFor(a);
      expect(preset.videoBitrateKbps).toBeGreaterThanOrEqual(6000);
      expect(preset.videoBitrateKbps).toBeLessThanOrEqual(10_000);
      expect(preset.audioBitrateKbps).toBeGreaterThanOrEqual(128);
    }
  });

  test('codec is h264 or hevc', () => {
    for (const a of ASPECTS) {
      const c = presetFor(a).codec;
      expect(['h264', 'hevc']).toContain(c);
    }
  });
});
