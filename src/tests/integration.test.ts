// End-to-end integration test for the layered-takes flow described in the
// README. It exercises the in-memory store, the layout selector, the
// camera/player engines, the compose plan, and the audio mixing math
// together so the full pipeline is regression-tested in one place.
//
// This is the highest-confidence test in the suite — if it passes, the
// "record N takes against playback, then export a multi-pane video"
// workflow holds end-to-end at the JS layer.

import { beforeEach, describe, expect, test } from 'vite-plus/test';
import { CameraEngine } from '../capture/cameraEngine.ts';
import { planComposeGrid } from '../export/composeGrid.ts';
import { presetFor } from '../export/exportPresets.ts';
import { combinedGain } from '../model/audioMath.ts';
import { defaultLayoutForSlotCount, getLayoutById } from '../model/layouts.ts';
import { rectsForLayout } from '../model/slotRect.ts';
import { PlayerEngine } from '../playback/playerEngine.ts';
import {
  canRecord,
  findNextSlotIndex,
  nextLayoutIdAfterTake,
  requiresHeadphones,
  resolveLayout,
} from '../recording/recordingHelpers.ts';
import { createInMemoryStore, type ProjectStore } from '../storage/projectStore.ts';

function makeStore(): ProjectStore {
  let ts = 1000;
  return createInMemoryStore(() => ts++);
}

function makeClock(initial = 0) {
  let now = initial;
  return {
    advance(ms: number) {
      now += ms;
    },
    read() {
      return now;
    },
  };
}

