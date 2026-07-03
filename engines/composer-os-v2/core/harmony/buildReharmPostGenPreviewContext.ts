import type { CompositionContext } from '../compositionContext';
import { buildDuoLongFormCompositionContextFromBars } from '../form/buildLongFormFromDuoSections';
import { normalizeSongwriterStyleKey } from '../song-mode/songwriterStyleProfiles';
import { getChordForBar } from './harmonyResolution';
import { runReharmPreviewSlicePrecompute } from './runReharmPreviewSlicePrecompute';

export type BuildReharmPostGenPreviewContextOpts = {
  songwriterStyleId?: string;
  styleTransferWayneHarmonyAuthoritative?: boolean;
};

export function buildReharmPostGenPreviewContext(
  seed: number,
  bars: string[],
  opts?: BuildReharmPostGenPreviewContextOpts
): CompositionContext {
  const { context } = buildDuoLongFormCompositionContextFromBars(seed, bars, {
    presetId: 'guitar_bass_duo',
    harmonyModeRequested: 'custom_locked',
  });

  const rawSid = opts?.songwriterStyleId?.trim() ?? '';
  const sid = rawSid ? normalizeSongwriterStyleKey(rawSid) ?? rawSid : undefined;

  context.generationMetadata = {
    ...context.generationMetadata,
    ...(sid ? { songwriterStyleId: sid } : {}),
    ...(opts?.styleTransferWayneHarmonyAuthoritative === true
      ? { styleTransferWayneHarmonyAuthoritative: true }
      : {}),
  };

  runReharmPreviewSlicePrecompute(context);
  return context;
}

export function effectiveHarmonyStripFromContext(context: CompositionContext): string[] {
  const tb = context.form.totalBars;
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) out.push(getChordForBar(b, context).trim());
  return out;
}