/**
 * Film soundtrack Song Mode slices — locked harmony + device receipts (not in smoke suite).
 */

import { noteNameToPitchClass, parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countDominantTonicPairs,
  countMajorTwoFiveOneChains,
  latinPercussionGridReceiptCount,
  oddMeterGrooveReceiptCount,
} from '../core/song-mode/laloSchifrinSlice';
import {
  bondPaletteReceiptCount,
  brassPolarityReceiptCount,
  hasHerrmannBleedReceipts,
  thematicMonolithReceiptCount,
} from '../core/song-mode/johnBarrySlice';

const BASE = {
  presetId: 'guitar_bass_duo',
  totalBars: 32,
  longFormEnabled: true,
  songModeHookFirstIdentity: true,
} as const;

const SEED = 1;
const SCHIFRIN_SEED = 94001;
const BARRY_SEED = 10001;

let schifrinGoldenCache: ReturnType<typeof runGoldenPathOnce> | undefined;
let barryGoldenCache: ReturnType<typeof runGoldenPathOnce> | undefined;

function schifrinGoldenRun(): ReturnType<typeof runGoldenPathOnce> {
  if (!schifrinGoldenCache) {
    schifrinGoldenCache = runGoldenPathOnce(SCHIFRIN_SEED, {
      ...BASE,
      primarySongwriterStyle: 'lalo_schifrin',
    });
  }
  return schifrinGoldenCache;
}

function barryGoldenRun(): ReturnType<typeof runGoldenPathOnce> {
  if (!barryGoldenCache) {
    barryGoldenCache = runGoldenPathOnce(BARRY_SEED, {
      ...BASE,
      primarySongwriterStyle: 'john_barry',
    });
  }
  return barryGoldenCache;
}

function tonicPcFromBars(bars: readonly string[] | undefined): number {
  if (!bars?.[0]) return 0;
  const hp = parseChordSymbol(bars[0]).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/);
  if (!m?.[1]) return 0;
  return noteNameToPitchClass(m[1]) ?? 0;
}

function testBernardHerrmannEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'bernard_herrmann' });
  const eff = r.context?.generationMetadata?.bernardHerrmannEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testBernardHerrmannReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'bernard_herrmann' });
  const rec = r.context?.generationMetadata?.bernardHerrmannDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('bh:'));
}

function testJohnWilliamsEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'john_williams' });
  const eff = r.context?.generationMetadata?.johnWilliamsEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testJohnWilliamsReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'john_williams' });
  const rec = r.context?.generationMetadata?.johnWilliamsDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('jwill:'));
}

function testEnnioMorriconeEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'ennio_morricone' });
  const eff = r.context?.generationMetadata?.ennioMorriconeEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testEnnioMorriconeReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'ennio_morricone' });
  const rec = r.context?.generationMetadata?.ennioMorriconeDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('em:'));
}

function testNinoRotaEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'nino_rota' });
  const eff = r.context?.generationMetadata?.ninoRotaEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testNinoRotaReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'nino_rota' });
  const rec = r.context?.generationMetadata?.ninoRotaDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('nr:'));
}

function testJerryGoldsmithEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'jerry_goldsmith' });
  const eff = r.context?.generationMetadata?.jerryGoldsmithEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testJerryGoldsmithReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'jerry_goldsmith' });
  const rec = r.context?.generationMetadata?.jerryGoldsmithDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('jg:'));
}

function testLaloSchifrinGoldenPath(): boolean {
  const r = schifrinGoldenRun();
  const md = r.context?.generationMetadata;
  const eff = md?.laloSchifrinEffectiveHarmonyBars;
  const devices = md?.laloSchifrinDeviceReceipts ?? [];
  return (
    r.success &&
    md?.songwriterStyleId === 'lalo_schifrin' &&
    Array.isArray(eff) &&
    eff.length === 32 &&
    devices.some((d) => d.startsWith('ls:'))
  );
}

function testLaloSchifrinOddMeterGroove(): boolean {
  const devices = schifrinGoldenRun().context?.generationMetadata?.laloSchifrinDeviceReceipts ?? [];
  const oddCount = oddMeterGrooveReceiptCount(devices);
  return oddCount >= Math.floor(32 * 0.72 * 0.45);
}

function testLaloSchifrinLatinPercussionGrid(): boolean {
  const devices = schifrinGoldenRun().context?.generationMetadata?.laloSchifrinDeviceReceipts ?? [];
  const percCount = latinPercussionGridReceiptCount(devices);
  return percCount >= Math.floor(32 * 0.8 * 0.45);
}

function testLaloSchifrinNoCadentialChains(): boolean {
  const eff = schifrinGoldenRun().context?.generationMetadata?.laloSchifrinEffectiveHarmonyBars;
  if (!eff) return false;
  const tonicPc = tonicPcFromBars(eff);
  return countMajorTwoFiveOneChains(eff, tonicPc) === 0 && countDominantTonicPairs(eff, tonicPc) === 0;
}

function testJohnBarryGoldenPath(): boolean {
  const r = barryGoldenRun();
  const md = r.context?.generationMetadata;
  const eff = md?.johnBarryEffectiveHarmonyBars;
  const devices = md?.johnBarryDeviceReceipts ?? [];
  return (
    r.success &&
    md?.songwriterStyleId === 'john_barry' &&
    Array.isArray(eff) &&
    eff.length === 32 &&
    devices.some((d) => d.startsWith('jbr:'))
  );
}

