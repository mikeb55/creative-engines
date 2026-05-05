/**
 * Song Mode / custom_locked: single routing path for pasted harmony — fail fast if layers drift.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { lockedHarmonyChordSymbolsEquivalent } from '../harmony/chordProgressionParser';
import { isAllowedSongFormBarCount } from '../harmony/songFormBarCounts';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

/** Subset of golden-path options — avoids circular import with runGoldenPath.ts */
export interface CustomLockedRoutingWire {
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  chordProgressionText?: string;
  parsedChordBars?: string[];
  lockedHarmonyBarsRaw?: string[];
}

const DEBUG = () =>
  typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_SONG_MODE_HARMONY === '1';

export function logSongModeHarmonyDebug(payload: Record<string, unknown>): void {
  if (!DEBUG()) return;
  console.log('[SONG_MODE_HARMONY]', JSON.stringify(payload));
}

export function assertCustomLockedRouting(
  layer: string,
  options: CustomLockedRoutingWire | undefined,
  parsedBars: string[] | undefined,
  opts?: { requireFirstBar?: string }
): void {
  const hm = options?.harmonyMode ?? (options?.chordProgressionText?.trim() ? 'custom' : 'builtin');
  const lockedLen = options?.lockedHarmonyBarsRaw?.length;
  const locked = options?.lockedHarmonyBarsRaw;

  if (hm === 'custom_locked') {
    if (!lockedLen || !isAllowedSongFormBarCount(lockedLen)) {
      throw new Error(
        `CUSTOM HARMONY ROUTING FAILURE at ${layer}: custom_locked requires lockedHarmonyBarsRaw length to match allowed song-form bar counts.`
      );
    }
    if (!parsedBars || parsedBars.length !== lockedLen) {
      throw new Error(
        `CUSTOM HARMONY ROUTING FAILURE at ${layer}: expected ${lockedLen} parsed bars for custom_locked (got ${parsedBars?.length ?? 0}).`
      );
    }
    if (locked && locked.length === lockedLen) {
      for (let i = 0; i < lockedLen; i++) {
        if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsedBars[i] ?? '')) {
          throw new Error(
            `CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw[${i}] !== parsedChordBars[${i}].`
          );
        }
      }
    }
  } else if (
    typeof lockedLen === 'number' &&
    isAllowedSongFormBarCount(lockedLen) &&
    parsedBars?.length === lockedLen
  ) {
    if (!parsedBars) return;
    if (locked && locked.length === parsedBars.length) {
      for (let i = 0; i < locked.length; i++) {
        if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsedBars[i] ?? '')) {
          throw new Error(`CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw[${i}] !== parsedChordBars[${i}].`);
        }
      }
    }
  } else {
    return;
  }
  if (opts?.requireFirstBar != null && !lockedHarmonyChordSymbolsEquivalent(parsedBars[0] ?? '', opts.requireFirstBar)) {
    throw new Error(
      `CUSTOM HARMONY ROUTING FAILURE at ${layer}: expected first bar "${opts.requireFirstBar}", got "${parsedBars[0]}".`
    );
  }
}

