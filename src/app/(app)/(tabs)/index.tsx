import Stack, { VStack } from '@nkzw/stack';
import { Stack as ExpoStack, useRouter } from 'expo-router';
import { fbs } from 'fbtee';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LAYOUTS, defaultLayoutForSlotCount } from '../../../model/layouts.ts';
import type { Project, ProjectType, Aspect } from '../../../model/types.ts';
import { getStore } from '../../../storage/store.ts';
import colors from '../../../ui/colors.ts';
import useViewerContext from '../../../user/useViewerContext.tsx';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86_400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export default function Index() {
  const router = useRouter();
  const store = getStore();
  const { setLocalSetting } = useViewerContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const projects = useMemo<ReadonlyArray<Project>>(
    () => store.listProjects(false),
    // Re-read on refreshKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, refreshKey],
  );

  const handleCreate = (projectType: ProjectType) => {
    const aspectRatio: Aspect = '9:16';
    const layout = defaultLayoutForSlotCount(aspectRatio, 1) ?? LAYOUTS[0]!;
    const title =
      projectType === 'music' ? `Song ${projects.length + 1}` : `Scene ${projects.length + 1}`;
    const project = store.createProject({
      aspectRatio,
      layoutId: layout.id,
      projectType,
      title,
    });
    setLocalSetting('currentProjectId', project.id);
    setRefreshKey((k) => k + 1);
    router.push({ params: { id: project.id }, pathname: '/project/[id]' });
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ExpoStack.Screen options={{ title: String(fbs('Projects', 'Projects header title')) }} />
      <VStack flex1 gap={16} padding={20}>
        <Stack alignCenter between>
          <Text className="font-bold" style={{ color: colors.text, fontSize: 28 }}>
            <fbt desc="Projects screen header">Songs</fbt>
          </Text>
        </Stack>
        <Stack gap={12}>
          <Pressable
            accessibilityLabel="Create new song project"
            onPress={() => handleCreate('music')}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
              <fbt desc="New song button">+ New song</fbt>
            </Text>
            <Text style={{ color: colors.text, marginTop: 4, opacity: 0.85 }}>
              <fbt desc="New song description">Layered vocal takes against your own playback.</fbt>
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Create new multi-cam project"
            onPress={() => handleCreate('multi-cam')}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 14,
              borderWidth: 1,
              padding: 16,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
              <fbt desc="New multi-cam button">+ New multi-cam scene</fbt>
            </Text>
            <Text style={{ color: colors.mutedText, marginTop: 4 }}>
              <fbt desc="Multi-cam description">
                Multi-angle capture with one camera. No headphone gate.
              </fbt>
            </Text>
          </Pressable>
        </Stack>
        <View style={{ flex: 1, marginTop: 8 }}>
          {projects.length === 0 ? (
            <Stack alignCenter center flex1 gap={8} padding={32}>
              <Text style={{ color: colors.mutedText, fontSize: 16, textAlign: 'center' }}>
                <fbt desc="Empty projects state">
                  No projects yet. Start with a new song or multi-cam scene above.
                </fbt>
              </Text>
            </Stack>
          ) : (
            projects.map((project) => (
              <Pressable
                accessibilityLabel={`Open project ${project.title}`}
                key={project.id}
                onPress={() =>
                  router.push({ params: { id: project.id }, pathname: '/project/[id]' })
                }
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  marginBottom: 12,
                  padding: 16,
                }}
              >
                <Stack alignCenter between>
                  <Stack gap={4} vertical>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                      {project.title}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 13 }}>
                      {project.projectType === 'music' ? 'Song' : 'Multi-cam'} ·{' '}
                      {project.aspectRatio} · {timeAgo(project.updatedAt)}
                    </Text>
                  </Stack>
                  <Text style={{ color: colors.mutedText, fontSize: 22 }}>›</Text>
                </Stack>
              </Pressable>
            ))
          )}
        </View>
      </VStack>
    </SafeAreaView>
  );
}
