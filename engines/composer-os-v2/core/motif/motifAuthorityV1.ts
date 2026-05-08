import type { MeasureModel, NoteEvent, PartModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { normalizeMeasureToEighthBeatGrid, snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';

/** Pilot motif policy tier (Motif Authority V1). */
export type MotifAuthorityLevel = 'off' | 'soft' | 'strong';

/** Serialized motif-development diagnostics for inspectability / ledger. */
export interface MotifDevelopmentSummary {
  motifAuthorityLevel: MotifAuthorityLevel;
  pilotPathTag: string;
  coreCellEstablished: boolean;
  recurrenceCountEstimate: number;
  recurrenceSummary: string;
  transformationSummary: string[];
  motifCoherence: number;
  motifLedPrimaryIdentity?: boolean;
  experimental?: boolean;
}

export interface MotifPhraseRange {
  startBar: number;
  endBar: number;
}

export interface MotifFingerprint {
  intervalContour: string[];
  /** Absolute intervallic size between consecutive notes: step (≤2 ST), skip (3–4), leap (5+). */
  intervalSizes: Array<'step' | 'skip' | 'leap'>;
  rhythmOnsets: string[];
  anchorTonesPerBar: number[];
  registerBand: 'low' | 'mid' | 'high';
}

export interface MotifAuthorityScoreBreakdown {
  contourScore: number;
  rhythmScore: number;
  anchorScore: number;
  registerScore: number;
  literalCopyPenalty: number;
  overDriftPenalty: number;
  motifAuthorityScore: number;
}

export interface MotifAuthorityPlan {
  phraseA: MotifPhraseRange;
  phraseB?: MotifPhraseRange;
  phraseReturn?: MotifPhraseRange;
  returnThreshold: number;
  variationMiddleBand: [number, number];
  developmentSimilarity?: number;
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function intervalSizeBucketAbsSemitones(absSemi: number): 'step' | 'skip' | 'leap' {
  if (absSemi <= 2) return 'step';
  if (absSemi <= 4) return 'skip';
  return 'leap';
}

/** Smallest MIDI delta so `pitch` matches `targetPc` (0–11). */
function snapPitchToPitchClass(pitch: number, targetPc: number): number {
  const pc = ((pitch % 12) + 12) % 12;
  let delta = targetPc - pc;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  return pitch + delta;
}

function noteEventsInRange(part: PartModel, range: MotifPhraseRange): Array<{ pitch: number; startBeat: number; bar: number }> {
  const out: Array<{ pitch: number; startBeat: number; bar: number }> = [];
  for (const m of part.measures) {
    if (m.index < range.startBar || m.index > range.endBar) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      out.push({ pitch: e.pitch, startBeat: e.startBeat, bar: m.index });
    }
  }
  out.sort((a, b) => (a.bar - b.bar) || (a.startBeat - b.startBeat));
  return out;
}

function sequenceSimilarity(a: string[], b: string[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  let same = 0;
  for (let i = 0; i < maxLen; i++) {
    if ((a[i] ?? '__') === (b[i] ?? '__')) same++;
  }
  return same / maxLen;
}

function numberSequenceSimilarity(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  let same = 0;
  for (let i = 0; i < maxLen; i++) {
    if ((a[i] ?? -999) === (b[i] ?? -999)) same++;
  }
  return same / maxLen;
}

export function buildPhraseFingerprint(part: PartModel, range: MotifPhraseRange): MotifFingerprint {
  const notes = noteEventsInRange(part, range);
  const intervalContour: string[] = [];
  const intervalSizes: Array<'step' | 'skip' | 'leap'> = [];
  for (let i = 1; i < notes.length; i++) {
    const d = notes[i]!.pitch - notes[i - 1]!.pitch;
    if (d > 0) intervalContour.push('U');
    else if (d < 0) intervalContour.push('D');
    else intervalContour.push('S');
    intervalSizes.push(intervalSizeBucketAbsSemitones(Math.abs(d)));
  }
  const rhythmOnsets = notes.map((n) => `${n.bar - range.startBar}:${Math.round(n.startBeat * 4) / 4}`);

  const anchorTonesPerBar: number[] = [];
  for (let bar = range.startBar; bar <= range.endBar; bar++) {
    const first = notes.find((n) => n.bar === bar);
    anchorTonesPerBar.push(first ? ((first.pitch % 12) + 12) % 12 : -1);
  }

  const avgPitch = notes.length > 0 ? notes.reduce((s, n) => s + n.pitch, 0) / notes.length : 60;
  const registerBand: 'low' | 'mid' | 'high' = avgPitch < 58 ? 'low' : avgPitch < 70 ? 'mid' : 'high';

  return { intervalContour, intervalSizes, rhythmOnsets, anchorTonesPerBar, registerBand };
}

export function contourSimilarity(a: MotifFingerprint, b: MotifFingerprint): number {
  return sequenceSimilarity(a.intervalContour, b.intervalContour);
}

export function rhythmSimilarity(a: MotifFingerprint, b: MotifFingerprint): number {
  return sequenceSimilarity(a.rhythmOnsets, b.rhythmOnsets);
}

export function anchorToneSimilarity(a: MotifFingerprint, b: MotifFingerprint): number {
  return numberSequenceSimilarity(a.anchorTonesPerBar, b.anchorTonesPerBar);
}

export function registerBandSimilarity(a: MotifFingerprint, b: MotifFingerprint): number {
  if (a.registerBand === b.registerBand) return 1;
  return 0.4;
}

export function literalCopyPenalty(a: MotifFingerprint, b: MotifFingerprint): number {
  const c = contourSimilarity(a, b);
  const r = rhythmSimilarity(a, b);
  const an = anchorToneSimilarity(a, b);
  return c > 0.96 && r > 0.96 && an > 0.96 ? 0.25 : 0;
}

export function overDriftPenalty(a: MotifFingerprint, b: MotifFingerprint): number {
  const base = (contourSimilarity(a, b) + rhythmSimilarity(a, b) + anchorToneSimilarity(a, b)) / 3;
  if (base >= 0.16) return 0;
  return clamp01((0.16 - base) / 0.16) * 0.2;
}

export function computeMotifAuthorityScore(
  fingerprintA: MotifFingerprint,
  fingerprintB: MotifFingerprint
): MotifAuthorityScoreBreakdown {
  const contourScore = contourSimilarity(fingerprintA, fingerprintB);
  const rhythmScore = rhythmSimilarity(fingerprintA, fingerprintB);
  const anchorScore = anchorToneSimilarity(fingerprintA, fingerprintB);
  const registerScore = registerBandSimilarity(fingerprintA, fingerprintB);
  const copyPenalty = literalCopyPenalty(fingerprintA, fingerprintB);
  const driftPenalty = overDriftPenalty(fingerprintA, fingerprintB);
  const weighted =
    contourScore * 0.3 +
    rhythmScore * 0.3 +
    anchorScore * 0.3 +
    registerScore * 0.1;
  const motifAuthorityScore = clamp01(weighted - copyPenalty - driftPenalty);
  return {
    contourScore,
    rhythmScore,
    anchorScore,
    registerScore,
    literalCopyPenalty: copyPenalty,
    overDriftPenalty: driftPenalty,
    motifAuthorityScore,
  };
}

export function classifyVariationType(score: MotifAuthorityScoreBreakdown): 'copy' | 'variation' | 'drifted' {
  if (score.literalCopyPenalty > 0) return 'copy';
  if (score.overDriftPenalty > 0) return 'drifted';
  return 'variation';
}

export function defaultMotifAuthorityPlan(totalBars: number): MotifAuthorityPlan {
  const phraseA: MotifPhraseRange = { startBar: 1, endBar: Math.min(8, totalBars) };
  const phraseB: MotifPhraseRange | undefined = totalBars >= 16 ? { startBar: 9, endBar: 16 } : undefined;
  const phraseReturn: MotifPhraseRange | undefined =
    totalBars >= 32 ? { startBar: 25, endBar: 32 } :
    totalBars >= 24 ? { startBar: 17, endBar: 24 } :
    totalBars >= 16 ? { startBar: 9, endBar: 16 } :
    undefined;
  return {
    phraseA,
    phraseB,
    phraseReturn,
    returnThreshold: 0.54,
    variationMiddleBand: [0.28, 0.9],
  };
}

function noteEventsInMeasure(events: ScoreEvent[]): Array<{ pitch: number; idx: number }> {
  const out: Array<{ pitch: number; idx: number }> = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.kind !== 'note') continue;
    out.push({ pitch: e.pitch, idx: i });
  }
  return out;
}

/** `buildPhrase` rhythm cells: `${duration}@${globalStartBeat}` — durations only for Wayne return bias. */
function preferredDurationsFromRhythmFingerprint(cells: string[] | undefined): number[] {
  if (!cells?.length) return [];
  const seen = new Set<number>();
  for (const c of cells) {
    const at = c.indexOf('@');
    if (at <= 0) continue;
    const d = Number.parseFloat(c.slice(0, at));
    if (Number.isFinite(d)) seen.add(d);
  }
  return [...seen];
}

function nearestPreferredDuration(beats: number, prefs: number[]): number {
  if (prefs.length === 0) return beats;
  let best = prefs[0]!;
  let bestDist = Math.abs(beats - best);
  for (const p of prefs) {
    const dist = Math.abs(beats - p);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

function nudgeReturnPhraseDurationsTowardWayneFingerprint(
  part: PartModel,
  returnRange: MotifPhraseRange,
  rhythmFingerprint: string[]
): void {
  const prefs = preferredDurationsFromRhythmFingerprint(rhythmFingerprint);
  if (prefs.length === 0) return;
  for (let bar = returnRange.startBar; bar <= returnRange.endBar; bar++) {
    const m = part.measures.find((x) => x.index === bar);
    if (!m) continue;
    for (let i = 0; i < m.events.length; i++) {
      const e = m.events[i]!;
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if ((n.voice ?? 1) !== 1) continue;
      n.duration = nearestPreferredDuration(n.duration, prefs);
    }
  }
}

/**
 * Single bounded nudge for return phrase: shift first-note pitch classes per bar
 * and a small subset of contour steps toward phrase A.
 * Optional `songwriterStyleId`: for `wayne_shorter`, snap the first note to the
 * phrase-A anchor pitch class and nudge a second note by at most ±1 semitone toward that anchor.
 */
export function nudgeReturnPhraseTowardFingerprint(
  part: PartModel,
  returnRange: MotifPhraseRange,
  target: MotifFingerprint,
  opts?: { songwriterStyleId?: string; waynePhraseAFingerprint?: string[] }
): void {
  const wayne = opts?.songwriterStyleId === 'wayne_shorter';

  // Anchor nudge: first note in each return bar toward phrase-A anchor pitch class.
  for (let bar = returnRange.startBar; bar <= returnRange.endBar; bar++) {
    const m = part.measures.find((x) => x.index === bar);
    if (!m) continue;
    const notes = noteEventsInMeasure(m.events);
    if (notes.length === 0) continue;
    const first = notes[0]!;
    const targetPc = target.anchorTonesPerBar[Math.max(0, bar - returnRange.startBar)] ?? -1;
    if (targetPc < 0) continue;

    if (wayne) {
      const snapped = snapPitchToPitchClass(first.pitch, targetPc);
      (m.events[first.idx] as { pitch: number }).pitch = snapped;

      if (notes.length >= 2) {
        const second = notes[1]!;
        const cur2 = second.pitch;
        const curPc2 = ((cur2 % 12) + 12) % 12;
        if (curPc2 !== targetPc) {
          const up = (targetPc - curPc2 + 12) % 12;
          const down = (curPc2 - targetPc + 12) % 12;
          const delta2 = up <= down ? Math.min(up, 1) : -Math.min(down, 1);
          (m.events[second.idx] as { pitch: number }).pitch = cur2 + delta2;
        }
      }
      continue;
    }

    const cur = first.pitch;
    const curPc = ((cur % 12) + 12) % 12;
    if (curPc === targetPc) continue;
    const up = (targetPc - curPc + 12) % 12;
    const down = (curPc - targetPc + 12) % 12;
    const delta = up <= down ? Math.min(up, 1) : -Math.min(down, 1);
    const next = cur + delta;
    (m.events[first.idx] as { pitch: number }).pitch = next;
  }

  if (wayne && opts?.waynePhraseAFingerprint?.length) {
    nudgeReturnPhraseDurationsTowardWayneFingerprint(part, returnRange, opts.waynePhraseAFingerprint);
  }
}

const WAYNE_WMot_EPS = 1e-4;

function qBeatWayne(x: number): number {
  return Math.round(x * 4) / 4;
}

/** Label → verse / chorus / bridge (Song Mode style); letter forms → null. */
export function wayneFormSectionRoleFromLabel(label: string): 'verse' | 'chorus' | 'bridge' | null {
  const L = label.trim().toLowerCase();
  if (L.startsWith('verse')) return 'verse';
  if (L.startsWith('chorus')) return 'chorus';
  if (L.startsWith('bridge')) return 'bridge';
  return null;
}

/**
 * Wayne motif-development transforms (chorus vs bridge slots): semantic labels + letter-form fallback.
 * `B` / `B-*` → chorus slot; `A'` / `A''` / primes → bridge slot.
 */
export function wayneMotifDevelopmentSectionRoleFromLabel(label: string): 'verse' | 'chorus' | 'bridge' | null {
  const semantic = wayneFormSectionRoleFromLabel(label);
  if (semantic) return semantic;
  const raw = label.trim();
  if (/^B$/i.test(raw) || /^B-\d+$/i.test(raw)) return 'chorus';
  if (/^A''$/i.test(raw) || /^A'$/i.test(raw) || /^A''-\d+$/i.test(raw) || /^A'-\d+$/i.test(raw))
    return 'bridge';
  return null;
}

export function wayneMotifPhraseRangeFromFormSection(
  sec: { startBar: number; length: number },
  totalBars: number
): MotifPhraseRange | null {
  if (!Number.isFinite(sec.startBar) || !Number.isFinite(sec.length) || sec.length <= 0) return null;
  const startBar = Math.trunc(sec.startBar);
  const endBar = startBar + Math.trunc(sec.length) - 1;
  if (startBar < 1 || endBar > totalBars || startBar > endBar) return null;
  return { startBar, endBar };
}

function voice1NotesInMeasure(m: MeasureModel): NoteEvent[] {
  const out: NoteEvent[] = [];
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    if ((n.voice ?? 1) !== 1) continue;
    out.push(n);
  }
  return out;
}

function wayneShiftMotifPlusOneBeat(part: PartModel, range: MotifPhraseRange): void {
  for (let bar = range.startBar; bar <= range.endBar; bar++) {
    const m = part.measures.find((x) => x.index === bar);
    if (!m) continue;
    const v1 = voice1NotesInMeasure(m).sort((a, b) => a.startBeat - b.startBeat);
    if (v1.length === 0) continue;
    const e = v1[0]!;
    const ns = snapAttackBeatToGrid(e.startBeat + 1);
    const ne = ns + e.duration;
    if (ne <= 4 + WAYNE_WMot_EPS) e.startBeat = ns;
    normalizeMeasureToEighthBeatGrid(m);
  }
}

function wayneAugmentMotifRhythms(part: PartModel, range: MotifPhraseRange): void {
  for (let bar = range.startBar; bar <= range.endBar; bar++) {
    const m = part.measures.find((x) => x.index === bar);
    if (!m) continue;
    for (const e of voice1NotesInMeasure(m)) {
      const cap = 4 - e.startBeat;
      if (cap <= WAYNE_WMot_EPS) continue;
      e.duration = qBeatWayne(Math.min(e.duration * 2, cap));
    }
    normalizeMeasureToEighthBeatGrid(m);
  }
}

function wayneExpandLeapIntervals(part: PartModel, range: MotifPhraseRange, seed: number, salt: number): void {
  type Ref = { bar: number; n: NoteEvent };
  const seq: Ref[] = [];
  for (let bar = range.startBar; bar <= range.endBar; bar++) {
    const m = part.measures.find((x) => x.index === bar);
    if (!m) continue;
    for (const e of voice1NotesInMeasure(m).sort((a, b) => a.startBeat - b.startBeat)) {
      seq.push({ bar, n: e });
    }
  }
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1]!.n;
    const b = seq[i]!.n;
    const interval = Math.abs(b.pitch - a.pitch);
    if (interval < 5) continue;
    const widenUp = seededUnit(seed, seq[i]!.bar * 97 + i, 9622 + salt) >= 0.5;
    const delta = widenUp ? 1 : -1;
    b.pitch = Math.max(36, Math.min(96, b.pitch + delta));
  }
}

