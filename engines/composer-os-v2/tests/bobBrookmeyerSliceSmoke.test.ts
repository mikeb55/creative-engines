/**
 * Smoke — Bob Brookmeyer pitch-module / line-first slice (golden path + brk receipts).
 */

import type { CompositionContext } from '../core/compositionContext';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import { ContrapuntalLineEngine } from '../core/counterpoint/ContrapuntalLineEngine';

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
      styleSeparationGate(r, rBarto),
    name: 'Bob Brookmeyer slice: golden path + brk + contrapuntal Gate A/B (Brookmeyer + Bartók)',
  });

  return out;
}
