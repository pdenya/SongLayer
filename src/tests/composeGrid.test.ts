import { describe, expect, test } from 'vite-plus/test';
import { planComposeGrid } from '../export/composeGrid.ts';
import { getLayoutById } from '../model/layouts.ts';
import type { Take } from '../model/types.ts';

function makeTake(slotIndex: number, overrides: Partial<Take> = {}): Take {
  return {
    createdAt: 0,
    durationMs: 1000,
    fileUri: `file:///t${slotIndex}.mov`,
    gain: 1,
    id: `take-${slotIndex}`,
    mutedInExport: false,
    projectId: 'p',
    slotIndex,
    slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    ...overrides,
  };
}

describe('planComposeGrid', () => {
  test('builds tracks for a 2-up layout', () => {
    const layout = getLayoutById('v-2-stack')!;
    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: 7000,
      codec: 'h264',
      includeClickTrack: false,
      layout,
      takes: [makeTake(0), makeTake(1)],
    });
    expect(plan.tracks.length).toBe(2);
    expect(plan.outputWidth).toBe(1080);
    expect(plan.outputHeight).toBe(1920);
    // The two slots stack top/bottom so distinct destY values.
    expect(plan.tracks[0]!.destY).toBeLessThan(plan.tracks[1]!.destY);
  });

  test('rejects mismatched aspect', () => {
    const layout = getLayoutById('s-1')!; // 1:1
    expect(() =>
      planComposeGrid({
        aspect: '9:16',
        bitrateKbps: 7000,
        codec: 'h264',
        includeClickTrack: false,
        layout,
        takes: [makeTake(0)],
      }),
    ).toThrow();
  });

  test('rejects too many takes for the layout', () => {
    const layout = getLayoutById('v-1')!; // 1 slot
    expect(() =>
      planComposeGrid({
        aspect: '9:16',
        bitrateKbps: 7000,
        codec: 'h264',
        includeClickTrack: false,
        layout,
        takes: [makeTake(0), makeTake(1)],
      }),
    ).toThrow();
  });

  test('muted takes get 0 gain in plan', () => {
    const layout = getLayoutById('v-2-stack')!;
    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: 7000,
      codec: 'h264',
      includeClickTrack: false,
      layout,
      takes: [makeTake(0, { mutedInExport: true }), makeTake(1)],
    });
    expect(plan.tracks[0]!.gain).toBe(0);
    expect(plan.tracks[1]!.gain).toBeGreaterThan(0);
  });

  test('single-take plan produces full-frame track', () => {
    const layout = getLayoutById('v-1')!;
    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: 7000,
      codec: 'h264',
      includeClickTrack: false,
      layout,
      takes: [makeTake(0)],
    });
    expect(plan.tracks[0]!.destW).toBe(1080);
    expect(plan.tracks[0]!.destH).toBe(1920);
    // 1 take → gain 1 (combinedGain at N=1).
    expect(plan.tracks[0]!.gain).toBe(1);
  });
});
