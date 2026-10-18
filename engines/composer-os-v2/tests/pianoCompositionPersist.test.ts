/**
 * Solo Piano GUI persist, HTTP route, and IPC registration.
 * Does not change piano note placement.
 */

import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import express from 'express';
import { apiGenerate } from '../app-api/composerOsApiCore';
import { SUPPORTED_APP_PRESET_IDS } from '../app-api/composerOsAppGeneration';
import {
  PIANO_COFFEE_RUN_SEED_EFFECT,
  PIANO_FIXTURE_SEED_EFFECT,
  persistPianoComposition,
  type PianoPersistResult,
} from '../app-api/pianoCompositionPersist';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { isPathUnderComposerRoot } from '../app-api/composerOsOutputPaths';
import { pianoMidiNotes } from '../core/piano/pianoMidi';
import { comparePianoScoreToXml, type PianoSoundingEvent } from '../core/piano/pianoXmlOracle';
import { resolveDownloadFileTarget } from '../../../scripts/downloadFileRoute';
import { attachPianoComposeRoute } from '../../../scripts/pianoComposeRoute';

type Row = { ok: boolean; name: string; detail?: string };

function row(name: string, ok: boolean, detail?: string): Row {
  return { ok, name, detail };
}

function freshDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'solo-piano-gui-'));
}

function outputNames(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const names: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const child of fs.readdirSync(path.join(dir, entry.name))) names.push(child);
    } else {
      names.push(entry.name);
    }
  }
  return names;
}

function grandStaffOk(xml: string): boolean {
  return xml.includes('<staves>2</staves>')
    && xml.includes('<staff>1</staff>')
    && xml.includes('<staff>2</staff>')
    && xml.includes('<voice>1</voice>')
    && xml.includes('<voice>3</voice>');
}

function soundingMidiDiff(sounding: PianoSoundingEvent[], midiPath: string): string[] {
  const midi = pianoMidiNotes(midiPath);
  const xmlCounts = new Map<string, number>();
  for (const event of sounding) {
    if (event.rest || event.midi === null) continue;
    const key = `${event.midi}:${Math.round(event.onset * midi.ppq)}:${Math.round(event.duration * midi.ppq)}`;
    xmlCounts.set(key, (xmlCounts.get(key) ?? 0) + 1);
  }
  const midiCounts = new Map<string, number>();
  for (const note of midi.notes) {
    const key = `${note.midi}:${note.ticks}:${note.durationTicks}`;
    midiCounts.set(key, (midiCounts.get(key) ?? 0) + 1);
  }
  const lines: string[] = [];
  for (const [key, count] of midiCounts) {
    const xmlCount = xmlCounts.get(key) ?? 0;
    if (xmlCount !== count) lines.push(`midi ${key} x${count} xml x${xmlCount}`);
  }
  for (const [key, count] of xmlCounts) {
    if (!midiCounts.has(key)) lines.push(`xml ${key} x${count}`);
  }
  return lines.sort();
}

function listen(app: express.Express): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      resolve({ server, port });
    });
  });
}

