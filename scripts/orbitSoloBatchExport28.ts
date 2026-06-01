/**
 * Orbit 28-bar — four-engine solo batch export (V107p4).
 * Run: npx tsx --tsconfig tsconfig.json scripts/orbitSoloBatchExport28.ts
 */

import fs from 'fs';
import path from 'path';
import { normalizeChordSymbol } from '../engines/composer-os-v2/core/harmony/chordSymbolAnalysis';
import { clampSoloTrebleConcertMidi } from '../engines/composer-os-v2/core/solo/soloTreblePitchRange';
import { hardenSoloMusicXmlForSibelius, countPitchElements } from '../engines/composer-os-v2/core/solo/soloSibeliusHardening';
import { exportScoreModelToMusicXml } from '../engines/composer-os-v2/core/export/musicxmlExporter';
import { realiseMartinoSolo } from '../engines/composer-os-v2/core/martino/martinoRealisation';
import { soloLineToPartModel } from '../engines/composer-os-v2/core/solo/zappasoloEngine';
import {
  exportSoloMusicContextToMusicXml,
  loopHarmonyBarsToLength,
} from '../engines/composer-os-v2/core/solo/soloMusicContextExport';
import { realiseTritonicSolo } from '../engines/composer-os-v2/core/tritonic/tritonicRealisation';
import { realiseVaultSolo } from '../engines/composer-os-v2/core/vault/vaultRealisation';
import { realiseZappaSoloFromBehaviour, clampZappaTrebleWrittenMidi } from '../engines/composer-os-v2/core/zappa-solo/zappaSoloRealisation';
import type { ScoreModel } from '../engines/composer-os-v2/core/score-model/scoreModelTypes';

const OUT_DIR =
  process.env.ORBIT_SOLO_OUT_DIR ??
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-Solos';

const TOTAL_BARS = 28;
const BPM = 90;
const SEED = 28001;

const CHORDS_RAW: string[] = [
  'Fmaj7',
  'Ebmaj7',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'Abmaj7',
  'Gbmaj7',
  'Ebmaj7',
  'Fmaj7',
  'Ebmaj7',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'NC',
  'Gbmaj7',
  'Emaj7',
  'G',
  'G',
  'Eb',
  'Eb',
  'G',
  'G',
  'G',
  'Dbmaj7',
  'Bb7',
  'Fmaj7',
  'NC',
  'NC',
];

function normalizeOrbitBar(sym: string): string {
  if (/^n\.?c\.?$/i.test(sym.trim())) return 'NC';
  return normalizeChordSymbol(sym);
}

const HARMONY_BARS = loopHarmonyBarsToLength(
  CHORDS_RAW.map(normalizeOrbitBar),
  TOTAL_BARS,
);

type ExportRow = {
  filename: string;
  engine: string;
  exportIntegrityPassed: boolean;
  errors: string[];
  noteCount: number;
};

function writeXml(filename: string, xml: string): string {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const filepath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filepath, xml, 'utf-8');
  return filepath;
}

function exportZappaSolo(): ExportRow {
  const { musicContext, soloLine } = realiseZappaSoloFromBehaviour({
    harmonyBars: HARMONY_BARS,
    totalBars: TOTAL_BARS,
    seed: SEED + 3,
    bpm: BPM,
    key: 'F',
    dramaticArc: true,
    closureRefusalScore: 0.5,
    rhythmicElasticityScore: 0.8,
    modalAnchorRatio: 0.65,
  });
  const soloPart = soloLineToPartModel(soloLine, TOTAL_BARS);
  for (const measure of soloPart.measures) {
    for (const ev of measure.events) {
      if (ev.kind === 'note' && ev.pitch != null) {
        ev.pitch = clampZappaTrebleWrittenMidi(ev.pitch);
      }
    }
  }
  for (let i = 0; i < soloPart.measures.length; i++) {
    const sym = musicContext.harmony.bars[i];
    if (sym) {
      soloPart.measures[i]!.chord = /^NC$/i.test(sym) ? 'N.C.' : sym;
    }
  }
  const score: ScoreModel = {
    title: 'Orbit Zappa Solo',
    tempo: BPM,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [soloPart],
  };
  const ex = exportScoreModelToMusicXml(score, { bpm: BPM });
  const hardened = ex.xml ? hardenSoloMusicXmlForSibelius(ex.xml) : null;
  if (hardened?.xml) writeXml('solo_04_zappa.musicxml', hardened.xml);
  return {
    filename: 'solo_04_zappa.musicxml',
    engine: 'zappa_solo',
    exportIntegrityPassed: hardened?.exportIntegrityPassed ?? false,
    errors: hardened?.exportIntegrityErrors ?? ex.errors ?? ['export failed'],
    noteCount: hardened ? countPitchElements(hardened.xml) : 0,
  };
}

