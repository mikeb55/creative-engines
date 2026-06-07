/**
 * V80j IMP-1 + IMP-2 - MusicXML to MosaicImportTimeline.
 */

import { importMusicXmlDeep } from '../musicXmlDeepImport';
import type {
  ImportFieldOrigin,
  ImportHarmonyBar,
  ImportMelodyNote,
  MosaicImportTimeline,
} from './mosaicImportTimeline';
import {
  IMPORT_CANDIDATE_MIN_CONFIDENCE,
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
} from './mosaicImportTimeline';
import {
  beatsPerBarFromTimeSig,
  quantizeDurationBeats,
  snapToEighthGrid,
} from './importQuantize';

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const FIFTHS_TO_TONIC = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F'] as const;

export interface MusicXmlImportTimelineOptions {
  importMelodyPartId?: string;
  targetBars?: number;
}

interface RawXmlNote {
  bar: number;
  beat: number;
  durationBeats: number;
  midi: number;
  partId: string;
  partName: string;
  voice: string;
  staff: string;
}

function tagValue(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim();
}

function attrValue(xml: string, attr: string): string | undefined {
  return xml.match(new RegExp(`\\b${attr}="([^"]*)"`, 'i'))?.[1]?.trim();
}

function blocks(xml: string, tag: string): string[] {
  return xml.match(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi')) ?? [];
}

function partBlocks(xml: string): { id: string; xml: string }[] {
  const out: { id: string; xml: string }[] = [];
  const re = /<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push({ id: m[1]!, xml: m[2]! });
  }
  return out;
}

function parsePartList(xml: string): Map<string, string> {
  return new Map(
    blocks(xml, 'score-part').map((b) => [
      attrValue(b, 'id') ?? 'P1',
      tagValue(b, 'part-name') ?? attrValue(b, 'id') ?? 'Part',
    ])
  );
}

function pitchToMidi(step: string, octave: number, alter: number): number {
  const pc = STEP_TO_PC[step.toUpperCase()] ?? 0;
  return (octave + 1) * 12 + pc + alter;
}

function isMelodyPartName(name: string): boolean {
  return /melody|vocal|voice|lead|soprano|tenor|flute|clarinet/i.test(name);
}

function parseNotesFromPart(
  partId: string,
  partName: string,
  partXml: string,
  meterByBar: Record<number, { numerator: number; denominator: number }>,
  defaultMeter: { num: number; den: number }
): RawXmlNote[] {
  const notes: RawXmlNote[] = [];
  const measures = blocks(partXml, 'measure');
  let activeDivisions = 1;
  let activeMeter = defaultMeter;

  for (let i = 0; i < measures.length; i++) {
    const bar = i + 1;
    const m = measures[i]!;
    const time = m.match(/<time>[\s\S]*?<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>[\s\S]*?<\/time>/i);
    if (time) {
      activeMeter = { num: Number(time[1]), den: Number(time[2]) };
    }
    const meter = meterByBar[bar] ?? { numerator: activeMeter.num, denominator: activeMeter.den };
    const beatsPerBar = beatsPerBarFromTimeSig(meter.numerator, meter.denominator);

    const divM = m.match(/<divisions>(\d+)<\/divisions>/i);
    if (divM) activeDivisions = Math.max(1, Number(divM[1]));

    let cursorDiv = 0;
    let lastAttackBeat = 0;
    for (const el of m.split(/(?=<(?:note|backup|forward)\b)/i).slice(1)) {
      if (/^<backup\b/i.test(el)) {
        const d = Number(tagValue(el, 'duration') ?? 0);
        cursorDiv = Math.max(0, cursorDiv - d);
        continue;
      }
      if (/^<forward\b/i.test(el)) {
        const d = Number(tagValue(el, 'duration') ?? 0);
        cursorDiv += d;
        continue;
      }
      if (!/^<note\b/i.test(el)) continue;
      if (/<rest\b/i.test(el)) {
        cursorDiv += Number(tagValue(el, 'duration') ?? 0);
        continue;
      }
      const isChordStack = /<chord\s*\/?>/i.test(el);
      const step = tagValue(el, 'step');
      const octaveRaw = tagValue(el, 'octave');
      if (!step || !octaveRaw) {
        cursorDiv += Number(tagValue(el, 'duration') ?? 0);
        continue;
      }
      const alter = Number(tagValue(el, 'alter') ?? 0);
      const durDiv = Number(tagValue(el, 'duration') ?? activeDivisions);
      const beat = isChordStack ? lastAttackBeat : cursorDiv / activeDivisions;
      const durationBeats = durDiv / activeDivisions;
      notes.push({
        bar,
        beat,
        durationBeats,
        midi: pitchToMidi(step, Number(octaveRaw), alter),
        partId,
        partName,
        voice: tagValue(el, 'voice') ?? '1',
        staff: tagValue(el, 'staff') ?? '1',
      });
      if (!isChordStack) {
        lastAttackBeat = beat;
        cursorDiv += durDiv;
      }
      void beatsPerBar;
    }
  }
  return notes;
}

function selectMelodyPartNotes(
  allNotes: RawXmlNote[],
  partNames: Map<string, string>,
  options?: MusicXmlImportTimelineOptions
): RawXmlNote[] {
  if (allNotes.length === 0) return [];

  if (options?.importMelodyPartId) {
    const filtered = allNotes.filter((n) => n.partId === options.importMelodyPartId);
    if (filtered.length > 0) return filtered;
  }

  const byPart = new Map<string, RawXmlNote[]>();
  for (const n of allNotes) {
    const arr = byPart.get(n.partId) ?? [];
    arr.push(n);
    byPart.set(n.partId, arr);
  }

  for (const [partId, notes] of byPart.entries()) {
    const name = partNames.get(partId) ?? notes[0]?.partName ?? '';
    if (isMelodyPartName(name)) return notes;
  }

  const firstPartId = allNotes[0]!.partId;
  const staffVoice = allNotes.filter(
    (n) => n.partId === firstPartId && n.staff === '1' && n.voice === '1'
  );
  if (staffVoice.length > 0) return staffVoice;

  return allNotes.filter((n) => n.partId === firstPartId);
}

