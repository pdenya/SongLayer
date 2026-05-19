import type { Aspect, Layout, LayoutSet } from './types.ts';

// Catalog of every named layout SongLayer ships. Slots are normalized [0,1]
// rectangles inside the canvas; the renderer multiplies by canvas dimensions.
// Every layout below must export cleanly to vertical, square, or horizontal —
// see WYSIWYG snapshot tests in src/tests/layouts.test.ts.
//
// Naming: `<aspect-suffix>-<slot count>-<variant>`.
//   v = 9:16 vertical, s = 1:1 square, h = 16:9 horizontal.

const SQUARE_ID = 'sq';

function full(id: string, aspect: Aspect, label: string): Layout {
  return {
    aspect,
    cornerRadius: 12,
    gap: 0,
    id,
    label,
    slotCount: 1,
    slots: [{ h: 1, id: `${id}-${SQUARE_ID}0`, w: 1, x: 0, y: 0 }],
  };
}

function twoHorizontalSplit(id: string, aspect: Aspect, label: string): Layout {
  // Two slots side by side.
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 2,
    slots: [
      { h: 1, id: `${id}-0`, w: 0.5, x: 0, y: 0 },
      { h: 1, id: `${id}-1`, w: 0.5, x: 0.5, y: 0 },
    ],
  };
}

function twoVerticalSplit(id: string, aspect: Aspect, label: string): Layout {
  // Two slots stacked top/bottom.
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 2,
    slots: [
      { h: 0.5, id: `${id}-0`, w: 1, x: 0, y: 0 },
      { h: 0.5, id: `${id}-1`, w: 1, x: 0, y: 0.5 },
    ],
  };
}

function threeTopOneBottomTwo(id: string, aspect: Aspect, label: string): Layout {
  // 1 wide top, 2 split bottom.
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 3,
    slots: [
      { h: 0.5, id: `${id}-0`, w: 1, x: 0, y: 0 },
      { h: 0.5, id: `${id}-1`, w: 0.5, x: 0, y: 0.5 },
      { h: 0.5, id: `${id}-2`, w: 0.5, x: 0.5, y: 0.5 },
    ],
  };
}

function threeRows(id: string, aspect: Aspect, label: string): Layout {
  // 3 stacked rows.
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 3,
    slots: [
      { h: 1 / 3, id: `${id}-0`, w: 1, x: 0, y: 0 },
      { h: 1 / 3, id: `${id}-1`, w: 1, x: 0, y: 1 / 3 },
      { h: 1 / 3, id: `${id}-2`, w: 1, x: 0, y: 2 / 3 },
    ],
  };
}

function twoByTwo(id: string, aspect: Aspect, label: string): Layout {
  // 2x2 grid.
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 4,
    slots: [
      { h: 0.5, id: `${id}-0`, w: 0.5, x: 0, y: 0 },
      { h: 0.5, id: `${id}-1`, w: 0.5, x: 0.5, y: 0 },
      { h: 0.5, id: `${id}-2`, w: 0.5, x: 0, y: 0.5 },
      { h: 0.5, id: `${id}-3`, w: 0.5, x: 0.5, y: 0.5 },
    ],
  };
}

function fiveBigPlusFour(id: string, aspect: Aspect, label: string): Layout {
  // 1 large top half, 4 small bottom row.
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 5,
    slots: [
      { h: 0.5, id: `${id}-0`, w: 1, x: 0, y: 0 },
      { h: 0.5, id: `${id}-1`, w: 0.25, x: 0, y: 0.5 },
      { h: 0.5, id: `${id}-2`, w: 0.25, x: 0.25, y: 0.5 },
      { h: 0.5, id: `${id}-3`, w: 0.25, x: 0.5, y: 0.5 },
      { h: 0.5, id: `${id}-4`, w: 0.25, x: 0.75, y: 0.5 },
    ],
  };
}

function sixGrid(id: string, aspect: Aspect, label: string): Layout {
  // 3x2 grid (3 columns, 2 rows).
  return {
    aspect,
    cornerRadius: 12,
    gap: 4,
    id,
    label,
    slotCount: 6,
    slots: [
      { h: 0.5, id: `${id}-0`, w: 1 / 3, x: 0, y: 0 },
      { h: 0.5, id: `${id}-1`, w: 1 / 3, x: 1 / 3, y: 0 },
      { h: 0.5, id: `${id}-2`, w: 1 / 3, x: 2 / 3, y: 0 },
      { h: 0.5, id: `${id}-3`, w: 1 / 3, x: 0, y: 0.5 },
      { h: 0.5, id: `${id}-4`, w: 1 / 3, x: 1 / 3, y: 0.5 },
      { h: 0.5, id: `${id}-5`, w: 1 / 3, x: 2 / 3, y: 0.5 },
    ],
  };
}

export const LAYOUTS: LayoutSet = [
  // Vertical 9:16
  full('v-1', '9:16', 'Full frame'),
  twoVerticalSplit('v-2-stack', '9:16', 'Top / Bottom'),
  twoHorizontalSplit('v-2-side', '9:16', 'Side by side'),
  threeTopOneBottomTwo('v-3-feature', '9:16', 'Lead + Pair'),
  threeRows('v-3-rows', '9:16', 'Three rows'),
  twoByTwo('v-4', '9:16', 'Quad'),
  fiveBigPlusFour('v-5', '9:16', 'Hero + Four'),
  sixGrid('v-6', '9:16', 'Six grid'),

  // Square 1:1
  full('s-1', '1:1', 'Full frame'),
  twoHorizontalSplit('s-2-side', '1:1', 'Side by side'),
  twoVerticalSplit('s-2-stack', '1:1', 'Top / Bottom'),
  threeTopOneBottomTwo('s-3-feature', '1:1', 'Lead + Pair'),
  twoByTwo('s-4', '1:1', 'Quad'),
  sixGrid('s-6', '1:1', 'Six grid'),

  // Horizontal 16:9
  full('h-1', '16:9', 'Full frame'),
  twoHorizontalSplit('h-2-side', '16:9', 'Side by side'),
  twoVerticalSplit('h-2-stack', '16:9', 'Top / Bottom'),
  threeTopOneBottomTwo('h-3-feature', '16:9', 'Lead + Pair'),
  twoByTwo('h-4', '16:9', 'Quad'),
  sixGrid('h-6', '16:9', 'Six grid'),
];

export function getLayoutById(id: string): Layout | undefined {
  return LAYOUTS.find((l) => l.id === id);
}

export function layoutsForAspect(aspect: Aspect): LayoutSet {
  return LAYOUTS.filter((l) => l.aspect === aspect);
}

export function layoutsForSlotCount(aspect: Aspect, slotCount: number): LayoutSet {
  return LAYOUTS.filter((l) => l.aspect === aspect && l.slotCount === slotCount);
}

// First-fit default layout when a project moves from N to N+1 takes.
export function defaultLayoutForSlotCount(aspect: Aspect, slotCount: number): Layout {
  const candidates = layoutsForSlotCount(aspect, slotCount);
  if (candidates.length > 0) {
    return candidates[0]!;
  }
  // Fallback: pick the smallest layout >= slotCount in this aspect.
  const fallback = layoutsForAspect(aspect)
    .filter((l) => l.slotCount >= slotCount)
    .sort((a, b) => a.slotCount - b.slotCount)[0];
  if (fallback) {
    return fallback;
  }
  // Otherwise the largest in this aspect.
  return [...layoutsForAspect(aspect)].sort((a, b) => b.slotCount - a.slotCount)[0]!;
}

export const MAX_SLOTS = 6;
