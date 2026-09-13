/**
 * Authoritative chord symbol per bar — same source for generation, measure.chord, and MusicXML export.
 *
 * Final runtime authority: `getChordForBar` only. Score builder and export read measure.chord set from here;
 * MusicXML writes `m.chord` from the score model (see `musicxmlExporter.ts`).
 *
 * Full-form custom harmony must come from `lockedHarmonyBarsRaw` and/or `generationMetadata.parsedCustomProgressionBars`.
 * Falling through to `chordSymbolPlan` for a full pasted progression (while metadata still says custom) is a routing bug.
 */

import type { CompositionContext } from '../compositionContext';
import { applyVoiceBundleHarmonicRhythm } from '../composer/voiceBundleHarmonicRhythm';
import { resolveHarmonyAuthority } from '../authority/adapters/harmonyAuthorityAdapter';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { isSonicYouthHarmonicPath } from '../song-mode/sonicYouthSlice';
import { isJoniMitchellHarmonicPath } from '../song-mode/joniMitchellSlice';
import { isArvoPartHarmonicPath } from '../song-mode/arvoPartSlice';
import { isGershwinHarmonicPath } from '../song-mode/gershwinSlice';
import { isRadioheadHarmonicPath } from '../song-mode/radioheadSlice';
import { isAndrewHillHarmonicPath } from '../song-mode/andrewHillSlice';
import { isKateBushHarmonicPath } from '../song-mode/kateBushSlice';
import { isEcmChamberHarmonicPath } from '../song-mode/ecmChamberSlice';
import {
  isAngeloBadalamentiHarmonicPath,
  isBernardHerrmannHarmonicPath,
  isEnnioMorriconeHarmonicPath,
  isHansZimmerHarmonicPath,
  isJerryGoldsmithHarmonicPath,
  isJohnWilliamsHarmonicPath,
  isNinoRotaHarmonicPath,
  isPhilipGlassHarmonicPath,
} from '../song-mode/filmSoundtrackHarmonySlices';
import { isEberhardWeberHarmonicPath } from '../song-mode/weberFieldSlice';
import { isLaloSchifrinHarmonicPath } from '../song-mode/laloSchifrinSlice';
import { isClausOgermanHarmonicPath } from '../song-mode/clausOgermanSlice';
import { isDonSebeskyHarmonicPath } from '../song-mode/donSebeskySlice';
import { isJackWhiteHarmonicPath } from '../song-mode/jackWhiteDroneSlice';
import { isJohnBarryHarmonicPath } from '../song-mode/johnBarrySlice';
import { isJohnnyMandelHarmonicPath } from '../song-mode/johnnyMandelSlice';
import { isMarrHarmonicPath } from '../song-mode/marrMelodicSlice';
import { isRalphTownerHarmonicPath } from '../song-mode/ralphTownerSlice';
import { isSatieHarmonicPath } from '../song-mode/satieSlice';
import { isColePorterHarmonicPath } from '../song-mode/colePorterSlice';
import { isBacharachHarmonicPath } from '../song-mode/bacharachSlice';
import { isBarryHarrisHarmonicPath } from '../song-mode/barryHarrisSlice';
import { isBillEvansHarmonicPath } from '../song-mode/billEvansSlice';
import { isDonaldFagenHarmonicPath } from '../song-mode/donaldFagenSlice';
import { isJamesBrownHarmonicPath } from '../song-mode/jamesBrownSlice';
import { isSteveReichHarmonicPath } from '../song-mode/steveReichSlice';
import { isMessiaenHarmonicPath } from '../song-mode/messiaenSlice';
import { isFrippKingCrimsonHarmonicPath } from '../song-mode/frippKingCrimsonSlice';
import { isBartokHarmonicPath } from '../song-mode/bartokSlice';
import { isJohnColtraneHarmonicPath } from '../song-mode/johnColtraneSlice';
import { isBrianWilsonHarmonicPath } from '../song-mode/brianWilsonPetSoundsSlice';
import { isStevieWonderHarmonicPath } from '../song-mode/stevieWonderSlice';
import { isCharlieParkerHarmonicPath } from '../song-mode/charlieParkerSlice';
import { isStephenSondheimHarmonicPath } from '../song-mode/sondheimSlice';
import { isJimHallHarmonicPath } from '../song-mode/jimHallSlice';
import { isNileRodgersHarmonicPath } from '../song-mode/nileRodgersSlice';
import { isMilesDavisHarmonicPath } from '../song-mode/milesDavisSlice';
import { isMccoyTynerHarmonicPath } from '../song-mode/mccoyTynerSlice';
import { isPrinceHarmonicPath } from '../song-mode/princeSlice';
import { isBeatlesHarmonicPath } from '../song-mode/beatlesSlice';
import { isBeefheartHarmonicPath } from '../song-mode/beefheartFragmentSlice';
import { isBillHolmanHarmonicPath } from '../song-mode/billHolmanSlice';
import { isBillyStrayhornHarmonicPath } from '../song-mode/billyStrayhornSlice';
import { isBobBrookmeyerHarmonicPath } from '../song-mode/bobBrookmeyerSlice';
import { isCarlaBleyHarmonicPath } from '../song-mode/carlaBleySlice';
import { isClareFischerHarmonicPath } from '../song-mode/clareFischerSlice';
import { isOliverNelsonHarmonicPath } from '../song-mode/oliverNelsonSlice';
import { isQuincyJonesHarmonicPath } from '../song-mode/quincyJonesSlice';
import { isSammyNesticoHarmonicPath } from '../song-mode/sammyNesticoSlice';
import { isHenryThreadgillHarmonicPath } from '../song-mode/henryThreadgillSlice';
import { isGilEvansHarmonicPath } from '../song-mode/gilEvansSlice';
import { isDukeEllingtonHarmonicPath } from '../song-mode/dukeEllingtonSlice';
import { isThadJonesHarmonicPath } from '../song-mode/thadJonesSlice';
import { isCharlesMingusHarmonicPath } from '../song-mode/charlesMingusSlice';
import { isCountBasieHarmonicPath } from '../song-mode/basieSlice';
import { isMariaSchneiderHarmonicPath } from '../song-mode/mariaSchneiderSlice';
import { isJanGarbarekHarmonicPath } from '../song-mode/janGarbarekSlice';
import { isJohnSurmanHarmonicPath } from '../song-mode/johnSurmanSlice';
import { isKennyWheelerHarmonicPath } from '../song-mode/wheelerLyricSlice';
import { isFelaKutiHarmonicPath } from '../song-mode/felaKutiHarmonicPath';
import { isBergHarmonicPath } from '../song-mode/bergSlice';
import {
  hasSectionMarkerVrbAssignment,
  resolveVoiceRuleBundleForBar,
} from '../composer/resolveSectionVrb';
import {
  hasExplicitPerSectionVrbAssignment,
  perSectionVrbResolutionEnabled,
  readSqToBbVrbWire,
  resolveVrbForBar,
} from '../counterpoint/vrbProfiles/vrbContextResolver';
import { applyHarmonicSceneChordBias } from '../composer/harmonicSceneChordBias';
import { resolveVoiceBundleForBarWithSectionArchitecture } from '../section-architecture/effectiveContextForBar';
import { lockedHarmonyChordSymbolsEquivalent } from './chordProgressionParser';
import { logHarmonyProvenance } from './harmonyContext';

