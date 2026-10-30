/**
 * One-shot proof: planFromTemplate('full_song', 32) → Song Mode compile → Mosaic map → MusicXML.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/proofFullSongTemplate32.ts
 */

import fs from 'fs';
import path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  alignRepeatedChorusHarmony,
  applyChorusOpeningMotifRecall,
} from '../core/song-mode/chorusReturnIdentity';
import { buildCompiledSong } from '../core/song-mode/songModeBuilder';
import { mapSongModeToMosaicSectionPlan } from '../core/song-mode/songModeToMosaicMapper';
import { planFromTemplate } from '../core/song-mode/songSectionPlanner';

const PROOF_SEED = 334032;
const TOTAL_BARS = 32;
const STYLE = 'beatles';
const OUT_DIR = path.join(__dirname, '..', '..', '..', '.tmp-full-song-proof');
const OUT_XML = path.join(OUT_DIR, `full-song-32-seed${PROOF_SEED}.musicxml`);

function countMeasures(xml: string): number {
  const m = xml.match(/<measure\b[^>]*\bnumber="/g);
  if (!m) return 0;
  /** Prefer part with most measures (score-wide bar count). */
  const partBlocks = xml.split(/<part\b/);
  let max = 0;
  for (const block of partBlocks.slice(1)) {
    const n = (block.match(/<measure\b/g) ?? []).length;
    if (n > max) max = n;
  }
  return max || m.length;
}

function main(): void {
  const sections = planFromTemplate('full_song', TOTAL_BARS);
  const barSum = sections.reduce((s, x) => s + (x.bars ?? 0), 0);
  if (sections.length !== 7 || barSum !== TOTAL_BARS) {
    throw new Error(`planFromTemplate failed: n=${sections.length} barSum=${barSum}`);
  }

  const compiled = buildCompiledSong({
    seed: PROOF_SEED,
    title: 'Full Song Template Proof (32 bars)',
    sections,
    songTotalBars: TOTAL_BARS,
    primarySongwriterStyle: STYLE,
  });

  compiled.chordPlan = alignRepeatedChorusHarmony(compiled.chordPlan);

  const chordBarTotal = compiled.chordPlan.reduce((s, p) => s + p.chordSymbols.length, 0);
  if (compiled.chordPlan.length !== 7 || chordBarTotal !== TOTAL_BARS) {
    throw new Error(
      `compiled chordPlan mismatch: sections=${compiled.chordPlan.length} bars=${chordBarTotal}`
    );
  }

  const choruses = compiled.chordPlan.filter((p) => p.sectionKind === 'chorus');
  if (
    choruses.length < 2 ||
    choruses[0]!.chordSymbols.join('|') !== choruses[1]!.chordSymbols.join('|')
  ) {
    throw new Error('chorus harmony identity failed after alignRepeatedChorusHarmony');
  }

  const mosaicPlan = mapSongModeToMosaicSectionPlan(compiled, { songwriterStyleId: STYLE });
  if (mosaicPlan.length !== 7) {
    throw new Error(`mosaic plan expected 7 sections, got ${mosaicPlan.length}`);
  }
  const mosaicEnd = mosaicPlan[mosaicPlan.length - 1]!.endBar;
  if (mosaicEnd !== TOTAL_BARS) {
    throw new Error(`mosaic endBar expected ${TOTAL_BARS}, got ${mosaicEnd}`);
  }

  const locked = compiled.chordPlan.flatMap((p) => p.chordSymbols);
  const result = runGoldenPathOnce(PROOF_SEED, {
    presetId: 'guitar_bass_duo',
    scoreTitle: 'Full Song Template Proof (32 bars)',
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: mosaicPlan,
    mosaicOutputFormat: 'melody-bass-chords',
    primarySongwriterStyle: STYLE,
    songModeHookFirstIdentity: true,
  });

  if (!result.success || !result.score) {
    throw new Error(`golden path failed: ${(result.errors ?? []).join('; ') || 'no score'}`);
  }

  const score = applyChorusOpeningMotifRecall(result.score, mosaicPlan, { openingBars: 1 });
  const xml = exportScoreModelToMusicXml(score, { bpm: 120 }).xml ?? '';
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    throw new Error('MusicXML missing score root');
  }

  const measures = countMeasures(xml);
  if (measures < TOTAL_BARS) {
    throw new Error(`MusicXML measures ${measures} < ${TOTAL_BARS}`);
  }

  const g = score.parts.find((p) => p.id === 'guitar');
  const ch0 = mosaicPlan.find((s) => s.sectionLabel === 'chorus_0');
  const ch1 = mosaicPlan.find((s) => s.sectionLabel === 'chorus_1');
  const br = mosaicPlan.find((s) => s.sectionLabel === 'bridge_0');
  if (!g || !ch0 || !ch1 || !br) throw new Error('missing chorus/bridge plan or guitar part');
  const pitchesAt = (bar: number) =>
    (g.measures.find((m) => m.index === bar)?.events ?? [])
      .filter((e) => e.kind === 'note')
      .map((e) => (e as { pitch: number }).pitch);
  const open0 = pitchesAt(ch0.startBar);
  const open1 = pitchesAt(ch1.startBar);
  if (open0.length === 0 || open0.join(',') !== open1.join(',')) {
    throw new Error(`chorus opening motif mismatch: ${open0.join(',')} vs ${open1.join(',')}`);
  }
  const brOpen = pitchesAt(br.startBar);
  if (brOpen.join(',') === open0.join(',')) {
    throw new Error('bridge opening collapsed onto chorus motif');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_XML, xml, 'utf8');

  const kinds = sections.map((s) => s.kind).join(',');
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: OUT_XML,
        kinds,
        sectionBars: sections.map((s) => s.bars),
        mosaicLabels: mosaicPlan.map((s) => s.sectionLabel),
        mosaicRanges: mosaicPlan.map((s) => `${s.startBar}-${s.endBar}`),
        chorusHarmony: choruses[0]!.chordSymbols,
        openingMotif: open0,
        bridgeOpening: brOpen,
        chordBarTotal,
        measures,
        bytes: Buffer.byteLength(xml, 'utf8'),
      },
      null,
      2
    )
  );
}

main();
