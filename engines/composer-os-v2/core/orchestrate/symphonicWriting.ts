/**
 * V4.0 Phase 1 symphonic roster and phrase plan.
 * Same piano-chamber branch. Chamber stays on resolveTemplate('chamber_orchestra').
 *
 * Notation conventions, stated here rather than inferred from display names:
 * - Trumpets 1–3 are Trumpet in B-flat (catalogue trumpet_bb). Not C trumpet.
 * - Trombones 1–3 are tenor trombones, concert pitch, bass clef. Not bass trombone.
 * - Bass clarinet is B-flat, treble clef, sounding a major ninth below. Not bass-clef concert.
 * - Cor anglais is in F, treble clef, sounding a perfect fifth below.
 * - Contrabassoon is written in bass clef one octave above sounding pitch.
 * - Piccolo is written one octave below sounding pitch.
 * - Timpani are pitched, catalogue D2–C4, and use one declared tuning set.
 * - Orchestral percussion is one player: bass drum (GM 36) and suspended cymbal (GM 57).
 * - Harp is the catalogue harp on two staves. It is not a renamed piano.
 * - Strings are five unison section staves. No divisi and no double-stops.
 */

import type { InstrumentSpec } from '../instruments/instrumentTypes';
import { getInstrument } from '../instruments/instrumentCatalogue';
import type { RegisterBand } from '../orchestration/orchestrationTypes';
import type { ResolvedPart } from './ensembleTemplates';
import type {
  SymphonicDensity,
  SymphonicFamilyActivity,
  SymphonicFamilyId,
  SymphonicForegroundPreference,
  SymphonicOrchestrationSettings,
} from './types';

export interface SymphonicSlot {
  partId: string;
  instrumentId: string;
  name: string;
  family: 'woodwind' | 'brass' | 'strings' | 'harp' | 'timpani' | 'percussion';
  midiFile: 'symphony-woodwinds.mid' | 'symphony-brass.mid' | 'symphony-strings.mid' | 'symphony-harp-timpani-percussion.mid';
}

export const SYMPHONIC_SLOTS: readonly SymphonicSlot[] = [
  { partId: 'picc', instrumentId: 'piccolo', name: 'Piccolo', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'fl1', instrumentId: 'flute', name: 'Flute 1', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'fl2', instrumentId: 'flute', name: 'Flute 2', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'ob1', instrumentId: 'oboe', name: 'Oboe 1', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'ob2', instrumentId: 'oboe', name: 'Oboe 2', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'ca', instrumentId: 'cor_anglais', name: 'Cor anglais', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'cl1', instrumentId: 'clarinet_bb', name: 'Clarinet 1 in B-flat', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'cl2', instrumentId: 'clarinet_bb', name: 'Clarinet 2 in B-flat', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'bcl', instrumentId: 'bass_clarinet_bb', name: 'Bass Clarinet in B-flat', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'bn1', instrumentId: 'bassoon', name: 'Bassoon 1', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'bn2', instrumentId: 'bassoon', name: 'Bassoon 2', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'cbn', instrumentId: 'contrabassoon', name: 'Contrabassoon', family: 'woodwind', midiFile: 'symphony-woodwinds.mid' },
  { partId: 'hn1', instrumentId: 'horn_f', name: 'Horn 1 in F', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'hn2', instrumentId: 'horn_f', name: 'Horn 2 in F', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'hn3', instrumentId: 'horn_f', name: 'Horn 3 in F', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'hn4', instrumentId: 'horn_f', name: 'Horn 4 in F', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tp1', instrumentId: 'trumpet_bb', name: 'Trumpet 1 in B-flat', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tp2', instrumentId: 'trumpet_bb', name: 'Trumpet 2 in B-flat', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tp3', instrumentId: 'trumpet_bb', name: 'Trumpet 3 in B-flat', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tbn1', instrumentId: 'trombone', name: 'Tenor Trombone 1', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tbn2', instrumentId: 'trombone', name: 'Tenor Trombone 2', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tbn3', instrumentId: 'trombone', name: 'Tenor Trombone 3', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'tba', instrumentId: 'tuba', name: 'Bass Tuba', family: 'brass', midiFile: 'symphony-brass.mid' },
  { partId: 'timp', instrumentId: 'timpani', name: 'Timpani', family: 'timpani', midiFile: 'symphony-harp-timpani-percussion.mid' },
  { partId: 'perc', instrumentId: 'orchestral_percussion', name: 'Orchestral percussion', family: 'percussion', midiFile: 'symphony-harp-timpani-percussion.mid' },
  { partId: 'hp', instrumentId: 'harp', name: 'Harp', family: 'harp', midiFile: 'symphony-harp-timpani-percussion.mid' },
  { partId: 'vn1', instrumentId: 'violin', name: 'Violin I', family: 'strings', midiFile: 'symphony-strings.mid' },
  { partId: 'vn2', instrumentId: 'violin', name: 'Violin II', family: 'strings', midiFile: 'symphony-strings.mid' },
  { partId: 'va', instrumentId: 'viola', name: 'Viola', family: 'strings', midiFile: 'symphony-strings.mid' },
  { partId: 'vc', instrumentId: 'cello', name: 'Cello', family: 'strings', midiFile: 'symphony-strings.mid' },
  { partId: 'db', instrumentId: 'double_bass', name: 'Double Bass', family: 'strings', midiFile: 'symphony-strings.mid' },
];

