import { afterEach, describe, expect, test } from 'vite-plus/test';
import { createInMemoryStore } from '../storage/projectStore.ts';
import { getStore, resetStoreForTests, setStoreForTests } from '../storage/store.ts';

describe('store singleton', () => {
  afterEach(() => {
    resetStoreForTests();
  });

  test('getStore returns the same instance across calls', () => {
    const a = getStore();
    const b = getStore();
    expect(a).toBe(b);
  });

  test('setStoreForTests overrides the singleton', () => {
    const fake = createInMemoryStore(() => 42);
    setStoreForTests(fake);
    expect(getStore()).toBe(fake);
  });

  test('resetStoreForTests forces a new instance on next access', () => {
    const fake = createInMemoryStore(() => 1);
    setStoreForTests(fake);
    resetStoreForTests();
    const next = getStore();
    expect(next).not.toBe(fake);
  });
});