/** True when one authoritative chord per bar covers the entire form — no chordSymbolPlan fallback for those bars. */
export function isAuthoritativeLockedHarmonyFullForm(context: CompositionContext): boolean {
  const locked = context.lockedHarmonyBarsRaw;
  return !!locked && locked.length === context.form.totalBars;
}

function assertLockedMatchesParsedWhenBothFull(
  locked: string[],
  parsed: string[],
  tb: number
): void {
  for (let i = 0; i < tb; i++) {
    if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsed[i] ?? '')) {
      throw new Error(
        `HARMONY AUTHORITY: lockedHarmonyBarsRaw !== parsedCustomProgressionBars at bar ${i + 1} ("${locked[i]}" vs "${parsed[i]}")`
      );
    }
  }
}

/** Full-form locked/custom spine outranks mosaicMergedHarmonyBars for export truth; slice effective bars still run first. */
function shouldPreferCustomHarmonySpineOverMosaic(context: CompositionContext): boolean {
  const meta = context.generationMetadata;
  const tb = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  const parsed = meta.parsedCustomProgressionBars;

  if (meta.customHarmonyLocked === true) {
    if (locked && locked.length === tb) return true;
    if (parsed && parsed.length === tb) return true;
  }
  if (meta.harmonySource === 'custom') {
    if (locked && locked.length === tb) return true;
    if (parsed && parsed.length === tb) return true;
  }
  return false;
}

