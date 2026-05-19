// Drift correction logic used by the recording session.
//
// During recording every existing-take player plays back in sync with the
// camera. Even with explicit start sequencing, individual players accumulate
// small drift. The recorder samples each player every ~500ms and:
//   * applies a 2% rate nudge (1.02 / 0.98) when |drift| <= softThresholdMs,
//   * issues a hard seek when |drift| > hardThresholdMs.
//
// Decision boundaries live here as pure functions for unit testing.

export const SOFT_THRESHOLD_MS = 30;
export const HARD_THRESHOLD_MS = 150;

export const RATE_NUDGE_FAST = 1.02;
export const RATE_NUDGE_SLOW = 0.98;
export const RATE_NORMAL = 1;

export type DriftDecision =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'rateNudge'; rate: number }>
  | Readonly<{ kind: 'hardSeek'; toMs: number }>;

export function decideDrift(playerCurrentMs: number, expectedMs: number): DriftDecision {
  const drift = playerCurrentMs - expectedMs;
  const absDrift = Math.abs(drift);
  if (absDrift <= SOFT_THRESHOLD_MS) {
    return { kind: 'none' };
  }
  if (absDrift <= HARD_THRESHOLD_MS) {
    // Player is ahead → slow down; behind → speed up.
    return { kind: 'rateNudge', rate: drift > 0 ? RATE_NUDGE_SLOW : RATE_NUDGE_FAST };
  }
  return { kind: 'hardSeek', toMs: expectedMs };
}