export const SYMPHONIC_MIDI_FILES = [
  'symphony-woodwinds.mid',
  'symphony-brass.mid',
  'symphony-strings.mid',
  'symphony-harp-timpani-percussion.mid',
] as const;

export const SYMPHONIC_PART_BAND: Record<string, RegisterBand> = {
  picc: 'very_high',
  fl1: 'high',
  fl2: 'high',
  ob1: 'high',
  ob2: 'middle',
  ca: 'middle',
  cl1: 'middle',
  cl2: 'middle',
  bcl: 'low',
  bn1: 'low',
  bn2: 'low',
  cbn: 'sub_bass',
  hn1: 'middle',
  hn2: 'middle',
  hn3: 'low',
  hn4: 'low',
  tp1: 'high',
  tp2: 'middle',
  tp3: 'middle',
  tbn1: 'low',
  tbn2: 'low',
  tbn3: 'bass',
  tba: 'sub_bass',
  timp: 'bass',
  hp: 'middle',
  vn1: 'high',
  vn2: 'middle',
  va: 'middle',
  vc: 'bass',
  db: 'sub_bass',
};

const WIND_IDS = new Set(['picc', 'fl1', 'fl2', 'ob1', 'ob2', 'ca', 'cl1', 'cl2', 'bcl', 'bn1', 'bn2', 'cbn', 'hn1', 'hn2', 'hn3', 'hn4', 'tp1', 'tp2', 'tp3', 'tbn1', 'tbn2', 'tbn3', 'tba']);

export function isSymphonicWind(partId: string): boolean {
  return WIND_IDS.has(partId);
}

export function resolveSymphonicRoster(): {
  parts: ResolvedPart[];
  omissions: Array<{ partId: string; instrumentId: string; detail: string }>;
} {
  const parts: ResolvedPart[] = [];
  const omissions: Array<{ partId: string; instrumentId: string; detail: string }> = [];
  for (const slot of SYMPHONIC_SLOTS) {
    let spec: InstrumentSpec;
    try {
      spec = getInstrument(slot.instrumentId);
    } catch {
      omissions.push({ partId: slot.partId, instrumentId: slot.instrumentId, detail: `${slot.instrumentId} is not in the catalogue.` });
      continue;
    }
    if (slot.instrumentId !== 'orchestral_percussion' && !spec.soundingHardRange) {
      omissions.push({ partId: slot.partId, instrumentId: slot.instrumentId, detail: `${spec.displayName} has no documented sounding range.` });
      continue;
    }
    const hint = slot.family === 'strings' && slot.partId === 'db'
      ? 'bass'
      : slot.partId === 'vn1' || slot.partId === 'fl1'
        ? 'melody'
        : slot.partId === 'vn2' || slot.partId === 'va'
          ? 'counterline'
          : 'harmony';
    parts.push({
      partId: slot.partId,
      instrumentId: slot.instrumentId,
      name: slot.name,
      hint,
      spec: slot.family === 'strings' ? { ...spec, maxSimultaneous: 1 } : spec,
    });
  }
  return { parts, omissions };
}

export interface ResolvedSymphonicSettings {
  activity: SymphonicDensity;
  families: Record<SymphonicFamilyId, SymphonicFamilyActivity>;
  foreground: SymphonicForegroundPreference;
  counterline: 'off' | 'when-source-allows';
}

