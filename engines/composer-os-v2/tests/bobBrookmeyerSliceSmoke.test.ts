/**
 * Smoke — Bob Brookmeyer pitch-module / line-first slice (golden path + brk receipts).
 */

import type { CompositionContext } from '../core/compositionContext';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import { ContrapuntalLineEngine } from '../core/counterpoint/ContrapuntalLineEngine';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_IDS } from '../core/goldenPath/duoAbstractLineWiring';
import type { NoteEvent, PartModel } from '../core/score-model/scoreModelTypes';

const dummyCtx = { seed: 0, voiceBundle: undefined, harmonicScenes: undefined, form: { totalBars: 64 } } as CompositionContext;

/** Gate B — max consecutive integer downbeats where ≥2 voices share same onset (within eps). */
function strongBeatCoOnsetGate(ls: AbstractLineSet, maxConsecutive: number): boolean {
  const eps = 1e-3;
  let run = 0;
  let worst = 0;
  for (let bar = 0; bar < ls.lengthBars; bar++) {
    const t = bar;
    const nAt = ls.voices.filter((v) => v.notes.some((n) => Math.abs(n.offsetBars - t) < eps)).length;
    if (nAt >= 2) {
      run++;
      worst = Math.max(worst, run);
    } else {
      run = 0;
    }
  }
  return worst <= maxConsecutive;
}

function sqRoutingGate(ls: AbstractLineSet): boolean {
  const eng = new ContrapuntalLineEngine(ls.styleSourceVrbId, dummyCtx);
  const sq = eng.renderForStringQuartet(ls);
  return (
    sq.assignments.length === 4 &&
    sq.assignments.every((a) => a.notes.length > 0) &&
    new Set(sq.assignments.map((a) => a.staffName)).size === 4
  );
}

function bbRoutingGate(ls: AbstractLineSet): boolean {
  const eng = new ContrapuntalLineEngine(ls.styleSourceVrbId, dummyCtx);
  const bb = eng.renderForBigBand(ls);
  return Boolean(bb.soliPlan?.kind === 'soli' && bb.backgroundsPlan?.kind === 'backgrounds');
}

function styleSeparationGate(
  rBrook: ReturnType<typeof runGoldenPathOnce>,
  rBarto: ReturnType<typeof runGoldenPathOnce>,
): boolean {
  const bbls = rBrook.context?.generationMetadata?.contrapuntalLineSet;
  const btls = rBarto.context?.generationMetadata?.contrapuntalLineSet;
  if (!bbls || bbls.styleSourceVrbId !== 'bob_brookmeyer' || !btls || btls.styleSourceVrbId !== 'bartok') return false;
  const allBrookPartials = bbls.voices.flatMap((v) => v.notes.map((n) => Math.round((n.offsetBars % 1) * 1000)));
  const bartOuterPartials = (['soprano', 'alto', 'bass'] as const).flatMap((role) =>
    btls.voices.find((v) => v.role === role)!.notes.map((n) => Math.round((n.offsetBars % 1) * 1000)),
  );
  const brookMicroSwing = allBrookPartials.some((x) => x % 125 !== 0);
  const bartOnGrid = bartOuterPartials.length > 0 && bartOuterPartials.every((x) => x % 125 === 0);
  const hasImitation = (btls.imitationMap?.length ?? 0) > 0 && !(bbls.imitationMap?.length ?? 0);
  return bartOnGrid && brookMicroSwing && hasImitation;
}

