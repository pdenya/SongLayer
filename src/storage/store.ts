import { createInMemoryStore, type ProjectStore } from './projectStore.ts';

// Singleton accessor. In production this returns the SQLite-backed store
// (added in Phase 2 of the implementation plan); on web / in tests it falls
// back to the in-memory implementation.

let instance: ProjectStore | null = null;

export function getStore(): ProjectStore {
  if (instance) {
    return instance;
  }
  instance = createInMemoryStore();
  return instance;
}

export function setStoreForTests(store: ProjectStore): void {
  instance = store;
}

export function resetStoreForTests(): void {
  instance = null;
}