async function postPiano(port: number, body: unknown): Promise<{ status: number; json: PianoPersistResult }> {
  const response = await fetch(`http://127.0.0.1:${port}/api/piano/compose`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json() as PianoPersistResult;
  return { status: response.status, json };
}

export async function runPianoCompositionPersistTests(): Promise<Row[]> {
  const rows: Row[] = [];
  const repo = path.resolve(__dirname, '../../..');
  const ipc = fs.readFileSync(path.join(repo, 'apps/composer-os-desktop/electron/ipcEntry.ts'), 'utf8');
  const httpSource = fs.readFileSync(path.join(repo, 'scripts/startComposerOsAppApi.ts'), 'utf8');
  const routeSource = fs.readFileSync(path.join(repo, 'scripts/pianoComposeRoute.ts'), 'utf8');
  const client = fs.readFileSync(path.join(repo, 'apps/composer-os-app/src/services/api.ts'), 'utf8');
  const page = fs.readFileSync(path.join(repo, 'apps/composer-os-app/src/pages/SoloPianoPage.tsx'), 'utf8');
  const pianoEditor = fs.readFileSync(path.join(repo, 'apps/composer-os-app/src/pages/soloPianoV11Editor.ts'), 'utf8');
  const lanes = fs.readFileSync(path.join(repo, 'apps/composer-os-app/src/constants/generateProducerLanes.ts'), 'utf8');
  const router = fs.readFileSync(path.join(repo, 'apps/composer-os-app/src/router/appRouter.ts'), 'utf8');
  const appTsx = fs.readFileSync(path.join(repo, 'apps/composer-os-app/src/App.tsx'), 'utf8');

  rows.push(row(
    'IPC compose-piano calls persistPianoComposition',
    ipc.includes("ipcMain.handle('composer-os-api:compose-piano'")
      && ipc.includes('persistPianoComposition(body, outputDir)')
      && !/composer-os-api:compose-piano[\s\S]{0,180}apiGenerate/.test(ipc),
  ));
  rows.push(row(
    'HTTP /api/piano/compose calls persistPianoComposition',
    httpSource.includes('attachPianoComposeRoute(app, OUTPUT_DIR)')
      && routeSource.includes("app.post('/api/piano/compose'")
      && routeSource.includes('persistPianoComposition(req.body, outputDir)')
      && !routeSource.includes('apiGenerate'),
  ));
  rows.push(row(
    'client api.composePiano maps to the piano IPC channel',
    client.includes('composePiano:')
      && client.includes("'/piano/compose'")
      && client.includes('composer-os-api:compose-piano'),
  ));
  rows.push(row(
    'Solo Piano route and nav are registered',
    router.includes("'solo-piano': '/solo-piano'")
      && router.includes("return 'Solo Piano'")
      && appTsx.includes('<SoloPianoPage />')
      && appTsx.includes('Solo Piano'),
  ));
  rows.push(row(
    'Generate producer lanes do not gain a piano preset',
    !lanes.includes('pianoCompositionV1') && !lanes.includes('solo_piano') && !lanes.includes('solo-piano'),
  ));
  rows.push(row(
    'SUPPORTED_APP_PRESET_IDS stays the existing producer list',
    JSON.stringify(SUPPORTED_APP_PRESET_IDS) === JSON.stringify([
      'guitar_bass_duo',
      'guitar_bass_duo_single_line',
      'ecm_chamber',
      'riff_generator',
      'song_mode',
      'big_band',
      'string_quartet',
      'sq_to_bb',
      'wyble_etude',
      'slonimsky_etude',
      'martino_linear',
    ]),
  ));
  rows.push(row(
    'page states fixture seed parity and Coffee Run seed invariance',
    page.includes('Seed parity changes some note events.')
      && page.includes('Seed changes do not change its notes. It is a fixed composition.'),
  ));
  rows.push(row(
    'page exposes General Piano V1 controls on the existing solo piano route',
    page.includes('General Piano Composition V1')
      && page.includes('Piano V1 fixture — 8 bars')
      && page.includes('Coffee Run — Variation — 24 bars')
      && pianoEditor.includes('generalPianoV1: true')
      && pianoEditor.includes("body.metre = '4/4'")
      && page.includes('data-testid="solo-piano-bars"')
      && page.includes('data-testid="solo-piano-tempo"')
      && page.includes('data-testid="solo-piano-centre"')
      && page.includes('data-testid="solo-piano-harmony"')
      && page.includes('data-testid="solo-piano-download-xml"')
      && page.includes('data-testid="solo-piano-download-midi"')
      && page.includes('data-testid="solo-piano-validation-errors"')
      && page.includes('api.composePiano(request.body)')
      && !page.includes('api.generate(')
      && !page.includes('apiGenerate'),
  ));

  const fixtureDir = freshDir();
  const fixture = persistPianoComposition({ pianoCompositionV1: true, seed: 76018, innerVoice: true }, fixtureDir);
  rows.push(row('fixture 76018 persists', fixture.ok, fixture.ok ? fixture.filepath : fixture.error));
  if (fixture.ok) {
    const xml = fs.readFileSync(fixture.filepath, 'utf8');
    const composed = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, innerVoice: true });
    const oracle = composed.ok ? comparePianoScoreToXml(composed.score, xml) : null;
    rows.push(row('fixture written XML reparses against the score', Boolean(oracle?.ok), oracle ? oracle.errors.slice(0, 2).join(' | ') : 'compose failed'));
    rows.push(row('fixture XML is a two-staff grand staff', grandStaffOk(xml) && fixture.bars === 8 && fixture.tempo === 64));
    rows.push(row('fixture has no film words', !xml.includes('<words>') && !xml.includes('diminuendo')));
    const midiDiff = oracle ? soundingMidiDiff(oracle.sounding, fixture.midiFilepath) : ['no oracle'];
    const pedal = pianoMidiNotes(fixture.midiFilepath);
    rows.push(row(
      'fixture MIDI matches XML sounding events',
      midiDiff.length === 0,
      midiDiff.join(' | ') || 'match',
    ));
    rows.push(row('fixture MIDI has no pedal events', pedal.pedal.length === 0 && fixture.pedalEventCount === 0, `pedal ${pedal.pedal.length}`));
    rows.push(row(
      'fixture files sit under the output directory',
      isPathUnderComposerRoot(fixtureDir, fixture.filepath)
        && resolveDownloadFileTarget(fixtureDir, fixture.filepath).ok
        && resolveDownloadFileTarget(fixtureDir, fixture.midiFilepath).ok,
    ));
    const beforeXml = fs.readFileSync(fixture.filepath);
    const beforeMidi = fs.readFileSync(fixture.midiFilepath);
    const again = persistPianoComposition({ pianoCompositionV1: true, seed: 76018, innerVoice: true }, fixtureDir);
    rows.push(row(
      'fixture regenerate with the same seed is byte-identical',
      again.ok
        && again.ok
        && again.filepath === fixture.filepath
        && fs.readFileSync(again.filepath).equals(beforeXml)
        && fs.readFileSync(again.midiFilepath).equals(beforeMidi),
    ));
    rows.push(row(
      'fixture seed effect describes parity',
      fixture.seedEffect === PIANO_FIXTURE_SEED_EFFECT,
    ));
  }

  const odd = persistPianoComposition({ pianoCompositionV1: true, seed: 76019, innerVoice: true }, fixtureDir);
  rows.push(row(
    'fixture seed parity changes note events',
    fixture.ok && odd.ok && fs.readFileSync(fixture.filepath, 'utf8') !== fs.readFileSync(odd.filepath, 'utf8'),
  ));

  const noInner = persistPianoComposition({ pianoCompositionV1: true, seed: 76018, innerVoice: false }, fixtureDir);
  rows.push(row(
    'fixture inner voice off changes note events',
    fixture.ok && noInner.ok && fs.readFileSync(fixture.filepath, 'utf8') !== fs.readFileSync(noInner.filepath, 'utf8'),
  ));

  const coffeeDir = freshDir();
  const coffee = persistPianoComposition({
    pianoCompositionV1: true,
    seed: 76018,
    innerVoice: true,
    filmCue: 'coffee-run-variation',
  }, coffeeDir);
  const coffeeOdd = persistPianoComposition({
    pianoCompositionV1: true,
    seed: 76019,
    innerVoice: true,
    filmCue: 'coffee-run-variation',
  }, coffeeDir);
  rows.push(row('Coffee Run 76018 persists', coffee.ok, coffee.ok ? coffee.filepath : coffee.error));
  if (coffee.ok && coffeeOdd.ok) {
    const xml = fs.readFileSync(coffee.filepath, 'utf8');
    const oddXml = fs.readFileSync(coffeeOdd.filepath, 'utf8');
    const composed = apiComposePianoV1({
      pianoCompositionV1: true,
      seed: 76018,
      innerVoice: true,
      filmCue: 'coffee-run-variation',
    });
    const oracle = composed.ok ? comparePianoScoreToXml(composed.score, xml) : null;
    rows.push(row('Coffee Run written XML reparses', Boolean(oracle?.ok), oracle ? oracle.errors.slice(0, 2).join(' | ') : 'compose failed'));
    rows.push(row('Coffee Run XML is a two-staff grand staff', grandStaffOk(xml) && coffee.bars === 24 && coffee.tempo === 64));
    rows.push(row(
      'Coffee Run keeps words, dynamics, and diminuendo',
      xml.includes('<words ') && xml.includes('<p/>') && xml.includes('<mp/>') && xml.includes('<pp/>') && xml.includes('type="diminuendo"'),
    ));
    const midiDiff = oracle ? soundingMidiDiff(oracle.sounding, coffee.midiFilepath) : ['no oracle'];
    const midi = { ok: midiDiff.length === 0, detail: midiDiff.join(' | ') || 'match' };
    const pedal = pianoMidiNotes(coffee.midiFilepath);
    rows.push(row('Coffee Run MIDI matches XML pitch onset duration', midi.ok, midi.detail));
    rows.push(row(
      'Coffee Run MIDI keeps CC64 pedal events',
      composed.ok
        && pedal.pedal.length === composed.score.pianoPedal?.length
        && pedal.pedal.some((event) => event.value === 127)
        && pedal.pedal.some((event) => event.value === 0),
      `pedal ${pedal.pedal.length}`,
    ));
    rows.push(row('Coffee Run seed does not change notes', xml === oddXml));
    rows.push(row('Coffee Run seed effect describes invariance', coffee.seedEffect === PIANO_COFFEE_RUN_SEED_EFFECT));
    const quiet = persistPianoComposition({
      pianoCompositionV1: true,
      seed: 76018,
      innerVoice: false,
      filmCue: 'coffee-run-variation',
    }, coffeeDir);
    rows.push(row(
      'Coffee Run inner voice off changes note events',
      quiet.ok && fs.readFileSync(quiet.ok ? quiet.filepath : '', 'utf8') !== xml,
    ));
  }

  const rejected: unknown[] = [
    { pianoCompositionV1: true, seed: 76018, tempo: 72 },
    { pianoCompositionV1: true, seed: 76018, bars: 12 },
    { pianoCompositionV1: true, seed: 76018, filmCue: 'other' },
    { pianoCompositionV1: true, seed: 1.5 },
    { seed: 76018 },
  ];
  let rejectedOk = true;
  const rejectedDetails: string[] = [];
  for (const body of rejected) {
    const dir = freshDir();
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'sentinel');
    const failed = persistPianoComposition(body, dir);
    const names = outputNames(dir);
    const created = names.some((name) => name.endsWith('.musicxml') || name.endsWith('.mid') || name.endsWith('.partial'));
    const sentinel = fs.readFileSync(path.join(dir, 'keep.txt'), 'utf8') === 'sentinel';
    if (failed.ok || !failed.error || created || !sentinel) {
      rejectedOk = false;
      rejectedDetails.push(`${JSON.stringify(body)} -> ${failed.ok ? 'ok' : failed.error} files=${names.join(',')}`);
    }
  }
  rows.push(row('rejected inputs return an error and write no output', rejectedOk, rejectedDetails.join(' || ')));

  const httpDir = freshDir();
  const app = express();
  app.use(express.json());
  attachPianoComposeRoute(app, httpDir);
  const server = await listen(app);
  try {
    const httpFixture = await postPiano(server.port, { pianoCompositionV1: true, seed: 76018, innerVoice: true });
    const httpBad = await postPiano(server.port, { pianoCompositionV1: true, seed: 76018, tempo: 72 });
    const httpGeneral = await postPiano(server.port, {
      pianoCompositionV1: true,
      generalPianoV1: true,
      seed: 76018,
      bars: 16,
      tempo: 96,
      tonalCentre: 'C',
      harmony: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Dm7', 'Cmaj7', 'Cmaj7'],
      metre: '4/4',
    });
    rows.push(row(
      'HTTP route writes the fixture and rejects tempo 72',
      httpFixture.status === 200
        && httpFixture.json.ok
        && fs.existsSync(httpFixture.json.ok ? httpFixture.json.filepath : '')
        && httpBad.status === 200
        && httpBad.json.ok === false
        && Boolean(httpBad.json.ok === false && httpBad.json.error),
      httpBad.json.ok ? '' : httpBad.json.error,
    ));
    rows.push(row(
      'HTTP route writes a 16-bar general piano score at tempo 96',
      httpGeneral.status === 200
        && httpGeneral.json.ok
        && httpGeneral.json.ok
        && httpGeneral.json.bars === 16
        && httpGeneral.json.tempo === 96
        && httpGeneral.json.filepath.includes('general-piano-v1-seed76018-16bars-96bpm.musicxml')
        && fs.existsSync(httpGeneral.json.midiFilepath),
      httpGeneral.json.ok ? httpGeneral.json.filepath : httpGeneral.json.error,
    ));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  const songDir = freshDir();
  const unsupported = apiGenerate({ presetId: 'solo_piano', seed: 76018 } as Parameters<typeof apiGenerate>[0], songDir);
  rows.push(row(
    'apiGenerate still rejects a piano preset',
    unsupported.success === false && typeof unsupported.error === 'string' && unsupported.error.length > 0,
    unsupported.success ? '' : unsupported.error,
  ));
  const song = apiGenerate({
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris' },
    seed: 424242,
    totalBars: 32,
    styleProfile: 'STYLE_SOPHISTICATED_POP',
    primarySongwriterStyle: 'bacharach',
  }, songDir);
  rows.push(row(
    'apiGenerate song_mode still returns a successful file',
    song.success === true && Boolean(song.filepath) && fs.existsSync(song.filepath ?? ''),
    song.success ? song.filepath : song.error,
  ));

  return rows;
}

if (process.argv[1]?.includes('pianoCompositionPersist.test')) {
  runPianoCompositionPersistTests().then((rows) => {
    for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
    const failed = rows.filter((item) => !item.ok);
    console.log(`${rows.length - failed.length}/${rows.length}`);
    process.exit(failed.length === 0 ? 0 : 1);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
