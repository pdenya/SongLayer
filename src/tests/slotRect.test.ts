import { describe, expect, test } from 'vite-plus/test';
import { defaultLayoutForSlotCount, LAYOUTS } from '../model/layouts.ts';
import {
  ASPECT_DIMENSIONS,
  rectForSlot,
  rectsForLayout,
  validateLayoutTiling,
} from '../model/slotRect.ts';

describe('rectForSlot', () => {
  test('full-bleed slot returns the full canvas', () => {
    const rect = rectForSlot({ h: 1, id: 'a', w: 1, x: 0, y: 0 }, { height: 1920, width: 1080 });
    expect(rect).toEqual({ h: 1920, w: 1080, x: 0, y: 0 });
  });

  test('half-width left slot at origin', () => {
    const rect = rectForSlot({ h: 1, id: 'a', w: 0.5, x: 0, y: 0 }, { height: 1080, width: 1080 });
    expect(rect).toEqual({ h: 1080, w: 540, x: 0, y: 0 });
  });

  test('half-width right slot starts at midpoint', () => {
    const rect = rectForSlot(
      { h: 1, id: 'a', w: 0.5, x: 0.5, y: 0 },
      { height: 1080, width: 1080 },
    );
    expect(rect).toEqual({ h: 1080, w: 540, x: 540, y: 0 });
  });

  test('gap inset is applied only on interior edges', () => {
    // Two side-by-side slots with a 20px gap.
    const left = rectForSlot(
      { h: 1, id: 'l', w: 0.5, x: 0, y: 0 },
      { height: 1080, width: 1080 },
      20,
    );
    const right = rectForSlot(
      { h: 1, id: 'r', w: 0.5, x: 0.5, y: 0 },
      { height: 1080, width: 1080 },
      20,
    );
    // The outer edges (x=0 for left, x=540+ for right) should not be inset.
    expect(left.x).toBe(0);
    expect(right.x + right.w).toBe(1080);
    // The interior edges should each give up half the gap.
    expect(left.w).toBe(530);
    expect(right.x).toBe(550);
  });

  test('rect is integer-rounded', () => {
    const rect = rectForSlot(
      { h: 1 / 3, id: 'a', w: 1, x: 0, y: 0 },
      { height: 1080, width: 1080 },
    );
    expect(Number.isInteger(rect.h)).toBe(true);
    expect(Number.isInteger(rect.w)).toBe(true);
    expect(Number.isInteger(rect.x)).toBe(true);
    expect(Number.isInteger(rect.y)).toBe(true);
  });
});

describe('rectsForLayout', () => {
  test('uses ASPECT_DIMENSIONS when no canvas provided', () => {
    const layout = defaultLayoutForSlotCount('9:16', 1);
    const rects = rectsForLayout(layout);
    expect(rects[0]!.w).toBe(ASPECT_DIMENSIONS['9:16'].width);
    expect(rects[0]!.h).toBe(ASPECT_DIMENSIONS['9:16'].height);
  });

  test('every layout in the catalog yields slotCount rects', () => {
    for (const layout of LAYOUTS) {
      const rects = rectsForLayout(layout);
      expect(rects.length, `${layout.id}`).toBe(layout.slotCount);
    }
  });

  test('rects never overlap when gap is zero', () => {
    for (const layout of LAYOUTS) {
      const rects = rectsForLayout(layout, ASPECT_DIMENSIONS[layout.aspect]);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!;
          const b = rects[j]!;
          // No overlap: separating axis on x or y.
          const apart =
            a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart, `${layout.id} slots ${i} and ${j} overlap`).toBe(true);
        }
      }
    }
  });
});

describe('validateLayoutTiling', () => {
  test('passes for every shipped layout', () => {
    for (const l of LAYOUTS) {
      expect(validateLayoutTiling(l)).toBeNull();
    }
  });

  test('fails when slotCount disagrees with slots.length', () => {
    const err = validateLayoutTiling({
      aspect: '9:16',
      id: 'bad',
      label: 'bad',
      slotCount: 2,
      slots: [{ h: 1, id: 'x', w: 1, x: 0, y: 0 }],
    });
    expect(err).toBeTruthy();
  });

  test('fails on out-of-bounds slot', () => {
    const err = validateLayoutTiling({
      aspect: '9:16',
      id: 'bad',
      label: 'bad',
      slotCount: 1,
      slots: [{ h: 1, id: 'x', w: 1.1, x: 0, y: 0 }],
    });
    expect(err).toMatch(/out of bounds/);
  });

  test('fails when total area is not ~1', () => {
    const err = validateLayoutTiling({
      aspect: '9:16',
      id: 'bad',
      label: 'bad',
      slotCount: 1,
      slots: [{ h: 0.5, id: 'x', w: 0.5, x: 0, y: 0 }],
    });
    expect(err).toMatch(/cover area/);
  });

  test('fails on non-positive size', () => {
    const err = validateLayoutTiling({
      aspect: '9:16',
      id: 'bad',
      label: 'bad',
      slotCount: 1,
      slots: [{ h: 0, id: 'x', w: 1, x: 0, y: 0 }],
    });
    expect(err).toMatch(/non-positive/);
  });
});