function resolveChordSymbolAuthoritativeForBar(barIndex: number, context: CompositionContext): string {
  const locked = context.lockedHarmonyBarsRaw;
  const meta = context.generationMetadata;
  const tb = context.form.totalBars;
  const parsed = meta.parsedCustomProgressionBars;
  const harmonyAuthorityStyleId = resolveHarmonyAuthority(context).harmonyAuthorityStyleId;

  if (locked && locked.length === tb && parsed && parsed.length === tb && meta.harmonySource === 'custom') {
    assertLockedMatchesParsedWhenBothFull(locked, parsed, tb);
  }

  /** Immutable canonical timeline when harmony authority matches HarmonyContext.styleId. */
  const hcCanon = context.harmonyContext;
  if (
    hcCanon &&
    hcCanon.bars.length === tb &&
    hcCanon.styleId === harmonyAuthorityStyleId &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return hcCanon.bars[barIndex - 1]!;
  }

  if (
    !shouldPreferCustomHarmonySpineOverMosaic(context) &&
    meta?.mosaicMergedHarmonyBars &&
    meta.mosaicMergedHarmonyBars.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return meta.mosaicMergedHarmonyBars[barIndex - 1]!;
  }

  /**
   * Brian Wilson Pet Sounds: `precomputeBrianWilsonEffectiveHarmonyBars` layers devices on top of the locked
   * progression. After precompute, `brianWilsonEffectiveHarmonyBars` is full-form and authoritative for bar reads.
   * HV path: primary | harmonicVoice (`brian_wilson` exact) — see isBrianWilsonHarmonicPath.
   * Soft brian/wilson + PetSounds guitar/grammar stay primary-only.
   */
  const bwEff = meta?.brianWilsonEffectiveHarmonyBars;
  if (
    isBrianWilsonHarmonicPath(meta) &&
    Array.isArray(bwEff) &&
    bwEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bwEff[barIndex - 1]!;
  }

  /**
   * Stevie Wonder (1972–76): `precomputeStevieWonderEffectiveHarmonyBars` layers devices on the locked
   * progression. After precompute, `stevieWonderEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`stevie_wonder` exact) — see isStevieWonderHarmonicPath.
   * Soft stevie + guitar/pentatonic surfaces stay primary-only.
   */
  const swEff = meta?.stevieWonderEffectiveHarmonyBars;
  if (
    isStevieWonderHarmonicPath(meta) &&
    Array.isArray(swEff) &&
    swEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return swEff[barIndex - 1]!;
  }

  /**
   * Radiohead (OK Computer–era): `precomputeRadioheadEffectiveHarmonyBars` layers devices on the locked
   * progression. After precompute, `radioheadEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`radiohead` exact) — see isRadioheadHarmonicPath.
   * radioheadMelodicContext + finalize grammar stay primary-only (not this branch).
   */
  const rhEff = meta?.radioheadEffectiveHarmonyBars;
  if (
    isRadioheadHarmonicPath(meta) &&
    Array.isArray(rhEff) &&
    rhEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return rhEff[barIndex - 1]!;
  }

  /**
   * James Brown: `precomputeJamesBrownEffectiveHarmonyBars` enforces dominant-centre vamps + bridge side.
   * HV path: primary | harmonicVoice (`james_brown` exact) — see isJamesBrownHarmonicPath.
   * Guitar passes + C3 funk overlay stay primary-only (not this branch).
   */
  const jbEff = meta?.jamesBrownEffectiveHarmonyBars;
  if (
    isJamesBrownHarmonicPath(meta) &&
    Array.isArray(jbEff) &&
    jbEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jbEff[barIndex - 1]!;
  }

  /**
   * Joni Mitchell (modal open-tuning): `precomputeJoniMitchellEffectiveHarmonyBars` applies modal holds + guards.
   * After precompute, `joniMitchellEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice | STYLE_JONI_MITCHELL (see isJoniMitchellHarmonicPath).
   */
  const jmEff = meta?.joniMitchellEffectiveHarmonyBars;
  if (
    isJoniMitchellHarmonicPath(meta) &&
    Array.isArray(jmEff) &&
    jmEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jmEff[barIndex - 1]!;
  }

  /**
   * Sonic Youth: `precomputeSonicYouthEffectiveHarmonyBars` layers receipts + optional cadence nudges.
   * After precompute, `sonicYouthEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice | STYLE_SONIC_YOUTH (see isSonicYouthHarmonicPath).
   */
  const syEff = meta?.sonicYouthEffectiveHarmonyBars;
  if (
    isSonicYouthHarmonicPath(meta) &&
    Array.isArray(syEff) &&
    syEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return syEff[barIndex - 1]!;
  }

  /**
   * Pat Metheny: `precomputePatMethenyEffectiveHarmonyBars` applies modal guards + device receipts.
   * After precompute, `patMethenyEffectiveHarmonyBars` is full-form and authoritative.
   */
  const pmEff = meta?.patMethenyEffectiveHarmonyBars;
  if (
    (meta?.songwriterStyleId === 'pat_metheny' || meta?.styleProfile === 'STYLE_PAT_METHENY') &&
    Array.isArray(pmEff) &&
    pmEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return pmEff[barIndex - 1]!;
  }

  /**
   * Wayne Shorter: `precomputeWayneShorterEffectiveHarmonyBars` applies post-bop devices + receipts.
   * After precompute, `wayneShorterEffectiveHarmonyBars` is full-form and authoritative.
   */
  const wsEff = meta?.wayneShorterEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'wayne_shorter' &&
    Array.isArray(wsEff) &&
    wsEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return wsEff[barIndex - 1]!;
  }

  /**
   * Tom Verlaine: `precomputeVerlaineEffectiveHarmonyBars` applies suspended modal field voicing.
   * After precompute, `verlaineEffectiveHarmonyBars` is full-form and authoritative.
   * Verlaine harmonicVoice is intentionally treated as Verlaine for harmony authority resolution.
   * Other styles remain primary-only until explicitly designed similarly.
   */
  const verlaineEffEarly = meta?.verlaineEffectiveHarmonyBars;
  if (
    harmonyAuthorityStyleId === 'verlaine' &&
    Array.isArray(verlaineEffEarly) &&
    verlaineEffEarly.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return verlaineEffEarly[barIndex - 1]!;
  }

  /**
   * Barry Harris: `precomputeBarryHarrisEffectiveHarmonyBars` applies bebop / sixth–dim–family devices + guards.
   * After precompute, `barryHarrisEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`barry_harris` | `barry_harris_chord_melody` | `bh_cm`) — see isBarryHarrisHarmonicPath.
   * Soft `harris` songwriter-normalize only; soft `barry`/`jbr` = john_barry (excluded).
   * Style-module apply + motif hybrid pilot stay primary-only (not this branch).
   */
  const bhEff = meta?.barryHarrisEffectiveHarmonyBars;
  if (
    isBarryHarrisHarmonicPath(meta) &&
    Array.isArray(bhEff) &&
    bhEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bhEff[barIndex - 1]!;
  }

  /**
   * Bill Evans: `precomputeBillEvansEffectiveHarmonyBars` applies impressionist extension / sus / delayed cadence devices.
   * After precompute, `billEvansEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`bill_evans` exact) — see isBillEvansHarmonicPath.
   * (Was primary-only — left HV score stamped from locked paste while mosaic/expected held fBT Cmaj9.)
   */
  const beEff = meta?.billEvansEffectiveHarmonyBars;
  if (
    isBillEvansHarmonicPath(meta) &&
    Array.isArray(beEff) &&
    beEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return beEff[barIndex - 1]!;
  }

  /**
   * Debussy: `precomputeDebussyEffectiveHarmonyBars` applies parallel planing / whole-tone colour / pentatonic contrast — receipts **`db:*`**; `applyDebussyFormEncoding` adds **`db:form*`** + **`debussyProgramPeriod`**; `applyDebussyOrchestrationEncoding` adds **`db:orch*`** + **`debussyVocalColourOrchestral`**; **`finalizeDebussyMetadata`** adds composite **`db:fp*`** on **`debussyFingerprintReceipts`**.
   */
  const dbEff = meta?.debussyEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'debussy' &&
    Array.isArray(dbEff) &&
    dbEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return dbEff[barIndex - 1]!;
  }

  const bhHerrEff = meta?.bernardHerrmannEffectiveHarmonyBars;
  if (
    isBernardHerrmannHarmonicPath(meta) &&
    Array.isArray(bhHerrEff) &&
    bhHerrEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bhHerrEff[barIndex - 1]!;
  }
  const jwEff = meta?.johnWilliamsEffectiveHarmonyBars;
  if (
    isJohnWilliamsHarmonicPath(meta) &&
    Array.isArray(jwEff) &&
    jwEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jwEff[barIndex - 1]!;
  }
  const emEff = meta?.ennioMorriconeEffectiveHarmonyBars;
  if (
    isEnnioMorriconeHarmonicPath(meta) &&
    Array.isArray(emEff) &&
    emEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return emEff[barIndex - 1]!;
  }
  const nrEff = meta?.ninoRotaEffectiveHarmonyBars;
  if (
    isNinoRotaHarmonicPath(meta) &&
    Array.isArray(nrEff) &&
    nrEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return nrEff[barIndex - 1]!;
  }
  const jgEff = meta?.jerryGoldsmithEffectiveHarmonyBars;
  if (
    isJerryGoldsmithHarmonicPath(meta) &&
    Array.isArray(jgEff) &&
    jgEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jgEff[barIndex - 1]!;
  }

  /**
   * Lalo Schifrin: `precomputeLaloSchifrinEffectiveHarmonyBars` applies odd-meter groove + modal vamps.
   * After precompute, `laloSchifrinEffectiveHarmonyBars` is full-form and authoritative.
   */
  const lsEff = meta?.laloSchifrinEffectiveHarmonyBars;
  if (
    isLaloSchifrinHarmonicPath(meta) &&
    Array.isArray(lsEff) &&
    lsEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return lsEff[barIndex - 1]!;
  }

  /**
   * John Barry: `precomputeJohnBarryEffectiveHarmonyBars` applies thematic monolith Bond voicing.
   * After precompute, `johnBarryEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`john_barry` | `barry_thematic_monolith`).
   */
  const barryEff = meta?.johnBarryEffectiveHarmonyBars;
  if (
    isJohnBarryHarmonicPath(meta) &&
    Array.isArray(barryEff) &&
    barryEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return barryEff[barIndex - 1]!;
  }

  const pgEff = meta?.philipGlassEffectiveHarmonyBars;
  if (
    isPhilipGlassHarmonicPath(meta) &&
    Array.isArray(pgEff) &&
    pgEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return pgEff[barIndex - 1]!;
  }
  const hzEff = meta?.hansZimmerEffectiveHarmonyBars;
  if (
    isHansZimmerHarmonicPath(meta) &&
    Array.isArray(hzEff) &&
    hzEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return hzEff[barIndex - 1]!;
  }
  const abEff = meta?.angeloBadalamentiEffectiveHarmonyBars;
  if (
    isAngeloBadalamentiHarmonicPath(meta) &&
    Array.isArray(abEff) &&
    abEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return abEff[barIndex - 1]!;
  }

  /**
   * Duke Ellington: `precomputeDukeEllingtonEffectiveHarmonyBars` applies orchestral extension / jungle / shout devices.
   * After precompute, `dukeEllingtonEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`duke_ellington` exact) — see isDukeEllingtonHarmonicPath.
   * (Was primary-only — left HV score on locked paste while mosaic/expected held mid #11 colour + fBT.)
   */
  const deEff = meta?.dukeEllingtonEffectiveHarmonyBars;
  if (
    isDukeEllingtonHarmonicPath(meta) &&
    Array.isArray(deEff) &&
    deEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return deEff[barIndex - 1]!;
  }

  /**
   * Gil Evans: `precomputeGilEvansEffectiveHarmonyBars` applies cool-orchestration modal/sus colour — receipts **`ge:*`**.
   * After precompute, `gilEvansEffectiveHarmonyBars` is full-form and authoritative.
   */
  const geEff = meta?.gilEvansEffectiveHarmonyBars;
  if (
    isGilEvansHarmonicPath(meta) &&
    Array.isArray(geEff) &&
    geEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return geEff[barIndex - 1]!;
  }

  const tjEff = meta?.thadJonesEffectiveHarmonyBars;
  if (
    isThadJonesHarmonicPath(meta) &&
    Array.isArray(tjEff) &&
    tjEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return tjEff[barIndex - 1]!;
  }

  /**
   * Charles Mingus: `precomputeCharlesMingusEffectiveHarmonyBars` layers blues chromatic / episode texture receipts — **`cm:*`**.
   * After precompute, `charlesMingusEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`charles_mingus` exact) — see isCharlesMingusHarmonicPath.
   */
  const cmEff = meta?.charlesMingusEffectiveHarmonyBars;
  if (
    isCharlesMingusHarmonicPath(meta) &&
    Array.isArray(cmEff) &&
    cmEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return cmEff[barIndex - 1]!;
  }

  /**
   * Henry Threadgill: `precomputeHenryThreadgillEffectiveHarmonyBars` layers interval-cell / episodic pitch-set receipts — **`ht:*`**.
   * After precompute, `henryThreadgillEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`henry_threadgill` exact) — see isHenryThreadgillHarmonicPath.
   */
  const htEff = meta?.henryThreadgillEffectiveHarmonyBars;
  if (
    isHenryThreadgillHarmonicPath(meta) &&
    Array.isArray(htEff) &&
    htEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return htEff[barIndex - 1]!;
  }

  const cbEff = meta?.basieEffectiveHarmonyBars;
  if (
    isCountBasieHarmonicPath(meta) &&
    Array.isArray(cbEff) &&
    cbEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return cbEff[barIndex - 1]!;
  }

  /**
   * Miles Davis: `precomputeMilesDavisEffectiveHarmonyBars` applies modal / space / electric vamp devices — receipts **`md:*`**.
   * After precompute, `milesDavisEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`miles_davis` exact) — see isMilesDavisHarmonicPath.
   */
  const mdEff = meta?.milesDavisEffectiveHarmonyBars;
  if (
    isMilesDavisHarmonicPath(meta) &&
    Array.isArray(mdEff) &&
    mdEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return mdEff[barIndex - 1]!;
  }

  /**
   * Bartók: `precomputeBartokEffectiveHarmonyBars` — axis / golden-section / Bulgarian / cell / arch (`bk:*`).
   * HV path: primary | harmonicVoice (`bartok` exact) — see isBartokHarmonicPath.
   * Never `sq_vrb_bartok` (SQ CLE). Soft `bela_bartok` / `bela` do not engage HV.
   */
  const bkEff = meta?.bartokEffectiveHarmonyBars;
  if (
    isBartokHarmonicPath(meta) &&
    Array.isArray(bkEff) &&
    bkEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bkEff[barIndex - 1]!;
  }

  const bgEff = meta?.bergEffectiveHarmonyBars;
  if (
    isBergHarmonicPath(meta) &&
    Array.isArray(bgEff) &&
    bgEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bgEff[barIndex - 1]!;
  }

  const snEff = meta?.sammyNesticoEffectiveHarmonyBars;
  if (
    isSammyNesticoHarmonicPath(meta) &&
    Array.isArray(snEff) &&
    snEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return snEff[barIndex - 1]!;
  }

  const bbEff = meta?.bobBrookmeyerEffectiveHarmonyBars;
  if (
    isBobBrookmeyerHarmonicPath(meta) &&
    Array.isArray(bbEff) &&
    bbEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bbEff[barIndex - 1]!;
  }

  const cfEff = meta?.clareFischerEffectiveHarmonyBars;
  if (
    isClareFischerHarmonicPath(meta) &&
    Array.isArray(cfEff) &&
    cfEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return cfEff[barIndex - 1]!;
  }

  const onEff = meta?.oliverNelsonEffectiveHarmonyBars;
  if (
    isOliverNelsonHarmonicPath(meta) &&
    Array.isArray(onEff) &&
    onEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return onEff[barIndex - 1]!;
  }

  const qjEff = meta?.quincyJonesEffectiveHarmonyBars;
  if (
    isQuincyJonesHarmonicPath(meta) &&
    Array.isArray(qjEff) &&
    qjEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return qjEff[barIndex - 1]!;
  }

  const dsEff = meta?.donSebeskyEffectiveHarmonyBars;
  if (
    isDonSebeskyHarmonicPath(meta) &&
    Array.isArray(dsEff) &&
    dsEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return dsEff[barIndex - 1]!;
  }

  /**
   * Johnny Mandel: `precomputeJohnnyMandelEffectiveHarmonyBars` applies melody-forward lyric warmth voicing.
   * After precompute, `johnnyMandelEffectiveHarmonyBars` is full-form and authoritative.
   */
  const mandelEff = meta?.johnnyMandelEffectiveHarmonyBars;
  if (
    isJohnnyMandelHarmonicPath(meta) &&
    Array.isArray(mandelEff) &&
    mandelEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return mandelEff[barIndex - 1]!;
  }

  /**
   * Gershwin: `precomputeGershwinEffectiveHarmonyBars` applies Songbook / chromatic / rhythm grid devices — receipts **`gg:*`**.
   * HV path: primary | harmonicVoice (`gershwin` exact) — see isGershwinHarmonicPath.
   * gershwinContext + style surface stay primary-only (not this branch).
   */
  const ggEff = meta?.gershwinEffectiveHarmonyBars;
  if (
    isGershwinHarmonicPath(meta) &&
    Array.isArray(ggEff) &&
    ggEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ggEff[barIndex - 1]!;
  }

  /**
   * Arvo Pärt: `precomputeArvoPartEffectiveHarmonyBars` applies triadic tintinnabuli / pedal devices — receipts **`ap:*`**.
   * HV path: primary | harmonicVoice (arvo_part | part) — see isArvoPartHarmonicPath.
   * Tintinnabuli duo note rewrite stays primary-only (not this branch).
   */
  const apEff = meta?.arvoPartEffectiveHarmonyBars;
  if (
    isArvoPartHarmonicPath(meta) &&
    Array.isArray(apEff) &&
    apEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return apEff[barIndex - 1]!;
  }

  /**
   * Erik Satie: `precomputeSatieEffectiveHarmonyBars` applies anti-functional parallel / stasis devices — receipts **`es:*`**.
   * HV path: primary | harmonicVoice (`satie` exact) — see isSatieHarmonicPath.
   * satieContext + style surface stay primary-only (not this branch).
   */
  const satieEff = meta?.satieEffectiveHarmonyBars;
  if (
    isSatieHarmonicPath(meta) &&
    Array.isArray(satieEff) &&
    satieEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return satieEff[barIndex - 1]!;
  }

  /**
   * Prince: `precomputePrinceEffectiveHarmonyBars` applies Minneapolis-pocket extensions / borrowed colours — receipts **`pr:*`**.
   * HV path: primary | harmonicVoice (`prince` exact) — see isPrinceHarmonicPath.
   */
  const princeEff = meta?.princeEffectiveHarmonyBars;
  if (
    isPrinceHarmonicPath(meta) &&
    Array.isArray(princeEff) &&
    princeEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return princeEff[barIndex - 1]!;
  }

  /**
   * The Beatles: `precomputeBeatlesEffectiveHarmonyBars` freezes scaffold harmony + device receipts **`bt:*`** (`beatlesSlice.ts`).
   * HV path: primary | harmonicVoice (`beatles` exact) — see isBeatlesHarmonicPath.
   * BT melodic/context/surface grammar stay primary-only.
   */
  const beatlesEff = meta?.beatlesEffectiveHarmonyBars;
  if (
    isBeatlesHarmonicPath(meta) &&
    Array.isArray(beatlesEff) &&
    beatlesEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return beatlesEff[barIndex - 1]!;
  }

  /**
   * Fela Kuti: `precomputeFelaKutiEffectiveHarmonyBars` freezes vamp scaffold harmony + device receipts **`fk:*`** (`felaKutiSlice.ts`).
   */
  const felaEff = meta?.felaKutiEffectiveHarmonyBars;
  if (
    isFelaKutiHarmonicPath(meta) &&
    Array.isArray(felaEff) &&
    felaEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return felaEff[barIndex - 1]!;
  }

  /**
   * Cole Porter: `precomputeColePorterEffectiveHarmonyBars` applies GAS chromatic / secondary-dominant devices — receipts **`cp:*`**.
   * HV path: primary | harmonicVoice (`cole_porter` exact) — see isColePorterHarmonicPath.
   * Style surface + beguine stamps stay primary-only (not this branch).
   */
  const colePorterEff = meta?.colePorterEffectiveHarmonyBars;
  if (
    isColePorterHarmonicPath(meta) &&
    Array.isArray(colePorterEff) &&
    colePorterEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return colePorterEff[barIndex - 1]!;
  }

  /**
   * Maria Schneider: `precomputeMariaSchneiderEffectiveHarmonyBars` applies Lydian centre / pedal / colour-stack devices.
   * After precompute, `mariaSchneiderEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`maria_schneider` exact) — see isMariaSchneiderHarmonicPath.
   */
  const msEff = meta?.mariaSchneiderEffectiveHarmonyBars;
  if (
    isMariaSchneiderHarmonicPath(meta) &&
    Array.isArray(msEff) &&
    msEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return msEff[barIndex - 1]!;
  }

  /**
   * Kenny Wheeler: `precomputeKennyWheelerEffectiveHarmonyBars` applies polyaxial upper/bass paths.
   * After precompute, `kennyWheelerEffectiveHarmonyBars` is full-form and authoritative.
   */
  const kwEff = meta?.kennyWheelerEffectiveHarmonyBars;
  if (
    isKennyWheelerHarmonicPath(meta) &&
    Array.isArray(kwEff) &&
    kwEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return kwEff[barIndex - 1]!;
  }

  /**
   * Jan Garbarek: `precomputeJanGarbarekEffectiveHarmonyBars` applies modal field + drone + slow harmony.
   * After precompute, `janGarbarekEffectiveHarmonyBars` is full-form and authoritative.
   */
  const janGarbarekEff = meta?.janGarbarekEffectiveHarmonyBars;
  if (
    isJanGarbarekHarmonicPath(meta) &&
    Array.isArray(janGarbarekEff) &&
    janGarbarekEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return janGarbarekEff[barIndex - 1]!;
  }

  /**
   * John Surman: `precomputeJohnSurmanEffectiveHarmonyBars` applies British folk-modal centres + ostinato.
   * After precompute, `johnSurmanEffectiveHarmonyBars` is full-form and authoritative.
   */
  const johnSurmanEff = meta?.johnSurmanEffectiveHarmonyBars;
  if (
    isJohnSurmanHarmonicPath(meta) &&
    Array.isArray(johnSurmanEff) &&
    johnSurmanEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return johnSurmanEff[barIndex - 1]!;
  }

  /**
   * Allan Holdsworth: `precomputeHoldsworthEffectiveHarmonyBars` applies scale-derived subset voicing.
   * After precompute, `holdsworthEffectiveHarmonyBars` is full-form and authoritative.
   * Receipt prefix **`AH:`** (uppercase) — distinct from Andrew Hill **`ah:*`**.
   */
  const holdsworthEff = meta?.holdsworthEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'allan_holdsworth' &&
    Array.isArray(holdsworthEff) &&
    holdsworthEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return holdsworthEff[barIndex - 1]!;
  }

  /**
   * Johnny Marr: `precomputeMarrEffectiveHarmonyBars` applies melodic rhythm guitar partial voicings.
   * After precompute, `marrEffectiveHarmonyBars` is full-form and authoritative.
   * Receipt prefix **`jma:*`** — distinct from Joni Mitchell `jm:*`, Mandel `jmd:*`, Jack White `jw:*`, John Williams `jwill:*`.
   */
  const marrEff = meta?.marrEffectiveHarmonyBars;
  if (
    isMarrHarmonicPath(meta) &&
    Array.isArray(marrEff) &&
    marrEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return marrEff[barIndex - 1]!;
  }

  /**
   * Jack White: `precomputeJackWhiteEffectiveHarmonyBars` applies open-tuning drone-riff implied harmony.
   * After precompute, `jackWhiteEffectiveHarmonyBars` is full-form and authoritative.
   * Receipt prefix **`jw:*`** — John Williams film slice uses **`jwill:*`**.
   * HV path: primary | harmonicVoice (`jack_white` | `jack_white_drone_riff`) — see isJackWhiteHarmonicPath.
   */
  const jackWhiteEff = meta?.jackWhiteEffectiveHarmonyBars;
  if (
    isJackWhiteHarmonicPath(meta) &&
    Array.isArray(jackWhiteEff) &&
    jackWhiteEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jackWhiteEff[barIndex - 1]!;
  }

  /**
   * Robert Fripp: `precomputeFrippEffectiveHarmonyBars` applies era-dependent process systems.
   * After precompute, `frippEffectiveHarmonyBars` is full-form and authoritative.
   * Receipt prefix **`rf:*`** — distinct from Fripp/KC **`fk:*`**.
   */
  const frippEff = meta?.frippEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'fripp' &&
    Array.isArray(frippEff) &&
    frippEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return frippEff[barIndex - 1]!;
  }

  /**
   * Captain Beefheart: `precomputeBeefheartEffectiveHarmonyBars` applies blues-fragment polyphony.
   * After precompute, `beefheartEffectiveHarmonyBars` is full-form and authoritative.
   * Receipt prefix **`cbf:*`** — Count Basie owns **`cb:*`**.
   * HV path: primary | harmonicVoice (`beefheart` | `beefheart_fragment_polyphony`) — see isBeefheartHarmonicPath.
   * Soft captain_beefheart / don_van_vliet / trout_mask stay songwriter-normalize only.
   * LOCK note: resolution suppression — effective bars hold tension without cadential confirmation;
   * export truth follows precomputed symbols, not tonal reconciliation passes (model: john_surman branch).
   */
  const beefheartEff = meta?.beefheartEffectiveHarmonyBars;
  if (
    isBeefheartHarmonicPath(meta) &&
    Array.isArray(beefheartEff) &&
    beefheartEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return beefheartEff[barIndex - 1]!;
  }

  /**
   * Ralph Towner: `precomputeRalphTownerEffectiveHarmonyBars` applies guitar-born polyphonic field voicing.
   * After precompute, `ralphTownerEffectiveHarmonyBars` is full-form and authoritative.
   */
  const ralphTownerEff = meta?.ralphTownerEffectiveHarmonyBars;
  if (
    isRalphTownerHarmonicPath(meta) &&
    Array.isArray(ralphTownerEff) &&
    ralphTownerEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ralphTownerEff[barIndex - 1]!;
  }

  const eberhardWeberEff = meta?.eberhardWeberEffectiveHarmonyBars;
  if (
    isEberhardWeberHarmonicPath(meta) &&
    Array.isArray(eberhardWeberEff) &&
    eberhardWeberEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return eberhardWeberEff[barIndex - 1]!;
  }

  const coEff = meta?.clausOgermanEffectiveHarmonyBars;
  if (
    isClausOgermanHarmonicPath(meta) &&
    Array.isArray(coEff) &&
    coEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return coEff[barIndex - 1]!;
  }

  const holmanEff = meta?.billHolmanEffectiveHarmonyBars;
  if (
    isBillHolmanHarmonicPath(meta) &&
    Array.isArray(holmanEff) &&
    holmanEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return holmanEff[barIndex - 1]!;
  }

  const bleyEff = meta?.carlaBleyEffectiveHarmonyBars;
  if (
    isCarlaBleyHarmonicPath(meta) &&
    Array.isArray(bleyEff) &&
    bleyEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bleyEff[barIndex - 1]!;
  }

  /**
   * Billy Strayhorn: `precomputeBillyStrayhornEffectiveHarmonyBars` applies chromatic reinterpretation + extended-tone fusion.
   * HV path: primary | harmonicVoice (`billy_strayhorn` exact) — see isBillyStrayhornHarmonicPath.
   */
  const bsEff = meta?.billyStrayhornEffectiveHarmonyBars;
  if (
    isBillyStrayhornHarmonicPath(meta) &&
    Array.isArray(bsEff) &&
    bsEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bsEff[barIndex - 1]!;
  }

  /**
   * Bacharach: `precomputeBacharachEffectiveHarmonyBars` applies theatre-pop chromatic side-doors + deceptive cadences.
   * HV path: primary | harmonicVoice (`bacharach` exact) — see isBacharachHarmonicPath.
   * Guitar bar passes + style-profile biases stay primary-only (not this branch).
   */
  const baEff = meta?.bacharachEffectiveHarmonyBars;
  if (
    isBacharachHarmonicPath(meta) &&
    Array.isArray(baEff) &&
    baEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return baEff[barIndex - 1]!;
  }

  /**
   * Donald Fagen: `precomputeDonaldFagenEffectiveHarmonyBars` applies jazz-rock precision harmony devices + receipts.
   * HV path: primary | harmonicVoice (`donald_fagen` exact) — see isDonaldFagenHarmonicPath.
   * Guitar / keys-comp colour biases stay primary-only (not this branch).
   */
  const dfEff = meta?.donaldFagenEffectiveHarmonyBars;
  if (
    isDonaldFagenHarmonicPath(meta) &&
    Array.isArray(dfEff) &&
    dfEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return dfEff[barIndex - 1]!;
  }

  /**
   * ECM Chamber: `precomputeEcmChamberEffectiveHarmonyBars` applies sparse modal devices + receipts.
   * After precompute, `ecmChamberEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`ecm_chamber` exact) — see isEcmChamberHarmonicPath.
   */
  const ecEff = meta?.ecmChamberEffectiveHarmonyBars;
  if (
    isEcmChamberHarmonicPath(meta) &&
    Array.isArray(ecEff) &&
    ecEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ecEff[barIndex - 1]!;
  }

  /**
   * Jobim: `precomputeJobimEffectiveHarmonyBars` applies bossa / Brazilian jazz harmony devices + receipts.
   * After precompute, `jobimEffectiveHarmonyBars` is full-form and authoritative.
   */
  const ajEff = meta?.jobimEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'antonio_carlos_jobim' &&
    Array.isArray(ajEff) &&
    ajEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ajEff[barIndex - 1]!;
  }

  /**
   * Herbie Hancock: `precomputeHerbieHancockEffectiveHarmonyBars` applies quartal/sus modal harmony devices + receipts.
   * After precompute, `herbieHancockEffectiveHarmonyBars` is full-form and authoritative.
   */
  const hhEff = meta?.herbieHancockEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'herbie_hancock' &&
    Array.isArray(hhEff) &&
    hhEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return hhEff[barIndex - 1]!;
  }

  /**
   * Stephen Sondheim: `precomputeSondheimEffectiveHarmonyBars` applies dramatic theatre harmony devices + receipts.
   * After precompute, `sondheimEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`stephen_sondheim` exact) — see isStephenSondheimHarmonicPath.
   * Soft sondheim stays songwriter-normalize only.
   */
  const shEff = meta?.sondheimEffectiveHarmonyBars;
  if (
    isStephenSondheimHarmonicPath(meta) &&
    Array.isArray(shEff) &&
    shEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return shEff[barIndex - 1]!;
  }

  /**
   * Kate Bush: `precomputeKateBushEffectiveHarmonyBars` applies modal texture / pedal / anti–dense-stack devices + receipts.
   * After precompute, `kateBushEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`kate_bush` exact) — see isKateBushHarmonicPath.
   */
  const kbEff = meta?.kateBushEffectiveHarmonyBars;
  if (
    isKateBushHarmonicPath(meta) &&
    Array.isArray(kbEff) &&
    kbEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return kbEff[barIndex - 1]!;
  }

  /**
   * Thelonious Monk: `precomputeTheloniousMonkEffectiveHarmonyBars` applies b9 dominants, tonic maj7/#11 colour, strip lush stacks — receipts **`tm:*`**.
   * After precompute, `theloniousMonkEffectiveHarmonyBars` is full-form and authoritative.
   */
  const tmEff = meta?.theloniousMonkEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'thelonious_monk' &&
    Array.isArray(tmEff) &&
    tmEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return tmEff[barIndex - 1]!;
  }

  /**
   * John Coltrane: `precomputeJohnColtraneEffectiveHarmonyBars` — three-tonic cycle — receipts **`jc:*`**.
   * HV path: primary | harmonicVoice (`john_coltrane` exact) — see isJohnColtraneHarmonicPath.
   */
  const jcEff = meta?.johnColtraneEffectiveHarmonyBars;
  if (
    isJohnColtraneHarmonicPath(meta) &&
    Array.isArray(jcEff) &&
    jcEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jcEff[barIndex - 1]!;
  }

  const mtEff = meta?.mccoyTynerEffectiveHarmonyBars;
  if (
    isMccoyTynerHarmonicPath(meta) &&
    Array.isArray(mtEff) &&
    mtEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return mtEff[barIndex - 1]!;
  }

  /**
   * Andrew Hill: `precomputeAndrewHillEffectiveHarmonyBars` applies angular non-functional devices — receipts **`ah:*`**.
   * After precompute, `andrewHillEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`andrew_hill` exact) — see isAndrewHillHarmonicPath.
   */
  const ahEff = meta?.andrewHillEffectiveHarmonyBars;
  if (
    isAndrewHillHarmonicPath(meta) &&
    Array.isArray(ahEff) &&
    ahEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ahEff[barIndex - 1]!;
  }

  /**
   * Jim Hall: `precomputeJimHallEffectiveHarmonyBars` applies shell+one / warm extension grammar — receipts **`jh:*`**.
   * HV path: primary | harmonicVoice (`jim_hall` exact) — see isJimHallHarmonicPath.
   * Soft jim + mode/surface stamps stay primary-only.
   */
  const jhEff = meta?.jimHallEffectiveHarmonyBars;
  if (
    isJimHallHarmonicPath(meta) &&
    Array.isArray(jhEff) &&
    jhEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jhEff[barIndex - 1]!;
  }

  /**
   * Nile Rodgers: `precomputeNileRodgersEffectiveHarmonyBars` applies Chic funk colour — receipts **`nr:*`**.
   * HV path: primary | harmonicVoice (`nile_rodgers` exact) — see isNileRodgersHarmonicPath.
   * Soft nile + riff VRB / funk-grid stay primary-only.
   */
  const nileEff = meta?.nileRodgersEffectiveHarmonyBars;
  if (
    isNileRodgersHarmonicPath(meta) &&
    Array.isArray(nileEff) &&
    nileEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return nileEff[barIndex - 1]!;
  }

  /**
   * Steve Reich: `precomputeSteveReichEffectiveHarmonyBars` — pitch-field process (`sr:*`).
   * HV path: primary | harmonicVoice (`steve_reich` exact) — see isSteveReichHarmonicPath.
   * Never `reich_glass` (SQ dual-profile). Soft `reich` does not engage HV.
   */
  const srEff = meta?.steveReichEffectiveHarmonyBars;
  if (
    isSteveReichHarmonicPath(meta) &&
    Array.isArray(srEff) &&
    srEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return srEff[barIndex - 1]!;
  }

  /**
   * Olivier Messiaen: `precomputeMessiaenEffectiveHarmonyBars` — mode colour / anti-cadence (`om:*`).
   * HV path: primary | harmonicVoice (`messiaen` exact) — see isMessiaenHarmonicPath.
   * Never `sq_vrb_messiaen` (SQ pitch-field). Soft `olivier_messiaen` normalizes to Song before gate.
   */
  const omEff = meta?.messiaenEffectiveHarmonyBars;
  if (
    isMessiaenHarmonicPath(meta) &&
    Array.isArray(omEff) &&
    omEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return omEff[barIndex - 1]!;
  }

  /**
   * Charlie Parker: `precomputeCharlieParkerEffectiveHarmonyBars` applies bebop ii–V / tritone-sub devices — receipts **`cp:*`**.
   * After precompute, `charlieParkerEffectiveHarmonyBars` is full-form and authoritative.
   * HV path: primary | harmonicVoice (`charlie_parker` exact) — see isCharlieParkerHarmonicPath.
   * Soft bird/parker/charlie stay songwriter-normalize only. cp:* vs cole_porter is cosmetic only.
   */
  const cpEff = meta?.charlieParkerEffectiveHarmonyBars;
  if (
    isCharlieParkerHarmonicPath(meta) &&
    Array.isArray(cpEff) &&
    cpEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return cpEff[barIndex - 1]!;
  }

  /**
   * Fripp / King Crimson: `precomputeFrippKingCrimsonEffectiveHarmonyBars` — third-cycle / asymmetric (`fk:*`).
   * HV path: primary | harmonicVoice (`fripp_king_crimson` exact) — see isFrippKingCrimsonHarmonicPath.
   * Never Systems `fripp` (`rf:*`). Soft `king_crimson` / `crimson` normalize to Song before gate.
   */
  const fkcEff = meta?.frippKingCrimsonEffectiveHarmonyBars;
  if (
    isFrippKingCrimsonHarmonicPath(meta) &&
    Array.isArray(fkcEff) &&
    fkcEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return fkcEff[barIndex - 1]!;
  }

  /**
   * Frank Zappa effective harmony is served only via `context.harmonyContext` (see `attachFrankZappaHarmonyContext`).
   * If missing here, slice precompute did not run or HarmonyContext was not attached — fall through (tests only).
   */
  const fzEff = meta?.frankZappaEffectiveHarmonyBars;
  if (
    harmonyAuthorityStyleId === 'frank_zappa' &&
    Array.isArray(fzEff) &&
    fzEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return fzEff[barIndex - 1]!;
  }

  if (locked && locked.length === tb) {
    if (barIndex >= 1 && barIndex <= tb) {
      return locked[barIndex - 1]!;
    }
    if (meta.customHarmonyLocked === true) {
      throw new Error(
        `CUSTOM HARMONY NOT REACHING GOLDEN PATH: missing locked harmony for bar ${barIndex} (custom_locked is authoritative).`
      );
    }
  }

  /**
   * When `lockedHarmonyBarsRaw` failed to wire but the parse snapshot matches the form, use it — otherwise
   * `chordSymbolPlan` (often still the built-in Dmin9/G13 cycle) would win and the score would ignore the paste.
   */
  if (parsed && parsed.length === tb && meta.harmonySource === 'custom') {
    if (barIndex >= 1 && barIndex <= tb) {
      return parsed[barIndex - 1]!;
    }
    if (meta.customHarmonyLocked === true) {
      throw new Error(
        `HARMONY AUTHORITY: bar ${barIndex} out of range for parsedCustomProgressionBars (totalBars=${tb}).`
      );
    }
  }

  if (locked && barIndex >= 1 && barIndex <= locked.length) {
    return locked[barIndex - 1]!;
  }

  if (meta.customHarmonyLocked === true) {
    throw new Error(
      `HARMONY AUTHORITY: bar ${barIndex} — custom_locked progression cannot use chordSymbolPlan fallback ` +
        `(locked=${locked?.length ?? 0} parsed=${parsed?.length ?? 0} totalBars=${tb}).`
    );
  }

  for (const seg of context.chordSymbolPlan.segments) {
    if (barIndex >= seg.startBar && barIndex < seg.startBar + seg.bars) {
      return seg.chord;
    }
  }
  throw new Error(
    `Chord symbol plan does not define bar ${barIndex} — plan must cover bars 1–${context.form.totalBars} contiguously.`
  );
}

