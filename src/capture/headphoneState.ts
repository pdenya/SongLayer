import { useEffect, useState } from 'react';
import type { HeadphoneState } from '../model/types.ts';

// In the native build this hook bridges:
//   * iOS:    AVAudioSession.currentRoute.outputs
//   * Android AudioManager.getDevices(GET_DEVICES_OUTPUTS) +
//             AudioDeviceCallback
//
// For the in-tree TS surface we expose the same hook with an injectable
// poller so the screens that consume it (e.g. the music-mode headphone gate)
// can be unit tested.

const DEFAULT: HeadphoneState = { connected: false, transport: 'none' };

let currentState: HeadphoneState = DEFAULT;
const subscribers = new Set<(s: HeadphoneState) => void>();

export function setHeadphoneStateForTests(state: HeadphoneState): void {
  currentState = state;
  subscribers.forEach((s) => s(state));
}

export function getHeadphoneState(): HeadphoneState {
  return currentState;
}

export function useHeadphoneState(): HeadphoneState {
  const [state, setState] = useState<HeadphoneState>(currentState);
  useEffect(() => {
    const sub = (s: HeadphoneState) => setState(s);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);
  return state;
}