function skylineMonophonic(notes: RawXmlNote[], beatsPerBar: number): RawXmlNote[] {
  const slots = new Map<string, RawXmlNote>();
  for (const n of notes) {
    const snapped = snapToEighthGrid(n.beat);
    const key = `${n.bar}:${snapped.value}`;
    const existing = slots.get(key);
    if (!existing || n.midi > existing.midi) {
      slots.set(key, { ...n, beat: snapped.value });
    }
  }
  return [...slots.values()].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
}

function notesToMelodyLine(notes: RawXmlNote[], beatsPerBar: number): ImportMelodyNote[] {
  const mono = notes.length > 1 ? skylineMonophonic(notes, beatsPerBar) : notes;
  const out: ImportMelodyNote[] = [];
  for (const n of mono) {
    const onset = snapToEighthGrid(n.beat);
    const dur = quantizeDurationBeats(n.durationBeats);
    out.push({
      bar: n.bar,
      onsetBeat: onset.value,
      durationBeats: dur,
      midiPitch: n.midi,
      confidence: 0.92,
      fieldOrigin: 'explicit' as ImportFieldOrigin,
    });
  }
  return out;
}

function parseKeyFromXml(xml: string): MosaicImportTimeline['keyEstimate'] {
  const firstMeasure = blocks(xml, 'measure')[0] ?? xml;
  const fifthsRaw = tagValue(firstMeasure, 'fifths') ?? tagValue(xml, 'fifths');
  const modeRaw = (tagValue(firstMeasure, 'mode') ?? tagValue(xml, 'mode') ?? 'major').toLowerCase();
  const fifths = fifthsRaw ? Number(fifthsRaw) : 0;
  const idx = ((((fifths % 12) + 12) % 12) + 12) % 12;
  const tonic = FIFTHS_TO_TONIC[idx] ?? 'C';
  const mode = modeRaw === 'minor' ? 'minor' : modeRaw === 'major' ? 'major' : 'unknown';
  return {
    tonic,
    mode,
    confidence: fifthsRaw ? 0.9 : 0.4,
    fieldOrigin: fifthsRaw ? 'explicit' : 'inferred',
  };
}

function buildHarmonyByBar(
  chordsByBar: string[],
  totalBars: number
): ImportHarmonyBar[] {
  const out: ImportHarmonyBar[] = [];
  let carry = '';
  for (let bar = 1; bar <= totalBars; bar++) {
    const raw = chordsByBar[bar - 1]?.trim() ?? '';
    let symbol = raw;
    let origin: ImportFieldOrigin = 'explicit';
    let confidence = IMPORT_EXPLICIT_HARMONY_CONFIDENCE;

    if (symbol) {
      carry = symbol;
    } else if (carry) {
      symbol = carry;
      origin = 'carried';
      confidence = 0.75;
    } else {
      symbol = 'C';
      origin = 'defaulted';
      confidence = 0.3;
    }

    if (confidence >= IMPORT_CANDIDATE_MIN_CONFIDENCE) {
      out.push({ bar, chordSymbol: symbol, confidence, fieldOrigin: origin });
    }
  }
  return out;
}

export function musicXmlToImportTimeline(
  xml: string,
  options?: MusicXmlImportTimelineOptions
): MosaicImportTimeline {
  const diagnostics: string[] = [];
  const trimmed = xml.trim();
  if (!/<score-partwise\b/i.test(trimmed)) {
    throw new Error('musicXmlToImportTimeline: score-partwise MusicXML only.');
  }

  const deep = importMusicXmlDeep(trimmed);
  diagnostics.push(...deep.warnings);

  const importedBars = Math.max(1, deep.chordsByBar.length, Object.keys(deep.meterByBar).length);
  const totalBars =
    typeof options?.targetBars === 'number' && options.targetBars >= 1
      ? Math.floor(options.targetBars)
      : importedBars;

  const firstMeter = deep.meterByBar[1] ?? { numerator: 4, denominator: 4 };
  const timeSig = { num: firstMeter.numerator, den: firstMeter.denominator };
  const beatsPerBar = beatsPerBarFromTimeSig(timeSig.num, timeSig.den);

  const partNames = parsePartList(trimmed);
  const allNotes: RawXmlNote[] = [];
  for (const p of partBlocks(trimmed)) {
    allNotes.push(
      ...parseNotesFromPart(p.id, partNames.get(p.id) ?? p.id, p.xml, deep.meterByBar, {
        num: timeSig.num,
        den: timeSig.den,
      })
    );
  }

  const melodySource = selectMelodyPartNotes(allNotes, partNames, options);
  const melodyLine = notesToMelodyLine(
    melodySource.filter((n) => n.bar >= 1 && n.bar <= totalBars),
    beatsPerBar
  );

  const harmonyByBar = buildHarmonyByBar(deep.chordsByBar, totalBars);

  return {
    schemaVersion: MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
    sourceFormat: 'musicxml',
    bars: totalBars,
    timeSig,
    keyEstimate: parseKeyFromXml(trimmed),
    harmonyByBar,
    melodyLine,
    parseDiagnostics: diagnostics.length ? diagnostics : undefined,
  };
}
