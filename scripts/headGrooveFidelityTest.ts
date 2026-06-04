/**
 * HeadGroove.mid fidelity test — import-only, single-bar Sibelius Jazz Kit export.
 * Run: npx tsx --tsconfig tsconfig.json scripts/headGrooveFidelityTest.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { attachImportedGrooveToSongSections } from '../engines/composer-os-v2/core/groove-scaffold/attachGrooveToSections';
import { exportGrooveDrumsToMusicXml } from '../engines/composer-os-v2/core/groove-scaffold/exportGrooveDrumsMusicXml';
import { importExternalGrooveMidi } from '../engines/composer-os-v2/core/groove-scaffold/importGrooveMidi';
import {
  beatsPerBarFromTimeSignature,
  GmDrumPitch,
  type GrooveDrumEvent,
} from '../engines/composer-os-v2/core/groove-scaffold/importGrooveMidiTypes';

const HEAD_GROOVE_MID = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Orbit Big Band',
  'New Orleans Orbit Beats',
  'HeadGroove.mid',
);

const OUT = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Orbit Big Band',
  'Orbit-NewOrleans-Revision',
  'HeadGroove-Test.musicxml',
);

const PITCH_NAMES: Record<number, string> = {
  [GmDrumPitch.HI_HAT_FOOT]: 'Hi-Hat Foot (GM 22)',
  [GmDrumPitch.KICK]: 'Kick (GM 36)',
  [GmDrumPitch.SNARE]: 'Snare (GM 38)',
  [GmDrumPitch.SNARE_RIM]: 'Snare Rim (GM 40)',
  [GmDrumPitch.HI_HAT_CLOSED]: 'Closed Hi-Hat (GM 42)',
  [GmDrumPitch.HI_HAT_OPEN]: 'Open Hi-Hat (GM 46)',
  [GmDrumPitch.RIDE]: 'Ride (GM 51)',
  [GmDrumPitch.TOM_LOW]: 'Tom Low (GM 45)',
  [GmDrumPitch.TOM_MID]: 'Tom Mid (GM 47)',
  [GmDrumPitch.TOM_HIGH]: 'Tom High (GM 50)',
  [GmDrumPitch.CRASH]: 'Crash (GM 49)',
};

function beatLabel(beat: number): string {
  const barBeat = beat % 4;
  const beatNum = Math.floor(barBeat) + 1;
  const frac = barBeat - Math.floor(barBeat);
  if (frac < 0.02) return `${beatNum}`;
  if (Math.abs(frac - 0.25) < 0.02) return `${beatNum}e`;
  if (Math.abs(frac - 0.333) < 0.02) return `${beatNum} trip`;
  if (Math.abs(frac - 0.5) < 0.02) return `&${beatNum}`;
  if (Math.abs(frac - 0.667) < 0.02) return `&${beatNum}a`;
  if (Math.abs(frac - 0.75) < 0.02) return `&${beatNum}+`;
  return beat.toFixed(6);
}

function eventsInBar(events: GrooveDrumEvent[], barIndex: number, beatsPerBar: number): GrooveDrumEvent[] {
  const start = (barIndex - 1) * beatsPerBar;
  const end = start + beatsPerBar;
  return events.filter((e) => e.beatPosition >= start - 1e-9 && e.beatPosition < end - 1e-9);
}

function isHiHatFamily(pitch: GmDrumPitch): boolean {
  return (
    pitch === GmDrumPitch.HI_HAT_CLOSED ||
    pitch === GmDrumPitch.HI_HAT_OPEN ||
    pitch === GmDrumPitch.HI_HAT_FOOT
  );
}

function analyzePattern(bar1: GrooveDrumEvent[]): {
  kick: number;
  snare: number;
  hihat: number;
  ride: number;
  verdict: string;
  notes: string[];
} {
  const kick = bar1.filter((e) => e.pitch === GmDrumPitch.KICK).length;
  const snare = bar1.filter(
    (e) => e.pitch === GmDrumPitch.SNARE || e.pitch === GmDrumPitch.SNARE_RIM,
  ).length;
  const hihat = bar1.filter(isHiHatFamily).length;
  const ride = bar1.filter((e) => e.pitch === GmDrumPitch.RIDE).length;

  const notes: string[] = [];
  const cymbalHits = bar1.filter(
    (e) =>
      e.pitch === GmDrumPitch.HI_HAT_CLOSED ||
      e.pitch === GmDrumPitch.HI_HAT_OPEN ||
      e.pitch === GmDrumPitch.RIDE,
  );
  const cymbalBeats = cymbalHits.map((e) => e.beatPosition % 4).sort((a, b) => a - b);

  const eighthGrid = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  const onEighthGrid = cymbalBeats.filter((b) =>
    eighthGrid.some((g) => Math.abs(b - g) < 0.04),
  ).length;
  const offEighthGrid = cymbalBeats.length - onEighthGrid;

  const snareOnBackbeat = bar1.filter(
    (e) =>
      (e.pitch === GmDrumPitch.SNARE || e.pitch === GmDrumPitch.SNARE_RIM) &&
      (Math.abs((e.beatPosition % 4) - 1) < 0.06 || Math.abs((e.beatPosition % 4) - 3) < 0.06),
  ).length;

  const kickOnOne = bar1.some(
    (e) => e.pitch === GmDrumPitch.KICK && Math.abs(e.beatPosition % 4) < 0.06,
  );
  const hasTripletFeel = cymbalBeats.some((b) => {
    const frac = b - Math.floor(b);
    return Math.abs(frac - 1 / 3) < 0.05 || Math.abs(frac - 2 / 3) < 0.05;
  });

  if (kickOnOne && snareOnBackbeat >= 1 && (offEighthGrid > 0 || hasTripletFeel)) {
    notes.push('Kick on 1, snare backbeat accents present, cymbal syncopation off straight 8th grid');
  }
  if (onEighthGrid >= 6 && offEighthGrid <= 1 && !hasTripletFeel) {
    notes.push('Cymbals mostly on straight 8th-note grid (every 0.5 quarters)');
  }
  if (hasTripletFeel) {
    notes.push('Triplet-subdivision hits present (typical second-line / NOLA feel)');
  }
  if (ride > 0 && hihat === 0) {
    notes.push('Ride carries top layer (common in parade / second-line grooves)');
  }

  let verdict: string;
  if (
    kickOnOne &&
    snareOnBackbeat >= 1 &&
    (hasTripletFeel || offEighthGrid >= Math.max(2, Math.floor(cymbalBeats.length * 0.15)))
  ) {
    verdict = 'Second-line / New Orleans pocket — not generic straight 8ths';
  } else if (onEighthGrid >= 6 && cymbalBeats.length >= 6) {
    verdict = 'Leans generic straight 8th-note cymbal pattern';
  } else {
    verdict = 'Mixed — some syncopation; inspect beat positions below';
  }

  return { kick, snare, hihat: hihat + ride, ride, verdict, notes };
}

function run(): void {
  console.log('=== HeadGroove.mid — importExternalGrooveMidi() ===\n');
  console.log('File:', HEAD_GROOVE_MID);

  const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
  const beatsPerBar = beatsPerBarFromTimeSignature(
    groove.timeSignatureNumerator,
    groove.timeSignatureDenominator,
  );

  console.log(`\nSource: ${groove.sourceFile}`);
  console.log(`Ticks/beat: ${groove.ticks_per_beat} · Loop: ${groove.loopLengthBars} bars · TS: ${groove.timeSignatureNumerator}/${groove.timeSignatureDenominator}`);
  console.log(`Total extracted events: ${groove.events.length}\n`);

  console.log('--- All extracted events ---');
  console.log(
    `${'beat'.padStart(14)}  ${'GM'.padStart(4)}  ${'pitch name'.padEnd(24)}  duration (q)  vel`,
  );
  console.log('-'.repeat(72));
  for (const e of groove.events) {
    const name = PITCH_NAMES[e.pitch] ?? `Unknown (GM ${e.pitch})`;
    console.log(
      `${e.beatPosition.toFixed(10).padStart(14)}  ${String(e.pitch).padStart(4)}  ${name.padEnd(24)}  ${e.durationQuarters.toFixed(6).padStart(12)}  ${e.velocity}`,
    );
  }

  const bar1 = eventsInBar(groove.events, 1, beatsPerBar);
  console.log(`\n--- Bar 1 events (${bar1.length} hits, beat 0.0–${beatsPerBar}.0) ---`);
  console.log(
    `${'beat'.padStart(14)}  ${'label'.padStart(8)}  ${'GM'.padStart(4)}  ${'pitch name'.padEnd(24)}  duration (q)`,
  );
  console.log('-'.repeat(72));
  for (const e of bar1) {
    const localBeat = e.beatPosition;
    const name = PITCH_NAMES[e.pitch] ?? `Unknown (GM ${e.pitch})`;
    console.log(
      `${localBeat.toFixed(10).padStart(14)}  ${beatLabel(localBeat).padStart(8)}  ${String(e.pitch).padStart(4)}  ${name.padEnd(24)}  ${e.durationQuarters.toFixed(6)}`,
    );
  }

  const analysis = analyzePattern(bar1);
  console.log('\n--- Bar 1 hit counts ---');
  console.log(`  Kick:   ${analysis.kick}`);
  console.log(`  Snare:  ${analysis.snare}`);
  console.log(`  Hi-hat family (+ ride counted separately): closed/open/foot = ${bar1.filter(isHiHatFamily).length}, ride = ${analysis.ride}`);
  console.log(`  Cymbal layer total (hat+ride): ${analysis.hihat}`);

  console.log('\n--- Pattern read ---');
  for (const n of analysis.notes) console.log(`  · ${n}`);
  console.log(`  Verdict: ${analysis.verdict}`);

  const ctx = attachImportedGrooveToSongSections([
    { grooveId: 'HeadGroove_bar1', startBar: 1, endBar: 1, groove },
  ]);
  const xml = exportGrooveDrumsToMusicXml(ctx, 90, 4, 4);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, xml, 'utf8');
  console.log('\nWrote', OUT);
  console.log('\nSibelius Jazz Kit mapping (exportGrooveDrumsMusicXml):');
  console.log('  GM 36 → F4  voice2 stem-down normal');
  console.log('  GM 38 → C5  voice1 stem-up normal');
  console.log('  GM 42 → G5  voice1 stem-up x');
  console.log('  GM 46 → G5  voice1 stem-up x');
  console.log('  GM 51 → A5  voice1 stem-up x');
  console.log('  GM 22 → D4  voice2 stem-down x');
}

run();
