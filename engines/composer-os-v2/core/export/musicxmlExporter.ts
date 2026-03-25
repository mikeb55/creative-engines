/**
 * Composer OS V2 — MusicXML exporter
 * Converts ScoreModel to MusicXML. Single source of truth is the score model.
 */

import type { MusicXmlExportResult } from './exportTypes';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { DIVISIONS, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';
import { parseChordForMusicXmlHarmony } from './chordSymbolMusicXml';
import {
  GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND,
  GUITAR_BASS_DUO_BASS_PART_NAME,
} from '../instrument-profiles/guitarBassDuoExportNames';

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

function divisionsToType(divs: number): string {
  if (divs <= 1) return '16th';
  if (divs <= 2) return 'eighth';
  if (divs <= 4) return 'quarter';
  if (divs <= 8) return 'half';
  return 'whole';
}

/** Map beat boundaries to integer divisions so each event's length matches rounded [start,end) span (export round-trip). */
function beatSpanToDivisions(startBeat: number, endBeat: number): { start: number; end: number } {
  const start = Math.min(MEASURE_DIVISIONS, Math.max(0, Math.round(startBeat * DIVISIONS)));
  const end = Math.min(MEASURE_DIVISIONS, Math.max(0, Math.round(endBeat * DIVISIONS)));
  return { start, end: Math.max(start, end) };
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

/** Convert measure events to MusicXML notes (integer [start,end) spans per event so each voice sums to MEASURE_DIVISIONS). */
function eventsToXml(measure: MeasureModel, _measureIndex: number): string {
  const sorted = [...measure.events].sort((a, b) => a.startBeat - b.startBeat);

  let xml = '';
  const voices = [...new Set(sorted.map((e) => e.voice ?? 1))].sort((a, b) => a - b);

  for (const voice of voices) {
    const voiceEvents = sorted.filter((e) => (e.voice ?? 1) === voice);
    let cursor = 0;

    for (const e of voiceEvents) {
      const sb = e.startBeat;
      const eb = sb + e.duration;
      const { start: startDiv, end: endDiv } = beatSpanToDivisions(sb, eb);
      const safeStart = Math.max(startDiv, cursor);
      if (endDiv <= safeStart) {
        continue;
      }

      if (safeStart > cursor) {
        const restDiv = safeStart - cursor;
        xml += `        <note><rest/><duration>${restDiv}</duration><type>${divisionsToType(restDiv)}</type><voice>${voice}</voice></note>\n`;
        cursor = safeStart;
      }

      const durDiv = endDiv - safeStart;
      if (e.kind === 'rest') {
        xml += `        <note><rest/><duration>${durDiv}</duration><type>${divisionsToType(durDiv)}</type><voice>${voice}</voice></note>\n`;
      } else {
        const { step, alter, octave } = midiToPitch(e.pitch);
        const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
        const art = (e as { articulation?: string }).articulation;
        const notationsEl = art ? `<notations><articulations><${art}/></articulations></notations>` : '';
        const vel = (e as { velocity?: number }).velocity;
        const dynAttr =
          vel !== undefined
            ? ` dynamics="${Math.min(100, Math.max(0, (vel / 127) * 100)).toFixed(2)}"`
            : '';
        xml += `        <note${dynAttr}><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${durDiv}</duration><type>${divisionsToType(durDiv)}</type><voice>${voice}</voice>${notationsEl}</note>\n`;
      }
      cursor = endDiv;
    }

    if (cursor < MEASURE_DIVISIONS) {
      const restDiv = MEASURE_DIVISIONS - cursor;
      xml += `        <note><rest/><duration>${restDiv}</duration><type>${divisionsToType(restDiv)}</type><voice>${voice}</voice></note>\n`;
    }
  }

  return xml;
}

/** Export ScoreModel to MusicXML string. */
export function exportScoreModelToMusicXml(score: ScoreModel): MusicXmlExportResult {
  try {
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

      for (let i = 0; i < part.measures.length; i++) {
        const m = part.measures[i];
        xml += `  <measure number="${m.index}">\n`;

        if (i === 0) {
          const tempoEl = score.tempo ? `\n    <sound tempo="${score.tempo}"/>` : '';
          const feelEl =
            partIndex === 0 && score.feelProfile
              ? `    <direction placement="below"><direction-type><words>${escapeXml(
                  `Feel: ${score.feelProfile.tempoFeel} swing (~${score.feelProfile.swingRatio}:1 eighths); laid-back; duo`
                )}</words></direction-type></direction>\n`
              : '';
          xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>
    </attributes>${tempoEl}
${feelEl}`;
        }

        if (m.rehearsalMark) {
          xml += `    <direction placement="above"><direction-type><rehearsal>${escapeXml(m.rehearsalMark)}</rehearsal></direction-type></direction>\n`;
        }
        if (m.chord) {
          const { rootStep, rootAlter, kindText, bassStep, bassAlter } = parseChordForMusicXmlHarmony(m.chord);
          const alterEl = rootAlter !== 0 ? `<root-alter>${rootAlter}</root-alter>` : '';
          const bassAlterEl =
            bassStep !== undefined && bassAlter !== undefined && bassAlter !== 0
              ? `<bass-alter>${bassAlter}</bass-alter>`
              : '';
          const bassEl =
            bassStep !== undefined
              ? `<bass><bass-step>${bassStep}</bass-step>${bassAlterEl}</bass>`
              : '';
          xml += `    <harmony><root><root-step>${rootStep}</root-step>${alterEl}</root><kind text="${escapeXml(kindText)}"/>${bassEl}</harmony>\n`;
        }

        xml += eventsToXml(m, i);
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
export function exportToMusicXml(input: unknown): MusicXmlExportResult {
  if (input && typeof input === 'object' && 'title' in input && 'parts' in input) {
    return exportScoreModelToMusicXml(input as ScoreModel);
  }
  return {
    success: false,
    errors: ['Input must be ScoreModel'],
  };
}
