/**
 * Orbit Big Band — compare v1 vs v2 MusicXML metrics (structured JSON + text summary).
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/compareOrbitBigBandVersions.ts
 */

import fs from 'fs';
import path from 'path';
import { planOrbitBigBand28Form } from '../engines/composer-os-v2/core/big-band/bigBandFormPlanner';

const OUT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band';
const FILE_A = path.join(OUT_DIR, 'orbit_big_band_v1.musicxml');
const FILE_B = path.join(OUT_DIR, 'orbit_big_band_v2.musicxml');
const OUT_JSON = path.join(OUT_DIR, 'orbit_bb_comparison.json');
const OUT_TXT = path.join(OUT_DIR, 'orbit_bb_comparison_summary.txt');

const SAX_IDS = new Set(['bb_alto_sax', 'bb_tenor_sax']);
const BRASS_IDS = new Set(['bb_trumpets', 'bb_trombones']);
const HORN_IDS = new Set([...SAX_IDS, ...BRASS_IDS]);
const RHYTHM_IDS = new Set(['bb_piano', 'bb_rhythm_section', 'bb_drums']);
const ALL_PART_IDS = [...HORN_IDS, ...RHYTHM_IDS];

const DYNAMIC_TAGS = ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff', 'fp', 'sf', 'sfz', 'fz'];

const ARC_WINDOWS: Array<{ label: string; start: number; end: number }> = [
  { label: '1-16', start: 1, end: 16 },
  { label: '17-32', start: 17, end: 32 },
  { label: '33-48', start: 33, end: 48 },
  { label: '49-64', start: 49, end: 64 },
  { label: '65-80', start: 65, end: 80 },
  { label: '81-96', start: 81, end: 96 },
  { label: '97-112', start: 97, end: 112 },
  { label: '113-120', start: 113, end: 120 },
];

const DRUM_WINDOWS: Array<{ label: string; start: number; end: number }> = [
  { label: '1-30', start: 1, end: 30 },
  { label: '31-60', start: 31, end: 60 },
  { label: '61-90', start: 61, end: 90 },
  { label: '91-120', start: 91, end: 120 },
];

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

type PartFamily = 'saxes' | 'brass' | 'rhythm' | 'mixed' | 'none';

interface ParsedNote {
  isRest: boolean;
  isUnpitched: boolean;
  midi: number | null;
  duration: number;
  offset: number;
  type: string | null;
  hasMute: boolean;
}

interface ParsedMeasure {
  number: number;
  notes: ParsedNote[];
  noteCount: number;
  pitchedNoteCount: number;
  dynamics: string[];
  rehearsal: string | null;
  divisions: number;
}

interface ParsedPart {
  id: string;
  name: string;
  measures: Map<number, ParsedMeasure>;
}

interface ParsedScore {
  filePath: string;
  fileName: string;
  fileSizeKB: number;
  partNames: string[];
  parts: Map<string, ParsedPart>;
  totalBars: number;
  tempoMarking: number | null;
  timeSignature: string | null;
}

interface BarGrid {
  totalBars: number;
  byPart: Map<string, ParsedPart>;
  /** bar → aggregated */
  perBar: Map<
    number,
    {
      totalNotes: number;
      activeParts: Set<string>;
      hornActiveParts: Set<string>;
      dynamics: string[];
    }
  >;
}

function pitchToMidi(step: string, octave: number, alter: number): number {
  const pc = STEP_TO_PC[step.toUpperCase()] ?? 0;
  return (octave + 1) * 12 + pc + alter;
}

/** Written G5 ≈ MIDI 79 — reserved for brass peak checks. */
function isHighTrumpetMidi(midi: number): boolean {
  return midi >= 79;
}

function extractPartListNames(xml: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<score-part\s+id="([^"]+)"[^>]*>[\s\S]*?<part-name>([^<]+)<\/part-name>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.set(m[1]!, m[2]!.trim());
  }
  return out;
}