/** Immediately before `generateGoldenPathDuoScore` — custom_locked is absolute authority */
/** After score build: every guitar measure chord must match locked wire (custom_locked only). */
export function assertScoreMatchesLockedHarmonyWire(
  score: ScoreModel,
  options: CustomLockedRoutingWire | undefined,
  context?: CompositionContext
): void {
  const wire = options?.lockedHarmonyBarsRaw ?? options?.parsedChordBars;
  if (!wire || !isAllowedSongFormBarCount(wire.length)) return;
  /** Full-bar paste: score chords must match wire (custom_locked Song Mode, or Guitar–Bass Duo long-form custom). */
  if (options?.harmonyMode !== 'custom_locked' && options?.harmonyMode !== 'custom') return;
  const md = context?.generationMetadata as GenerationMetadata | undefined;
  const tb = context?.form.totalBars ?? wire.length;
  const bwEff = md?.brianWilsonEffectiveHarmonyBars;
  const swEff = md?.stevieWonderEffectiveHarmonyBars;
  const rhEff = md?.radioheadEffectiveHarmonyBars;
  const jbEff = md?.jamesBrownEffectiveHarmonyBars;
  const jmEff = md?.joniMitchellEffectiveHarmonyBars;
  const syEff = md?.sonicYouthEffectiveHarmonyBars;
  const pmEff = md?.patMethenyEffectiveHarmonyBars;
  const wsEff = md?.wayneShorterEffectiveHarmonyBars;
  const bhEff = md?.barryHarrisEffectiveHarmonyBars;
  const beEff = md?.billEvansEffectiveHarmonyBars;
  const dbEff = md?.debussyEffectiveHarmonyBars;
  const deEff = md?.dukeEllingtonEffectiveHarmonyBars;
  const mdEff = md?.milesDavisEffectiveHarmonyBars;
  const cpPorterEff = md?.colePorterEffectiveHarmonyBars;
  const msEff = md?.mariaSchneiderEffectiveHarmonyBars;
  const baEff = md?.bacharachEffectiveHarmonyBars;
  const dfEff = md?.donaldFagenEffectiveHarmonyBars;
  const eccEff = md?.ecmChamberEffectiveHarmonyBars;
  const ajEff = md?.jobimEffectiveHarmonyBars;
  const hhEff = md?.herbieHancockEffectiveHarmonyBars;
  const shEff = md?.sondheimEffectiveHarmonyBars;
  const kbEff = md?.kateBushEffectiveHarmonyBars;
  const tmEff = md?.theloniousMonkEffectiveHarmonyBars;
  const ahEff = md?.andrewHillEffectiveHarmonyBars;
  const cpEff = md?.charlieParkerEffectiveHarmonyBars;
  const expectedWire =
    md?.songwriterStyleId === 'brian_wilson' && Array.isArray(bwEff) && bwEff.length === tb && bwEff.length === wire.length
      ? bwEff
      : md?.songwriterStyleId === 'stevie_wonder' &&
          Array.isArray(swEff) &&
          swEff.length === tb &&
          swEff.length === wire.length
        ? swEff
        : md?.songwriterStyleId === 'radiohead' &&
            Array.isArray(rhEff) &&
            rhEff.length === tb &&
            rhEff.length === wire.length
          ? rhEff
          : md?.songwriterStyleId === 'james_brown' &&
              Array.isArray(jbEff) &&
              jbEff.length === tb &&
              jbEff.length === wire.length
            ? jbEff
            : (md?.songwriterStyleId === 'joni_mitchell' || md?.styleProfile === 'STYLE_JONI_MITCHELL') &&
                Array.isArray(jmEff) &&
                jmEff.length === tb &&
                jmEff.length === wire.length
              ? jmEff
              : (md?.songwriterStyleId === 'sonic_youth' || md?.styleProfile === 'STYLE_SONIC_YOUTH') &&
                  Array.isArray(syEff) &&
                  syEff.length === tb &&
                  syEff.length === wire.length
                ? syEff
                : (md?.songwriterStyleId === 'pat_metheny' || md?.styleProfile === 'STYLE_PAT_METHENY') &&
                    Array.isArray(pmEff) &&
                    pmEff.length === tb &&
                    pmEff.length === wire.length
                  ? pmEff
                  : md?.songwriterStyleId === 'wayne_shorter' &&
                      Array.isArray(wsEff) &&
                      wsEff.length === tb &&
                      wsEff.length === wire.length
                    ? wsEff
                    : md?.songwriterStyleId === 'barry_harris' &&
                        Array.isArray(bhEff) &&
                        bhEff.length === tb &&
                        bhEff.length === wire.length
                      ? bhEff
                      : md?.songwriterStyleId === 'bill_evans' &&
                          Array.isArray(beEff) &&
                          beEff.length === tb &&
                          beEff.length === wire.length
                        ? beEff
                        : md?.songwriterStyleId === 'debussy' &&
                            Array.isArray(dbEff) &&
                            dbEff.length === tb &&
                            dbEff.length === wire.length
                          ? dbEff
                        : md?.songwriterStyleId === 'duke_ellington' &&
                            Array.isArray(deEff) &&
                            deEff.length === tb &&
                            deEff.length === wire.length
                          ? deEff
                          : md?.songwriterStyleId === 'miles_davis' &&
                              Array.isArray(mdEff) &&
                              mdEff.length === tb &&
                              mdEff.length === wire.length
                            ? mdEff
                            : md?.songwriterStyleId === 'cole_porter' &&
                                Array.isArray(cpPorterEff) &&
                                cpPorterEff.length === tb &&
                                cpPorterEff.length === wire.length
                              ? cpPorterEff
                            : md?.songwriterStyleId === 'maria_schneider' &&
                                Array.isArray(msEff) &&
                                msEff.length === tb &&
                                msEff.length === wire.length
                              ? msEff
                            : md?.songwriterStyleId === 'bacharach' &&
                            Array.isArray(baEff) &&
                            baEff.length === tb &&
                            baEff.length === wire.length
                          ? baEff
                          : md?.songwriterStyleId === 'donald_fagen' &&
                              Array.isArray(dfEff) &&
                              dfEff.length === tb &&
                              dfEff.length === wire.length
                            ? dfEff
                            : md?.songwriterStyleId === 'ecm_chamber' &&
                                Array.isArray(eccEff) &&
                                eccEff.length === tb &&
                                eccEff.length === wire.length
                              ? eccEff
                              : md?.songwriterStyleId === 'antonio_carlos_jobim' &&
                                  Array.isArray(ajEff) &&
                                  ajEff.length === tb &&
                                  ajEff.length === wire.length
                                ? ajEff
                                : md?.songwriterStyleId === 'herbie_hancock' &&
                                    Array.isArray(hhEff) &&
                                    hhEff.length === tb &&
                                    hhEff.length === wire.length
                                  ? hhEff
                                  : md?.songwriterStyleId === 'stephen_sondheim' &&
                                      Array.isArray(shEff) &&
                                      shEff.length === tb &&
                                      shEff.length === wire.length
                                    ? shEff
                                    : md?.songwriterStyleId === 'kate_bush' &&
                                        Array.isArray(kbEff) &&
                                        kbEff.length === tb &&
                                        kbEff.length === wire.length
                                      ? kbEff
                                      : md?.songwriterStyleId === 'thelonious_monk' &&
                                          Array.isArray(tmEff) &&
                                          tmEff.length === tb &&
                                          tmEff.length === wire.length
                                        ? tmEff
                                        : md?.songwriterStyleId === 'andrew_hill' &&
                                            Array.isArray(ahEff) &&
                                            ahEff.length === tb &&
                                            ahEff.length === wire.length
                                          ? ahEff
                                          : md?.songwriterStyleId === 'charlie_parker' &&
                                              Array.isArray(cpEff) &&
                                              cpEff.length === tb &&
                                              cpEff.length === wire.length
                                            ? cpEff
                                            : md?.songwriterStyleId === 'frank_zappa' &&
                                                context?.harmonyContext &&
                                                context.harmonyContext.bars.length === tb &&
                                                context.harmonyContext.bars.length === wire.length
                                              ? [...context.harmonyContext.bars]
                                              : md?.songwriterStyleId === 'frank_zappa' &&
                                                  Array.isArray(md?.frankZappaEffectiveHarmonyBars) &&
                                                  md.frankZappaEffectiveHarmonyBars.length === tb &&
                                                  md.frankZappaEffectiveHarmonyBars.length === wire.length
                                                ? md.frankZappaEffectiveHarmonyBars
                                                : wire;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: missing guitar part for chord check.');
  }
  const n = expectedWire.length;
  for (let i = 1; i <= n; i++) {
    const m = g.measures.find((x) => x.index === i);
    const exp = expectedWire[i - 1];
    const got = m?.chord ?? '';
    if (!lockedHarmonyChordSymbolsEquivalent(got, exp ?? '')) {
      throw new Error(
        `CUSTOM HARMONY NOT REACHING GOLDEN PATH: score bar ${i} chord "${got}" !== locked "${exp}"`
      );
    }
  }
}

