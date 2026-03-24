/**
 * Composer OS V2 — MusicXML exporter
 * Converts ScoreModel to MusicXML. Single source of truth is the score model.
 */

import type { MusicXmlExportResult } from './exportTypes';
import type { ScoreModel, PartModel, MeasureModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { DIVISIONS, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';

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

function beatsToDivisions(beats: number): number {
  return Math.round(beats * DIVISIONS);
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

/** Convert measure events to MusicXML notes. */
function eventsToXml(measure: MeasureModel, measureIndex: number): string {
  const measureStart = measureIndex * MEASURE_DIVISIONS;
  const sorted = [...measure.events].sort((a, b) => a.startBeat - b.startBeat);

  let xml = '';
  const voices = [...new Set(sorted.map((e) => e.voice ?? 1))].sort((a, b) => a - b);

  for (const voice of voices) {
    const voiceEvents = sorted.filter((e) => (e.voice ?? 1) === voice);
    let cursor = 0;

    for (const e of voiceEvents) {
      const startDiv = beatsToDivisions(e.startBeat);
      const durDiv = beatsToDivisions(e.duration);

      if (startDiv > cursor) {
        const restDiv = startDiv - cursor;
        xml += `        <note><rest/><duration>${restDiv}</duration><type>${divisionsToType(restDiv)}</type><voice>${voice}</voice></note>\n`;
        cursor = startDiv;
      }

      if (e.kind === 'rest') {
        xml += `        <note><rest/><duration>${durDiv}</duration><type>${divisionsToType(durDiv)}</type><voice>${voice}</voice></note>\n`;
      } else {
        const { step, alter, octave } = midiToPitch(e.pitch);
        const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
        xml += `        <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${durDiv}</duration><type>${divisionsToType(durDiv)}</type><voice>${voice}</voice></note>\n`;
      }
      cursor += durDiv;
    }

    const measureEnd = beatsToDivisions(4);
    if (cursor < measureEnd) {
      const restDiv = measureEnd - cursor;
      xml += `        <note><rest/><duration>${restDiv}</duration><type>${divisionsToType(restDiv)}</type><voice>${voice}</voice></note>\n`;
    }
  }

  return xml;
}

/** Export ScoreModel to MusicXML string. */
export function exportScoreModelToMusicXml(score: ScoreModel): MusicXmlExportResult {
  try {
    const partList = score.parts
      .map((p) => `    <score-part id="${p.id}">
      <part-name>${escapeXml(p.name)}</part-name>
      <score-instrument id="${p.id}-I1"><instrument-name>${escapeXml(p.name)}</instrument-name></score-instrument>
    </score-part>`)
    .join('\n');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(score.title)}</work-title></work>
  <part-list>
${partList}
  </part-list>
`;

    for (const part of score.parts) {
      const clefSign = part.clef === 'bass' ? 'F' : 'G';
      const clefLine = part.clef === 'bass' ? 4 : 2;
      xml += `  <part id="${part.id}">\n`;

      for (let i = 0; i < part.measures.length; i++) {
        const m = part.measures[i];
        xml += `  <measure number="${m.index}">\n`;

        if (i === 0) {
          const tempoEl = score.tempo ? `\n    <sound tempo="${score.tempo}"/>` : '';
          xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>
    </attributes>${tempoEl}
`;
        }

        if (m.rehearsalMark) {
          xml += `    <direction placement="above"><direction-type><rehearsal>${escapeXml(m.rehearsalMark)}</rehearsal></direction-type></direction>\n`;
        }
        if (m.chord) {
          const rootMatch = m.chord.match(/^([A-Ga-g])([#b])?/);
          const step = rootMatch ? rootMatch[1].toUpperCase() : 'C';
          const alter = rootMatch?.[2] === '#' ? 1 : rootMatch?.[2] === 'b' ? -1 : 0;
          const alterEl = alter !== 0 ? `<root-alter>${alter}</root-alter>` : '';
          xml += `    <harmony><root><root-step>${step}</root-step>${alterEl}</root><kind text="${escapeXml(m.chord)}"/></harmony>\n`;
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