function extractDynamics(measureXml: string): string[] {
  const found: string[] = [];
  for (const tag of DYNAMIC_TAGS) {
    const re = new RegExp(`<dynamics>[\\s\\S]*?<${tag}\\s*/>[\\s\\S]*?</dynamics>`, 'i');
    if (re.test(measureXml)) found.push(tag);
    const re2 = new RegExp(`<${tag}\\s*/>`, 'i');
    if (re2.test(measureXml) && measureXml.includes('<dynamics>')) {
      if (!found.includes(tag)) found.push(tag);
    }
  }
  return found;
}

function extractRehearsal(measureXml: string): string | null {
  const rm = measureXml.match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
  return rm ? rm[1]!.trim() : null;
}

function parseNoteBlock(nb: string): ParsedNote {
  const isRest = /<rest/.test(nb);
  const isUnpitched = /<unpitched/.test(nb);
  const hasMute = /<mute>/.test(nb) || /\bcup\b/i.test(nb) || /\bstraight-mute\b/i.test(nb);
  const typeM = nb.match(/<type>([^<]+)<\/type>/i);
  const durM = nb.match(/<duration>(\d+)<\/duration>/);
  const duration = durM ? parseInt(durM[1]!, 10) : 0;
  const type = typeM ? typeM[1]!.trim() : null;

  if (isRest) {
    return { isRest: true, isUnpitched: false, midi: null, duration, offset: 0, type, hasMute: false };
  }

  if (isUnpitched) {
    return { isRest: false, isUnpitched: true, midi: null, duration, offset: 0, type, hasMute };
  }

  const sm = nb.match(/<step>([A-G])<\/step>/i);
  const om = nb.match(/<octave>(\d+)<\/octave>/);
  const am = nb.match(/<alter>(-?\d+)<\/alter>/);
  if (!sm || !om) {
    return { isRest: false, isUnpitched: true, midi: null, duration, offset: 0, type, hasMute };
  }
  const alter = am ? parseInt(am[1]!, 10) : 0;
  const midi = pitchToMidi(sm[1]!, parseInt(om[1]!, 10), alter);
  return {
    isRest: false,
    isUnpitched: false,
    midi,
    duration,
    offset: 0,
    type,
    hasMute,
  };
}

function parseMeasure(measureXml: string, fallbackNum: number, divisions: number): ParsedMeasure {
  const numM = measureXml.match(/<measure[^>]*number="(\d+)"/);
  const number = numM ? parseInt(numM[1]!, 10) : fallbackNum;

  const divM = measureXml.match(/<divisions>(\d+)<\/divisions>/);
  if (divM) divisions = parseInt(divM[1]!, 10);

  const notes: ParsedNote[] = [];
  let offset = 0;
  const noteBlocks = measureXml.match(/<note[\s\S]*?<\/note>/g) ?? [];
  for (const nb of noteBlocks) {
    const isChord = /<chord\s*\/>/.test(nb);
    const note = parseNoteBlock(nb);
    if (!isChord) {
      note.offset = offset;
    } else if (notes.length > 0) {
      note.offset = notes[notes.length - 1]!.offset;
    }
    notes.push(note);
    if (!isChord) offset += note.duration;
  }

  const pitchedNoteCount = notes.filter((n) => !n.isRest && (n.midi !== null || n.isUnpitched)).length;

  return {
    number,
    notes,
    noteCount: notes.filter((n) => !n.isRest).length,
    pitchedNoteCount,
    dynamics: extractDynamics(measureXml),
    rehearsal: extractRehearsal(measureXml),
    divisions,
  };
}

