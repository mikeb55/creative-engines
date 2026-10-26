/**
 * Read-only MusicXML → long-line harmonic context.
 * Reuses ingestCanonicalScore. Does not invent harmony when marks are absent.
 * Does not rewrite the source score.
 */

import type { Rational } from '../bhl/bhlEvidence';
import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import {
  ingestCanonicalScore,
  type CanonicalEvaluationScore,
  type CanonicalEvent,
  type CanonicalHarmonyMark,
} from '../musical-evaluation/canonicalScore';
import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';
import { generateLongLinesOverHarmony } from './harmonicContext';
import {
  LONG_LINE_PRACTICE_VERSION,
  type LongLineHarmonyBar,
  type LongLineHarmonyStatus,
  type LongLineMusicXmlBarContext,
  type LongLineMusicXmlContext,
  type LongLineMusicXmlGenerateRequest,
  type LongLineMusicXmlGenerateResult,
  type LongLineMeter,
  type LongLineMusicXmlRange,
  type LongLineSourceMelodyEvent,
  type LongLineTimedBassEvent,
} from './types';

function rationalToQuarters(r: Rational): number {
  if (!r || !Number.isFinite(r.n) || !Number.isFinite(r.d) || r.d === 0) return 0;
  return r.n / r.d;
}

function rootName(step: string | undefined, alter: number | undefined): string | null {
  if (!step) return null;
  const a = alter ?? 0;
  if (a === 1) return `${step.toUpperCase()}#`;
  if (a === -1) return `${step.toUpperCase()}b`;
  if (a === 2) return `${step.toUpperCase()}##`;
  if (a === -2) return `${step.toUpperCase()}bb`;
  if (a === 0) return step.toUpperCase();
  return null;
}

/** Explicit MusicXML kind → chord-tone intervals from the root. No invented defaults. */
function intervalsForKind(kindValue: string | undefined, kindTextHint: string | undefined): number[] | null {
  const raw = (kindValue ?? '').trim().toLowerCase();
  const hint = (kindTextHint ?? '').trim().toLowerCase();
  const key = raw || hint;
  if (!key || key === 'none' || key === 'n.c.' || key === 'nc') return null;

  const table: Record<string, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    augmented: [0, 4, 8],
    diminished: [0, 3, 6],
    dominant: [0, 4, 7, 10],
    'major-seventh': [0, 4, 7, 11],
    'minor-seventh': [0, 3, 7, 10],
    'diminished-seventh': [0, 3, 6, 9],
    'half-diminished': [0, 3, 6, 10],
    'major-sixth': [0, 4, 7, 9],
    'minor-sixth': [0, 3, 7, 9],
    'dominant-ninth': [0, 4, 7, 10, 2],
    'major-ninth': [0, 4, 7, 11, 2],
    'minor-ninth': [0, 3, 7, 10, 2],
    'dominant-11th': [0, 4, 7, 10, 2, 5],
    'major-11th': [0, 4, 7, 11, 2, 5],
    'minor-11th': [0, 3, 7, 10, 2, 5],
    'dominant-13th': [0, 4, 7, 10, 2, 9],
    'major-13th': [0, 4, 7, 11, 2, 9],
    'minor-13th': [0, 3, 7, 10, 2, 9],
    'suspended-second': [0, 2, 7],
    'suspended-fourth': [0, 5, 7],
    power: [0, 7],
    // Common kind/@text suffixes when kind body is empty or custom
    '': [0, 4, 7],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    m: [0, 3, 7],
    '7': [0, 4, 7, 10],
    maj9: [0, 4, 7, 11, 2],
    m9: [0, 3, 7, 10, 2],
    '9': [0, 4, 7, 10, 2],
    sus4: [0, 5, 7],
    sus2: [0, 2, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    m7b5: [0, 3, 6, 10],
  };

  if (table[key]) return table[key]!;
  if (hint && table[hint]) return table[hint]!;
  return null;
}

function symbolSuffixForKind(kindValue: string | undefined, kindTextHint: string | undefined): string {
  const raw = (kindValue ?? '').trim().toLowerCase();
  const hint = (kindTextHint ?? '').trim();
  if (hint && !/^(major|minor|none)$/i.test(hint)) return hint;
  switch (raw) {
    case 'major':
    case 'none':
    case '':
      return '';
    case 'minor':
      return 'm';
    case 'dominant':
      return '7';
    case 'major-seventh':
      return 'maj7';
    case 'minor-seventh':
      return 'm7';
    case 'diminished':
      return 'dim';
    case 'augmented':
      return 'aug';
    case 'half-diminished':
      return 'm7b5';
    case 'major-sixth':
      return '6';
    case 'minor-sixth':
      return 'm6';
    case 'dominant-ninth':
      return '9';
    case 'major-ninth':
      return 'maj9';
    case 'minor-ninth':
      return 'm9';
    case 'suspended-fourth':
      return 'sus4';
    case 'suspended-second':
      return 'sus2';
    case 'power':
      return '5';
    default:
      return hint || raw;
  }
}

