/**
 * Composer OS V2 — MusicXML exporter
 * Converts ScoreModel to MusicXML. Single source of truth is the score model.
 * Durations: fixed divisions/quarter (480); <duration> and <type>/<dot/> from one tick value (musicXmlTickEncoding).
 */

import * as fs from 'fs';

import type { MusicXmlExportResult, MusicXmlExportOptions } from './exportTypes';
import { normalizeChordToken } from '../harmony/chordProgressionParser';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { DIVISIONS, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';
import { musicXmlKindContentFromKindText, parseChordForMusicXmlHarmony } from './chordSymbolMusicXml';
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

function partDisplayNameForExport(p: PartModel): string {
  if (p.instrumentIdentity === 'acoustic_upright_bass') {
    return GUITAR_BASS_DUO_BASS_PART_NAME;
  }
  return p.name;
}

function instrumentSoundXmlForPart(p: PartModel): string {
  if (p.instrumentIdentity === 'acoustic_upright_bass') {
    return `<instrument-sound>${GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND}</instrument-sound>`;
  }
  return '';
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** V3.4e — stable bar order for export; MusicXML `number` is assigned 1..n separately (Sibelius-safe). */
function measuresInExportOrder(part: PartModel): MeasureModel[] {
  return [...part.measures].sort((a, b) => a.index - b.index);
}

function midiToPitch(midi: number): { step: string; alter: number; octave: number } {
  const semitones = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const stepMap: Record<number, { step: string; alter: number }> = {
    0: { step: 'C', alter: 0 }, 1: { step: 'C', alter: 1 }, 2: { step: 'D', alter: 0 },
    3: { step: 'D', alter: 1 }, 4: { step: 'E', alter: 0 }, 5: { step: 'F', alter: 0 },
    6: { step: 'F', alter: 1 }, 7: { step: 'G', alter: 0 }, 8: { step: 'G', alter: 1 },
    9: { step: 'A', alter: 0 }, 10: { step: 'A', alter: 1 }, 11: { step: 'B', alter: 0 },
  };
  const { step, alter } = stepMap[semitones];
  return { step, alter, octave };
}

function tieXmlForSplitIndex(i: number, n: number): string {
  if (n <= 1) return '';
  if (i === 0) return '<tie type="start"/>';
  if (i === n - 1) return '<tie type="stop"/>';
  return '<tie type="stop"/><tie type="start"/>';
}

function emitRestTicks(parts: number[], voice: number): string {
  let xml = '';
  for (const t of parts) {
    const spec = tickSpecForLength(t);
    xml += `        <note><rest/><duration>${t}</duration>${typeAndDotsXml(spec)}<voice>${voice}</voice></note>\n`;
  }
  return xml;
}

function emitPitchedTicks(
  parts: number[],
  voice: number,
  pitchXml: string,
  articulationXml: string,
  dynAttr: string
): string {
  let xml = '';
  const n = parts.length;
  for (let i = 0; i < n; i++) {
    const t = parts[i];
    const spec = tickSpecForLength(t);
    const tie = tieXmlForSplitIndex(i, n);
    xml += `        <note${dynAttr}>${pitchXml}<duration>${t}</duration>${tie}${typeAndDotsXml(spec)}<voice>${voice}</voice>${i === 0 ? articulationXml : ''}</note>\n`;
  }
  return xml;
}

/**
 * Same tick arithmetic as `eventsToXml` for one voice — parity with written XML.
 */
export function computeVoiceExportDivisionSum(measure: MeasureModel, voice: number): number {
  const sorted = [...measure.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat);
  const voiceEvents = sorted.filter((e) => (e.voice ?? 1) === voice);
  let cursor = 0;
  let sum = 0;
  for (const e of voiceEvents) {
    const sb = e.startBeat;
    const eb = sb + e.duration;
    const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb);
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
  if (cursor < MEASURE_DIVISIONS) {
    sum += MEASURE_DIVISIONS - cursor;
  }
  return sum;
}

function eventsToXml(
  measure: MeasureModel,
  measureIndex: number,
  part: PartModel,
  decompose: (ticks: number) => number[],
  opts: MusicXmlExportOptions
): string {
  const v2count = measure.events.filter((e) => (e as any).voice === 2).length;
  if (v2count > 0) {
    const logLine = `[pre-export] measure=${measureIndex+1} voice2events=${v2count}\n`;
    try {
      fs.appendFileSync('C:/Users/mike/composer-debug.log', logLine);
    } catch {}
  }
  const partId = part.id;
  let sorted = [...measure.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat);
  if (opts.bassStaffVoice1Only && part.instrumentIdentity === 'acoustic_upright_bass') {
    sorted = sorted.map((e) => ({ ...e, voice: 1 }));
  }
  const voices = [...new Set(sorted.map((e) => e.voice ?? 1))].sort((a, b) => a - b);
  const debugTicks = typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_MUSICXML_TICKS === '1';

  let xml = '';
  for (let vi = 0; vi < voices.length; vi++) {
    const voice = voices[vi];
    if (vi > 0) {
      xml += `        <backup><duration>${MEASURE_DIVISIONS}</duration></backup>\n`;
    }
    let cursor = 0;
    cursor = 0;
    const voiceEvents = sorted.filter((e) => (e.voice ?? 1) === voice);
    let voiceTickSum = 0;

    for (const e of voiceEvents) {
      const sb = e.startBeat;
      const eb = sb + e.duration;
      const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb);
      const safeStart = Math.max(startDiv, cursor);
      if (endDiv <= safeStart) {
        continue;
      }

      if (safeStart > cursor) {
        const restDiv = safeStart - cursor;
        const parts = decompose(restDiv);
        xml += emitRestTicks(parts, voice);
        for (const p of parts) voiceTickSum += p;
        cursor = safeStart;
      }

      const durDiv = endDiv - safeStart;
      const parts = decompose(durDiv);
      if (e.kind === 'rest') {
        xml += emitRestTicks(parts, voice);
      } else {
        const { step, alter, octave } = midiToPitch(e.pitch);
        const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
        const pitchXml = `<pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>`;
        const art = (e as { articulation?: string }).articulation;
        const notationsEl = art ? `<notations><articulations><${art}/></articulations></notations>` : '';
        const vel = (e as { velocity?: number }).velocity;
        const dynAttr =
          vel !== undefined
            ? ` dynamics="${Math.min(100, Math.max(0, (vel / 127) * 100)).toFixed(2)}"`
            : '';
        xml += emitPitchedTicks(parts, voice, pitchXml, notationsEl, dynAttr);
      }
      for (const p of parts) voiceTickSum += p;
      cursor = endDiv;
    }

    if (cursor < MEASURE_DIVISIONS) {
      const restDiv = MEASURE_DIVISIONS - cursor;
      const parts = decompose(restDiv);
      xml += emitRestTicks(parts, voice);
      for (const p of parts) voiceTickSum += p;
    }

    if (voiceTickSum !== MEASURE_DIVISIONS) {
      if (voice !== 1) {
        console.warn(`[wyble-export] voice ${voice} tick sum ${voiceTickSum} !== ${MEASURE_DIVISIONS} in measure ${measureIndex + 1} — skipping voice`);
        continue;
      }
      throw new Error(
        `MusicXML export: part ${partId} measure ${measureIndex + 1} voice ${voice}: tick sum ${voiceTickSum} ≠ expected ${MEASURE_DIVISIONS} (divisions×beats=${DIVISIONS}×4)`
      );
    }
    if (debugTicks) {
      console.log(
        `[MusicXML ticks] part=${partId} measure=${measureIndex + 1} voice=${voice} sum=${voiceTickSum} expected=${MEASURE_DIVISIONS}`
      );
    }
  }

  return xml;
}

/** Export ScoreModel to MusicXML string. */
export function exportScoreModelToMusicXml(score: ScoreModel, options?: MusicXmlExportOptions): MusicXmlExportResult {
  try {
    const opts: MusicXmlExportOptions = options ?? {};
    const decompose = opts.minimizeNoteFragmentation ? decomposeTicksToMinimalParts : decomposeTicksToStandardParts;
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
    }

    const partList = score.parts
      .map((p) => {
        const mxProg = Math.min(128, Math.max(1, p.midiProgram + 1));
        const display = partDisplayNameForExport(p);
        const soundEl = instrumentSoundXmlForPart(p);
        return `    <score-part id="${p.id}">
      <part-name>${escapeXml(display)}</part-name>
      <score-instrument id="${p.id}-I1"><instrument-name>${escapeXml(display)}</instrument-name>${soundEl ? `\n        ${soundEl}` : ''}</score-instrument>
      <midi-instrument id="${p.id}-I1">
        <midi-program>${mxProg}</midi-program>
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
      const clefSign = part.clef === 'bass' ? 'F' : 'G';
      const clefLine = part.clef === 'bass' ? 4 : 2;
      xml += `  <part id="${part.id}">\n`;

      const orderedMeasures = measuresInExportOrder(part);
      for (let i = 0; i < orderedMeasures.length; i++) {
        const m = orderedMeasures[i];
        const measureNumber = i + 1;
        xml += `  <measure number="${measureNumber}">\n`;

        if (i === 0) {
          const tempoEl = score.tempo ? `\n    <sound tempo="${score.tempo}"/>` : '';
          const feelEl =
            partIndex === 0 && score.feelProfile
              ? `    <direction placement="below"><direction-type><words>${escapeXml(
                  `Feel: ${score.feelProfile.tempoFeel}; straight notation (export); duo`
                )}</words></direction-type></direction>\n`
              : '';
          const ks = score.keySignature;
          const fifths = ks?.fifths ?? 0;
          const keyMode = ks?.mode ?? 'major';
          const hideKey = ks?.hideKeySignature ?? false;
          const printAttr = hideKey ? ' print-object="no"' : '';
          const keyCaption =
            partIndex === 0 && ks?.caption
              ? `    <direction placement="above"><direction-type><words>${escapeXml(ks.caption)}</words></direction-type></direction>\n`
              : '';
          xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key${printAttr}><fifths>${fifths}</fifths><mode>${keyMode}</mode></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>
    </attributes>${tempoEl}
${keyCaption}${feelEl}`;
        }

        if (m.rehearsalMark) {
          xml += `    <direction placement="above"><direction-type><rehearsal>${escapeXml(m.rehearsalMark)}</rehearsal></direction-type></direction>\n`;
        }
        if (m.chord && !opts.omitChordSymbols) {
          const assertLocked = opts.assertLockedHarmonyBars;
          if (assertLocked && assertLocked.length === orderedMeasures.length && i < assertLocked.length) {
            const exp = assertLocked[i];
            if (normalizeChordToken(m.chord) !== normalizeChordToken(exp ?? '')) {
              throw new Error(
                `CUSTOM HARMONY NOT REACHING GOLDEN PATH: MusicXML export bar ${measureNumber} chord "${m.chord}" !== locked "${exp}"`
              );
            }
          }
          const { rootStep, rootAlter, kindText, bassStep, bassAlter } = parseChordForMusicXmlHarmony(m.chord, {
            literalKind: opts.preserveChordKindLiterals === true,
          });
          const kindContent = musicXmlKindContentFromKindText(kindText);
          const alterEl = rootAlter !== 0 ? `<root-alter>${rootAlter}</root-alter>` : '';
          const bassAlterEl =
            bassStep !== undefined && bassAlter !== undefined && bassAlter !== 0
              ? `<bass-alter>${bassAlter}</bass-alter>`
              : '';
          const bassEl =
            bassStep !== undefined
              ? `<bass><bass-step>${bassStep}</bass-step>${bassAlterEl}</bass>`
              : '';
          xml += `    <harmony><root><root-step>${rootStep}</root-step>${alterEl}</root><kind text="${escapeXml(kindText)}">${escapeXml(kindContent)}</kind>${bassEl}</harmony>\n`;
        }

        xml += eventsToXml(m, i, part, decompose, opts);
        xml += `  </measure>\n`;
      }
      xml += `  </part>\n`;
    }

    xml += `</score-partwise>
`;
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
