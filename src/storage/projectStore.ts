import { uuid } from '../lib/uuid.ts';
import type { PendingTake, Project, ProjectType, Take } from '../model/types.ts';

// Tiny in-memory store, used in tests and as a stand-in until
// expo-sqlite is wired in Phase 2 of the implementation plan. The interface
// matches what a SQLite-backed implementation will expose, so callers don't
// have to change.
//
// The native implementation will live in `./sqliteStore.ts` and run the same
// `ProjectStore` interface against `expo-sqlite` (using `runAsync` / `getAllAsync`
// per the hot-path guidance in to-do.MD).

export interface ProjectStore {
  // --- projects ---
  createProject(args: {
    aspectRatio: Project['aspectRatio'];
    layoutId: string;
    projectType: ProjectType;
    title: string;
  }): Project;
  // --- takes ---
  createTake(args: {
    durationMs: number;
    fileUri: string;
    projectId: string;
    slotIndex: number;
    slotMeta: Take['slotMeta'];
  }): Take;
  deleteTake(id: string): void;
  duplicateProject(id: string): Project | null;
  getProject(id: string): Project | null;
  hardDeleteProject(id: string): void;
  listPendingTakes(projectId: string): ReadonlyArray<PendingTake>;
  listProjects(includeDeleted?: boolean): ReadonlyArray<Project>;
  listTakes(projectId: string): ReadonlyArray<Take>;
  renameProject(id: string, title: string): Project | null;

  reorderTakes(projectId: string, orderedIds: ReadonlyArray<string>): void;
  replaceTake(id: string, fileUri: string, durationMs: number): Take | null;
  resolvePendingTake(id: string): void;
  restoreProject(id: string): void;
  softDeleteProject(id: string): void;
  updateProjectAspect(id: string, aspectRatio: Project['aspectRatio']): Project | null;
  updateProjectLayout(id: string, layoutId: string): Project | null;

  updateTakeGain(id: string, gain: number): Take | null;
  updateTakeMuted(id: string, mutedInExport: boolean): Take | null;
  // --- pending takes ---
  upsertPendingTake(pending: PendingTake): void;
}

const SCHEMA_VERSION = 1;

export function createInMemoryStore(now: () => number = () => Date.now()): ProjectStore {
  const projects = new Map<string, Project>();
  const takes = new Map<string, Take>();
  const pending = new Map<string, PendingTake>();

  function bumpProject(id: string): void {
    const p = projects.get(id);
    if (p) {
      projects.set(id, { ...p, updatedAt: now() });
    }
  }

  return {
    createProject({ aspectRatio, layoutId, projectType, title }) {
      const project: Project = {
        aspectRatio,
        createdAt: now(),
        deletedAt: null,
        id: uuid(),
        layoutId,
        projectType,
        schemaVersion: SCHEMA_VERSION,
        title,
        updatedAt: now(),
      };
      projects.set(project.id, project);
      return project;
    },

    createTake({ durationMs, fileUri, projectId, slotIndex, slotMeta }) {
      const take: Take = {
        createdAt: now(),
        durationMs,
        fileUri,
        gain: 1,
        id: uuid(),
        mutedInExport: false,
        projectId,
        slotIndex,
        slotMeta,
      };
      takes.set(take.id, take);
      bumpProject(projectId);
      return take;
    },

    deleteTake(id) {
      const take = takes.get(id);
      if (!take) {
        return;
      }
      takes.delete(id);
      bumpProject(take.projectId);
    },

    duplicateProject(id) {
      const source = projects.get(id);
      if (!source) {
        return null;
      }
      const clone: Project = {
        ...source,
        createdAt: now(),
        deletedAt: null,
        id: uuid(),
        title: `${source.title} (copy)`,
        updatedAt: now(),
      };
      projects.set(clone.id, clone);
      const sourceTakes = [...takes.values()].filter((t) => t.projectId === id);
      for (const t of sourceTakes) {
        const cloned: Take = { ...t, createdAt: now(), id: uuid(), projectId: clone.id };
        takes.set(cloned.id, cloned);
      }
      return clone;
    },

    getProject(id) {
      return projects.get(id) ?? null;
    },

    hardDeleteProject(id) {
      projects.delete(id);
      for (const t of takes.values()) {
        if (t.projectId === id) {
          takes.delete(t.id);
        }
      }
      for (const p of pending.values()) {
        if (p.projectId === id) {
          pending.delete(p.id);
        }
      }
    },

    listPendingTakes(projectId) {
      return [...pending.values()]
        .filter((p) => p.projectId === projectId)
        .sort((a, b) => a.recordingStartedAt - b.recordingStartedAt);
    },

    listProjects(includeDeleted = false) {
      const all = [...projects.values()];
      const filtered = includeDeleted ? all : all.filter((p) => p.deletedAt == null);
      return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    listTakes(projectId) {
      return [...takes.values()]
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => a.slotIndex - b.slotIndex);
    },

    renameProject(id, title) {
      const p = projects.get(id);
      if (!p) {
        return null;
      }
      const updated: Project = { ...p, title, updatedAt: now() };
      projects.set(id, updated);
      return updated;
    },

    reorderTakes(projectId, orderedIds) {
      orderedIds.forEach((takeId, index) => {
        const t = takes.get(takeId);
        if (t && t.projectId === projectId) {
          takes.set(takeId, { ...t, slotIndex: index });
        }
      });
      bumpProject(projectId);
    },

    replaceTake(id, fileUri, durationMs) {
      const t = takes.get(id);
      if (!t) {
        return null;
      }
      const updated: Take = { ...t, durationMs, fileUri };
      takes.set(id, updated);
      bumpProject(t.projectId);
      return updated;
    },

    resolvePendingTake(id) {
      pending.delete(id);
    },

    restoreProject(id) {
      const p = projects.get(id);
      if (!p) {
        return;
      }
      projects.set(id, { ...p, deletedAt: null, updatedAt: now() });
    },

    softDeleteProject(id) {
      const p = projects.get(id);
      if (!p) {
        return;
      }
      projects.set(id, { ...p, deletedAt: now(), updatedAt: now() });
    },

    updateProjectAspect(id, aspectRatio) {
      const p = projects.get(id);
      if (!p) {
        return null;
      }
      const updated: Project = { ...p, aspectRatio, updatedAt: now() };
      projects.set(id, updated);
      return updated;
    },

    updateProjectLayout(id, layoutId) {
      const p = projects.get(id);
      if (!p) {
        return null;
      }
      const updated: Project = { ...p, layoutId, updatedAt: now() };
      projects.set(id, updated);
      return updated;
    },

    updateTakeGain(id, gain) {
      const t = takes.get(id);
      if (!t) {
        return null;
      }
      const updated: Take = { ...t, gain: Math.max(0, gain) };
      takes.set(id, updated);
      bumpProject(t.projectId);
      return updated;
    },

    updateTakeMuted(id, mutedInExport) {
      const t = takes.get(id);
      if (!t) {
        return null;
      }
      const updated: Take = { ...t, mutedInExport };
      takes.set(id, updated);
      bumpProject(t.projectId);
      return updated;
    },

    upsertPendingTake(p) {
      pending.set(p.id, p);
    },
  };
}