function testJohnBarryThematicMonolith(): boolean {
  const devices = barryGoldenRun().context?.generationMetadata?.johnBarryDeviceReceipts ?? [];
  return thematicMonolithReceiptCount(devices) >= 8;
}

function testJohnBarryBondPalette(): boolean {
  const devices = barryGoldenRun().context?.generationMetadata?.johnBarryDeviceReceipts ?? [];
  return bondPaletteReceiptCount(devices) >= 8;
}

function testJohnBarryBrassStringPolarity(): boolean {
  const devices = barryGoldenRun().context?.generationMetadata?.johnBarryDeviceReceipts ?? [];
  return brassPolarityReceiptCount(devices) >= 6;
}

function testJohnBarryNoHerrmannBleed(): boolean {
  const devices = barryGoldenRun().context?.generationMetadata?.johnBarryDeviceReceipts ?? [];
  return !hasHerrmannBleedReceipts(devices);
}

function testPhilipGlassEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'philip_glass' });
  const eff = r.context?.generationMetadata?.philipGlassEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testPhilipGlassReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'philip_glass' });
  const rec = r.context?.generationMetadata?.philipGlassDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('pg:'));
}

function testHansZimmerEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'hans_zimmer' });
  const eff = r.context?.generationMetadata?.hansZimmerEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testHansZimmerReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'hans_zimmer' });
  const rec = r.context?.generationMetadata?.hansZimmerDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('hz:'));
}

function testAngeloBadalamentiEffectiveBarsLength(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'angelo_badalamenti' });
  const eff = r.context?.generationMetadata?.angeloBadalamentiEffectiveHarmonyBars;
  return r.success && Array.isArray(eff) && eff.length === 32;
}

function testAngeloBadalamentiReceiptPrefix(): boolean {
  const r = runGoldenPathOnce(SEED, { ...BASE, primarySongwriterStyle: 'angelo_badalamenti' });
  const rec = r.context?.generationMetadata?.angeloBadalamentiDeviceReceipts ?? [];
  return rec.some((x) => String(x).startsWith('ab:'));
}

export function runFilmComposerSlicesTests(): { name: string; ok: boolean }[] {
  return [
    ['Film slice — Bernard Herrmann effective bars length 32', testBernardHerrmannEffectiveBarsLength],
    ['Film slice — Bernard Herrmann bh: device receipts', testBernardHerrmannReceiptPrefix],
    ['Film slice — John Williams effective bars length 32', testJohnWilliamsEffectiveBarsLength],
    ['Film slice — John Williams jwill: device receipts', testJohnWilliamsReceiptPrefix],
    ['Film slice — Ennio Morricone effective bars length 32', testEnnioMorriconeEffectiveBarsLength],
    ['Film slice — Ennio Morricone em: device receipts', testEnnioMorriconeReceiptPrefix],
    ['Film slice — Nino Rota effective bars length 32', testNinoRotaEffectiveBarsLength],
    ['Film slice — Nino Rota nr: device receipts', testNinoRotaReceiptPrefix],
    ['Film slice — Jerry Goldsmith effective bars length 32', testJerryGoldsmithEffectiveBarsLength],
    ['Film slice — Jerry Goldsmith jg: device receipts', testJerryGoldsmithReceiptPrefix],
    ['Film slice — Lalo Schifrin golden path + ls: receipts (seed 94001)', testLaloSchifrinGoldenPath],
    ['Film slice — Lalo Schifrin oddMeterGroove fires (seed 94001)', testLaloSchifrinOddMeterGroove],
    ['Film slice — Lalo Schifrin latinPercussionGrid active (seed 94001)', testLaloSchifrinLatinPercussionGrid],
    ['Film slice — Lalo Schifrin no V–I / ii–V–I cadence chains (seed 94001)', testLaloSchifrinNoCadentialChains],
    ['Film slice — John Barry golden path + jbr: receipts (seed 10001)', testJohnBarryGoldenPath],
    ['Film slice — John Barry thematicMonolith fires (seed 10001)', testJohnBarryThematicMonolith],
    ['Film slice — John Barry bondHarmony palette active (seed 10001)', testJohnBarryBondPalette],
    ['Film slice — John Barry brassStringPolarity present (seed 10001)', testJohnBarryBrassStringPolarity],
    ['Film slice — John Barry no Herrmann chromatic bleed (seed 10001)', testJohnBarryNoHerrmannBleed],
    ['Film slice — Philip Glass effective bars length 32', testPhilipGlassEffectiveBarsLength],
    ['Film slice — Philip Glass pg: device receipts', testPhilipGlassReceiptPrefix],
    ['Film slice — Hans Zimmer effective bars length 32', testHansZimmerEffectiveBarsLength],
    ['Film slice — Hans Zimmer hz: device receipts', testHansZimmerReceiptPrefix],
    ['Film slice — Angelo Badalamenti effective bars length 32', testAngeloBadalamentiEffectiveBarsLength],
    ['Film slice — Angelo Badalamenti ab: device receipts', testAngeloBadalamentiReceiptPrefix],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
