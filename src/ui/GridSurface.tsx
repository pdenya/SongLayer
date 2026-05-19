import { useMemo } from 'react';
import { View } from 'react-native';
import { ASPECT_DIMENSIONS } from '../model/slotRect.ts';
import type { Aspect, Layout, Slot } from '../model/types.ts';
import colors from './colors.ts';

type Props = Readonly<{
  canvasWidth: number;
  emptySlotIndex?: number | null;
  layout: Layout;
  renderSlot: (args: { index: number; rect: ScreenRect; slot: Slot }) => React.ReactNode;
}>;

type ScreenRect = Readonly<{ h: number; w: number; x: number; y: number }>;

// Renderer shared by capture preview, playback preview, and the export
// dry-run. The same `Layout` JSON drives every consumer — see Phase 3 of
// the implementation plan.
export default function GridSurface({ canvasWidth, emptySlotIndex, layout, renderSlot }: Props) {
  const aspect = ASPECT_DIMENSIONS[layout.aspect as Aspect];
  const canvasHeight = (canvasWidth * aspect.height) / aspect.width;

  const rects = useMemo(() => {
    const gapPx = ((layout.gap ?? 0) / 1080) * canvasWidth;
    return layout.slots.map((s) => {
      const half = gapPx / 2;
      const xRaw = s.x * canvasWidth;
      const yRaw = s.y * canvasHeight;
      const wRaw = s.w * canvasWidth;
      const hRaw = s.h * canvasHeight;
      return {
        h: Math.max(0, hRaw - (s.y > 0 ? half : 0) - (s.y + s.h < 1 ? half : 0)),
        w: Math.max(0, wRaw - (s.x > 0 ? half : 0) - (s.x + s.w < 1 ? half : 0)),
        x: xRaw + (s.x > 0 ? half : 0),
        y: yRaw + (s.y > 0 ? half : 0),
      } satisfies ScreenRect;
    });
  }, [layout, canvasWidth, canvasHeight]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: canvasHeight,
        overflow: 'hidden',
        position: 'relative',
        width: canvasWidth,
      }}
    >
      {layout.slots.map((slot, index) => {
        const rect = rects[index]!;
        const isEmpty = emptySlotIndex === index;
        return (
          <View
            accessibilityRole="image"
            key={slot.id}
            style={{
              backgroundColor: isEmpty ? colors.accent : colors.slotBg,
              borderRadius: layout.cornerRadius ?? 0,
              height: rect.h,
              left: rect.x,
              overflow: 'hidden',
              position: 'absolute',
              top: rect.y,
              width: rect.w,
            }}
          >
            {renderSlot({ index, rect, slot })}
          </View>
        );
      })}
    </View>
  );
}

export type { ScreenRect };
