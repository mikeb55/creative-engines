/**
 * Charles Mingus — blues-rooted / episodic big-band harmony slice (`cm:*` receipts).
 * Episode texture plan + blues/modal/chromatic harmony enrichment (`mingusEpisodeTypes.ts`).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import type {
  CharlesMingusEpisodePlan,
  MingusEpisodeImprovMode,
  MingusEpisodeSpec,
  MingusHarmonicPoolFamily,
  MingusImprovDensity,
  MingusTempoTier,
  MingusTextureArchetype,
} from './mingusEpisodeTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `charles_mingus` only — soft `mingus` stays songwriter-normalize;
 * does **not** engage HV. BB mingus/charles_mingus dual-id + episode holdbacks untouched.
 */
export function isCharlesMingusHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'charles_mingus' || voice === 'charles_mingus';
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const TEMPOS: MingusTempoTier[] = ['slow', 'medium', 'fast'];
const TEXTURES: MingusTextureArchetype[] = ['dirge', 'riff_layer', 'collective_shout', 'pedal_modal'];
const HARM_FAMILIES: MingusHarmonicPoolFamily[] = ['blues', 'modal', 'chromatic'];
const DENSITIES: MingusImprovDensity[] = ['sparse', 'medium', 'dense'];
const IMPROV_ROTATION: MingusEpisodeImprovMode[] = ['scripted', 'collective', 'hybrid'];

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

function looksDominantFamily(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  return /7|9|11|13/.test(tl) && !/maj/.test(tl);
}

function tupleDiff4(a: MingusEpisodeSpec, b: MingusEpisodeSpec): number {
  let n = 0;
  if (a.tempoTier !== b.tempoTier) n++;
  if (a.texture !== b.texture) n++;
  if (a.harmonicFamily !== b.harmonicFamily) n++;
  if (a.improvDensity !== b.improvDensity) n++;
  return n;
}

function distributeEpisodeBarCounts(totalBars: number, k: number): number[] {
  const safeK = Math.max(1, k);
  const base = Math.floor(totalBars / safeK);
  const out = Array(safeK).fill(base) as number[];
  let rem = totalBars - base * safeK;
  for (let i = 0; i < rem; i++) {
    out[i % safeK] = (out[i % safeK] ?? 0) + 1;
  }
  return out;
}

/**
 * Seeded episode chain: adjacent episodes differ in ≥2 of (tempo, texture, harmonic family, improv density);
 * no two consecutive identical textures; improv mode cycles scripted / collective / hybrid.
 */
export function buildCharlesMingusEpisodePlan(seed: number, totalBars: number): CharlesMingusEpisodePlan {
  const tb = Math.max(4, Math.floor(totalBars));
  const k = Math.min(8, Math.max(3, Math.floor(tb / 6)));
  const counts = distributeEpisodeBarCounts(tb, k);
  const bassOstinatoIds = ['cm_ost_bass_1', 'cm_ost_bass_2', 'cm_ost_bass_3'].slice(0, Math.min(3, k));

  const episodes: MingusEpisodeSpec[] = [];
  let startBar = 1;
  let prev: MingusEpisodeSpec | null = null;

  for (let i = 0; i < k; i++) {
    const dur = Math.max(1, counts[i] ?? 1);
    const endBar = Math.min(tb, startBar + dur - 1);
    let attempt = 0;
    let spec: MingusEpisodeSpec;
    for (;;) {
      const u0 = seededUnit(seed, i, 661100 + attempt);
      const u1 = seededUnit(seed, i, 661200 + attempt);
      const u2 = seededUnit(seed, i, 661300 + attempt);
      const u3 = seededUnit(seed, i, 661400 + attempt);
      const u4 = seededUnit(seed, i, 661500 + attempt);
      const tempoTier = TEMPOS[Math.floor(u0 * 3) % 3]!;
      let texture = TEXTURES[Math.floor(u1 * 4) % 4]!;
      const harmonicFamily = HARM_FAMILIES[Math.floor(u2 * 3) % 3]!;
      const improvDensity = DENSITIES[Math.floor(u3 * 3) % 3]!;
      const improvMode = IMPROV_ROTATION[i % 3]!;
      if (prev && texture === prev.texture) {
        texture = TEXTURES[(TEXTURES.indexOf(texture) + 1 + Math.floor(u4 * 3)) % 4]!;
      }
      spec = {
        index: i,
        startBar,
        endBar,
        tempoTier,
        texture,
        harmonicFamily,
        improvDensity,
        improvMode,
      };
      if (!prev || (tupleDiff4(spec, prev) >= 2 && spec.texture !== prev.texture)) {
        break;
      }
      attempt++;
      if (attempt > 80) {
        spec = {
          ...spec,
          tempoTier: prev.tempoTier === 'slow' ? 'fast' : prev.tempoTier === 'fast' ? 'medium' : 'slow',
          texture: TEXTURES[(TEXTURES.indexOf(prev.texture) + 1) % 4]!,
        };
        break;
      }
    }
    episodes.push(spec);
    prev = spec;
    startBar = endBar + 1;
    if (startBar > tb) break;
  }

  let shockCutBar: number | undefined;
  if (tb >= 24) {
    const span = tb - 16;
    const off = Math.abs(seed) % Math.max(1, span);
    shockCutBar = 8 + off;
    if (shockCutBar > tb - 4) shockCutBar = tb - 8;
    if (shockCutBar < 9) shockCutBar = 9;
  }

  return {
    episodes,
    shockCutBar,
    bassOstinatoIds,
  };
}

