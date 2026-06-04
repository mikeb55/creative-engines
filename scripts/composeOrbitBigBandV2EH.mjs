/**
 * Orbit Big Band V2.0 E–H: preserve bars 1–62, compose 63–94 from source motifs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, '../engines/composer-os-v2/package.json'));
const { Midi } = require('@tonejs/midi');

const INPUT =
  'C:\\Users\\mike\\Documents\\Mike Cubase Files\\June 26 Cubase files\\Orbit Nawlins\\big band orbit V1.0 -TBC.mid';
const OUTPUT =
  'C:\\Users\\mike\\Documents\\Mike Cubase Files\\June 26 Cubase files\\Orbit Nawlins\\big band orbit V2.0 -E-H.mid';

const PPQ = 480;
const BAR = PPQ * 4;
const FIRST_NEW_BAR = 63;
const LAST_BAR = 94;

const trackByName = (midi, name) => {
  const t = midi.tracks.find((tr) => tr.name === name);
  if (!t) throw new Error(`Missing track: ${name}`);
  return t;
};

const barStart = (bar) => (bar - 1) * BAR;
const beatTicks = (beat) => Math.round((beat - 1) * PPQ);

const emitNote = (track, n, bar, velocity) => {
  addNote(track, {
    midi: n.midi,
    bar,
    beat: n.beat,
    durBeats: n.dur,
    velocity,
  });
};

const addNote = (track, { midi, bar, beat, durBeats, velocity }) => {
  const ticks = barStart(bar) + beatTicks(beat);
  const durationTicks = Math.max(PPQ / 8, Math.round(durBeats * PPQ));
  track.addNote({
    midi,
    ticks,
    durationTicks,
    velocity: Math.min(1, Math.max(0.05, velocity)),
  });
};

const notesInBar = (track, bar) =>
  track.notes
    .filter((n) => {
      const b = Math.floor(n.ticks / BAR) + 1;
      return b === bar;
    })
    .map((n) => ({
      midi: n.midi,
      beat: (n.ticks % BAR) / PPQ + 1,
      dur: n.durationTicks / PPQ,
      vel: n.velocity,
    }))
    .sort((a, b) => a.beat - b.beat);

const cloneBarNotes = (track, fromBar, toBar, velScale = 1, beatShift = 0) => {
  for (const n of notesInBar(track, fromBar)) {
    const beat = n.beat + beatShift;
    if (beat >= 1 && beat <= 5.5) {
      addNote(track, {
        midi: n.midi,
        bar: toBar,
        beat,
        durBeats: n.dur,
        velocity: n.vel * velScale,
      });
    }
  }
};

/** A melody source — Tenor Sax 2 bars 14–21 */
const A_MELODY_BARS = [14, 15, 16, 17, 18, 19, 20, 21];
/** B melody source — Trumpet 1 bars 38–45 */
const B_MELODY_BARS = [38, 39, 40, 41, 42, 43, 44, 45];

const CHORD_PIANO = {
  Fmaj7: [65, 69, 72, 76],
  Ebmaj7: [63, 67, 70, 74],
  Dbmaj7: [61, 65, 68, 72],
  Bbm9: [58, 61, 65, 68],
  Abmaj7: [56, 60, 63, 68],
  Gbmaj7: [54, 58, 61, 66],
  Emaj7: [64, 68, 71, 75],
  Bmaj7: [59, 63, 66, 70],
  Bb7: [58, 62, 65, 68],
  Db: [61, 65, 68, 72],
};

const addPianoShell = (piano, chord, bar, vel = 0.42) => {
  const pcs = CHORD_PIANO[chord] ?? CHORD_PIANO.Fmaj7;
  addNote(piano, { midi: pcs[0], bar, beat: 1, durBeats: 2.5, velocity: vel });
  addNote(piano, { midi: pcs[1], bar, beat: 1.02, durBeats: 2.5, velocity: vel * 0.9 });
  addNote(piano, { midi: pcs[2], bar, beat: 1.04, durBeats: 2.5, velocity: vel * 0.85 });
  addNote(piano, { midi: pcs[3], bar, beat: 1.06, durBeats: 2.5, velocity: vel * 0.8 });
};

const addRhodesPad = (rhodes, chord, bar, vel = 0.28) => {
  const pcs = CHORD_PIANO[chord] ?? CHORD_PIANO.Fmaj7;
  for (let i = 0; i < pcs.length; i++) {
    addNote(rhodes, { midi: pcs[i] - 12, bar, beat: 1 + i * 0.01, durBeats: 3.5, velocity: vel });
  }
};

