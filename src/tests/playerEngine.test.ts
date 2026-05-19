import { describe, expect, test } from 'vite-plus/test';
import { PlayerEngine } from '../playback/playerEngine.ts';

// Driven by a stepped clock so timing is deterministic.
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

describe('PlayerEngine', () => {
  test('starts at 0, paused', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    expect(engine.currentMs()).toBe(0);
    expect(engine.isPlaying()).toBe(false);
  });

  test('play advances currentMs by wall time', () => {
    const clock = makeClock(1000);
    const engine = new PlayerEngine(clock.read);
    engine.play();
    clock.advance(250);
    expect(engine.currentMs()).toBe(250);
    clock.advance(750);
    expect(engine.currentMs()).toBe(1000);
  });

  test('pause freezes the clock', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    engine.play();
    clock.advance(500);
    engine.pause();
    clock.advance(10_000);
    expect(engine.currentMs()).toBe(500);
    expect(engine.isPlaying()).toBe(false);
  });

  test('seek sets position; playing resumes from new origin', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    engine.play();
    clock.advance(300);
    engine.seek(10_000);
    clock.advance(200);
    expect(engine.currentMs()).toBe(10_200);
  });

  test('setRate applies to subsequent wall time', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    engine.play();
    clock.advance(1000);
    expect(engine.currentMs()).toBe(1000);
    engine.setRate(2);
    clock.advance(500);
    // 1000 from rate 1, +500 wall * 2 = 2000.
    expect(engine.currentMs()).toBe(2000);
    engine.setRate(0.5);
    clock.advance(1000);
    expect(engine.currentMs()).toBe(2500);
  });

  test('setRate rejects non-positive values', () => {
    const engine = new PlayerEngine();
    expect(() => engine.setRate(0)).toThrow();
    expect(() => engine.setRate(-1)).toThrow();
  });

  test('setVolume rejects negative values', () => {
    const engine = new PlayerEngine();
    expect(() => engine.setVolume(-0.001)).toThrow();
  });

  test('play is idempotent', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    engine.play();
    clock.advance(500);
    engine.play(); // should be a no-op
    clock.advance(500);
    expect(engine.currentMs()).toBe(1000);
  });

  test('pause is idempotent', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    engine.pause();
    expect(engine.currentMs()).toBe(0);
  });

  test('snapshot reports playing/rate/volume', () => {
    const clock = makeClock();
    const engine = new PlayerEngine(clock.read);
    engine.setVolume(0.7);
    engine.setRate(1.5);
    engine.play();
    clock.advance(200);
    const snap = engine.snapshot();
    expect(snap.playing).toBe(true);
    expect(snap.rate).toBe(1.5);
    expect(snap.volume).toBe(0.7);
    expect(snap.currentMs).toBe(300);
  });
});