interface ResolvedHarmony {
  status: Exclude<LongLineHarmonyStatus, 'carried' | 'missing'>;
  pitchClasses: number[] | null;
  chordSymbol: string | null;
  issues: string[];
}

/** Fallback when legacy ingest only populated `text` (e.g. "Cmajor", "G7"). */
function rootAndKindFromText(text: string | undefined): { root: string; kindHint: string } | null {
  if (!text) return null;
  const match = text.trim().match(/^([A-Ga-g])([#b]{0,2})(.*)$/);
  if (!match) return null;
  const root = `${match[1]!.toUpperCase()}${match[2] ?? ''}`;
  return { root, kindHint: (match[3] ?? '').trim() };
}

/**
 * Resolve one MusicXML harmony mark to pitch classes.
 * Returns ambiguous/missing rather than inventing an unknown quality.
 */
export function resolveHarmonyMark(mark: CanonicalHarmonyMark): ResolvedHarmony {
  const issues: string[] = [];
  let root = rootName(mark.rootStep, mark.rootAlter);
  let kindValue = mark.kindValue?.trim() ?? '';
  let kindTextHint: string | undefined;

  if (mark.text) {
    const stripped = root
      ? mark.text.replace(new RegExp(`^${root.replace(/#/g, '\\#')}`), '').replace(/\/.*$/, '')
      : null;
    kindTextHint = stripped?.trim() || undefined;
  }

  if (!root) {
    const parsed = rootAndKindFromText(mark.text);
    if (parsed) {
      root = parsed.root;
      if (!kindValue) kindValue = parsed.kindHint;
      if (!kindTextHint) kindTextHint = parsed.kindHint || undefined;
    }
  }

  if (!root) {
    return {
      status: 'ambiguous',
      pitchClasses: null,
      chordSymbol: null,
      issues: [`bar ${mark.bar}: harmony mark missing root`],
    };
  }
  const rootPc = noteNameToPitchClass(root);
  if (rootPc === undefined) {
    return {
      status: 'ambiguous',
      pitchClasses: null,
      chordSymbol: null,
      issues: [`bar ${mark.bar}: unreadable root ${root}`],
    };
  }

  if (kindValue.toLowerCase() === 'none') {
    return {
      status: 'ambiguous',
      pitchClasses: null,
      chordSymbol: `${root} N.C.`,
      issues: [`bar ${mark.bar}: harmony kind is none (N.C.) — no pitch field`],
    };
  }

  const intervals = intervalsForKind(kindValue, kindTextHint);
  if (!intervals) {
    issues.push(`bar ${mark.bar}: unsupported or empty harmony kind "${kindValue || kindTextHint || ''}"`);
    return {
      status: 'ambiguous',
      pitchClasses: null,
      chordSymbol: `${root}${symbolSuffixForKind(kindValue, kindTextHint)}`,
      issues,
    };
  }

  const pcs = canonicalPitchSet(intervals.map((iv) => mod12(rootPc + iv)));
  let symbol = `${root}${symbolSuffixForKind(kindValue, kindTextHint)}`;
  if (mark.bassStep) {
    const bass = rootName(mark.bassStep, mark.bassAlter ?? 0);
    if (bass) symbol = `${symbol}/${bass}`;
  }
  return { status: 'explicit', pitchClasses: pcs, chordSymbol: symbol, issues };
}

function maxBar(score: CanonicalEvaluationScore): number {
  let max = 0;
  for (const m of score.measures) max = Math.max(max, m.bar);
  for (const e of score.sourceEvents) max = Math.max(max, e.bar);
  for (const h of score.harmony) max = Math.max(max, h.bar);
  return max;
}

function printedBarFor(score: CanonicalEvaluationScore, bar: number): string {
  const hit = score.measures.find((m) => m.bar === bar);
  return hit?.printedBar ?? String(bar);
}

/** First usable written metre for a bar (carried by the caller when unmarked). */
function meterInBar(score: CanonicalEvaluationScore, bar: number): LongLineMeter | null {
  const rows = score.measures.filter(
    (m) => m.bar === bar && !m.metreRejected && m.beats > 0 && m.beatType > 0,
  );
  if (!rows.length) return null;
  const preferred =
    rows.find((m) => {
      const part = score.parts.find((p) => p.id === m.partId);
      return part?.role === 'guitar';
    }) ?? rows[0]!;
  return { beats: preferred.beats, beatType: preferred.beatType };
}

/** Bass attacks in written/document order by onset — never sorted by pitch. */
function bassEventsInBar(events: readonly CanonicalEvent[], bar: number): LongLineTimedBassEvent[] {
  return events
    .filter((e) => e.bar === bar && e.role === 'bass' && !e.rest && e.soundingMidi !== null)
    .slice()
    .sort((a, b) => rationalToQuarters(a.onsetInBar) - rationalToQuarters(b.onsetInBar))
    .map((e) => ({
      startBeat: Math.round(rationalToQuarters(e.onsetInBar) * 1000) / 1000,
      duration: Math.round(rationalToQuarters(e.duration) * 1000) / 1000,
      midi: e.soundingMidi!,
    }));
}

function melodyEventsInBar(events: readonly CanonicalEvent[], bar: number, printedBar: string): LongLineSourceMelodyEvent[] {
  const melodic = events.filter(
    (e) =>
      e.bar === bar &&
      e.role !== 'bass' &&
      e.role !== 'percussion' &&
      !e.rest &&
      e.soundingMidi !== null,
  );
  // Prefer guitar when present; otherwise keep all non-bass pitched parts.
  const guitars = melodic.filter((e) => e.role === 'guitar');
  const use = guitars.length > 0 ? guitars : melodic;
  return use.map((e) => ({
    sourceBar: bar,
    printedBar,
    partId: e.partId,
    partName: e.partName,
    onsetQuarters: Math.round(rationalToQuarters(e.onsetInBar) * 1000) / 1000,
    durationQuarters: Math.round(rationalToQuarters(e.duration) * 1000) / 1000,
    midi: e.soundingMidi!,
    pitchClass: mod12(e.soundingMidi!),
  }));
}

function firstHarmonyInBar(marks: readonly CanonicalHarmonyMark[], bar: number): CanonicalHarmonyMark | undefined {
  const inBar = marks.filter((m) => m.bar === bar);
  if (!inBar.length) return undefined;
  return inBar.slice().sort((a, b) => rationalToQuarters(a.onsetInBar) - rationalToQuarters(b.onsetInBar))[0];
}

/**
 * Extract per-bar harmonic fields, bass notes and melody from MusicXML for a bar range.
 * Missing / ambiguous harmony is reported; fields are not invented from melody.
 */
export function extractLongLineMusicXmlContext(
  xml: string,
  range: LongLineMusicXmlRange,
): LongLineMusicXmlContext {
  const issues: string[] = [];
  // Strict source populates rootStep / kindValue on harmony marks.
  const ingest = ingestCanonicalScore(xml, { strictSource: true });
  if (ingest.parseError || !ingest.score) {
    const msg = ingest.parseError ?? 'MusicXML ingest failed';
    return {
      version: LONG_LINE_PRACTICE_VERSION,
      sourceSha256: ingest.sha256,
      range: { startBar: range.startBar, endBar: range.endBar },
      bars: [],
      tempoBpm: null,
      issues: [msg],
      canGenerate: false,
    };
  }

  const score = ingest.score;
  const startBar = Math.trunc(range.startBar);
  const endBar = Math.trunc(range.endBar);
  if (!Number.isFinite(startBar) || !Number.isFinite(endBar) || startBar < 1 || endBar < startBar) {
    return {
      version: LONG_LINE_PRACTICE_VERSION,
      sourceSha256: ingest.sha256,
      range: { startBar, endBar },
      bars: [],
      tempoBpm: null,
      issues: [`invalid bar range ${startBar}–${endBar}`],
      canGenerate: false,
    };
  }

  const last = maxBar(score);
  if (endBar > last) {
    issues.push(`endBar ${endBar} exceeds score length ${last}`);
  }

  // Carry state starts from before the selection so a chord/metre stated earlier can fill the first selected bar.
  let carriedPcs: number[] | null = null;
  let carriedSymbol: string | null = null;
  let carriedMeter: LongLineMeter | null = null;
  for (let bar = 1; bar < startBar; bar += 1) {
    const priorMeter = meterInBar(score, bar);
    if (priorMeter) carriedMeter = priorMeter;
    const mark = firstHarmonyInBar(score.harmony, bar);
    if (!mark) continue;
    const resolved = resolveHarmonyMark(mark);
    if (resolved.pitchClasses) {
      carriedPcs = [...resolved.pitchClasses];
      carriedSymbol = resolved.chordSymbol;
    } else if (resolved.status === 'ambiguous' && (mark.kindValue ?? '').toLowerCase() === 'none') {
      carriedPcs = null;
      carriedSymbol = null;
    }
  }

  const bars: LongLineMusicXmlBarContext[] = [];
  for (let bar = startBar; bar <= endBar && bar <= Math.max(last, endBar); bar += 1) {
    if (bar > last) {
      bars.push({
        sourceBar: bar,
        printedBar: String(bar),
        harmonyStatus: 'missing',
        chordSymbol: null,
        pitchClasses: null,
        meter: carriedMeter,
        bassMidis: [],
        bassEvents: [],
        melodyEvents: [],
        issues: [`bar ${bar} not in score`],
      });
      issues.push(`bar ${bar} not in score`);
      continue;
    }

    const printedBar = printedBarFor(score, bar);
    const foundMeter = meterInBar(score, bar);
    if (foundMeter) carriedMeter = foundMeter;
    const meter = foundMeter ?? carriedMeter;
    const bassEvents = bassEventsInBar(score.soundingEvents, bar);
    const bassMidis = bassEvents.map((e) => e.midi);
    const melodyEvents = melodyEventsInBar(score.soundingEvents, bar, printedBar);
    const mark = firstHarmonyInBar(score.harmony, bar);
    const barIssues: string[] = [];

    let harmonyStatus: LongLineHarmonyStatus;
    let pitchClasses: number[] | null = null;
    let chordSymbol: string | null = null;

    if (mark) {
      const resolved = resolveHarmonyMark(mark);
      barIssues.push(...resolved.issues);
      if (resolved.pitchClasses) {
        harmonyStatus = 'explicit';
        pitchClasses = resolved.pitchClasses;
        chordSymbol = resolved.chordSymbol;
        carriedPcs = [...resolved.pitchClasses];
        carriedSymbol = resolved.chordSymbol;
      } else {
        harmonyStatus = 'ambiguous';
        pitchClasses = null;
        chordSymbol = resolved.chordSymbol;
        if ((mark.kindValue ?? '').toLowerCase() === 'none') {
          carriedPcs = null;
          carriedSymbol = null;
        }
        issues.push(...resolved.issues);
      }
    } else if (carriedPcs) {
      harmonyStatus = 'carried';
      pitchClasses = [...carriedPcs];
      chordSymbol = carriedSymbol;
    } else {
      harmonyStatus = 'missing';
      pitchClasses = null;
      chordSymbol = null;
      barIssues.push(`bar ${bar}: no harmony mark and nothing to carry`);
      issues.push(`bar ${bar}: missing harmony`);
    }

    bars.push({
      sourceBar: bar,
      printedBar,
      harmonyStatus,
      chordSymbol,
      pitchClasses,
      meter,
      bassMidis,
      bassEvents,
      melodyEvents,
      issues: barIssues,
    });
  }

  const canGenerate = bars.length > 0 && bars.every((b) => b.pitchClasses !== null && b.pitchClasses.length > 0);

  return {
    version: LONG_LINE_PRACTICE_VERSION,
    sourceSha256: ingest.sha256,
    range: { startBar, endBar },
    bars,
    tempoBpm: readVerifiedTempoBpm(xml, score, startBar, endBar),
    issues,
    canGenerate,
  };
}

/**
 * Verified tempo from the source file only.
 * Prefers ingest tempo directions with playbackBpm; otherwise reads `<sound tempo="…">`
 * from the MusicXML (strict ingest does not always surface bare sound nodes).
 */
function readVerifiedTempoBpm(
  xml: string,
  score: CanonicalEvaluationScore,
  startBar: number,
  endBar: number,
): number | null {
  const marks = score.directions
    .filter((d) => d.kind === 'tempo' && d.bar <= endBar)
    .sort((a, b) => a.bar - b.bar);
  for (const mark of marks) {
    const bpm = mark.playbackBpm;
    if (typeof bpm === 'number' && Number.isFinite(bpm) && bpm > 0) {
      if (mark.bar <= endBar) return Math.round(bpm);
    }
    // Metronome text "quarter = 96" when playbackBpm is absent.
    const per = mark.text.match(/=\s*(\d+(?:\.\d+)?)/);
    if (per && mark.bar >= startBar - 32 && mark.bar <= endBar) {
      const n = Number(per[1]);
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  const sound = xml.match(/<sound\b[^>]*\btempo="([0-9.]+)"/i);
  if (sound) {
    const n = Number(sound[1]);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

/**
 * Extract MusicXML context and, when every selected bar has a verified field,
 * generate Lyrical / Intervallic / Experimental lines over those fields.
 */
export function generateLongLinesFromMusicXml(
  request: LongLineMusicXmlGenerateRequest,
): LongLineMusicXmlGenerateResult {
  const context = extractLongLineMusicXmlContext(request.xml, request.range);
  if (!context.canGenerate) {
    return { context, harmony: null };
  }

  const harmonyBars: LongLineHarmonyBar[] = context.bars.map((bar) => ({
    pitchClasses: bar.pitchClasses!,
    bassMidis: bar.bassMidis,
    bassEvents: bar.bassEvents,
    meter: bar.meter ?? undefined,
  }));

  const harmony = generateLongLinesOverHarmony({
    bars: harmonyBars,
    register: request.register,
    seed: request.seed,
    beatsPerBar: request.beatsPerBar,
    profiles: request.profiles,
  });

  return { context, harmony };
}
