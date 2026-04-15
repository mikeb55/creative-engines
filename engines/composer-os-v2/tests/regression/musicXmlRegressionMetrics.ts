/**
 * Phase 19.1 — lightweight MusicXML metrics for Big Band / String Quartet regression tests.
 * Parses score-partwise MusicXML (Composer OS exporter output) and returns stable summaries.
 */

import { DOMParser } from '@xmldom/xmldom';

/** Avoid DOM lib vs @xmldom Document collisions under ts-jest. */
type XmlDoc = ReturnType<DOMParser['parseFromString']>;
type XmlEl = ReturnType<XmlDoc['createElement']>;

const EPS = 1e-6;

/** C4 = 60 — MusicXML octave numbering. */
const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export type RegressionSuiteKind = 'bigBand' | 'stringQuartet';

export interface GeneralMusicXmlMetrics {
  barCount: number;
  partIds: string[];
  totalNonRestNotes: number;
  wholeNoteRatioGlobal: number;
  maxConsecutiveBarsHighWholeRatio: number;
  wholeRatioPerBar: number[];
  perPartNonRestNoteCounts: Record<string, number>;
}

export interface BigBandMusicXmlMetrics extends GeneralMusicXmlMetrics {
  kind: 'bigBand';
  maxAltoTenorUnisonStreak: number;
  maxTrumpetOctaveAboveAltoStreak: number;
  maxEmptyPianoBarsStreakWithHarmony: number;
}

export interface StringQuartetMusicXmlMetrics extends GeneralMusicXmlMetrics {
  kind: 'stringQuartet';
  maxConsecutiveDuplicateV1Bars: number;
  v1v2OnsetDiversity: number;
  maxWindowV1WholeDominance: number;
}

export type EnsembleRegressionMetrics = BigBandMusicXmlMetrics | StringQuartetMusicXmlMetrics;

export interface ExtractMusicXmlMetricsOptions {
  suite: RegressionSuiteKind;
}

function textContent(el: XmlEl, name: string): string | undefined {
  const c = el.getElementsByTagName(name)[0];
  return c?.textContent ?? undefined;
}

function midiFromPitchEl(pitch: XmlEl): number | null {
  const step = textContent(pitch, 'step');
  const oct = textContent(pitch, 'octave');
  if (!step || !oct) return null;
  const altRaw = textContent(pitch, 'alter');
  const alter = altRaw !== undefined ? Number(altRaw) : 0;
  const pc = (STEP_TO_PC[step] ?? 0) + alter;
  const o = Number(oct);
  if (!Number.isFinite(o)) return null;
  return (o + 1) * 12 + pc;
}

