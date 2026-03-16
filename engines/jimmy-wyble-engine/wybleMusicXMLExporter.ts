/**
 * Wyble MusicXML Exporter — uses shared canonical notation timing engine.
 * Two-staff guitar study: staff 1 = melody, staff 2 = bass.
 */

import type { WybleEtudeResult } from './wybleEtudeGenerator';
import type { NoteEvent } from './wybleTypes';
import { MEASURE_DURATION, DIVISIONS } from '../../shared/notationTimingConstants';
import { packEventsIntoMeasures, type TimedNoteEvent } from '../../shared/notationTimingEngine';
import { eventsToMeasureXmlWithBackup } from '../../shared/musicxmlMeasurePacker';
import { validateMeasureDurations } from '../../shared/musicxmlTimingValidation';
import * as fs from 'fs';
import * as path from 'path';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Convert Wyble engine output to TimedNoteEvents using shared timing. */
function wybleToTimedEvents(result: WybleEtudeResult): TimedNoteEvent[] {
  const events: TimedNoteEvent[] = [];
  const upper = result.upper_line.events;
  const lower = result.lower_line.events;
  const totalBeats = result.bars * 4;
  let uIdx = 0;
  let lIdx = 0;

  for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
    const onsetBeats = beatIndex;
    const durationBeats = 1;

    if (uIdx < upper.length && upper[uIdx].isDyad && lIdx < lower.length) {
      events.push({
        pitch: upper[uIdx].pitch,
        startDivision: beatIndex * DIVISIONS,
        durationDivisions: DIVISIONS,
        voice: 1,
        staff: 1,
        part: 'P1',
        tieStart: false,
        tieStop: false,
        rest: false,
      });
      events.push({
        pitch: lower[lIdx].pitch,
        startDivision: beatIndex * DIVISIONS,
        durationDivisions: DIVISIONS,
        voice: 2,
        staff: 2,
        part: 'P1',
        tieStart: false,
        tieStop: false,
        rest: false,
      });
      uIdx++;
      lIdx++;
    } else if (beatIndex % 2 === 0 && uIdx < upper.length) {
      events.push({
        pitch: upper[uIdx].pitch,
        startDivision: beatIndex * DIVISIONS,
        durationDivisions: DIVISIONS,
        voice: 1,
        staff: 1,
        part: 'P1',
        tieStart: false,
        tieStop: false,
        rest: false,
      });
      uIdx++;
    } else if (lIdx < lower.length) {
      events.push({
        pitch: lower[lIdx].pitch,
        startDivision: beatIndex * DIVISIONS,
        durationDivisions: DIVISIONS,
        voice: 2,
        staff: 2,
        part: 'P1',
        tieStart: false,
        tieStop: false,
        rest: false,
      });
      lIdx++;
    } else {
      events.push({
        pitch: 0,
        startDivision: beatIndex * DIVISIONS,
        durationDivisions: DIVISIONS,
        voice: 1,
        staff: 1,
        part: 'P1',
        tieStart: false,
        tieStop: false,
        rest: true,
      });
    }
  }

  return events;
}

export function exportToMusicXML(
  result: WybleEtudeResult,
  options?: { title?: string; runPath?: string }
): string {
  const title = options?.title ?? 'Wyble Etude';

  const timedEvents = wybleToTimedEvents(result);
  const measureEvents = packEventsIntoMeasures(timedEvents, result.bars);

  const validation = validateMeasureDurations(measureEvents);
  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'timing_report.json'),
      JSON.stringify({
        measuresChecked: validation.measuresChecked,
        durationTotals: validation.durationTotals,
        tiesInserted: validation.tiesInserted,
        restsInserted: validation.restsInserted,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      }, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(options.runPath, 'validation_report.json'),
      JSON.stringify({
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        violationsBlocking: validation.violationsBlocking,
      }, null, 2),
      'utf-8'
    );
  }
  if (!validation.valid) {
    throw new Error(`Wyble timing validation failed: ${validation.errors.join('; ')}`);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Guitar</part-name>
      <score-instrument id="P1-I1"><instrument-name>Guitar</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
`;

  for (let m = 0; m < result.bars; m++) {
    const events = measureEvents.get(m) ?? [];
    xml += `  <measure number="${m + 1}">\n`;
    if (m === 0) {
      xml += `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <key><fifths>0</fifths></key>
      <time><beats>4</beats><beat-type>4</beat-type></time>
      <staves>2</staves>
      <clef number="1"><sign>G</sign><line>2</line></clef>
      <clef number="2"><sign>G</sign><line>2</line></clef>
    </attributes>\n`;
    }
    xml += eventsToMeasureXmlWithBackup(events, m, m * MEASURE_DURATION);
    xml += `  </measure>\n`;
  }

  xml += `  </part>
</score-partwise>
`;
  return xml;
}
