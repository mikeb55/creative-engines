/**
 * Mosaic Mode — composer dispatch registry (precompute / accumulate / apply / finalize).
 * One entry per slice-authority composer; registry is sole duo dispatch authority.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel } from '../score-model/scoreModelTypes';
import { resolveFrankZappaSoloLineForContext } from '../song-mode/songModeZappaSoloRiffBridge';
import { applyZappaSoloToMetadata } from '../solo/zappasoloEngine';
import { applyBrianWilsonGuitarBarPasses } from '../goldenPath/brianWilsonPetSoundsSlice';
import { applyStevieWonderGuitarBarPasses } from '../goldenPath/stevieWonderSlice';
import { applyJamesBrownGuitarBarPasses } from '../goldenPath/jamesBrownSlice';
import { applySonicYouthGuitarBarPasses } from '../goldenPath/sonicYouthSlice';
import {
  resolveZappaSectionBehaviorForBar,
  finalizeFrankZappaMetadata,
  attachFrankZappaHarmonyContext,
  createFrankZappaHarmonyAccumulator,
} from '../goldenPath/frankZappaSlice';
import { COMPOSER_ID_ALIASES } from '../groups/composerGroupDefinitions';

export type ComposerDispatchEntry = {
  composerId: string;
  precompute: (context: CompositionContext) => void;
  accumulate:
    | ((
        prevSymbol: string | undefined,
        symbol: string,
        accumulator: unknown
      ) => void)
    | null;
  apply:
    | ((measure: unknown, barIndex: number, context: CompositionContext) => void)
    | null;
  finalize: ((context: CompositionContext) => void) | null;
  /** Metadata key written by precompute — used by duo orchestrator stitch. */
  effectiveHarmonyKey: keyof GenerationMetadata;
};

export type DuoApplyScratch = {
  seed: number;
  effectiveLow: number;
  effectiveHigh: number;
};

type SliceRow = {
  composerId: string;
  mod: string;
  precompute: string;
  accumulate: string | null;
  createAcc: string | null;
  finalize: string | null;
  apply: string | null;
  effKey: keyof GenerationMetadata;
};

let activeFinalizeAccumulator: unknown;
let activeApplyScratch: DuoApplyScratch | null = null;

export function setDuoDispatchFinalizeAccumulator(accumulator: unknown): void {
  activeFinalizeAccumulator = accumulator;
}

export function setDuoDispatchApplyScratch(scratch: DuoApplyScratch | null): void {
  activeApplyScratch = scratch;
}

function loadMod(relativePath: string): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`../${relativePath}`) as Record<string, unknown>;
}

function fn<T extends (...args: never[]) => unknown>(
  mod: Record<string, unknown>,
  name: string
): T {
  const f = mod[name];
  if (typeof f !== 'function') {
    throw new Error(`mosaicComposerDispatch: missing ${name} in slice module`);
  }
  return f as T;
}

function applyZappaOutputRegisterForBar(
  m: MeasureModel,
  low: number,
  high: number,
  behavior: ReturnType<typeof resolveZappaSectionBehaviorForBar>
): void {
  if (!behavior || behavior.registerShiftSemitones <= 0) return;
  const shift = Math.min(12, Math.max(0, behavior.registerShiftSemitones));
  const targetHigh = Math.min(96, Math.max(high, 84));
  const targetLow = Math.max(28, Math.min(targetHigh, low + shift));
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    e.pitch = Math.min(targetHigh, e.pitch + shift);
    while (e.pitch < targetLow && e.pitch + 12 <= targetHigh) e.pitch += 12;
    e.pitch = Math.max(targetLow, Math.min(targetHigh, e.pitch));
  }
}