function parseDivisions(doc: XmlDoc): number {
  const attrs = doc.getElementsByTagName('attributes');
  for (let i = 0; i < attrs.length; i += 1) {
    const div = textContent(attrs[i]!, 'divisions');
    if (div !== undefined) {
      const n = Number(div);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 480;
}

function parseMeasureNumber(m: XmlEl): number {
  const raw = m.getAttribute('number');
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 1;
}

interface ParsedNote {
  isRest: boolean;
  duration: number;
  isChordTone: boolean;
  midi: number | null;
}

function collectNotesInMeasure(measure: XmlEl): ParsedNote[] {
  const out: ParsedNote[] = [];
  const notes = measure.getElementsByTagName('note');
  for (let i = 0; i < notes.length; i += 1) {
    const n = notes[i]!;
    const chord = n.getElementsByTagName('chord').length > 0;
    const rest = n.getElementsByTagName('rest').length > 0;
    const durRaw = textContent(n, 'duration');
    const duration = durRaw !== undefined ? Number(durRaw) : NaN;
    if (!Number.isFinite(duration)) continue;
    let midi: number | null = null;
    if (!rest) {
      const pitch = n.getElementsByTagName('pitch')[0];
      const unpitched = n.getElementsByTagName('unpitched')[0];
      if (pitch) midi = midiFromPitchEl(pitch);
      else if (unpitched) midi = null; // drums / unpitched — not comparable for horn metrics
    }
    out.push({ isRest: rest, duration, isChordTone: chord, midi });
  }
  return out;
}

/** First new attack (non-rest, not a &lt;chord/&gt; continuation). */
function firstAttackMidi(notes: ParsedNote[]): number | null {
  // Document order: chord stack shares attack with previous non-chord note.
  const first = notes.find((x) => !x.isRest && !x.isChordTone);
  return first?.midi ?? null;
}

function measureTicksWhole(divisions: number, beatsPerMeasure = 4): number {
  return divisions * beatsPerMeasure;
}

function barWholeAndNonRestCounts(notes: ParsedNote[], measureTicks: number): { whole: number; nonRest: number } {
  let nonRest = 0;
  let whole = 0;
  for (const n of notes) {
    if (n.isRest) continue;
    nonRest += 1;
    if (Math.abs(n.duration - measureTicks) < EPS) whole += 1;
  }
  return { whole, nonRest };
}

function buildPartMeasureMap(root: XmlDoc): Map<string, XmlEl[]> {
  const byPart = new Map<string, XmlEl[]>();
  const parts = root.getElementsByTagName('part');
  for (let pi = 0; pi < parts.length; pi += 1) {
    const part = parts[pi]!;
    const id = part.getAttribute('id') ?? `part_${pi}`;
    const measures: XmlEl[] = [];
    const ms = part.getElementsByTagName('measure');
    for (let mi = 0; mi < ms.length; mi += 1) measures.push(ms[mi]!);
    measures.sort((a, b) => parseMeasureNumber(a) - parseMeasureNumber(b));
    byPart.set(id, measures);
  }
  return byPart;
}

function measureHasHarmony(measure: XmlEl): boolean {
  return measure.getElementsByTagName('harmony').length > 0;
}

function pianoMeasureAllRest(notes: ParsedNote[]): boolean {
  if (notes.length === 0) return true;
  return notes.every((n) => n.isRest);
}

function maxRunConsecutiveTrue(flags: boolean[]): number {
  let best = 0;
  let cur = 0;
  for (const f of flags) {
    if (f) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

function v1BarFingerprint(notes: ParsedNote[]): string {
  const parts: string[] = [];
  for (const n of notes) {
    if (n.isRest) parts.push(`R:${n.duration}`);
    else parts.push(`N:${n.midi ?? 'u'}:${n.duration}`);
  }
  return parts.join('|');
}

function slidingWindowMaxMean(values: number[], window: number): number {
  if (values.length === 0 || window <= 0) return 0;
  if (values.length < window) {
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
  let best = 0;
  for (let i = 0; i <= values.length - window; i += 1) {
    let s = 0;
    for (let j = 0; j < window; j += 1) s += values[i + j]!;
    best = Math.max(best, s / window);
  }
  return best;
}

export function extractEnsembleMusicXmlMetrics(
  xml: string,
  opts: ExtractMusicXmlMetricsOptions
): EnsembleRegressionMetrics {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const root = doc.documentElement;
  if (!root) {
    throw new Error('MusicXML regression: empty document');
  }

  const divisions = parseDivisions(doc);
  const measureTicks = measureTicksWhole(divisions);

  const partMeasures = buildPartMeasureMap(doc);
  const partIds = [...partMeasures.keys()].sort();

  let maxBar = 0;
  for (const ms of partMeasures.values()) {
    for (const m of ms) maxBar = Math.max(maxBar, parseMeasureNumber(m));
  }
  const barCount = maxBar;

  const perPartNonRest: Record<string, number> = {};
  for (const id of partIds) perPartNonRest[id] = 0;

  let totalNonRest = 0;
  let totalWhole = 0;
  const wholeRatioPerBar: number[] = [];

  for (let bar = 1; bar <= barCount; bar += 1) {
    let barWhole = 0;
    let barNonRest = 0;
    for (const id of partIds) {
      const ms = partMeasures.get(id)!;
      const measure = ms.find((m) => parseMeasureNumber(m) === bar);
      if (!measure) continue;
      const notes = collectNotesInMeasure(measure);
      const { whole, nonRest } = barWholeAndNonRestCounts(notes, measureTicks);
      barWhole += whole;
      barNonRest += nonRest;
      perPartNonRest[id] = (perPartNonRest[id] ?? 0) + nonRest;
    }
    wholeRatioPerBar[bar - 1] = barNonRest > 0 ? barWhole / barNonRest : 0;
    totalWhole += barWhole;
    totalNonRest += barNonRest;
  }

  const wholeNoteRatioGlobal = totalNonRest > 0 ? totalWhole / totalNonRest : 0;

  let streakHigh = 0;
  {
    let cur = 0;
    for (const r of wholeRatioPerBar) {
      if (r > 0.8) {
        cur += 1;
        streakHigh = Math.max(streakHigh, cur);
      } else {
        cur = 0;
      }
    }
  }

  const general: GeneralMusicXmlMetrics = {
    barCount,
    partIds,
    totalNonRestNotes: totalNonRest,
    wholeNoteRatioGlobal,
    maxConsecutiveBarsHighWholeRatio: streakHigh,
    wholeRatioPerBar,
    perPartNonRestNoteCounts: perPartNonRest,
  };

  if (opts.suite === 'bigBand') {
    const msAlto = partMeasures.get('bb_alto_sax') ?? [];
    const msTen = partMeasures.get('bb_tenor_sax') ?? [];
    const msTrp = partMeasures.get('bb_trumpets') ?? [];
    const msPno = partMeasures.get('bb_piano') ?? [];
    const harmonyRef = msAlto;

    let maxUni = 0;
    let maxOct = 0;
    {
      let u = 0;
      let o = 0;
      for (let b = 1; b <= barCount; b += 1) {
        const a = msAlto.find((m) => parseMeasureNumber(m) === b);
        const t = msTen.find((m) => parseMeasureNumber(m) === b);
        const r = msTrp.find((m) => parseMeasureNumber(m) === b);
        if (!a || !t || !r) {
          u = 0;
          o = 0;
          continue;
        }
        const an = collectNotesInMeasure(a);
        const tn = collectNotesInMeasure(t);
        const rn = collectNotesInMeasure(r);
        const am = firstAttackMidi(an);
        const tm = firstAttackMidi(tn);
        const trm = firstAttackMidi(rn);
        if (am !== null && tm !== null && am === tm) {
          u += 1;
          maxUni = Math.max(maxUni, u);
        } else {
          u = 0;
        }
        if (am !== null && trm !== null && trm === am + 12) {
          o += 1;
          maxOct = Math.max(maxOct, o);
        } else {
          o = 0;
        }
      }
    }

    const flags: boolean[] = [];
    for (let b = 1; b <= barCount; b += 1) {
      const harm = harmonyRef.find((m) => parseMeasureNumber(m) === b);
      const p = msPno.find((m) => parseMeasureNumber(m) === b);
      const hasH = harm ? measureHasHarmony(harm) : false;
      const pnoNotes = p ? collectNotesInMeasure(p) : [];
      const emptyPno = pianoMeasureAllRest(pnoNotes);
      flags.push(hasH && emptyPno);
    }
    const maxPnoEmpty = maxRunConsecutiveTrue(flags);

    return {
      kind: 'bigBand',
      ...general,
      maxAltoTenorUnisonStreak: maxUni,
      maxTrumpetOctaveAboveAltoStreak: maxOct,
      maxEmptyPianoBarsStreakWithHarmony: maxPnoEmpty,
    };
  }

  // String quartet
  const msV1 = partMeasures.get('sq_violin_1') ?? [];
  const msV2 = partMeasures.get('sq_violin_2') ?? [];

  let maxDupV1 = 0;
  {
    let curDup = 1;
    let prevFp = '';
    for (let b = 1; b <= barCount; b += 1) {
      const m = msV1.find((x) => parseMeasureNumber(x) === b);
      const fp = m ? v1BarFingerprint(collectNotesInMeasure(m)) : '';
      if (fp === '') {
        prevFp = '';
        curDup = 1;
        continue;
      }
      if (prevFp !== '' && fp === prevFp) {
        curDup += 1;
        maxDupV1 = Math.max(maxDupV1, curDup);
      } else {
        curDup = 1;
      }
      prevFp = fp;
    }
  }

  let v1v2Div = 0;
  let v1v2Bars = 0;
  for (let b = 1; b <= barCount; b += 1) {
    const m1 = msV1.find((x) => parseMeasureNumber(x) === b);
    const m2 = msV2.find((x) => parseMeasureNumber(x) === b);
    if (!m1 || !m2) continue;
    const a = firstAttackMidi(collectNotesInMeasure(m1));
    const c = firstAttackMidi(collectNotesInMeasure(m2));
    if (a === null || c === null) continue;
    v1v2Bars += 1;
    if (a !== c) v1v2Div += 1;
  }
  const v1v2OnsetDiversity = v1v2Bars > 0 ? v1v2Div / v1v2Bars : 0;

  const v1WholeRatios: number[] = [];
  for (let b = 1; b <= barCount; b += 1) {
    const m = msV1.find((x) => parseMeasureNumber(x) === b);
    if (!m) {
      v1WholeRatios.push(0);
      continue;
    }
    const { whole, nonRest } = barWholeAndNonRestCounts(collectNotesInMeasure(m), measureTicks);
    v1WholeRatios.push(nonRest > 0 ? whole / nonRest : 0);
  }
  const maxWindowV1WholeDominance = slidingWindowMaxMean(v1WholeRatios, 4);

  return {
    kind: 'stringQuartet',
    ...general,
    maxConsecutiveDuplicateV1Bars: maxDupV1,
    v1v2OnsetDiversity,
    maxWindowV1WholeDominance,
  };
}

/**
 * Strips nondeterministic export fields so JSON snapshots stay stable across runs.
 */
export function normalizeMetricsForSnapshot(m: EnsembleRegressionMetrics): unknown {
  const base = { ...m };
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(o).sort();
    for (const k of keys) {
      const val = o[k];
      if (typeof val === 'number' && Number.isFinite(val)) out[k] = round(val);
      else out[k] = walk(val);
    }
    return out;
  };
  return walk(base);
}

/**
 * Normalizes raw MusicXML text for optional byte-level snapshot (still prefer metrics JSON).
 */
export function scrubMusicXmlForDiff(xml: string): string {
  let s = xml;
  s = s.replace(/encoding-date>[^<]+</g, 'encoding-date>__DATE__<');
  s = s.replace(/<creation[^>]*>[\s\S]*?<\/creation>/g, '<creation/>');
  s = s.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '__UUID__');
  return s;
}