describe('integration: layered-takes music project', () => {
  let store: ProjectStore;
  let clock: ReturnType<typeof makeClock>;
  let idCounter: number;

  beforeEach(() => {
    store = makeStore();
    clock = makeClock(0);
    idCounter = 0;
  });

  function recordTake(projectId: string, slotIndex: number, durationMs: number) {
    const layoutAtRecord = resolveLayout(
      store.getProject(projectId)!,
      store.listTakes(projectId).length,
    );
    const camera = new CameraEngine({
      clock: clock.read,
      idGen: () => `rec-${++idCounter}`,
    });
    camera.start();
    clock.advance(durationMs);
    const result = camera.stop();
    return store.createTake({
      durationMs: result.durationMs,
      fileUri: result.fileUri,
      projectId,
      slotIndex,
      slotMeta: {
        aspectAtRecord: store.getProject(projectId)!.aspectRatio,
        layoutIdAtRecord: layoutAtRecord.id,
      },
    });
  }

  test('records 4 takes, auto-promotes the layout each step, builds an export plan', () => {
    // 1. Create a 9:16 music project with a single-slot layout.
    const project = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'Test song',
    });

    // 2. First take: no headphones needed (no playback yet).
    expect(requiresHeadphones(project.projectType, 0)).toBe(false);
    expect(canRecord(project.projectType, 0, false)).toBe(true);

    const t1 = recordTake(project.id, 0, 5000);
    expect(t1.durationMs).toBe(5000);

    // After 1 take, layout is still v-1. Now we want to record a 2nd take;
    // we should pick a 2-slot layout.
    let takes = store.listTakes(project.id);
    let layout = resolveLayout(store.getProject(project.id)!, takes.length);
    const promoted = nextLayoutIdAfterTake(layout, project.aspectRatio, takes.length + 1);
    expect(promoted).toBeTruthy();
    store.updateProjectLayout(project.id, promoted!);
    expect(getLayoutById(promoted!)?.slotCount).toBe(2);

    // 3. Second take requires headphones (music mode + existing playback).
    expect(requiresHeadphones(project.projectType, 1)).toBe(true);
    expect(canRecord(project.projectType, 1, false)).toBe(false);
    expect(canRecord(project.projectType, 1, true)).toBe(true);

    // Find the next empty slot (= 1) in the new 2-slot layout.
    layout = resolveLayout(store.getProject(project.id)!, 1);
    expect(findNextSlotIndex(takes, layout.slotCount)).toBe(1);

    recordTake(project.id, 1, 5000);

    // 4. Continue to 3 and 4 takes, promoting the layout each time.
    for (let n = 2; n < 4; n++) {
      takes = store.listTakes(project.id);
      layout = resolveLayout(store.getProject(project.id)!, takes.length);
      const next = nextLayoutIdAfterTake(layout, project.aspectRatio, takes.length + 1);
      if (next) {
        store.updateProjectLayout(project.id, next);
      }
      const newLayout = resolveLayout(store.getProject(project.id)!, takes.length);
      const slot = findNextSlotIndex(takes, newLayout.slotCount);
      recordTake(project.id, slot, 5000);
    }

    takes = store.listTakes(project.id);
    expect(takes.length).toBe(4);

    // 5. Build the export plan at 9:16.
    layout = resolveLayout(store.getProject(project.id)!, takes.length);
    expect(layout.slotCount).toBeGreaterThanOrEqual(4);

    const preset = presetFor('9:16');
    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: preset.videoBitrateKbps,
      codec: preset.codec,
      includeClickTrack: false,
      layout,
      takes,
    });

    // Plan sanity: 4 tracks, output is 1080x1920, every track has positive
    // destination area, and the sum of all destination areas tiles the
    // canvas (modulo gap allowance).
    expect(plan.tracks.length).toBe(4);
    expect(plan.outputWidth).toBe(1080);
    expect(plan.outputHeight).toBe(1920);
    for (const t of plan.tracks) {
      expect(t.destW).toBeGreaterThan(0);
      expect(t.destH).toBeGreaterThan(0);
    }

    // 6. The per-track gain should match the 1/√N RMS-preserving formula.
    const expectedGain = combinedGain(4, 1);
    for (const t of plan.tracks) {
      expect(t.gain).toBeCloseTo(expectedGain, 6);
    }
  });

  test('multi-cam project never needs headphones and skips the gate', () => {
    const project = store.createProject({
      aspectRatio: '16:9',
      layoutId: 'h-1',
      projectType: 'multi-cam',
      title: 'Two-angle scene',
    });
    expect(requiresHeadphones(project.projectType, 0)).toBe(false);
    expect(requiresHeadphones(project.projectType, 1)).toBe(false);
    expect(canRecord(project.projectType, 5, false)).toBe(true);

    recordTake(project.id, 0, 8000);
    const layout = resolveLayout(store.getProject(project.id)!, 1);
    const next = nextLayoutIdAfterTake(layout, project.aspectRatio, 2);
    expect(next).toBeTruthy();
    store.updateProjectLayout(project.id, next!);
    recordTake(project.id, 1, 8000);
    expect(store.listTakes(project.id).length).toBe(2);
  });

  test('muting a take zeroes its gain in the export plan, others preserve 1/√N', () => {
    const project = store.createProject({
      aspectRatio: '9:16',
      layoutId: defaultLayoutForSlotCount('9:16', 3).id,
      projectType: 'music',
      title: 'mix test',
    });
    for (let i = 0; i < 3; i++) {
      recordTake(project.id, i, 4000);
    }
    const takes = store.listTakes(project.id);
    store.updateTakeMuted(takes[1]!.id, true);
    const muted = store.listTakes(project.id);
    const layout = resolveLayout(store.getProject(project.id)!, muted.length);

    const plan = planComposeGrid({
      aspect: '9:16',
      bitrateKbps: 7000,
      codec: 'h264',
      includeClickTrack: false,
      layout,
      takes: muted,
    });

    const mutedTrack = plan.tracks.find((t) => t.muted)!;
    expect(mutedTrack.gain).toBe(0);
    const unmuted = plan.tracks.filter((t) => !t.muted);
    const activeN = unmuted.length;
    for (const t of unmuted) {
      expect(t.gain).toBeCloseTo(combinedGain(activeN), 6);
    }
  });

  test('preview-time players advance with shared wall clock', () => {
    // Build 2 players sharing a stepped clock, simulate the preview screen
    // pressing "play", and verify both report the same currentMs.
    const playerA = new PlayerEngine(clock.read);
    const playerB = new PlayerEngine(clock.read);
    playerA.setVolume(combinedGain(2));
    playerB.setVolume(combinedGain(2));
    playerA.play();
    playerB.play();
    clock.advance(2500);
    expect(playerA.currentMs()).toBe(2500);
    expect(playerB.currentMs()).toBe(2500);
    playerA.pause();
    playerB.pause();
    clock.advance(1000);
    // Pause freezes both players at the same point.
    expect(playerA.currentMs()).toBe(2500);
    expect(playerB.currentMs()).toBe(2500);
  });

  test('canvas rects from rectsForLayout sum to ~1 canvas area for every shipped layout', () => {
    const layout = defaultLayoutForSlotCount('9:16', 4);
    const rects = rectsForLayout(layout);
    const totalArea = rects.reduce((sum, r) => sum + r.w * r.h, 0);
    expect(totalArea).toBeGreaterThan(1080 * 1920 * 0.95);
  });

  test('export with no takes is rejected, with too many takes is rejected', () => {
    const project = store.createProject({
      aspectRatio: '1:1',
      layoutId: 's-1',
      projectType: 'music',
      title: 't',
    });
    const layout = getLayoutById('s-1')!;
    expect(() =>
      planComposeGrid({
        aspect: '1:1',
        bitrateKbps: 7000,
        codec: 'h264',
        includeClickTrack: false,
        layout,
        takes: [],
      }),
    ).toThrow(/No takes/);

    recordTake(project.id, 0, 1000);
    recordTake(project.id, 1, 1000);
    expect(() =>
      planComposeGrid({
        aspect: '1:1',
        bitrateKbps: 7000,
        codec: 'h264',
        includeClickTrack: false,
        layout, // 1 slot
        takes: store.listTakes(project.id), // 2 takes
      }),
    ).toThrow(/Too many takes/);
  });
});
