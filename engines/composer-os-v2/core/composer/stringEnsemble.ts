/**
 * Phase 6+7 — string quartet instrument definitions + range / doubling policy (concert pitch).
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';
import type { CompositionContext } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { chordTonesForChordSymbolWithContext } from '../harmony/harmonyChordTonePolicy';
import { createPart, createNote, createScore, addEvent } from '../score-model/scoreEventBuilder';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMeterForBar } from '../rhythm/oddMeterQuantiser';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';

export type StringInstrumentId = 'violin_I' | 'violin_II' | 'viola' | 'cello';

export interface StringInstrument {
  id: StringInstrumentId;
  midiChannel: number;
  rangeMin: number;
  rangeMax: number;
  clef: 'treble' | 'alto' | 'bass';
  defaultBowing: 'arco' | 'pizzicato';
  transposition: 0;
}

export const STRING_INSTRUMENTS: Record<StringInstrumentId, StringInstrument> = {
  violin_I: {
    id: 'violin_I',
    midiChannel: 1,
    rangeMin: 55,
    rangeMax: 103,
    clef: 'treble',
    defaultBowing: 'arco',
    transposition: 0,
  },
  violin_II: {
    id: 'violin_II',
    midiChannel: 2,
    rangeMin: 55,
    rangeMax: 98,
    clef: 'treble',
    defaultBowing: 'arco',
    transposition: 0,
  },
  viola: {
    id: 'viola',
    midiChannel: 3,
    rangeMin: 48,
    rangeMax: 91,
    clef: 'alto',
    defaultBowing: 'arco',
    transposition: 0,
  },
  cello: {
    id: 'cello',
    midiChannel: 4,
    rangeMin: 36,
    rangeMax: 76,
    clef: 'bass',
    defaultBowing: 'arco',
    transposition: 0,
  },
};

export function pitchInStringInstrumentRange(inst: StringInstrument, midi: number): boolean {
  return midi >= inst.rangeMin && midi <= inst.rangeMax;
}

/** MusicXML C clef on line 3 = alto (viola). */
export function violaClefAttributesSnippet(): string {
  return '<clef><sign>C</sign><line>3</line></clef>';
}

export type SectionRoleHint = 'intro' | 'outro' | 'shout-chorus' | string;

export function defaultBowingForSectionRole(role: SectionRoleHint, antiMetric: boolean): 'arco' | 'pizzicato' {
  if (role === 'intro' || role === 'outro') return 'pizzicato';
  if (antiMetric) return 'arco';
  return 'arco';
}

export function useColLegnoNotehead(antiMetric: boolean): boolean {
  return antiMetric;
}

/**
 * Schneider: penalise octave doubling outside shout-chorus; Mingus: cello doubles bass (informational score).
 */
export function schneiderOctaveDoublingPenalty(
  bundle: VoiceRuleBundle | undefined,
  sectionRole: SectionRoleHint,
  hasOctaveDouble: boolean
): number {
  if (bundle?.voiceId !== 'maria_schneider') return 0;
  if (!hasOctaveDouble) return 0;
  if (sectionRole === 'shout-chorus') return 0;
  return 55;
}

export function validateViolinFirstPitchOrReject(midi: number): { ok: true } | { ok: false; reason: string } {
  const v = STRING_INSTRUMENTS.violin_I;
  if (!pitchInStringInstrumentRange(v, midi)) {
    return { ok: false, reason: `violin_I out of range ${v.rangeMin}-${v.rangeMax}` };
  }
  return { ok: true };
}

function barQuarterSpan(bar1Based: number, map: BarMeterMap | undefined): number {
  const sig = resolveMeterForBar(bar1Based, map);
  return (sig.numerator * 4) / sig.denominator;
}

function liftMidiToRange(midi: number, lo: number, hi: number): number {
  let m = Math.round(midi);
  if (!Number.isFinite(m)) return lo;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return Math.max(lo, Math.min(hi, m));
}

const QUARTET_PART_BUILD_ORDER: StringInstrumentId[] = ['violin_I', 'violin_II', 'viola', 'cello'];

function sqPartMeta(id: StringInstrumentId): {
  partId: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
} {
  switch (id) {
    case 'violin_I':
      return { partId: SQ_PART_V1, name: 'Violin I', instrumentIdentity: 'violin_1', midiProgram: 40, clef: 'treble' };
    case 'violin_II':
      return { partId: SQ_PART_V2, name: 'Violin II', instrumentIdentity: 'violin_2', midiProgram: 40, clef: 'treble' };
    case 'viola':
      return { partId: SQ_PART_VA, name: 'Viola', instrumentIdentity: 'viola', midiProgram: 41, clef: 'treble' };
    case 'cello':
      return { partId: SQ_PART_VC, name: 'Violoncello', instrumentIdentity: 'cello', midiProgram: 42, clef: 'bass' };
  }
}

/** Phase 6+7 — one string quartet part per instrument (monophonic whole-bar tones, no stacked `<chord/>`). */
export interface StringQuartetPartContext {
  instrumentId: StringInstrumentId;
  partId: string;
  part: PartModel;
}

export function buildStringQuartetParts(context: CompositionContext): StringQuartetPartContext[] {
  const tb = context.form.totalBars;
  const seed = context.seed ?? 1;
  const barMeterMap = context.barMeterMap ?? context.generationMetadata?.barMeterMap;

  const chordPerBar = (bar: number) => getChordForBar(bar, context);
  const rehearsalPerBar = (_bar: number): string | undefined => undefined;

  const contexts: StringQuartetPartContext[] = [];

  for (const instId of QUARTET_PART_BUILD_ORDER) {
    const meta = sqPartMeta(instId);
    const rangeSpec = STRING_INSTRUMENTS[instId];
    const part = createPart(
      meta.partId,
      meta.name,
      meta.instrumentIdentity,
      meta.midiProgram,
      meta.clef,
      tb,
      chordPerBar,
      rehearsalPerBar
    );

    for (let bar = 1; bar <= tb; bar++) {
      const sym = chordPerBar(bar);
      const tones = chordTonesForChordSymbolWithContext(sym, context);
      const span = barQuarterSpan(bar, barMeterMap);
      const m = part.measures[bar - 1]!;
      m.events = [];

      let midi =
        instId === 'violin_I'
          ? tones.seventh
          : instId === 'violin_II'
            ? tones.fifth
            : instId === 'viola'
              ? tones.third
              : tones.root;

      const salt = (seed + bar * 17 + instId.charCodeAt(0)) >>> 0;
      const jitter = (salt % 3) - 1;
      midi = liftMidiToRange(midi + jitter, rangeSpec.rangeMin, rangeSpec.rangeMax);

      addEvent(m, createNote(midi, 0, span, 1));
    }

    contexts.push({ instrumentId: instId, partId: meta.partId, part });
  }

  return contexts;
}

/** Assemble a MusicXML-ready quartet score (four bowed parts only). */
export function buildStringQuartetScoreFromContext(context: CompositionContext, baseScore?: ScoreModel): ScoreModel {
  const ctxs = buildStringQuartetParts(context);
  const score = createScore(baseScore?.title ?? 'String Quartet', ctxs.map((c) => c.part), {
    tempo: baseScore?.tempo,
  });
  if (baseScore?.keySignature) {
    score.keySignature = { ...baseScore.keySignature };
  }
  const bm = context.barMeterMap ?? baseScore?.barMeterMap;
  if (bm) score.barMeterMap = bm;
  return score;
}
