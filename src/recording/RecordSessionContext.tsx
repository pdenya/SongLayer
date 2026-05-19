import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { activate as activateAudioSession } from '../capture/audioSession.ts';
import { useHeadphoneState } from '../capture/headphoneState.ts';
import type { Project, Take } from '../model/types.ts';
import { getStore } from '../storage/store.ts';
import {
  canRecord as deriveCanRecord,
  nextLayoutIdAfterTake,
  requiresHeadphones as deriveRequiresHeadphones,
  resolveLayout,
  type RecordingPhase,
} from './recordingHelpers.ts';

export type { RecordingPhase };

type RecordSession = ReturnType<typeof useRecordSessionState>;

const RecordSessionReactContext = createContext<RecordSession | null>(null);

function useRecordSessionState(project: Project) {
  const store = getStore();
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [takes, setTakes] = useState<ReadonlyArray<Take>>(() => store.listTakes(project.id));
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headphones = useHeadphoneState();

  const layout = useMemo(() => resolveLayout(project, takes.length), [project, takes.length]);

  const refresh = useCallback(() => {
    setTakes(store.listTakes(project.id));
  }, [project.id, store]);

  const isMusicMode = project.projectType === 'music';
  const requiresHeadphones = deriveRequiresHeadphones(project.projectType, takes.length);
  const canRecord = deriveCanRecord(project.projectType, takes.length, headphones.connected);

  const beginRecording = useCallback(
    async (slotIndex: number) => {
      setError(null);
      if (requiresHeadphones && !headphones.connected) {
        setError('Headphones required to record over existing takes.');
        setPhase('error');
        return false;
      }
      setActiveSlotIndex(slotIndex);
      setPhase('preflight');
      await activateAudioSession('record');
      setPhase(isMusicMode ? 'countdown' : 'recording');
      return true;
    },
    [headphones.connected, isMusicMode, requiresHeadphones],
  );

  const armForRecord = useCallback(() => {
    setPhase('recording');
  }, []);

  const completeRecording = useCallback(
    (args: { durationMs: number; fileUri: string; slotIndex: number }) => {
      const take = store.createTake({
        durationMs: args.durationMs,
        fileUri: args.fileUri,
        projectId: project.id,
        slotIndex: args.slotIndex,
        slotMeta: { aspectAtRecord: project.aspectRatio, layoutIdAtRecord: layout.id },
      });
      const newCount = takes.length + 1;
      const promoted = nextLayoutIdAfterTake(layout, project.aspectRatio, newCount);
      if (promoted) {
        store.updateProjectLayout(project.id, promoted);
      }
      setPhase('idle');
      setActiveSlotIndex(null);
      refresh();
      return take;
    },
    [project, layout, store, takes.length, refresh],
  );

  const cancelRecording = useCallback(() => {
    setPhase('idle');
    setActiveSlotIndex(null);
    setError(null);
  }, []);

  const retakeSlot = useCallback(
    async (slotIndex: number) => {
      const existing = takes.find((t) => t.slotIndex === slotIndex);
      if (existing) {
        store.deleteTake(existing.id);
        refresh();
      }
      return beginRecording(slotIndex);
    },
    [takes, store, refresh, beginRecording],
  );

  const setMuted = useCallback(
    (takeId: string, muted: boolean) => {
      store.updateTakeMuted(takeId, muted);
      refresh();
    },
    [store, refresh],
  );

  const setGain = useCallback(
    (takeId: string, gain: number) => {
      store.updateTakeGain(takeId, gain);
      refresh();
    },
    [store, refresh],
  );

  return {
    activeSlotIndex,
    armForRecord,
    beginRecording,
    cancelRecording,
    canRecord,
    completeRecording,
    error,
    headphones,
    isMusicMode,
    layout,
    phase,
    project,
    refresh,
    requiresHeadphones,
    retakeSlot,
    setGain,
    setMuted,
    takes,
  };
}

export function RecordSessionProvider({
  children,
  project,
}: {
  children: React.ReactNode;
  project: Project;
}) {
  const session = useRecordSessionState(project);
  return <RecordSessionReactContext value={session}>{children}</RecordSessionReactContext>;
}

export default function useRecordSession(): RecordSession {
  const ctx = useContext(RecordSessionReactContext);
  if (!ctx) {
    throw new Error('useRecordSession must be used inside a <RecordSessionProvider />');
  }
  return ctx;
}
