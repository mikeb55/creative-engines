/**
 * Verifies single-track MIDI leadsheet input returns inferred harmony advisory fields.
 * Invoked from desktopLaunchUi.test.ts (vitest cannot import the full engine graph).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'node:module';
import { apiRunLeadSheetFileInput } from '../../../engines/composer-os-v2/app-api/runLeadSheetFileInputApi';
import { mapLeadSheetFileInputResponseToPanelState } from '../../composer-os-app/src/services/leadSheetFileInputDesktop';

const requireEngine = createRequire(
  path.resolve(__dirname, '../../../engines/composer-os-v2/package.json')
);
const { Midi } = requireEngine('@tonejs/midi') as typeof import('@tonejs/midi');

function buildSingleTrackMelodyMidi(bars = 8): Buffer {
  const midi = new Midi();
  midi.header.tempos = [{ ticks: 0, bpm: 120 }];
  midi.header.update();
  const barSec = 2;
  const track = midi.addTrack();
  track.channel = 0;
  const pitch = [64, 65, 67, 69, 71, 72, 74, 76];
  for (let bar = 1; bar <= bars; bar++) {
    for (let beat = 0; beat < 4; beat += 0.5) {
      const start = (bar - 1) * barSec + beat * (barSec / 4);
      track.addNote({
        midi: pitch[(bar + Math.floor(beat)) % pitch.length]!,
        time: start,
        duration: (barSec / 4) * 0.95 * 0.5,
        velocity: 0.85,
      });
    }
  }
  return Buffer.from(midi.toArray());
}

const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-desktop-launch-midi-'));
const tmpMid = path.join(tmpOut, 'Orbit_in_4_4.mid');
fs.writeFileSync(tmpMid, buildSingleTrackMelodyMidi(8));

const res = apiRunLeadSheetFileInput({ filePath: tmpMid, composerId: 'james_brown' }, tmpOut);
if (!res.ok) {
  console.error(res.error ?? 'MIDI leadsheet run failed');
  process.exit(1);
}
if (res.sourceFormat !== 'midi' || res.harmonyProvenance !== 'inferred-advisory') {
  console.error('Expected MIDI inferred-advisory harmony provenance');
  process.exit(1);
}
const panelState = mapLeadSheetFileInputResponseToPanelState(res);
if (!panelState.advisory || !/single-track|inferred/i.test(panelState.advisory)) {
  console.error('Expected panel advisory from single-track MIDI run');
  process.exit(1);
}
console.log('ok');
