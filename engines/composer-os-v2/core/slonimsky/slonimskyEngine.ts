export type IntervalPatternId = string;

export interface IntervalPattern {
  id: IntervalPatternId;
  name: string;
  intervals: number[];
  symmetryType: 'equalDivision' | 'asymmetric';
  baseDivision?: number;
  defaultLength: number;
  tensionLevel: 1 | 2 | 3;
  styleAffinity: Array<'coltrane' | 'shorter' | 'brecker' | 'ecm'>;
}

export interface SlonimskyContext {
  keyPc: number;
  chordType: string;
  functionalStrength: 'strong' | 'medium' | 'weak';
  allowedOutsideLevel: 0 | 1 | 2;
  phraseIntent: 'build' | 'release' | 'float' | 'shock';
  basePitch: number;
  maxBeats: number;
}

export interface SlonimskyNote {
  midi: number;
  durationBeats: number;
  beat: number;
  role: 'target' | 'passing' | 'pickup';
}

const GUITAR_MIDI_MIN = 48;
const GUITAR_MIDI_MAX = 84;

export const SLONIMSKY_PATTERNS: IntervalPattern[] = [
  {
    id: 'p_minorThirdCycle',
    name: 'Minor 3rd Cycle',
    intervals: [3, 3, 3],
    symmetryType: 'equalDivision',
    baseDivision: 4,
    defaultLength: 4,
    tensionLevel: 2,
    styleAffinity: ['coltrane', 'shorter'],
  },
  {
    id: 'p_majorThirdCycle',
    name: 'Major 3rd Cycle',
    intervals: [4, 4],
    symmetryType: 'equalDivision',
    baseDivision: 3,
    defaultLength: 3,
    tensionLevel: 2,
    styleAffinity: ['coltrane'],
  },
  {
    id: 'p_tritonePole',
    name: 'Tritone Pole',
    intervals: [6, -6],
    symmetryType: 'equalDivision',
    baseDivision: 2,
    defaultLength: 4,
    tensionLevel: 3,
    styleAffinity: ['brecker', 'coltrane'],
  },
  {
    id: 'p_wholeTone',
    name: 'Whole Tone Segment',
    intervals: [2, 2, 2],
    symmetryType: 'equalDivision',
    baseDivision: 6,
    defaultLength: 4,
    tensionLevel: 1,
    styleAffinity: ['ecm', 'shorter'],
  },
  {
    id: 'p_asymCell123',
    name: '1-2-3 Asymmetric Cell',
    intervals: [1, 2, 3],
    symmetryType: 'asymmetric',
    defaultLength: 4,
    tensionLevel: 2,
    styleAffinity: ['brecker', 'coltrane'],
  },
  {
    id: 'p_chromaticInterp',
    name: 'Chromatic Interpolation',
    intervals: [1, 1, 1],
    symmetryType: 'asymmetric',
    defaultLength: 4,
    tensionLevel: 2,
    styleAffinity: ['brecker'],
  },
  {
    id: 'p_expanding',
    name: 'Expanding Cell 1-2-3-4',
    intervals: [1, 2, 3, 4],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 3,
    styleAffinity: ['brecker', 'coltrane'],
  },
  {
    id: 'p_contracting',
    name: 'Contracting Cell 4-3-2-1',
    intervals: [4, 3, 2, 1],
    symmetryType: 'asymmetric',
    defaultLength: 5,
    tensionLevel: 1,
    styleAffinity: ['ecm', 'shorter'],
  },
];

