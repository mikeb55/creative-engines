/**
 * MusicXML post-process — Orbit solo musicality (monophonic, D4–D6, min eighth).
 */

import {
  clampSoloMelodicMidi,
  SOLO_MAX_CONSECUTIVE_EIGHTHS,
  SOLO_MIN_DURATION_BEATS,
  SOLO_PHRASE_REST_MIN_BEATS,
} from './soloMusicality';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchToMidi(step: string, alter: number | undefined, octave: number): number {
  return (octave + 1) * 12 + (STEP[step.toUpperCase()] ?? 0) + (alter ?? 0);
}

function midiToPitch(midi: number): { step: string; alter?: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const names: [string, number][] = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1],
    ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
  ];
  const [step, alter] = names[pc]!;
  return { step, alter: alter || undefined, octave };
}

type XmlNote = {
  isRest: boolean;
  isChord: boolean;
  step?: string;
  alter?: number;
  octave?: number;
  durationDiv: number;
  type?: string;
  voice?: string;
  raw: string;
};

function parseNoteBlock(block: string): XmlNote {
  return {
    isRest: /<rest/.test(block),
    isChord: /<chord\s*\/>/.test(block),
    step: block.match(/<step>([A-G])<\/step>/)?.[1],
    alter: block.match(/<alter>(-?\d+)<\/alter>/)?.[1]
      ? parseInt(block.match(/<alter>(-?\d+)<\/alter>/)![1]!, 10)
      : undefined,
    octave: block.match(/<octave>(\d+)<\/octave>/)?.[1]
      ? parseInt(block.match(/<octave>(\d+)<\/octave>/)![1]!, 10)
      : undefined,
    durationDiv: parseInt(block.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '1', 10),
    type: block.match(/<type>([^<]+)<\/type>/)?.[1],
    voice: block.match(/<voice>(\d+)<\/voice>/)?.[1],
    raw: block,
  };
}

export const SOLO_EXPORT_DIVISIONS = 480;

const TYPE_BEAT_FRACTION: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

/** Implied duration from {@code type} + {@code dot} count at {@code divisions}. */
export function durationFromTypeAndDot(
  type: string,
  dots: number,
  divisions = SOLO_EXPORT_DIVISIONS,
): number {
  const base = TYPE_BEAT_FRACTION[type] ?? 0;
  if (base <= 0) return 0;
  let dur = base * divisions;
  let add = dur / 2;
  for (let i = 0; i < dots; i++) {
    dur += add;
    add /= 2;
  }
  return Math.round(dur);
}

