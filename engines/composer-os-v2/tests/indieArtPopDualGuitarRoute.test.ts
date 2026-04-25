/**
 * Song Mode–style request as used by the app: runGoldenPathOnce with Indie + separate
 * DADGAD + CGDGBD. Proves the dual–electric-guitar path (guitar + guitar_2) is taken,
 * not guitar + upright bass.
 */
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

const DADGAD: [string, string, string, string, string, string] = ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'];
const CGDGBD: [string, string, string, string, string, string] = ['C2', 'G2', 'D3', 'G3', 'B3', 'D4'];

export function runIndieArtPopDualGuitarRouteTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const r = runGoldenPathOnce(4252026, {
    presetId: 'guitar_bass_duo',
    songModeHookFirstIdentity: true,
    styleProfile: 'STYLE_INDIE_ART_POP',
    harmonyMode: 'builtin',
    /** 32 bars: Song Mode motif/phrase validation expects a 32-bar form (e.g. bar-25 return hooks). */
    totalBars: 32,
    longFormEnabled: true,
    alternateGuitarTuning: {
      mode: 'separate',
      guitar1: { presetId: 'custom', strings: DADGAD },
      guitar2: { presetId: 'custom', strings: CGDGBD },
    },
    suppressWybleVoiceLayoutForTest: true,
  });

  const p1 = r.score.parts.find((p) => p.id === 'guitar');
  const p2 = r.score.parts.find((p) => p.id === 'guitar_2');
  out.push({
    ok: !!p1 && p1.instrumentIdentity === 'clean_electric_guitar' && p1.name.toLowerCase().includes('guitar'),
    name: 'Indie dual route: Guitar 1 is clean electric (Song Mode hook path)',
  });
  out.push({
    ok: !!p2 && p2.instrumentIdentity === 'clean_electric_guitar',
    name: 'Indie dual route: remapped part is guitar_2 (electric), not acoustic bass',
  });
  out.push({
    ok: !r.score.parts.some((p) => p.instrumentIdentity === 'acoustic_upright_bass'),
    name: 'Indie dual route: no upright-bass part in score model',
  });
  out.push({
    ok: r.context.generationMetadata?.alternateGuitarTuning?.mode === 'separate',
    name: 'Indie dual route: generationMetadata carries separate alternateGuitarTuning',
  });
  return out;
}
