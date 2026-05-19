import { describe, expect, test } from 'vite-plus/test';
import { attenuationForN, combinedGain, softLimiterMakeup } from '../model/audioMath.ts';

describe('audio math', () => {
  test('attenuationForN is 1 at N=1', () => {
    expect(attenuationForN(1)).toBeCloseTo(1, 6);
  });

  test('attenuationForN approaches 1/sqrt(N)', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 9, 16]) {
      expect(attenuationForN(n)).toBeCloseTo(1 / Math.sqrt(n), 6);
    }
  });

  test('attenuationForN handles zero gracefully', () => {
    expect(attenuationForN(0)).toBe(1);
  });

  test('soft limiter kicks in above N=4', () => {
    expect(softLimiterMakeup(4)).toBe(1);
    expect(softLimiterMakeup(5)).toBeLessThan(1);
    expect(softLimiterMakeup(6)).toBeLessThan(softLimiterMakeup(5));
  });

  test('combinedGain is monotonically non-increasing in N for a fixed take gain', () => {
    let prev = combinedGain(1);
    for (let n = 2; n <= 8; n++) {
      const next = combinedGain(n);
      expect(next).toBeLessThanOrEqual(prev);
      prev = next;
    }
  });

  test('combinedGain scales with takeGain', () => {
    expect(combinedGain(4, 2)).toBeCloseTo(combinedGain(4) * 2, 6);
  });

  test('combinedGain clamps to 0 for zero takeGain', () => {
    expect(combinedGain(4, 0)).toBe(0);
  });
});
