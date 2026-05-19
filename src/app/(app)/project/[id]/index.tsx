import Stack, { VStack } from '@nkzw/stack';
import { Stack as ExpoStack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  defaultLayoutForSlotCount,
  getLayoutById,
  layoutsForAspect,
} from '../../../../model/layouts.ts';
import type { Aspect } from '../../../../model/types.ts';
import { getStore } from '../../../../storage/store.ts';
import colors from '../../../../ui/colors.ts';
import GridSurface from '../../../../ui/GridSurface.tsx';

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = getStore();
  const [project, setProject] = useState(() => store.getProject(id ?? ''));
  const [takes, setTakes] = useState(() => (project ? store.listTakes(project.id) : []));

  const reload = useCallback(() => {
    const next = store.getProject(id ?? '');
    setProject(next);
    setTakes(next ? store.listTakes(next.id) : []);
  }, [id, store]);

  const layout = useMemo(() => {
    if (!project) {
      return null;
    }
    return (
      getLayoutById(project.layoutId) ??
      defaultLayoutForSlotCount(project.aspectRatio, Math.max(takes.length, 1))
    );
  }, [project, takes.length]);

  const swapLayout = useCallback(
    (layoutId: string) => {
      if (!project) {
        return;
      }
      store.updateProjectLayout(project.id, layoutId);
      reload();
    },
    [project, store, reload],
  );

  const swapAspect = useCallback(
    (aspect: Aspect) => {
      if (!project) {
        return;
      }
      store.updateProjectAspect(project.id, aspect);
      const fallback = defaultLayoutForSlotCount(aspect, Math.max(takes.length, 1));
      store.updateProjectLayout(project.id, fallback.id);
      reload();
    },
    [project, store, takes.length, reload],
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
  const canvasWidth = Math.min(screenWidth - 40, 360);

  const layoutChoices = layoutsForAspect(project.aspectRatio).filter(
    (l) => l.slotCount === Math.max(takes.length, 1),
  );

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ExpoStack.Screen options={{ title: project.title }} />
      <VStack flex1 gap={16} padding={20}>
        <Stack alignCenter>
          <GridSurface
            canvasWidth={canvasWidth}
            layout={layout}
            renderSlot={({ index, slot }) => {
              const take = takes.find((t) => t.slotIndex === index);
              return (
                <Stack alignCenter center flex1 padding={4}>
                  <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 11 }}>
                    {take ? `Take ${index + 1}` : index < takes.length + 1 ? 'Next' : 'Empty'}
                  </Text>
                  <Text style={{ color: colors.mutedText, fontSize: 9 }}>{slot.id}</Text>
                </Stack>
              );
            }}
          />
        </Stack>

        <Stack gap={8}>
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
            <fbt desc="Layout picker label">Layout</fbt>
          </Text>
          <Stack gap={8} wrap>
            {layoutChoices.map((l) => (
              <Pressable
                accessibilityLabel={`Use layout ${l.label}`}
                key={l.id}
                onPress={() => swapLayout(l.id)}
                style={{
                  backgroundColor: l.id === layout.id ? colors.accent : colors.surface,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>{l.label}</Text>
              </Pressable>
            ))}
          </Stack>
        </Stack>

        <Stack gap={8}>
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
            <fbt desc="Aspect picker label">Export aspect</fbt>
          </Text>
          <Stack gap={8}>
            {(['9:16', '1:1', '16:9'] as const).map((aspect) => (
              <Pressable
                accessibilityLabel={`Use aspect ${aspect}`}
                key={aspect}
                onPress={() => swapAspect(aspect)}
                style={{
                  backgroundColor: aspect === project.aspectRatio ? colors.accent : colors.surface,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12 }}>{aspect}</Text>
              </Pressable>
            ))}
          </Stack>
        </Stack>

        <View style={{ flex: 1 }} />

        <Stack gap={8}>
          <Pressable
            accessibilityLabel="Record next take"
            onPress={() =>
              router.push({ params: { id: project.id }, pathname: '/project/[id]/record' })
            }
            style={{ backgroundColor: colors.recordButton, borderRadius: 14, padding: 16 }}
          >
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}
            >
              {takes.length === 0 ? (
                <fbt desc="Record first take">Record take 1</fbt>
              ) : (
                <fbt desc="Record next take">
                  Record take <fbt:param name="next">{takes.length + 1}</fbt:param>
                </fbt>
              )}
            </Text>
          </Pressable>
          {takes.length > 0 ? (
            <Stack gap={8}>
              <Pressable
                accessibilityLabel="Open preview"
                onPress={() =>
                  router.push({
                    params: { id: project.id },
                    pathname: '/project/[id]/preview',
                  })
                }
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 14,
                  borderWidth: 1,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  <fbt desc="Preview button">Preview mix</fbt>
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Open export"
                onPress={() =>
                  router.push({
                    params: { id: project.id },
                    pathname: '/project/[id]/export',
                  })
                }
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 14,
                  borderWidth: 1,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  <fbt desc="Export button">Export &amp; share</fbt>
                </Text>
              </Pressable>
            </Stack>
          ) : null}
        </Stack>
      </VStack>
    </SafeAreaView>
  );
}