export type WayneMotifSectionTransformKind = 'shift_plus_one_beat' | 'augment_rhythm' | 'expand_leaps';

/**
 * Wayne Shorter — one deterministic motif-development transform per chorus or bridge section (never combined).
 * Does not run on verse / intro / pre-chorus.
 */
export function applyWayneShorterChorusBridgeMotifDevelopment(
  part: PartModel,
  opts: {
    songwriterStyleId?: string;
    sections: Array<{ label: string; startBar: number; length: number }>;
    totalBars: number;
    seed: number;
  }
): string[] {
  const receipts: string[] = [];
  if (opts.songwriterStyleId !== 'wayne_shorter') return receipts;
  const { sections, totalBars, seed } = opts;
  if (!Array.isArray(sections) || sections.length === 0) return receipts;

  let salt = 0;
  for (const sec of sections) {
    const role = wayneMotifDevelopmentSectionRoleFromLabel(sec.label);
    if (role !== 'chorus' && role !== 'bridge') continue;
    const range = wayneMotifPhraseRangeFromFormSection(sec, totalBars);
    if (!range) continue;

    const pick = Math.floor(seededUnit(seed, sec.startBar, 9610 + salt) * 3);
    const kind: WayneMotifSectionTransformKind =
      pick === 0 ? 'shift_plus_one_beat' : pick === 1 ? 'augment_rhythm' : 'expand_leaps';

    if (kind === 'shift_plus_one_beat') wayneShiftMotifPlusOneBeat(part, range);
    else if (kind === 'augment_rhythm') wayneAugmentMotifRhythms(part, range);
    else wayneExpandLeapIntervals(part, range, seed, salt);

    receipts.push(`wayne_section:${role}@${sec.startBar}:${kind}`);
    salt++;
  }

  return receipts;
}
