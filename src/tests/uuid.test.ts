import { describe, expect, test } from 'vite-plus/test';
import { uuid } from '../lib/uuid.ts';

const V4_REGEX = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

describe('uuid', () => {
  test('returns a v4-shaped string', () => {
    expect(uuid()).toMatch(V4_REGEX);
  });

  test('is unique across many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const id = uuid();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });
});
