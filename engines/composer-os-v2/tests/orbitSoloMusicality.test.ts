/**
 * Orbit solo GCE musicality — 7 criteria × 4 solos = 28 tests (v1.7p8).
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/orbitSoloMusicality.test.ts
 */

import { exportSoloMusicContextToMusicXml } from '../core/solo/soloMusicContextExport';
import {
  evaluateGce,
  GCE_CRITERIA,
  gceHasSimultaneousChordsInXml,
  parseSoloMusicalityFromXml,
  type GceCriterion,
} from '../core/solo/soloMusicality';
import { realiseMartinoSolo } from '../core/martino/martinoRealisation';
import { realiseTritonicSolo } from '../core/tritonic/tritonicRealisation';
import { realiseVaultSolo } from '../core/vault/vaultRealisation';
import { realiseZappaSoloFromBehaviour } from '../core/zappa-solo/zappaSoloRealisation';

const ORBIT_28 = [
  'Fmaj7', 'Ebmaj7', 'Dbmaj7', 'Bmaj7', 'Bbm9', 'Abmaj7', 'Gbmaj7',
  'Ebmaj7', 'Fmaj7', 'Ebmaj7', 'Dbmaj7', 'Bmaj7', 'Bbm9', 'NC',
  'Gbmaj7', 'Emaj7', 'G', 'G', 'Eb', 'Eb', 'G', 'G', 'G',
  'Dbmaj7', 'Bb7', 'Fmaj7', 'NC', 'NC',
];

const TOTAL_BARS = 28;
const BPM = 90;
const SEED = 28001;

type SoloFixture = {
  id: string;
  harmonyBars: readonly string[];
  exportXml: () => string;
  maxConsecutiveEighths?: number;
};

function exportTritonicXml(): string {
  const { musicContext, soloNotes } = realiseTritonicSolo({
    harmonyBars: ORBIT_28,
    totalBars: TOTAL_BARS,
    seed: SEED,
    bpm: BPM,
    key: 'F',
    floatingCells: true,
    behaviourBiases: { resolutionDelay: 0.65, motifSingability: 0.85 },
  });
  return exportSoloMusicContextToMusicXml(musicContext, soloNotes, {
    title: 'Orbit Tritonic Solo',
  }).xml;
}

function exportVaultXml(): string {
  const { musicContext, soloNotes } = realiseVaultSolo({
    harmonyBars: ORBIT_28,
    totalBars: TOTAL_BARS,
    seed: SEED + 1,
    bpm: BPM,
    triadPairsMode: true,
    reharmonisationAppetite: 'low',
  });
  return exportSoloMusicContextToMusicXml(musicContext, soloNotes, {
    title: 'Orbit Vault Triad Pairs',
  }).xml;
}

function exportMartinoXml(): string {
  return realiseMartinoSolo({
    harmonyBars: ORBIT_28,
    totalBars: TOTAL_BARS,
    seed: SEED + 2,
    bpm: BPM,
    key: 'F',
    activityStack: ['linear_run', 'guide_tone_lane', 'chromatic_approach', 'rhythmic_displacement'],
    lfv: 0.6,
    phraseLengthBias: 'long',
    tuneName: 'Orbit Solo',
  }).xml;
}

function exportZappaXml(): string {
  const { musicContext, soloNotes } = realiseZappaSoloFromBehaviour({
    harmonyBars: ORBIT_28,
    totalBars: TOTAL_BARS,
    seed: SEED + 3,
    bpm: BPM,
    dramaticArc: true,
    closureRefusalScore: 0.5,
    rhythmicElasticityScore: 0.8,
    modalAnchorRatio: 0.65,
  });
  return exportSoloMusicContextToMusicXml(musicContext, soloNotes, {
    title: 'Orbit Zappa Solo',
  }).xml;
}

const SOLO_FIXTURES: SoloFixture[] = [
  { id: 'solo_01_tritonic', harmonyBars: ORBIT_28, exportXml: exportTritonicXml },
  { id: 'solo_02_vault', harmonyBars: ORBIT_28, exportXml: exportVaultXml },
  { id: 'solo_03_martino', harmonyBars: ORBIT_28, exportXml: exportMartinoXml, maxConsecutiveEighths: 6 },
  { id: 'solo_04_zappa', harmonyBars: ORBIT_28, exportXml: exportZappaXml },
];

function assertGce(criterion: GceCriterion, fixture: SoloFixture): void {
  const xml = fixture.exportXml();
  if (!xml || xml.length < 100) {
    throw new Error(`${fixture.id}: empty MusicXML`);
  }
  const events = parseSoloMusicalityFromXml(xml);
  const scores = evaluateGce(events, fixture.harmonyBars, TOTAL_BARS, xml, {
    maxConsecutiveEighths: fixture.maxConsecutiveEighths,
  });
  if (criterion === 'SINGLE_LINE' && !gceHasSimultaneousChordsInXml(xml)) {
    throw new Error(`${fixture.id}: simultaneous chord elements in XML`);
  }
  if (!scores[criterion]) {
    throw new Error(`${fixture.id}: GCE ${criterion} failed (${events.length} events)`);
  }
}

export function runOrbitSoloMusicalityTests(): { name: string; ok: boolean; error?: string }[] {
  const rows: { name: string; ok: boolean; error?: string }[] = [];
  for (const fixture of SOLO_FIXTURES) {
    for (const criterion of GCE_CRITERIA) {
      const name = `${criterion} — ${fixture.id}`;
      try {
        assertGce(criterion, fixture);
        rows.push({ name, ok: true });
      } catch (err) {
        rows.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return rows;
}

function main(): void {
  const rows = runOrbitSoloMusicalityTests();
  let pass = 0;
  let fail = 0;
  for (const r of rows) {
    if (r.ok) {
      console.log(`PASS: ${r.name}`);
      pass += 1;
    } else {
      console.log(`FAIL: ${r.name} — ${r.error ?? 'unknown'}`);
      fail += 1;
    }
  }
  console.log(`\nOrbit solo GCE musicality: ${pass}/${rows.length} PASS`);
  if (fail > 0) process.exit(1);
}

const invokedDirectly =
  process.argv[1]?.replace(/\\/g, '/').includes('orbitSoloMusicality.test') ?? false;
if (invokedDirectly) {
  main();
}