const SLICE_ROWS: SliceRow[] = [
  { composerId: 'brian_wilson', mod: 'goldenPath/brianWilsonPetSoundsSlice', precompute: 'precomputeBrianWilsonEffectiveHarmonyBars', accumulate: 'accumulateBrianWilsonHarmonyDiagnostics', createAcc: 'createBrianWilsonHarmonyAccumulator', finalize: 'finalizeBrianWilsonPetSoundsMetadata', apply: 'applyBrianWilsonGuitarBarPasses', effKey: 'brianWilsonEffectiveHarmonyBars' },
  { composerId: 'stevie_wonder', mod: 'goldenPath/stevieWonderSlice', precompute: 'precomputeStevieWonderEffectiveHarmonyBars', accumulate: 'accumulateStevieWonderHarmonyDiagnostics', createAcc: 'createStevieWonderHarmonyAccumulator', finalize: 'finalizeStevieWonderMetadata', apply: 'applyStevieWonderGuitarBarPasses', effKey: 'stevieWonderEffectiveHarmonyBars' },
  { composerId: 'radiohead', mod: 'goldenPath/radioheadSlice', precompute: 'precomputeRadioheadEffectiveHarmonyBars', accumulate: 'accumulateRadioheadHarmonyDiagnostics', createAcc: 'createRadioheadHarmonyAccumulator', finalize: 'finalizeRadioheadMetadata', apply: null, effKey: 'radioheadEffectiveHarmonyBars' },
  { composerId: 'james_brown', mod: 'goldenPath/jamesBrownSlice', precompute: 'precomputeJamesBrownEffectiveHarmonyBars', accumulate: 'accumulateJamesBrownHarmonyDiagnostics', createAcc: 'createJamesBrownHarmonyAccumulator', finalize: 'finalizeJamesBrownMetadata', apply: 'applyJamesBrownGuitarBarPasses', effKey: 'jamesBrownEffectiveHarmonyBars' },
  { composerId: 'joni_mitchell', mod: 'goldenPath/joniMitchellSlice', precompute: 'precomputeJoniMitchellEffectiveHarmonyBars', accumulate: 'accumulateJoniMitchellHarmonyDiagnostics', createAcc: 'createJoniMitchellHarmonyAccumulator', finalize: 'finalizeJoniMitchellMetadata', apply: null, effKey: 'joniMitchellEffectiveHarmonyBars' },
  { composerId: 'sonic_youth', mod: 'goldenPath/sonicYouthSlice', precompute: 'precomputeSonicYouthEffectiveHarmonyBars', accumulate: 'accumulateSonicYouthHarmonyDiagnostics', createAcc: 'createSonicYouthHarmonyAccumulator', finalize: 'finalizeSonicYouthMetadata', apply: 'applySonicYouthGuitarBarPasses', effKey: 'sonicYouthEffectiveHarmonyBars' },
  { composerId: 'pat_metheny', mod: 'goldenPath/patMethenySlice', precompute: 'precomputePatMethenyEffectiveHarmonyBars', accumulate: 'accumulatePatMethenyHarmonyDiagnostics', createAcc: 'createPatMethenyHarmonyAccumulator', finalize: 'finalizePatMethenyMetadata', apply: null, effKey: 'patMethenyEffectiveHarmonyBars' },
  { composerId: 'wayne_shorter', mod: 'goldenPath/wayne_shorter', precompute: 'precomputeWayneShorterEffectiveHarmonyBars', accumulate: 'accumulateWayneShorterHarmonyDiagnostics', createAcc: 'createWayneShorterHarmonyAccumulator', finalize: 'finalizeWayneShorterMetadata', apply: null, effKey: 'wayneShorterEffectiveHarmonyBars' },
  { composerId: 'barry_harris', mod: 'goldenPath/barryHarrisSlice', precompute: 'precomputeBarryHarrisEffectiveHarmonyBars', accumulate: 'accumulateBarryHarrisHarmonyDiagnostics', createAcc: 'createBarryHarrisHarmonyAccumulator', finalize: 'finalizeBarryHarrisMetadata', apply: null, effKey: 'barryHarrisEffectiveHarmonyBars' },
  { composerId: 'bill_evans', mod: 'goldenPath/billEvansSlice', precompute: 'precomputeBillEvansEffectiveHarmonyBars', accumulate: 'accumulateBillEvansHarmonyDiagnostics', createAcc: 'createBillEvansHarmonyAccumulator', finalize: 'finalizeBillEvansMetadata', apply: null, effKey: 'billEvansEffectiveHarmonyBars' },
  { composerId: 'debussy', mod: 'goldenPath/debussySlice', precompute: 'precomputeDebussyEffectiveHarmonyBars', accumulate: 'accumulateDebussyHarmonyDiagnostics', createAcc: 'createDebussyHarmonyAccumulator', finalize: 'finalizeDebussyMetadata', apply: null, effKey: 'debussyEffectiveHarmonyBars' },
  { composerId: 'bernard_herrmann', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeBernardHerrmannEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeBernardHerrmannMetadata', apply: null, effKey: 'bernardHerrmannEffectiveHarmonyBars' },
  { composerId: 'john_williams', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeJohnWilliamsEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeJohnWilliamsMetadata', apply: null, effKey: 'johnWilliamsEffectiveHarmonyBars' },
  { composerId: 'ennio_morricone', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeEnnioMorriconeEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeEnnioMorriconeMetadata', apply: null, effKey: 'ennioMorriconeEffectiveHarmonyBars' },
  { composerId: 'nino_rota', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeNinoRotaEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeNinoRotaMetadata', apply: null, effKey: 'ninoRotaEffectiveHarmonyBars' },
  { composerId: 'jerry_goldsmith', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeJerryGoldsmithEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeJerryGoldsmithMetadata', apply: null, effKey: 'jerryGoldsmithEffectiveHarmonyBars' },
  { composerId: 'john_barry', mod: 'goldenPath/johnBarrySlice', precompute: 'precomputeJohnBarryEffectiveHarmonyBars', accumulate: 'accumulateJohnBarryHarmonyDiagnostics', createAcc: 'createJohnBarryHarmonyAccumulator', finalize: 'finalizeJohnBarryMetadata', apply: null, effKey: 'johnBarryEffectiveHarmonyBars' },
  { composerId: 'philip_glass', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputePhilipGlassEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizePhilipGlassMetadata', apply: null, effKey: 'philipGlassEffectiveHarmonyBars' },
  { composerId: 'hans_zimmer', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeHansZimmerEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeHansZimmerMetadata', apply: null, effKey: 'hansZimmerEffectiveHarmonyBars' },
  { composerId: 'angelo_badalamenti', mod: 'song-mode/filmSoundtrackHarmonySlices', precompute: 'precomputeAngeloBadalamentiEffectiveHarmonyBars', accumulate: 'accumulateFilmHarmonyDiagnostics', createAcc: 'createFilmHarmonyAccumulator', finalize: 'finalizeAngeloBadalamentiMetadata', apply: null, effKey: 'angeloBadalamentiEffectiveHarmonyBars' },
  { composerId: 'duke_ellington', mod: 'goldenPath/dukeEllingtonSlice', precompute: 'precomputeDukeEllingtonEffectiveHarmonyBars', accumulate: 'accumulateDukeEllingtonHarmonyDiagnostics', createAcc: 'createDukeEllingtonHarmonyAccumulator', finalize: 'finalizeDukeEllingtonMetadata', apply: null, effKey: 'dukeEllingtonEffectiveHarmonyBars' },
  { composerId: 'billy_strayhorn', mod: 'goldenPath/billyStrayhornSlice', precompute: 'precomputeBillyStrayhornEffectiveHarmonyBars', accumulate: 'accumulateBillyStrayhornHarmonyDiagnostics', createAcc: 'createBillyStrayhornHarmonyAccumulator', finalize: 'finalizeBillyStrayhornMetadata', apply: null, effKey: 'billyStrayhornEffectiveHarmonyBars' },
  { composerId: 'gil_evans', mod: 'goldenPath/gilEvansSlice', precompute: 'precomputeGilEvansEffectiveHarmonyBars', accumulate: 'accumulateGilEvansHarmonyDiagnostics', createAcc: 'createGilEvansHarmonyAccumulator', finalize: 'finalizeGilEvansMetadata', apply: null, effKey: 'gilEvansEffectiveHarmonyBars' },
  { composerId: 'thad_jones', mod: 'goldenPath/thad_jones', precompute: 'precomputeThadJonesEffectiveHarmonyBars', accumulate: 'accumulateThadJonesHarmonyDiagnostics', createAcc: 'createThadJonesHarmonyAccumulator', finalize: 'finalizeThadJonesMetadata', apply: null, effKey: 'thadJonesEffectiveHarmonyBars' },
  { composerId: 'charles_mingus', mod: 'goldenPath/charlesMingusSlice', precompute: 'precomputeCharlesMingusEffectiveHarmonyBars', accumulate: 'accumulateCharlesMingusHarmonyDiagnostics', createAcc: 'createCharlesMingusHarmonyAccumulator', finalize: 'finalizeCharlesMingusMetadata', apply: null, effKey: 'charlesMingusEffectiveHarmonyBars' },
  { composerId: 'henry_threadgill', mod: 'goldenPath/henryThreadgillSlice', precompute: 'precomputeHenryThreadgillEffectiveHarmonyBars', accumulate: 'accumulateHenryThreadgillHarmonyDiagnostics', createAcc: 'createHenryThreadgillHarmonyAccumulator', finalize: 'finalizeHenryThreadgillMetadata', apply: null, effKey: 'henryThreadgillEffectiveHarmonyBars' },
  { composerId: 'count_basie', mod: 'goldenPath/count_basie', precompute: 'precomputeBasieEffectiveHarmonyBars', accumulate: 'accumulateBasieHarmonyDiagnostics', createAcc: 'createBasieHarmonyAccumulator', finalize: 'finalizeBasieMetadata', apply: null, effKey: 'basieEffectiveHarmonyBars' },
  { composerId: 'miles_davis', mod: 'goldenPath/milesDavisSlice', precompute: 'precomputeMilesDavisEffectiveHarmonyBars', accumulate: 'accumulateMilesDavisHarmonyDiagnostics', createAcc: 'createMilesDavisHarmonyAccumulator', finalize: 'finalizeMilesDavisMetadata', apply: null, effKey: 'milesDavisEffectiveHarmonyBars' },
  { composerId: 'bartok', mod: 'goldenPath/bartokSlice', precompute: 'precomputeBartokEffectiveHarmonyBars', accumulate: 'accumulateBartokHarmonyDiagnostics', createAcc: 'createBartokHarmonyAccumulator', finalize: 'finalizeBartokMetadata', apply: null, effKey: 'bartokEffectiveHarmonyBars' },
  { composerId: 'berg', mod: 'goldenPath/bergSlice', precompute: 'precomputeBergEffectiveHarmonyBars', accumulate: 'accumulateBergHarmonyDiagnostics', createAcc: 'createBergHarmonyAccumulator', finalize: 'finalizeBergMetadata', apply: null, effKey: 'bergEffectiveHarmonyBars' },
  { composerId: 'sammy_nestico', mod: 'goldenPath/sammyNesticoSlice', precompute: 'precomputeSammyNesticoEffectiveHarmonyBars', accumulate: 'accumulateSammyNesticoHarmonyDiagnostics', createAcc: 'createSammyNesticoHarmonyAccumulator', finalize: 'finalizeSammyNesticoMetadata', apply: null, effKey: 'sammyNesticoEffectiveHarmonyBars' },
  { composerId: 'bob_brookmeyer', mod: 'goldenPath/bobBrookmeyerSlice', precompute: 'precomputeBobBrookmeyerEffectiveHarmonyBars', accumulate: 'accumulateBobBrookmeyerHarmonyDiagnostics', createAcc: 'createBobBrookmeyerHarmonyAccumulator', finalize: 'finalizeBobBrookmeyerMetadata', apply: null, effKey: 'bobBrookmeyerEffectiveHarmonyBars' },
  { composerId: 'clare_fischer', mod: 'goldenPath/clareFischerSlice', precompute: 'precomputeClareFischerEffectiveHarmonyBars', accumulate: 'accumulateClareFischerHarmonyDiagnostics', createAcc: 'createClareFischerHarmonyAccumulator', finalize: 'finalizeClareFischerMetadata', apply: null, effKey: 'clareFischerEffectiveHarmonyBars' },
  { composerId: 'oliver_nelson', mod: 'goldenPath/oliverNelsonSlice', precompute: 'precomputeOliverNelsonEffectiveHarmonyBars', accumulate: 'accumulateOliverNelsonHarmonyDiagnostics', createAcc: 'createOliverNelsonHarmonyAccumulator', finalize: 'finalizeOliverNelsonMetadata', apply: null, effKey: 'oliverNelsonEffectiveHarmonyBars' },
  { composerId: 'quincy_jones', mod: 'goldenPath/quincyJonesSlice', precompute: 'precomputeQuincyJonesEffectiveHarmonyBars', accumulate: 'accumulateQuincyJonesHarmonyDiagnostics', createAcc: 'createQuincyJonesHarmonyAccumulator', finalize: 'finalizeQuincyJonesMetadata', apply: null, effKey: 'quincyJonesEffectiveHarmonyBars' },
  { composerId: 'don_sebesky', mod: 'goldenPath/donSebeskySlice', precompute: 'precomputeDonSebeskyEffectiveHarmonyBars', accumulate: 'accumulateDonSebeskyHarmonyDiagnostics', createAcc: 'createDonSebeskyHarmonyAccumulator', finalize: 'finalizeDonSebeskyMetadata', apply: null, effKey: 'donSebeskyEffectiveHarmonyBars' },
  { composerId: 'johnny_mandel', mod: 'goldenPath/johnnyMandelSlice', precompute: 'precomputeJohnnyMandelEffectiveHarmonyBars', accumulate: 'accumulateJohnnyMandelHarmonyDiagnostics', createAcc: 'createJohnnyMandelHarmonyAccumulator', finalize: 'finalizeJohnnyMandelMetadata', apply: null, effKey: 'johnnyMandelEffectiveHarmonyBars' },
  { composerId: 'gershwin', mod: 'goldenPath/gershwinSlice', precompute: 'precomputeGershwinEffectiveHarmonyBars', accumulate: 'accumulateGershwinHarmonyDiagnostics', createAcc: 'createGershwinHarmonyAccumulator', finalize: 'finalizeGershwinMetadata', apply: null, effKey: 'gershwinEffectiveHarmonyBars' },
  { composerId: 'arvo_part', mod: 'goldenPath/arvoPartSlice', precompute: 'precomputeArvoPartEffectiveHarmonyBars', accumulate: 'accumulateArvoPartHarmonyDiagnostics', createAcc: 'createArvoPartHarmonyAccumulator', finalize: null, apply: null, effKey: 'arvoPartEffectiveHarmonyBars' },
  { composerId: 'satie', mod: 'goldenPath/satieSlice', precompute: 'precomputeSatieEffectiveHarmonyBars', accumulate: 'accumulateSatieHarmonyDiagnostics', createAcc: 'createSatieHarmonyAccumulator', finalize: 'finalizeSatieMetadata', apply: null, effKey: 'satieEffectiveHarmonyBars' },
  { composerId: 'prince', mod: 'goldenPath/princeSlice', precompute: 'precomputePrinceEffectiveHarmonyBars', accumulate: 'accumulatePrinceHarmonyDiagnostics', createAcc: 'createPrinceHarmonyAccumulator', finalize: 'finalizePrinceMetadata', apply: null, effKey: 'princeEffectiveHarmonyBars' },
  { composerId: 'beatles', mod: 'goldenPath/beatlesSlice', precompute: 'precomputeBeatlesEffectiveHarmonyBars', accumulate: 'accumulateBeatlesHarmonyDiagnostics', createAcc: 'createBeatlesHarmonyAccumulator', finalize: 'finalizeBeatlesMetadata', apply: null, effKey: 'beatlesEffectiveHarmonyBars' },
  { composerId: 'fela_kuti', mod: 'goldenPath/felaKutiSlice', precompute: 'precomputeFelaKutiEffectiveHarmonyBars', accumulate: 'accumulateFelaKutiHarmonyDiagnostics', createAcc: 'createFelaKutiHarmonyAccumulator', finalize: 'finalizeFelaKutiMetadata', apply: null, effKey: 'felaKutiEffectiveHarmonyBars' },
  { composerId: 'cole_porter', mod: 'goldenPath/colePorterSlice', precompute: 'precomputeColePorterEffectiveHarmonyBars', accumulate: 'accumulateColePorterHarmonyDiagnostics', createAcc: 'createColePorterHarmonyAccumulator', finalize: 'finalizeColePorterMetadata', apply: null, effKey: 'colePorterEffectiveHarmonyBars' },
  { composerId: 'maria_schneider', mod: 'goldenPath/mariaSchneiderSlice', precompute: 'precomputeMariaSchneiderEffectiveHarmonyBars', accumulate: 'accumulateMariaSchneiderHarmonyDiagnostics', createAcc: 'createMariaSchneiderHarmonyAccumulator', finalize: 'finalizeMariaSchneiderMetadata', apply: null, effKey: 'mariaSchneiderEffectiveHarmonyBars' },
  { composerId: 'kenny_wheeler', mod: 'goldenPath/wheelerLyricSlice', precompute: 'precomputeKennyWheelerEffectiveHarmonyBars', accumulate: 'accumulateKennyWheelerHarmonyDiagnostics', createAcc: 'createKennyWheelerHarmonyAccumulator', finalize: 'finalizeKennyWheelerMetadata', apply: null, effKey: 'kennyWheelerEffectiveHarmonyBars' },
  { composerId: 'jan_garbarek', mod: 'goldenPath/janGarbarekSlice', precompute: 'precomputeJanGarbarekEffectiveHarmonyBars', accumulate: 'accumulateJanGarbarekHarmonyDiagnostics', createAcc: 'createJanGarbarekHarmonyAccumulator', finalize: 'finalizeJanGarbarekMetadata', apply: null, effKey: 'janGarbarekEffectiveHarmonyBars' },
  { composerId: 'john_surman', mod: 'goldenPath/johnSurmanSlice', precompute: 'precomputeJohnSurmanEffectiveHarmonyBars', accumulate: 'accumulateJohnSurmanHarmonyDiagnostics', createAcc: 'createJohnSurmanHarmonyAccumulator', finalize: 'finalizeJohnSurmanMetadata', apply: null, effKey: 'johnSurmanEffectiveHarmonyBars' },
  { composerId: 'ralph_towner', mod: 'goldenPath/ralphTownerSlice', precompute: 'precomputeRalphTownerEffectiveHarmonyBars', accumulate: 'accumulateRalphTownerHarmonyDiagnostics', createAcc: 'createRalphTownerHarmonyAccumulator', finalize: 'finalizeRalphTownerMetadata', apply: null, effKey: 'ralphTownerEffectiveHarmonyBars' },
  { composerId: 'verlaine', mod: 'goldenPath/verlainFieldSlice', precompute: 'precomputeVerlaineEffectiveHarmonyBars', accumulate: 'accumulateVerlaineHarmonyDiagnostics', createAcc: 'createVerlaineHarmonyAccumulator', finalize: 'finalizeVerlaineMetadata', apply: null, effKey: 'verlaineEffectiveHarmonyBars' },
  { composerId: 'allan_holdsworth', mod: 'goldenPath/holdsworthScaleSlice', precompute: 'precomputeHoldsworthEffectiveHarmonyBars', accumulate: 'accumulateHoldsworthHarmonyDiagnostics', createAcc: 'createHoldsworthHarmonyAccumulator', finalize: 'finalizeHoldsworthMetadata', apply: null, effKey: 'holdsworthEffectiveHarmonyBars' },
  { composerId: 'jack_white', mod: 'goldenPath/jackWhiteDroneSlice', precompute: 'precomputeJackWhiteEffectiveHarmonyBars', accumulate: 'accumulateJackWhiteHarmonyDiagnostics', createAcc: 'createJackWhiteHarmonyAccumulator', finalize: 'finalizeJackWhiteMetadata', apply: null, effKey: 'jackWhiteEffectiveHarmonyBars' },
  { composerId: 'beefheart', mod: 'goldenPath/beefheartFragmentSlice', precompute: 'precomputeBeefheartEffectiveHarmonyBars', accumulate: 'accumulateBeefheartHarmonyDiagnostics', createAcc: 'createBeefheartHarmonyAccumulator', finalize: 'finalizeBeefheartMetadata', apply: null, effKey: 'beefheartEffectiveHarmonyBars' },
  { composerId: 'fripp', mod: 'goldenPath/frippSystemsSlice', precompute: 'precomputeFrippEffectiveHarmonyBars', accumulate: 'accumulateFrippHarmonyDiagnostics', createAcc: 'createFrippHarmonyAccumulator', finalize: 'finalizeFrippMetadata', apply: null, effKey: 'frippEffectiveHarmonyBars' },
  { composerId: 'marr', mod: 'goldenPath/marrMelodicSlice', precompute: 'precomputeMarrEffectiveHarmonyBars', accumulate: 'accumulateMarrHarmonyDiagnostics', createAcc: 'createMarrHarmonyAccumulator', finalize: 'finalizeMarrMetadata', apply: null, effKey: 'marrEffectiveHarmonyBars' },
  { composerId: 'bill_holman', mod: 'goldenPath/billHolmanSlice', precompute: 'precomputeBillHolmanEffectiveHarmonyBars', accumulate: 'accumulateBillHolmanHarmonyDiagnostics', createAcc: 'createBillHolmanHarmonyAccumulator', finalize: 'finalizeBillHolmanMetadata', apply: null, effKey: 'billHolmanEffectiveHarmonyBars' },
  { composerId: 'carla_bley', mod: 'goldenPath/carlaBleySlice', precompute: 'precomputeCarlaBleyEffectiveHarmonyBars', accumulate: 'accumulateCarlaBleyHarmonyDiagnostics', createAcc: 'createCarlaBleyHarmonyAccumulator', finalize: 'finalizeCarlaBleyMetadata', apply: null, effKey: 'carlaBleyEffectiveHarmonyBars' },
  { composerId: 'eberhard_weber', mod: 'goldenPath/weberFieldSlice', precompute: 'precomputeEberhardWeberEffectiveHarmonyBars', accumulate: 'accumulateEberhardWeberHarmonyDiagnostics', createAcc: 'createEberhardWeberHarmonyAccumulator', finalize: 'finalizeEberhardWeberMetadata', apply: null, effKey: 'eberhardWeberEffectiveHarmonyBars' },
  { composerId: 'claus_ogerman', mod: 'goldenPath/clausOgermanSlice', precompute: 'precomputeClausOgermanEffectiveHarmonyBars', accumulate: 'accumulateClausOgermanHarmonyDiagnostics', createAcc: 'createClausOgermanHarmonyAccumulator', finalize: 'finalizeClausOgermanMetadata', apply: null, effKey: 'clausOgermanEffectiveHarmonyBars' },
  { composerId: 'lalo_schifrin', mod: 'goldenPath/laloSchifrinSlice', precompute: 'precomputeLaloSchifrinEffectiveHarmonyBars', accumulate: 'accumulateLaloSchifrinHarmonyDiagnostics', createAcc: 'createLaloSchifrinHarmonyAccumulator', finalize: 'finalizeLaloSchifrinMetadata', apply: null, effKey: 'laloSchifrinEffectiveHarmonyBars' },
  { composerId: 'bacharach', mod: 'goldenPath/bacharachSlice', precompute: 'precomputeBacharachEffectiveHarmonyBars', accumulate: 'accumulateBacharachHarmonyDiagnostics', createAcc: 'createBacharachHarmonyAccumulator', finalize: 'finalizeBacharachMetadata', apply: null, effKey: 'bacharachEffectiveHarmonyBars' },
  { composerId: 'donald_fagen', mod: 'goldenPath/donaldFagenSlice', precompute: 'precomputeDonaldFagenEffectiveHarmonyBars', accumulate: 'accumulateDonaldFagenHarmonyDiagnostics', createAcc: 'createDonaldFagenHarmonyAccumulator', finalize: 'finalizeDonaldFagenMetadata', apply: null, effKey: 'donaldFagenEffectiveHarmonyBars' },
  { composerId: 'ecm_chamber', mod: 'goldenPath/ecmChamberSlice', precompute: 'precomputeEcmChamberEffectiveHarmonyBars', accumulate: 'accumulateEcmChamberHarmonyDiagnostics', createAcc: 'createEcmChamberHarmonyAccumulator', finalize: 'finalizeEcmChamberMetadata', apply: null, effKey: 'ecmChamberEffectiveHarmonyBars' },
  { composerId: 'antonio_carlos_jobim', mod: 'goldenPath/jobimSlice', precompute: 'precomputeJobimEffectiveHarmonyBars', accumulate: 'accumulateJobimHarmonyDiagnostics', createAcc: 'createJobimHarmonyAccumulator', finalize: 'finalizeJobimMetadata', apply: null, effKey: 'jobimEffectiveHarmonyBars' },
  { composerId: 'herbie_hancock', mod: 'goldenPath/herbie_hancock', precompute: 'precomputeHerbieHancockEffectiveHarmonyBars', accumulate: 'accumulateHerbieHancockHarmonyDiagnostics', createAcc: 'createHerbieHancockHarmonyAccumulator', finalize: 'finalizeHerbieHancockMetadata', apply: null, effKey: 'herbieHancockEffectiveHarmonyBars' },
  { composerId: 'stephen_sondheim', mod: 'goldenPath/sondheimSlice', precompute: 'precomputeSondheimEffectiveHarmonyBars', accumulate: 'accumulateSondheimHarmonyDiagnostics', createAcc: 'createSondheimHarmonyAccumulator', finalize: 'finalizeSondheimMetadata', apply: null, effKey: 'sondheimEffectiveHarmonyBars' },
  { composerId: 'kate_bush', mod: 'goldenPath/kateBushSlice', precompute: 'precomputeKateBushEffectiveHarmonyBars', accumulate: 'accumulateKateBushHarmonyDiagnostics', createAcc: 'createKateBushHarmonyAccumulator', finalize: 'finalizeKateBushMetadata', apply: null, effKey: 'kateBushEffectiveHarmonyBars' },
  { composerId: 'thelonious_monk', mod: 'goldenPath/theloniousMonkSlice', precompute: 'precomputeTheloniousMonkEffectiveHarmonyBars', accumulate: 'accumulateTheloniousMonkHarmonyDiagnostics', createAcc: 'createTheloniousMonkHarmonyAccumulator', finalize: 'finalizeTheloniousMonkMetadata', apply: null, effKey: 'theloniousMonkEffectiveHarmonyBars' },
  { composerId: 'john_coltrane', mod: 'goldenPath/johnColtraneSlice', precompute: 'precomputeJohnColtraneEffectiveHarmonyBars', accumulate: 'accumulateJohnColtraneHarmonyDiagnostics', createAcc: 'createJohnColtraneHarmonyAccumulator', finalize: 'finalizeJohnColtraneMetadata', apply: null, effKey: 'johnColtraneEffectiveHarmonyBars' },
  { composerId: 'mccoy_tyner', mod: 'goldenPath/mccoy_tyner', precompute: 'precomputeMccoyTynerEffectiveHarmonyBars', accumulate: 'accumulateMccoyTynerHarmonyDiagnostics', createAcc: 'createMccoyTynerHarmonyAccumulator', finalize: 'finalizeMccoyTynerMetadata', apply: null, effKey: 'mccoyTynerEffectiveHarmonyBars' },
  { composerId: 'andrew_hill', mod: 'goldenPath/andrew_hill', precompute: 'precomputeAndrewHillEffectiveHarmonyBars', accumulate: 'accumulateAndrewHillHarmonyDiagnostics', createAcc: 'createAndrewHillHarmonyAccumulator', finalize: 'finalizeAndrewHillMetadata', apply: null, effKey: 'andrewHillEffectiveHarmonyBars' },
  { composerId: 'jim_hall', mod: 'goldenPath/jim_hall', precompute: 'precomputeJimHallEffectiveHarmonyBars', accumulate: 'accumulateJimHallHarmonyDiagnostics', createAcc: 'createJimHallHarmonyAccumulator', finalize: 'finalizeJimHallMetadata', apply: null, effKey: 'jimHallEffectiveHarmonyBars' },
  { composerId: 'steve_reich', mod: 'goldenPath/steve_reich', precompute: 'precomputeSteveReichEffectiveHarmonyBars', accumulate: 'accumulateSteveReichHarmonyDiagnostics', createAcc: 'createSteveReichHarmonyAccumulator', finalize: 'finalizeSteveReichMetadata', apply: null, effKey: 'steveReichEffectiveHarmonyBars' },
  { composerId: 'messiaen', mod: 'goldenPath/messiaen', precompute: 'precomputeMessiaenEffectiveHarmonyBars', accumulate: 'accumulateMessiaenHarmonyDiagnostics', createAcc: 'createMessiaenHarmonyAccumulator', finalize: 'finalizeMessiaenMetadata', apply: null, effKey: 'messiaenEffectiveHarmonyBars' },
  { composerId: 'charlie_parker', mod: 'goldenPath/charlieParkerSlice', precompute: 'precomputeCharlieParkerEffectiveHarmonyBars', accumulate: 'accumulateCharlieParkerHarmonyDiagnostics', createAcc: 'createCharlieParkerHarmonyAccumulator', finalize: 'finalizeCharlieParkerMetadata', apply: null, effKey: 'charlieParkerEffectiveHarmonyBars' },
  { composerId: 'fripp_king_crimson', mod: 'goldenPath/frippKingCrimsonSlice', precompute: 'precomputeFrippKingCrimsonEffectiveHarmonyBars', accumulate: null, createAcc: null, finalize: null, apply: null, effKey: 'frippKingCrimsonEffectiveHarmonyBars' },
  { composerId: 'frank_zappa', mod: 'goldenPath/frankZappaSlice', precompute: 'attachFrankZappaHarmonyContext', accumulate: 'accumulateFrankZappaHarmonyDiagnostics', createAcc: 'createFrankZappaHarmonyAccumulator', finalize: '__zappa__', apply: '__zappa__', effKey: 'frankZappaEffectiveHarmonyBars' },
];

/**
 * Alias keys referencing existing SLICE_ROWS entries (no duplicate slice wiring).
 * holdsworth → allan_holdsworth (also in COMPOSER_ID_ALIASES; listed here explicitly).
 */
const SLICE_ROW_ALIAS_IDS: Readonly<Record<string, string>> = {
  holdsworth: 'allan_holdsworth',
};

/**
 * Stub aliases for composer ids without a dedicated mosaic slice yet.
 * Values must resolve to an existing SLICE_ROWS composerId (directly or via COMPOSER_ID_ALIASES).
 */
const DISPATCH_STUB_ALIASES: Readonly<Record<string, string>> = {
  // rc19 — ornette_coleman remapped from andrew_hill stub to wayne_shorter; full ornette profile planned
  ornette_coleman: 'wayne_shorter',
  ornette: 'wayne_shorter',
  harmolodics: 'wayne_shorter',
  free_jazz: 'wayne_shorter',
  lonely_woman: 'wayne_shorter',
  /** Guitar ids with VRB/stub only — nearest ROCK_FUSION / ART_ROCK / JAZZ_GUITAR dispatch fit. */
  morello: 'fripp',
  eddie_van_halen: 'allan_holdsworth',
  wes_montgomery: 'jim_hall',
  joe_pass: 'jim_hall',
  scott_henderson: 'allan_holdsworth',
};

const modCache = new Map<string, Record<string, unknown>>();

function getMod(path: string): Record<string, unknown> {
  let mod = modCache.get(path);
  if (!mod) {
    mod = loadMod(path);
    modCache.set(path, mod);
  }
  return mod;
}

function buildApplyFn(row: SliceRow): ComposerDispatchEntry['apply'] {
  if (row.composerId === 'frank_zappa') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      const behavior = resolveZappaSectionBehaviorForBar(barIndex, context);
      applyZappaOutputRegisterForBar(measure as MeasureModel, scratch.effectiveLow, scratch.effectiveHigh, behavior);
    };
  }
  if (!row.apply) return null;
  const mod = getMod(row.mod);
  const applyName = row.apply;
  if (row.composerId === 'brian_wilson') {
    return (measure, barIndex, _context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      const phaseHook = ((barIndex - 1) % 8) + 1;
      applyBrianWilsonGuitarBarPasses(
        measure as MeasureModel,
        barIndex,
        scratch.seed,
        scratch.effectiveLow,
        scratch.effectiveHigh,
        phaseHook
      );
    };
  }
  if (row.composerId === 'stevie_wonder') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      applyStevieWonderGuitarBarPasses(
        measure as MeasureModel,
        barIndex,
        context,
        scratch.seed,
        scratch.effectiveLow,
        scratch.effectiveHigh
      );
    };
  }
  if (row.composerId === 'james_brown') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      applyJamesBrownGuitarBarPasses(measure as MeasureModel, barIndex, context);
    };
  }
  if (row.composerId === 'sonic_youth') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      applySonicYouthGuitarBarPasses(measure as MeasureModel, barIndex, context);
    };
  }
  const applyFn = fn<
    (m: MeasureModel, bar: number, ctx: CompositionContext, seed: number, low: number, high: number) => void
  >(mod, applyName);
  return (measure, barIndex, context) => {
    const scratch = activeApplyScratch;
    if (!scratch) return;
    applyFn(
      measure as MeasureModel,
      barIndex,
      context,
      scratch.seed,
      scratch.effectiveLow,
      scratch.effectiveHigh
    );
  };
}