/** Light ECM drum pattern — snareDensity 0–1 */
const addDrumBar = (drums, bar, profile, snareDensity = 0.5) => {
  const ride = [51, 59];
  const kick = 36;
  const hat = 42;
  const sn = 38;
  const vel = profile === 'light' ? 0.35 : profile === 'recap' ? 0.52 : profile === 'out' ? 0.45 : 0.3;
  addNote(drums, { midi: kick, bar, beat: 1, durBeats: 0.12, velocity: vel });
  if (profile !== 'coda') {
    addNote(drums, { midi: ride[0], bar, beat: 1.02, durBeats: 0.1, velocity: vel * 0.85 });
    addNote(drums, { midi: hat, bar, beat: 2, durBeats: 0.1, velocity: vel * 0.7 });
  }
  if (snareDensity > 0.2) {
    addNote(drums, { midi: sn, bar, beat: 2.02, durBeats: 0.1, velocity: vel * snareDensity });
    if (snareDensity > 0.45) {
      addNote(drums, { midi: sn, bar, beat: 2.35, durBeats: 0.1, velocity: vel * snareDensity * 0.85 });
    }
  }
  addNote(drums, { midi: kick, bar, beat: 3, durBeats: 0.12, velocity: vel * 0.9 });
  addNote(drums, { midi: hat, bar, beat: 3.02, durBeats: 0.1, velocity: vel * 0.65 });
  if (profile === 'recap') {
    addNote(drums, { midi: sn, bar, beat: 3.5, durBeats: 0.1, velocity: vel * 0.55 });
    addNote(drums, { midi: ride[1], bar, beat: 4, durBeats: 0.1, velocity: vel * 0.75 });
  } else if (profile === 'out') {
    addNote(drums, { midi: ride[0], bar, beat: 4, durBeats: 0.1, velocity: vel * 0.7 });
  } else if (profile === 'coda') {
    addNote(drums, { midi: 49, bar, beat: 1, durBeats: 3.5, velocity: 0.22 });
    addNote(drums, { midi: 57, bar, beat: 2.5, durBeats: 0.15, velocity: 0.18 });
    addNote(drums, { midi: 36, bar, beat: 4, durBeats: 0.2, velocity: 0.15 });
  } else {
    addNote(drums, { midi: hat, bar, beat: 4, durBeats: 0.1, velocity: vel * 0.6 });
  }
};

const fragmentMelody = (sourceNotes, ratio = 0.55) => {
  if (!sourceNotes.length) return [];
  const take = Math.max(2, Math.ceil(sourceNotes.length * ratio));
  return sourceNotes.slice(0, take);
};

const transposeNotes = (notes, semitones) =>
  notes.map((n) => ({ ...n, midi: n.midi + semitones }));

function composeSectionE(midi) {
  const alto = trackByName(midi, 'Alto Sax 1');
  const trumpet = trackByName(midi, 'Trumpet 1');
  const tenor2 = trackByName(midi, 'Tenor Sax 2');
  const dBass = trackByName(midi, 'Double Bass');
  const bass = trackByName(midi, 'Bass');
  const piano = trackByName(midi, 'Piano');
  const rhodes = trackByName(midi, 'Rhodes Keys');
  const drums = trackByName(midi, 'Drums - Studio Drummer');
  const alto2 = trackByName(midi, 'Alto Sax 2');
  const tpt2 = trackByName(midi, 'Trumpet 2');

  const chords = ['Fmaj7', 'Ebmaj7', 'Dbmaj7', 'Bbm9', 'Abmaj7', 'Gbmaj7', 'Emaj7', 'Emaj7'];
  const bassSource = [5, 6, 7, 14, 15, 16, 17, 17];

  for (let i = 0; i < 8; i++) {
    const bar = 63 + i;
    const vel = 0.52 + i * 0.02;
    cloneBarNotes(dBass, bassSource[i], bar, 1);
    cloneBarNotes(bass, bassSource[i], bar, 0.85);
    addPianoShell(piano, chords[i], bar, 0.38 + i * 0.02);
    addRhodesPad(rhodes, chords[i], bar, 0.22);
    addDrumBar(drums, bar, 'light', 0.32);

    const aSrc = notesInBar(tenor2, A_MELODY_BARS[i % 8]);
    const bSrc = notesInBar(trumpet, B_MELODY_BARS[i % 8]);

    if (i % 2 === 0) {
      for (const n of fragmentMelody(aSrc, 0.6)) {
        emitNote(alto, n, bar, n.vel * vel);
        emitNote(tenor2, n, bar, n.vel * (vel - 0.15));
      }
      for (const n of fragmentMelody(bSrc, 0.45)) {
        addNote(trumpet, {
          midi: n.midi + 2,
          bar,
          beat: n.beat + 0.5,
          durBeats: n.dur * 0.85,
          velocity: n.vel * (vel - 0.08),
        });
      }
    } else {
      for (const n of fragmentMelody(bSrc, 0.55)) {
        emitNote(trumpet, n, bar, n.vel * vel);
        emitNote(tenor2, { midi: n.midi - 12, beat: n.beat, dur: n.dur, vel: n.vel }, bar, n.vel * (vel - 0.2));
      }
      for (const n of fragmentMelody(aSrc, 0.5)) {
        addNote(alto, {
          midi: n.midi - 5,
          bar,
          beat: n.beat + 0.25,
          durBeats: n.dur * 0.9,
          velocity: n.vel * (vel - 0.1),
        });
      }
    }

    if (i === 3 || i === 7) {
      cloneBarNotes(alto2, 11, bar, 0.35);
      cloneBarNotes(tpt2, 30 + (i % 4), bar, 0.32);
    }
  }
}