/** Map duration → Sibelius-safe {@code type} + dot count (divisions=480 default). */
export function durationToTypeAndDot(
  duration: number,
  divisions = SOLO_EXPORT_DIVISIONS,
): { type: string; dots: number } {
  const d = Math.round(duration);
  const candidates: { type: string; dots: number }[] = [
    { type: 'whole', dots: 0 },
    { type: 'half', dots: 1 },
    { type: 'half', dots: 0 },
    { type: 'quarter', dots: 1 },
    { type: 'quarter', dots: 0 },
    { type: 'eighth', dots: 1 },
    { type: 'eighth', dots: 0 },
    { type: 'sixteenth', dots: 1 },
    { type: 'sixteenth', dots: 0 },
  ];
  for (const c of candidates) {
    if (durationFromTypeAndDot(c.type, c.dots, divisions) === d) return c;
  }
  let best = candidates[0]!;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const implied = durationFromTypeAndDot(c.type, c.dots, divisions);
    const diff = Math.abs(implied - d);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

function typeDotXml(type: string, dots: number): string {
  const dotPart = dots > 0 ? '<dot/>'.repeat(dots) : '';
  return `<type>${type}</type>${dotPart}`;
}

function minDivForEighth(divisions: number): number {
  return Math.max(1, Math.round(divisions / 2));
}

function standardDurations(divisions: number): number[] {
  return [
    Math.round(divisions / 2),
    Math.round(divisions * 0.75),
    divisions,
    Math.round(divisions * 1.5),
    divisions * 2,
    Math.round(divisions * 3),
    divisions * 4,
  ];
}

function snapToStandardDuration(d: number, divisions: number): number {
  const target = Math.round(d);
  let best = standardDurations(divisions)[0]!;
  let bestDiff = Infinity;
  for (const s of standardDurations(divisions)) {
    const diff = Math.abs(s - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return best;
}

function quantizeDiv(d: number, divisions: number): number {
  const eighth = minDivForEighth(divisions);
  const quarter = divisions;
  const dotted = Math.round(divisions * 1.5);
  const half = divisions * 2;
  let raw: number;
  if (d <= eighth) raw = eighth;
  else if (d <= quarter) raw = quarter;
  else if (d <= dotted) raw = dotted;
  else if (d <= half) raw = half;
  else raw = Math.min(divisions * 4, Math.round(d / eighth) * eighth);
  return snapToStandardDuration(raw, divisions);
}

function typeForDiv(d: number, divisions: number): string {
  return durationToTypeAndDot(d, divisions).type;
}

function formatRestXml(durationDiv: number, divisions: number, voice = '1'): string {
  const { type, dots } = durationToTypeAndDot(durationDiv, divisions);
  return `<note><rest/><duration>${durationDiv}</duration><voice>${voice}</voice>${typeDotXml(type, dots)}</note>`;
}

function chordTonePcs(symbol: string): Set<number> {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const rootM = hp.match(/^([A-G](?:#|b)?)/i);
  const root = rootM?.[1] ? (noteNameToPitchClass(rootM[1]) ?? 0) : 0;
  const pcs = new Set<number>([root]);
  if (/maj/i.test(hp) || /Δ/.test(hp)) {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
  } else if (/m(?!aj)/i.test(hp) && !/maj/i.test(hp)) {
    pcs.add((root + 3) % 12);
    pcs.add((root + 7) % 12);
  } else if (/7/.test(hp)) {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
    pcs.add((root + 10) % 12);
  } else {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
  }
  return pcs;
}

function snapMidiToHarmony(midi: number, symbol: string): number {
  if (/^NC$/i.test(symbol)) return clampSoloMelodicMidi(midi);
  const tones = chordTonePcs(symbol);
  const pc = ((midi % 12) + 12) % 12;
  if (tones.has(pc)) return clampSoloMelodicMidi(midi);
  let best = midi;
  let bestDist = 99;
  for (const t of tones) {
    for (const oct of [-12, 0, 12]) {
      const candidate = clampSoloMelodicMidi(midi - pc + t + oct);
      const dist = Math.abs(candidate - midi);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

/** Ensure note list sums exactly to barLen divisions — pad rest or trim last note. */
export function rebalanceBar(
  notes: XmlNote[],
  barLen: number,
  divisions: number,
): XmlNote[] {
  const eighth = minDivForEighth(divisions);
  const trimmed: XmlNote[] = [];
  let pos = 0;

  for (const n of notes) {
    const dur = quantizeDiv(n.durationDiv, divisions);
    if (pos >= barLen - 0.01) break;
    if (pos + dur > barLen + 0.01) {
      const remaining = Math.round(barLen - pos);
      if (remaining >= eighth) {
        trimmed.push({ ...n, durationDiv: remaining });
      }
      pos = barLen;
      break;
    }
    trimmed.push({ ...n, durationDiv: dur });
    pos += dur;
  }

  const remainder = Math.round(barLen - pos);
  if (remainder >= eighth) {
    trimmed.push({
      isRest: true,
      isChord: false,
      durationDiv: remainder,
      raw: '',
    });
  } else if (remainder > 0 && trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1]!;
    trimmed[trimmed.length - 1] = { ...last, durationDiv: last.durationDiv + remainder };
  } else if (trimmed.length === 0) {
    trimmed.push({
      isRest: true,
      isChord: false,
      durationDiv: barLen,
      raw: '',
    });
  }

  return trimmed;
}

export type MeasureTimeContext = {
  divisions: number;
  beats: number;
  beatType: number;
};

export const DEFAULT_MEASURE_TIME_CONTEXT: MeasureTimeContext = {
  divisions: SOLO_EXPORT_DIVISIONS,
  beats: 4,
  beatType: 4,
};

export function parseAttributesFromBody(body: string): Partial<MeasureTimeContext> {
  const out: Partial<MeasureTimeContext> = {};
  const div = body.match(/<divisions>(\d+)<\/divisions>/)?.[1];
  if (div) out.divisions = parseInt(div, 10);
  const beats = body.match(/<beats>(\d+)<\/beats>/)?.[1];
  if (beats) out.beats = parseInt(beats, 10);
  const beatType = body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1];
  if (beatType) out.beatType = parseInt(beatType, 10);
  return out;
}

export function advanceMeasureContext(
  ctx: MeasureTimeContext,
  body: string,
): MeasureTimeContext {
  const parsed = parseAttributesFromBody(body);
  return {
    divisions: parsed.divisions ?? ctx.divisions,
    beats: parsed.beats ?? ctx.beats,
    beatType: parsed.beatType ?? ctx.beatType,
  };
}

export function expectedMeasureDuration(ctx: MeasureTimeContext): number {
  return (ctx.divisions * ctx.beats * 4) / ctx.beatType;
}

/** Expected bar length — pass {@link ctx} for measures without inline {@code <divisions>}. */
export function measureBarLengthFromBody(body: string, ctx?: MeasureTimeContext): number {
  const base = ctx ?? DEFAULT_MEASURE_TIME_CONTEXT;
  return expectedMeasureDuration(advanceMeasureContext(base, body));
}

function rescaleDurationsInBody(body: string, factor: number): string {
  return body.replace(/<duration>(\d+)<\/duration>/g, (_, d) => {
    const scaled = Math.max(1, Math.round(parseInt(d, 10) * factor));
    return `<duration>${scaled}</duration>`;
  });
}

/**
 * Force divisions=480 scale on every measure; declare {@code <divisions>480</divisions>}
 * in bar 1 attributes only.
 */
export function normalizeSoloExportDivisions(
  xml: string,
  targetDivisions = SOLO_EXPORT_DIVISIONS,
): string {
  return xml.replace(/<part id="[^"]+"[\s\S]*?<\/part>/g, (partBlock) => {
    let ctx: MeasureTimeContext = { ...DEFAULT_MEASURE_TIME_CONTEXT };
    return partBlock.replace(
      /<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g,
      (full, a1, numStr, a2, body) => {
        const barNum = parseInt(numStr, 10);
        const before = ctx;
        const declared = parseAttributesFromBody(body);
        const activeDiv = declared.divisions ?? before.divisions;

        let newBody = body;
        if (activeDiv !== targetDivisions) {
          const factor = targetDivisions / activeDiv;
          newBody = rescaleDurationsInBody(newBody, factor);
        }

        if (barNum === 1) {
          if (/<divisions>\d+<\/divisions>/.test(newBody)) {
            newBody = newBody.replace(
              /<divisions>\d+<\/divisions>/,
              `<divisions>${targetDivisions}</divisions>`,
            );
          } else if (/<attributes>/.test(newBody)) {
            newBody = newBody.replace(
              /<attributes>/,
              `<attributes>\n        <divisions>${targetDivisions}</divisions>`,
            );
          }
        } else {
          newBody = newBody.replace(/<attributes>\s*<divisions>\d+<\/divisions>\s*/g, '<attributes>');
          newBody = newBody.replace(/<divisions>\d+<\/divisions>\s*/g, '');
        }

        ctx = {
          divisions: targetDivisions,
          beats: declared.beats ?? before.beats,
          beatType: declared.beatType ?? before.beatType,
        };
        return `<measure${a1}number="${numStr}"${a2}>${newBody}</measure>`;
      },
    );
  });
}

export function sumNonChordNoteDuration(body: string): number {
  let pos = 0;
  for (const nb of body.matchAll(/<note>([\s\S]*?)<\/note>/g)) {
    const block = nb[1]!;
    if (/<chord\s*\/>/.test(block)) continue;
    pos += parseInt(block.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
  }
  return pos;
}

export type BarTotalIssue = {
  filename?: string;
  barNum: number;
  divisions: number;
  expected: number;
  actual: number;
};

function collectBarTotalIssuesInPart(part: string, filename?: string): BarTotalIssue[] {
  const issues: BarTotalIssue[] = [];
  let ctx: MeasureTimeContext = { ...DEFAULT_MEASURE_TIME_CONTEXT };
  for (const m of part.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)) {
    const barNum = parseInt(m[1]!, 10);
    const body = m[2]!;
    ctx = advanceMeasureContext(ctx, body);
    const expected = expectedMeasureDuration(ctx);
    const actual = sumNonChordNoteDuration(body);
    if (Math.abs(actual - expected) > 0.01) {
      issues.push({ filename, barNum, divisions: ctx.divisions, expected, actual });
    }
  }
  return issues;
}

/** Return every bar whose note durations do not sum to full measure length. */
export function findBarTotalIssues(xml: string, filename?: string): BarTotalIssue[] {
  const parts = [...xml.matchAll(/<part id="[^"]+"[\s\S]*?<\/part>/g)].map((m) => m[0]!);
  if (parts.length > 0) {
    return parts.flatMap((part) => collectBarTotalIssuesInPart(part, filename));
  }
  return collectBarTotalIssuesInPart(xml, filename);
}

function rebalancePartMeasures(partBlock: string): string {
  let ctx: MeasureTimeContext = { ...DEFAULT_MEASURE_TIME_CONTEXT };
  return partBlock.replace(
    /<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g,
    (full, a1, numStr, a2, body) => {
      ctx = advanceMeasureContext(ctx, body);
      const divisions = ctx.divisions;
      const barLen = expectedMeasureDuration(ctx);
      const head = body.replace(/<note>[\s\S]*?<\/note>/g, '').trimEnd();
      const rawNotes = [...body.matchAll(/<note>([\s\S]*?)<\/note>/g)].map((m) =>
        parseNoteBlock(m[1]!),
      );
      const balanced = rebalanceBar(rawNotes, barLen, divisions);
      const rebuilt = balanced.map((n) =>
        n.isRest
          ? formatRestXml(n.durationDiv, divisions, n.voice ?? '1')
          : formatNoteXml(n, divisions),
      );
      const newBody = (head ? head + '\n      ' : '') + rebuilt.join('\n      ') + '\n      ';
      return `<measure${a1}number="${numStr}"${a2}>${newBody}</measure>`;
    },
  );
}

/** Rebalance every measure in MusicXML to exact bar length. */
export function rebalanceMusicXmlBarTotals(xml: string): string {
  if (/<part id="[^"]+"/.test(xml)) {
    return xml.replace(/<part id="[^"]+"[\s\S]*?<\/part>/g, (partBlock) =>
      rebalancePartMeasures(partBlock),
    );
  }
  return rebalancePartMeasures(xml);
}

function formatNoteXml(
  n: XmlNote,
  divisions: number,
  snap?: { barNum: number; harmonyBars: readonly string[]; globalIdx: number },
): string {
  const dur = quantizeDiv(n.durationDiv, divisions);
  const { type, dots } = durationToTypeAndDot(dur, divisions);
  const voice = n.voice ?? '1';
  if (n.isRest) {
    return `<note><rest/><duration>${dur}</duration><voice>${voice}</voice>${typeDotXml(type, dots)}</note>`;
  }
  let midi = pitchToMidi(n.step!, n.alter, n.octave!);
  if (snap && snap.globalIdx % 4 === 3) {
    const sym = snap.harmonyBars[snap.barNum - 1] ?? 'C';
    midi = snapMidiToHarmony(midi, sym);
  } else if (snap && snap.globalIdx % 4 === 2) {
    const sym = snap.harmonyBars[snap.barNum - 1] ?? 'C';
    midi = snapMidiToHarmony(midi, sym);
  }
  midi = clampSoloMelodicMidi(midi);
  const p = midiToPitch(midi);
  const alterXml = p.alter != null ? `<alter>${p.alter}</alter>` : '';
  return `<note><pitch><step>${p.step}</step>${alterXml}<octave>${p.octave}</octave></pitch><duration>${dur}</duration><voice>${voice}</voice>${typeDotXml(type, dots)}</note>`;
}

function fixNoteInnerTypeDot(inner: string, divisions: number): string {
  if (/<chord\s*\/>/.test(inner)) return inner;
  const rawDur = parseInt(inner.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
  const dur = snapToStandardDuration(rawDur, divisions);
  const { type, dots } = durationToTypeAndDot(dur, divisions);
  let s = inner.replace(/<type>[^<]*<\/type>/g, '').replace(/<dot\s*\/>/g, '');
  s = s.replace(/<duration>\d+<\/duration>/, `<duration>${dur}</duration>`);
  const td = typeDotXml(type, dots);
  if (/<voice>\d+<\/voice>/.test(s)) {
    s = s.replace(/(<voice>\d+<\/voice>)/, `$1${td}`);
  } else {
    s = s.replace(/(<duration>\d+<\/duration>)/, `$1<voice>1</voice>${td}`);
  }
  return s;
}

function hardenTypeDotInPart(partBlock: string): string {
  let ctx: MeasureTimeContext = { ...DEFAULT_MEASURE_TIME_CONTEXT };
  return partBlock.replace(
    /<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g,
    (full, a1, numStr, a2, body) => {
      ctx = advanceMeasureContext(ctx, body);
      const newBody = body.replace(/<note>([\s\S]*?)<\/note>/g, (noteFull, inner) => {
        const fixed = fixNoteInnerTypeDot(inner, ctx.divisions);
        return `<note>${fixed}</note>`;
      });
      return `<measure${a1}number="${numStr}"${a2}>${newBody}</measure>`;
    },
  );
}

/** Ensure every note/rest has {@code type} + {@code dot} matching {@code duration}. */
export function hardenMusicXmlTypeAndDot(xml: string): string {
  if (/<part id="[^"]+"/.test(xml)) {
    return xml.replace(/<part id="[^"]+"[\s\S]*?<\/part>/g, (partBlock) =>
      hardenTypeDotInPart(partBlock),
    );
  }
  return hardenTypeDotInPart(xml);
}

export type TypeDotIssue = {
  filename?: string;
  barNum: number;
  noteIndex: number;
  duration: number;
  type: string | null;
  dots: number;
  impliedDuration: number;
  divisions: number;
};

function collectTypeDotIssuesInPart(part: string, filename?: string): TypeDotIssue[] {
  const issues: TypeDotIssue[] = [];
  let ctx: MeasureTimeContext = { ...DEFAULT_MEASURE_TIME_CONTEXT };
  for (const m of part.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)) {
    const barNum = parseInt(m[1]!, 10);
    const body = m[2]!;
    ctx = advanceMeasureContext(ctx, body);
    let noteIndex = 0;
    for (const nb of body.matchAll(/<note>([\s\S]*?)<\/note>/g)) {
      const block = nb[1]!;
      if (/<chord\s*\/>/.test(block)) continue;
      noteIndex += 1;
      const duration = parseInt(block.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
      const type = block.match(/<type>([^<]+)<\/type>/)?.[1] ?? null;
      const dots = (block.match(/<dot\s*\/>/g) ?? []).length;
      if (!type) {
        issues.push({
          filename,
          barNum,
          noteIndex,
          duration,
          type,
          dots,
          impliedDuration: 0,
          divisions: ctx.divisions,
        });
        continue;
      }
      const implied = durationFromTypeAndDot(type, dots, ctx.divisions);
      if (Math.abs(implied - duration) > 0.01) {
        issues.push({
          filename,
          barNum,
          noteIndex,
          duration,
          type,
          dots,
          impliedDuration: implied,
          divisions: ctx.divisions,
        });
      }
    }
  }
  return issues;
}

export function findTypeDotIssues(xml: string, filename?: string): TypeDotIssue[] {
  const parts = [...xml.matchAll(/<part id="[^"]+"[\s\S]*?<\/part>/g)].map((m) => m[0]!);
  if (parts.length > 0) {
    return parts.flatMap((part) => collectTypeDotIssuesInPart(part, filename));
  }
  return collectTypeDotIssuesInPart(xml, filename);
}

export function findDivisionsDeclarationIssues(xml: string): string[] {
  const tags = [...xml.matchAll(/<divisions>(\d+)<\/divisions>/g)];
  const issues: string[] = [];
  if (tags.length === 0) issues.push('missing <divisions> in bar 1');
  if (tags.length > 1) {
    issues.push(`${tags.length} <divisions> declarations (expected exactly 1 in bar 1)`);
  }
  for (const t of tags) {
    const v = parseInt(t[1]!, 10);
    if (v !== SOLO_EXPORT_DIVISIONS) {
      issues.push(`<divisions>${v}</divisions> (expected ${SOLO_EXPORT_DIVISIONS})`);
    }
  }
  return issues;
}

function unfoldChordsToArpeggio(notes: XmlNote[], divisions: number): XmlNote[] {
  const out: XmlNote[] = [];
  let pos = 0;
  let chordCluster: XmlNote[] = [];
  for (const n of notes) {
    if (n.isChord) {
      chordCluster.push(n);
      continue;
    }
    if (chordCluster.length > 0) {
      const eighth = minDivForEighth(divisions);
      for (let i = 0; i < chordCluster.length; i++) {
        out.push({ ...chordCluster[i]!, isChord: false, durationDiv: eighth });
        pos += eighth;
      }
      chordCluster = [];
    }
    out.push({ ...n, isChord: false });
    if (!n.isRest) pos += n.durationDiv;
    else pos += n.durationDiv;
  }
  if (chordCluster.length > 0) {
    const eighth = minDivForEighth(divisions);
    for (const c of chordCluster) {
      out.push({ ...c, isChord: false, durationDiv: eighth });
    }
  }
  return out;
}

function insertBreathRests(
  notes: XmlNote[],
  divisions: number,
  maxEighthRun: number,
): XmlNote[] {
  const eighth = minDivForEighth(divisions);
  const quarter = divisions;
  const out: XmlNote[] = [];
  let eighthRun = 0;

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    const q = quantizeDiv(n.durationDiv, divisions);
    const note = { ...n, durationDiv: q };

    if (!note.isRest && q <= eighth + 0.01) {
      eighthRun += 1;
      if (eighthRun > maxEighthRun) {
        out.push({
          isRest: true,
          isChord: false,
          durationDiv: quarter,
          raw: '',
        });
        eighthRun = 0;
        note.durationDiv = quarter;
      }
    } else if (!note.isRest) {
      eighthRun = 0;
    }
    out.push(note);
  }
  return out;
}

function enforceRhythmicVariety(notes: XmlNote[], divisions: number, barNum: number): XmlNote[] {
  const eighth = minDivForEighth(divisions);
  const quarter = divisions;
  const dotted = Math.round(divisions * 1.5);
  const half = divisions * 2;
  const out: XmlNote[] = [];
  let pitchedIdx = 0;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    if (n.isRest) {
      out.push(n);
      continue;
    }
    let dur = quantizeDiv(n.durationDiv, divisions);
    const role = (barNum + pitchedIdx) % 4;
    if (role === 0) dur = half;
    else if (role === 1) dur = dotted;
    else if (role === 2) dur = quarter;
    else if (dur <= eighth) dur = eighth;
    pitchedIdx += 1;
    out.push({ ...n, durationDiv: dur });
  }
  return out;
}

export type SoloMusicalityXmlOptions = {
  maxConsecutiveEighths?: number;
  /** Insert quarter rest at end of every Nth bar when bar has no rest. */
  phraseBreathEveryBars?: number;
  enforceRhythmicVariety?: boolean;
  harmonyBars?: readonly string[];
};

function applyMusicalityToPart(
  partBlock: string,
  options: SoloMusicalityXmlOptions | undefined,
  maxEighthRun: number,
  globalPitchIdxRef: { value: number },
): string {
  let ctx: MeasureTimeContext = { ...DEFAULT_MEASURE_TIME_CONTEXT };
  return partBlock.replace(
    /<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g,
    (full, a1, numStr, a2, body) => {
      const barNum = parseInt(numStr, 10);
      ctx = advanceMeasureContext(ctx, body);
      const divisions = ctx.divisions;
      const barLen = expectedMeasureDuration(ctx);

      const head = body.replace(/<note>[\s\S]*?<\/note>/g, '').trimEnd();
      const rawNotes = [...body.matchAll(/<note>([\s\S]*?)<\/note>/g)].map((m) =>
        parseNoteBlock(m[1]!),
      );

      let notes = unfoldChordsToArpeggio(rawNotes, divisions);
      notes = insertBreathRests(notes, divisions, maxEighthRun);
      if (options?.enforceRhythmicVariety) {
        notes = enforceRhythmicVariety(notes, divisions, barNum);
      }
      notes = rebalanceBar(notes, barLen, divisions);

      if (barNum % 4 === 0) {
        const minRest = Math.round(divisions * SOLO_PHRASE_REST_MIN_BEATS);
        const restSum = notes.filter((n) => n.isRest).reduce((s, n) => s + n.durationDiv, 0);
        if (restSum < minRest && barLen >= minRest + minDivForEighth(divisions)) {
          const pitched = notes.filter((n) => !n.isRest);
          notes = rebalanceBar(pitched, barLen - minRest, divisions);
          notes.push({
            isRest: true,
            isChord: false,
            durationDiv: minRest,
            raw: '',
          });
        }
      }

      const rebuilt: string[] = [];
      for (const n of notes) {
        const dur = n.durationDiv;
        const snapCtx =
          options?.harmonyBars && !n.isRest
            ? { barNum, harmonyBars: options.harmonyBars, globalIdx: globalPitchIdxRef.value }
            : undefined;
        if (!n.isRest) globalPitchIdxRef.value += 1;
        if (n.isRest) {
          rebuilt.push(formatRestXml(dur, divisions, n.voice ?? '1'));
        } else {
          rebuilt.push(formatNoteXml({ ...n, durationDiv: dur }, divisions, snapCtx));
        }
      }

      const newBody = (head ? head + '\n      ' : '') + rebuilt.join('\n      ') + '\n      ';
      return `<measure${a1}number="${numStr}"${a2}>${newBody}</measure>`;
    },
  );
}

export function applyOrbitSoloMusicalityToMusicXml(
  xml: string,
  options?: SoloMusicalityXmlOptions,
): string {
  const maxEighthRun = options?.maxConsecutiveEighths ?? SOLO_MAX_CONSECUTIVE_EIGHTHS;
  const globalPitchIdxRef = { value: 0 };
  if (/<part id="[^"]+"/.test(xml)) {
    return xml.replace(/<part id="[^"]+"[\s\S]*?<\/part>/g, (partBlock) =>
      applyMusicalityToPart(partBlock, options, maxEighthRun, globalPitchIdxRef),
    );
  }
  return applyMusicalityToPart(xml, options, maxEighthRun, globalPitchIdxRef);
}
