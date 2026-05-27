/**
 * MusicXML → grid notes (per-part voice labels for piano-roll view).
 */

const STEP_TO_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function firstChildText(parent, localName) {
  if (!parent) return undefined;
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i];
    if (c.localName === localName) return c.textContent?.trim();
  }
  return undefined;
}

function parseIntMaybe(s) {
  if (s === undefined || s === '') return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function beatsPerBarFromTimeSig(timeSig) {
  const slash = /^(\d+)\s*\/\s*(\d+)/.exec(String(timeSig).trim());
  if (slash) return Math.max(1, parseInt(slash[1], 10));
  const lead = /^(\d+)/.exec(String(timeSig).trim());
  if (lead) return Math.max(1, parseInt(lead[1], 10));
  return 4;
}

function pitchElementToMidi(pitchEl) {
  const stepRaw = firstChildText(pitchEl, 'step');
  const octaveRaw = firstChildText(pitchEl, 'octave');
  if (!stepRaw || octaveRaw === undefined) return null;
  const step = stepRaw[0].toUpperCase();
  const base = STEP_TO_PC[step];
  if (base === undefined) return null;
  const alterVal = firstChildText(pitchEl, 'alter');
  const alter = alterVal !== undefined && alterVal !== '' ? parseFloat(alterVal) : 0;
  const octave = parseInt(octaveRaw, 10);
  if (!Number.isFinite(octave)) return null;
  const pc = ((base + alter) % 12 + 12) % 12;
  return (octave + 1) * 12 + pc;
}

function parseAttributes(attributesEl, state) {
  const divs = parseIntMaybe(firstChildText(attributesEl, 'divisions'));
  if (divs !== undefined && divs > 0) state.divisions = divs;
  for (let i = 0; i < attributesEl.children.length; i++) {
    const c = attributesEl.children[i];
    if (c.localName === 'time') {
      const beats = parseIntMaybe(firstChildText(c, 'beats'));
      if (beats !== undefined && beats > 0) state.beatsPerBar = beats;
    }
  }
}

function partNameMap(doc) {
  const map = new Map();
  const root = doc.documentElement;
  if (!root) return map;
  for (let i = 0; i < root.children.length; i++) {
    const c = root.children[i];
    if (c.localName !== 'part-list') continue;
    for (let j = 0; j < c.children.length; j++) {
      const sp = c.children[j];
      if (sp.localName !== 'score-part') continue;
      const id = sp.getAttribute('id');
      if (!id) continue;
      let name = id;
      for (let k = 0; k < sp.children.length; k++) {
        const ch = sp.children[k];
        if (ch.localName === 'part-name') {
          const t = ch.textContent?.trim();
          if (t) name = t;
        }
      }
      map.set(id, name);
    }
  }
  return map;
}

function collectPartNotes(partEl, voiceId, voiceName, meterSeed) {
  const state = { divisions: meterSeed.divisions, beatsPerBar: meterSeed.beatsPerBar };
  const notes = [];
  let maxBar = 0;
  const measures = Array.from(partEl.children)
    .filter((c) => c.localName === 'measure')
    .sort((a, b) => parseInt(a.getAttribute('number') ?? '0', 10) - parseInt(b.getAttribute('number') ?? '0', 10));

  for (const measureEl of measures) {
    const barIndex = Math.max(1, parseInt(measureEl.getAttribute('number') ?? '1', 10) || 1);
    maxBar = Math.max(maxBar, barIndex);
    let cursorDiv = 0;
    let lastPrimaryDur = 0;

    for (let i = 0; i < measureEl.children.length; i++) {
      const child = measureEl.children[i];
      const tag = child.localName;
      if (tag === 'attributes') {
        parseAttributes(child, state);
        continue;
      }
      if (tag === 'backup') {
        const d = parseIntMaybe(firstChildText(child, 'duration'));
        if (d !== undefined && d > 0) cursorDiv -= d;
        continue;
      }
      if (tag === 'forward') {
        const d = parseIntMaybe(firstChildText(child, 'duration'));
        if (d !== undefined && d > 0) cursorDiv += d;
        continue;
      }
      if (tag !== 'note') continue;

      const durRaw = firstChildText(child, 'duration');
      const durationDivs = durRaw !== undefined ? parseInt(durRaw, 10) : NaN;
      const hasChord = Array.from(child.children).some((c) => c.localName === 'chord');
      const isRest =
        Array.from(child.children).some((c) => c.localName === 'rest') ||
        child.getElementsByTagName('rest').length > 0;

      if (!Number.isFinite(durationDivs) || durationDivs <= 0) continue;
      if (isRest) {
        if (!hasChord) cursorDiv += durationDivs;
        lastPrimaryDur = 0;
        continue;
      }

      const pitchEl = Array.from(child.children).find((c) => c.localName === 'pitch');
      if (!pitchEl) {
        if (!hasChord) cursorDiv += durationDivs;
        lastPrimaryDur = hasChord ? lastPrimaryDur : durationDivs;
        continue;
      }

      const midi = pitchElementToMidi(pitchEl);
      if (midi === null || midi <= 0) {
        if (!hasChord) cursorDiv += durationDivs;
        lastPrimaryDur = hasChord ? lastPrimaryDur : durationDivs;
        continue;
      }

      const startDiv = hasChord ? cursorDiv - lastPrimaryDur : cursorDiv;
      const startBeat = startDiv / state.divisions;
      const duration = durationDivs / state.divisions;
      const absoluteBeat = (barIndex - 1) * state.beatsPerBar + startBeat;

      notes.push({
        pitch: midi,
        startBeat,
        duration,
        barIndex,
        absoluteBeat,
        voiceId,
        voiceName,
      });

      if (!hasChord) {
        cursorDiv += durationDivs;
        lastPrimaryDur = durationDivs;
      } else {
        lastPrimaryDur = durationDivs;
      }
    }
  }

  return { notes, maxBar, beatsPerBar: state.beatsPerBar };
}

/**
 * @param {string} xml
 * @param {number} bpm
 * @param {string} timeSig
 */
export function parseXmlToGridData(xml, bpm, timeSig) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { notes: [], voices: [], bpm, beatsPerBar: beatsPerBarFromTimeSig(timeSig), totalBars: 0 };
  }

  const names = partNameMap(doc);
  const parts = Array.from(doc.documentElement?.children ?? []).filter((c) => c.localName === 'part');
  if (parts.length === 0) {
    return { notes: [], voices: [], bpm, beatsPerBar: beatsPerBarFromTimeSig(timeSig), totalBars: 0 };
  }

  const meterSeed = { divisions: 1, beatsPerBar: beatsPerBarFromTimeSig(timeSig) };
  const firstPart = parts[0];
  if (firstPart) {
    const m0 = collectPartNotes(firstPart, 'P1', names.get(firstPart.getAttribute('id') ?? 'P1') ?? 'Part 1', meterSeed);
    meterSeed.beatsPerBar = m0.beatsPerBar;
    meterSeed.divisions = meterSeed.divisions || 1;
  }

  const allNotes = [];
  const voices = [];
  let maxBar = 0;
  let beatsPerBarOut = meterSeed.beatsPerBar;

  parts.forEach((partEl, idx) => {
    const partId = partEl.getAttribute('id') ?? `P${idx + 1}`;
    const voiceId = partId;
    const voiceName = names.get(partId) ?? `Part ${idx + 1}`;
    voices.push({ id: voiceId, name: voiceName });
    const { notes, maxBar: mb, beatsPerBar } = collectPartNotes(partEl, voiceId, voiceName, meterSeed);
    allNotes.push(...notes);
    maxBar = Math.max(maxBar, mb);
    if (idx === 0) beatsPerBarOut = beatsPerBar;
  });

  allNotes.sort((a, b) => a.absoluteBeat - b.absoluteBeat || a.pitch - b.pitch);

  return {
    notes: allNotes,
    voices,
    bpm,
    beatsPerBar: beatsPerBarOut,
    totalBars: maxBar,
  };
}

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** @param {number} midi */
export function midiToPitchName(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${PC_NAMES[pc]}${oct}`;
}
