/**
 * One realised score, four MIDI files.
 * Each file stays inside the existing E2 pitched-channel guard.
 * This is not a single full-orchestra MIDI file.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { zipSync } from 'fflate';
import { e2SoundingChannel, writeScoreModelMidiFile } from '../export/midiScoreWriter';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { SYMPHONIC_MIDI_FILES, SYMPHONIC_SLOTS } from './symphonicWriting';

export interface SymphonicMidiRoute {
  partId: string;
  name: string;
  file: string;
  track: number;
  channel: number;
  program: number;
  percussion?: Array<{ name: string; gmNote: number }>;
}

export interface SymphonicMidiManifest {
  label: 'Synchronized MIDI set. Not one full-orchestra MIDI file.';
  ppq: 480;
  tickOrigin: 0;
  files: string[];
  routes: SymphonicMidiRoute[];
}

export function buildSymphonicMidiSet(score: ScoreModel, tempo: number): { ok: true; zipBase64: string; manifest: SymphonicMidiManifest } | { ok: false; error: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'symphony-midi-'));
  const files: Record<string, Uint8Array> = {};
  const routes: SymphonicMidiRoute[] = [];
  for (const fileName of SYMPHONIC_MIDI_FILES) {
    const slots = SYMPHONIC_SLOTS.filter((slot) => slot.midiFile === fileName);
    const parts = slots.map((slot) => score.parts.find((part) => part.id === slot.partId));
    if (parts.some((part) => !part)) return { ok: false, error: `${fileName} is missing a roster part. A part was not dropped.` };
    const subset: ScoreModel = { ...score, parts: parts as ScoreModel['parts'], tempo };
    const target = path.join(directory, fileName);
    const wrote = writeScoreModelMidiFile(subset, target, { bpm: tempo, barMeterMap: score.barMeterMap, allowEmpty: true });
    if (!wrote) return { ok: false, error: `${fileName} was not written.` };
    files[fileName] = new Uint8Array(fs.readFileSync(target));
    parts.forEach((part, index) => {
      if (!part) return;
      routes.push({
        partId: part.id,
        name: part.name,
        file: fileName,
        track: index + 1,
        channel: e2SoundingChannel(part, index),
        program: part.midiProgram,
        ...(part.instrumentIdentity === 'orchestral_percussion'
          ? { percussion: [{ name: 'Bass drum', gmNote: 36 }, { name: 'Suspended cymbal', gmNote: 57 }] }
          : {}),
      });
    });
  }
  const manifest: SymphonicMidiManifest = {
    label: 'Synchronized MIDI set. Not one full-orchestra MIDI file.',
    ppq: 480,
    tickOrigin: 0,
    files: [...SYMPHONIC_MIDI_FILES],
    routes,
  };
  files['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  const zipped = zipSync(files);
  return { ok: true, zipBase64: Buffer.from(zipped).toString('base64'), manifest };
}
