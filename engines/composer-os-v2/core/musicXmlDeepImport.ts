/**
 * V65 P3 — additive MusicXML deep import.
 * Keeps legacy `parseMusicXml` and LeadSheet import stable; this path maps partwise XML to `Song`.
 */

import type { BarMeterMap } from './rhythm/barMeterTypes';
import type { InstrumentKind, SectionPreset, Song } from './section-architecture/sectionArchitectureTypes';
import type { LeadSheet } from './lead-sheet/leadSheetTypes';
import { importLeadSheetFromMusicXml } from './lead-sheet/leadSheetMusicXmlImport';

export interface MusicXmlDeepImportedVoiceSummary {
  voice: string;
  staff?: string;
  noteCount: number;
}

export interface MusicXmlDeepImportedMeasure {
  bar: number;
  sourceMeasureNumber: string;
  voices: MusicXmlDeepImportedVoiceSummary[];
}

export interface MusicXmlDeepImportedPart {
  partId: string;
  partName: string;
  measures: MusicXmlDeepImportedMeasure[];
}

export interface MusicXmlVoiceAssignment {
  partId: string;
  instrumentRole: InstrumentKind;
}

export interface MusicXmlDeepImportResult {
  parts: MusicXmlDeepImportedPart[];
  meterByBar: BarMeterMap;
  tempoByBar: { bar: number; bpm: number }[];
  sectionStarts: { bar: number; label: string }[];
  voiceAssignments: MusicXmlVoiceAssignment[];
  chordsByBar: string[];
  warnings: string[];
}

export interface ImportedSongResult {
  song: Song;
  lockedHarmonyBars: string[];
  leadSheet?: LeadSheet;
  deepImport: MusicXmlDeepImportResult;
}

const KIND_TO_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  dominant: '7',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'dominant-ninth': '9',
  'major-ninth': 'maj9',
  'minor-ninth': 'm9',
  'half-diminished': 'm7b5',
  diminished: 'dim',
  augmented: 'aug',
};

function tagValue(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim();
}

function attrValue(xml: string, attr: string): string | undefined {
  return xml.match(new RegExp(`\\b${attr}="([^"]*)"`, 'i'))?.[1]?.trim();
}

