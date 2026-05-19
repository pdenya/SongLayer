import Stack, { VStack } from '@nkzw/stack';
import { Stack as ExpoStack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CameraView, { type CameraHandle } from '../../../../capture/CameraView.tsx';
import { defaultLayoutForSlotCount, getLayoutById } from '../../../../model/layouts.ts';
import TakePlayer, { type TakePlayerHandle } from '../../../../playback/TakePlayer.tsx';
import {
  default as useRecordSession,
  RecordSessionProvider,
} from '../../../../recording/RecordSessionContext.tsx';
import { getStore } from '../../../../storage/store.ts';
import colors from '../../../../ui/colors.ts';
import GridSurface from '../../../../ui/GridSurface.tsx';

function RecordingInner() {
  const router = useRouter();
  const {
    activeSlotIndex,
    armForRecord,
    beginRecording,
    canRecord,
    completeRecording,
    error,
    headphones,
    isMusicMode,
    layout,
    phase,
    project,
    requiresHeadphones,
    takes,
  } = useRecordSession();

  const cameraRef = useRef<CameraHandle>(null);
  const playerRefs = useRef<Map<string, TakePlayerHandle | null>>(new Map());
  const [countdownText, setCountdownText] = useState<string | null>(null);

  const nextSlotIndex = useMemo(() => {
    const used = new Set(takes.map((t) => t.slotIndex));
    for (let i = 0; i < layout.slotCount; i++) {
      if (!used.has(i)) {
        return i;
      }
    }
    return takes.length;
  }, [takes, layout.slotCount]);

  const startCountdown = useCallback(async () => {
    if (!isMusicMode) {
      // Multi-cam mode: no count-in.
      return;
    }
    for (const t of ['3', '2', '1', 'Go']) {
      setCountdownText(t);
      await new Promise((r) => setTimeout(r, 600));
    }
    setCountdownText(null);
  }, [isMusicMode]);

  const onRecord = useCallback(async () => {
    const ok = await beginRecording(nextSlotIndex);
    if (!ok) {
      return;
    }
    if (isMusicMode) {
      await startCountdown();
    }
    armForRecord();
    const start = await cameraRef.current?.start();
    // Pre-warmed players begin playback in the same tick:
    playerRefs.current.forEach((p) => {
      void p?.play();
    });
    if (!start) {
      return;
    }
  }, [armForRecord, beginRecording, isMusicMode, nextSlotIndex, startCountdown]);

  const onStop = useCallback(async () => {
    playerRefs.current.forEach((p) => {
      void p?.pause();
    });
    const result = await cameraRef.current?.stop();
    if (!result) {
      return;
    }
    completeRecording({
      durationMs: result.durationMs,
      fileUri: result.fileUri,
      slotIndex: activeSlotIndex ?? nextSlotIndex,
    });
    router.back();
  }, [activeSlotIndex, completeRecording, nextSlotIndex, router]);

  const screenWidth = Dimensions.get('window').width;
  const canvasWidth = Math.min(screenWidth - 32, 380);

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ExpoStack.Screen
        options={{
          title:
            project.projectType === 'music'
              ? `Take ${takes.length + 1}`
              : `Angle ${takes.length + 1}`,
        }}
      />
      <VStack flex1 gap={16} padding={16}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        {requiresHeadphones && !headphones.connected ? (
          <Stack padding={12} style={{ backgroundColor: colors.muted, borderRadius: 10 }}>
            <Text style={{ color: colors.text }}>
              <fbt desc="Headphone gate message">
                Plug in headphones to record over your previous takes. Wired or USB-C/Lightning is
                best — Bluetooth adds 100–250&nbsp;ms of latency.
              </fbt>
            </Text>
          </Stack>
        ) : null}

        <Stack alignCenter>
          <GridSurface
            canvasWidth={canvasWidth}
            emptySlotIndex={nextSlotIndex}
            layout={layout}
            renderSlot={({ index, slot }) => {
              const take = takes.find((t) => t.slotIndex === index);
              if (take) {
                return (
                  <TakePlayer
                    fileUri={take.fileUri}
                    label={`Take ${index + 1}`}
                    muted={take.mutedInExport}
                    ref={(handle) => {
                      playerRefs.current.set(take.id, handle);
                    }}
                  />
                );
              }
              if (index === nextSlotIndex) {
                return <CameraView active={phase === 'recording'} ref={cameraRef} />;
              }
              return (
                <Stack alignCenter center flex1>
                  <Text style={{ color: colors.mutedText, fontSize: 10 }}>{slot.id}</Text>
                </Stack>
              );
            }}
          />
        </Stack>

        {countdownText ? (
          <Stack alignCenter>
            <Text style={{ color: colors.accent, fontSize: 48, fontWeight: '700' }}>
              {countdownText}
            </Text>
          </Stack>
        ) : null}

        <Stack alignCenter gap={12} style={{ marginTop: 8 }}>
          {phase === 'idle' || phase === 'error' ? (
            <Pressable
              accessibilityLabel="Start recording"
              disabled={!canRecord}
              onPress={onRecord}
              style={{
                backgroundColor: canRecord ? colors.recordButton : colors.muted,
                borderRadius: 999,
                height: 72,
                width: 72,
              }}
            />
          ) : null}
          {phase === 'preflight' || phase === 'countdown' ? (
            <Text style={{ color: colors.text }}>
              <fbt desc="Preflight message">Get ready…</fbt>
            </Text>
          ) : null}
          {phase === 'recording' ? (
            <Pressable
              accessibilityLabel="Stop recording"
              onPress={onStop}
              style={{
                alignItems: 'center',
                backgroundColor: colors.recordButton,
                borderRadius: 12,
                height: 72,
                justifyContent: 'center',
                width: 72,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 24 }}>■</Text>
            </Pressable>
          ) : null}
        </Stack>
      </VStack>
    </SafeAreaView>
  );
}

export default function RecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = getStore();
  const project = store.getProject(id ?? '');

  if (!project) {
    return (
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
        <VStack alignCenter center flex1 padding={20}>
          <Text style={{ color: colors.text }}>
            <fbt desc="Missing project message">Project not found.</fbt>
          </Text>
        </VStack>
      </SafeAreaView>
    );
  }

  // Ensure project has a valid layout id we can render — if not, persist a
  // sensible default for the take count.
  if (!getLayoutById(project.layoutId)) {
    const takeCount = store.listTakes(project.id).length;
    const fallback = defaultLayoutForSlotCount(project.aspectRatio, Math.max(takeCount, 1));
    store.updateProjectLayout(project.id, fallback.id);
  }

  return (
    <RecordSessionProvider project={project}>
      <RecordingInner />
    </RecordSessionProvider>
  );
}
