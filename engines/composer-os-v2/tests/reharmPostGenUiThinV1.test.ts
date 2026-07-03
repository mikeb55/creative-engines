import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  buildReharmPostGenPreviewContext,
  effectiveHarmonyStripFromContext,
} from '../core/harmony/buildReharmPostGenPreviewContext';
import { applyReharmAlternative, executeReharm } from '../core/harmony/reharmController';

const SEED = 50021;
const TOTAL_BARS = 32;
const UNIT = ['Dm9', 'G13', 'Cmaj9', 'A7alt'];
const STATIC_BARS = Array.from({ length: TOTAL_BARS }, (_, i) => UNIT[i % UNIT.length]!);

const GP_OPTS = {
  presetId: 'guitar_bass_duo' as const,
  totalBars: TOTAL_BARS,
  longFormEnabled: true,
  songModeHookFirstIdentity: true,
  primarySongwriterStyle: 'bill_evans',
};

export function runReharmPostGenUiThinV1Tests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  let ctx: ReturnType<typeof buildReharmPostGenPreviewContext> | null = null;
  let pending: string[] | null = null;

  try {
    ctx = buildReharmPostGenPreviewContext(SEED, STATIC_BARS, { songwriterStyleId: 'bill_evans' });
    const eff = effectiveHarmonyStripFromContext(ctx);
    out.push({
      name: 'buildReharmPostGenPreviewContext + slice precompute: effective strip matches form',
      ok: eff.length === TOTAL_BARS && eff.every((s) => typeof s === 'string' && s.length > 0),
    });
  } catch {
    out.push({
      name: 'buildReharmPostGenPreviewContext + slice precompute: effective strip matches form',
      ok: false,
    });
    return out;
  }

  try {
    const reharm = executeReharm({
      context: ctx!,
      startBar: 9,
      endBar: 12,
      lensIds: ['bill_evans'],
      seed: SEED,
    });
    const alt = reharm.alternatives[0];
    pending = alt ? applyReharmAlternative(alt, 9, 12, ctx!) : null;
    out.push({
      name: 'post-gen path: executeReharm + applyReharmAlternative returns full pending strip',
      ok: !!pending && pending.length === TOTAL_BARS,
    });
  } catch {
    out.push({
      name: 'post-gen path: executeReharm + applyReharmAlternative returns full pending strip',
      ok: false,
    });
    return out;
  }

  try {
    const regen = runGoldenPathOnce(SEED, {
      ...GP_OPTS,
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: [...pending!],
      parsedChordBars: [...pending!],
      chordProgressionText: pending!.join(' | '),
    });
    out.push({
      name: 'post-gen Apply path: custom_locked regen succeeds after staged pendingStrip',
      ok: regen.success && !!regen.score && regen.context.lockedHarmonyBarsRaw?.length === TOTAL_BARS,
    });
  } catch {
    out.push({
      name: 'post-gen Apply path: custom_locked regen succeeds after staged pendingStrip',
      ok: false,
    });
  }

  return out;
}