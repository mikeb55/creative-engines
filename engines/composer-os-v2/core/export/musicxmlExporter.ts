/**
 * Composer OS V2 — MusicXML exporter
 * Converts ScoreModel to MusicXML. Single source of truth is the score model.
 * Durations: fixed divisions/quarter (480); <duration> and <type>/<dot/> from one tick value (musicXmlTickEncoding).
 */

import type { MusicXmlExportResult, MusicXmlExportOptions } from './exportTypes';
import { normalizeChordToken } from '../harmony/chordProgressionParser';
import type { ScoreModel, PartModel, MeasureModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { DIVISIONS, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';
import { buildHarmonyXmlLine } from './chordSymbolMusicXml';
import {
  GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND,
  GUITAR_BASS_DUO_BASS_PART_NAME,
} from '../instrument-profiles/guitarBassDuoExportNames';
import {
  beatSpanToTicks,
  decomposeTicksToMinimalParts,
  decomposeTicksToStandardParts,
  typeAndDotsXml,
  tickSpecForLength,
} from './musicXmlTickEncoding';
import { midiToPitch, noteXmlPitchedFragment, noteXmlRestFragment } from './musicXmlNoteFragment';
import { logGuitarVoice2CheckpointFromScore } from '../goldenPath/phaseAGuitarPolyphonyProbe';
import { assertNoteXmlCanonicalChildOrder, assertSibeliusExportMeasureStructure } from './exportMeasureStructureAssert';
import {
  adjacentBarsMeterDiffers,
  resolveMeterForBar,
  resolveMeasureDivisionsForBar,
} from '../rhythm/oddMeterQuantiser';

function isBigBandPianoPart(p: PartModel): boolean {
  return p.instrumentIdentity === 'big_band_piano' || p.id === 'bb_piano';
}

function isStringQuartetPianoPart(p: PartModel): boolean {
  return p.instrumentIdentity === 'string_quartet_piano' || p.id === 'sq_piano';
}

/**
 * Song Mode keyboard-centric primary, or **Frank Zappa** comp (duo `guitar` part): harmony staff exported as
 * **Piano** / GM 1 (same part id `guitar`, `songModePresentAsPianoComp` on the part model).
 */
function isSongModeKeysCompPianoPart(p: PartModel): boolean {
  if (p.id !== 'guitar') return false;
  if (p.songModePresentAsPianoComp === true) return true;
  /** Duo staff labelled Piano (e.g. Frank Zappa / phrase-first) must get `<part-name>Piano</part-name>` + GM 1. */
  return p.name === 'Piano';
}

function partDisplayNameForExport(p: PartModel): string {
  if (p.instrumentIdentity === 'acoustic_upright_bass') {
    // Big Band bass uses p.name ('Double Bass');
    // Guitar-Bass Duo uses the duo constant ('Upright Bass')
    if (p.name === 'Double Bass') return p.name;
    return GUITAR_BASS_DUO_BASS_PART_NAME;
  }
  if (isBigBandPianoPart(p) || isStringQuartetPianoPart(p) || isSongModeKeysCompPianoPart(p)) {
    return 'Piano';
  }
  return p.name;
}

function instrumentSoundXmlForPart(p: PartModel): string {
  if (p.instrumentIdentity === 'acoustic_upright_bass') {
    return `<instrument-sound>${GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND}</instrument-sound>`;
  }
  if (p.instrumentIdentity === 'big_band_jazz_drums') {
    return '';
  }
  if (isBigBandPianoPart(p) || isStringQuartetPianoPart(p) || isSongModeKeysCompPianoPart(p)) {
    return '<instrument-sound>keyboard.piano</instrument-sound>';
  }
  return '';
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Short names for part-list / Sibelius score manager (part id → abbreviation). */
const PART_ABBREV: Record<string, string> = {
  bb_alto_sax: 'Alt.',
  bb_tenor_sax: 'Ten.',
  bb_trumpets: 'Tpt.',
  bb_trombones: 'Tbn.',
  bb_rhythm_section: 'Bas.',
  bb_piano: 'Pno.',
  bb_drums: 'Dr.',
  sq_violin_1: 'Vln.I',
  sq_violin_2: 'Vln.II',
  sq_viola: 'Vla.',
  sq_cello: 'Vc.',
  sq_piano: 'Pno.',
  guitar: 'Gtr.',
  bass: 'Bas.',
  zappa_solo: 'Elec.',
};

/** Quarter-note BPM for MusicXML metronome / sound — export options override score model; default 120. */
function resolveExportBpm(opts: MusicXmlExportOptions, score: ScoreModel): number {
  const raw = opts.bpm ?? score.tempo ?? 120;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 120;
  return Math.min(500, Math.max(20, n));
}

/** Song form sections on score (attached in runGoldenPath when `formId` is set); not on `ScoreModel` type. */
type FormSectionExport = { startBar: number; label: string };

function rehearsalLabelFromScoreForm(score: ScoreModel, measureNumber: number): string | undefined {
  const sections = (score as unknown as { formSections?: FormSectionExport[] }).formSections;
  if (!sections || sections.length <= 1) return undefined;
  const sec = sections.find((s) => s.startBar === measureNumber);
  return sec?.label;
}

/** Human-readable section label for &lt;rehearsal&gt; (underscores → spaces, title-case words). */
function formatSectionRehearsalLabel(raw: string): string {
  const t = raw.trim().replace(/_/g, ' ');
  if (!t) return '';
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** V3.4e — stable bar order for export; MusicXML `number` is assigned 1..n separately (Sibelius-safe). */
function measuresInExportOrder(part: PartModel): MeasureModel[] {
  return [...part.measures].sort((a, b) => a.index - b.index);
}

function tieXmlForSplitIndex(i: number, n: number): string {
  if (n <= 1) return '';
  if (i === 0) return '<tie type="start"/>';
  if (i === n - 1) return '<tie type="stop"/>';
  return '<tie type="stop"/><tie type="start"/>';
}

/** Explicit staff 1 on each event — required by some importers for single-staff multi-voice (Sibelius, GP8). */
const STAFF_1_XML = '<staff>1</staff>';

function emitRestTicks(parts: number[], voice: number, staffXml?: string): string {
  let xml = '';
  for (const t of parts) {
    const spec = tickSpecForLength(t);
    xml += noteXmlRestFragment({
      durationTicks: t,
      voice,
      typeAndDotsXml: typeAndDotsXml(spec),
      ...(staffXml ? { staffXml } : {}),
    });
  }
  return xml;
}

function emitPitchedTicks(
  parts: number[],
  voice: number,
  pitchXml: string,
  articulationXml: string,
  dynAttr: string,
  chordXml = '',
  stemXml?: string,
  staffXml?: string
): string {
  let xml = '';
  const n = parts.length;
  for (let i = 0; i < n; i++) {
    const t = parts[i]!;
    const spec = tickSpecForLength(t);
    const tie = tieXmlForSplitIndex(i, n);
    xml += noteXmlPitchedFragment({
      dynamicsAttr: dynAttr,
      chordXml,
      pitchXml,
      durationTicks: t,
      tieXml: tie,
      voice,
      typeAndDotsXml: typeAndDotsXml(spec),
      stemXml,
      ...(staffXml ? { staffXml } : {}),
      notationsXml: i === 0 ? articulationXml : '',
    });
  }
  return xml;
}

/** Odd voices stem up, even stem down — matches common two-layer staff convention for import software. */
function stemXmlForMultiVoiceLayer(voice: number, multiVoice: boolean): string | undefined {
  if (!multiVoice) return undefined;
  return voice % 2 === 1 ? '<stem>up</stem>' : '<stem>down</stem>';
}

/**
 * Same tick arithmetic as `eventsToXml` for one voice — parity with written XML.
 */
export function computeVoiceExportDivisionSum(
  measure: MeasureModel,
  voice: number,
  measureCapacity: number = MEASURE_DIVISIONS
): number {
  const voiceEvents = [...measure.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord')
    .filter((e) => (e.voice ?? 1) === voice)
    .sort((a, b) => a.startBeat - b.startBeat);
  let cursor = 0;
  let sum = 0;
  for (const e of voiceEvents) {
    const sb = e.startBeat;
    const eb = sb + e.duration;
    const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb, measureCapacity);
    const safeStart = Math.max(startDiv, cursor);
    if (endDiv <= safeStart) continue;
    if (safeStart > cursor) {
      const restDiv = safeStart - cursor;
      sum += restDiv;
      cursor = safeStart;
    }
    const durDiv = endDiv - safeStart;
    sum += durDiv;
    cursor = endDiv;
  }
  if (cursor < measureCapacity) {
    sum += measureCapacity - cursor;
  }
  return sum;
}

const DRUM_GM_HH = 42;
const DRUM_GM_BD = 36;
const DRUM_GM_SN = 38;

function drumUnpitchedDisplay(step: string, octave: number): string {
  return `<unpitched><display-step>${step}</display-step><display-octave>${octave}</display-octave></unpitched>`;
}

function drumKitNoteXml(opts: {
  chord: boolean;
  step: string;
  octave: number;
  ticks480: number;
  voice: number;
  stem: 'up' | 'down';
  notehead?: 'x' | 'normal';
  instrumentId: string;
}): string {
  const spec = tickSpecForLength(opts.ticks480);
  const typeDots = typeAndDotsXml(spec);
  const durXml = opts.ticks480;
  const nh = opts.notehead === 'x' ? '<notehead>x</notehead>' : '';
  const chordEl = opts.chord ? '<chord/>' : '';
  return `        <note>${chordEl}${drumUnpitchedDisplay(opts.step, opts.octave)}<duration>${durXml}</duration><instrument id="${opts.instrumentId}"/><voice>${opts.voice}</voice>${typeDots}<stem>${opts.stem}</stem>${nh}<staff>1</staff></note>\n`;
}

/** Big Band drums: Sibelius-style unpitched kit, two voices, backup between layers. */
function bigBandDrumsEventsToXml(
  measure: MeasureModel,
  measureIndex: number,
  part: PartModel,
  decompose: (ticks: number) => number[],
  _opts: MusicXmlExportOptions,
  measureCapacity: number
): string {
  const partId = part.id;
  const instId = `${part.id}-I1`;
  let raw = measure.events.filter((e) => e.kind === 'note' || e.kind === 'rest');
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const e of raw) {
    const v = e.voice ?? 1;
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v)!.push(e);
  }
  const voices = [...byVoice.keys()].sort((a, b) => a - b);
  const staffPolyphonyXml = STAFF_1_XML;
  const debugTicks = typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_MUSICXML_TICKS === '1';

  let xml = '';
  for (let vi = 0; vi < voices.length; vi++) {
    const voice = voices[vi]!;
    if (vi > 0) {
      xml += `        <backup><duration>${measureCapacity}</duration></backup>\n`;
    }
    let cursor = 0;
    const voiceEvents = [...(byVoice.get(voice) ?? [])].sort((a, b) => {
      if (a.startBeat !== b.startBeat) return a.startBeat - b.startBeat;
      if (a.kind === 'note' && b.kind === 'note') return a.pitch - b.pitch;
      return 0;
    });
    let voiceTickSum = 0;
    let i = 0;
    while (i < voiceEvents.length) {
      const e = voiceEvents[i]!;
      const sb = e.startBeat;
      const eb = sb + e.duration;
      const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb, measureCapacity);
      const safeStart = Math.max(startDiv, cursor);
      if (endDiv <= safeStart) {
        i++;
        continue;
      }

      if (safeStart > cursor) {
        const restDiv = safeStart - cursor;
        const parts = decompose(restDiv);
        xml += emitRestTicks(parts, voice, staffPolyphonyXml);
        for (const p of parts) voiceTickSum += p;
        cursor = safeStart;
      }

      const durDiv = endDiv - safeStart;
      const parts = decompose(durDiv);

      if (e.kind === 'rest') {
        xml += emitRestTicks(parts, voice, staffPolyphonyXml);
        for (const p of parts) voiceTickSum += p;
        cursor = endDiv;
        i++;
        continue;
      }

      if (voice === 1) {
        if (e.kind !== 'note' || e.pitch !== DRUM_GM_HH) {
          const eMsg = e as ScoreEvent;
          throw new Error(
            `MusicXML export: part ${partId} measure ${measureIndex + 1} voice 1 drum layer expects hi-hat (GM ${DRUM_GM_HH}), got ${
              eMsg.kind === 'note' ? `pitch ${eMsg.pitch}` : eMsg.kind
            }`
          );
        }
        for (const t of parts) {
          xml += drumKitNoteXml({
            chord: false,
            step: 'F',
            octave: 5,
            ticks480: t,
            voice: 1,
            stem: 'up',
            notehead: 'x',
            instrumentId: instId,
          });
          voiceTickSum += t;
        }
        cursor = endDiv;
        i++;
        continue;
      }

      /** Voice 2: bass drum quarters; motifRef bb_drum_bs = kick+snare chord (same duration as one quarter). */
      if (voice === 2 && e.kind === 'note' && e.pitch === DRUM_GM_BD) {
        const motif = (e as { motifRef?: string }).motifRef;
        if (motif === 'bb_drum_bs') {
          for (const t of parts) {
            xml += drumKitNoteXml({
              chord: false,
              step: 'F',
              octave: 4,
              ticks480: t,
              voice: 2,
              stem: 'down',
              notehead: 'normal',
              instrumentId: instId,
            });
            xml += drumKitNoteXml({
              chord: true,
              step: 'D',
              octave: 4,
              ticks480: t,
              voice: 2,
              stem: 'down',
              notehead: 'x',
              instrumentId: instId,
            });
            voiceTickSum += t;
          }
          cursor = endDiv;
          i++;
          continue;
        }
        for (const t of parts) {
          xml += drumKitNoteXml({
            chord: false,
            step: 'F',
            octave: 4,
            ticks480: t,
            voice: 2,
            stem: 'down',
            notehead: 'normal',
            instrumentId: instId,
          });
          voiceTickSum += t;
        }
        cursor = endDiv;
        i++;
        continue;
      }

      const eThrow = e as ScoreEvent;
      throw new Error(
        `MusicXML export: part ${partId} measure ${measureIndex + 1} voice ${voice}: unsupported drum event (${
          eThrow.kind === 'note' ? `pitch ${eThrow.pitch}` : eThrow.kind
        })`
      );
    }

    if (cursor < measureCapacity) {
      const restDiv = measureCapacity - cursor;
      const parts = decompose(restDiv);
      xml += emitRestTicks(parts, voice, staffPolyphonyXml);
      for (const p of parts) voiceTickSum += p;
    }

    if (voiceTickSum !== measureCapacity) {
      throw new Error(
        `MusicXML export: part ${partId} measure ${measureIndex + 1} voice ${voice}: tick sum ${voiceTickSum} ≠ expected ${measureCapacity} (bb drums)`
      );
    }
    if (debugTicks) {
      console.log(
        `[MusicXML ticks] part=${partId} measure=${measureIndex + 1} voice=${voice} sum=${voiceTickSum} expected=${measureCapacity}`
      );
    }
  }

  return xml;
}

function eventsToXml(
  measure: MeasureModel,
  measureIndex: number,
  part: PartModel,
  decompose: (ticks: number) => number[],
  opts: MusicXmlExportOptions,
  preferFlats: boolean,
  /** When any measure in this part uses voice 2, emit voice 1 → backup → voice 2 in every measure (voice 2 rests if empty). Sibelius requires this; sparse duo bars often only had v1 in the score model. */
  forceDualVoiceSecondLayer: boolean,
  measureCapacity: number
): string {
  const partId = part.id;
  let raw = measure.events.filter((e) => e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord');
  if (opts.bassStaffVoice1Only && part.instrumentIdentity === 'acoustic_upright_bass') {
    raw = raw.map((e) => ({ ...e, voice: 1 }));
  }
  /** Per-voice buckets — never interleave voices; each layer sorted by time only within that voice. */
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const e of raw) {
    const v = e.voice ?? 1;
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v)!.push(e);
  }
  if (forceDualVoiceSecondLayer && part.instrumentIdentity === 'clean_electric_guitar' && !byVoice.has(2)) {
    byVoice.set(2, []);
  }
  const voices = [...byVoice.keys()].sort((a, b) => a - b);
  const multiVoice = voices.length > 1;
  const staffPolyphonyXml =
    multiVoice && part.instrumentIdentity === 'clean_electric_guitar' ? STAFF_1_XML : undefined;
  const debugTicks = typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_MUSICXML_TICKS === '1';

  let xml = '';
  for (let vi = 0; vi < voices.length; vi++) {
    const voice = voices[vi];
    if (vi > 0) {
      /** Full-measure rewind so voice 2+ starts at beat 0 in the notation stream (MusicXML multi-voice contract). */
      xml += `        <backup><duration>${measureCapacity}</duration></backup>\n`;
    }
    let cursor = 0;
    const voiceEvents = [...(byVoice.get(voice) ?? [])].sort((a, b) => {
      if (a.startBeat !== b.startBeat) return a.startBeat - b.startBeat;
      const rankTimed = (x: ScoreEvent) => (x.kind === 'note' || x.kind === 'chord' ? 0 : 1);
      const aR = rankTimed(a);
      const bR = rankTimed(b);
      if (aR !== bR) return aR - bR;
      if (a.kind === 'note' && b.kind === 'note') {
        if (a.duration !== b.duration) return b.duration - a.duration;
        return ((a as { pitch?: number }).pitch ?? 0) - ((b as { pitch?: number }).pitch ?? 0);
      }
      if (a.kind === 'chord' && b.kind === 'chord') {
        if (a.duration !== b.duration) return b.duration - a.duration;
        return (a.pitches[0] ?? 0) - (b.pitches[0] ?? 0);
      }
      if (a.kind === 'note' && b.kind === 'chord') return -1;
      if (a.kind === 'chord' && b.kind === 'note') return 1;
      return 0;
    });
    const stemXml = stemXmlForMultiVoiceLayer(voice, multiVoice);
    let voiceTickSum = 0;

    for (let i = 0; i < voiceEvents.length; i++) {
      const e = voiceEvents[i]!;
      const sb = e.startBeat;
      const eb = sb + e.duration;
      const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb, measureCapacity);
      const safeStart = Math.max(startDiv, cursor);
      if (endDiv <= safeStart) {
        continue;
      }

      const nextE = voiceEvents[i + 1];
      const nextSharesBeat = nextE !== undefined && nextE.startBeat === sb;
      if (safeStart > cursor && !nextSharesBeat) {
        const restDiv = safeStart - cursor;
        const parts = decompose(restDiv);
        xml += emitRestTicks(parts, voice, staffPolyphonyXml);
        for (const p of parts) voiceTickSum += p;
        cursor = safeStart;
      }

      const durDiv = endDiv - safeStart;
      const parts = decompose(durDiv);
      if (e.kind === 'chord') {
        const chordEv = e;
        const firstTicks = parts[0]!;
        const spec = tickSpecForLength(firstTicks);
        const typeDots = typeAndDotsXml(spec);
        const stem = stemXml ?? '';
        const staff = staffPolyphonyXml ?? '';
        for (let pi = 0; pi < chordEv.pitches.length; pi++) {
          const mid = chordEv.pitches[pi]!;
          const { step, alter, octave } = midiToPitch(mid, preferFlats);
          const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
          const pitchXml = `<pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>`;
          if (pi === 0) {
            xml += emitPitchedTicks(parts, voice, pitchXml, '', '', '', stemXml, staffPolyphonyXml);
          } else {
            /**
             * Stacked chord tones: same onset/duration as the first notehead (`firstTicks`), regardless of tie decomposition length on pitch 0.
             * Smoke (`npm run test:smoke`, post-fix): the four Indie guitar_2 ChordEvent quality rows still FAIL — they probe in-memory ScoreModel / thinVoice1Peak, not MusicXML. Other unrelated smoke FAILs observed: indie alias route, separate-tuning substitution guardrail, tuning-proof fixture.
             */
            xml += noteXmlPitchedFragment({
              dynamicsAttr: '',
              chordXml: '<chord/>',
              pitchXml,
              durationTicks: firstTicks,
              tieXml: '',
              voice,
              typeAndDotsXml: typeDots,
              stemXml: stem,
              staffXml: staff,
              notationsXml: '',
            });
          }
        }
        for (const p of parts) voiceTickSum += p;
        cursor = endDiv;
        continue;
      }
      if (e.kind === 'rest') {
        xml += emitRestTicks(parts, voice, staffPolyphonyXml);
      } else {
        let groupLastIdx = i;
        while (groupLastIdx + 1 < voiceEvents.length) {
          const next = voiceEvents[groupLastIdx + 1]!;
          if (next.kind !== 'note') break;
          if (next.startBeat !== sb) break;
          groupLastIdx++;
        }
        const grouped = voiceEvents.slice(i, groupLastIdx + 1).filter((x): x is Extract<typeof x, { kind: 'note' }> => x.kind === 'note');
        /** Bass `NoteEvent.pitch` is concert MIDI (same as score model; see upright bass hard range). */
        for (let gi = 0; gi < grouped.length; gi++) {
          const note = grouped[gi]!;
          const exportMidi = note.pitch;
          const { step, alter, octave } = midiToPitch(exportMidi, preferFlats);
          const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
          const pitchXml = `<pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>`;
          const art = (note as { articulation?: string }).articulation;
          const notationsEl = art ? `<notations><articulations><${art}/></articulations></notations>` : '';
          const vel = (note as { velocity?: number }).velocity;
          const dynAttr =
            vel !== undefined
              ? ` dynamics="${Math.min(100, Math.max(0, (vel / 127) * 100)).toFixed(2)}"`
              : '';
          xml += emitPitchedTicks(
            parts,
            voice,
            pitchXml,
            notationsEl,
            dynAttr,
            gi > 0 ? '<chord/>' : '',
            stemXml,
            staffPolyphonyXml
          );
          const stack = note.pitches;
          if (stack && stack.length > 1 && parts.length === 1) {
            const durTicks = parts[0]!;
            const spec = tickSpecForLength(durTicks);
            const typeDots = typeAndDotsXml(spec);
            for (let pi = 1; pi < stack.length; pi++) {
              const { step: s2, alter: a2, octave: o2 } = midiToPitch(stack[pi]!, preferFlats);
              const alterEl2 = a2 !== 0 ? `<alter>${a2}</alter>` : '';
              const pitchXml2 = `<pitch><step>${s2}</step>${alterEl2}<octave>${o2}</octave></pitch>`;
              xml += noteXmlPitchedFragment({
                dynamicsAttr: '',
                chordXml: '<chord/>',
                pitchXml: pitchXml2,
                durationTicks: durTicks,
                tieXml: '',
                voice,
                typeAndDotsXml: typeDots,
                stemXml: stemXml ?? '',
                staffXml: staffPolyphonyXml ?? '',
                notationsXml: '',
              });
            }
          }
        }
        i = groupLastIdx;
      }
      for (const p of parts) voiceTickSum += p;
      cursor = endDiv;
    }

    if (cursor < measureCapacity) {
      const restDiv = measureCapacity - cursor;
      const parts = decompose(restDiv);
      xml += emitRestTicks(parts, voice, staffPolyphonyXml);
      for (const p of parts) voiceTickSum += p;
    }

    if (voiceTickSum !== measureCapacity) {
      throw new Error(
        `MusicXML export: part ${partId} measure ${measureIndex + 1} voice ${voice}: tick sum ${voiceTickSum} ≠ expected ${measureCapacity} (measure divisions)`
      );
    }
    if (debugTicks) {
      console.log(
        `[MusicXML ticks] part=${partId} measure=${measureIndex + 1} voice=${voice} sum=${voiceTickSum} expected=${measureCapacity}`
      );
    }
  }

  return xml;
}

