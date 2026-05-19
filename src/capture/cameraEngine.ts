// Pure recording-lifecycle engine. The real CameraView wraps it; tests
// drive it directly with an injected clock and id generator.

import { uuid } from '../lib/uuid.ts';

export type Clock = () => number;
export type IdGenerator = () => string;

export type StartResult = Readonly<{
  recordingId: string;
  startedAt: number;
}>;

export type StopResult = Readonly<{
  durationMs: number;
  fileUri: string;
  startedAt: number;
}>;

export type CameraEngineOptions = Readonly<{
  clock?: Clock;
  fileTemplate?: (id: string) => string;
  idGen?: IdGenerator;
}>;

const DEFAULT_TEMPLATE = (id: string) => `file:///songlayer/cache/recordings/${id}.mov`;

export class CameraEngine {
  private startedAt: number | null = null;
  private recordingId: string | null = null;
  private readonly clock: Clock;
  private readonly idGen: IdGenerator;
  private readonly fileTemplate: (id: string) => string;

  constructor(options: CameraEngineOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.idGen = options.idGen ?? uuid;
    this.fileTemplate = options.fileTemplate ?? DEFAULT_TEMPLATE;
  }

  start(): StartResult {
    if (this.startedAt != null) {
      throw new Error('CameraEngine: already recording');
    }
    this.recordingId = this.idGen();
    this.startedAt = this.clock();
    return { recordingId: this.recordingId, startedAt: this.startedAt };
  }

  stop(): StopResult {
    if (this.startedAt == null || this.recordingId == null) {
      throw new Error('CameraEngine: not recording');
    }
    const stoppedAt = this.clock();
    const result: StopResult = {
      durationMs: Math.max(0, stoppedAt - this.startedAt),
      fileUri: this.fileTemplate(this.recordingId),
      startedAt: this.startedAt,
    };
    this.startedAt = null;
    this.recordingId = null;
    return result;
  }

  isRecording(): boolean {
    return this.startedAt != null;
  }
}