function brookmeyerContrapuntalGate(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  if (!ls || ls.styleSourceVrbId !== 'bob_brookmeyer') return false;
  if (ls.voices.length !== 4) return false;
  if (ls.voices.some((v) => v.notes.length < 2)) return false;
  const sOff = new Set(ls.voices.find((x) => x.role === 'soprano')!.notes.map((n) => Math.round((n.offsetBars % 1) * 1000)));
  const bOff = new Set(ls.voices.find((x) => x.role === 'bass')!.notes.map((n) => Math.round((n.offsetBars % 1) * 1000)));
  const rhythmicallyIndependent = sOff.size >= 1 && bOff.size >= 1 && (sOff.size + bOff.size >= 3);
  const means = ls.voices.map((v) => v.notes.reduce((a, x) => a + x.pitchMidi, 0) / Math.max(1, v.notes.length));
  const distinctMeans = new Set(means.map((m) => Math.round(m))).size;
  const spreadOk = distinctMeans >= 3;
  const interlock = ls.voices.every((v) => {
    const xs = v.notes.map((n) => n.pitchMidi);
    return xs.every((p) => p >= 24 && p <= 120);
  });
  return (
    rhythmicallyIndependent &&
    spreadOk &&
    interlock &&
    strongBeatCoOnsetGate(ls, 2) &&
    bbRoutingGate(ls)
  );
}

/** SQ VRB ids — Run 1: duo line-first engine + `contrapuntalLinePolicy.enabled`. */
const SQ_FAMILY_DUO_ENGINE_IDS = [
  'beethoven_late',
  'turtle_island',
  'reich_glass',
  'shostakovich',
  'lachenmann',
  'crumb_black_angels',
  'part',
  'dutilleux',
] as const;

function duoVoicePolicyStubsOk(): boolean {
  for (const id of LINE_FIRST_DUO_ENGINE_VRB_IDS) {
    const p = getVoiceRuleBundle(id).duoVoicePolicy;
    if (!p || p.guitarSource !== 'soprano_line' || p.bassSource !== 'bass_line') return false;
    if (typeof p.rhythmicIndependenceFloor !== 'number') return false;
    if (p.registerInterlock !== true) return false;
    if (!p.intervalPreference) return false;
  }
  const bb = getVoiceRuleBundle('bob_brookmeyer').duoVoicePolicy;
  const bt = getVoiceRuleBundle('bartok').duoVoicePolicy;
  if (!bb || !bt) return false;
  if (bb.intervalPreference !== 'chromatic') return false;
  if (bt.intervalPreference !== 'ic1_tritone' || bt.rhythmicIndependenceFloor !== 0.8) return false;
  for (const id of SQ_FAMILY_DUO_ENGINE_IDS) {
    const b = getVoiceRuleBundle(id);
    if (!b.duoVoicePolicy) return false;
    if (!b.contrapuntalLinePolicy?.enabled) return false;
  }
  return true;
}

/** Gate B — score-level worst consecutive strong-beat guitar+bass co-onsets (downbeat ε). */
function duoScoreStrongBeatCoOnsetWorst(guitar: PartModel, bass: PartModel, bars: number): number {
  const eps = 0.07;
  let run = 0;
  let worst = 0;
  for (let b = 1; b <= bars; b++) {
    const gm = guitar.measures.find((m) => m.index === b);
    const bm = bass.measures.find((m) => m.index === b);
    const g0 = gm?.events.find((e) => e.kind === 'note' && ((e as NoteEvent).startBeat % 4 + 4) % 4 < eps);
    const b0 = bm?.events.find((e) => e.kind === 'note' && ((e as NoteEvent).startBeat % 4 + 4) % 4 < eps);
    if (g0 && b0) {
      run++;
      worst = Math.max(worst, run);
    } else {
      run = 0;
    }
  }
  return worst;
}

function guitarBarsMatchAbstractSopranoPcs(guitar: PartModel, ls: AbstractLineSet, bar1Based: number): boolean {
  const b0 = bar1Based - 1;
  const abs = (ls.voices.find((v) => v.role === 'soprano')?.notes ?? [])
    .filter((n) => n.offsetBars >= b0 - 1e-9 && n.offsetBars < b0 + 1 - 1e-9)
    .sort((a, c) => a.offsetBars - c.offsetBars);
  const gm = guitar.measures.find((m) => m.index === bar1Based);
  const gn = (gm?.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, c) => a.startBeat - c.startBeat);
  if (abs.length === 0 || gn.length === 0) return false;
  const bagUniquePcs = (xs: number[]) =>
    [...new Set(xs)]
      .sort((a, b) => a - b)
      .join(',');
  return bagUniquePcs(abs.map((n) => Math.round(n.pitchMidi) % 12)) === bagUniquePcs(gn.map((n) => n.pitch % 12));
}

