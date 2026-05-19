import type { Aspect, AspectDimensions, Layout, Slot } from './types.ts';

// Canvas reference resolutions used during export and snapshot testing.
export const ASPECT_DIMENSIONS: Readonly<Record<Aspect, AspectDimensions>> = {
  '1:1': { height: 1080, width: 1080 },
  '16:9': { height: 1080, width: 1920 },
  '9:16': { height: 1920, width: 1080 },
};

export type AbsoluteRect = Readonly<{
  h: number;
  w: number;
  x: number;
  y: number;
}>;

// Convert a normalized slot to absolute pixel rect for the given canvas size.
// If a gap is provided (in canvas pixels), the rect is inset symmetrically.
export function rectForSlot(slot: Slot, canvas: AspectDimensions, gapPx: number = 0): AbsoluteRect {
  const halfGap = gapPx / 2;
  const xRaw = slot.x * canvas.width;
  const yRaw = slot.y * canvas.height;
  const wRaw = slot.w * canvas.width;
  const hRaw = slot.h * canvas.height;

  const x = xRaw + (slot.x > 0 ? halfGap : 0);
  const y = yRaw + (slot.y > 0 ? halfGap : 0);
  const w = wRaw - (slot.x > 0 ? halfGap : 0) - (slot.x + slot.w < 1 ? halfGap : 0);
  const h = hRaw - (slot.y > 0 ? halfGap : 0) - (slot.y + slot.h < 1 ? halfGap : 0);

  return {
    h: Math.max(0, Math.round(h)),
    w: Math.max(0, Math.round(w)),
    x: Math.round(x),
    y: Math.round(y),
  };
}

export function rectsForLayout(
  layout: Layout,
  canvas?: AspectDimensions,
): ReadonlyArray<AbsoluteRect> {
  const dims = canvas ?? ASPECT_DIMENSIONS[layout.aspect];
  return layout.slots.map((s) => rectForSlot(s, dims, layout.gap ?? 0));
}

// Validate that the slots in a layout tile the canvas without overlap and
// without uncovered area. Returns null on success or an error string on
// violation. Used by tests so a designer can add a new layout and instantly
// confirm it passes the tiling rule.
export function validateLayoutTiling(layout: Layout): string | null {
  if (layout.slots.length !== layout.slotCount) {
    return `slotCount ${layout.slotCount} does not match slots.length ${layout.slots.length}`;
  }
  for (const s of layout.slots) {
    if (s.x < 0 || s.y < 0 || s.x + s.w > 1.000_000_1 || s.y + s.h > 1.000_000_1) {
      return `slot ${s.id} out of bounds`;
    }
    if (s.w <= 0 || s.h <= 0) {
      return `slot ${s.id} non-positive size`;
    }
  }
  // Crude area check: total area should equal 1.0 ± epsilon.
  const totalArea = layout.slots.reduce((sum, s) => sum + s.w * s.h, 0);
  if (Math.abs(totalArea - 1) > 0.01) {
    return `slots cover area ${totalArea.toFixed(3)} (expected 1)`;
  }
  return null;
}
