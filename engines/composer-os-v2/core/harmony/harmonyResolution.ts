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
   * While precompute runs, this array is unset — `getChordForBar` still returns the locked chain as the device input.
   */
  const bwEff = meta?.brianWilsonEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'brian_wilson' &&
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
   */
  const swEff = meta?.stevieWonderEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'stevie_wonder' &&
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
   */
  const rhEff = meta?.radioheadEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'radiohead' &&
    Array.isArray(rhEff) &&
    rhEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return rhEff[barIndex - 1]!;
  }

  /**
   * James Brown: `precomputeJamesBrownEffectiveHarmonyBars` enforces dominant-centre vamps + bridge side.
   * After precompute, `jamesBrownEffectiveHarmonyBars` is full-form and authoritative.
   */
  const jbEff = meta?.jamesBrownEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'james_brown' &&
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
   */
  const jmEff = meta?.joniMitchellEffectiveHarmonyBars;
  if (
    (meta?.songwriterStyleId === 'joni_mitchell' || meta?.styleProfile === 'STYLE_JONI_MITCHELL') &&
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
   */
  const syEff = meta?.sonicYouthEffectiveHarmonyBars;
  if (
    (meta?.songwriterStyleId === 'sonic_youth' || meta?.styleProfile === 'STYLE_SONIC_YOUTH') &&
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
   */
  const bhEff = meta?.barryHarrisEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'barry_harris' &&
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
   */
  const beEff = meta?.billEvansEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'bill_evans' &&
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
    meta?.songwriterStyleId === 'bernard_herrmann' &&
    Array.isArray(bhHerrEff) &&
    bhHerrEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bhHerrEff[barIndex - 1]!;
  }
  const jwEff = meta?.johnWilliamsEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'john_williams' &&
    Array.isArray(jwEff) &&
    jwEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jwEff[barIndex - 1]!;
  }
  const emEff = meta?.ennioMorriconeEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'ennio_morricone' &&
    Array.isArray(emEff) &&
    emEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return emEff[barIndex - 1]!;
  }
  const nrEff = meta?.ninoRotaEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'nino_rota' &&
    Array.isArray(nrEff) &&
    nrEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return nrEff[barIndex - 1]!;
  }
  const jgEff = meta?.jerryGoldsmithEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'jerry_goldsmith' &&
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
    meta?.songwriterStyleId === 'lalo_schifrin' &&
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
   */
  const barryEff = meta?.johnBarryEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'john_barry' &&
    Array.isArray(barryEff) &&
    barryEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return barryEff[barIndex - 1]!;
  }

  const pgEff = meta?.philipGlassEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'philip_glass' &&
    Array.isArray(pgEff) &&
    pgEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return pgEff[barIndex - 1]!;
  }
  const hzEff = meta?.hansZimmerEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'hans_zimmer' &&
    Array.isArray(hzEff) &&
    hzEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return hzEff[barIndex - 1]!;
  }
  const abEff = meta?.angeloBadalamentiEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'angelo_badalamenti' &&
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
   */
  const deEff = meta?.dukeEllingtonEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'duke_ellington' &&
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
    meta?.songwriterStyleId === 'gil_evans' &&
    Array.isArray(geEff) &&
    geEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return geEff[barIndex - 1]!;
  }

  const tjEff = meta?.thadJonesEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'thad_jones' &&
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
   */
  const cmEff = meta?.charlesMingusEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'charles_mingus' &&
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
   */
  const htEff = meta?.henryThreadgillEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'henry_threadgill' &&
    Array.isArray(htEff) &&
    htEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return htEff[barIndex - 1]!;
  }

  const cbEff = meta?.basieEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'count_basie' &&
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
   */
  const mdEff = meta?.milesDavisEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'miles_davis' &&
    Array.isArray(mdEff) &&
    mdEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return mdEff[barIndex - 1]!;
  }

  /**
   * Bartók: `precomputeBartokEffectiveHarmonyBars` applies axis / golden-section / Bulgarian / cell / arch devices — receipts **`bk:*`**.
   */
  const bkEff = meta?.bartokEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'bartok' &&
    Array.isArray(bkEff) &&
    bkEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bkEff[barIndex - 1]!;
  }

  const bgEff = meta?.bergEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'berg' &&
    Array.isArray(bgEff) &&
    bgEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bgEff[barIndex - 1]!;
  }

  const snEff = meta?.sammyNesticoEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'sammy_nestico' &&
    Array.isArray(snEff) &&
    snEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return snEff[barIndex - 1]!;
  }

  const bbEff = meta?.bobBrookmeyerEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'bob_brookmeyer' &&
    Array.isArray(bbEff) &&
    bbEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bbEff[barIndex - 1]!;
  }

  const cfEff = meta?.clareFischerEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'clare_fischer' &&
    Array.isArray(cfEff) &&
    cfEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return cfEff[barIndex - 1]!;
  }

  const onEff = meta?.oliverNelsonEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'oliver_nelson' &&
    Array.isArray(onEff) &&
    onEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return onEff[barIndex - 1]!;
  }

  const qjEff = meta?.quincyJonesEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'quincy_jones' &&
    Array.isArray(qjEff) &&
    qjEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return qjEff[barIndex - 1]!;
  }

  const dsEff = meta?.donSebeskyEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'don_sebesky' &&
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
    meta?.songwriterStyleId === 'johnny_mandel' &&
    Array.isArray(mandelEff) &&
    mandelEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return mandelEff[barIndex - 1]!;
  }

  /**
   * Gershwin: `precomputeGershwinEffectiveHarmonyBars` applies Songbook / chromatic / rhythm grid devices — receipts **`gg:*`**.
   */
  const ggEff = meta?.gershwinEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'gershwin' &&
    Array.isArray(ggEff) &&
    ggEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ggEff[barIndex - 1]!;
  }

  /**
   * Arvo Pärt: `precomputeArvoPartEffectiveHarmonyBars` applies triadic tintinnabuli / pedal devices — receipts **`ap:*`**.
   */
  const apEff = meta?.arvoPartEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'arvo_part' &&
    Array.isArray(apEff) &&
    apEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return apEff[barIndex - 1]!;
  }

  /**
   * Erik Satie: `precomputeSatieEffectiveHarmonyBars` applies anti-functional parallel / stasis devices — receipts **`es:*`**.
   */
  const satieEff = meta?.satieEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'satie' &&
    Array.isArray(satieEff) &&
    satieEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return satieEff[barIndex - 1]!;
  }

  /**
   * Prince: `precomputePrinceEffectiveHarmonyBars` applies Minneapolis-pocket extensions / borrowed colours — receipts **`pr:*`**.
   */
  const princeEff = meta?.princeEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'prince' &&
    Array.isArray(princeEff) &&
    princeEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return princeEff[barIndex - 1]!;
  }

  /**
   * The Beatles: `precomputeBeatlesEffectiveHarmonyBars` freezes scaffold harmony + device receipts **`bt:*`** (`beatlesSlice.ts`).
   */
  const beatlesEff = meta?.beatlesEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'beatles' &&
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
    meta?.songwriterStyleId === 'fela_kuti' &&
    Array.isArray(felaEff) &&
    felaEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return felaEff[barIndex - 1]!;
  }

  /**
   * Cole Porter: `precomputeColePorterEffectiveHarmonyBars` applies GAS chromatic / secondary-dominant devices — receipts **`cp:*`**.
   */
  const colePorterEff = meta?.colePorterEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'cole_porter' &&
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
   */
  const msEff = meta?.mariaSchneiderEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'maria_schneider' &&
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
    meta?.songwriterStyleId === 'kenny_wheeler' &&
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
    meta?.songwriterStyleId === 'jan_garbarek' &&
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
    meta?.songwriterStyleId === 'john_surman' &&
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
    meta?.songwriterStyleId === 'marr' &&
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
   */
  const jackWhiteEff = meta?.jackWhiteEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'jack_white' &&
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
   * LOCK note: resolution suppression — effective bars hold tension without cadential confirmation;
   * export truth follows precomputed symbols, not tonal reconciliation passes (model: john_surman branch).
   */
  const beefheartEff = meta?.beefheartEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'beefheart' &&
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
    meta?.songwriterStyleId === 'ralph_towner' &&
    Array.isArray(ralphTownerEff) &&
    ralphTownerEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ralphTownerEff[barIndex - 1]!;
  }

  const eberhardWeberEff = meta?.eberhardWeberEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'eberhard_weber' &&
    Array.isArray(eberhardWeberEff) &&
    eberhardWeberEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return eberhardWeberEff[barIndex - 1]!;
  }

  const coEff = meta?.clausOgermanEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'claus_ogerman' &&
    Array.isArray(coEff) &&
    coEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return coEff[barIndex - 1]!;
  }

  const holmanEff = meta?.billHolmanEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'bill_holman' &&
    Array.isArray(holmanEff) &&
    holmanEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return holmanEff[barIndex - 1]!;
  }

  const bleyEff = meta?.carlaBleyEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'carla_bley' &&
    Array.isArray(bleyEff) &&
    bleyEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bleyEff[barIndex - 1]!;
  }

  /**
   * Billy Strayhorn: `precomputeBillyStrayhornEffectiveHarmonyBars` applies chromatic reinterpretation + extended-tone fusion.
   */
  const bsEff = meta?.billyStrayhornEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'billy_strayhorn' &&
    Array.isArray(bsEff) &&
    bsEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return bsEff[barIndex - 1]!;
  }

  /**
   * Bacharach: `precomputeBacharachEffectiveHarmonyBars` applies theatre-pop chromatic side-doors + deceptive cadences.
   * After precompute, `bacharachEffectiveHarmonyBars` is full-form and authoritative.
   */
  const baEff = meta?.bacharachEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'bacharach' &&
    Array.isArray(baEff) &&
    baEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return baEff[barIndex - 1]!;
  }

  /**
   * Donald Fagen: `precomputeDonaldFagenEffectiveHarmonyBars` applies jazz-rock precision harmony devices + receipts.
   * After precompute, `donaldFagenEffectiveHarmonyBars` is full-form and authoritative.
   */
  const dfEff = meta?.donaldFagenEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'donald_fagen' &&
    Array.isArray(dfEff) &&
    dfEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return dfEff[barIndex - 1]!;
  }

  /**
   * ECM Chamber (Song Mode primary): `precomputeEcmChamberEffectiveHarmonyBars` applies sparse modal devices + receipts.
   * After precompute, `ecmChamberEffectiveHarmonyBars` is full-form and authoritative.
   */
  const ecEff = meta?.ecmChamberEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'ecm_chamber' &&
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
   */
  const shEff = meta?.sondheimEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'stephen_sondheim' &&
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
   */
  const kbEff = meta?.kateBushEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'kate_bush' &&
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

  const jcEff = meta?.johnColtraneEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'john_coltrane' &&
    Array.isArray(jcEff) &&
    jcEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jcEff[barIndex - 1]!;
  }

  const mtEff = meta?.mccoyTynerEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'mccoy_tyner' &&
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
   */
  const ahEff = meta?.andrewHillEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'andrew_hill' &&
    Array.isArray(ahEff) &&
    ahEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return ahEff[barIndex - 1]!;
  }

  /**
   * Jim Hall: `precomputeJimHallEffectiveHarmonyBars` applies shell+one / warm extension grammar — receipts **`jh:*`**.
   */
  const jhEff = meta?.jimHallEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'jim_hall' &&
    Array.isArray(jhEff) &&
    jhEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return jhEff[barIndex - 1]!;
  }

  const srEff = meta?.steveReichEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'steve_reich' &&
    Array.isArray(srEff) &&
    srEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return srEff[barIndex - 1]!;
  }

  const omEff = meta?.messiaenEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'messiaen' &&
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
   */
  const cpEff = meta?.charlieParkerEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'charlie_parker' &&
    Array.isArray(cpEff) &&
    cpEff.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return cpEff[barIndex - 1]!;
  }

  const fkcEff = meta?.frippKingCrimsonEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'fripp_king_crimson' &&
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
