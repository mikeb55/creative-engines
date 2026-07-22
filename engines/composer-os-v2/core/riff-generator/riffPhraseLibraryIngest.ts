/**
 * Phase-1 GPX/GP5 → RiffPhraseEntry ingest (corpus only).
 *
 * Hard gate: no imports from riffMelody / riffPitchField / runRiffGenerator /
 * assignMelodyToBar — ingest-only, zero melody-path reads.
 *
 * Parser: @coderline/alphatab (road-test). Planned guitarpro-parser fails on
 * these GP5 lick files (DataView bounds); GPX needs linkedom for DOMParser.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as alphaTab from '@coderline/alphatab';
import { RIFF_PHRASE_CATEGORY_TAG_HEURISTICS } from './riffPhraseLibraryHeuristics';
import {
  RIFF_PHRASE_CATEGORIES,
  RIFF_PHRASE_CATEGORY_LABELS,
  type RiffPhraseCategory,
  type RiffPhraseCuration,
  type RiffPhraseCurationReason,
  type RiffPhraseEntry,
  type RiffPhraseEndType,
  type RiffPhraseIngestAuditRow,
  type RiffPhraseScoreEvent,
  type RiffPhraseStartType,
} from './riffPhraseLibraryTypes';
import {
  deriveAttackPositions,
  deriveContour,
  deriveIntervalSequence,
  validateRiffPhraseEntry,
} from './riffPhraseLibraryValidate';

/** Midi ticks per quarter (alphaTab default). */
const TICKS_PER_QUARTER = 960;

/** Rest gap (quarters) that forces a phrase boundary. */
const REST_GAP_SPLIT_BEATS = 1.5;

/** Prefer phrase windows of 1–4 bars. */
const MAX_PHRASE_BARS = 4;

const GP_EXT = /\.(gp5|gpx|gp|gp3)$/i;

export const RIFF_PHRASE_CORPUS_GPX_ROOT = path.resolve(
  __dirname,
  '../../../../data/riff-phrase-corpus/gpx'
);

export const RIFF_PHRASE_CORPUS_DERIVED_ROOT = path.resolve(
  __dirname,
  '../../../../data/riff-phrase-corpus/derived'
);

export interface RiffPhraseIngestOptions {
  /** Category folder names to scan. Default: all RIFF_PHRASE_CATEGORIES. */
  categories?: RiffPhraseCategory[];
  gpxRoot?: string;
  derivedRoot?: string;
  /** When true, skip writing output files (dry run). */
  dryRun?: boolean;
}

export interface RiffPhraseIngestResult {
  phrases: RiffPhraseEntry[];
  auditRows: RiffPhraseIngestAuditRow[];
  phrasesPath: string;
  auditPath: string;
  filesScanned: number;
  filesOk: number;
  filesFail: number;
  phrasesValid: number;
  phrasesInvalid: number;
}

interface FlatBeat {
  startBeat: number;
  duration: number;
  isRest: boolean;
  pitch?: number;
  tied?: boolean;
  ornaments: {
    slides: boolean;
    ghosts: boolean;
    graceAttacks: boolean;
    bends: boolean;
    deadNotes: boolean;
  };
  barIndex: number;
}

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