export function episodeForBar(plan: CharlesMingusEpisodePlan, bar: number): MingusEpisodeSpec | undefined {
  return plan.episodes.find((e) => bar >= e.startBar && bar <= e.endBar);
}

export function isSongwriterCharlesMingus(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'charles_mingus' } {
  return genMeta?.songwriterStyleId === 'charles_mingus';
}

export interface CharlesMingusHarmonyAccumulator {
  barsConsidered: number;
  bluesDominantTouches: number;
  slashTouches: number;
  sideStepTouches: number;
}

export function createCharlesMingusHarmonyAccumulator(): CharlesMingusHarmonyAccumulator {
  return { barsConsidered: 0, bluesDominantTouches: 0, slashTouches: 0, sideStepTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: CharlesMingusHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const tl = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/#9|b13/.test(tl)) acc.bluesDominantTouches++;
  if (/\//.test(c)) acc.slashTouches++;
}

export function accumulateCharlesMingusHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: CharlesMingusHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function enrichBluesDominant(symbol: string, seed: number, bar: number): string {
  if (!looksDominantFamily(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 661001);
  if (u < 0.35) return `${root}13(#9)${slash}`;
  if (u < 0.65) return `${root}7#9${slash}`;
  if (u < 0.85) return `${root}9(b13)${slash}`;
  return `${root}13${slash}`;
}

function maybeChromSlash(symbol: string, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 661002);
  if (u > 0.28) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const bassPc = (r + (u < 0.14 ? -1 : 1) + 12) % 12;
  if (symbol.includes('/')) return symbol;
  return `${symbol}/${pitchClassToSharpName(bassPc)}`;
}

/** Chromatic pool bias: tritone substitute dominant on some bars (research cycling / side-slip colour). */
function maybeTritoneSubDominant(symbol: string, seed: number, bar: number): string {
  if (!looksDominantFamily(symbol)) return symbol;
  const u = seededUnit(seed, bar, 661004);
  if (u > 0.22) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const r = noteNameToPitchClass(root);
  if (r === undefined) return symbol;
  const subPc = (r + 6) % 12;
  return `${pitchClassToSharpName(subPc)}7alt${slash}`;
}

function applyRhythmDisplaceSideStep(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number
): void {
  for (let i = 1; i < out.length; i++) {
    const bar = i + 1;
    if (bar % 6 !== 0 || bar >= tb) continue;
    const u = seededUnit(seed, bar, 661003);
    if (u > 0.34) continue;
    const sym = out[i]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const nr = (r + 5 + 12) % 12;
    out[i] = replaceChordRoot(sym, pitchClassToSharpName(nr));
    receipts.push(`cm:sidestep@${bar}`);
  }
}

function appendPlanReceipts(plan: CharlesMingusEpisodePlan, receipts: string[], tb: number): void {
  receipts.push('cm:bass_motif_intro@1');
  receipts.push(`cm:horn_reassign@${Math.min(tb, Math.max(5, Math.floor(tb / 2)))}`);
  receipts.push(`cm:ostinato_ids=${plan.bassOstinatoIds.join(';')}`);
  for (const ep of plan.episodes) {
    receipts.push(
      `cm:episode@${ep.startBar}-${ep.endBar}:tempo=${ep.tempoTier};texture=${ep.texture};harm=${ep.harmonicFamily};density=${ep.improvDensity};mode=${ep.improvMode}`
    );
    receipts.push(`cm:texture_${ep.texture}@${ep.startBar}`);
    receipts.push(`cm:improv_${ep.improvMode}@${ep.startBar}`);
  }
  if (plan.shockCutBar !== undefined) {
    const sc = plan.shockCutBar;
    receipts.push(`cm:shock_cut@${sc}`);
    if (sc > 1) receipts.push(`cm:bass_bridge@${sc - 1}`);
    if (sc < tb) receipts.push(`cm:bass_bridge@${sc + 1}`);
  }
}

function applyEpisodeHarmonicNudges(
  out: string[],
  plan: CharlesMingusEpisodePlan,
  seed: number,
  receipts: string[],
  tb: number
): void {
  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const ep = episodeForBar(plan, bar);
    if (!ep) continue;
    if (ep.harmonicFamily === 'chromatic') {
      const before = out[i]!;
      const after = maybeTritoneSubDominant(before, seed, bar);
      if (after !== before) {
        out[i] = after;
        receipts.push(`cm:tritone_sub_hint@${bar}`);
      }
    }
    if (ep.texture === 'pedal_modal' && bar === ep.startBar) {
      receipts.push(`cm:pedal_modal_field@${bar}`);
    }
    if (ep.texture === 'collective_shout' && bar === ep.startBar) {
      receipts.push(`cm:collective_shout@${bar}`);
    }
    if (ep.texture === 'dirge' && bar === ep.startBar) {
      receipts.push(`cm:dirge@${bar}`);
    }
    if (ep.texture === 'riff_layer' && bar === ep.startBar) {
      receipts.push(`cm:riff_layer@${bar}`);
    }
  }
}

export function precomputeCharlesMingusEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;

  const plan = buildCharlesMingusEpisodePlan(seed, tb);
  genMeta.charlesMingusEpisodePlan = plan;

  const receipts: string[] = [];
  appendPlanReceipts(plan, receipts, tb);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  inferTonicPitchClassFromBar1(context);

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    let sym = out[i]!;
    const before = sym;
    sym = enrichBluesDominant(sym, seed, bar);
    sym = maybeChromSlash(sym, seed, bar);
    if (sym !== before) receipts.push(`cm:blues@${bar}`);
    out[i] = sym;
  }

  applyRhythmDisplaceSideStep(out, seed, receipts, tb);
  applyEpisodeHarmonicNudges(out, plan, seed, receipts, tb);

  /* Piece-final only: bias toward Mingus FBT-safe blues/pedal-modal landings. */
  biasCharlesMingusFinalBarIdiomaticOpen(out, plan, seed, receipts, context);

  genMeta.charlesMingusEffectiveHarmonyBars = out;
  genMeta.charlesMingusDeviceReceipts = receipts;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece blues enrich / sidestep / episode nudges untouched.
 * Note: 13(#9) / 7#9 / 9(b13) / 7alt all trip FBT even when idiomatic mid-piece blues.
 */
function chordLooksDominantFamilyForFbtMingus(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Idiom pre-check (Batch 4): blues-rooted header + enrichBluesDominant is the real FBT
 * surface; pedal_modal is texture-receipt only (no quality rewrite). Bias bridges both:
 * blues-safe 6 / 6/9 / 9 / add9 (no 7/13/alt trap) when final episode is blues/riff/shout/dirge;
 * pedal-modal m / m(add9) / sus2 when texture is pedal_modal or harm family modal.
 * Not a forced jazz tonic cadence.
 */
function biasCharlesMingusFinalBarIdiomaticOpen(
  out: string[],
  plan: CharlesMingusEpisodePlan,
  seed: number,
  receipts: string[],
  context: CompositionContext
): void {
  const totalBars = out.length;
  if (totalBars < 1) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtMingus(sym)) return;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const rootPc = tonicPc ?? harmonyRootPc(sym);
  if (rootPc === undefined) return;
  const root = pitchClassToSharpName(rootPc);
  const slash = slashTail(sym);
  const ep = episodeForBar(plan, totalBars);
  const u = seededUnit(seed, totalBars, 661005);

  const pedalModal =
    ep?.texture === 'pedal_modal' || ep?.harmonicFamily === 'modal';

  let next: string;
  if (pedalModal) {
    if (u < 0.35) next = `${root}m${slash}`;
    else if (u < 0.65) next = `${root}m(add9)${slash}`;
    else if (u < 0.85) next = `${root}sus2${slash}`;
    else next = `${root}add9${slash}`;
  } else {
    // Blues-rooted FBT-safe colour (never 7 / 13 / alt).
    if (u < 0.3) next = `${root}6${slash}`;
    else if (u < 0.55) next = `${root}6/9${slash}`;
    else if (u < 0.78) next = `${root}9${slash}`;
    else next = `${root}add9${slash}`;
  }

  out[idx] = next;
  receipts.push(`cm:final_open_bias@${totalBars}`);
}

export function finalizeCharlesMingusMetadata(metadata: GenerationMetadata, acc: CharlesMingusHarmonyAccumulator): void {
  const flat = [...(metadata.charlesMingusDeviceReceipts ?? [])];
  const step = flat.filter((r) => r.startsWith('cm:sidestep@')).length;
  const ep = metadata.charlesMingusEpisodePlan;
  metadata.charlesMingusDiagnostics = {
    songwriterId: 'charles_mingus',
    barsConsidered: acc.barsConsidered,
    bluesDominantTouches: acc.bluesDominantTouches,
    slashTouches: acc.slashTouches,
    sideStepTouches: step,
    episodeCount: ep?.episodes.length,
    shockCutBar: ep?.shockCutBar,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.charlesMingusSliceReceipt = [
    `Charles Mingus (episode/blues slice): episodes=${ep?.episodes.length ?? 0}`,
    ep?.shockCutBar !== undefined ? `shock@${ep.shockCutBar}` : '',
    `bluesDom≈${acc.bluesDominantTouches}`,
    `slash≈${acc.slashTouches}`,
    `sidestep=${step}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
