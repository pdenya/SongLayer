import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test';
import {
  cacheDir,
  configurePathsForTests,
  exportFile,
  projectDir,
  takesDir,
  thumbnailFile,
} from '../lib/paths.ts';

const DOC = 'file:///tmp/docs';
const CACHE = 'file:///tmp/cache';

describe('paths', () => {
  beforeAll(() => {
    configurePathsForTests(DOC, CACHE);
  });

  afterAll(() => {
    configurePathsForTests('file:///songlayer/documents', 'file:///songlayer/cache');
  });

  test('projectDir is under documents root', () => {
    expect(projectDir('abc').uri).toBe(`${DOC}/projects/abc`);
  });

  test('takesDir is a subdir of the project dir', () => {
    expect(takesDir('abc').uri).toBe(`${DOC}/projects/abc/takes`);
  });

  test('cacheDir is under cache root', () => {
    expect(cacheDir('abc').uri).toBe(`${CACHE}/projects/abc`);
  });

  test('exportFile picks an mp4 named by aspect', () => {
    expect(exportFile('abc', '9:16')).toBe(`${CACHE}/projects/abc/export-9x16.mp4`);
    expect(exportFile('abc', '1:1')).toBe(`${CACHE}/projects/abc/export-1x1.mp4`);
    expect(exportFile('abc', '16:9')).toBe(`${CACHE}/projects/abc/export-16x9.mp4`);
  });

  test('thumbnailFile lives in the cache dir', () => {
    expect(thumbnailFile('abc')).toBe(`${CACHE}/projects/abc/thumb.jpg`);
  });

  test('different project ids yield different directories', () => {
    expect(projectDir('a').uri).not.toBe(projectDir('b').uri);
  });
});
