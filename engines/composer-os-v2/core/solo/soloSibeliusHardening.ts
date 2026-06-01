/**
 * Pre-Sibelius MusicXML hardening for solo lead sheets.
 */

import { validateExportIntegrity } from '../export/exportHardening';
import {
  sanitizeMusicXmlHarmonyRoots,
  validateMusicXmlHarmonyRoots,
} from './soloMusicContextExport';
import { clampSoloTrebleConcertMidi, SOLO_TREBLE_MAX_MIDI, SOLO_TREBLE_MIN_MIDI } from './soloTreblePitchRange';

const STEP_SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchToMidi(step: string, alter: string | undefined, octave: number): number {
  const base = STEP_SEMI[step.toUpperCase()] ?? 0;
  const alt = alter ? parseInt(alter, 10) : 0;
  return (octave + 1) * 12 + base + alt;
}

function midiToPitch(midi: number): { step: string; alter?: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const names: [string, number][] = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1],
    ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
  ];
  const [step, alter] = names[pc]!;
  return { step, alter: alter || undefined, octave };
}

export type SoloSibeliusHardeningResult = {
  xml: string;
  pitchClamps: number;
  harmonyFixes: number;
  silenceFills: number;
  durationTrims: number;
  exportIntegrityPassed: boolean;
  exportIntegrityErrors: string[];
};

function formatPitchXml(step: string, alter: number | undefined, octave: number): string {
  const alterXml = alter != null ? `<alter>${alter}</alter>` : '';
  return `<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`;
}

function clampPitchBlock(full: string, step: string, alter: string | undefined, octaveStr: string): string {
  const octave = parseInt(octaveStr, 10);
  const midi = pitchToMidi(step, alter, octave);
  if (midi >= SOLO_TREBLE_MIN_MIDI && midi <= SOLO_TREBLE_MAX_MIDI) return full;
  const clamped = clampSoloTrebleConcertMidi(midi);
  const p = midiToPitch(clamped);
  const newPitch = formatPitchXml(p.step, p.alter, p.octave);
  if (full.includes('<pitch>')) {
    return full.replace(/<pitch>[\s\S]*?<\/pitch>/, newPitch);
  }
  return newPitch;
}

function clampPitchesInXml(xml: string): { xml: string; count: number } {
  let count = 0;
  let out = xml.replace(
    /<pitch><step>([A-G])<\/step>(?:<alter>(-?\d+)<\/alter>)?<octave>(\d+)<\/octave><\/pitch>/g,
    (full, step, alter, octaveStr) => {
      const before = pitchToMidi(step, alter, parseInt(octaveStr, 10));
      const next = clampPitchBlock(full, step, alter, octaveStr);
      if (next !== full) count += 1;
      return next;
    },
  );
  out = out.replace(
    /<note>([\s\S]*?)<\/note>/g,
    (noteBlock) => {
      if (/<rest/.test(noteBlock)) return noteBlock;
      const step = noteBlock.match(/<step>([A-G])<\/step>/)?.[1];
      const octaveStr = noteBlock.match(/<octave>(\d+)<\/octave>/)?.[1];
      if (!step || !octaveStr) return noteBlock;
      const alter = noteBlock.match(/<alter>(-?\d+)<\/alter>/)?.[1];
      const midi = pitchToMidi(step, alter, parseInt(octaveStr, 10));
      if (midi >= SOLO_TREBLE_MIN_MIDI && midi <= SOLO_TREBLE_MAX_MIDI) return noteBlock;
      count += 1;
      const p = midiToPitch(clampSoloTrebleConcertMidi(midi));
      const alterXml = p.alter != null ? `\n          <alter>${p.alter}</alter>` : '';
      return noteBlock
        .replace(/<step>[A-G]<\/step>/, `<step>${p.step}</step>`)
        .replace(/\s*<alter>-?\d+<\/alter>/, alterXml)
        .replace(/<octave>\d+<\/octave>/, `<octave>${p.octave}</octave>`);
    },
  );
  return { xml: out, count };
}

