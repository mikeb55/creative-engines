/**
 * Smoke — Bob Brookmeyer pitch-module / line-first slice (golden path + brk receipts).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

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
  return rhythmicallyIndependent && spreadOk && interlock;
}

function bartokContrapuntalGate(r: ReturnType<typeof runGoldenPathOnce>): boolean {
  const ls = r.context?.generationMetadata?.contrapuntalLineSet;
  if (!ls || ls.styleSourceVrbId !== 'bartok') return false;
  if (!ls.imitationMap?.length) return false;
  const s = ls.voices.find((x) => x.role === 'soprano')?.notes ?? [];
  let hasTritoneOrHalf = false;
  for (let i = 1; i < s.length; i++) {
    const ic = Math.abs(s[i]!.pitchMidi - s[i - 1]!.pitchMidi) % 12;
    if (ic === 1 || ic === 6) hasTritoneOrHalf = true;
  }
  const roles = ls.voices.map((v) => v.role).sort().join(',');
  return hasTritoneOrHalf && roles.includes('soprano') && roles.includes('tenor');
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
      receipt.includes('Brookmeyer'),
    name: 'Bob Brookmeyer slice: golden path + brk receipts + pitch module',
  });

  const rBarto = runGoldenPathOnce(61234, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bartok',
    harmonicVoice: 'bartok',
  });

  out.push({
    ok: brookmeyerContrapuntalGate(r) && bartokContrapuntalGate(rBarto),
    name: 'ContrapuntalLineEngine Pass 3: Brookmeyer + Bartók line-set + musical gate',
  });

  return out;
}
