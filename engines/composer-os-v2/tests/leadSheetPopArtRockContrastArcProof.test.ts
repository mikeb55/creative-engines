/**
 * Art Rock pop contrast arc proof - Metaphysics 40-bar density arc gate.
 */

import path from 'path';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import {
  analyzeLeadSheetPopArtRockContrastArc,
  measureArtRockDensityRegionAverages,
} from '../core/import/leadSheetPopArtRockContrastArcPass';
import { resolveMetaphysicsLeadSheetProofPath } from '../core/import/resolveOrbitLeadSheetProofPath';

const PROOF_SEED = 90106;

export function runLeadSheetPopArtRockContrastArcProofTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const fixture = resolveMetaphysicsLeadSheetProofPath(path.join(__dirname, '..'));
  if (!fixture) {
    out.push({
      ok: true,
      name: 'art_rock arc: skipped (Metaphysics fixture not on disk)',
    });
    return out;
  }

  const importTimeline = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(fixture);
  const handoff = assembleDebussyLeadSheetQuintetWithHandoffScore(
    PROOF_SEED,
    undefined,
    importTimeline,
    'art_rock',
  );

  out.push({
    ok: handoff.artRockContrastArc?.planingPresent === true,
    name: 'art_rock arc: planed power comp present in diagnostics',
  });

  out.push({
    ok: handoff.partIds.length === 5,
    name: 'art_rock arc: quintet part count',
  });

  const bars = analyzeLeadSheetPopArtRockContrastArc(handoff.score);
  const regions = measureArtRockDensityRegionAverages(bars);

  out.push({
    ok: regions.buildPeak > regions.intro,
    name: `art_rock arc: build/peak avg density (${regions.buildPeak.toFixed(2)}) > intro (${regions.intro.toFixed(2)})`,
  });

  out.push({
    ok: regions.buildPeak > regions.tail,
    name: `art_rock arc: build/peak avg density (${regions.buildPeak.toFixed(2)}) > tail (${regions.tail.toFixed(2)})`,
  });

  const peakBar = bars.find((b) => b.bar === 26);
  out.push({
    ok: (peakBar?.attackCount ?? 0) >= 3,
    name: 'art_rock arc: bar 26 peak attack count >= 3',
  });

  out.push({
    ok: regions.peakMax >= (peakBar?.attackCount ?? 0),
    name: 'art_rock arc: peakMax tracks bars 25-28',
  });

  const phraseEndColour = bars.filter((b) => b.sus4ColourPresent).length;
  out.push({
    ok: phraseEndColour >= 2,
    name: `art_rock arc: sus4 phrase-end colour on >=2 bars (count=${phraseEndColour})`,
  });

  return out;
}

if (require.main === module) {
  const results = runLeadSheetPopArtRockContrastArcProofTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
