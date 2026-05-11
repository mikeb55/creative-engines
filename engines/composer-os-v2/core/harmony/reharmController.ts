import type { CompositionContext } from '../compositionContext';
import {
  generateReharmCandidates,
  scoreReharmCandidate,
  type EmotionalDrift,
} from './reharmCandidateEngine';
import { getChordRangeForBars, type BarChordEntry } from './harmonyRangeResolver';
import { generateReharmSequence } from './reharmSequenceRanker';
import type {
  AlternativeProgression,
  ReharmResult,
  ReharmSequenceRequest,
} from './reharmSequenceTypes';
import { scoreResultForGce } from '../gce/gceGate';
import { gceSectionsFromFormMap } from '../gce/gceAutoScorers';
import {
  buildStubDuoScoreFromMelodicLine,
  stubMelodicLineFromMelodyPcs,
} from '../song-mode/melodicVariationPack';

const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

function formatAppliedChordSymbol(rootPc: number, vaultChordTypeId: string): string {
  const r = ROOT_NAMES[((rootPc % 12) + 12) % 12]!;
  return `${r}${vaultChordTypeId}`;
}

function chordSourceForContext(context: CompositionContext): string[] | null {
  const tb = context.form.totalBars;
  const md = context.generationMetadata;
  const src =
    md.parsedCustomProgressionBars && md.parsedCustomProgressionBars.length === tb
      ? md.parsedCustomProgressionBars
      : context.lockedHarmonyBarsRaw && context.lockedHarmonyBarsRaw.length === tb
        ? context.lockedHarmonyBarsRaw
        : null;
  return src;
}

function spliceAlternativeIntoChordStrip(
  src: string[],
  alternative: AlternativeProgression,
  startBar: number,
  endBar: number
): string[] {
  const next = [...src];
  const sb = Math.min(startBar, endBar);
  const eb = Math.max(startBar, endBar);

  for (const row of alternative.bars) {
    if (row.barIndex < sb || row.barIndex > eb) continue;
    const i = row.barIndex - 1;
    if (i < 0 || i >= next.length) continue;
    if (row.mappingNull || row.strategy === 'passthrough') continue;
    if (row.strategy === 'identity') {
      next[i] = row.originalSymbol;
      continue;
    }
    next[i] = formatAppliedChordSymbol(row.substituteRootPc, row.substituteChordTypeId);
  }
  return next;
}

/**
 * Splices substitute symbols from one {@link AlternativeProgression} into the progression backing the context.
 *
 * Callers must persist the returned bar array into UI chord text and, on the **next generation**, repopulate
 * `lockedHarmonyBarsRaw` and `parsedChordBars` from parsing that text — they stay in sync only after the request
 * pipeline runs. Do not invoke generation with `harmonyMode: custom_locked` unless those wire arrays already
 * reflect the edited symbols (otherwise LOCK asserts may compare stale locks).
 *
 * Frank Zappa: `frankZappaEffectiveHarmonyBars` / harmony context are rebuilt on regen from the new progression;
 * no extra handling here.
 */
export function applyReharmAlternative(
  alternative: AlternativeProgression,
  startBar: number,
  endBar: number,
  context: CompositionContext
): string[] {
  const tb = context.form.totalBars;
  const md = context.generationMetadata;
  const src =
    md.parsedCustomProgressionBars && md.parsedCustomProgressionBars.length === tb
      ? md.parsedCustomProgressionBars
      : context.lockedHarmonyBarsRaw && context.lockedHarmonyBarsRaw.length === tb
        ? context.lockedHarmonyBarsRaw
        : null;
  if (!src) {
    throw new Error(
      `applyReharmAlternative: need parsedCustomProgressionBars or lockedHarmonyBarsRaw length ${tb}`
    );
  }
  return spliceAlternativeIntoChordStrip(src, alternative, startBar, endBar);
}

