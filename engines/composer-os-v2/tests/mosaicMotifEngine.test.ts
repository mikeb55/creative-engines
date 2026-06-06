/**
 * Mosaic Motif Engine MVP — unit tests.
 */

import {
  buildMosaicMotifVariants,
  composerReceiptPrefixForStyleId,
  generateMosaicSourceMotif,
  transformMotifForSection,
} from '../core/mosaic-mode/mosaicMotifEngine';
import { scoreMosaicMotifSimilarity } from '../core/mosaic-mode/mosaicMotifSimilarity';

export function runMosaicMotifEngineTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const source = generateMosaicSourceMotif(77002, 64);
  out.push({
    ok: source.intervalPattern.length >= 3 && source.intervalPattern.length <= 4,
    name: 'generateMosaicSourceMotif: 3–4 intervals',
  });
  out.push({
    ok: source.rhythmPattern.length >= 3 && source.rhythmPattern.length <= 4,
    name: 'generateMosaicSourceMotif: 3–4 rhythm entries',
  });
  out.push({
    ok: source.rhythmPattern.reduce((s, r) => s + r.duration, 0) <= 4.01,
    name: 'generateMosaicSourceMotif: rhythm total ≤ 4 beats',
  });
  out.push({
    ok: source.id === 'mosaic_source',
    name: 'generateMosaicSourceMotif: id mosaic_source',
  });

  const rfVariant = transformMotifForSection(source, 'intro', 'rf', 0);
  out.push({
    ok: rfVariant.intervalPattern.every((iv) => Math.abs(iv) <= 7),
    name: 'transformMotifForSection rf: intervals clamped ±7',
  });
  out.push({
    ok: rfVariant.intervalPattern.some((iv, i) => iv === -source.intervalPattern[i]),
    name: 'transformMotifForSection rf: interval inversion',
  });

  const jwVariant = transformMotifForSection(source, 'verse', 'jw', 0);
  out.push({
    ok: jwVariant.intervalPattern.every((iv) => Math.abs(iv) <= 5),
    name: 'transformMotifForSection jw: interval compression max 5',
  });
  out.push({
    ok: jwVariant.rhythmPattern.length === source.rhythmPattern.length + 1,
    name: 'transformMotifForSection jw: duplicated first duration',
  });

  const plan = [
    { sectionLabel: 'intro', startBar: 1, endBar: 16, songwriterStyleId: 'fripp' as const },
    { sectionLabel: 'verse', startBar: 17, endBar: 32, songwriterStyleId: 'jack_white' as const },
    { sectionLabel: 'chorus', startBar: 33, endBar: 64, songwriterStyleId: 'wayne_shorter' as const },
  ];
  const tonicMap = { intro: 11, verse: 4, chorus: 2 };
  const variants = buildMosaicMotifVariants(source, plan, tonicMap);
  out.push({
    ok: Object.keys(variants).length === 3,
    name: 'buildMosaicMotifVariants: one variant per section',
  });
  out.push({
    ok: variants.intro !== variants.verse && variants.verse !== variants.chorus,
    name: 'buildMosaicMotifVariants: distinct variant objects per section',
  });

  const receipts = scoreMosaicMotifSimilarity(variants);
  out.push({
    ok: receipts.length === 3,
    name: 'scoreMosaicMotifSimilarity: 3 pairs for 3 sections',
  });
  out.push({
    ok: receipts.every((r) => r.similarity >= 0 && r.similarity <= 1),
    name: 'scoreMosaicMotifSimilarity: similarity in [0,1]',
  });

  out.push({
    ok: composerReceiptPrefixForStyleId('fripp') === 'rf',
    name: 'composerReceiptPrefixForStyleId: fripp → rf',
  });
  out.push({
    ok: composerReceiptPrefixForStyleId('jack_white') === 'jw',
    name: 'composerReceiptPrefixForStyleId: jack_white → jw',
  });

  const detSource = generateMosaicSourceMotif(77002, 64);
  const detSource2 = generateMosaicSourceMotif(77002, 64);
  out.push({
    ok: JSON.stringify(detSource) === JSON.stringify(detSource2),
    name: 'generateMosaicSourceMotif: deterministic for same seed',
  });

  return out;
}

if (require.main === module) {
  const results = runMosaicMotifEngineTests();
  let fail = 0;
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
    if (!r.ok) fail++;
  }
  process.exit(fail > 0 ? 1 : 0);
}
