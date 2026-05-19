// Pure timing engine used by `TakePlayer`. Extracted so the play/pause/seek/
// rate logic can be unit tested without rendering a React component or
// mocking the `expo-video` `VideoPlayer` instance.
//
// The engine accepts an injectable clock so tests can step time
// deterministically. The native binding wires `clock = () => Date.now()`.

export type Clock = () => number;

export type PlayerEngineSnapshot = Readonly<{
  currentMs: number;
  playing: boolean;
  rate: number;
  volume: number;
}>;

export class PlayerEngine {
  private lastStart: number | null = null;
  private accumulatedMs = 0;
  private rate = 1;
  private volume = 1;
  private readonly clock: Clock;

  constructor(clock: Clock = () => Date.now()) {
    this.clock = clock;
  }

  play(): void {
    if (this.lastStart != null) {
      return;
    }
    this.lastStart = this.clock();
  }

  pause(): void {
    if (this.lastStart == null) {
      return;
    }
    this.accumulatedMs += (this.clock() - this.lastStart) * this.rate;
    this.lastStart = null;
  }

  seek(ms: number): void {
    this.accumulatedMs = ms;
    if (this.lastStart != null) {
      this.lastStart = this.clock();
    }
  }

  setRate(value: number): void {
    if (value <= 0) {
      throw new Error('PlayerEngine: rate must be positive');
    }
    if (this.lastStart != null) {
      this.accumulatedMs += (this.clock() - this.lastStart) * this.rate;
      this.lastStart = this.clock();
    }
    this.rate = value;
  }

  setVolume(value: number): void {
    if (value < 0) {
      throw new Error('PlayerEngine: volume must be non-negative');
    }
    this.volume = value;
  }

  currentMs(): number {
    if (this.lastStart == null) {
      return this.accumulatedMs;
    }
    return this.accumulatedMs + (this.clock() - this.lastStart) * this.rate;
  }

  isPlaying(): boolean {
    return this.lastStart != null;
  }

  snapshot(): PlayerEngineSnapshot {
    return {
      currentMs: this.currentMs(),
      playing: this.isPlaying(),
      rate: this.rate,
      volume: this.volume,
    };
  }
}
