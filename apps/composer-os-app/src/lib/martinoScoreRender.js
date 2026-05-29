/**
 * Parse Martino MusicXML and render notation + TAB with VexFlow 5.
 */

import {
  Renderer,
  Stave,
  StaveNote,
  TabStave,
  TabNote,
  Voice,
  Formatter,
  Beam,
} from 'vexflow';

const MEASURES_PER_SYSTEM = 4;
const STAVE_WIDTH = 220;
const STAVE_HEIGHT = 130;
const TAB_OFFSET = 85;
const MARGIN_X = 12;
const MARGIN_Y = 16;

/** @type {number[]} Open MIDI per string 1 (high E) → 6 (low E). */
const STANDARD_OPEN_MIDI = [64, 59, 55, 50, 45, 40];

function firstChildText(parent, localName) {
  if (!parent) return undefined;
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i];
    if (c.localName === localName) return c.textContent?.trim();
  }
  return undefined;
}

function pitchToVexKey(pitchEl) {
  const step = firstChildText(pitchEl, 'step')?.toLowerCase();
  const octave = firstChildText(pitchEl, 'octave');
  if (!step || octave === undefined) return null;
  const alterRaw = firstChildText(pitchEl, 'alter');
  let accidental = '';
  if (alterRaw !== undefined && alterRaw !== '') {
    const alter = parseFloat(alterRaw);
    if (alter > 0) accidental = '#';
    else if (alter < 0) accidental = 'b';
  }
  return `${step}${accidental}/${octave}`;
}

function pitchToMidi(pitchEl) {
  const stepMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const step = firstChildText(pitchEl, 'step')?.[0]?.toUpperCase();
  const octaveRaw = firstChildText(pitchEl, 'octave');
  if (!step || octaveRaw === undefined) return null;
  const base = stepMap[step];
  if (base === undefined) return null;
  const alterRaw = firstChildText(pitchEl, 'alter');
  const alter = alterRaw !== undefined && alterRaw !== '' ? parseFloat(alterRaw) : 0;
  const pc = ((base + alter) % 12 + 12) % 12;
  const octave = parseInt(octaveRaw, 10);
  if (!Number.isFinite(octave)) return null;
  return (octave + 1) * 12 + pc;
}

function durationToVex(durationDivs, divisions) {
  const quarters = durationDivs / divisions;
  if (quarters <= 0.26) return '16';
  if (quarters <= 0.51) return '8';
  if (quarters <= 0.76) return '8d';
  if (quarters <= 1.01) return 'q';
  if (quarters <= 1.51) return 'qd';
  if (quarters <= 2.01) return 'h';
  if (quarters <= 3.01) return 'hd';
  return 'w';
}

function midiToTabPosition(midi) {
  let best = { str: 3, fret: 5 };
  let bestFret = 999;
  for (let s = 0; s < STANDARD_OPEN_MIDI.length; s++) {
    const fret = midi - STANDARD_OPEN_MIDI[s];
    if (fret >= 0 && fret <= 22 && fret < bestFret) {
      bestFret = fret;
      best = { str: s + 1, fret };
    }
  }
  return best;
}

function parseAttributes(attributesEl, state) {
  const divs = parseInt(firstChildText(attributesEl, 'divisions') ?? '', 10);
  if (Number.isFinite(divs) && divs > 0) state.divisions = divs;
  const timeEl = Array.from(attributesEl.children).find((c) => c.localName === 'time');
  if (timeEl) {
    const beats = parseInt(firstChildText(timeEl, 'beats') ?? '4', 10);
    const beatType = parseInt(firstChildText(timeEl, 'beat-type') ?? '4', 10);
    if (Number.isFinite(beats) && beats > 0) state.beats = beats;
    if (Number.isFinite(beatType) && beatType > 0) state.beatValue = beatType;
  }
}

/**
 * @param {string} xmlString
 * @returns {{ measures: object[], beats: number, beatValue: number } | null}
 */
export function parseMartinoMusicXml(xmlString) {
  if (!xmlString?.trim()) return null;
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return null;
  const part = Array.from(doc.documentElement.children).find((c) => c.localName === 'part');
  if (!part) return null;

  const state = { divisions: 2, beats: 4, beatValue: 4 };
  const measures = [];

  for (const measureEl of Array.from(part.children).filter((c) => c.localName === 'measure')) {
    const barNum = parseInt(measureEl.getAttribute('number') ?? String(measures.length + 1), 10);
    const notes = [];

    for (const child of measureEl.children) {
      if (child.localName === 'attributes') {
        parseAttributes(child, state);
        continue;
      }
      if (child.localName !== 'note') continue;

      const isRest =
        Array.from(child.children).some((c) => c.localName === 'rest') ||
        child.getElementsByTagName('rest').length > 0;
      const hasChord = Array.from(child.children).some((c) => c.localName === 'chord');
      const durRaw = firstChildText(child, 'duration');
      const durationDivs = parseInt(durRaw ?? '', 10);
      if (!Number.isFinite(durationDivs) || durationDivs <= 0) continue;

      const duration = durationToVex(durationDivs, state.divisions);

      if (isRest) {
        notes.push({ kind: 'rest', duration, hasChord });
        continue;
      }

      const pitchEl = Array.from(child.children).find((c) => c.localName === 'pitch');
      if (!pitchEl) continue;
      const key = pitchToVexKey(pitchEl);
      const midi = pitchToMidi(pitchEl);
      if (!key || midi === null) continue;
      notes.push({ kind: 'pitch', key, midi, duration, hasChord });
    }

    measures.push({
      number: Number.isFinite(barNum) ? barNum : measures.length + 1,
      notes,
      beats: state.beats,
      beatValue: state.beatValue,
    });
  }

  if (!measures.length) return null;
  return { measures, beats: state.beats, beatValue: state.beatValue };
}