function bassBarsMatchAbstractBassPcs(bass: PartModel, ls: AbstractLineSet, bar1Based: number): boolean {
  const b0 = bar1Based - 1;
  const abs = (ls.voices.find((v) => v.role === 'bass')?.notes ?? [])
    .filter((n) => n.offsetBars >= b0 - 1e-9 && n.offsetBars < b0 + 1 - 1e-9)
    .sort((a, c) => a.offsetBars - c.offsetBars);
  const bm = bass.measures.find((m) => m.index === bar1Based);
  const bn = (bm?.events.filter((e) => e.kind === 'note') as NoteEvent[]).sort((a, c) => a.startBeat - c.startBeat);
  if (abs.length === 0 || bn.length === 0) return false;
  const bagUniquePcs = (xs: number[]) =>
    [...new Set(xs)]
      .sort((a, b) => a - b)
      .join(',');
  return bagUniquePcs(abs.map((n) => Math.round(n.pitchMidi) % 12)) === bagUniquePcs(bn.map((n) => n.pitch % 12));
}

function guitarBar1PcSig(part: PartModel): string {
  const gm = part.measures.find((m) => m.index === 1);
  return (gm?.events.filter((e) => e.kind === 'note') as NoteEvent[])
    .map((e) => e.pitch % 12)
    .sort((a, b) => a - b)
    .join(',');
}

function bartokAbstractIc1OrTritone(ls: AbstractLineSet): boolean {
  const s = ls.voices.find((x) => x.role === 'soprano')?.notes ?? [];
  for (let i = 1; i < s.length; i++) {
    const ic = Math.abs(s[i]!.pitchMidi - s[i - 1]!.pitchMidi) % 12;
    if (ic === 1 || ic === 6) return true;
  }
  return false;
}

function brookmeyerAbstractSwingChromatic(ls: AbstractLineSet): boolean {
  const s = ls.voices.find((x) => x.role === 'soprano')?.notes ?? [];
  let chrom = false;
  for (let i = 1; i < Math.min(s.length, 12); i++) {
    const d = Math.abs(s[i]!.pitchMidi - s[i - 1]!.pitchMidi);
    if (d > 0 && d <= 2) chrom = true;
  }
  const microSwing =
    s.length >= 2 &&
    new Set(s.map((n) => Math.round((n.offsetBars % 1) * 1000))).size >= 2;
  return chrom && microSwing;
}

