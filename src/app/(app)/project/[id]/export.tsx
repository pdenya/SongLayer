import Stack, { VStack } from '@nkzw/stack';
import { Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelCompose, composeGrid, planComposeGrid } from '../../../../export/composeGrid.ts';
import { EXPORT_PRESETS, presetFor } from '../../../../export/exportPresets.ts';
import { exportFile } from '../../../../lib/paths.ts';
import { defaultLayoutForSlotCount, getLayoutById } from '../../../../model/layouts.ts';
import type { Aspect } from '../../../../model/types.ts';
import { getStore } from '../../../../storage/store.ts';
import colors from '../../../../ui/colors.ts';

const PLATFORM_OPTIONS = [
  { aspect: '9:16' as const, label: 'TikTok / Reels / Shorts' },
  { aspect: '1:1' as const, label: 'Feed (square)' },
  { aspect: '16:9' as const, label: 'YouTube' },
] satisfies ReadonlyArray<{ aspect: Aspect; label: string }>;

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = getStore();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [outputUri, setOutputUri] = useState<string | null>(null);
  const project = useMemo(() => store.getProject(id ?? ''), [store, id]);
  const takes = useMemo(() => (project ? store.listTakes(project.id) : []), [store, project]);
  const [aspect, setAspect] = useState<Aspect>(project?.aspectRatio ?? '9:16');

  const layout = useMemo(() => {
    if (!project) {
      return null;
    }
    return (
      getLayoutById(project.layoutId) ??
      defaultLayoutForSlotCount(aspect, Math.max(takes.length, 1))
    );
  }, [project, aspect, takes.length]);

  const onExport = useCallback(async () => {
    if (!project || !layout) {
      return;
    }
    setError(null);
    setStatus('running');
    try {
      const preset = presetFor(aspect);
      const plan = planComposeGrid({
        aspect,
        bitrateKbps: preset.videoBitrateKbps,
        codec: preset.codec,
        includeClickTrack: false,
        layout:
          layout.aspect === aspect
            ? layout
            : defaultLayoutForSlotCount(aspect, Math.max(takes.length, 1)),
        takes,
      });
      const uri = exportFile(project.id, aspect);
      const result = await composeGrid(plan, uri);
      setOutputUri(result.uri);
      setStatus('done');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setStatus('idle');
    }
  }, [aspect, layout, project, takes]);

  const onCancel = useCallback(() => {
    void cancelCompose();
    setStatus('idle');
  }, []);

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

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ExpoStack.Screen options={{ title: `Export · ${project.title}` }} />
      <VStack flex1 gap={20} padding={20}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
          <fbt desc="Choose aspect heading">Choose an aspect</fbt>
        </Text>
        <Stack gap={12}>
          {PLATFORM_OPTIONS.map((option) => (
            <Pressable
              accessibilityLabel={`Use aspect ${option.aspect}`}
              key={option.aspect}
              onPress={() => setAspect(option.aspect)}
              style={{
                backgroundColor: aspect === option.aspect ? colors.accent : colors.surface,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Stack between>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{option.label}</Text>
                <Text style={{ color: colors.mutedText }}>{option.aspect}</Text>
              </Stack>
              <Text style={{ color: colors.mutedText, fontSize: 11, marginTop: 6 }}>
                {EXPORT_PRESETS[option.aspect].width}×{EXPORT_PRESETS[option.aspect].height} ·{' '}
                {EXPORT_PRESETS[option.aspect].videoBitrateKbps / 1000} Mbps{' '}
                {EXPORT_PRESETS[option.aspect].codec.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </Stack>

        {error ? (
          <Stack padding={12} style={{ backgroundColor: colors.muted, borderRadius: 10 }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </Stack>
        ) : null}

        {status === 'done' && outputUri ? (
          <Stack padding={12} style={{ backgroundColor: colors.surface, borderRadius: 10 }}>
            <Text style={{ color: colors.success }}>
              <fbt desc="Export complete message">Export ready.</fbt>
            </Text>
            <Text numberOfLines={2} style={{ color: colors.mutedText, fontSize: 11, marginTop: 4 }}>
              {outputUri}
            </Text>
          </Stack>
        ) : null}

        <Stack gap={12}>
          {status === 'running' ? (
            <Pressable
              accessibilityLabel="Cancel export"
              onPress={onCancel}
              style={{ backgroundColor: colors.muted, borderRadius: 14, padding: 16 }}
            >
              <Text style={{ color: colors.text, textAlign: 'center' }}>
                <fbt desc="Cancel export button">Cancel</fbt>
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Start export"
              onPress={onExport}
              style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 16 }}
            >
              <Text style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>
                <fbt desc="Start export button">Export</fbt>
              </Text>
            </Pressable>
          )}
        </Stack>
      </VStack>
    </SafeAreaView>
  );
}
