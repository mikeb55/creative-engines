/// <reference lib="dom" />

import type { PlaybackNote, PlaybackSequence } from './playbackTypes';

function firstChildText(parent: Element | null, localName: string): string | undefined {
  if (!parent) return undefined;
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i]!;
    if (c.localName === localName) return c.textContent?.trim();
  }
  return undefined;
}

function parseIntMaybe(s: string | undefined): number | undefined {
  if (s === undefined || s === '') return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function beatsPerBarFromTimeSig(timeSig: string): number {
  const t = timeSig.trim();
  const slash = /^(\d+)\s*\/\s*(\d+)/.exec(t);
  if (slash) return Math.max(1, parseInt(slash[1]!, 10));
  const lead = /^(\d+)/.exec(t);
  if (lead) return Math.max(1, parseInt(lead[1]!, 10));
  return 4;
}

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchElementToMidi(pitchEl: Element): number | null {
  const stepRaw = firstChildText(pitchEl, 'step');
  const octaveRaw = firstChildText(pitchEl, 'octave');
  if (!stepRaw || octaveRaw === undefined) return null;
  const step = stepRaw[0]!.toUpperCase();
  const base = STEP_TO_PC[step];
  if (base === undefined) return null;
  const alterVal = firstChildText(pitchEl, 'alter');
  const alter =
    alterVal !== undefined && alterVal !== '' ? parseFloat(alterVal) : 0;
  const octave = parseInt(octaveRaw, 10);
  if (!Number.isFinite(octave)) return null;
  const pc = ((base + alter) % 12 + 12) % 12;
  return (octave + 1) * 12 + pc;
}

function parseAttributes(attributesEl: Element, state: {
  divisions: number;
  beatsPerBar: number;
  beatType: number;
}): void {
  const divs = parseIntMaybe(firstChildText(attributesEl, 'divisions'));
  if (divs !== undefined && divs > 0) state.divisions = divs;

  const timeEl = Array.from(attributesEl.children).find((c) => c.localName === 'time');
  if (timeEl) {
    const beatsT = firstChildText(timeEl, 'beats');
    const beats = beatsT !== undefined ? parseInt(beatsT, 10) : NaN;
    const beatTypeT = firstChildText(timeEl, 'beat-type');
    const beatType = beatTypeT !== undefined ? parseInt(beatTypeT, 10) : NaN;
    if (Number.isFinite(beats) && beats > 0) state.beatsPerBar = beats;
    if (Number.isFinite(beatType) && beatType > 0) state.beatType = beatType;
  }
}

function allPartElements(doc: Document): Element[] {
  const root = doc.documentElement;
  if (!root) return [];
  return Array.from(root.children).filter((c) => c.localName === 'part');
}

function measureChildrenSorted(partEl: Element): Element[] {
  const measures = Array.from(partEl.children).filter((c) => c.localName === 'measure');
  return measures.sort((a, b) => {
    const na = parseInt(a.getAttribute('number') ?? '0', 10);
    const nb = parseInt(b.getAttribute('number') ?? '0', 10);
    return na - nb;
  });
}

/**
 * MusicXML `<duration>` is in **divisions** per quarter (score-level). Part 1 usually carries
 * `<divisions>` in measure 1; other parts often omit it and inherit. Without this seed, parts 2+
 * default to `divisions: 1` and every timestamp is wrong → notes scheduled far off → silence.
 */
function inferScoreMeterSeed(firstPartEl: Element | null, timeSig: string): {
  divisions: number;
  beatsPerBar: number;
  beatType: number;
} {
  const seed = {
    divisions: 1,
    beatsPerBar: beatsPerBarFromTimeSig(timeSig),
    beatType: 4,
  };
  if (!firstPartEl) return seed;
  let measureIdx = 0;
  for (const measureEl of measureChildrenSorted(firstPartEl)) {
    measureIdx += 1;
    if (measureIdx > 12) break;
    for (let i = 0; i < measureEl.children.length; i++) {
      const child = measureEl.children[i]!;
      if (child.localName === 'attributes') {
        parseAttributes(child, seed);
      }
    }
  }
  return seed;
}

function collectNotesFromPart(
  partEl: Element,
  timeSig: string,
  meterSeed: { divisions: number; beatsPerBar: number; beatType: number }
): {
  notes: PlaybackNote[];
  maxBar: number;
  beatsPerBar: number;
  beatType: number;
} {
  const state = {
    divisions: meterSeed.divisions,
    beatsPerBar: meterSeed.beatsPerBar,
    beatType: meterSeed.beatType,
  };

  const notes: PlaybackNote[] = [];
  let maxBar = 0;

  const measures = measureChildrenSorted(partEl);
  for (const measureEl of measures) {
    const barNumRaw = measureEl.getAttribute('number');
    const barIndex = Math.max(1, parseInt(barNumRaw ?? '1', 10) || 1);
    maxBar = Math.max(maxBar, barIndex);

    let cursorDiv = 0;
    let lastPrimaryDur = 0;

    for (let i = 0; i < measureEl.children.length; i++) {
      const child = measureEl.children[i]!;
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

      if (!Number.isFinite(durationDivs) || durationDivs <= 0) {
        continue;
      }

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
      const durationBeats = durationDivs / state.divisions;

      notes.push({
        pitch: midi,
        startBeat,
        duration: durationBeats,
        barIndex,
      });

      if (!hasChord) {
        cursorDiv += durationDivs;
        lastPrimaryDur = durationDivs;
      } else {
        lastPrimaryDur = durationDivs;
      }
    }
  }

  return { notes, maxBar, beatsPerBar: state.beatsPerBar, beatType: state.beatType };
}

/**
 * Parse MusicXML (browser {@link DOMParser}) into a flat note list + meter context.
 */
export function parseXmlToPlaybackSequence(
  xml: string,
  bpm: number,
  timeSig: string
): PlaybackSequence {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parserErr = doc.getElementsByTagName('parsererror');
  if (parserErr.length > 0) {
    return {
      notes: [],
      bpm,
      beatsPerBar: beatsPerBarFromTimeSig(timeSig),
      totalBars: 0,
    };
  }

  const parts = allPartElements(doc);
  if (parts.length === 0) {
    return {
      notes: [],
      bpm,
      beatsPerBar: beatsPerBarFromTimeSig(timeSig),
      totalBars: 0,
    };
  }

  const meterSeed = inferScoreMeterSeed(parts[0] ?? null, timeSig);

  const flat: PlaybackNote[] = [];
  let maxBar = 0;
  let beatsPerBarOut = meterSeed.beatsPerBar;
  let beatTypeOut = meterSeed.beatType;

  for (let pi = 0; pi < parts.length; pi++) {
    const partEl = parts[pi]!;
    const { notes, maxBar: mb, beatsPerBar, beatType } = collectNotesFromPart(partEl, timeSig, meterSeed);
    flat.push(...notes);
    maxBar = Math.max(maxBar, mb);
    if (pi === 0) {
      beatsPerBarOut = beatsPerBar;
      beatTypeOut = beatType;
    }
  }

  const seen = new Set<string>();
  const deduped: PlaybackNote[] = [];
  for (const n of flat) {
    const key = `${n.pitch}-${n.startBeat}-${n.barIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(n);
  }

  deduped.sort((a, b) => {
    if (a.barIndex !== b.barIndex) return a.barIndex - b.barIndex;
    if (a.startBeat !== b.startBeat) return a.startBeat - b.startBeat;
    return a.pitch - b.pitch;
  });

  return {
    notes: deduped,
    bpm,
    beatsPerBar: beatsPerBarOut,
    totalBars: maxBar,
    barQuarters: (beatsPerBarOut * 4) / beatTypeOut,
  };
}
