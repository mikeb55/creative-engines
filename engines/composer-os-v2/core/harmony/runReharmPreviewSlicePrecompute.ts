import type { CompositionContext } from '../compositionContext';
import { attachFrankZappaHarmonyContext } from '../goldenPath/frankZappaSlice';
import { precomputeAndrewHillEffectiveHarmonyBars } from '../goldenPath/andrewHillSlice';
import { precomputeBacharachEffectiveHarmonyBars } from '../goldenPath/bacharachSlice';
import { precomputeBarryHarrisEffectiveHarmonyBars } from '../goldenPath/barryHarrisSlice';
import { precomputeBillEvansEffectiveHarmonyBars } from '../goldenPath/billEvansSlice';
import { precomputeBrianWilsonEffectiveHarmonyBars } from '../goldenPath/brianWilsonPetSoundsSlice';
import { precomputeCharlieParkerEffectiveHarmonyBars } from '../goldenPath/charlieParkerSlice';
import { precomputeDonaldFagenEffectiveHarmonyBars } from '../goldenPath/donaldFagenSlice';
import { precomputeEcmChamberEffectiveHarmonyBars } from '../goldenPath/ecmChamberSlice';
import { precomputeHerbieHancockEffectiveHarmonyBars } from '../goldenPath/herbieHancockSlice';
import { precomputeJamesBrownEffectiveHarmonyBars } from '../goldenPath/jamesBrownSlice';
import { precomputeJobimEffectiveHarmonyBars } from '../goldenPath/jobimSlice';
import { precomputeJoniMitchellEffectiveHarmonyBars } from '../goldenPath/joniMitchellSlice';
import { precomputeKateBushEffectiveHarmonyBars } from '../goldenPath/kateBushSlice';
import { precomputePatMethenyEffectiveHarmonyBars } from '../goldenPath/patMethenySlice';
import { precomputeRadioheadEffectiveHarmonyBars } from '../goldenPath/radioheadSlice';
import { precomputeSondheimEffectiveHarmonyBars } from '../goldenPath/sondheimSlice';
import { precomputeSonicYouthEffectiveHarmonyBars } from '../goldenPath/sonicYouthSlice';
import { precomputeStevieWonderEffectiveHarmonyBars } from '../goldenPath/stevieWonderSlice';
import { precomputeTheloniousMonkEffectiveHarmonyBars } from '../goldenPath/theloniousMonkSlice';
import { precomputeWayneShorterEffectiveHarmonyBars } from '../goldenPath/wayneShorterSlice';
import { precomputeBernardHerrmannEffectiveHarmonyBars } from '../goldenPath/bernardHerrmannSlice';
import { precomputeDukeEllingtonEffectiveHarmonyBars } from '../goldenPath/dukeEllingtonSlice';
import { precomputeGilEvansEffectiveHarmonyBars } from '../goldenPath/gilEvansSlice';
import { precomputeMariaSchneiderEffectiveHarmonyBars } from '../goldenPath/mariaSchneiderSlice';
import { precomputePhilipGlassEffectiveHarmonyBars } from '../goldenPath/philipGlassSlice';
import { normalizeSongwriterStyleKey } from '../song-mode/songwriterStyleProfiles';
import type { SongwriterRuleId } from '../song-mode/songwritingResearchTypes';

type PrecomputeFn = (context: CompositionContext) => void;

const REHARM_PREVIEW_SLICE_PRECOMPUTE: Partial<Record<SongwriterRuleId, PrecomputeFn>> = {
  brian_wilson: precomputeBrianWilsonEffectiveHarmonyBars,
  stevie_wonder: precomputeStevieWonderEffectiveHarmonyBars,
  radiohead: precomputeRadioheadEffectiveHarmonyBars,
  james_brown: precomputeJamesBrownEffectiveHarmonyBars,
  joni_mitchell: precomputeJoniMitchellEffectiveHarmonyBars,
  sonic_youth: precomputeSonicYouthEffectiveHarmonyBars,
  pat_metheny: precomputePatMethenyEffectiveHarmonyBars,
  wayne_shorter: precomputeWayneShorterEffectiveHarmonyBars,
  frank_zappa: attachFrankZappaHarmonyContext,
  barry_harris: precomputeBarryHarrisEffectiveHarmonyBars,
  bill_evans: precomputeBillEvansEffectiveHarmonyBars,
  bacharach: precomputeBacharachEffectiveHarmonyBars,
  donald_fagen: precomputeDonaldFagenEffectiveHarmonyBars,
  ecm_chamber: precomputeEcmChamberEffectiveHarmonyBars,
  antonio_carlos_jobim: precomputeJobimEffectiveHarmonyBars,
  herbie_hancock: precomputeHerbieHancockEffectiveHarmonyBars,
  sondheim: precomputeSondheimEffectiveHarmonyBars,
  kate_bush: precomputeKateBushEffectiveHarmonyBars,
  thelonious_monk: precomputeTheloniousMonkEffectiveHarmonyBars,
  andrew_hill: precomputeAndrewHillEffectiveHarmonyBars,
  charlie_parker: precomputeCharlieParkerEffectiveHarmonyBars,
  bernard_herrmann: precomputeBernardHerrmannEffectiveHarmonyBars,
  duke_ellington: precomputeDukeEllingtonEffectiveHarmonyBars,
  gil_evans: precomputeGilEvansEffectiveHarmonyBars,
  maria_schneider: precomputeMariaSchneiderEffectiveHarmonyBars,
  philip_glass: precomputePhilipGlassEffectiveHarmonyBars,
};

export function runReharmPreviewSlicePrecompute(context: CompositionContext): void {
  const meta = context.generationMetadata;
  if (meta?.mosaicLockRegistry) return;
  const key = normalizeSongwriterStyleKey(meta?.songwriterStyleId ?? '');
  if (!key) return;
  if (key === 'wayne_shorter' && meta?.styleTransferWayneHarmonyAuthoritative === true) return;
  const run = REHARM_PREVIEW_SLICE_PRECOMPUTE[key];
  if (run) run(context);
}