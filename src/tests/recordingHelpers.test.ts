import { describe, expect, test } from 'vite-plus/test';
import { getLayoutById, LAYOUTS } from '../model/layouts.ts';
import type { Aspect, Project } from '../model/types.ts';
import {
  canRecord,
  canTransition,
  findNextSlotIndex,
  nextLayoutIdAfterTake,
  requiresHeadphones,
  resolveLayout,
  type RecordingPhase,
} from '../recording/recordingHelpers.ts';

function project(overrides: Partial<Project> = {}): Project {
  return {
    aspectRatio: '9:16',
    createdAt: 0,
    deletedAt: null,
    id: 'p1',
    layoutId: 'v-1',
    projectType: 'music',
    schemaVersion: 1,
    title: 'p',
    updatedAt: 0,
    ...overrides,
  };
}

describe('findNextSlotIndex', () => {
  test('returns 0 when no takes', () => {
    expect(findNextSlotIndex([], 4)).toBe(0);
  });

  test('returns first gap when there is one', () => {
    expect(findNextSlotIndex([{ slotIndex: 0 }, { slotIndex: 2 }], 4)).toBe(1);
  });

  test('returns slot after last when all slots are filled', () => {
    expect(findNextSlotIndex([{ slotIndex: 0 }, { slotIndex: 1 }], 2)).toBe(2);
  });

  test('returns takes.length when out-of-bounds takes exist', () => {
    // Defensive: if a take points to a slot beyond the current layout's
    // slotCount, fall back to takes.length.
    expect(findNextSlotIndex([{ slotIndex: 0 }, { slotIndex: 5 }], 2)).toBe(1);
  });
});

describe('requiresHeadphones / canRecord', () => {
  test('music with no takes does not require headphones', () => {
    expect(requiresHeadphones('music', 0)).toBe(false);
    expect(canRecord('music', 0, false)).toBe(true);
  });

  test('music with one take requires headphones', () => {
    expect(requiresHeadphones('music', 1)).toBe(true);
    expect(canRecord('music', 1, false)).toBe(false);
    expect(canRecord('music', 1, true)).toBe(true);
  });

  test('multi-cam never requires headphones', () => {
    expect(requiresHeadphones('multi-cam', 0)).toBe(false);
    expect(requiresHeadphones('multi-cam', 5)).toBe(false);
    expect(canRecord('multi-cam', 5, false)).toBe(true);
  });
});

describe('nextLayoutIdAfterTake', () => {
  test('does nothing when new count still fits', () => {
    const layout = getLayoutById('v-4')!;
    expect(nextLayoutIdAfterTake(layout, '9:16', 4)).toBeNull();
    expect(nextLayoutIdAfterTake(layout, '9:16', 3)).toBeNull();
  });

  test('promotes when exceeded', () => {
    const layout = getLayoutById('v-1')!; // 1 slot
    const next = nextLayoutIdAfterTake(layout, '9:16', 2);
    expect(next).not.toBeNull();
    const promoted = getLayoutById(next!);
    expect(promoted?.slotCount).toBe(2);
    expect(promoted?.aspect).toBe('9:16');
  });

  test('promotes through every slot count', () => {
    const aspects: ReadonlyArray<Aspect> = ['9:16', '1:1', '16:9'];
    for (const aspect of aspects) {
      let layout = LAYOUTS.find((l) => l.aspect === aspect && l.slotCount === 1)!;
      for (let n = 2; n <= 4; n++) {
        const id = nextLayoutIdAfterTake(layout, aspect, n);
        expect(id, `${aspect} n=${n}`).not.toBeNull();
        layout = getLayoutById(id!)!;
        expect(layout.slotCount).toBeGreaterThanOrEqual(n);
      }
    }
  });
});

describe('resolveLayout', () => {
  test('returns the layout for a valid id', () => {
    const layout = resolveLayout(project({ layoutId: 'v-2-stack' }), 2);
    expect(layout.id).toBe('v-2-stack');
  });

  test('falls back when layoutId is stale', () => {
    const layout = resolveLayout(project({ layoutId: 'does-not-exist' }), 3);
    expect(layout.slotCount).toBeGreaterThanOrEqual(3);
    expect(layout.aspect).toBe('9:16');
  });

  test('takeCount=0 still yields a 1-slot fallback', () => {
    const layout = resolveLayout(project({ layoutId: 'no' }), 0);
    expect(layout.slotCount).toBeGreaterThanOrEqual(1);
  });
});

describe('canTransition', () => {
  test('idle can begin', () => {
    expect(canTransition('idle', 'preflight')).toBe(true);
    expect(canTransition('idle', 'error')).toBe(true);
  });

  test('preflight can advance or abort', () => {
    expect(canTransition('preflight', 'countdown')).toBe(true);
    expect(canTransition('preflight', 'recording')).toBe(true);
    expect(canTransition('preflight', 'error')).toBe(true);
    expect(canTransition('preflight', 'idle')).toBe(true);
  });

  test('recording can save or error', () => {
    expect(canTransition('recording', 'saving')).toBe(true);
    expect(canTransition('recording', 'error')).toBe(true);
  });

  test('illegal transitions are blocked', () => {
    expect(canTransition('idle', 'recording')).toBe(false);
    expect(canTransition('idle', 'saving')).toBe(false);
    expect(canTransition('recording', 'preflight')).toBe(false);
  });

  test('every phase can transition to itself', () => {
    const phases: ReadonlyArray<RecordingPhase> = [
      'idle',
      'preflight',
      'countdown',
      'recording',
      'saving',
      'error',
    ];
    for (const p of phases) {
      expect(canTransition(p, p)).toBe(true);
    }
  });
});
