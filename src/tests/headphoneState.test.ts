import { beforeEach, describe, expect, test } from 'vite-plus/test';
import {
  __resetHeadphoneStateForTests,
  getHeadphoneState,
  setHeadphoneStateForTests,
  subscribeHeadphoneState,
} from '../capture/headphoneState.ts';

describe('headphoneState', () => {
  beforeEach(() => {
    __resetHeadphoneStateForTests();
  });

  test('default state is disconnected / none', () => {
    expect(getHeadphoneState()).toEqual({ connected: false, transport: 'none' });
  });

  test('setHeadphoneStateForTests updates the snapshot', () => {
    setHeadphoneStateForTests({ connected: true, transport: 'wired' });
    expect(getHeadphoneState()).toEqual({ connected: true, transport: 'wired' });
  });

  test('subscribers are notified of state changes', () => {
    const events: Array<ReturnType<typeof getHeadphoneState>> = [];
    subscribeHeadphoneState((s) => events.push(s));
    setHeadphoneStateForTests({ connected: true, transport: 'bt' });
    setHeadphoneStateForTests({ connected: false, transport: 'none' });
    expect(events).toEqual([
      { connected: true, transport: 'bt' },
      { connected: false, transport: 'none' },
    ]);
  });

  test('unsubscribe removes the listener', () => {
    let count = 0;
    const off = subscribeHeadphoneState(() => {
      count++;
    });
    setHeadphoneStateForTests({ connected: true, transport: 'wired' });
    off();
    setHeadphoneStateForTests({ connected: false, transport: 'none' });
    expect(count).toBe(1);
  });
});
