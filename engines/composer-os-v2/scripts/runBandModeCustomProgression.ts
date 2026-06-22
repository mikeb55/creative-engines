/**
 * Band mode - custom locked progression via generateComposition (persistent output).
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { ART_ROCK_BAND_DRUMS_PART_ID } from '../core/export/appendArtRockBandDrumsToScore';

const PROOF_SEED = 90106;

const USER_CHORDS_19 = [
  'Em(maj7)',
  'Fmaj7#11/E',
  'C#7alt',
  'Am6/F#',
  'Ebmaj9',
  'Gb7/Eb',
  'Cbmaj7#5',
  'Bb7sus4(b9)',
  'Amaj7/C#',
  'F#m11',
  'D#m7b5',
  'G7#9/B',
  'Dbmaj13',
  'Ab7alt/C',
  'Fm9/Eb',
  'Gbm6/Db',
  'A7#11/G',
  'B7alt',
  'Em(add9)',
];

const TOTAL_BARS = 24;
const paddedChords = [
  ...USER_CHORDS_19,
  ...USER_CHORDS_19.slice(0, TOTAL_BARS - USER_CHORDS_19.length),
];

const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'band-mode');

function buildRequest(): GenerateRequest {
  return {
    presetId: 'guitar_bass_duo',
    styleStack: { primary: 'barry_harris' },
    seed: PROOF_SEED,
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    bandModeEnabled: true,
    primarySongwriterStyle: 'verlaine',
    harmonyMode: 'custom_locked',
    chordProgressionText: paddedChords.join(' | '),
    bpm: 120,
    title: 'Band mode custom progression',
  };
}

function xmlHasDrumsPart(xml: string): boolean {
  return xml.includes(`id="${ART_ROCK_BAND_DRUMS_PART_ID}"`) || /<part-name>Drums<\/part-name>/i.test(xml);
}

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const result = generateComposition(buildRequest(), OUTPUT_DIR);

  const chordFailures: string[] = [];
  const dx = result.chordExportDiagnostics;
  if (dx) {
    for (let i = 0; i < USER_CHORDS_19.length; i++) {
      const entry = dx.perChord[i];
      const label = USER_CHORDS_19[i]!;
      if (!entry) {
        chordFailures.push(`${label}: no diagnostic entry`);
        continue;
      }
      if (entry.usedFallback || entry.warning) {
        chordFailures.push(
          `${label} -> ${entry.normalizedSymbol}${entry.warning ? ` (${entry.warning})` : ''}`
        );
      }
    }
  } else if (result.parsedCustomProgressionBars) {
    for (let i = 0; i < USER_CHORDS_19.length; i++) {
      const parsed = result.parsedCustomProgressionBars[i];
      const label = USER_CHORDS_19[i]!;
      if (!parsed || parsed.trim() !== label.trim()) {
        chordFailures.push(`${label} -> ${parsed ?? '(missing)'}`);
      }
    }
  }

  if (result.chordProgressionParseFailed) {
    chordFailures.push(`chordProgressionParseFailed: ${result.chordProgressionParseFailed}`);
  }

  const drumsPresent =
    result.success && result.xml ? xmlHasDrumsPart(result.xml) : false;

  console.log(
    JSON.stringify(
      {
        success: result.success,
        error: result.error,
        musicxmlPath: result.filepath,
        drumsPresent,
        chordFailures,
        parsedFirst19: result.parsedCustomProgressionBars?.slice(0, USER_CHORDS_19.length),
      },
      null,
      2
    )
  );

  if (!result.success) {
    process.exitCode = 1;
  }
}

main();