function parseMusicXmlFile(filePath: string): ParsedScore {
  const xml = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const fileSizeKB = Math.round((stat.size / 1024) * 10) / 10;
  const partNamesMap = extractPartListNames(xml);

  let tempoMarking: number | null = null;
  const tempoM = xml.match(/<sound\s+tempo="(\d+(?:\.\d+)?)"/);
  if (tempoM) tempoMarking = Math.round(parseFloat(tempoM[1]!));
  const metM = xml.match(/<per-minute>(\d+(?:\.\d+)?)<\/per-minute>/);
  if (metM && tempoMarking === null) tempoMarking = Math.round(parseFloat(metM[1]!));

  let timeSignature: string | null = null;
  const timeM = xml.match(/<time>\s*<beats>(\d+)<\/beats>\s*<beat-type>(\d+)<\/beat-type>\s*<\/time>/);
  if (timeM) timeSignature = `${timeM[1]}/${timeM[2]}`;

  const parts = new Map<string, ParsedPart>();
  const partRe = /<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g;
  let pm: RegExpExecArray | null;
  let maxBar = 0;

  while ((pm = partRe.exec(xml)) !== null) {
    const id = pm[1]!;
    const inner = pm[2]!;
    const measures = new Map<number, ParsedMeasure>();
    const measureBlocks = inner.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
    let divisions = 480;
    let idx = 0;
    for (const mb of measureBlocks) {
      const parsed = parseMeasure(mb, idx + 1, divisions);
      divisions = parsed.divisions;
      measures.set(parsed.number, parsed);
      maxBar = Math.max(maxBar, parsed.number);
      idx++;
    }
    parts.set(id, {
      id,
      name: partNamesMap.get(id) ?? id,
      measures,
    });
  }

  const partNames = [...partNamesMap.values()];

  return {
    filePath,
    fileName: path.basename(filePath),
    fileSizeKB,
    partNames,
    parts,
    totalBars: maxBar,
    tempoMarking,
    timeSignature,
  };
}

function buildBarGrid(score: ParsedScore): BarGrid {
  const perBar = new Map<
    number,
    {
      totalNotes: number;
      activeParts: Set<string>;
      hornActiveParts: Set<string>;
      dynamics: string[];
    }
  >();

  for (let bar = 1; bar <= score.totalBars; bar++) {
    perBar.set(bar, {
      totalNotes: 0,
      activeParts: new Set(),
      hornActiveParts: new Set(),
      dynamics: [],
    });
  }

  for (const [partId, part] of score.parts) {
    for (const [barNum, measure] of part.measures) {
      const row = perBar.get(barNum);
      if (!row) continue;
      row.totalNotes += measure.noteCount;
      if (measure.noteCount > 0) row.activeParts.add(partId);
      if (HORN_IDS.has(partId) && measure.pitchedNoteCount > 0) {
        row.hornActiveParts.add(partId);
      }
      for (const d of measure.dynamics) {
        if (!row.dynamics.includes(d)) row.dynamics.push(d);
      }
    }
  }

  return { totalBars: score.totalBars, byPart: score.parts, perBar };
}

function partFamilyForBar(grid: BarGrid, bar: number): PartFamily {
  const row = grid.perBar.get(bar);
  if (!row || row.activeParts.size === 0) return 'none';
  let sax = 0;
  let brass = 0;
  let rhythm = 0;
  for (const pid of row.activeParts) {
    let notes = 0;
    const part = grid.byPart.get(pid);
    const m = part?.measures.get(bar);
    notes = m?.noteCount ?? 0;
    if (SAX_IDS.has(pid)) sax += notes;
    else if (BRASS_IDS.has(pid)) brass += notes;
    else if (RHYTHM_IDS.has(pid)) rhythm += notes;
  }
  const hornNotes = sax + brass;
  if (hornNotes === 0 && rhythm > 0) return 'rhythm';
  if (sax > 0 && brass === 0) return 'saxes';
  if (brass > 0 && sax === 0) return 'brass';
  if (sax > 0 && brass > 0) return 'mixed';
  if (rhythm > 0) return 'rhythm';
  return 'none';
}

function noteOnsets(notes: ParsedNote[]): number[] {
  return notes.filter((n) => !n.isRest).map((n) => n.offset);
}

