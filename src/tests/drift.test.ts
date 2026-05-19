import { describe, expect, test } from 'vite-plus/test';
import {
  decideDrift,
  HARD_THRESHOLD_MS,
  RATE_NUDGE_FAST,
  RATE_NUDGE_SLOW,
  SOFT_THRESHOLD_MS,
} from '../model/drift.ts';

describe('drift correction', () => {
  test('no action under soft threshold', () => {
    expect(decideDrift(100, 100)).toEqual({ kind: 'none' });
    expect(decideDrift(100, 110)).toEqual({ kind: 'none' });
    expect(decideDrift(100, 90)).toEqual({ kind: 'none' });
  });

  test('soft threshold boundary returns none', () => {
    expect(decideDrift(100, 100 + SOFT_THRESHOLD_MS)).toEqual({ kind: 'none' });
  });

  test('rate nudge slow when ahead', () => {
    expect(decideDrift(200, 100)).toEqual({ kind: 'rateNudge', rate: RATE_NUDGE_SLOW });
  });

  test('rate nudge fast when behind', () => {
    expect(decideDrift(50, 100)).toEqual({ kind: 'rateNudge', rate: RATE_NUDGE_FAST });
  });

  test('hard seek when beyond hard threshold', () => {
    const decision = decideDrift(100 + HARD_THRESHOLD_MS + 10, 100);
    expect(decision).toEqual({ kind: 'hardSeek', toMs: 100 });
  });
});
