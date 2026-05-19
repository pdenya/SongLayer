// Pure helpers extracted from `RecordSessionContext`. Keeping the
// derivations here lets us test the recording state machine without
// rendering a React component.

import { defaultLayoutForSlotCount, getLayoutById } from '../model/layouts.ts';
import type { Aspect, Layout, Project, ProjectType, Take } from '../model/types.ts';

// Find the first un-filled slot index in the current layout. If every slot
// is filled, return `takes.length` so the caller knows "we need a bigger
// layout".
export function findNextSlotIndex(
  takes: ReadonlyArray<Pick<Take, 'slotIndex'>>,
  slotCount: number,
): number {
  const used = new Set(takes.map((t) => t.slotIndex));
  for (let i = 0; i < slotCount; i++) {
    if (!used.has(i)) {
      return i;
    }
  }
  return takes.length;
}

export function requiresHeadphones(projectType: ProjectType, takeCount: number): boolean {
  return projectType === 'music' && takeCount > 0;
}

export function canRecord(
  projectType: ProjectType,
  takeCount: number,
  headphonesConnected: boolean,
): boolean {
  return !requiresHeadphones(projectType, takeCount) || headphonesConnected;
}

// Should the project promote to a larger layout because the new take would
// not fit? Returns the next layout id (or null if no change).
export function nextLayoutIdAfterTake(
  currentLayout: Layout,
  projectAspect: Aspect,
  newTakeCount: number,
): string | null {
  if (newTakeCount <= currentLayout.slotCount) {
    return null;
  }
  return defaultLayoutForSlotCount(projectAspect, newTakeCount).id;
}

// The "active" layout for a project, falling back if the persisted id is
// stale (eg. catalog removed an entry). The fallback grows with the
// current take count so the project keeps rendering.
export function resolveLayout(project: Project, takeCount: number): Layout {
  return (
    getLayoutById(project.layoutId) ??
    defaultLayoutForSlotCount(project.aspectRatio, Math.max(takeCount, 1))
  );
}

export type RecordingPhase = 'idle' | 'preflight' | 'countdown' | 'recording' | 'saving' | 'error';

// Valid transitions for the session state machine. Used by both the
// implementation and the tests so an accidental regression in either
// direction shows up immediately.
const TRANSITIONS: Readonly<Record<RecordingPhase, ReadonlyArray<RecordingPhase>>> = {
  countdown: ['recording', 'idle', 'error'],
  error: ['idle', 'preflight'],
  idle: ['preflight', 'error'],
  preflight: ['countdown', 'recording', 'error', 'idle'],
  recording: ['saving', 'error', 'idle'],
  saving: ['idle', 'error'],
};

export function canTransition(from: RecordingPhase, to: RecordingPhase): boolean {
  if (from === to) {
    return true;
  }
  return TRANSITIONS[from].includes(to);
}