function extractMetrics(score: ParsedScore) {
  const grid = buildBarGrid(score);

  const global = {
    totalBars: score.totalBars,
    partCount: score.partNames.length,
    partNames: score.partNames,
    fileSizeKB: score.fileSizeKB,
    tempoMarking: score.tempoMarking,
    timeSignature: score.timeSignature,
  };

  const dynamicArc = ARC_WINDOWS.map((w) => {
    let totalNotes = 0;
    let barCount = 0;
    const activePartsSet = new Set<string>();
    const dynamics = new Set<string>();
    let restBarCount = 0;

    for (let b = w.start; b <= w.end && b <= score.totalBars; b++) {
      barCount++;
      const row = grid.perBar.get(b)!;
      totalNotes += row.totalNotes;
      for (const p of row.activeParts) activePartsSet.add(p);
      for (const d of row.dynamics) dynamics.add(d);
      if (row.activeParts.size === 0) restBarCount++;
    }

    return {
      window: w.label,
      startBar: w.start,
      endBar: Math.min(w.end, score.totalBars),
      averageNoteDensity: barCount > 0 ? Math.round((totalNotes / barCount) * 100) / 100 : 0,
      activePartCount: activePartsSet.size,
      dynamicMarkings: [...dynamics].sort(),
      restBarCount,
    };
  });

  const rehearsalPlan = planOrbitBigBand28Form().rehearsalMarkOverride ?? {};
  const sectionalContrast = Object.entries(rehearsalPlan).map(([barStr, letter]) => {
    const bar = parseInt(barStr, 10);
    const row = grid.perBar.get(bar);
    return {
      letter,
      startBar: bar,
      activePartCount: row?.activeParts.size ?? 0,
      firstDynamicMarking: row?.dynamics[0] ?? null,
      dominantSection: partFamilyForBar(grid, bar),
    };
  });

  const rhythmOnlyBars: number[] = [];
  const allRestBars: number[] = [];
  for (let b = 1; b <= score.totalBars; b++) {
    const row = grid.perBar.get(b)!;
    const hornsActive = [...HORN_IDS].some((id) => row.activeParts.has(id));
    if (!hornsActive && row.activeParts.size > 0) rhythmOnlyBars.push(b);
    if (row.activeParts.size === 0) allRestBars.push(b);
  }

  const dropoutEvents = {
    rhythmOnlyBarCount: rhythmOnlyBars.length,
    allPartsRestBarCount: allRestBars.length,
    rhythmOnlyBars,
    allRestBars,
  };

  const saxOnlyBars: number[] = [];
  const brassOnlyBars: number[] = [];
  const rhythmOnlyBarsWriting: number[] = [];
  const fullTuttiBars: number[] = [];
  const soloSectionBars: number[] = [];

  for (let b = 1; b <= score.totalBars; b++) {
    const row = grid.perBar.get(b)!;
    const fam = partFamilyForBar(grid, b);
    if (fam === 'saxes') saxOnlyBars.push(b);
    if (fam === 'brass') brassOnlyBars.push(b);
    if (fam === 'rhythm') rhythmOnlyBarsWriting.push(b);
    if (row.activeParts.size >= ALL_PART_IDS.length) fullTuttiBars.push(b);

    const hornPartsWithNotes = [...HORN_IDS].filter((id) => {
      const part = grid.byPart.get(id);
      const m = part?.measures.get(b);
      return (m?.pitchedNoteCount ?? 0) > 0;
    });
    if (hornPartsWithNotes.length === 1) soloSectionBars.push(b);
  }

  const sectionalWriting = {
    saxOnlyBars,
    brassOnlyBars,
    rhythmOnlyBars: rhythmOnlyBarsWriting,
    fullTuttiBars,
    soloSectionBars,
    saxOnlyBarCount: saxOnlyBars.length,
    brassOnlyBarCount: brassOnlyBars.length,
    rhythmOnlyBarCount: rhythmOnlyBarsWriting.length,
    fullTuttiBarCount: fullTuttiBars.length,
    soloSectionBarCount: soloSectionBars.length,
  };

  const trumpetHighRegisterBars: number[] = [];
  const mutedBars: number[] = [];
  const tromboneCounterlineBars: number[] = [];

  for (let b = 1; b <= score.totalBars; b++) {
    const trpPart = score.parts.get('bb_trumpets');
    const tbnPart = score.parts.get('bb_trombones');
    const trpM = trpPart?.measures.get(b);
    const tbnM = tbnPart?.measures.get(b);

    if (trpM) {
      for (const nb of trpM.notes) {
        if (nb.isRest || nb.midi === null) continue;
        if (nb.midi !== null && isHighTrumpetMidi(nb.midi) && !trumpetHighRegisterBars.includes(b)) trumpetHighRegisterBars.push(b);
        if (nb.hasMute && !mutedBars.includes(b)) mutedBars.push(b);
      }
    }
    if (tbnM) {
      for (const nb of tbnM.notes) {
        if (nb.hasMute && !mutedBars.includes(b)) mutedBars.push(b);
      }
    }

    if (trpM && tbnM && trpM.pitchedNoteCount > 0 && tbnM.pitchedNoteCount > 0) {
      const trpOnsets = noteOnsets(trpM.notes).join(',');
      const tbnOnsets = noteOnsets(tbnM.notes).join(',');
      if (trpOnsets !== tbnOnsets) tromboneCounterlineBars.push(b);
    }
  }

  const brassArchitecture = {
    trumpetHighRegisterBars: [...new Set(trumpetHighRegisterBars)].sort((a, b) => a - b),
    trumpetHighRegisterBarCount: new Set(trumpetHighRegisterBars).size,
    tromboneCounterlineBars: [...new Set(tromboneCounterlineBars)].sort((a, b) => a - b),
    tromboneCounterlineBarCount: new Set(tromboneCounterlineBars).size,
    mutedBars: [...new Set(mutedBars)].sort((a, b) => a - b),
    mutedBarCount: new Set(mutedBars).size,
  };

  const shoutStart = 105;
  const shoutEnd = 120;
  let shoutNotes = 0;
  let shoutBars = 0;
  const shoutDynamics = new Set<string>();
  let shoutActiveParts = new Set<string>();

  for (let b = shoutStart; b <= shoutEnd && b <= score.totalBars; b++) {
    shoutBars++;
    const row = grid.perBar.get(b)!;
    shoutNotes += row.totalNotes;
    for (const p of row.activeParts) shoutActiveParts.add(p);
    for (const d of row.dynamics) shoutDynamics.add(d);
  }

  const bar120 = grid.perBar.get(120);
  const bar120Dynamics = bar120?.dynamics ?? [];
  const finalBarDynamic = bar120Dynamics.length > 0 ? bar120Dynamics[bar120Dynamics.length - 1] : null;
  const tuttiHitOnFinalBar =
    bar120 !== undefined &&
    ALL_PART_IDS.every((id) => bar120.activeParts.has(id)) &&
    bar120.totalNotes >= ALL_PART_IDS.length;

  const shoutChorus = {
    averageNoteDensity: shoutBars > 0 ? Math.round((shoutNotes / shoutBars) * 100) / 100 : 0,
    activePartCount: shoutActiveParts.size,
    dynamicMarkings: [...shoutDynamics].sort(),
    finalBarDynamic,
    tuttiHitOnFinalBar,
  };

  const pianoPart = grid.byPart.get('bb_piano');
  const bassPart = grid.byPart.get('bb_rhythm_section');
  const drumPart = grid.byPart.get('bb_drums');

  function avgNoteDensity(part: ParsedPart | undefined, start: number, end: number): number {
    if (!part) return 0;
    let sum = 0;
    let n = 0;
    for (let b = start; b <= end && b <= score.totalBars; b++) {
      const m = part.measures.get(b);
      sum += m?.noteCount ?? 0;
      n++;
    }
    return n > 0 ? Math.round((sum / n) * 100) / 100 : 0;
  }

  let walkingBarsCount = 0;
  if (bassPart) {
    for (let b = 1; b <= score.totalBars; b++) {
      const m = bassPart.measures.get(b);
      if (!m) continue;
      const quarters = m.notes.filter((n) => !n.isRest && n.type === 'quarter').length;
      if (quarters >= 4) walkingBarsCount++;
    }
  }

  function drumIntensityLabel(avgNotesPerBar: number): 'sparse' | 'medium' | 'driving' {
    if (avgNotesPerBar < 6) return 'sparse';
    if (avgNotesPerBar <= 14) return 'medium';
    return 'driving';
  }

  const drumIntensityArc = DRUM_WINDOWS.map((w) => {
    let sum = 0;
    let n = 0;
    for (let b = w.start; b <= w.end && b <= score.totalBars; b++) {
      const m = drumPart?.measures.get(b);
      sum += m?.noteCount ?? 0;
      n++;
    }
    const avg = n > 0 ? sum / n : 0;
    return {
      window: w.label,
      averageNotesPerBar: Math.round(avg * 100) / 100,
      intensity: drumIntensityLabel(avg),
    };
  });

  const rhythmSection = {
    pianoPart: {
      noteDensityPerBarBars1to16: avgNoteDensity(pianoPart, 1, 16),
      noteDensityPerBarBars89to120: avgNoteDensity(pianoPart, 89, 120),
    },
    bassPart: {
      walkingBarsCount,
    },
    drumPart: {
      intensityArc: drumIntensityArc,
    },
  };

  return {
    global,
    dynamicArc,
    sectionalContrast,
    dropoutEvents,
    sectionalWriting,
    brassArchitecture,
    shoutChorus,
    rhythmSection,
  };
}