/** Export ScoreModel to MusicXML string. */
export function exportScoreModelToMusicXml(score: ScoreModel, options?: MusicXmlExportOptions): MusicXmlExportResult {
  try {
    logGuitarVoice2CheckpointFromScore('B-pre-export', score);
    const opts: MusicXmlExportOptions = options ?? {};
    console.log('[METER_DEBUG] barMeterMap:', opts.barMeterMap);
    const USE_ENHARMONIC_SPELLING = true;
    const preferFlats = USE_ENHARMONIC_SPELLING && (score.keySignature?.fifths ?? 0) < 0;
    const dbg = score.keySignatureExportDebug;
    const ks0 = score.keySignature;
    if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_KEY_XML === '1') {
      console.log('[V3.4c exportScoreModelToMusicXml]', {
        inferredKey: dbg?.inferredKey,
        inferredFifths: dbg?.inferredFifths,
        exportKeyWritten: dbg?.exportKeyWritten,
        xmlFifths: ks0?.fifths ?? 0,
        xmlMode: ks0?.mode ?? 'major',
        xmlHideKey: ks0?.hideKeySignature ?? false,
      });
      const bbPianoDbg = score.parts.find(
        (pp) => isBigBandPianoPart(pp) && !isStringQuartetPianoPart(pp)
      );
      if (bbPianoDbg) {
        console.log(
          '[musicxml-export] Big Band piano part id:',
          JSON.stringify(bbPianoDbg.id),
          'instrumentIdentity:',
          bbPianoDbg.instrumentIdentity
        );
      }
    }

    const partList = score.parts
      .map((p) => {
        if (p.instrumentIdentity === 'big_band_jazz_drums') {
          return `    <score-part id="${p.id}">
      <part-name>Drum Set</part-name>
      <score-instrument id="${p.id}-I1"><instrument-name>Drum Set</instrument-name></score-instrument>
    </score-part>`;
        }
        /** Big Band (`bb_piano`) + String Quartet (`sq_piano`): Sibelius-friendly piano part-list + GM Acoustic Grand (ch. 1, program 1). */
        if (isBigBandPianoPart(p) || isStringQuartetPianoPart(p) || isSongModeKeysCompPianoPart(p)) {
          return `    <score-part id="${p.id}">
      <part-name>Piano</part-name>
      <part-abbreviation>Pno.</part-abbreviation>
      <score-instrument id="${p.id}-I1">
        <instrument-name>Piano</instrument-name>
        <instrument-sound>keyboard.piano</instrument-sound>
      </score-instrument>
      <midi-instrument id="${p.id}-I1">
        <midi-channel>1</midi-channel>
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>`;
        }
        const mxProg = Math.min(128, Math.max(1, p.midiProgram + 1));
        const display = partDisplayNameForExport(p);
        const scoreInstName = p.scoreInstrumentName ?? display;
        const soundEl = instrumentSoundXmlForPart(p);
        const abbrev = PART_ABBREV[p.id] ?? '';
        const partAbbrevXml = abbrev ? `\n      <part-abbreviation>${escapeXml(abbrev)}</part-abbreviation>` : '';
        const midiInstrumentBody = `        <midi-program>${mxProg}</midi-program>`;
        return `    <score-part id="${p.id}">
      <part-name>${escapeXml(display)}</part-name>${partAbbrevXml}
      <score-instrument id="${p.id}-I1"><instrument-name>${escapeXml(scoreInstName)}</instrument-name>${soundEl ? `\n        ${soundEl}` : ''}</score-instrument>
      <midi-instrument id="${p.id}-I1">
${midiInstrumentBody}
      </midi-instrument>
    </score-part>`;
      })
      .join('\n');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(score.title)}</work-title></work>
  <part-list>