function buildTickablesForMeasure(measureNotes, { tab = false } = {}) {
  const tickables = [];
  let beamGroup = [];

  const flushBeam = () => {
    if (beamGroup.length > 1) {
      tickables.push(...beamGroup);
      tickables._beams = tickables._beams || [];
      tickables._beams.push([...beamGroup]);
    } else if (beamGroup.length === 1) {
      tickables.push(beamGroup[0]);
    }
    beamGroup = [];
  };

  for (const n of measureNotes) {
    let tickable;
    if (n.kind === 'rest') {
      if (tab) continue;
      tickable = new StaveNote({ keys: ['b/4'], duration: `${n.duration}r` });
    } else if (tab) {
      const pos = midiToTabPosition(n.midi);
      tickable = new TabNote({ positions: [pos], duration: n.duration });
    } else {
      tickable = new StaveNote({ keys: [n.key], duration: n.duration });
    }

    if (n.hasChord && beamGroup.length) {
      beamGroup.push(tickable);
    } else {
      flushBeam();
      if (n.duration === '8' || n.duration === '16') {
        beamGroup.push(tickable);
      } else {
        tickables.push(tickable);
      }
    }
  }
  flushBeam();
  return tickables;
}

/**
 * @param {HTMLElement} container
 * @param {string} xmlString
 * @param {{ showTab?: boolean, width?: number }} [opts]
 */
export function renderMartinoScore(container, xmlString, opts = {}) {
  const showTab = opts.showTab !== false;
  const panelWidth = opts.width ?? container.clientWidth ?? 560;
  const parsed = parseMartinoMusicXml(xmlString);
  container.innerHTML = '';
  if (!parsed) return { ok: false, error: 'parse_failed' };

  const { measures, beats, beatValue } = parsed;
  const systems = Math.ceil(measures.length / MEASURES_PER_SYSTEM);
  const height =
    MARGIN_Y * 2 + systems * (STAVE_HEIGHT + (showTab ? TAB_OFFSET + 20 : 0)) + 8;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(Math.max(panelWidth, 320), height);
  const context = renderer.getContext();
  context.setFillStyle('#111');
  context.setStrokeStyle('#111');

  const timeSig = `${beats}/${beatValue}`;

  for (let si = 0; si < systems; si++) {
    const slice = measures.slice(si * MEASURES_PER_SYSTEM, (si + 1) * MEASURES_PER_SYSTEM);
    const yBase = MARGIN_Y + si * (STAVE_HEIGHT + (showTab ? TAB_OFFSET + 20 : 0));

    for (let mi = 0; mi < slice.length; mi++) {
      const measure = slice[mi];
      const x = MARGIN_X + mi * STAVE_WIDTH;
      const stave = new Stave(x, yBase, STAVE_WIDTH);
      if (si === 0 && mi === 0) {
        stave.addClef('treble').addTimeSignature(timeSig);
      }
      stave.setContext(context).draw();

      const staveNotes = buildTickablesForMeasure(measure.notes, { tab: false });
      if (!staveNotes.length) continue;

      const voice = new Voice({ numBeats: beats, beatValue });
      voice.setStrict(false);
      voice.addTickables(staveNotes);
      new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 24);
      voice.draw(context, stave);

      if (staveNotes._beams) {
        for (const group of staveNotes._beams) {
          const beam = new Beam(group);
          beam.setContext(context).draw();
        }
      }

      if (showTab) {
        const tabStave = new TabStave(x, yBase + TAB_OFFSET, STAVE_WIDTH);
        if (si === 0 && mi === 0) {
          tabStave.addTabGlyph();
        }
        tabStave.setContext(context).draw();

        const tabNotes = buildTickablesForMeasure(measure.notes, { tab: true });
        if (tabNotes.length) {
          const tabVoice = new Voice({ numBeats: beats, beatValue });
          tabVoice.setStrict(false);
          tabVoice.addTickables(tabNotes);
          new Formatter().joinVoices([tabVoice]).format([tabVoice], STAVE_WIDTH - 24);
          tabVoice.draw(context, tabStave);

          if (tabNotes._beams) {
            for (const group of tabNotes._beams) {
              const beam = new Beam(group);
              beam.setContext(context).draw();
            }
          }
        }
      }
    }
  }

  return { ok: true, measureCount: measures.length };
}