function blocks(xml: string, tag: string): string[] {
  return xml.match(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi')) ?? [];
}

function normalizeLabel(label: string): string {
  const raw = label.trim() || 'A';
  return raw.replace(/\s+/g, '_').replace(/[^\w-]+/g, '').toLowerCase() || 'section';
}

function uniqueSectionId(label: string, seen: Set<string>): string {
  const base = normalizeLabel(label);
  let id = base;
  let n = 2;
  while (seen.has(id)) {
    id = `${base}_${n++}`;
  }
  seen.add(id);
  return id;
}

function inferInstrumentRole(partName: string): InstrumentKind {
  const n = partName.toLowerCase();
  if (/bass|contrabass|upright/.test(n)) return 'bass';
  if (/guitar|gtr/.test(n)) return 'guitar';
  if (/piano|keys|keyboard|rhodes|organ/.test(n)) return 'keys';
  if (/drum|perc/.test(n)) return 'drums';
  if (/violin|viola|cello|string/.test(n)) return 'strings';
  if (/trumpet|trombone|horn|brass/.test(n)) return 'brass';
  if (/sax|clarinet|flute|oboe|woodwind/.test(n)) return 'woodwinds';
  return 'generic';
}

function parseHarmonySymbol(harmonyXml: string): string | null {
  const rootStep = tagValue(harmonyXml, 'root-step');
  if (!rootStep) return null;
  const rootAlter = Number(tagValue(harmonyXml, 'root-alter') ?? 0);
  const rootAcc = rootAlter === 1 ? '#' : rootAlter === -1 ? 'b' : '';
  const kindBlock = harmonyXml.match(/<kind\b[^>]*>[\s\S]*?<\/kind>/i)?.[0] ?? '';
  const kindText = attrValue(kindBlock, 'text');
  const kindBody = tagValue(harmonyXml, 'kind')?.trim().toLowerCase() ?? '';
  const suffix = kindText !== undefined ? kindText : KIND_TO_SUFFIX[kindBody] ?? (kindBody === 'other' ? '' : kindBody);
  const bassStep = tagValue(harmonyXml, 'bass-step');
  const bassAlter = Number(tagValue(harmonyXml, 'bass-alter') ?? 0);
  const bassAcc = bassAlter === 1 ? '#' : bassAlter === -1 ? 'b' : '';
  const slash = bassStep ? `/${bassStep.toUpperCase()}${bassAcc}` : '';
  return `${rootStep.toUpperCase()}${rootAcc}${suffix}${slash}`;
}

function parseTempoFromDirection(directionXml: string): number | undefined {
  const sound = directionXml.match(/<sound\b[^>]*tempo="([\d.]+)"/i)?.[1];
  if (sound) {
    const bpm = Number(sound);
    if (Number.isFinite(bpm) && bpm > 0) return bpm;
  }
  const perMinute = tagValue(directionXml, 'per-minute');
  if (perMinute) {
    const bpm = Number(perMinute);
    if (Number.isFinite(bpm) && bpm > 0) return bpm;
  }
  return undefined;
}

function parseMeasureVoiceSummary(measureXml: string): MusicXmlDeepImportedVoiceSummary[] {
  const counts = new Map<string, { voice: string; staff?: string; noteCount: number }>();
  for (const note of blocks(measureXml, 'note')) {
    if (/<rest\b/i.test(note)) continue;
    const voice = tagValue(note, 'voice') ?? '1';
    const staff = tagValue(note, 'staff');
    const key = `${voice}:${staff ?? ''}`;
    const existing = counts.get(key) ?? { voice, ...(staff ? { staff } : {}), noteCount: 0 };
    existing.noteCount += 1;
    counts.set(key, existing);
  }
  return [...counts.values()].sort((a, b) => a.voice.localeCompare(b.voice) || (a.staff ?? '').localeCompare(b.staff ?? ''));
}

function parsePartList(xml: string): { id: string; name: string }[] {
  return blocks(xml, 'score-part').map((b) => ({
    id: attrValue(b, 'id') ?? 'P1',
    name: tagValue(b, 'part-name') ?? attrValue(b, 'id') ?? 'Part',
  }));
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

export function importMusicXmlDeep(xml: string): MusicXmlDeepImportResult {
  const warnings: string[] = [];
  const trimmed = xml.trim();
  if (!/<score-partwise\b/i.test(trimmed)) {
    throw new Error('MusicXML deep import supports score-partwise MusicXML only.');
  }

  const partNames = new Map(parsePartList(trimmed).map((p) => [p.id, p.name]));
  const partsRaw = partBlocks(trimmed);
  if (partsRaw.length === 0) throw new Error('MusicXML deep import found no <part> blocks.');

  const firstPart = partsRaw[0]!;
  const firstMeasures = blocks(firstPart.xml, 'measure');
  const totalBars = Math.max(1, firstMeasures.length);
  const meterByBar: BarMeterMap = {};
  const tempoByBar: { bar: number; bpm: number }[] = [];
  const sectionStarts: { bar: number; label: string }[] = [];
  const chordsByBar: string[] = [];

  let activeMeter = { numerator: 4, denominator: 4 };
  let carryChord = 'C';
  for (let i = 0; i < totalBars; i++) {
    const bar = i + 1;
    const m = firstMeasures[i]!;
    const time = m.match(/<time>[\s\S]*?<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>[\s\S]*?<\/time>/i);
    if (time) activeMeter = { numerator: Number(time[1]), denominator: Number(time[2]) };
    meterByBar[bar] = { ...activeMeter };

    for (const d of blocks(m, 'direction')) {
      const tempo = parseTempoFromDirection(d);
      if (tempo !== undefined) tempoByBar.push({ bar, bpm: tempo });
      const rehearsal = tagValue(d, 'rehearsal');
      if (rehearsal) sectionStarts.push({ bar, label: rehearsal });
    }

    const harmonySymbols = blocks(m, 'harmony').map(parseHarmonySymbol).filter((s): s is string => !!s);
    if (harmonySymbols[0]) carryChord = harmonySymbols[0];
    chordsByBar.push(carryChord);
  }

  if (sectionStarts.length === 0 || sectionStarts[0]!.bar !== 1) {
    sectionStarts.unshift({ bar: 1, label: 'A' });
  }
  const dedupedSections = sectionStarts
    .filter((s, idx, arr) => idx === arr.findIndex((x) => x.bar === s.bar && x.label === s.label))
    .sort((a, b) => a.bar - b.bar);

  const parts = partsRaw.map((p) => {
    const measures = blocks(p.xml, 'measure').map((measureXml, idx) => ({
      bar: idx + 1,
      sourceMeasureNumber: attrValue(measureXml, 'number') ?? String(idx + 1),
      voices: parseMeasureVoiceSummary(measureXml),
    }));
    return {
      partId: p.id,
      partName: partNames.get(p.id) ?? p.id,
      measures,
    };
  });

  if (parts.length > 1) warnings.push('Deep import captured multiple parts; generation currently uses them as role hints only.');

  return {
    parts,
    meterByBar,
    tempoByBar,
    sectionStarts: dedupedSections,
    voiceAssignments: parts.map((p) => ({ partId: p.partId, instrumentRole: inferInstrumentRole(p.partName) })),
    chordsByBar,
    warnings,
  };
}

function meterSpansForSection(meterByBar: BarMeterMap, startBar: number, endBar: number): { bar: number; meter: string }[] {
  const spans: { bar: number; meter: string }[] = [];
  let prev = '';
  for (let bar = startBar; bar <= endBar; bar++) {
    const m = meterByBar[bar] ?? meterByBar[startBar] ?? { numerator: 4, denominator: 4 };
    const label = `${m.numerator}/${m.denominator}`;
    if (label !== prev) {
      spans.push({ bar, meter: label });
      prev = label;
    }
  }
  return spans;
}

function sectionTypeFromLabel(label: string): SectionPreset['type'] {
  const l = label.toLowerCase();
  if (/intro/.test(l)) return 'intro';
  if (/verse|head|theme/.test(l)) return 'verse';
  if (/chorus|shout/.test(l)) return 'chorus';
  if (/bridge|middle/.test(l)) return 'bridge';
  if (/solo/.test(l)) return 'solo';
  if (/outro|ending|coda/.test(l)) return 'outro';
  return 'custom';
}

export function mapMusicXmlDeepImportToSong(
  deepImport: MusicXmlDeepImportResult,
  options: { id?: string; title?: string; targetTotalBars?: number } = {}
): ImportedSongResult {
  const importedBars = Math.max(1, deepImport.chordsByBar.length, Object.keys(deepImport.meterByBar).length);
  const targetTotalBars =
    typeof options.targetTotalBars === 'number' && Number.isFinite(options.targetTotalBars) && options.targetTotalBars >= 1
      ? Math.floor(options.targetTotalBars)
      : undefined;
  const totalBars = targetTotalBars ?? importedBars;
  const sectionRows = deepImport.sectionStarts.length ? deepImport.sectionStarts : [{ bar: 1, label: 'A' }];
  const seen = new Set<string>();
  const sections: SectionPreset[] = sectionRows.map((s, idx) => {
    const nextStart = sectionRows[idx + 1]?.bar ?? totalBars + 1;
    const startBar = Math.max(1, Math.min(totalBars, s.bar));
    const endBar = Math.max(startBar, Math.min(totalBars, nextStart - 1));
    const meterMap = meterSpansForSection(deepImport.meterByBar, startBar, endBar);
    return {
      id: uniqueSectionId(s.label, seen),
      label: s.label,
      type: sectionTypeFromLabel(s.label),
      barRange: { startBar, endBar },
      ...(meterMap.length ? { meterMap } : {}),
      instrumentOverrides: deepImport.voiceAssignments
        .filter((a) => a.instrumentRole !== 'generic')
        .map((a) => ({
          density: 'moderate' as const,
          riffMode: `${a.instrumentRole}_import_hint`,
        })),
    };
  });

  const firstMeter = deepImport.meterByBar[1] ?? { numerator: 4, denominator: 4 };
  const song: Song = {
    schemaVersion: 1,
    id: options.id ?? 'musicxml_deep_import',
    title: options.title ?? 'Imported MusicXML Song',
    totalBars,
    globalDefaults: {
      tempo: deepImport.tempoByBar[0]?.bpm ?? 120,
      meter: `${firstMeter.numerator}/${firstMeter.denominator}`,
      defaultDensity: 'moderate',
    },
    sections,
    localOverrides: [],
  };

  return {
    song,
    lockedHarmonyBars: Array.from({ length: totalBars }, (_, idx) => {
      if (deepImport.chordsByBar[idx]) return deepImport.chordsByBar[idx]!;
      if (deepImport.chordsByBar.length) return deepImport.chordsByBar[deepImport.chordsByBar.length - 1]!;
      return 'C';
    }),
    leadSheet: undefined,
    deepImport,
  };
}

export function importMusicXmlToImportedSong(
  xml: string,
  options: { id?: string; title?: string; targetTotalBars?: number } = {}
): ImportedSongResult {
  const deepImport = importMusicXmlDeep(xml);
  const mapped = mapMusicXmlDeepImportToSong(deepImport, options);
  const leadSheetResult = importLeadSheetFromMusicXml(xml);
  return {
    ...mapped,
    ...(leadSheetResult.ok && leadSheetResult.leadSheet ? { leadSheet: leadSheetResult.leadSheet } : {}),
  };
}