function buildFinalizeFn(row: SliceRow): ComposerDispatchEntry['finalize'] {
  if (row.composerId === 'frank_zappa') {
    return (context) => {
      if (!context.generationMetadata) return;
      finalizeFrankZappaMetadata(context.generationMetadata, activeFinalizeAccumulator as never);
      const solo = resolveFrankZappaSoloLineForContext(context);
      applyZappaSoloToMetadata(context.generationMetadata, solo);
    };
  }
  if (!row.finalize) return null;
  const mod = getMod(row.mod);
  const finalizeFn = fn<(meta: GenerationMetadata, acc: unknown, ctx?: CompositionContext) => void>(
    mod,
    row.finalize
  );
  if (row.composerId === 'wayne_shorter' || row.composerId === 'debussy') {
    return (context) => {
      if (!context.generationMetadata) return;
      finalizeFn(context.generationMetadata, activeFinalizeAccumulator, context);
    };
  }
  return (context) => {
    if (!context.generationMetadata) return;
    finalizeFn(context.generationMetadata, activeFinalizeAccumulator);
  };
}

function buildEntry(row: SliceRow): ComposerDispatchEntry {
  const mod = getMod(row.mod);
  const precomputeFn =
    row.composerId === 'frank_zappa'
      ? attachFrankZappaHarmonyContext
      : fn<(ctx: CompositionContext) => void>(mod, row.precompute);

  let accumulate: ComposerDispatchEntry['accumulate'] = null;
  if (row.accumulate) {
    const accFn = fn<(prev: string | undefined, sym: string, acc: unknown) => void>(mod, row.accumulate);
    accumulate = accFn;
  }

  return {
    composerId: row.composerId,
    precompute: precomputeFn,
    accumulate,
    apply: buildApplyFn(row),
    finalize: buildFinalizeFn(row),
    effectiveHarmonyKey: row.effKey,
  };
}

