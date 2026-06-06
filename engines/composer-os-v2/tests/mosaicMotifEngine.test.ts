/**
 * Mosaic Motif Engine rc9 — unit tests.
 */

import {
  buildMosaicMotifVariants,
  composerReceiptPrefixForStyleId,
  generateMosaicSourceMotif,
  mosaicContourHasOneDirectionChange,
  mosaicRhythmHasOffbeatOnset,
  mosaicSourceHasExactlyOneLeap,
  transformMotifForSection,
} from '../core/mosaic-mode/mosaicMotifEngine';
import { scoreMosaicMotifSimilarity } from '../core/mosaic-mode/mosaicMotifSimilarity';

export function runMosaicMotifEngineTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const source = generateMosaicSourceMotif(77002, 64);
  const noteCount = source.intervalPattern.length + 1;
  out.push({
    ok: noteCount === 4 || noteCount === 5,
    name: 'generateMosaicSourceMotif: noteCount 4 or 5',
  });
  out.push({
    ok: source.rhythmPattern.length === noteCount,
    name: 'generateMosaicSourceMotif: rhythm attacks match noteCount',
  });
  out.push({
    ok: mosaicSourceHasExactlyOneLeap(source.intervalPattern),
    name: 'generateMosaicSourceMotif: one P4 leap, rest stepwise',
  });
  out.push({
    ok: mosaicContourHasOneDirectionChange(source.contourPattern),
    name: 'generateMosaicSourceMotif: one contour direction change',
  });
  out.push({
    ok: mosaicRhythmHasOffbeatOnset(source.rhythmPattern),
    name: 'generateMosaicSourceMotif: one offbeat onset',
  });
  out.push({
    ok: source.rhythmPattern.every((r) => r.duration >= 0.5 - 1e-6),
    name: 'generateMosaicSourceMotif: min duration 0.5 beats',
  });
  out.push({
    ok:
      source.rhythmPattern.reduce((s, r) => s + r.duration, 0) >= 2.99 &&
      source.rhythmPattern.reduce((s, r) => s + r.duration, 0) <= 5.01,
    name: 'generateMosaicSourceMotif: rhythm total 3–5 beats',
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
    ok: !rfVariant.intervalPattern.some((iv, i) => iv === -source.intervalPattern[i]),
    name: 'transformMotifForSection rf: NOT full inversion',
  });
  out.push({
    ok: rfVariant.intervalPattern.some((iv, i) => iv === source.intervalPattern[i]! + 2 ||
      iv === clampSigned(source.intervalPattern[i]! + 2, 7)),
    name: 'transformMotifForSection rf: +2 sequence applied',
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

  const wsVariant = transformMotifForSection(source, 'chorus', 'ws', 0);
  out.push({
    ok: wsVariant.rhythmPattern.length > source.rhythmPattern.length,
    name: 'transformMotifForSection ws: interpolation adds rhythm entry',
  });
  out.push({
    ok: JSON.stringify(wsVariant.intervalPattern) !== JSON.stringify(source.intervalPattern),
    name: 'transformMotifForSection ws: differs from source',
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

  const receipts = scoreMosaicMotifSimilarity(variants);
  out.push({
    ok: receipts.length === 3,
    name: 'scoreMosaicMotifSimilarity: 3 pairs for 3 sections',
  });
  out.push({
    ok: receipts.every((r) => r.similarity > 0.4),
    name: 'scoreMosaicMotifSimilarity: all pairs > 0.40',
  });
  const introVerse = receipts.find(
    (r) =>
      (r.fromSection === 'intro' && r.toSection === 'verse') ||
      (r.fromSection === 'verse' && r.toSection === 'intro')
  );
  out.push({
    ok: introVerse !== undefined && introVerse.similarity > 0.4,
    name: 'scoreMosaicMotifSimilarity: intro↔verse > 0.40',
  });

  const fivePrefixes = ['rf', 'jw', 'ws', 'tv', 'jma'] as const;
  const fiveVariants = Object.fromEntries(
    fivePrefixes.map((p, i) => [
      `sec_${i}`,
      transformMotifForSection(source, `sec_${i}`, p, 0),
    ])
  );
  const fiveReceipts = scoreMosaicMotifSimilarity(fiveVariants);
  out.push({
    ok: fiveReceipts.every((r) => r.similarity > 0.4),
    name: 'scoreMosaicMotifSimilarity: 5 composer variants all pairs > 0.40',
  });

  out.push({
    ok: composerReceiptPrefixForStyleId('fripp') === 'rf',
    name: 'composerReceiptPrefixForStyleId: fripp → rf',
  });
  out.push({
    ok: composerReceiptPrefixForStyleId('jack_white') === 'jw',
    name: 'composerReceiptPrefixForStyleId: jack_white → jw',
  });
  out.push({
    ok: composerReceiptPrefixForStyleId('wayne_shorter') === 'ws',
    name: 'composerReceiptPrefixForStyleId: wayne_shorter → ws',
  });

  const detSource = generateMosaicSourceMotif(77002, 64);
  const detSource2 = generateMosaicSourceMotif(77002, 64);
  out.push({
    ok: JSON.stringify(detSource) === JSON.stringify(detSource2),
    name: 'generateMosaicSourceMotif: deterministic for same seed',
  });

  return out;
}

function clampSigned(iv: number, max: number): number {
  const sign = iv >= 0 ? 1 : -1;
  return sign * Math.min(max, Math.abs(iv));
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
