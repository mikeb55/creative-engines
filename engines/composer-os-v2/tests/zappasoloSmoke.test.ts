/**
 * Smoke — Zappa Phase B solo generator + odd-meter MusicXML part.
 */

import type { CompositionContext } from '../core/compositionContext';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { generateZappaSolo, mergeZappaSoloPart } from '../core/solo/zappasoloEngine';
import { createPart, createScore } from '../core/score-model/scoreEventBuilder';

/** Zappa pool–style harmony (7alt / m7b5 / maj7#11), 12 bars — aligned with mixed meter smoke regions. */
const ZAPPA_CHORDS_12: string[] = [
  'Db7alt',
  'G7alt',
  'C#7alt',
  'F#7alt',
  'Bb7alt',
  'E7alt',
  'Ab7alt',
  'D7alt',
  'Gb7alt',
  'Cb7alt',
  'F7alt',
  'Ebmaj7#11',
];

const MIXED_MAP: BarMeterMap = (() => {
  const m: BarMeterMap = {};
  for (let b = 1; b <= 4; b++) m[b] = { numerator: 4, denominator: 4 };
  for (let b = 5; b <= 8; b++) m[b] = { numerator: 7, denominator: 8 };
  for (let b = 9; b <= 12; b++) m[b] = { numerator: 5, denominator: 8 };
  return m;
})();

function hasDescendingMinorSixthSameBar(
  notes: readonly { midi: number; barIndex: number; startBeat: number }[]
): boolean {
  const sorted = [...notes].sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.barIndex === cur.barIndex && prev.midi - cur.midi === 8) return true;
  }
  return false;
}

/** Four distinct pitch classes forming an ordered [0137] stack from the lowest PC. */
function is0137TetrachordMidis(midis: number[]): boolean {
  const pcs = [...new Set(midis.map((m) => ((m % 12) + 12) % 12))];
  if (pcs.length !== 4) return false;
  pcs.sort((a, b) => a - b);
  const rel = pcs.map((p) => (p - pcs[0]! + 12) % 12).sort((a, b) => a - b);
  return rel[0] === 0 && rel[1] === 1 && rel[2] === 3 && rel[3] === 7;
}

export function runZappaSoloSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const ctx = {
    seed: 90441,
    form: {
      totalBars: 12,
      sections: [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 4 },
      ],
    },
    generationMetadata: {
      frankZappaEffectiveHarmonyBars: ZAPPA_CHORDS_12,
      barMeterMap: MIXED_MAP,
    },
  } as unknown as CompositionContext;

  const solo = generateZappaSolo(ctx, { density: 1, dissonanceLevel: 1 });
  const receiptOk =
    solo.receipt.hasSeptuplet &&
    solo.receipt.hasQuintuplet &&
    solo.receipt.hasDescendingMinorSixth &&
    solo.receipt.hasTetrachord0137;

  const m6Ok = hasDescendingMinorSixthSameBar(solo.allNotes);

  const t0137ByBar = new Map<number, typeof solo.allNotes>();
  for (const n of solo.allNotes) {
    if (n.marker !== 'tetrachord_0137') continue;
    if (!t0137ByBar.has(n.barIndex)) t0137ByBar.set(n.barIndex, []);
    t0137ByBar.get(n.barIndex)!.push(n);
  }
  let t0137Ok = false;
  for (const arr of t0137ByBar.values()) {
    if (arr.length >= 4 && is0137TetrachordMidis(arr.slice(0, 4).map((x) => x.midi))) {
      t0137Ok = true;
      break;
    }
  }

  const guitar = createPart(
    'guitar',
    'Electric Guitar',
    'clean_electric_guitar',
    27,
    'treble',
    12,
    () => 'Cmaj7',
    () => undefined
  );
  let score = createScore('Zappa solo smoke', [guitar]);
  score = mergeZappaSoloPart(score, solo);

  const xr = exportScoreModelToMusicXml(score, { barMeterMap: MIXED_MAP, omitChordSymbols: true });
  const xml = xr.xml ?? '';
  const zappaPartList = xml.match(/<score-part id="zappa_solo">[\s\S]*?<\/score-part>/)?.[0] ?? '';
  const partOk =
    xr.success &&
    zappaPartList.includes('<part-name>Elec. Gtr</part-name>') &&
    zappaPartList.includes('<instrument-name>Electric Guitar</instrument-name>') &&
    /<part id="zappa_solo"/.test(xml);

  out.push({
    ok: receiptOk && m6Ok && t0137Ok && partOk,
    name: 'Zappa Phase B solo: Slonimsky line + tuplets + m6 + [0137] + export part',
  });

  return out;
}