function seededUnit(seed: number): number {
  let s = seed >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clampMidi(midi: number): number {
  return Math.max(GUITAR_MIDI_MIN, Math.min(GUITAR_MIDI_MAX, midi));
}

export function generateSlonimskyPattern(
  pattern: IntervalPattern,
  ctx: SlonimskyContext,
  seed: number
): SlonimskyNote[] {
  const notes: number[] = [clampMidi(ctx.basePitch)];
  let cursor = clampMidi(ctx.basePitch);
  let rng = seed >>> 0;
  for (let i = 0; i < Math.max(1, pattern.defaultLength - 1); i++) {
    const baseInterval = pattern.intervals[i % pattern.intervals.length] ?? 0;
    rng += 17;
    const jitterRoll = seededUnit(rng);
    let interval = baseInterval;
    if (jitterRoll < 0.1) {
      const jitterDirection = seededUnit(rng + 73) < 0.5 ? -1 : 1;
      interval += jitterDirection;
    }
    rng += 31;
    if (seededUnit(rng) < 0.05) {
      continue;
    }
    cursor = clampMidi(cursor + interval);
    notes.push(cursor);
  }

  if (notes.length === 1) {
    notes.push(clampMidi(notes[0]! + (pattern.intervals[0] ?? 1)));
  }

  const slotDur = ctx.maxBeats / notes.length;
  let beatCursor = 0;
  return notes.map((midi, idx) => ({
    midi,
    durationBeats: slotDur,
    beat: beatCursor + idx * slotDur,
    role: idx === 0 || idx === notes.length - 1 ? 'target' : 'passing',
  }));
}

export function selectSlonimskyPattern(ctx: SlonimskyContext, seed: number): IntervalPattern | null {
  if (ctx.allowedOutsideLevel === 0) return null;
  const maxTension = (ctx.allowedOutsideLevel + 1) as 1 | 2 | 3;
  let filtered = SLONIMSKY_PATTERNS.filter((p) => p.tensionLevel <= maxTension);
  if (ctx.functionalStrength === 'strong') {
    filtered = filtered.filter((p) => p.tensionLevel <= 1);
  }
  switch (ctx.phraseIntent) {
    case 'build':
      filtered = filtered.filter((p) => p.id === 'p_expanding' || p.symmetryType === 'asymmetric');
      break;
    case 'release':
      filtered = filtered.filter((p) => p.id === 'p_contracting' || p.id === 'p_wholeTone');
      break;
    case 'float':
      filtered = filtered.filter((p) => p.id === 'p_wholeTone' || p.id === 'p_minorThirdCycle');
      break;
    case 'shock':
      filtered = filtered.filter((p) => p.id === 'p_tritonePole' || p.id === 'p_expanding');
      break;
    default:
      break;
  }
  if (filtered.length === 0) return null;
  return filtered[Math.abs(seed) % filtered.length] ?? null;
}

function barIsEligible(chord: string | undefined, ctx: SlonimskyContext): boolean {
  if (ctx.functionalStrength === 'weak' || ctx.functionalStrength === 'medium') return true;
  if (!chord) return false;
  const c = chord.toLowerCase();
  return c.includes('7') || c.includes('alt') || c.includes('b9');
}

export function applySlonimskyToMelodyLine(
  melody: SlonimskyNote[],
  chords: string[],
  ctx: SlonimskyContext,
  seed: number
): SlonimskyNote[] {
  if (melody.length < 3) return melody;
  const pattern = selectSlonimskyPattern(ctx, seed);
  if (!pattern) return melody;

  const out = melody.map((n) => ({ ...n }));
  const phraseBars = Math.max(1, Math.floor(ctx.maxBeats / 4));
  const phraseCount = Math.ceil(phraseBars / 4);

  for (let phrase = 0; phrase < phraseCount; phrase++) {
    const barStart = phrase * 4;
    const barEnd = Math.min(barStart + 4, phraseBars);
    let targetBar = -1;
    for (let b = barStart; b < barEnd; b++) {
      if (barIsEligible(chords[b], ctx)) {
        targetBar = b;
        break;
      }
    }
    if (targetBar < 0) continue;

    const beatStart = targetBar * 4;
    const beatSpan = 1 + (Math.abs(seed + phrase) % 2);
    const beatEnd = beatStart + beatSpan;
    const replacement = generateSlonimskyPattern(
      pattern,
      { ...ctx, maxBeats: beatSpan, basePitch: ctx.basePitch },
      seed + phrase * 101
    ).map((n) => ({
      ...n,
      beat: beatStart + n.beat,
      role: n.role === 'passing' ? 'pickup' : n.role,
    }));

    for (let i = 1; i < out.length - 1; i++) {
      const note = out[i]!;
      if (note.beat >= beatStart && note.beat < beatEnd) {
        note.durationBeats = 0;
      }
    }

    for (const rep of replacement) {
      out.push(rep);
    }
  }

  const preservedStart = out[0]!;
  const preservedEnd = out[out.length - 1]!;
  const compacted = out
    .filter((n) => n.durationBeats > 0)
    .sort((a, b) => a.beat - b.beat)
    .map((n) => ({ ...n }));
  if (compacted.length > 0) {
    compacted[0] = { ...preservedStart };
    compacted[compacted.length - 1] = { ...preservedEnd };
  }
  return compacted;
}