export function resolveSymphonicSettings(raw: SymphonicOrchestrationSettings | undefined): ResolvedSymphonicSettings | { error: string } {
  const activity = raw?.activity ?? 'moderate';
  if (activity !== 'sparse' && activity !== 'moderate' && activity !== 'full') {
    return { error: 'Symphonic activity must be sparse, moderate, or full.' };
  }
  const foreground = raw?.foreground ?? 'source-register';
  if (foreground !== 'source-register' && foreground !== 'strings' && foreground !== 'woodwind' && foreground !== 'brass') {
    return { error: 'Symphonic foreground preference was not recognised.' };
  }
  const counterline = raw?.counterline ?? 'when-source-allows';
  if (counterline !== 'off' && counterline !== 'when-source-allows') {
    return { error: 'Symphonic counterline must be off or when-source-allows.' };
  }
  const families: Record<SymphonicFamilyId, SymphonicFamilyActivity> = {
    woodwind: 'open',
    brass: 'open',
    strings: 'open',
    harp: 'limited',
    percussion: 'limited',
  };
  for (const [family, value] of Object.entries(raw?.families ?? {})) {
    if (!(family in families)) return { error: `Unknown symphonic family ${family}.` };
    if (value !== 'off' && value !== 'limited' && value !== 'open') {
      return { error: `Family ${family} activity must be off, limited, or open.` };
    }
    families[family as SymphonicFamilyId] = value;
  }
  return { activity, families, foreground, counterline };
}

export interface SymphonicPhrasePlan {
  phraseId: string;
  startBar: number;
  endBar: number;
  kind: 'statement' | 'development' | 'return';
  foregroundFamily: 'woodwind' | 'brass' | 'strings';
  foregroundIds: string[];
  supportIds: string[];
  bassIds: string[];
  counterline: 'offer' | 'silence';
  answerIds: string[];
  register: 'high' | 'middle' | 'low';
  dynamic: 'p' | 'mp' | 'mf';
  doubling: boolean;
  harp: boolean;
  timpani: boolean;
  percussion: 'none' | 'bass-drum' | 'cymbal';
  previousFamily: 'woodwind' | 'brass' | 'strings' | null;
}

const WOOD_HIGH = ['fl1', 'ob1', 'cl1', 'fl2', 'ca'];
const WOOD_MID = ['cl1', 'ob1', 'ca', 'cl2', 'bn1'];
const WOOD_LOW = ['bn1', 'bcl', 'cl1', 'cbn'];
const BRASS_HIGH = ['hn1', 'tp1', 'hn2', 'tp2'];
const BRASS_MID = ['hn1', 'hn2', 'tp2', 'tbn1'];
const BRASS_LOW = ['tbn1', 'tba', 'hn3', 'tbn2'];
const STRING_HIGH = ['vn1', 'vn2', 'va'];
const STRING_MID = ['vn1', 'vn2', 'va', 'vc'];
const STRING_LOW = ['vc', 'va', 'db', 'vn2'];

function familyOf(id: string): SymphonicFamilyId | 'timpani' | null {
  return SYMPHONIC_SLOTS.find((slot) => slot.partId === id)?.family === 'timpani'
    ? 'timpani'
    : (SYMPHONIC_SLOTS.find((slot) => slot.partId === id)?.family as SymphonicFamilyId | undefined) ?? null;
}

function allowed(ids: readonly string[], settings: ResolvedSymphonicSettings, limitedSeen: Set<string>): string[] {
  const out: string[] = [];
  const limitedFamilies = new Set<string>();
  for (const id of ids) {
    const family = familyOf(id);
    if (!family || family === 'timpani') continue;
    const gate = settings.families[family];
    if (gate === 'off') continue;
    if (gate === 'limited') {
      if (limitedSeen.has(family) || limitedFamilies.has(family)) continue;
      limitedFamilies.add(family);
    }
    out.push(id);
  }
  return out;
}

function prefer(primary: readonly string[], rest: readonly string[]): string[] {
  return [...primary, ...rest.filter((id) => !primary.includes(id))];
}