/** Insert guide-tone fill when >2 consecutive whole-bar rests (non-NC bars only). */
function fillLongSilenceRuns(xml: string): { xml: string; count: number } {
  const partMatch = xml.match(/<part id="[^"]+"[\s\S]*<\/part>/);
  if (!partMatch) return { xml, count: 0 };

  let fills = 0;
  const partBody = partMatch[0];
  const measures = [...partBody.matchAll(/<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g)];

  type Meas = { attrs: string; number: number; tailAttrs: string; body: string };
  const parsed: Meas[] = measures.map((m) => ({
    attrs: m[1] ?? '',
    number: parseInt(m[2]!, 10),
    tailAttrs: m[3] ?? '',
    body: m[4]!,
  }));

  const isWholeBarRest = (body: string): boolean => {
    const div = parseInt(body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
    const beats = parseInt(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
    const beatType = parseInt(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
    const barLen = (div * beats * 4) / beatType;
    const notes = [...body.matchAll(/<note>([\s\S]*?)<\/note>/g)].map((n) => n[1]!);
    const pitched = notes.filter((b) => !/<rest/.test(b) && /<pitch/.test(b));
    if (pitched.length > 0) return false;
    if (notes.length === 0) return true;
    return notes.every((b) => /<rest/.test(b));
  };

  const isNcBar = (body: string): boolean => {
    const h = body.match(/<harmony[\s\S]*?<\/harmony>/);
    if (!h) return false;
    return /N\.?C\.?/i.test(h[0]) || /<kind text="N\.C\."/.test(h[0]);
  };

  let runStart = -1;
  let runLen = 0;
  const fillAt: number[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const m = parsed[i]!;
    const silent = isWholeBarRest(m.body) && !isNcBar(m.body);
    if (silent) {
      if (runLen === 0) runStart = m.number;
      runLen += 1;
    } else {
      if (runLen > 2) {
        for (let b = runStart + 2; b < runStart + runLen; b++) fillAt.push(b);
      }
      runLen = 0;
    }
  }
  if (runLen > 2) {
    for (let b = runStart + 2; b < runStart + runLen; b++) fillAt.push(b);
  }

  if (fillAt.length === 0) return { xml, count: 0 };

  let newPart = partBody;
  for (const barNum of fillAt) {
    const meas = parsed.find((m) => m.number === barNum);
    if (!meas) continue;
    const div = parseInt(meas.body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
    const beats = parseInt(meas.body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
    const beatType = parseInt(meas.body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
    const barLen = Math.round((div * beats * 4) / beatType);
    const dur = Math.max(1, Math.round(barLen / 4));
    const fillNotes = [0, 1, 2].map((i) =>
      `<note><pitch><step>E</step><octave>4</octave></pitch><duration>${dur}</duration><voice>1</voice><type>quarter</type></note>`,
    ).join('\n        ');
    const bodyWithoutRests = meas.body.replace(/<note>\s*<rest[\s\S]*?<\/note>\s*/g, '');
    const newBody = bodyWithoutRests.trimEnd() + '\n        ' + fillNotes + '\n      ';
    const oldMeas = `<measure${meas.attrs}number="${meas.number}"${meas.tailAttrs}>${meas.body}</measure>`;
    const newMeas = `<measure${meas.attrs}number="${meas.number}"${meas.tailAttrs}>${newBody}</measure>`;
    newPart = newPart.replace(oldMeas, newMeas);
    fills += 1;
  }

  return { xml: xml.replace(partBody, newPart), count: fills };
}

/** Drop non-chord notes that extend past bar length (Martino divisions=2 overflow). */
function trimMeasureVoiceOverflow(xml: string): { xml: string; count: number } {
  const partMatch = xml.match(/<part id="[^"]+"[\s\S]*<\/part>/);
  if (!partMatch) return { xml, count: 0 };

  let trims = 0;
  let partBody = partMatch[0];

  partBody = partBody.replace(
    /<measure([^>]*)number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g,
    (full, a1, num, a2, body) => {
      const barLen = (() => {
        const div = parseInt(body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
        const beats = parseInt(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
        const beatType = parseInt(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
        return (div * beats * 4) / beatType;
      })();

      let pos = 0;
      const kept: string[] = [];
      const noteRe = /<note>[\s\S]*?<\/note>/g;
      let m;
      while ((m = noteRe.exec(body)) !== null) {
        const note = m[0];
        const isChord = /<chord\/>/.test(note);
        const dur = parseInt(note.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
        if (isChord) {
          kept.push(note);
          continue;
        }
        if (pos >= barLen - 0.5) {
          trims += 1;
          continue;
        }
        if (pos + dur > barLen + 0.5) {
          const trimmedDur = Math.max(1, Math.round(barLen - pos));
          const fixed = note.replace(/<duration>\d+<\/duration>/, `<duration>${trimmedDur}</duration>`);
          kept.push(fixed);
          pos = barLen;
          trims += 1;
        } else {
          kept.push(note);
          pos += dur;
        }
      }

      if (trims === 0) return full;
      const head = body.replace(/<note>[\s\S]*?<\/note>/g, '').trimEnd();
      const newBody = head + (head ? '\n      ' : '') + kept.join('\n      ') + '\n      ';
      return `<measure${a1}number="${num}"${a2}>${newBody}</measure>`;
    },
  );

  return { xml: xml.replace(partMatch[0], partBody), count: trims };
}

export function hardenSoloMusicXmlForSibelius(xml: string): SoloSibeliusHardeningResult {
  const harmonyBefore = validateMusicXmlHarmonyRoots(xml).length;
  let out = sanitizeMusicXmlHarmonyRoots(xml);
  const harmonyAfter = validateMusicXmlHarmonyRoots(out).length;

  const clamped = clampPitchesInXml(out);
  out = clamped.xml;

  const silence = fillLongSilenceRuns(out);
  out = silence.xml;

  const trimmed = trimMeasureVoiceOverflow(out);
  out = trimmed.xml;

  const integrity = validateExportIntegrity(out);
  const harmonyErrors = validateMusicXmlHarmonyRoots(out);

  return {
    xml: out,
    pitchClamps: clamped.count,
    harmonyFixes: Math.max(0, harmonyBefore - harmonyAfter),
    silenceFills: silence.count,
    durationTrims: trimmed.count,
    exportIntegrityPassed: integrity.valid && harmonyErrors.length === 0,
    exportIntegrityErrors: [...integrity.errors, ...harmonyErrors],
  };
}

export function countPitchElements(xml: string): number {
  return (xml.match(/<pitch>/g) ?? []).length;
}