function run(): ExportRow[] {
  const rows: ExportRow[] = [];

  const tritonic = realiseTritonicSolo({
    harmonyBars: HARMONY_BARS,
    totalBars: TOTAL_BARS,
    seed: SEED,
    bpm: BPM,
    key: 'F',
    floatingCells: true,
    behaviourBiases: { resolutionDelay: 0.65, motifSingability: 0.85 },
  });
  const tritonicEx = exportSoloMusicContextToMusicXml(tritonic.musicContext, tritonic.soloNotes, {
    title: 'Orbit Tritonic Solo',
    partName: 'Tritonic Solo',
  });
  writeXml('solo_01_tritonic.musicxml', tritonicEx.xml);
  rows.push({
    filename: 'solo_01_tritonic.musicxml',
    engine: 'tritonic',
    exportIntegrityPassed: tritonicEx.exportIntegrityPassed,
    errors: tritonicEx.exportIntegrityErrors,
    noteCount: tritonicEx.noteCount,
  });

  const vault = realiseVaultSolo({
    harmonyBars: HARMONY_BARS,
    totalBars: TOTAL_BARS,
    seed: SEED + 1,
    bpm: BPM,
    triadPairsMode: true,
    upperStructureContrast: 'high',
    reharmonisationAppetite: 'low',
  });
  const vaultEx = exportSoloMusicContextToMusicXml(vault.musicContext, vault.soloNotes, {
    title: 'Orbit Vault Triad Pairs',
    partName: 'Vault Solo',
  });
  writeXml('solo_02_vault_triad_pairs.musicxml', vaultEx.xml);
  rows.push({
    filename: 'solo_02_vault_triad_pairs.musicxml',
    engine: 'vault',
    exportIntegrityPassed: vaultEx.exportIntegrityPassed,
    errors: vaultEx.exportIntegrityErrors,
    noteCount: vaultEx.noteCount,
  });

  const martino = realiseMartinoSolo({
    harmonyBars: HARMONY_BARS,
    totalBars: TOTAL_BARS,
    seed: SEED + 2,
    bpm: BPM,
    key: 'F',
    activityStack: ['linear_run', 'guide_tone_lane', 'chromatic_approach', 'rhythmic_displacement'],
    lfv: 0.6,
    phraseLengthBias: 'long',
    tuneName: 'Orbit Solo',
  });
  const martinoHardened = hardenSoloMusicXmlForSibelius(martino.xml);
  writeXml('solo_03_martino_linear.musicxml', martinoHardened.xml);
  rows.push({
    filename: 'solo_03_martino_linear.musicxml',
    engine: 'martino',
    exportIntegrityPassed: martinoHardened.exportIntegrityPassed,
    errors: martinoHardened.exportIntegrityErrors,
    noteCount: countPitchElements(martinoHardened.xml),
  });

  rows.push(exportZappaSolo());

  return rows;
}

const results = run();
console.log(JSON.stringify({ outDir: OUT_DIR, totalBars: TOTAL_BARS, bpm: BPM, results }, null, 2));
const failed = results.filter((r) => !r.exportIntegrityPassed);
if (failed.length > 0) {
  console.error('Integrity failures:', failed);
  process.exit(1);
}
