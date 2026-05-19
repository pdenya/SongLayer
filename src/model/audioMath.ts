// 1/sqrt(N) gain attenuation to keep the summed mix near-constant RMS.
//
// When N independent vocal takes are mixed, the average sum-power grows linearly
// in N for uncorrelated sources, so amplitude grows by sqrt(N). To keep the
// loudness constant we attenuate each layer by 1/sqrt(N). Above ~4 layers we
// add a small soft-limiter headroom so transient peaks don't clip after
// summing — see Phase 6 comments in to-do.MD.

export function attenuationForN(n: number): number {
  if (n <= 0) {
    return 1;
  }
  return 1 / Math.sqrt(n);
}

export function softLimiterMakeup(n: number): number {
  // Subtract additional dB of headroom past 4 layers so transients stay below 0 dBFS.
  if (n <= 4) {
    return 1;
  }
  const extraDb = (n - 4) * 0.5;
  return Math.pow(10, -extraDb / 20);
}

export function combinedGain(n: number, takeGain = 1): number {
  return Math.max(0, takeGain * attenuationForN(n) * softLimiterMakeup(n));
}
