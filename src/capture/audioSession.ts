// Audio session helper. The real implementation lives in a small Expo native
// module (planned in Phase 1 of the implementation roadmap) that configures
// `.playAndRecord` with `[.mixWithOthers, .defaultToSpeaker,
// .allowBluetoothA2DP, .allowBluetoothHFP]` on iOS and the equivalent
// `AudioFocusRequest` on Android.
//
// This file exposes a JS facade that works without the native module by
// returning resolved promises. Once the native module is wired in, the
// implementation switches to `requireOptionalNativeModule`.

export type AudioSessionMode = 'record' | 'playback' | 'idle';

let currentMode: AudioSessionMode = 'idle';
const listeners = new Set<(event: { began: boolean; type: 'interruption' }) => void>();

export async function activate(mode: AudioSessionMode): Promise<void> {
  currentMode = mode;
}

export function getCurrentMode(): AudioSessionMode {
  return currentMode;
}

export function onInterruption(
  fn: (event: { began: boolean; type: 'interruption' }) => void,
): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Test-only hook: lets specs fire interruption events into the listeners.
export function __emitInterruptionForTests(began: boolean): void {
  listeners.forEach((fn) => fn({ began, type: 'interruption' }));
}

// Test-only hook: resets the singleton state between tests.
export function __resetAudioSessionForTests(): void {
  currentMode = 'idle';
  listeners.clear();
}
