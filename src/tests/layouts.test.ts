import { describe, expect, test } from 'vite-plus/test';
import {
  defaultLayoutForSlotCount,
  getLayoutById,
  layoutsForAspect,
  layoutsForSlotCount,
  LAYOUTS,
  MAX_SLOTS,
} from '../model/layouts.ts';
import { rectsForLayout, validateLayoutTiling } from '../model/slotRect.ts';
import type { Aspect } from '../model/types.ts';

const ASPECTS: ReadonlyArray<Aspect> = ['9:16', '1:1', '16:9'];

describe('layout catalog', () => {
  test('every layout passes the tiling validator', () => {
    for (const layout of LAYOUTS) {
      const err = validateLayoutTiling(layout);
      expect(err, `${layout.id}: ${err}`).toBeNull();
    }
  });

  test('every aspect has at least one layout for slot counts 1..4', () => {
    for (const aspect of ASPECTS) {
      for (let n = 1; n <= 4; n++) {
        const choices = layoutsForSlotCount(aspect, n);
        expect(choices.length, `${aspect} n=${n}`).toBeGreaterThan(0);
      }
    }
  });

  test('vertical aspect has up to 6 slots covered', () => {
    expect(layoutsForSlotCount('9:16', 6).length).toBeGreaterThan(0);
  });

  test('defaultLayoutForSlotCount returns the correct slot count when available', () => {
    for (const aspect of ASPECTS) {
      for (let n = 1; n <= 4; n++) {
        const layout = defaultLayoutForSlotCount(aspect, n);
        expect(layout.slotCount).toBe(n);
        expect(layout.aspect).toBe(aspect);
      }
    }
  });

  test('rects sum to ~ canvas area for each layout (within gap allowance)', () => {
    for (const layout of LAYOUTS) {
      const rects = rectsForLayout(layout);
      // Compute total covered area as a fraction of canvas.
      const totalArea = rects.reduce((sum, r) => sum + r.w * r.h, 0);
      // Allow some headroom for gap insets.
      const canvasArea =
        layout.aspect === '9:16'
          ? 1080 * 1920
          : layout.aspect === '1:1'
            ? 1080 * 1080
            : 1920 * 1080;
      expect(totalArea).toBeGreaterThan(canvasArea * 0.92);
      expect(totalArea).toBeLessThanOrEqual(canvasArea * 1.01);
    }
  });

  test('getLayoutById is the inverse of LAYOUTS membership', () => {
    for (const layout of LAYOUTS) {
      expect(getLayoutById(layout.id)).toBe(layout);
    }
    expect(getLayoutById('does-not-exist')).toBeUndefined();
  });

  test('MAX_SLOTS is honored by the catalog', () => {
    for (const layout of LAYOUTS) {
      expect(layout.slotCount).toBeLessThanOrEqual(MAX_SLOTS);
    }
  });

  test('every aspect has at least one layout', () => {
    for (const aspect of ASPECTS) {
      expect(layoutsForAspect(aspect).length).toBeGreaterThan(0);
    }
  });
});