/** Matches {@link goldenPath/guitarBassDuoHarmony.seededUnit} — deterministic [0,1). */
function seededUnit(seed: number, bar: number, salt = 0): number {
  let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

function melodyPcForBar(request: ReharmSequenceRequest, barIndex: number): number | null {
  const { startBar, melodyPcs } = request;
  if (!melodyPcs) return null;
  const i = barIndex - startBar;
  if (i < 0 || i >= melodyPcs.length) return null;
  const v = melodyPcs[i];
  return v === undefined ? null : v;
}

/** Legacy fit score when chord strip / context is incomplete — same mean×10 as former placeholder. */
function reharmFallbackMeanCandidateScore(
  prog: AlternativeProgression,
  entries: BarChordEntry[],
  request: ReharmSequenceRequest,
  drift: EmotionalDrift
): number {
  const nums: number[] = [];
  for (const bar of prog.bars) {
    if (bar.mappingNull || bar.strategy === 'passthrough') continue;
    const entry = entries.find((e) => e.barIndex === bar.barIndex);
    if (!entry || entry.mappingNull) continue;
    const melodyPc = melodyPcForBar(request, bar.barIndex);
    if (bar.strategy === 'identity') {
      nums.push(0.55);
      continue;
    }
    const cands = generateReharmCandidates(entry.vaultChordTypeId, entry.rootPc, melodyPc, drift);
    const match = cands.find(
      (c) => c.substituteChordTypeId === bar.substituteChordTypeId && c.strategy === bar.strategy
    );
    nums.push(match ? scoreReharmCandidate(match, drift, melodyPc) : 0.45);
  }
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const scaled = mean * 10;
  return Math.min(10, Math.max(0, scaled));
}

/**
 * Full GCE weighted overall ({@link scoreResultForGce}) on a stub duo score with the **merged** progression
 * and optional per-bar melody pitch classes — same pillars as melodic variation pack scoring.
 */
function gceOverallForReharmProgression(
  prog: AlternativeProgression,
  request: ReharmSequenceRequest,
  drift: EmotionalDrift,
  entries: BarChordEntry[]
): number {
  const ctx = request.context;
  const tb = Math.max(1, ctx.form.totalBars | 0);
  const src = chordSourceForContext(ctx);
  if (!src) {
    return reharmFallbackMeanCandidateScore(prog, entries, request, drift);
  }
  const merged = spliceAlternativeIntoChordStrip(src, prog, request.startBar, request.endBar);
  const line = stubMelodicLineFromMelodyPcs(tb, request.startBar, request.endBar, request.melodyPcs);
  const scoreModel = buildStubDuoScoreFromMelodicLine(line, merged);
  const sections = gceSectionsFromFormMap(ctx.form);
  return scoreResultForGce(
    scoreModel,
    merged,
    sections,
    ctx.generationMetadata?.songwriterStyleId
  ).overallScore;
}

function resolveSeed(requested: number | undefined): number {
  if (requested !== undefined && Number.isFinite(requested)) return Math.floor(requested);
  return (Math.floor(seededUnit(4242, 17, 90211) * 0xffffffff) >>> 0) % 2147483647;
}

/**
 * Runs sequence generation + per-progression GCE overall scores (same pipeline as melodic variation pack).
 */
export function executeReharm(request: ReharmSequenceRequest): ReharmResult {
  const { startBar, endBar, lensIds } = request;
  const seed = resolveSeed(request.seed);
  const drift: EmotionalDrift = request.drift ?? 'neutral';

  const seqRequest: ReharmSequenceRequest = { ...request, seed };
  const alternatives = generateReharmSequence(seqRequest).map((p) => ({ ...p }));
  const entries = getChordRangeForBars(startBar, endBar, request.context);

  for (const alt of alternatives) {
    alt.gceScore = gceOverallForReharmProgression(alt, seqRequest, drift, entries);
  }

  return {
    alternatives,
    requestedLens: [...lensIds],
    startBar,
    endBar,
    seed,
  };
}
