export interface SaxSoliConfig {
  startBar: number;
  endBar: number;
}

export interface SaxSoliBarPattern {
  leadOffsetSemitones: number;
}

export function generateSaxSoliPhrase(
  chordSequence: string[],
  motif: number[],
  config: SaxSoliConfig
): Map<number, SaxSoliBarPattern> {
  const out = new Map<number, SaxSoliBarPattern>();
  if (motif.length === 0) return out;
  for (let bar = config.startBar; bar <= config.endBar; bar++) {
    if (bar < 1 || bar > chordSequence.length) continue;
    const idx = (bar - config.startBar) % motif.length;
    out.set(bar, { leadOffsetSemitones: motif[idx]! });
  }
  return out;
}

export function generateBrassPunches(
  chordSequence: string[],
  rhythmGrid: number[]
): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (let bar = 1; bar <= chordSequence.length; bar++) {
    const chord = chordSequence[bar - 1] ?? '';
    const prev = bar > 1 ? chordSequence[bar - 2] ?? '' : '';
    const cadenceLike = bar % 4 === 0 || (prev.length > 0 && chord !== prev);
    if (!cadenceLike) continue;
    out.set(bar, [...rhythmGrid]);
  }
  return out;
}

export function generateShoutChorus(chordSequence: string[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  if (chordSequence.length < 24) return out;
  const start = Math.max(1, chordSequence.length - 7);
  const end = Math.max(start, chordSequence.length - 4);
  for (let bar = start; bar <= end; bar++) {
    out.set(bar, [0, 1, 2, 3]);
  }
  return out;
}
