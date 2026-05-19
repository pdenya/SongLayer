import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { activate as activateAudioSession } from '../capture/audioSession.ts';
import { useHeadphoneState } from '../capture/headphoneState.ts';
import { defaultLayoutForSlotCount, getLayoutById } from '../model/layouts.ts';
import type { Project, Take } from '../model/types.ts';
import { getStore } from '../storage/store.ts';

export type RecordingPhase = 'idle' | 'preflight' | 'countdown' | 'recording' | 'saving' | 'error';

type RecordSession = ReturnType<typeof useRecordSessionState>;

const RecordSessionReactContext = createContext<RecordSession | null>(null);

function useRecordSessionState(project: Project) {
  const store = getStore();
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [takes, setTakes] = useState<ReadonlyArray<Take>>(() => store.listTakes(project.id));
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headphones = useHeadphoneState();

  const layout = useMemo(() => {
    return (
      getLayoutById(project.layoutId) ??
      defaultLayoutForSlotCount(project.aspectRatio, takes.length + 1)
    );
  }, [project.layoutId, project.aspectRatio, takes.length]);

  const refresh = useCallback(() => {
    setTakes(store.listTakes(project.id));
  }, [project.id, store]);

  const isMusicMode = project.projectType === 'music';
  const requiresHeadphones = isMusicMode && takes.length > 0;
  const canRecord = !requiresHeadphones || headphones.connected;

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
      if (newCount > layout.slotCount) {
        const next = defaultLayoutForSlotCount(project.aspectRatio, newCount);
        store.updateProjectLayout(project.id, next.id);
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