function slugBase(fileName: string): string {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function roundBeat(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pickMelodyVoice(
  bar: alphaTab.model.Bar
): { voiceIndex: number; beats: alphaTab.model.Beat[] } {
  let bestIdx = 0;
  let bestNotes = -1;
  for (let vi = 0; vi < bar.voices.length; vi++) {
    const voice = bar.voices[vi]!;
    const noteCount = voice.beats.reduce((n, b) => n + (b.isRest ? 0 : b.notes.length), 0);
    if (noteCount > bestNotes) {
      bestNotes = noteCount;
      bestIdx = vi;
    }
  }
  return { voiceIndex: bestIdx, beats: bar.voices[bestIdx]!.beats };
}

function flattenScore(score: alphaTab.model.Score): {
  flats: FlatBeat[];
  trackCount: number;
  voiceCount: number;
  barsIn: number;
  meter: { numerator: number; denominator: number };
  meterMismatch: boolean;
  droppedOrnaments: number;
  tieFixups: number;
} {
  const track = score.tracks[0];
  if (!track) {
    return {
      flats: [],
      trackCount: 0,
      voiceCount: 0,
      barsIn: 0,
      meter: { numerator: 4, denominator: 4 },
      meterMismatch: false,
      droppedOrnaments: 0,
      tieFixups: 0,
    };
  }
  const staff = track.staves[0]!;
  const masterBars = score.masterBars;
  const barsIn = staff.bars.length;
  let droppedOrnaments = 0;
  let tieFixups = 0;
  let voiceCount = 0;
  const flats: FlatBeat[] = [];

  const firstMb = masterBars[0];
  const meter = {
    numerator: firstMb?.timeSignatureNumerator ?? 4,
    denominator: firstMb?.timeSignatureDenominator ?? 4,
  };
  let meterMismatch = false;

  for (let bi = 0; bi < barsIn; bi++) {
    const bar = staff.bars[bi]!;
    const mb = masterBars[bi];
    if (
      mb &&
      (mb.timeSignatureNumerator !== meter.numerator ||
        mb.timeSignatureDenominator !== meter.denominator)
    ) {
      meterMismatch = true;
    }
    voiceCount = Math.max(voiceCount, bar.voices.length);
    const { beats } = pickMelodyVoice(bar);
    const barStartTick = mb?.start ?? bi * meter.numerator * TICKS_PER_QUARTER;

    for (const beat of beats) {
      const startBeat = roundBeat(
        ((beat.absolutePlaybackStart ?? barStartTick) as number) / TICKS_PER_QUARTER
      );
      const duration = roundBeat((beat.playbackDuration || TICKS_PER_QUARTER) / TICKS_PER_QUARTER);

      if (beat.isRest || beat.notes.length === 0) {
        flats.push({
          startBeat,
          duration,
          isRest: true,
          ornaments: {
            slides: false,
            ghosts: false,
            graceAttacks: false,
            bends: false,
            deadNotes: false,
          },
          barIndex: bi,
        });
        continue;
      }

      // Melodic monophony: highest pitch on the beat (lick lead).
      const pitched = beat.notes
        .filter((n) => typeof n.realValue === 'number')
        .sort((a, b) => b.realValue - a.realValue);
      const note = pitched[0];
      if (!note) {
        flats.push({
          startBeat,
          duration,
          isRest: true,
          ornaments: {
            slides: false,
            ghosts: false,
            graceAttacks: false,
            bends: false,
            deadNotes: false,
          },
          barIndex: bi,
        });
        continue;
      }

      const bends = (note.bendType ?? 0) !== 0;
      const slides = (note.slideInType ?? 0) !== 0 || (note.slideOutType ?? 0) !== 0;
      const ghosts = !!note.isGhost;
      const deadNotes = !!note.isDead;
      const graceAttacks = (beat.graceType ?? 0) !== 0;
      // Complex bend points / vibrato curves not stored — count as dropped.
      if (bends && Array.isArray((note as { bendPoints?: unknown[] }).bendPoints)) {
        const pts = (note as { bendPoints?: unknown[] }).bendPoints;
        if (pts && pts.length > 2) droppedOrnaments += 1;
      }

      let tied = !!note.isTieDestination;
      if (note.isTieOrigin || note.isTieDestination) tieFixups += 1;

      flats.push({
        startBeat,
        duration,
        isRest: false,
        pitch: note.realValue,
        tied: tied || undefined,
        ornaments: { slides, ghosts, graceAttacks, bends, deadNotes },
        barIndex: bi,
      });
    }
  }

  flats.sort((a, b) => a.startBeat - b.startBeat || a.barIndex - b.barIndex);
  return {
    flats,
    trackCount: score.tracks.length,
    voiceCount,
    barsIn,
    meter,
    meterMismatch,
    droppedOrnaments,
    tieFixups,
  };
}

function splitPhraseRanges(
  flats: FlatBeat[],
  barsIn: number
): Array<{ startBar: number; endBar: number; maxPhraseChop: boolean }> {
  if (barsIn <= 0) return [];
  if (barsIn <= MAX_PHRASE_BARS) {
    return [{ startBar: 0, endBar: barsIn - 1, maxPhraseChop: false }];
  }

  const pitched = flats.filter((f) => !f.isRest && typeof f.pitch === 'number');
  const forceSplitAfterBar = new Set<number>();

  for (let i = 1; i < pitched.length; i++) {
    const prev = pitched[i - 1]!;
    const cur = pitched[i]!;
    const gap = cur.startBeat - (prev.startBeat + prev.duration);
    if (gap >= REST_GAP_SPLIT_BEATS && cur.barIndex > prev.barIndex) {
      forceSplitAfterBar.add(prev.barIndex);
    }
  }

  const ranges: Array<{ startBar: number; endBar: number; maxPhraseChop: boolean }> = [];
  let start = 0;
  for (let b = 0; b < barsIn; b++) {
    const len = b - start + 1;
    const atForce = forceSplitAfterBar.has(b);
    const atMax = len >= MAX_PHRASE_BARS;
    const atEnd = b === barsIn - 1;
    if (atForce || atMax || atEnd) {
      // Mid-run MAX_PHRASE_BARS chop: closed at cap with more bars remaining, not rest-gap.
      ranges.push({
        startBar: start,
        endBar: b,
        maxPhraseChop: atMax && !atForce && !atEnd,
      });
      start = b + 1;
    }
  }
  return ranges.filter((r) => r.startBar <= r.endBar);
}

function buildCuration(args: {
  barCount: number;
  maxPhraseChop: boolean;
  meterMismatch: boolean;
}): RiffPhraseCuration | undefined {
  const reasons: RiffPhraseCurationReason[] = [];
  if (args.barCount === 1) reasons.push('one_bar_leftover');
  if (args.maxPhraseChop) reasons.push('max_phrase_chop');
  if (args.meterMismatch) reasons.push('meter_mismatch_file');
  if (reasons.length === 0) return undefined;
  return { needsReview: true, reasons };
}

function eventsForRange(
  flats: FlatBeat[],
  startBar: number,
  endBar: number
): { events: RiffPhraseScoreEvent[]; ornaments: RiffPhraseEntry['ornamentFlags'] } {
  const slice = flats.filter((f) => f.barIndex >= startBar && f.barIndex <= endBar);
  if (slice.length === 0) {
    return {
      events: [],
      ornaments: {
        slides: false,
        ghosts: false,
        graceAttacks: false,
        bends: false,
        deadNotes: false,
      },
    };
  }
  const origin = slice[0]!.startBeat;
  const ornaments = {
    slides: false,
    ghosts: false,
    graceAttacks: false,
    bends: false,
    deadNotes: false,
  };
  const events: RiffPhraseScoreEvent[] = [];
  for (const f of slice) {
    ornaments.slides = ornaments.slides || f.ornaments.slides;
    ornaments.ghosts = ornaments.ghosts || f.ornaments.ghosts;
    ornaments.graceAttacks = ornaments.graceAttacks || f.ornaments.graceAttacks;
    ornaments.bends = ornaments.bends || f.ornaments.bends;
    ornaments.deadNotes = ornaments.deadNotes || f.ornaments.deadNotes;
    const startBeat = roundBeat(f.startBeat - origin);
    if (f.isRest || typeof f.pitch !== 'number') {
      events.push({ kind: 'rest', startBeat, duration: f.duration, voice: 1 });
    } else {
      events.push({
        kind: 'note',
        pitch: f.pitch,
        startBeat,
        duration: f.duration,
        voice: 1,
        ...(f.tied ? { tied: true } : {}),
      });
    }
  }
  return { events, ornaments };
}

function deriveRhythmicCell(events: RiffPhraseScoreEvent[]): number[] {
  const notes = events.filter((e): e is Extract<RiffPhraseScoreEvent, { kind: 'note' }> => e.kind === 'note');
  if (notes.length === 0) return [8];
  return notes.map((n) => Math.max(1, Math.round(n.duration * 2)));
}

function deriveRestMask(events: RiffPhraseScoreEvent[], beatsPerBar: number): boolean[] {
  const slots = Math.max(8, Math.round(beatsPerBar * 2));
  const mask = Array.from({ length: slots }, () => true);
  for (const e of events) {
    if (e.kind !== 'note') continue;
    if (e.startBeat >= beatsPerBar) continue;
    const slot = Math.min(slots - 1, Math.floor(e.startBeat * 2));
    mask[slot] = false;
  }
  return mask;
}

function deriveStrongBeatTargets(events: RiffPhraseScoreEvent[]): number[] {
  const pcs = new Set<number>();
  for (const e of events) {
    if (e.kind !== 'note') continue;
    const frac = Math.abs(e.startBeat - Math.round(e.startBeat));
    if (frac < 0.08) pcs.add(((e.pitch % 12) + 12) % 12);
  }
  return [...pcs].sort((a, b) => a - b);
}

function derivePhraseStartType(events: RiffPhraseScoreEvent[]): RiffPhraseStartType {
  if (events.length === 0) return 'rest_lead';
  if (events[0]!.kind === 'rest') return 'rest_lead';
  const first = events.find((e) => e.kind === 'note');
  if (!first || first.kind !== 'note') return 'rest_lead';
  const frac = first.startBeat - Math.floor(first.startBeat);
  if (first.startBeat < 0.08) return 'downbeat';
  if (frac > 0.08 && frac < 0.92) return 'syncopated';
  if (first.startBeat > 0 && first.startBeat < 1) return 'pickup';
  return 'downbeat';
}

function derivePhraseEndType(
  events: RiffPhraseScoreEvent[],
  intervals: number[]
): RiffPhraseEndType {
  if (events.length === 0) return 'open';
  const last = events[events.length - 1]!;
  if (last.kind === 'rest') return 'rest';
  if (last.kind === 'note' && last.duration >= 1.5) return 'sustain';
  const lastIv = intervals[intervals.length - 1];
  if (typeof lastIv === 'number' && Math.abs(lastIv) >= 4) return 'leap_off';
  if (intervals.slice(-3).some((iv) => Math.abs(iv) === 1)) return 'chromatic_resolve';
  return 'open';
}

function deriveCadenceStrength(
  endType: RiffPhraseEndType,
  events: RiffPhraseScoreEvent[]
): number {
  const base: Record<RiffPhraseEndType, number> = {
    chromatic_resolve: 0.75,
    sustain: 0.65,
    rest: 0.55,
    leap_off: 0.35,
    open: 0.4,
  };
  let s = base[endType];
  const lastNote = [...events].reverse().find((e) => e.kind === 'note');
  if (lastNote && lastNote.kind === 'note') {
    const frac = Math.abs(lastNote.startBeat - Math.round(lastNote.startBeat));
    if (frac < 0.08) s = Math.min(1, s + 0.1);
  }
  return roundBeat(Math.max(0, Math.min(1, s)));
}

function deriveChromaticity(intervals: number[]): number {
  if (intervals.length === 0) return 0;
  const chrom = intervals.filter((iv) => Math.abs(iv) === 1).length;
  return roundBeat(chrom / intervals.length);
}

function deriveLeapProfile(intervals: number[]): RiffPhraseEntry['leapProfile'] {
  const abs = intervals.map((iv) => Math.abs(iv));
  const leaps = abs.filter((v) => v >= 4);
  const hist: Record<string, number> = {};
  for (const v of leaps) {
    const k = String(v);
    hist[k] = (hist[k] ?? 0) + 1;
  }
  return {
    maxLeap: abs.length ? Math.max(...abs) : 0,
    leapRate: abs.length ? roundBeat(leaps.length / abs.length) : 0,
    leapSemitoneHist: hist,
  };
}

function buildTags(
  category: RiffPhraseCategory,
  entry: Pick<
    RiffPhraseEntry,
    | 'phraseStartType'
    | 'phraseEndType'
    | 'chromaticityScore'
    | 'ornamentFlags'
    | 'intervalSequence'
  >
): string[] {
  const heur = RIFF_PHRASE_CATEGORY_TAG_HEURISTICS[category];
  const tags = new Set<string>(heur.expectedTags.slice(0, 3));
  if (entry.phraseStartType === 'syncopated') tags.add('syncopated');
  if (entry.phraseEndType === 'sustain') tags.add('sustain');
  if (entry.chromaticityScore >= 0.35) tags.add('chromatic_run');
  if (entry.ornamentFlags.bends) tags.add('bend');
  if (entry.ornamentFlags.slides) tags.add('slide');
  if (entry.ornamentFlags.deadNotes) tags.add('dead_note');
  const m3 = entry.intervalSequence.filter((iv) => Math.abs(iv) === 3).length;
  const tt = entry.intervalSequence.filter((iv) => Math.abs(iv) === 6).length;
  if (m3 >= 2) tags.add('m3_chain');
  if (tt >= 1) tags.add('tritone');
  return [...tags];
}

function buildPhraseEntry(args: {
  category: RiffPhraseCategory;
  sourceFileName: string;
  hash: string;
  startBar: number;
  endBar: number;
  meter: { numerator: number; denominator: number };
  events: RiffPhraseScoreEvent[];
  ornaments: RiffPhraseEntry['ornamentFlags'];
  phraseIndex: number;
  maxPhraseChop?: boolean;
  meterMismatch?: boolean;
}): RiffPhraseEntry | null {
  const { category, sourceFileName, hash, startBar, endBar, meter, events, ornaments, phraseIndex } =
    args;
  if (!events.some((e) => e.kind === 'note')) return null;

  const intervalSequence = deriveIntervalSequence(events);
  const contour = deriveContour(intervalSequence);
  const attackPositions = deriveAttackPositions(events);
  const pitched = events.filter((e): e is Extract<RiffPhraseScoreEvent, { kind: 'note' }> => e.kind === 'note');
  const pitches = pitched.map((p) => p.pitch);
  const registerLow = Math.min(...pitches);
  const registerHigh = Math.max(...pitches);
  const registerCenter = Math.round(pitches.reduce((a, b) => a + b, 0) / pitches.length);
  const phraseEndType = derivePhraseEndType(events, intervalSequence);
  const phraseStartType = derivePhraseStartType(events);
  const chromaticityScore = deriveChromaticity(intervalSequence);
  const leapProfile = deriveLeapProfile(intervalSequence);
  const barCount = endBar - startBar + 1;
  const curation = buildCuration({
    barCount,
    maxPhraseChop: args.maxPhraseChop === true,
    meterMismatch: args.meterMismatch === true,
  });

  const draft: RiffPhraseEntry = {
    id: `${category}__${slugBase(sourceFileName)}__p${String(phraseIndex).padStart(2, '0')}__bars${startBar + 1}-${endBar + 1}`,
    category,
    sourceCourse: RIFF_PHRASE_CATEGORY_LABELS[category],
    sourceFile: { name: sourceFileName, sha256: hash },
    barCount,
    meter,
    noteEvents: events,
    intervalSequence,
    contour,
    rhythmicCell: deriveRhythmicCell(events),
    attackPositions,
    restMask: deriveRestMask(events, meter.numerator),
    strongBeatTargets: deriveStrongBeatTargets(events),
    phraseStartType,
    phraseEndType,
    cadenceStrength: deriveCadenceStrength(phraseEndType, events),
    registerLow,
    registerHigh,
    registerCenter,
    chromaticityScore,
    leapProfile,
    ornamentFlags: ornaments,
    inferredHarmonyHints: [],
    tags: [],
    ...(curation ? { curation } : {}),
  };
  draft.tags = buildTags(category, draft);
  const check = validateRiffPhraseEntry(draft);
  if (!check.ok) {
    return null;
  }
  return check.entry;
}

function loadScore(filePath: string): alphaTab.model.Score {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const settings = new alphaTab.Settings();
  return alphaTab.importer.ScoreLoader.loadScoreFromBytes(data, settings);
}

function listCategoryFiles(gpxRoot: string, category: RiffPhraseCategory): string[] {
  const dir = path.join(gpxRoot, category);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => GP_EXT.test(f))
    .map((f) => path.join(dir, f))
    .sort((a, b) => a.localeCompare(b));
}

function auditToCsv(rows: RiffPhraseIngestAuditRow[]): string {
  const header = [
    'file',
    'parseOk',
    'trackCount',
    'voiceCount',
    'barsIn',
    'phrasesOut',
    'droppedOrnaments',
    'tieFixups',
    'meterMismatch',
    'hash',
    'notes',
  ];
  const esc = (v: string | number | boolean | undefined) => {
    const s = v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.file,
        r.parseOk,
        r.trackCount,
        r.voiceCount,
        r.barsIn,
        r.phrasesOut,
        r.droppedOrnaments,
        r.tieFixups,
        r.meterMismatch,
        r.hash,
        r.notes ?? '',
      ]
        .map(esc)
        .join(',')
    );
  }
  return lines.join('\n') + '\n';
}