type FileMetrics = ReturnType<typeof extractMetrics>;

function compareFlag(
  metric: string,
  valA: number | boolean | string | null,
  valB: number | boolean | string | null,
  higherIsBetter: boolean | 'equal' | 'lowerIsBetter'
): string {
  if (valA === valB || String(valA) === String(valB)) return '=';
  if (higherIsBetter === 'equal') return '=';
  if (typeof valA === 'boolean' && typeof valB === 'boolean') {
    if (valB && !valA) return '▲';
    if (!valB && valA) return '▼';
    return '=';
  }
  const a = typeof valA === 'number' ? valA : 0;
  const b = typeof valB === 'number' ? valB : 0;
  if (higherIsBetter === true) {
    if (b > a) return '▲';
    if (b < a) return '▼';
    return '=';
  }
  if (b < a) return '▲';
  if (b > a) return '▼';
  return '=';
}

function formatSummary(a: FileMetrics, b: FileMetrics): string {
  const lines: string[] = [];
  const row = (label: string, va: string | number | boolean, vb: string | number | boolean, flag: string) => {
    lines.push(`${flag} ${label.padEnd(42)} | A: ${va} | B: ${vb}`);
  };

  lines.push('Orbit Big Band — v1 vs v2 comparison summary');
  lines.push('='.repeat(72));
  lines.push('');

  row('totalBars', a.global.totalBars, b.global.totalBars, compareFlag('', a.global.totalBars, b.global.totalBars, 'equal'));
  row('partCount', a.global.partCount, b.global.partCount, compareFlag('', a.global.partCount, b.global.partCount, 'equal'));
  row('fileSizeKB', a.global.fileSizeKB, b.global.fileSizeKB, compareFlag('', a.global.fileSizeKB, b.global.fileSizeKB, 'equal'));
  row('tempoMarking', a.global.tempoMarking ?? '—', b.global.tempoMarking ?? '—', compareFlag('', a.global.tempoMarking, b.global.tempoMarking, 'equal'));
  row('timeSignature', a.global.timeSignature ?? '—', b.global.timeSignature ?? '—', compareFlag('', a.global.timeSignature, b.global.timeSignature, 'equal'));

  lines.push('');
  lines.push('--- Dynamic arc (16-bar windows, avg note density) ---');
  for (let i = 0; i < a.dynamicArc.length; i++) {
    const wa = a.dynamicArc[i]!;
    const wb = b.dynamicArc[i]!;
    row(`density ${wa.window}`, wa.averageNoteDensity, wb.averageNoteDensity, compareFlag('', wa.averageNoteDensity, wb.averageNoteDensity, true));
    row(`activeParts ${wa.window}`, wa.activePartCount, wb.activePartCount, compareFlag('', wa.activePartCount, wb.activePartCount, true));
    row(`restBars ${wa.window}`, wa.restBarCount, wb.restBarCount, compareFlag('', wa.restBarCount, wb.restBarCount, 'lowerIsBetter'));
  }

  lines.push('');
  lines.push('--- Dropout events ---');
  row('rhythmOnlyBarCount', a.dropoutEvents.rhythmOnlyBarCount, b.dropoutEvents.rhythmOnlyBarCount, compareFlag('', a.dropoutEvents.rhythmOnlyBarCount, b.dropoutEvents.rhythmOnlyBarCount, true));
  row('allPartsRestBarCount', a.dropoutEvents.allPartsRestBarCount, b.dropoutEvents.allPartsRestBarCount, compareFlag('', a.dropoutEvents.allPartsRestBarCount, b.dropoutEvents.allPartsRestBarCount, 'equal'));

  lines.push('');
  lines.push('--- Sectional writing ---');
  row('saxOnlyBarCount', a.sectionalWriting.saxOnlyBarCount, b.sectionalWriting.saxOnlyBarCount, compareFlag('', a.sectionalWriting.saxOnlyBarCount, b.sectionalWriting.saxOnlyBarCount, true));
  row('brassOnlyBarCount', a.sectionalWriting.brassOnlyBarCount, b.sectionalWriting.brassOnlyBarCount, compareFlag('', a.sectionalWriting.brassOnlyBarCount, b.sectionalWriting.brassOnlyBarCount, true));
  row('fullTuttiBarCount', a.sectionalWriting.fullTuttiBarCount, b.sectionalWriting.fullTuttiBarCount, compareFlag('', a.sectionalWriting.fullTuttiBarCount, b.sectionalWriting.fullTuttiBarCount, true));
  row('soloSectionBarCount', a.sectionalWriting.soloSectionBarCount, b.sectionalWriting.soloSectionBarCount, compareFlag('', a.sectionalWriting.soloSectionBarCount, b.sectionalWriting.soloSectionBarCount, true));

  lines.push('');
  lines.push('--- Brass architecture ---');
  row('trumpetHighRegisterBarCount', a.brassArchitecture.trumpetHighRegisterBarCount, b.brassArchitecture.trumpetHighRegisterBarCount, compareFlag('', a.brassArchitecture.trumpetHighRegisterBarCount, b.brassArchitecture.trumpetHighRegisterBarCount, true));
  row('tromboneCounterlineBarCount', a.brassArchitecture.tromboneCounterlineBarCount, b.brassArchitecture.tromboneCounterlineBarCount, compareFlag('', a.brassArchitecture.tromboneCounterlineBarCount, b.brassArchitecture.tromboneCounterlineBarCount, true));
  row('mutedBarCount', a.brassArchitecture.mutedBarCount, b.brassArchitecture.mutedBarCount, compareFlag('', a.brassArchitecture.mutedBarCount, b.brassArchitecture.mutedBarCount, 'equal'));

  lines.push('');
  lines.push('--- Shout chorus (105–120) ---');
  row('shout avgNoteDensity', a.shoutChorus.averageNoteDensity, b.shoutChorus.averageNoteDensity, compareFlag('', a.shoutChorus.averageNoteDensity, b.shoutChorus.averageNoteDensity, true));
  row('shout activePartCount', a.shoutChorus.activePartCount, b.shoutChorus.activePartCount, compareFlag('', a.shoutChorus.activePartCount, b.shoutChorus.activePartCount, true));
  row('finalBarDynamic', a.shoutChorus.finalBarDynamic ?? '—', b.shoutChorus.finalBarDynamic ?? '—', compareFlag('', a.shoutChorus.finalBarDynamic, b.shoutChorus.finalBarDynamic, true));
  row('tuttiHitOnFinalBar', a.shoutChorus.tuttiHitOnFinalBar, b.shoutChorus.tuttiHitOnFinalBar, compareFlag('', a.shoutChorus.tuttiHitOnFinalBar, b.shoutChorus.tuttiHitOnFinalBar, true));

  lines.push('');
  lines.push('--- Rhythm section ---');
  row('piano density bars 1–16', a.rhythmSection.pianoPart.noteDensityPerBarBars1to16, b.rhythmSection.pianoPart.noteDensityPerBarBars1to16, compareFlag('', a.rhythmSection.pianoPart.noteDensityPerBarBars1to16, b.rhythmSection.pianoPart.noteDensityPerBarBars1to16, 'lowerIsBetter'));
  row('piano density bars 89–120', a.rhythmSection.pianoPart.noteDensityPerBarBars89to120, b.rhythmSection.pianoPart.noteDensityPerBarBars89to120, compareFlag('', a.rhythmSection.pianoPart.noteDensityPerBarBars89to120, b.rhythmSection.pianoPart.noteDensityPerBarBars89to120, true));
  row('bass walkingBarsCount', a.rhythmSection.bassPart.walkingBarsCount, b.rhythmSection.bassPart.walkingBarsCount, compareFlag('', a.rhythmSection.bassPart.walkingBarsCount, b.rhythmSection.bassPart.walkingBarsCount, true));

  lines.push('');
  lines.push('--- Drum intensity arc ---');
  for (let i = 0; i < a.rhythmSection.drumPart.intensityArc.length; i++) {
    const da = a.rhythmSection.drumPart.intensityArc[i]!;
    const db = b.rhythmSection.drumPart.intensityArc[i]!;
    const rank = (s: string) => (s === 'sparse' ? 0 : s === 'medium' ? 1 : 2);
    const flag = rank(db.intensity) > rank(da.intensity) ? '▲' : rank(db.intensity) < rank(da.intensity) ? '▼' : '=';
    row(`drums ${da.window}`, da.intensity, db.intensity, flag);
  }

  lines.push('');
  lines.push('▲ = v2 stronger | ▼ = v2 weaker | = equal');

  return lines.join('\n');
}