/**
 * True when the authoritative symbol for this bar came from Verlaine eff or mosaic-merged spine
 * (not chordSymbolPlan / builtin fallback while Verlaine path is active).
 */
function verlaineAuthoritativeSpineChord(
  barIndex: number,
  sym: string,
  context: CompositionContext,
): boolean {
  const meta = context.generationMetadata;
  if (resolveHarmonyAuthority(context).harmonyAuthorityStyleId !== 'verlaine') return false;
  const tb = context.form.totalBars;
  if (barIndex < 1 || barIndex > tb) return false;

  if (
    !shouldPreferCustomHarmonySpineOverMosaic(context) &&
    Array.isArray(meta.mosaicMergedHarmonyBars) &&
    meta.mosaicMergedHarmonyBars.length === tb &&
    sym === meta.mosaicMergedHarmonyBars[barIndex - 1]
  ) {
    return true;
  }

  const verlaineEff = meta.verlaineEffectiveHarmonyBars;
  if (Array.isArray(verlaineEff) && verlaineEff.length === tb && sym === verlaineEff[barIndex - 1]) {
    return true;
  }

  return false;
}

/** Authoritative chord symbol per bar — slice/locked/plan resolution plus VoiceRuleBundle harmonic rhythm overlay. */
export function getChordForBar(barIndex: number, context: CompositionContext): string {
  const sym = resolveChordSymbolAuthoritativeForBar(barIndex, context);
  /**
   * Verlaine harmonic-voice chords are pre-resolved and authoritative; the rhythm-hold overlay is
   * style-blind and was overwriting them with a stale anchor from an earlier bar.
   */
  const skipRhythmOverlay = verlaineAuthoritativeSpineChord(barIndex, sym, context);
  let rhythmBundle = context.voiceBundle;
  if (perSectionVrbResolutionEnabled() && hasExplicitPerSectionVrbAssignment(context)) {
    const wire = readSqToBbVrbWire(context);
    const barCtx = resolveVrbForBar(barIndex, wire.contextMap, wire.globalFallback, wire.sections);
    rhythmBundle =
      (barCtx.vrbId ? getVoiceRuleBundle(barCtx.vrbId) : undefined) ?? context.voiceBundle;
  } else if (hasSectionMarkerVrbAssignment(context)) {
    rhythmBundle = resolveVoiceRuleBundleForBar(context, barIndex) ?? context.voiceBundle;
  }
  rhythmBundle =
    resolveVoiceBundleForBarWithSectionArchitecture(barIndex, context, rhythmBundle) ?? rhythmBundle;
  const afterRhythm = skipRhythmOverlay
    ? sym
    : applyVoiceBundleHarmonicRhythm(barIndex, sym, context, rhythmBundle);
  if (context.voiceBundle && context.harmonicScenes?.length) {
    return applyHarmonicSceneChordBias(barIndex, afterRhythm, context);
  }
  return afterRhythm;
}