/**
 * Ingest selected category folders → phrases.jsonl + audit.csv under derived/.
 * Does not touch category folders outside `categories`.
 */
export function runRiffPhraseIngest(opts: RiffPhraseIngestOptions = {}): RiffPhraseIngestResult {
  const categories = opts.categories ?? [...RIFF_PHRASE_CATEGORIES];
  const gpxRoot = opts.gpxRoot ?? RIFF_PHRASE_CORPUS_GPX_ROOT;
  const derivedRoot = opts.derivedRoot ?? RIFF_PHRASE_CORPUS_DERIVED_ROOT;
  const phrases: RiffPhraseEntry[] = [];
  const auditRows: RiffPhraseIngestAuditRow[] = [];
  let filesScanned = 0;
  let filesOk = 0;
  let filesFail = 0;
  let phrasesValid = 0;
  let phrasesInvalid = 0;

  for (const category of categories) {
    const files = listCategoryFiles(gpxRoot, category);
    for (const filePath of files) {
      filesScanned += 1;
      const rel = path.relative(gpxRoot, filePath).replace(/\\/g, '/');
      let hash = '';
      try {
        hash = sha256File(filePath);
        const score = loadScore(filePath);
        const flat = flattenScore(score);
        const ranges = splitPhraseRanges(flat.flats, flat.barsIn);
        let phrasesOut = 0;
        let localInvalid = 0;
        for (let pi = 0; pi < ranges.length; pi++) {
          const range = ranges[pi]!;
          const { events, ornaments } = eventsForRange(flat.flats, range.startBar, range.endBar);
          const entry = buildPhraseEntry({
            category,
            sourceFileName: path.basename(filePath),
            hash,
            startBar: range.startBar,
            endBar: range.endBar,
            meter: flat.meter,
            events,
            ornaments,
            phraseIndex: pi + 1,
            maxPhraseChop: range.maxPhraseChop,
            meterMismatch: flat.meterMismatch,
          });
          if (entry) {
            phrases.push(entry);
            phrasesOut += 1;
            phrasesValid += 1;
          } else if (events.some((e) => e.kind === 'note')) {
            localInvalid += 1;
            phrasesInvalid += 1;
          }
        }
        filesOk += 1;
        auditRows.push({
          file: rel,
          parseOk: true,
          trackCount: flat.trackCount,
          voiceCount: flat.voiceCount,
          barsIn: flat.barsIn,
          phrasesOut,
          droppedOrnaments: flat.droppedOrnaments,
          tieFixups: flat.tieFixups,
          meterMismatch: flat.meterMismatch,
          hash,
          notes:
            localInvalid > 0
              ? `parser=alphatab; invalidPhrases=${localInvalid}`
              : 'parser=alphatab',
        });
      } catch (e) {
        filesFail += 1;
        auditRows.push({
          file: rel,
          parseOk: false,
          trackCount: 0,
          voiceCount: 0,
          barsIn: 0,
          phrasesOut: 0,
          droppedOrnaments: 0,
          tieFixups: 0,
          meterMismatch: false,
          hash: hash || 'parse_failed',
          notes: `parser=alphatab; error=${String((e as Error)?.message ?? e).slice(0, 200)}`,
        });
      }
    }
  }

  const phrasesPath = path.join(derivedRoot, 'phrases.jsonl');
  const auditPath = path.join(derivedRoot, 'audit.csv');
  if (!opts.dryRun) {
    fs.mkdirSync(derivedRoot, { recursive: true });
    fs.writeFileSync(phrasesPath, phrases.map((p) => JSON.stringify(p)).join('\n') + (phrases.length ? '\n' : ''), 'utf8');
    fs.writeFileSync(auditPath, auditToCsv(auditRows), 'utf8');
  }

  return {
    phrases,
    auditRows,
    phrasesPath,
    auditPath,
    filesScanned,
    filesOk,
    filesFail,
    phrasesValid,
    phrasesInvalid,
  };
}

export function parseCategoryListArg(raw: string | undefined): RiffPhraseCategory[] | undefined {
  if (!raw || !raw.trim()) return undefined;
  const parts = raw.split(/[,+\s]+/).map((s) => s.trim()).filter(Boolean);
  const out: RiffPhraseCategory[] = [];
  for (const p of parts) {
    if (!(RIFF_PHRASE_CATEGORIES as readonly string[]).includes(p)) {
      throw new Error(`Unknown category '${p}'. Valid: ${RIFF_PHRASE_CATEGORIES.join(', ')}`);
    }
    out.push(p as RiffPhraseCategory);
  }
  return out;
}
