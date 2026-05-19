import { describe, expect, test } from 'vite-plus/test';
import { createInMemoryStore } from '../storage/projectStore.ts';

function makeStore() {
  let ts = 1000;
  return createInMemoryStore(() => ts++);
}

describe('project store', () => {
  test('create + list returns the new project', () => {
    const store = makeStore();
    const p = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'Song A',
    });
    expect(p.title).toBe('Song A');
    expect(store.listProjects().length).toBe(1);
    expect(store.listProjects()[0]!.id).toBe(p.id);
  });

  test('soft delete hides from default list, restore brings it back', () => {
    const store = makeStore();
    const p = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'Song B',
    });
    store.softDeleteProject(p.id);
    expect(store.listProjects().length).toBe(0);
    expect(store.listProjects(true).length).toBe(1);
    store.restoreProject(p.id);
    expect(store.listProjects().length).toBe(1);
  });

  test('duplicateProject also clones takes', () => {
    const store = makeStore();
    const p = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'Song C',
    });
    store.createTake({
      durationMs: 1000,
      fileUri: 'file:///a.mov',
      projectId: p.id,
      slotIndex: 0,
      slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    });
    store.createTake({
      durationMs: 1000,
      fileUri: 'file:///b.mov',
      projectId: p.id,
      slotIndex: 1,
      slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    });
    const copy = store.duplicateProject(p.id);
    expect(copy).not.toBeNull();
    expect(copy!.title).toBe('Song C (copy)');
    expect(store.listTakes(copy!.id).length).toBe(2);
  });

  test('updateTakeMuted / Gain persists', () => {
    const store = makeStore();
    const p = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'D',
    });
    const t = store.createTake({
      durationMs: 1000,
      fileUri: 'file:///a.mov',
      projectId: p.id,
      slotIndex: 0,
      slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    });
    store.updateTakeMuted(t.id, true);
    store.updateTakeGain(t.id, 0.5);
    const reread = store.listTakes(p.id)[0]!;
    expect(reread.mutedInExport).toBe(true);
    expect(reread.gain).toBe(0.5);
  });

  test('reorderTakes updates slot indices', () => {
    const store = makeStore();
    const p = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'E',
    });
    const a = store.createTake({
      durationMs: 1,
      fileUri: 'file:///a',
      projectId: p.id,
      slotIndex: 0,
      slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    });
    const b = store.createTake({
      durationMs: 1,
      fileUri: 'file:///b',
      projectId: p.id,
      slotIndex: 1,
      slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    });
    store.reorderTakes(p.id, [b.id, a.id]);
    const sorted = store.listTakes(p.id);
    expect(sorted[0]!.id).toBe(b.id);
    expect(sorted[1]!.id).toBe(a.id);
  });

  test('hard delete removes takes too', () => {
    const store = makeStore();
    const p = store.createProject({
      aspectRatio: '9:16',
      layoutId: 'v-1',
      projectType: 'music',
      title: 'F',
    });
    store.createTake({
      durationMs: 1,
      fileUri: 'file:///a',
      projectId: p.id,
      slotIndex: 0,
      slotMeta: { aspectAtRecord: '9:16', layoutIdAtRecord: 'v-1' },
    });
    store.hardDeleteProject(p.id);
    expect(store.getProject(p.id)).toBeNull();
    expect(store.listTakes(p.id).length).toBe(0);
  });
});