function composeSectionF(midi) {
  const trumpet = trackByName(midi, 'Trumpet 1');
  const alto = trackByName(midi, 'Alto Sax 1');
  const tenor1 = trackByName(midi, 'Tenor Sax 1');
  const tenor2 = trackByName(midi, 'Tenor Sax 2');
  const dBass = trackByName(midi, 'Double Bass');
  const bass = trackByName(midi, 'Bass');
  const piano = trackByName(midi, 'Piano');
  const rhodes = trackByName(midi, 'Rhodes Keys');
  const drums = trackByName(midi, 'Drums - Studio Drummer');
  const tboneT = trackByName(midi, 'Trombone Tenor');
  const tboneB = trackByName(midi, 'Trombone Bass');

  for (let i = 0; i < 8; i++) {
    const bar = 71 + i;
    const srcBridge = 30 + i;
    const vel = 0.62 + i * 0.04;
    cloneBarNotes(dBass, srcBridge, bar, 1.02);
    cloneBarNotes(bass, srcBridge, bar, 0.9);
    addPianoShell(piano, i < 4 ? 'Ebmaj7' : 'Gbmaj7', bar, 0.44 + i * 0.03);
    addRhodesPad(rhodes, i < 4 ? 'Ebmaj7' : 'Gbmaj7', bar, 0.3);
    addDrumBar(drums, bar, 'recap', 0.58);

    cloneBarNotes(trumpet, B_MELODY_BARS[i], bar, vel);
    const bNotes = notesInBar(trumpet, B_MELODY_BARS[i]);
    for (const n of bNotes) {
      addNote(alto, {
        midi: n.midi - 7,
        bar,
        beat: n.beat,
        durBeats: n.dur,
        velocity: n.vel * (vel - 0.12),
      });
      addNote(tenor1, {
        midi: n.midi - 14,
        bar,
        beat: n.beat + 0.02,
        durBeats: n.dur * 0.95,
        velocity: n.vel * (vel - 0.18),
      });
      addNote(tenor2, {
        midi: n.midi - 19,
        bar,
        beat: n.beat + 0.04,
        durBeats: n.dur * 0.9,
        velocity: n.vel * (vel - 0.22),
      });
    }
    if (i % 2 === 1) {
      cloneBarNotes(tboneT, 38 + (i % 4), bar, 0.4);
      cloneBarNotes(tboneB, 38 + (i % 4), bar, 0.38);
    }
  }
}

function composeSectionG(midi) {
  const tenor2 = trackByName(midi, 'Tenor Sax 2');
  const tenor1 = trackByName(midi, 'Tenor Sax 1');
  const alto = trackByName(midi, 'Alto Sax 1');
  const trumpet = trackByName(midi, 'Trumpet 1');
  const dBass = trackByName(midi, 'Double Bass');
  const bass = trackByName(midi, 'Bass');
  const piano = trackByName(midi, 'Piano');
  const rhodes = trackByName(midi, 'Rhodes Keys');
  const drums = trackByName(midi, 'Drums - Studio Drummer');
  const bari = trackByName(midi, 'Sax BARITONE');

  const chords = ['Fmaj7', 'Ebmaj7', 'Dbmaj7', 'Bmaj7', 'Bbm9', 'Abmaj7', 'Gbmaj7', 'Emaj7'];
  const aCycle = [5, 6, 7, 8, 9, 10, 11, 12];

  for (let i = 0; i < 8; i++) {
    const bar = 79 + i;
    const vel = 0.78 + i * 0.02;
    cloneBarNotes(dBass, aCycle[i], bar, 1);
    cloneBarNotes(bass, aCycle[i], bar, 0.88);
    addPianoShell(piano, chords[i], bar, 0.5);
    addRhodesPad(rhodes, chords[i], bar, 0.34);
    addDrumBar(drums, bar, 'out', 0.38);

    const srcBar = A_MELODY_BARS[i];
    cloneBarNotes(tenor2, srcBar, bar, vel);
    const aNotes = notesInBar(tenor2, srcBar);
    for (const n of aNotes) {
      addNote(alto, { midi: n.midi + 7, bar, beat: n.beat, durBeats: n.dur, velocity: n.vel * (vel - 0.2) });
      addNote(trumpet, {
        midi: n.midi + 12,
        bar,
        beat: n.beat + 0.03,
        durBeats: n.dur * 0.92,
        velocity: n.vel * (vel - 0.25),
      });
      addNote(tenor1, {
        midi: n.midi - 5,
        bar,
        beat: n.beat,
        durBeats: n.dur,
        velocity: n.vel * (vel - 0.28),
      });
    }
    if (i >= 4) cloneBarNotes(bari, 22, bar, 0.42);
  }
}

