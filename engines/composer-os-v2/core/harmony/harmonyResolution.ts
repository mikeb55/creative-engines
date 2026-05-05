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

export function getChordForBar(barIndex: number, context: CompositionContext): string {
  const locked = context.lockedHarmonyBarsRaw;
  const meta = context.generationMetadata;
  const tb = context.form.totalBars;
  const parsed = meta.parsedCustomProgressionBars;

  if (locked && locked.length === tb && parsed && parsed.length === tb && meta.harmonySource === 'custom') {
    assertLockedMatchesParsedWhenBothFull(locked, parsed, tb);
  }

  /** Immutable canonical timeline (Frank Zappa primary today): single snapshot for score + validators. */
  const hcCanon = context.harmonyContext;
  if (
    hcCanon &&
    hcCanon.bars.length === tb &&
    barIndex >= 1 &&
    barIndex <= tb
  ) {
    return hcCanon.bars[barIndex - 1]!;
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
   * Herbie Hancock: `precomputeHerbieHancockEffectiveHarmonyBars` applies Blue Note post-bop harmony devices + receipts.
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

  /**
   * Frank Zappa effective harmony is served only via `context.harmonyContext` (see `attachFrankZappaHarmonyContext`).
   * If missing here, slice precompute did not run or HarmonyContext was not attached — fall through (tests only).
   */
  const fzEff = meta?.frankZappaEffectiveHarmonyBars;
  if (
    meta?.songwriterStyleId === 'frank_zappa' &&
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
 * Post passes: prefer measure chord when set; fail loudly if it disagrees with authoritative harmony for that bar.
 */
export function resolveChordForDuoPostPass(
  context: CompositionContext,
  barIndex: number,
  measureChord?: string
): string {
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
  if (measureChord && measureChord.trim()) {
    const t = measureChord.trim();
    if (t !== authoritative) {
      throw new Error(
        `HARMONY WIRE FAILURE bar ${barIndex}: measure chord "${t}" !== authoritative "${authoritative}"`
      );
    }
    return t;
  }
  return authoritative;
}