/**
 * Post passes: when the measure already carries a stamped chord, use it as ground truth.
 * `getChordForBar` applies a stateful harmonic-rhythm hold (`voiceBundleHarmonicRhythmState`);
 * re-calling it later for the same bar can disagree with the symbol frozen at measure creation.
 * Fall back to `getChordForBar` only when no stamped chord is available.
 */
export function resolveChordForDuoPostPass(
  context: CompositionContext,
  barIndex: number,
  measureChord?: string
): string {
  const stamped = measureChord?.trim();
  if (stamped) {
    const hc = context.harmonyContext;
    if (hc && typeof process !== 'undefined' && process.env?.COMPOSER_OS_HARMONY_PROVENANCE === '1') {
      logHarmonyProvenance({
        barIndex,
        canonical: stamped,
        scoreChordWritten: stamped,
        source: hc.source,
        checksum: hc.checksum,
      });
    }
    return stamped;
  }

  const authoritative = getChordForBar(barIndex, context);
  const hc = context.harmonyContext;
  if (hc && typeof process !== 'undefined' && process.env?.COMPOSER_OS_HARMONY_PROVENANCE === '1') {
    logHarmonyProvenance({
      barIndex,
      canonical: authoritative,
      scoreChordWritten: measureChord?.trim(),
      source: hc.source,
      checksum: hc.checksum,
    });
  }
  return authoritative;
}
