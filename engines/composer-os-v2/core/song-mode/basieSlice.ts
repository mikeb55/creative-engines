/**
 * Count Basie — Kansas City swing / riff-head big-band harmony slice (`cb:*` receipts).
 * Functional blues vocabulary, sparse comp posture, shout homophony tied to head material.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { BasieEpisodePlan, BasieEpisodeSegment, BasieEpisodeType } from './basieEpisodeTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type BasieTestamentMode = 'old_testament' | 'new_testament';

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

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function looksDominantSeventhFamily(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /7|9|13/.test(tl);
}

function stripAvoidPlainEleventh(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  if (!/\(11\)|11(?!\)|#)/.test(hp) || /#11/.test(hp)) return symbol;
  let next = hp.replace(/\([^)]*11[^)]*\)/g, (m) => (/13|9/.test(m) ? m : ''));
  next = next.replace(/\b11\b/g, '');
  const slash = slashTail(symbol);
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const rest = next.slice(root.length).trim();
  return `${root}${rest}${slash}`;
}

function enrichBasieDominant(symbol: string, seed: number, bar: number): string {
  if (!looksDominantSeventhFamily(symbol)) return symbol;
  let sym = stripAvoidPlainEleventh(symbol);
  const hp = parseChordSymbol(sym).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return sym;
  const slash = slashTail(sym);
  const tl = hp.toLowerCase();
  if (/13|9/.test(tl) && !/11/.test(tl.replace('#11', ''))) return sym;
  const u = seededUnit(seed, bar, 881101);
  if (u < 0.5) return `${root}9${slash}`;
  return `${root}13${slash}`;
}

function episodeTypeAtBar(plan: BasieEpisodePlan, bar: number): BasieEpisodeType | undefined {
  const seg = plan.segments.find((s) => bar >= s.startBar && bar <= s.endBar);
  return seg?.kind;
}

export function buildBasieEpisodePlan(seed: number, totalBars: number, riffAnchorSymbol: string): BasieEpisodePlan {
  const tb = Math.max(4, Math.floor(totalBars));
  const tagLen = tb >= 16 ? 3 : tb >= 8 ? 2 : 1;
  const tagStart = Math.max(2, tb - tagLen + 1);
  const headEnd = Math.min(Math.max(2, Math.floor(tb * 0.28) + (seed % 4)), Math.max(2, tb - tagLen - 1));
  const shoutLen = Math.max(2, Math.min(12, Math.floor(tb * 0.26)));
  let shoutStart = Math.min(tb, Math.max(headEnd + 1, tagStart - shoutLen));
  if (shoutStart >= tagStart) shoutStart = Math.max(headEnd + 1, tagStart - 2);
  if (shoutStart >= tagStart) shoutStart = tagStart - 1;
  const soloStart = headEnd + 1;
  const soloEnd = Math.min(tb, Math.max(soloStart - 1, shoutStart - 1));

  const segments: BasieEpisodeSegment[] = [];
  segments.push({ kind: 'riff_head', startBar: 1, endBar: headEnd });
  if (soloStart <= soloEnd && shoutStart > soloEnd) {
    segments.push({ kind: 'solo_background', startBar: soloStart, endBar: soloEnd });
  }
  if (shoutStart < tagStart) {
    segments.push({ kind: 'shout', startBar: shoutStart, endBar: tagStart - 1 });
  }
  segments.push({ kind: 'tag', startBar: tagStart, endBar: tb });

  return {
    segments,
    riffAnchorSymbol,
    shoutStartBar: shoutStart,
    tagStartBar: tagStart,
  };
}

export function resolveBasieTestament(genMeta: GenerationMetadata, seed: number): BasieTestamentMode {
  const raw = genMeta.basieTestamentMode as BasieTestamentMode | undefined;
  if (raw === 'old_testament' || raw === 'new_testament') return raw;
  return Math.abs(seed) % 2 === 0 ? 'old_testament' : 'new_testament';
}

export function isSongwriterCountBasie(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'count_basie' } {
  return genMeta?.songwriterStyleId === 'count_basie';
}

export interface BasieHarmonyAccumulator {
  barsConsidered: number;
  extensionTouches: number;
  dimPassTouches: number;
  shoutTouches: number;
}

export function createBasieHarmonyAccumulator(): BasieHarmonyAccumulator {
  return { barsConsidered: 0, extensionTouches: 0, dimPassTouches: 0, shoutTouches: 0 };
}

function scanBasieDiagnostics(chord: string, acc: BasieHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/9|13/.test(t)) acc.extensionTouches++;
  if (/dim/.test(t)) acc.dimPassTouches++;
}

export function accumulateBasieHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BasieHarmonyAccumulator
): void {
  scanBasieDiagnostics(currentChord, acc);
}

function applyBasieButtonEnding(
  out: string[],
  tonicPc: number | undefined,
  tagStart: number,
  tb: number,
  receipts: string[]
): void {
  if (tonicPc === undefined || tagStart > tb) return;
  const rootName = pitchClassToSharpName(tonicPc);
  const iiRoot = pitchClassToSharpName((tonicPc + 2) % 12);
  const dimRoot = pitchClassToSharpName((tonicPc + 3) % 12);
  const span = tb - tagStart + 1;
  if (span >= 3) {
    out[tb - 3] = `${iiRoot}m7`;
    out[tb - 2] = `${dimRoot}dim7`;
    out[tb - 1] = `${rootName}6/9`;
    receipts.push('cb:basie_button@tail');
  } else if (span === 2) {
    out[tb - 2] = `${dimRoot}dim7`;
    out[tb - 1] = `${rootName}6/9`;
    receipts.push('cb:basie_button@short');
  }
}

function applyShoutRiffReuse(
  out: string[],
  plan: BasieEpisodePlan,
  seed: number,
  receipts: string[],
  tb: number
): void {
  const anchorStem = stemOnly(plan.riffAnchorSymbol);
  const anchorRoot = parseChordSymbol(anchorStem).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!anchorRoot) return;
  for (let b = plan.shoutStartBar; b < plan.tagStartBar && b <= tb; b++) {
    if (seededUnit(seed, b, 881201) > 0.42) continue;
    const i = b - 1;
    const cur = out[i]!;
    const slash = slashTail(cur);
    const merge = `${anchorRoot}9${slash}`;
    if (merge !== cur) {
      out[i] = merge;
      receipts.push(`cb:shout_riff_reuse@${b}`);
    }
  }
}

export function precomputeBasieEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const resolvedTestament = resolveBasieTestament(genMeta, seed);
  genMeta.basieResolvedTestament = resolvedTestament;
  if (genMeta.basieTestamentMode !== 'old_testament' && genMeta.basieTestamentMode !== 'new_testament') {
    genMeta.basieTestamentMode = resolvedTestament;
  }
  context.basieTestamentMode = genMeta.basieTestamentMode;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }
  const riffAnchorSymbol = raw[0] ?? 'C7';
  const plan = buildBasieEpisodePlan(seed, tb, riffAnchorSymbol);
  genMeta.basieEpisodePlan = plan;

  for (const seg of plan.segments) {
    receipts.push(`cb:episode_${seg.kind}@${seg.startBar}-${seg.endBar}`);
  }
  receipts.push(`cb:testament=${resolvedTestament}`);

  const tonicPc = inferTonicPitchClassFromBar1(context);

  const out = raw.map((s, idx) => {
    const bar = idx + 1;
    let sym = s;
    sym = enrichBasieDominant(sym, seed, bar);
    return sym;
  });

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const ep = episodeTypeAtBar(plan, bar);
    if (
      ep === 'solo_background' &&
      seededUnit(seed, bar, 881103) < 0.07 &&
      tonicPc !== undefined &&
      !isProtectedBar(bar, context)
    ) {
      const sym = out[i]!;
      const r = harmonyRootPc(sym);
      if (r !== undefined && r === (tonicPc + 5) % 12 && looksDominantSeventhFamily(sym)) {
        const slash = slashTail(sym);
        const sharpIvPc = (tonicPc + 6) % 12;
        out[i] = `${pitchClassToSharpName(sharpIvPc)}dim7${slash}`;
        receipts.push(`cb:sharp_iv_dim_pass@${bar}`);
      }
    }
  }

  applyShoutRiffReuse(out, plan, seed, receipts, tb);

  if (plan.tagStartBar <= tb) {
    applyBasieButtonEnding(out, tonicPc, plan.tagStartBar, tb, receipts);
  }

  const shoutBars: number[] = [];
  for (let b = plan.shoutStartBar; b < plan.tagStartBar && b <= tb; b++) {
    shoutBars.push(b);
  }
  genMeta.basieShoutBars = shoutBars;
  receipts.push(`cb:shout_homophony@${plan.shoutStartBar}-${plan.tagStartBar - 1}`);

  genMeta.basieEffectiveHarmonyBars = out;
  genMeta.basieDeviceReceipts = receipts;
}

export function finalizeBasieMetadata(metadata: GenerationMetadata, acc: BasieHarmonyAccumulator): void {
  const flat = [...(metadata.basieDeviceReceipts ?? [])];
  const ep = metadata.basieEpisodePlan;
  metadata.basieDiagnostics = {
    songwriterId: 'count_basie',
    basieResolvedTestament: metadata.basieResolvedTestament ?? metadata.basieTestamentMode,
    barsConsidered: acc.barsConsidered,
    extensionTouches: acc.extensionTouches,
    dimPassTouches: acc.dimPassTouches,
    shoutTouches: metadata.basieShoutBars?.length ?? 0,
    episodeReceipts: ep?.segments.map((s) => `${s.kind}:${s.startBar}-${s.endBar}`),
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.basieSliceReceipt = [
    `Count Basie (swing/riff slice): testament=${metadata.basieResolvedTestament ?? '—'}`,
    `shoutBars=${metadata.basieShoutBars?.length ?? 0}`,
    `ext≈${acc.extensionTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
