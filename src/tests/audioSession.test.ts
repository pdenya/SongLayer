import { beforeEach, describe, expect, test } from 'vite-plus/test';
import {
  __emitInterruptionForTests,
  __resetAudioSessionForTests,
  activate,
  getCurrentMode,
  onInterruption,
} from '../capture/audioSession.ts';

describe('audioSession', () => {
  beforeEach(() => {
    __resetAudioSessionForTests();
  });

  test('starts in idle', () => {
    expect(getCurrentMode()).toBe('idle');
  });

  test('activate transitions to the requested mode', async () => {
    await activate('record');
    expect(getCurrentMode()).toBe('record');
    await activate('playback');
    expect(getCurrentMode()).toBe('playback');
    await activate('idle');
    expect(getCurrentMode()).toBe('idle');
  });

  test('interruption listeners receive events', () => {
    const events: Array<{ began: boolean; type: 'interruption' }> = [];
    onInterruption((e) => events.push(e));
    __emitInterruptionForTests(true);
    __emitInterruptionForTests(false);
    expect(events).toEqual([
      { began: true, type: 'interruption' },
      { began: false, type: 'interruption' },
    ]);
  });

  test('unsubscribe stops events', () => {
    let count = 0;
    const off = onInterruption(() => {
      count++;
    });
    __emitInterruptionForTests(true);
    off();
    __emitInterruptionForTests(true);
    expect(count).toBe(1);
  });

  test('multiple listeners all fire', () => {
    let a = 0;
    let b = 0;
    onInterruption(() => {
      a++;
    });
    onInterruption(() => {
      b++;
    });
    __emitInterruptionForTests(true);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});
