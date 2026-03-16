/**
 * Ellington Score Export — measure-first.
 * Iterate score → measures → voices → notes. No measure packing.
 */

import type { Score } from '../../shared/scoreModel';
import { validateScore } from '../../shared/barComposer';
import { scoreToMeasureEvents } from '../../shared/scoreToTimedEvents';
import { MEASURE_DURATION, DIVISIONS } from '../../shared/notationTimingConstants';
import { eventsToMeasureXml } from '../../shared/musicxmlMeasurePacker';
import * as fs from 'fs';
import * as path from 'path';

const INSTRUMENTS: Array<{ id: string; name: string; clef: 'treble' | 'bass' | 'percussion' }> = [
  { id: 'P1', name: 'Alto Sax 1', clef: 'treble' },
  { id: 'P2', name: 'Alto Sax 2', clef: 'treble' },
  { id: 'P3', name: 'Tenor Sax 1', clef: 'treble' },
  { id: 'P4', name: 'Tenor Sax 2', clef: 'treble' },
  { id: 'P5', name: 'Baritone Sax', clef: 'treble' },
  { id: 'P6', name: 'Trumpet 1', clef: 'treble' },
  { id: 'P7', name: 'Trumpet 2', clef: 'treble' },
  { id: 'P8', name: 'Trumpet 3', clef: 'treble' },
  { id: 'P9', name: 'Trumpet 4', clef: 'treble' },
  { id: 'P10', name: 'Trombone 1', clef: 'bass' },
  { id: 'P11', name: 'Trombone 2', clef: 'bass' },
  { id: 'P12', name: 'Trombone 3', clef: 'bass' },
  { id: 'P13', name: 'Bass Trombone', clef: 'bass' },
  { id: 'P14', name: 'Piano', clef: 'treble' },
  { id: 'P15', name: 'Bass', clef: 'bass' },
  { id: 'P16', name: 'Drums', clef: 'percussion' },
];

const TRANSPOSITIONS: Record<string, number> = {
  P1: 9, P2: 9, P3: 2, P4: 2, P5: 9,
  P6: 2, P7: 2, P8: 2, P9: 2,
  P10: 0, P11: 0, P12: 0, P13: 0,
  P14: 0, P15: 0, P16: 0,
};

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function chordToHarmonyXml(chord: string): string {
  const m = chord.match(/^([A-Ga-g])([#b])?(maj7|min7|m7|7|dom7|m7b5|m6|6|m)?/i);
  if (!m) return '';
  const step = m[1].toUpperCase();
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const kindMap: Record<string, string> = {
    maj7: 'major-seventh', min7: 'minor-seventh', m7: 'minor-seventh',
    '7': 'dominant', dom7: 'dominant', m7b5: 'half-diminished', m6: 'minor-sixth', '6': 'major-sixth',
  };
  const kind = kindMap[(m[3] || 'maj7').toLowerCase()] || 'major-seventh';
  const alterEl = alter !== 0 ? `\n      <root-alter>${alter}</root-alter>` : '';
  return `    <harmony>
      <root><root-step>${step}</root-step>${alterEl}</root>
      <kind>${kind}</kind>
    </harmony>
`;
}

/** Export Ellington Score to MusicXML. */
export function exportEllingtonScoreToMusicXML(
  score: Score,
  options?: { title?: string; runPath?: string }
): string {
  const title = options?.title ?? score.title ?? 'Ellington Orchestration';

  const validation = validateScore(score.measures);
  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'timing_report.json'),
      JSON.stringify({ measuresChecked: score.measures.length, valid: validation.valid, errors: validation.errors }, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(options.runPath, 'validation_report.json'),
      JSON.stringify({ valid: validation.valid, errors: validation.errors }, null, 2),
      'utf-8'
    );
  }
  if (!validation.valid) {
    throw new Error(`Ellington score validation failed: ${validation.errors.join('; ')}`);
  }

  const measureEvents = scoreToMeasureEvents(score);

  const partList = INSTRUMENTS.map((inst) => {
    const trans = TRANSPOSITIONS[inst.id] ?? 0;
    const transEl = trans !== 0 ? `\n      <transpose>\n        <chromatic>${-trans}</chromatic>\n      </transpose>` : '';
    return `    <score-part id="${inst.id}">
      <part-name>${escapeXml(inst.name)}</part-name>
      <score-instrument id="${inst.id}-I1"><instrument-name>${escapeXml(inst.name)}</instrument-name></score-instrument>${transEl}
    </score-part>`;
  }).join('\n');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
${partList}
  </part-list>
`;

  for (const inst of INSTRUMENTS) {
    xml += `  <part id="${inst.id}">\n`;
    for (let m = 0; m < score.measures.length; m++) {
      const measure = score.measures[m];
      const partEvents = (measureEvents.get(m) ?? []).filter((e) => e.part === inst.id);
      const measureStart = m * MEASURE_DURATION;

      xml += `  <measure number="${m + 1}">\n`;
      if (m === 0) {
        const clefSign = inst.clef === 'bass' ? 'F' : inst.clef === 'percussion' ? 'percussion' : 'G';
        const clefLine = inst.clef === 'bass' ? 4 : 2;
        const clefEl = inst.clef === 'percussion'
          ? `<clef><sign>percussion</sign><line>2</line></clef>`
          : `<clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>`;
        xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      ${clefEl}
    </attributes>
`;
      }
      if (inst.id === 'P1' && measure.chord) {
        const harm = chordToHarmonyXml(measure.chord);
        if (harm) xml += harm;
      }
      xml += eventsToMeasureXml(partEvents, m, measureStart);
      xml += `  </measure>\n`;
    }
    xml += `  </part>\n`;
  }

  xml += `</score-partwise>\n`;
  return xml;
}
