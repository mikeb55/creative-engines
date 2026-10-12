/**
 * WPS V1.2 additions. Does not write scores.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wpsV12.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';
import { cbvMeasures, runWps } from '../core/wwh/wps/wpsAssess';
import { resolveWpsAlbumTrack, WPS_ALBUM_TRACKS, wpsPerformanceOutputDir } from '../core/wwh/wps/wpsAlbumTracks';
import { WPS_VERSION, type WpsSongSpec } from '../core/wwh/wps/wpsTypes';

const here = path.dirname(fileURLToPath(import.meta.url));
const specDir = path.resolve(here, '../core/wwh/wps/specs');
const snapshotTypes = path.resolve(here, '../core/wwh/wps/baseline/v1.1/wpsTypes.ts');

function loadSpec(name: string): WpsSongSpec {
  return JSON.parse(fs.readFileSync(path.join(specDir, name), 'utf8')) as WpsSongSpec;
}

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('live checker is V1.4 and the snapshot is still V1.1', () => {
    assert.equal(WPS_VERSION, '1.4');
    const frozen = fs.readFileSync(snapshotTypes, 'utf8');
    assert.match(frozen, /WPS_VERSION = '1\.1'/);
    assert.equal(frozen.includes("WPS_VERSION = '1.2'"), false);
  });

  const mirror = loadSpec('03-the-mirror.json');
  const orbit = loadSpec('05-orbit-v2.1.json');
  const wrong = loadSpec('06-wrong-turning.json');
  const songs = [mirror, orbit, wrong];

  check('blueprints are present and song-specific', () => {
    const journeys = songs.map((song) => song.blueprint.harmonicJourney);
    assert.equal(new Set(journeys).size, 3);
    for (const song of songs) {
      assert.equal(song.blueprint.authoritativeLeadsheet, song.leadsheet);
      assert.equal(song.blueprint.harmonicJourney.includes('Opening identity'), false);
      assert.equal(song.gce.dcrRefinements <= 1, true);
      assert.equal(song.gce.officialNumeric, false);
      assert.equal(song.cbv.incorporated, false);
    }
    assert.match(mirror.blueprint.melodicFingerprints.join(' '), /M1/);
    assert.match(wrong.blueprint.protectedLandmarks.join(' '), /3\/4/);
    assert.match(orbit.blueprint.protectedLandmarks.join(' '), /3\/4/);
    assert.match(orbit.blueprint.thematicReturn, /Bar 29/);
    assert.equal(mirror.narrative.some((stage) => stage.name === 'Liquid Harmony'), false);
  });

  check('E source is E-V3.0 for Mirror, Wrong Turning, Orbit, and Impossible Metaphysics', () => {
    for (const name of [
      '03-the-mirror.json',
      '05-orbit-v2.1.json',
      '06-wrong-turning.json',
      '07-impossible-metaphysics.json',
    ]) {
      const song = loadSpec(name);
      const chosen = song.arrangements!.find((item) => item.id === 'E-V3.0');
      assert.ok(chosen, name);
      assert.match(chosen.path, /WWH-Liquid-Harmony-E-V3\.0/);
      assert.match(chosen.path, /E-Liquid-Harmony-V3\.0\.musicxml$/);
      assert.equal(/E-Liquid-Harmony-V2\.0/.test(chosen.path), false);
      assert.equal(/E-Liquid-Harmony\.musicxml$/.test(chosen.path), false);
      assert.equal(fs.existsSync(chosen.path), true, chosen.path);
    }
  });

  check('The Mirror bar 39 is a chord-tone read, and the leadsheet file is unchanged', () => {
    const before = fs.readFileSync(mirror.leadsheet);
    const score = importWwhDuoMusicXml(before.toString('utf8'));
    const bar = score.guitar.measures[38]!;
    assert.equal(bar.number, '39');
    assert.equal(bar.beats, 4);
    assert.equal(bar.beatType, 4);
    assert.equal(bar.statedDivisions, 256);
    assert.equal(bar.hasBackup, false);
    assert.equal(bar.notes[0]?.chord, false);
    assert.equal(bar.notes[0]?.storedDuration, 768);
    assert.equal(bar.notes[1]?.chord, true);
    assert.equal(bar.notes[1]?.storedDuration, 512);
    assert.equal(bar.notes[1]?.duration, 768);
    assert.equal(bar.notes[1]?.type, 'half');
    assert.equal(bar.notes[1]?.dots, 1);
    assert.equal(bar.notes[2]?.storedDuration, 512);
    assert.equal(bar.notes[2]?.duration, 768);
    const result = runWps(mirror);
    assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    const text = result.lines.join('\n');
    assert.match(text, /performance edition resolved V1\.1/);
    assert.match(text, /bass event stream matches the leadsheet/);
    assert.match(text, /guitar octave-change -1/);
    assert.match(text, /3:01\.33/);
    assert.match(text, /arrangement inventory A, B, C, D, E-V3\.0, F, G, H/);
    assert.match(text, /NO OFFICIAL NUMERIC GCE/);
    assert.match(text, /evaluateGce was not run/);
    assert.match(text, /runDcrProtocol was not executed/);
    assert.match(text, /DCR record: 1 refinement/);
    assert.equal(fs.readFileSync(mirror.leadsheet).equals(before), true);
  });

  check('Wrong Turning keeps the 3/4 bar and sounding octave 0', () => {
    const result = runWps(wrong);
    assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    const text = result.lines.join('\n');
    assert.match(text, /guitar octave-change 0/);
    assert.match(text, /<sound tempo>/);
    assert.match(text, /1:03\.50/);
    assert.match(text, /E-V3\.0/);
    const score = importWwhDuoMusicXml(fs.readFileSync(wrong.leadsheet, 'utf8'));
    assert.equal(score.guitar.measures[7]?.beats, 3);
    assert.equal(score.guitar.measures[8]?.beats, 4);
  });

  check('Orbit V2.1 uses leadsheet V2.1 and the 29-bar tempo plan', () => {
    assert.match(orbit.leadsheet, /05-Orbit-Duo-Leadsheet-V2\.1\.musicxml$/);
    assert.equal(orbit.expectedBars, 29);
    const result = runWps(orbit);
    assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    const text = result.lines.join('\n');
    assert.match(text, /0:40\.47/);
    assert.match(text, /guitar octave-change -1/);
    assert.match(text, /printed metronome; no <sound tempo>/);
  });

  check('a second DCR refinement fails', () => {
    const result = runWps({ ...mirror, gce: { ...mirror.gce, dcrRefinements: 2 } });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /maximum of 1/);
  });

  check('CBV cannot be incorporated and cannot cover more than 10% of the bars', () => {
    const incorporated = runWps({ ...mirror, cbv: { ...mirror.cbv, incorporated: true as false } });
    assert.equal(incorporated.ok, false);
    assert.match(incorporated.lines.join('\n'), /CBV must stay unincorporated/);
    const wide = runWps({
      ...mirror,
      cbv: {
        decision: 'proposals',
        incorporated: false,
        note: 'test only',
        proposals: [{ bars: '1-8', change: 'too many bars', reversible: true }],
      },
    });
    assert.equal(wide.ok, false);
    assert.match(wide.lines.join('\n'), /above 10%/);
    assert.deepEqual(cbvMeasures('1-2, 2'), [1, 2]);
  });

  check('a legal CBV proposal is reported and not written', () => {
    const before = fs.readFileSync(mirror.leadsheet);
    const result = runWps({
      ...mirror,
      cbv: {
        decision: 'proposals',
        incorporated: false,
        note: 'test only',
        proposals: [{ bars: '40', change: 'one bar, not used', reversible: true }],
      },
    });
    assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    assert.match(result.lines.join('\n'), /not written/);
    assert.equal(fs.readFileSync(mirror.leadsheet).equals(before), true);
  });

  check('album-track folders follow song identity, not the MusicXML prefix', () => {
    const albumFolders = [
      '01-Black-Aura',
      '02-Palace-Gates',
      '03-The-Mirror',
      '04-Meet-Me-at-Hobos',
      '05-Orbit',
      '06-Wrong-Turning',
      '07-Impossible-Metaphysics',
      '08-Small-Testimony',
      '09-After-Everything',
    ];
    assert.deepEqual(
      WPS_ALBUM_TRACKS.filter((track) => track.position > 0).map((track) => track.folder),
      albumFolders
    );
    const root = path.dirname(mirror.outputDir);
    for (const folder of albumFolders) assert.equal(fs.existsSync(path.join(root, folder)), true, folder);

    assert.equal(path.basename(mirror.outputDir), '03-The-Mirror');
    assert.equal(path.basename(wpsPerformanceOutputDir(mirror)!), '03-The-Mirror');
    assert.match(mirror.performanceEdition ?? '', /\/03-The-Mirror\/03-The-Mirror-Performance-Edition-V1\.1\.musicxml$/);
    assert.equal(fs.existsSync(mirror.performanceEdition!), true);

    const metaphysics = loadSpec('07-impossible-metaphysics.json');
    assert.equal(path.basename(metaphysics.outputDir), '07-Impossible-Metaphysics');
    assert.equal(path.basename(wpsPerformanceOutputDir(metaphysics)!), '07-Impossible-Metaphysics');
    assert.match(
      metaphysics.performanceEdition ?? '',
      /\/07-Impossible-Metaphysics\/07-Impossible-Metaphysics-Performance-Edition-V1\.3\.musicxml$/
    );
    assert.equal(fs.existsSync(metaphysics.performanceEdition!), true);
    assert.equal(path.basename(metaphysics.performanceEdition!), '07-Impossible-Metaphysics-Performance-Edition-V1.3.musicxml');

    assert.equal(path.basename(orbit.outputDir), '05-Orbit');
    assert.equal(path.basename(wrong.outputDir), '06-Wrong-Turning');
    assert.equal(resolveWpsAlbumTrack({ id: '08-small-testimony', title: 'Small Testimony' })?.folder, '08-Small-Testimony');
    assert.equal(resolveWpsAlbumTrack({ id: '04-small-testimony', title: 'Small Testimony' })?.folder, '08-Small-Testimony');
    assert.equal(resolveWpsAlbumTrack({ id: '04-meet-me-at-hobos', title: "Meet Me at Hobo's" })?.folder, '04-Meet-Me-at-Hobos');
    assert.equal(resolveWpsAlbumTrack({ id: 'palace-gates', title: 'Palace Gates' })?.folder, '02-Palace-Gates');
    assert.equal(resolveWpsAlbumTrack({ id: 'palace-gates-solo', title: 'Palace Gates Solo' })?.folder, '02-Palace-Gates');
    assert.equal(resolveWpsAlbumTrack({ id: 'palace-gates-reprise', title: 'Palace Gates Reprise' }), null);
    assert.equal(WPS_ALBUM_TRACKS.length, 9);
    assert.equal(fs.existsSync(path.join(root, '08-Palace-Gates-Reprise')), false);
    assert.equal(fs.existsSync(path.join(root, '00-NON-ALBUM-Wrong-Turning')), false);

    const parent = runWps({ ...mirror, outputDir: root });
    assert.equal(parent.ok, false);
    assert.match(parent.lines.join('\n'), /outputDir must be the album-track folder/);
    assert.match(runWps(mirror).lines.join('\n'), /performance output folder 03-The-Mirror/);
    assert.match(runWps(wrong).lines.join('\n'), /performance output folder 06-Wrong-Turning/);
    assert.match(runWps(metaphysics).lines.join('\n'), /performance output folder 07-Impossible-Metaphysics/);
  });

  check('claiming an official GCE number fails', () => {
    const result = runWps({ ...orbit, gce: { ...orbit.gce, officialNumeric: true as false } });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /official numeric GCE cannot be claimed/);
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
