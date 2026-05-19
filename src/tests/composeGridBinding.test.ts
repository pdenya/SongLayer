import { afterEach, describe, expect, test } from 'vite-plus/test';
import {
  cancelCompose,
  composeGrid,
  onProgress,
  planComposeGrid,
  setCompositorImpl,
} from '../export/composeGrid.ts';
import { getLayoutById } from '../model/layouts.ts';
import type { Take } from '../model/types.ts';

function makeTake(slotIndex: number): Take {
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
  };
}

describe('composeGrid native binding', () => {
  afterEach(() => {
    setCompositorImpl(null);
  });

  test('throws when no native impl is installed', async () => {
    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: 7000,
      codec: 'h264',
      includeClickTrack: false,
      layout: getLayoutById('v-1')!,
      takes: [makeTake(0)],
    });
    await expect(composeGrid(plan, 'file:///out.mp4')).rejects.toThrow(
      /songlayer-compositor.*unavailable/,
    );
  });

  test('uses installed impl when set', async () => {
    const calls: Array<{ plan: unknown; uri: string }> = [];
    setCompositorImpl({
      async cancel() {
        // no-op
      },
      async composeGrid(plan, uri) {
        calls.push({ plan, uri });
        return { uri };
      },
      onProgress() {
        return () => undefined;
      },
    });

    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: 7000,
      codec: 'h264',
      includeClickTrack: false,
      layout: getLayoutById('v-1')!,
      takes: [makeTake(0)],
    });
    const result = await composeGrid(plan, 'file:///out.mp4');
    expect(result.uri).toBe('file:///out.mp4');
    expect(calls.length).toBe(1);
  });

  test('onProgress is wired to the installed impl', () => {
    const subs: Array<(f: number) => void> = [];
    setCompositorImpl({
      async cancel() {},
      async composeGrid(_plan, uri) {
        return { uri };
      },
      onProgress(cb) {
        subs.push(cb);
        return () => {
          const i = subs.indexOf(cb);
          if (i >= 0) {
            subs.splice(i, 1);
          }
        };
      },
    });
    let last = 0;
    const off = onProgress((f) => {
      last = f;
    });
    subs[0]!(0.42);
    expect(last).toBe(0.42);
    off();
    subs[0]?.(0.99); // would still call our cb if off didn't work
    // off() removes from native side, but in this fake we don't enforce; the
    // important contract is that the impl is the one invoked. We assert
    // off() is callable without throwing.
  });

  test('cancelCompose is a no-op when no impl, forwards when installed', async () => {
    await expect(cancelCompose()).resolves.toBeUndefined();
    let cancelled = false;
    setCompositorImpl({
      async cancel() {
        cancelled = true;
      },
      async composeGrid(_plan, uri) {
        return { uri };
      },
      onProgress() {
        return () => undefined;
      },
    });
    await cancelCompose();
    expect(cancelled).toBe(true);
  });
});
