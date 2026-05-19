import Stack, { VStack } from '@nkzw/stack';
import { Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { combinedGain } from '../../../../model/audioMath.ts';
import { defaultLayoutForSlotCount, getLayoutById } from '../../../../model/layouts.ts';
import TakePlayer, { type TakePlayerHandle } from '../../../../playback/TakePlayer.tsx';
import { getStore } from '../../../../storage/store.ts';
import colors from '../../../../ui/colors.ts';
import GridSurface from '../../../../ui/GridSurface.tsx';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = getStore();
  const playerRefs = useRef<Map<string, TakePlayerHandle | null>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);

  const project = useMemo(() => store.getProject(id ?? ''), [store, id]);
  const [takes, setTakes] = useState(() => (project ? store.listTakes(project.id) : []));
  const layout = useMemo(() => {
    if (!project) {
      return null;
    }
    return (
      getLayoutById(project.layoutId) ??
      defaultLayoutForSlotCount(project.aspectRatio, Math.max(takes.length, 1))
    );
  }, [project, takes.length]);

  const activeCount = takes.filter((t) => !t.mutedInExport).length;

  const onPlayPause = useCallback(async () => {
    if (isPlaying) {
      await Promise.all(
        [...playerRefs.current.values()].map((p) => (p ? p.pause() : Promise.resolve())),
      );
      setIsPlaying(false);
    } else {
      // Apply 1/sqrt(N) attenuation before play.
      for (const take of takes) {
        const handle = playerRefs.current.get(take.id);
        if (handle) {
          await handle.setVolume(take.mutedInExport ? 0 : combinedGain(activeCount, take.gain));
          await handle.seek(0);
        }
      }
      await Promise.all(
        [...playerRefs.current.values()].map((p) => (p ? p.play() : Promise.resolve())),
      );
      setIsPlaying(true);
    }
  }, [activeCount, isPlaying, takes]);

  const toggleMute = useCallback(
    (takeId: string, current: boolean) => {
      store.updateTakeMuted(takeId, !current);
      if (project) {
        setTakes(store.listTakes(project.id));
      }
    },
    [store, project],
  );

  if (!project || !layout) {
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

  const screenWidth = Dimensions.get('window').width;
  const canvasWidth = Math.min(screenWidth - 32, 380);

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ExpoStack.Screen options={{ title: `Preview · ${project.title}` }} />
      <VStack flex1 gap={16} padding={16}>
        <Stack alignCenter>
          <GridSurface
            canvasWidth={canvasWidth}
            layout={layout}
            renderSlot={({ index }) => {
              const take = takes.find((t) => t.slotIndex === index);
              if (!take) {
                return (
                  <Stack alignCenter center flex1>
                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>Empty</Text>
                  </Stack>
                );
              }
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
            }}
          />
        </Stack>

        <Stack alignCenter>
          <Pressable
            accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
            onPress={onPlayPause}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 999,
              height: 56,
              paddingHorizontal: 24,
            }}
          >
            <Stack alignCenter center flex1>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {isPlaying ? 'Pause' : 'Play mix'}
              </Text>
            </Stack>
          </Pressable>
        </Stack>

        <Stack gap={8}>
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
            <fbt desc="Tracks section header">Tracks</fbt>
          </Text>
          {takes.map((take, i) => (
            <Pressable
              accessibilityLabel={`Toggle mute for take ${i + 1}`}
              key={take.id}
              onPress={() => toggleMute(take.id, take.mutedInExport)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Stack alignCenter between>
                <Text style={{ color: colors.text }}>
                  <fbt desc="Take label with number">
                    Take <fbt:param name="num">{i + 1}</fbt:param>
                  </fbt>
                </Text>
                <Text style={{ color: take.mutedInExport ? colors.danger : colors.success }}>
                  {take.mutedInExport ? 'Muted' : 'On'}
                </Text>
              </Stack>
              <Text style={{ color: colors.mutedText, fontSize: 11, marginTop: 4 }}>
                gain {take.gain.toFixed(2)} · effective{' '}
                {take.mutedInExport ? '0.00' : combinedGain(activeCount, take.gain).toFixed(2)}
              </Text>
            </Pressable>
          ))}
        </Stack>
        <View style={{ flex: 1 }} />
        <Text style={{ color: colors.mutedText, fontSize: 11 }}>
          <fbt desc="Preview attenuation note">
            Each take is attenuated by 1/√N to keep the summed mix near constant RMS.
          </fbt>
        </Text>
      </VStack>
    </SafeAreaView>
  );
}
