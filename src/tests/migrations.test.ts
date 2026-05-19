import { describe, expect, test } from 'vite-plus/test';
import { MIGRATIONS, nextMigrationsFrom } from '../storage/migrations.ts';

describe('migrations', () => {
  test('catalog has at least one migration', () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
  });

  test('versions are monotonically increasing and start at 1', () => {
    expect(MIGRATIONS[0]!.to).toBe(1);
    for (let i = 1; i < MIGRATIONS.length; i++) {
      expect(MIGRATIONS[i]!.to).toBeGreaterThan(MIGRATIONS[i - 1]!.to);
    }
  });

  test('every migration has SQL content', () => {
    for (const m of MIGRATIONS) {
      expect(m.sql.trim().length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });

  test('nextMigrationsFrom(0) returns every migration', () => {
    expect(nextMigrationsFrom(0).length).toBe(MIGRATIONS.length);
  });

  test('nextMigrationsFrom(latest) returns nothing', () => {
    const latest = MIGRATIONS.at(-1)!.to;
    expect(nextMigrationsFrom(latest).length).toBe(0);
  });

  test('nextMigrationsFrom(N) returns only later migrations', () => {
    const cutoff = MIGRATIONS[0]!.to;
    const rest = nextMigrationsFrom(cutoff);
    expect(rest.every((m) => m.to > cutoff)).toBe(true);
  });

  test('initial migration creates the projects/takes/pending_takes tables', () => {
    const initial = MIGRATIONS[0]!;
    expect(initial.sql).toMatch(/CREATE TABLE.*projects/);
    expect(initial.sql).toMatch(/CREATE TABLE.*takes/);
    expect(initial.sql).toMatch(/CREATE TABLE.*pending_takes/);
    // CHECK constraint guards projectType to the two known modes.
    expect(initial.sql).toMatch(/projectType.*music.*multi-cam/);
  });
});
