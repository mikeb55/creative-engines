/**
 * Harmony Lab adapter — presets, nine ensembles, locks, export.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/harmonyLab.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { apiOrchestrate } from '../app-api/orchestrateApp';
import { compileHarmonyLab, defaultHarmonyLabSettings, describeHarmonySource, HARMONY_LAB_PRESETS, runHarmonyLab } from '../core/orchestrate/harmonyLab';
import type { E2EnsembleId } from '../core/orchestrate/ensembleTemplates';
import type { HarmonyLabKind, HarmonyLabSettings } from '../core/orchestrate/harmonyLab';

const rows: { name: string; ok: boolean }[] = [];
function check(name: string, fn: () => void): void {
  try {
    fn();
    rows.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    rows.push({ name, ok: false });
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  }
}

function fingerprint(settings: HarmonyLabSettings): string {
  const run = runHarmonyLab(settings);
  if (!run.ok) throw new Error(run.error);
  return run.soundingMidis.join(',');
}

function midiNotes(base64: string): number[] {
  const bytes = Buffer.from(base64, 'base64');
  assert.equal(bytes.toString('ascii', 0, 4), 'MThd');
  const notes: number[] = [];
  let index = 14;
  const tracks = bytes.readUInt16BE(10);
  for (let track = 0; track < tracks; track += 1) {
    assert.equal(bytes.toString('ascii', index, index + 4), 'MTrk');
    const length = bytes.readUInt32BE(index + 4);
    const end = index + 8 + length;
    let cursor = index + 8;
    let running = 0;
    while (cursor < end) {
      let value = 0;
      let bite = 0;
      do {
        bite = bytes[cursor]!;
        cursor += 1;
        value = (value << 7) | (bite & 0x7f);
      } while (bite & 0x80);
      void value;
      bite = bytes[cursor]!;
      if (bite & 0x80) {
        running = bite;
        cursor += 1;
      }
      if (running >= 0x90 && running < 0xa0) {
        const pitch = bytes[cursor]!;
        const velocity = bytes[cursor + 1]!;
        if (velocity > 0) notes.push(pitch);
        cursor += 2;
      } else if (running >= 0x80 && running < 0x90) cursor += 2;
      else if (running >= 0xc0 && running < 0xe0) cursor += 1;
      else if (running >= 0xe0 && running < 0xf0) cursor += 2;
      else if (running === 0xff) {
        cursor += 1;
        let lengthBits = 0;
        do {
          bite = bytes[cursor]!;
          cursor += 1;
          lengthBits = (lengthBits << 7) | (bite & 0x7f);
        } while (bite & 0x80);
        cursor += lengthBits;
      } else break;
    }
    index = end;
  }
  return notes;
}

const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="100"/></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

check('seven presets generate different note lists', () => {
  const prints = HARMONY_LAB_PRESETS.map((preset) => fingerprint(preset));
  assert.equal(new Set(prints).size, HARMONY_LAB_PRESETS.length);
  for (const run of HARMONY_LAB_PRESETS.map((preset) => runHarmonyLab(preset))) {
    assert.equal(run.ok, true);
    if (!run.ok) return;
    assert.ok(run.noteCount > 0);
    assert.ok(run.musicXml.includes('<note>'));
    assert.ok(midiNotes(run.midiBase64).length > 0);
  }
});

const kinds: HarmonyLabKind[] = ['polychord', 'triad-pair', 'dyad-pair'];
const ensembles: E2EnsembleId[] = ['big-band', 'string-quartet', 'ecm-duo'];
const expectedParts = { 'big-band': 16, 'string-quartet': 4, 'ecm-duo': 2 };

for (const kind of kinds) {
  for (const ensemble of ensembles) {
    check(`${kind} / ${ensemble} writes notes and parts`, () => {
      const settings: HarmonyLabSettings = {
        ...defaultHarmonyLabSettings(),
        presetId: null,
        title: `${kind} ${ensemble}`,
        kind,
        ensemble,
        simultaneous: false,
        density: 'medium',
        duration: 'quarter',
        use: 'alternate',
        motion: 'parallel',
        phraseReturn: false,
        motifDevelopment: false,
        silence: false,
        commonTone: 'restrike',
        upper: { root: 'D', quality: 'major', octave: 4 },
        lower: { root: 'C', quality: 'major', octave: 4 },
        triadA: { root: 'C', quality: 'major', octave: 4 },
        triadB: { root: 'A', quality: 'minor', octave: 4 },
        dyadA: { low: 'C4', high: 'E4' },
        dyadB: { low: 'D4', high: 'F4' },
      };
      const run = runHarmonyLab(settings);
      assert.equal(run.ok, true, run.ok ? '' : run.error);
      if (!run.ok) return;
      assert.equal(run.partIds.length, expectedParts[ensemble]);
      assert.ok(run.noteCount > 0);
      const doc = new DOMParser().parseFromString(run.musicXml, 'text/xml');
      assert.equal(doc.getElementsByTagName('score-part').length, expectedParts[ensemble]);
      const midi = midiNotes(run.midiBase64);
      for (const pitch of run.soundingMidis) assert.ok(midi.includes(pitch), `MIDI missing sounding ${pitch}`);
    });
  }
}

check('same settings regenerate the same MusicXML', () => {
  const first = runHarmonyLab(HARMONY_LAB_PRESETS[0]);
  const second = runHarmonyLab(HARMONY_LAB_PRESETS[0]);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.musicXml, second.musicXml);
  assert.equal(first.midiBase64, second.midiBase64);
});

check('source locks name the kept notes and survive generation', () => {
  const view = describeHarmonySource(sourceXml);
  assert.equal(view.ok, true);
  assert.equal(view.tempo, 100);
  assert.equal(view.events.length, 4);
  const settings: HarmonyLabSettings = {
    ...defaultHarmonyLabSettings(),
    kind: 'dyad-pair',
    ensemble: 'string-quartet',
    simultaneous: false,
    density: 'sparse',
    motion: 'parallel',
    sourceXml,
    preserveMelody: true,
    preserveRhythm: true,
    preserveTempo: true,
    regionStartBar: 1,
    regionEndBar: 1,
  };
  const compiled = compileHarmonyLab(settings);
  assert.equal(compiled.ok, true, compiled.ok ? '' : compiled.error);
  if (!compiled.ok) return;
  assert.match(compiled.lockStatus, /Locked: melody, rhythm, tempo/);
  assert.equal(compiled.request.tempo, 100);
  assert.ok((compiled.request.sourceNotes?.length ?? 0) >= 1);
  const run = runHarmonyLab(settings);
  assert.equal(run.ok, true, run.ok ? '' : run.error);
  if (!run.ok) return;
  assert.ok(run.musicXml.includes('<sound tempo="100"') || run.musicXml.includes('tempo="100"') || run.soundingMidis.includes(72));
});

check('an empty lock region is refused', () => {
  const run = runHarmonyLab({
    ...defaultHarmonyLabSettings(),
    sourceXml,
    preserveMelody: true,
    regionStartBar: 3,
    regionEndBar: 4,
  });
  assert.equal(run.ok, false);
  if (run.ok) return;
  assert.match(run.error, /region/i);
});

check('augmented triad transformation cannot be selected', () => {
  const compiled = compileHarmonyLab({
    ...defaultHarmonyLabSettings(),
    kind: 'triad-pair',
    triadB: { root: 'C', quality: 'augmented', octave: 4 },
    parentTransform: 'P',
    simultaneous: false,
  });
  assert.equal(compiled.ok, false);
  if (compiled.ok) return;
  assert.match(compiled.error, /Augmented and diminished/);
});

check('orchestrate stays off unless Harmony Lab enables E2', () => {
  const off = apiOrchestrate({ enabled: false, sourceMusicXml: sourceXml, template: 'string_quartet', plan: [], seed: 1, preserveMelody: true });
  assert.equal(off.ok, false);
  const settings = { ...defaultHarmonyLabSettings(), simultaneous: false, density: 'sparse' as const, ensemble: 'string-quartet' as const };
  const compiled = compileHarmonyLab(settings);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const on = apiOrchestrate({ enabled: true, e2: compiled.request });
  assert.equal(on.ok, true);
  if (!on.ok) return;
  assert.ok(on.musicXml.includes('<score-partwise'));
  assert.equal(on.receipt.musicallyApproved, false);
});

check('a six-note polychord is refused on a string quartet', () => {
  const run = runHarmonyLab({
    ...defaultHarmonyLabSettings(),
    ensemble: 'string-quartet',
    simultaneous: true,
    density: 'dense',
    upper: { root: 'D', quality: 'major', octave: 5 },
    lower: { root: 'C', quality: 'major', octave: 3 },
  });
  assert.equal(run.ok, false);
  if (run.ok) return;
  assert.match(run.error, /MIDI|ensemble|part/i);
});

void fs;

export function runHarmonyLabTests(): { name: string; ok: boolean }[] {
  return rows;
}

if (rows.some((row) => !row.ok)) process.exitCode = 1;