export const DUO_COMPOSER_REGISTRY: ComposerDispatchEntry[] = SLICE_ROWS.map(buildEntry);

const registryById = new Map<string, ComposerDispatchEntry>(
  DUO_COMPOSER_REGISTRY.map((entry) => [entry.composerId, entry])
);

/** Walk alias/stub chain to a canonical SLICE_ROWS composerId present in registryById. */
function resolveCanonicalDispatchId(composerId: string): string | undefined {
  let id = composerId.trim();
  if (!id) return undefined;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (registryById.has(id)) return id;
    const next =
      SLICE_ROW_ALIAS_IDS[id] ?? DISPATCH_STUB_ALIASES[id] ?? COMPOSER_ID_ALIASES[id];
    if (!next || next === id) return undefined;
    id = next;
  }
  return undefined;
}

function registerDispatchAliases(): void {
  const aliasKeys = new Set<string>([
    ...Object.keys(SLICE_ROW_ALIAS_IDS),
    ...Object.keys(COMPOSER_ID_ALIASES),
    ...Object.keys(DISPATCH_STUB_ALIASES),
  ]);
  for (const alias of aliasKeys) {
    const canonical = resolveCanonicalDispatchId(alias);
    if (!canonical) continue;
    const entry = registryById.get(canonical);
    if (entry) registryById.set(alias, entry);
  }
}

registerDispatchAliases();

export function getDispatchEntry(composerId: string): ComposerDispatchEntry | undefined {
  const direct = registryById.get(composerId);
  if (direct) return direct;
  const canonical = resolveCanonicalDispatchId(composerId);
  return canonical ? registryById.get(canonical) : undefined;
}

export function createHarmonyAccumulatorForComposer(composerId: string): unknown | null {
  const entry = getDispatchEntry(composerId);
  if (!entry) return null;
  const row = SLICE_ROWS.find((r) => r.composerId === entry.composerId);
  if (!row?.createAcc) return null;
  if (row.composerId === 'frank_zappa') {
    return createFrankZappaHarmonyAccumulator();
  }
  const mod = getMod(row.mod);
  return fn<() => unknown>(mod, row.createAcc)();
}

export function extractEffectiveHarmonyFromMetadata(
  metadata: GenerationMetadata,
  composerId: string
): string[] | undefined {
  const entry = getDispatchEntry(composerId);
  if (!entry) return undefined;
  const bars = metadata[entry.effectiveHarmonyKey];
  return Array.isArray(bars) ? (bars as string[]) : undefined;
}