function main(): void {
  for (const f of [FILE_A, FILE_B]) {
    if (!fs.existsSync(f)) {
      throw new Error(`Input file not found: ${f}`);
    }
  }

  const scoreA = parseMusicXmlFile(FILE_A);
  const scoreB = parseMusicXmlFile(FILE_B);

  const metricsA = extractMetrics(scoreA);
  const metricsB = extractMetrics(scoreB);

  const report = {
    generatedAt: new Date().toISOString(),
    fileA: scoreA.fileName,
    fileB: scoreB.fileName,
    global: {
      fileA: metricsA.global,
      fileB: metricsB.global,
    },
    dynamicArc: {
      fileA: metricsA.dynamicArc,
      fileB: metricsB.dynamicArc,
    },
    sectionalContrast: {
      fileA: metricsA.sectionalContrast,
      fileB: metricsB.sectionalContrast,
    },
    dropoutEvents: {
      fileA: metricsA.dropoutEvents,
      fileB: metricsB.dropoutEvents,
    },
    sectionalWriting: {
      fileA: metricsA.sectionalWriting,
      fileB: metricsB.sectionalWriting,
    },
    brassArchitecture: {
      fileA: metricsA.brassArchitecture,
      fileB: metricsB.brassArchitecture,
    },
    shoutChorus: {
      fileA: metricsA.shoutChorus,
      fileB: metricsB.shoutChorus,
    },
    rhythmSection: {
      fileA: metricsA.rhythmSection,
      fileB: metricsB.rhythmSection,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(OUT_TXT, formatSummary(metricsA, metricsB), 'utf8');

  console.log('Parsed:', scoreA.fileName, `(${scoreA.totalBars} bars)`);
  console.log('Parsed:', scoreB.fileName, `(${scoreB.totalBars} bars)`);
  console.log('Wrote:', OUT_JSON, `(${Math.round(fs.statSync(OUT_JSON).size / 1024 * 10) / 10} KB)`);
  console.log('Wrote:', OUT_TXT, `(${Math.round(fs.statSync(OUT_TXT).size / 1024 * 10) / 10} KB)`);
}

main();
