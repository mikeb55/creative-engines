export type WybleEvent = {
  start: number;
  duration: number;
  pitch: number;
};

export type WybleVoice = {
  events: WybleEvent[];
};

export type WyblePair = {
  upper: WybleVoice;
  lower: WybleVoice;
  identityLocked: boolean;
};

function validateVoice(voice: WybleVoice, label: string): void {
  let cursor = 0;
  const total = voice.events.reduce((s, e) => s + e.duration, 0);
  if (Math.abs(total - 4) > 1e-4) throw new Error(`WyblePair ${label}: duration sum ${total} !== 4`);
  for (const e of voice.events) {
    if (e.duration <= 0) throw new Error(`WyblePair ${label}: zero/negative duration at ${e.start}`);
    if (e.start < cursor - 1e-4) throw new Error(`WyblePair ${label}: overlap at ${e.start}`);
    cursor = e.start + e.duration;
  }
}

export function validateWyblePair(pair: WyblePair): void {
  validateVoice(pair.upper, 'upper');
  validateVoice(pair.lower, 'lower');
}

export function lockWyblePair(pair: WyblePair): WyblePair {
  validateWyblePair(pair);
  return { ...pair, identityLocked: true };
}

export function generateWyblePair(
  upperPitch: number,
  lowerPitch: number,
  upperStart: number,
  lowerStart: number,
): WyblePair {
  const upper: WybleVoice = {
    events: [
      ...(upperStart > 0 ? [{ start: 0, duration: upperStart, pitch: -1 }] : []),
      { start: upperStart, duration: 4 - upperStart, pitch: upperPitch },
    ],
  };
  const lower: WybleVoice = {
    events: [
      ...(lowerStart > 0 ? [{ start: 0, duration: lowerStart, pitch: -1 }] : []),
      { start: lowerStart, duration: 4 - lowerStart, pitch: lowerPitch },
    ],
  };
  return lockWyblePair({ upper, lower, identityLocked: false });
}