export function planSymphonicPhrases(
  phrases: ReadonlyArray<{ id: string; startBar: number; endBar: number; kind: 'statement' | 'development' | 'return' }>,
  centreFor: (phraseId: string) => number,
  melodyCount: (phraseId: string) => number,
  settings: ResolvedSymphonicSettings,
): SymphonicPhrasePlan[] {
  let previous: 'woodwind' | 'brass' | 'strings' | null = null;
  let opening: 'woodwind' | 'brass' | 'strings' | null = null;
  let percussionUsed = false;
  return phrases.map((phrase) => {
    const centre = centreFor(phrase.id);
    const register: SymphonicPhrasePlan['register'] = centre >= 74 ? 'high' : centre >= 60 ? 'middle' : 'low';
    const byRegister = {
      woodwind: register === 'high' ? WOOD_HIGH : register === 'middle' ? WOOD_MID : WOOD_LOW,
      brass: register === 'high' ? BRASS_HIGH : register === 'middle' ? BRASS_MID : BRASS_LOW,
      strings: register === 'high' ? STRING_HIGH : register === 'middle' ? STRING_MID : STRING_LOW,
    };
    let foregroundFamily: 'woodwind' | 'brass' | 'strings' = settings.foreground === 'source-register'
      ? (register === 'low' ? 'strings' : register === 'high' ? 'woodwind' : 'strings')
      : settings.foreground;
    if (settings.families[foregroundFamily] === 'off') {
      foregroundFamily = (['strings', 'woodwind', 'brass'] as const).find((family) => settings.families[family] !== 'off') ?? 'strings';
    }
    if (phrase.kind === 'return' && opening && settings.families[opening] !== 'off') foregroundFamily = opening;
    if (phrase.kind === 'development' && previous && foregroundFamily === previous) {
      const alternate = (['woodwind', 'strings', 'brass'] as const).find((family) => family !== previous && settings.families[family] !== 'off');
      if (alternate) foregroundFamily = alternate;
    }
    const order = prefer(byRegister[foregroundFamily], [
      ...byRegister.strings,
      ...byRegister.woodwind,
      ...byRegister.brass,
    ]);
    const foregroundIds = allowed(order, settings, new Set());
    const supportPool = prefer(
      foregroundFamily === 'strings' ? byRegister.woodwind : byRegister.strings,
      [...byRegister.brass, ...byRegister.woodwind, ...byRegister.strings],
    ).filter((id) => !foregroundIds.slice(0, 1).includes(id));
    const supportIds = allowed(supportPool, settings, new Set(settings.families[foregroundFamily] === 'limited' ? [foregroundFamily] : []));
    const bassIds = allowed(['db', 'vc', 'bn1', 'tba', 'cbn', 'bcl'], settings, new Set());
    const ending = phrase.endBar === 24;
    const counterline = !ending && phrase.kind === 'development' && settings.counterline === 'when-source-allows' && melodyCount(phrase.id) >= 3 && settings.activity !== 'sparse'
      ? 'offer'
      : 'silence';
    const answerIds = allowed(
      foregroundFamily === 'woodwind' ? [...STRING_MID, ...BRASS_MID] : [...WOOD_MID, ...STRING_MID],
      settings,
      new Set(),
    );
    let percussion: SymphonicPhrasePlan['percussion'] = 'none';
    if (!ending && settings.activity !== 'sparse' && settings.families.percussion !== 'off') {
      if (phrase.kind === 'development' && !percussionUsed) {
        percussion = 'bass-drum';
        percussionUsed = true;
      } else if (phrase.kind === 'return' && settings.families.percussion === 'open') {
        percussion = 'cymbal';
      }
    }
    const plan: SymphonicPhrasePlan = {
      phraseId: phrase.id,
      startBar: phrase.startBar,
      endBar: phrase.endBar,
      kind: phrase.kind,
      foregroundFamily,
      foregroundIds,
      supportIds,
      bassIds,
      counterline,
      answerIds,
      register,
      dynamic: ending ? 'mp' : phrase.kind === 'statement' ? 'p' : 'mf',
      doubling: settings.activity === 'full' && !ending && phrase.kind !== 'statement',
      harp: !ending && settings.families.harp !== 'off' && settings.activity !== 'sparse',
      timpani: !ending && settings.families.percussion !== 'off' && settings.activity !== 'sparse',
      percussion,
      previousFamily: previous,
    };
    previous = foregroundFamily;
    if (!opening) opening = foregroundFamily;
    return plan;
  });
}

export function capabilityPitch(partId: string): { sounding: number; detail: string } {
  const slot = SYMPHONIC_SLOTS.find((item) => item.partId === partId);
  if (!slot) return { sounding: 0, detail: 'unknown part' };
  if (slot.instrumentId === 'orchestral_percussion') return { sounding: 36, detail: 'bass drum GM 36' };
  const spec = getInstrument(slot.instrumentId);
  const range = spec.soundingHardRange;
  if (!range) return { sounding: 0, detail: 'no range' };
  const sounding = Math.round((range[0] + range[1]) / 2);
  return { sounding, detail: `${slot.name} ${range[0]}–${range[1]}` };
}

export function foldIntoRange(midi: number, range: readonly [number, number]): number | null {
  let value = midi;
  let guard = 0;
  while (value > range[1] && guard < 8) {
    value -= 12;
    guard += 1;
  }
  while (value < range[0] && guard < 8) {
    value += 12;
    guard += 1;
  }
  return value >= range[0] && value <= range[1] ? value : null;
}

export const TIMPANI_RANGE: readonly [number, number] = [38, 60];
export const HARP_RANGE: readonly [number, number] = [23, 104];
export const BASS_DRUM_GM = 36;
export const SUSPENDED_CYMBAL_GM = 57;