function duoAbstractLineGateB4Bar(): boolean {
  if (!duoVoicePolicyStubsOk()) return false;
  const bb8 = ['Bbmaj7', 'Bb6', 'Cm7', 'F7', 'Bbmaj7', 'Bb6', 'Cm7', 'F7'] as const;
  const bt8 = ['F#m7b5', 'B7alt', 'Emaj7', 'Gm7', 'F#m7b5', 'B7alt', 'Emaj7', 'Gm7'] as const;
  const rBB4 = runGoldenPathOnce(99101, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...bb8],
    tonalCenterOverride: 'Bb',
    primarySongwriterStyle: 'bob_brookmeyer',
    harmonicVoice: 'bob_brookmeyer',
    songModeHookFirstIdentity: false,
    brookmeyerPeriodMode: 'late_brookmeyer',
    suppressWybleVoiceLayoutForTest: true,
  });
  const rBt4 = runGoldenPathOnce(99102, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...bt8],
    primarySongwriterStyle: 'bartok',
    harmonicVoice: 'bartok',
    songModeHookFirstIdentity: false,
    suppressWybleVoiceLayoutForTest: true,
  });
  if (!rBB4.score || !rBt4.score) return false;
  const gB = rBB4.score.parts.find((p) => p.id === 'guitar');
  const bB = rBB4.score.parts.find((p) => p.id === 'bass');
  const gT = rBt4.score.parts.find((p) => p.id === 'guitar');
  const bT = rBt4.score.parts.find((p) => p.id === 'bass');
  const lsB = rBB4.context?.generationMetadata?.contrapuntalLineSet;
  const lsT = rBt4.context?.generationMetadata?.contrapuntalLineSet;
  if (!gB || !bB || !gT || !bT || !lsB || !lsT) return false;
  const indepB = duoScoreStrongBeatCoOnsetWorst(gB, bB, 8) <= 2;
  const indepT = duoScoreStrongBeatCoOnsetWorst(gT, bT, 8) <= 2;
  const routeGB = guitarBarsMatchAbstractSopranoPcs(gB, lsB, 1) && guitarBarsMatchAbstractSopranoPcs(gB, lsB, 2);
  const routeBb = bassBarsMatchAbstractBassPcs(bT, lsT, 1) && bassBarsMatchAbstractBassPcs(bT, lsT, 2);
  const styleB = rBB4.context?.feel?.mode === 'swing' && brookmeyerAbstractSwingChromatic(lsB);
  const styleT = bartokAbstractIc1OrTritone(lsT);
  const blind = guitarBar1PcSig(gB) !== guitarBar1PcSig(gT);
  return indepB && indepT && routeGB && routeBb && styleB && styleT && blind;
}

function bartokContrapuntalGate(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  if (!ls || ls.styleSourceVrbId !== 'bartok') return false;
  if (!ls.imitationMap?.length) return false;
  const s = ls.voices.find((x) => x.role === 'soprano')?.notes ?? [];
  if (s.length < 8) return false;
  let hasTritoneOrHalf = false;
  for (let i = 1; i < s.length; i++) {
    const ic = Math.abs(s[i]!.pitchMidi - s[i - 1]!.pitchMidi) % 12;
    if (ic === 1 || ic === 6) hasTritoneOrHalf = true;
  }
  const roles = ls.voices.map((v) => v.role).sort().join(',');
  return (
    hasTritoneOrHalf &&
    roles.includes('soprano') &&
    roles.includes('tenor') &&
    strongBeatCoOnsetGate(ls, 2) &&
    sqRoutingGate(ls)
  );
}

export function runBobBrookmeyerSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50341, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bob_brookmeyer',
    harmonicVoice: 'bob_brookmeyer',
    brookmeyerPeriodMode: 'late_brookmeyer',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.bobBrookmeyerDiagnostics;
  const receipt = md?.bobBrookmeyerSliceReceipt ?? '';
  const eff = md?.bobBrookmeyerEffectiveHarmonyBars;
  const dev = md?.bobBrookmeyerDeviceReceipts ?? [];

  const rBarto = runGoldenPathOnce(61234, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bartok',
    harmonicVoice: 'bartok',
  });

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'bob_brookmeyer' &&
      diag?.songwriterId === 'bob_brookmeyer' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      Array.isArray(md?.activePitchModule) &&
      md.activePitchModule.length === 3 &&
      md?.brookmeyerLineFirstHierarchy === true &&
      md?.lineFirstHierarchy === true &&
      dev.some((x) => x.startsWith('brk:pitch_module@')) &&
      dev.some((x) => x.includes('brk:episode@')) &&
      receipt.includes('Brookmeyer') &&
      brookmeyerContrapuntalGate(r) &&
      bartokContrapuntalGate(rBarto) &&
      styleSeparationGate(r, rBarto) &&
      duoVoicePolicyStubsOk() &&
      duoAbstractLineGateB4Bar(),
    name: 'Bob Brookmeyer slice: golden path + brk + contrapuntal Gate A/B (Brookmeyer + Bartók)',
  });

  return out;
}
