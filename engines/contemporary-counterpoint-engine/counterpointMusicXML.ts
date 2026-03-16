/**
 * Contemporary Counterpoint — MusicXML export via shared canonical notation timing engine.
 */

import type { CounterpointOutput, CounterpointNote } from './counterpointTypes';
import { MEASURE_DURATION, DIVISIONS, beatsToDivisions } from '../../shared/notationTimingConstants';
import { packEventsIntoMeasures, type TimedNoteEvent } from '../../shared/notationTimingEngine';
import { eventsToMeasureXml } from '../../shared/musicxmlMeasurePacker';
import { validateMeasureDurations } from '../../shared/musicxmlTimingValidation';
import * as fs from 'fs';
import * as path from 'path';

/** Convert Counterpoint lines to TimedNoteEvents. */
function counterpointToTimedEvents(out: CounterpointOutput): TimedNoteEvent[] {
  const events: TimedNoteEvent[] = [];
  for (let v = 0; v < out.lines.length; v++) {
    const line = out.lines[v];
    const partId = `P${v + 1}`;
    for (const n of line.notes) {
      events.push({
        pitch: n.pitch,
        startDivision: beatsToDivisions(n.onset),
        durationDivisions: Math.max(1, beatsToDivisions(n.duration)),
        voice: 1,
        staff: 1,
        part: partId,
        tieStart: false,
        tieStop: false,
        rest: false,
      });
    }
  }
  return events;
}

export function exportCounterpointToMusicXML(
  out: CounterpointOutput,
  title = 'Contemporary Counterpoint',
  options?: { runPath?: string }
): string {
  const timedEvents = counterpointToTimedEvents(out);
  const maxMeasure = Math.max(
    ...out.lines.flatMap((l) =>
      l.notes.map((n) => Math.floor(beatsToDivisions(n.onset + n.duration) / MEASURE_DURATION))
    ),
    out.totalBars - 1
  );
  const measureCount = Math.max(maxMeasure + 1, out.totalBars);

  const measureEvents = packEventsIntoMeasures(timedEvents, measureCount);

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
    throw new Error(`Counterpoint timing validation failed: ${validation.errors.join('; ')}`);
  }

  const partIds = out.lines.map((_, i) => `P${i + 1}`);
  const firstMeasureAttrs = `        <attributes>
          <divisions>${DIVISIONS}</divisions>
          <key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>\n`;

  const partXmls = partIds.map((partId, partIdx) => {
    let partXml = `    <part id="${partId}">\n`;
    for (let m = 0; m < measureCount; m++) {
      const events = (measureEvents.get(m) ?? []).filter((e) => e.part === partId);
      const measureStart = m * MEASURE_DURATION;
      partXml += `      <measure number="${m + 1}">\n`;
      if (m === 0) partXml += firstMeasureAttrs;
      partXml += eventsToMeasureXml(events, m, measureStart);
      partXml += `      </measure>\n`;
    }
    partXml += `    </part>`;
    return partXml;
  });

  const partList = partIds.map((id, i) => `<score-part id="${id}"><part-name>Voice ${i + 1}</part-name></score-part>`).join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <part-list>
    ${partList}
  </part-list>
${partXmls.join('\n')}
</score-partwise>
`;
}