export function assertCustomLockedBeforeScoreGeneration(
  context: CompositionContext,
  options: CustomLockedRoutingWire | undefined
): void {
  if (options?.harmonyMode !== 'custom_locked') return;
  const locked = context.lockedHarmonyBarsRaw;
  const wire = options.lockedHarmonyBarsRaw ?? options.parsedChordBars;
  const n = wire?.length ?? 0;
  if (!locked || !isAllowedSongFormBarCount(locked.length) || !wire || wire.length !== n || locked.length !== n) {
    throw new Error(
      'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked requires matching allowed song-form bar counts in both context.lockedHarmonyBarsRaw and options.'
    );
  }
  for (let i = 0; i < n; i++) {
    if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', wire[i] ?? '')) {
      throw new Error(`CUSTOM HARMONY NOT REACHING GOLDEN PATH: options vs context locked mismatch at bar ${i + 1}.`);
    }
  }
  if (context.generationMetadata.customHarmonyLocked !== true) {
    throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: generationMetadata.customHarmonyLocked must be true.');
  }
  if (context.form.totalBars !== n) {
    throw new Error(
      `CUSTOM HARMONY NOT REACHING GOLDEN PATH: form.totalBars must be ${n} for custom_locked (got ${context.form.totalBars}).`
    );
  }
  if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_LOCKED_REGRESSION_FIRST === '1') {
    if (locked[0] !== 'Cmaj9') {
      throw new Error('CUSTOM HARMONY NOT REACHING GOLDEN PATH: regression expects first bar Cmaj9.');
    }
  }
}

export function assertContextMatchesLocked32(
  layer: string,
  context: CompositionContext,
  options: CustomLockedRoutingWire | undefined
): void {
  const tb = context.form.totalBars;
  if (!isGuitarBassDuoFamily(context.presetId) || !isAllowedSongFormBarCount(tb)) return;
  const locked = context.lockedHarmonyBarsRaw;
  if (!locked || locked.length !== tb) return;
  /** Long-form can also use built-in tiled harmony — only assert pasted/custom locked paths */
  if (context.generationMetadata.harmonySource !== 'custom') return;
  if (context.generationMetadata.customHarmonyLocked !== true) return;
  const parsed = options?.parsedChordBars ?? options?.lockedHarmonyBarsRaw;
  if (parsed && parsed.length === tb) {
    for (let i = 0; i < tb; i++) {
      if (!lockedHarmonyChordSymbolsEquivalent(locked[i] ?? '', parsed[i] ?? '')) {
        throw new Error(
          `CUSTOM HARMONY ROUTING FAILURE at ${layer}: lockedHarmonyBarsRaw diverges from parsedChordBars at bar ${i + 1}.`
        );
      }
    }
  }
}