${partList}
  </part-list>
`;

    for (let partIndex = 0; partIndex < score.parts.length; partIndex++) {
      const part = score.parts[partIndex];
      const isBigBandDrums = part.instrumentIdentity === 'big_band_jazz_drums';
      const clefSign = part.clef === 'bass' ? 'F' : 'G';
      const clefLine = part.clef === 'bass' ? 4 : 2;
      const clefOctaveChangeXml = '';
      let clefXml: string;
      if (isBigBandDrums) {
        clefXml = '<clef number="1"><sign>percussion</sign><line>2</line></clef>';
      } else if (
        part.instrumentIdentity === 'string_quartet_viola' ||
        part.instrumentIdentity === 'viola' ||
        part.id === 'sq_viola'
      ) {
        clefXml = '<clef><sign>C</sign><line>3</line></clef>';
      } else {
        clefXml = `<clef><sign>${clefSign}</sign><line>${clefLine}</line>${clefOctaveChangeXml}</clef>`;
      }
      xml += `  <part id="${part.id}">\n`;

      const orderedMeasures = measuresInExportOrder(part);
      const forceDualVoiceSecondLayer =
        part.instrumentIdentity === 'clean_electric_guitar' &&
        orderedMeasures.some((mm) =>
          mm.events.some(
            (e) => (e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord') && (e.voice ?? 1) === 2
          )
        );
      for (let i = 0; i < orderedMeasures.length; i++) {
        const m = orderedMeasures[i];
        const measureNumber = i + 1;
        const measureCapacity = resolveMeasureDivisionsForBar(measureNumber, opts.barMeterMap);
        const decompose = opts.minimizeNoteFragmentation
          ? (ticks: number) => decomposeTicksToMinimalParts(ticks, measureCapacity)
          : (ticks: number) => decomposeTicksToStandardParts(ticks, measureCapacity);
        xml += `  <measure number="${measureNumber}">\n`;

        if (i === 0) {
          const ks = score.keySignature;
          const fifths = ks?.fifths ?? 0;
          const keyMode = ks?.mode ?? 'major';
          const hideKey = ks?.hideKeySignature ?? false;
          const printAttr = hideKey ? ' print-object="no"' : '';
          const meter0 = resolveMeterForBar(1, opts.barMeterMap);
          xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key${printAttr}><fifths>${fifths}</fifths><mode>${keyMode}</mode></key>
      <time><beats>${meter0.numerator}</beats><beat-type>${meter0.denominator}</beat-type></time>
      <staves>1</staves>
      ${clefXml}
    </attributes>
`;
        } else if (opts.barMeterMap && i >= 1 && adjacentBarsMeterDiffers(i, i + 1, opts.barMeterMap)) {
          const mm = resolveMeterForBar(i + 1, opts.barMeterMap);
          xml += `    <attributes>
      <time><beats>${mm.numerator}</beats><beat-type>${mm.denominator}</beat-type></time>
    </attributes>
`;
        }

        if (i === 0 && partIndex === 0) {
          const bpm = resolveExportBpm(opts, score);
          xml += `    <direction placement="above">
      <direction-type>
        <metronome>
          <beat-unit>quarter</beat-unit>
          <per-minute>${bpm}</per-minute>
        </metronome>
      </direction-type>
      <sound tempo="${bpm}"/>
    </direction>
`;
        }

        /**
         * Sibelius-strict sibling order: beat-1 &lt;harmony&gt; BEFORE first &lt;note&gt; (not after &lt;sound&gt;/&lt;direction&gt;).
         * Single chord writer: lead-sheet harmony only on the guitar part (not bass, not by index).
         */
        const assertLocked = opts.assertLockedHarmonyBars;
        const lockedChord =
          assertLocked &&
          assertLocked.length === orderedMeasures.length &&
          i < assertLocked.length
            ? assertLocked[i]
            : undefined;
        const chordForHarmony = lockedChord ?? m.chord;
        /** Lead-sheet chord symbols: duo harmony staff only (`guitar` / ensemble piano), never bass or Zappa solo. */
        const writesLeadSheetHarmony =
          chordForHarmony &&
          !opts.omitChordSymbols &&
          (part.id === 'guitar' || isBigBandPianoPart(part) || isStringQuartetPianoPart(part));
        if (writesLeadSheetHarmony) {
          if (
            part.id === 'guitar' &&
            assertLocked &&
            assertLocked.length === orderedMeasures.length &&
            i < assertLocked.length
          ) {
            const exp = assertLocked[i]!;
            const got = m.chord ?? '';
            if (got && normalizeChordToken(got) !== normalizeChordToken(exp)) {
              throw new Error(
                `CUSTOM HARMONY NOT REACHING GOLDEN PATH: MusicXML export bar ${measureNumber} score chord "${got}" !== locked "${exp}"`
              );
            }
          }
          xml += buildHarmonyXmlLine(chordForHarmony);
        }

        const measure1TuningWords = score.exportMeasure1TuningWordsByPartId?.[part.id];
        if (i === 0 && measure1TuningWords) {
          xml += `    <direction placement="above"><direction-type><words>${escapeXml(
            measure1TuningWords
          )}</words></direction-type></direction>\n`;
        }

        if (i === 0) {
          const feelEl =
            partIndex === 0 && score.feelProfile
              ? `    <direction placement="below"><direction-type><words>${escapeXml(
                  `Feel: ${score.feelProfile.tempoFeel}; straight notation (export); duo`
                )}</words></direction-type></direction>\n`
              : '';
          const ks = score.keySignature;
          const keyCaption =
            partIndex === 0 && ks?.caption
              ? `    <direction placement="above"><direction-type><words>${escapeXml(ks.caption)}</words></direction-type></direction>\n`
              : '';
          xml += `${keyCaption}${feelEl}`;
        }

        /** Section rehearsal marks once on top staff (part 0); after harmony/sound so beat-1 chord stays first. */
        if (partIndex === 0) {
          const formRehearsalLabel = rehearsalLabelFromScoreForm(score, measureNumber);
          if (formRehearsalLabel) {
            xml += `    <direction placement="above"><direction-type><rehearsal enclosure="rectangle">${escapeXml(
              formRehearsalLabel
            )}</rehearsal></direction-type></direction>\n`;
          }
          if (m.rehearsalMark) {
            xml += `    <direction placement="above"><direction-type><rehearsal enclosure="rectangle">${escapeXml(
              formatSectionRehearsalLabel(m.rehearsalMark)
            )}</rehearsal></direction-type></direction>\n`;
          }
        }

        xml +=
          part.instrumentIdentity === 'big_band_jazz_drums'
            ? bigBandDrumsEventsToXml(m, i, part, decompose, opts, measureCapacity)
            : eventsToXml(m, i, part, decompose, opts, preferFlats, forceDualVoiceSecondLayer, measureCapacity);
        xml += `  </measure>\n`;
      }
      xml += `  </part>\n`;
    }

    xml += `</score-partwise>
`;
    assertSibeliusExportMeasureStructure(xml);
    assertNoteXmlCanonicalChildOrder(xml);
    return { success: true, xml, errors: [] };
  } catch (e) {
    return {
      success: false,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}

/** Legacy stub — delegates to exportScoreModelToMusicXml when input is ScoreModel. */
export function exportToMusicXml(input: unknown, options?: MusicXmlExportOptions): MusicXmlExportResult {
  if (input && typeof input === 'object' && 'title' in input && 'parts' in input) {
    return exportScoreModelToMusicXml(input as ScoreModel, options);
  }
  return {
    success: false,
    errors: ['Input must be ScoreModel'],
  };
}
