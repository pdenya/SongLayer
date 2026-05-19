import { describe, expect, test } from 'vite-plus/test';
import { CameraEngine } from '../capture/cameraEngine.ts';

function makeClock(initial = 0) {
  let now = initial;
  return {
    advance(ms: number) {
      now += ms;
    },
    read() {
      return now;
    },
  };
}

describe('CameraEngine', () => {
  test('start returns a deterministic id with the injected generator', () => {
    let counter = 0;
    const clock = makeClock(1000);
    const engine = new CameraEngine({
      clock: clock.read,
      idGen: () => `id-${++counter}`,
    });
    const start = engine.start();
    expect(start.recordingId).toBe('id-1');
    expect(start.startedAt).toBe(1000);
    expect(engine.isRecording()).toBe(true);
  });

  test('stop returns the elapsed duration in ms', () => {
    const clock = makeClock(0);
    const engine = new CameraEngine({ clock: clock.read, idGen: () => 'r1' });
    engine.start();
    clock.advance(1500);
    const result = engine.stop();
    expect(result.durationMs).toBe(1500);
    expect(result.fileUri).toContain('r1');
    expect(engine.isRecording()).toBe(false);
  });

  test('cannot start twice without stopping', () => {
    const engine = new CameraEngine();
    engine.start();
    expect(() => engine.start()).toThrow(/already recording/);
  });

  test('cannot stop without starting', () => {
    const engine = new CameraEngine();
    expect(() => engine.stop()).toThrow(/not recording/);
  });

  test('custom fileTemplate is honored', () => {
    const engine = new CameraEngine({
      fileTemplate: (id) => `mock:///${id}`,
      idGen: () => 'abc',
    });
    engine.start();
    const result = engine.stop();
    expect(result.fileUri).toBe('mock:///abc');
  });

  test('start/stop cycle is repeatable', () => {
    const clock = makeClock();
    let i = 0;
    const engine = new CameraEngine({ clock: clock.read, idGen: () => `r${++i}` });
    engine.start();
    clock.advance(100);
    const a = engine.stop();
    engine.start();
    clock.advance(200);
    const b = engine.stop();
    expect(a.durationMs).toBe(100);
    expect(b.durationMs).toBe(200);
    expect(a.fileUri).not.toBe(b.fileUri);
  });
});
