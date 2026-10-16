import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MELODY = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="120"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;

const MOTIF = [
  { onset: 0, duration: 1, midi: 60 },
  { onset: 1, duration: 0.5, midi: 62 },
  { onset: 1.5, duration: 0.5, midi: 64 },
  { onset: 2, duration: 2, midi: 67 },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '../..');
const electronBin = path.join(
  repoRoot,
  'apps/composer-os-desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
);
const esbuildBin = path.join(repoRoot, 'node_modules/esbuild/bin/esbuild');

function run(cmd: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let text = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timed out: ${cmd} ${text.slice(-800)}`));
    }, 25000);
    child.stdout.on('data', (chunk) => {
      text += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      text += String(chunk);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code && code !== 0) reject(new Error(`exit ${code}: ${text.slice(-800)}`));
      else resolve(text);
    });
  });
}

describe('shared playback signal', () => {
  it('Play, Stop, and Replay produce a non-silent signal on one transport', async () => {
    expect(fs.existsSync(electronBin)).toBe(true);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-playback-'));
    const probe = path.join(dir, 'probe.ts');
    fs.writeFileSync(
      probe,
      `
      import * as Tone from 'tone';
      import { play, stop, sequenceFromTimedNotes } from ${JSON.stringify(path.join(appRoot, 'src/playback/playbackEngine.ts'))};
      import { playbackSequenceFromMusicXml } from ${JSON.stringify(path.join(appRoot, 'src/score/playbackSequenceFromMusicXml.ts'))};
      const xml = ${JSON.stringify(MELODY)};
      const motif = ${JSON.stringify(MOTIF)};
      function peak(analyser, ms) {
        const data = new Uint8Array(analyser.fftSize);
        const started = performance.now();
        let peakDev = 0;
        return new Promise((resolve) => {
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            for (const value of data) peakDev = Math.max(peakDev, Math.abs(value - 128));
            if (performance.now() - started >= ms) resolve(peakDev);
            else setTimeout(tick, 20);
          };
          tick();
        });
      }
      window.runProbe = async () => {
        const raw = Tone.getContext().rawContext;
        const loaded = playbackSequenceFromMusicXml(xml);
        const analyser = raw.createAnalyser();
        analyser.fftSize = 2048;
        Tone.getDestination().connect(analyser);
        await play(loaded.sequence, () => undefined, { onSound: () => undefined });
        const playPeak = await peak(analyser, 700);
        const during = Tone.getTransport().state;
        stop();
        const afterStop = Tone.getTransport().state;
        let callbacks = 0;
        await play(loaded.sequence, () => undefined, { onSound: () => { callbacks += 1; } });
        const replayPeak = await peak(analyser, 1800);
        stop();
        let motifCallbacks = 0;
        await play(sequenceFromTimedNotes(motif, 96, 4), () => undefined, { onSound: () => { motifCallbacks += 1; } });
        const motifPeak = await peak(analyser, 1600);
        const motifSeconds = Tone.getTransport().seconds;
        stop();
        console.log('AUDIO_REPORT ' + JSON.stringify({
          context: raw.state,
          callbacks,
          playPeak,
          during,
          afterStop,
          replayPeak,
          motifCallbacks,
          motifPeak,
          motifSeconds,
          mute: Tone.getDestination().mute,
        }));
      };
      `
    );
    await run(esbuildBin, [
      probe,
      '--bundle',
      '--format=iife',
      '--platform=browser',
      `--outfile=${path.join(dir, 'probe.js')}`,
      `--alias:tone=${path.join(appRoot, 'node_modules/tone/build/esm/index.js')}`,
      `--alias:@composer-os=${path.join(repoRoot, 'engines/composer-os-v2')}`,
      '--log-level=error',
    ]);
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body><script src="./probe.js"></script></body></html>');
    fs.writeFileSync(
      path.join(dir, 'main.cjs'),
      `const { app, BrowserWindow } = require('electron');
const path = require('path');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: false } });
  win.webContents.on('console-message', (_e, _level, message) => {
    if (String(message).includes('AUDIO_REPORT')) console.log(message);
  });
  await win.loadFile(path.join(__dirname, 'index.html'));
  await win.webContents.executeJavaScript('window.runProbe()');
  setTimeout(() => app.quit(), 400);
});`
    );
    const output = await run(electronBin, [path.join(dir, 'main.cjs')]);
    const line = output.split('\n').find((row) => row.includes('AUDIO_REPORT'));
    expect(line, output).toBeTruthy();
    const report = JSON.parse(line!.slice(line!.indexOf('{'))) as {
      context: string;
      callbacks: number;
      playPeak: number;
      during: string;
      afterStop: string;
      replayPeak: number;
      motifCallbacks: number;
      motifPeak: number;
      motifSeconds: number;
      mute: boolean;
    };
    expect(report.context).toBe('running');
    expect(report.callbacks).toBe(4);
    expect(report.playPeak).toBeGreaterThan(0);
    expect(report.replayPeak).toBeGreaterThan(0);
    expect(report.during).toBe('started');
    expect(report.afterStop).toBe('stopped');
    expect(report.motifCallbacks).toBe(4);
    expect(report.motifPeak).toBeGreaterThan(0);
    expect(report.motifSeconds).toBeGreaterThan(0.5);
    expect(report.mute).toBe(false);
  }, 30000);
});
