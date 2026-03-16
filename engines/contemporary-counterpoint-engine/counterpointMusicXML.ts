/**
 * Contemporary Counterpoint — MusicXML export (measure-first).
 * Iterate score → measures → voices → notes. No measure packing.
 */

import type { Score } from '../../shared/scoreModel';
import { validateScore } from '../../shared/barComposer';
import { scoreToMeasureEvents } from '../../shared/scoreToTimedEvents';
import { MEASURE_DURATION, DIVISIONS } from '../../shared/notationTimingConstants';
import { eventsToMeasureXml } from '../../shared/musicxmlMeasurePacker';
import * as fs from 'fs';
import * as path from 'path';

/** Export Score to MusicXML. Throws if validation fails. */
export function exportCounterpointScoreToMusicXML(
  score: Score,
  title = 'Contemporary Counterpoint',
  options?: { runPath?: string }
): string {
  const validation = validateScore(score.measures);
  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'timing_report.json'),
      JSON.stringify({
        measuresChecked: score.measures.length,
        valid: validation.valid,
        errors: validation.errors,
      }, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(options.runPath, 'validation_report.json'),
      JSON.stringify({
        valid: validation.valid,
        errors: validation.errors,
        violationsBlocking: validation.errors,
      }, null, 2),
      'utf-8'
    );
  }
  if (!validation.valid) {
    throw new Error(`Counterpoint score validation failed: ${validation.errors.join('; ')}`);
  }

  const measureEvents = scoreToMeasureEvents(score);
  const partIds = score.parts ?? [...new Set(score.measures.flatMap((m) => m.voices.map((v) => v.part)))];
  const firstMeasureAttrs = `        <attributes>
          <divisions>${DIVISIONS}</divisions>
          <key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>\n`;

  const partXmls = partIds.map((partId, partIdx) => {
    let partXml = `    <part id="${partId}">\n`;
    for (let m = 0; m < score.measures.length; m++) {
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