function composeSectionH(midi) {
  const tenor2 = trackByName(midi, 'Tenor Sax 2');
  const alto = trackByName(midi, 'Alto Sax 1');
  const trumpet = trackByName(midi, 'Trumpet 1');
  const dBass = trackByName(midi, 'Double Bass');
  const bass = trackByName(midi, 'Bass');
  const piano = trackByName(midi, 'Piano');
  const rhodes = trackByName(midi, 'Rhodes Keys');
  const drums = trackByName(midi, 'Drums - Studio Drummer');
  const tboneT = trackByName(midi, 'Trombone Tenor');

  const chords = ['Dbmaj7', 'Bb7', 'Fmaj7', 'Fmaj7', 'Dbmaj7', 'Bb7', 'Emaj7', 'Emaj7'];
  const bassBars = [29, 30, 5, 5, 29, 30, 17, 17];

  for (let i = 0; i < 8; i++) {
    const bar = 87 + i;
    const fade = 1 - i * 0.1;
    cloneBarNotes(dBass, bassBars[i], bar, fade * 0.95);
    if (i < 6) cloneBarNotes(bass, bassBars[i], bar, fade * 0.75);
    addPianoShell(piano, chords[i], bar, 0.32 * fade);
    addRhodesPad(rhodes, chords[i], bar, 0.18 * fade);
    addDrumBar(drums, bar, i < 6 ? 'light' : 'coda', i < 6 ? 0.22 : 0.08);

    if (i < 4) {
      const frag = fragmentMelody(notesInBar(tenor2, 20 - (i % 3)), 0.5 - i * 0.08);
      for (const n of frag) {
        emitNote(tenor2, n, bar, n.vel * fade * 0.7);
        if (i < 2) {
          addNote(alto, {
            midi: n.midi + 4,
            bar,
            beat: n.beat + 0.5,
            durBeats: n.dur,
            velocity: n.vel * fade * 0.45,
          });
        }
      }
    } else if (i === 6) {
      for (const pc of [64, 68, 71, 75, 78, 81]) {
        addNote(rhodes, { midi: pc, bar, beat: 1, durBeats: 6, velocity: 0.38 });
        addNote(piano, { midi: pc - 12, bar, beat: 1.02, durBeats: 6, velocity: 0.42 });
        addNote(tboneT, { midi: pc - 24, bar, beat: 1.04, durBeats: 6, velocity: 0.35 });
      }
      addNote(dBass, { midi: 40, bar, beat: 1, durBeats: 7, velocity: 0.48 });
      addNote(trumpet, { midi: 75, bar, beat: 1.5, durBeats: 5, velocity: 0.32 });
    } else if (i === 7) {
      addNote(dBass, { midi: 40, bar, beat: 1, durBeats: 8, velocity: 0.4 });
      for (const pc of [64, 68, 71, 75, 78]) {
        addNote(rhodes, { midi: pc, bar, beat: 1, durBeats: 8, velocity: 0.28 });
        addNote(piano, { midi: pc - 12, bar, beat: 1, durBeats: 8, velocity: 0.3 });
      }
    }
  }
}

function main() {
  const buf = fs.readFileSync(INPUT);
  const midi = new Midi(buf);
  const cutoff = barStart(FIRST_NEW_BAR);

  for (const track of midi.tracks) {
    track.notes = track.notes.filter((n) => n.ticks < cutoff);
  }

  composeSectionE(midi);
  composeSectionF(midi);
  composeSectionG(midi);
  composeSectionH(midi);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, Buffer.from(midi.toArray()));
}

main();
