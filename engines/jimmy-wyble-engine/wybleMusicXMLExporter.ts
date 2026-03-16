/**
 * Wyble MusicXML Exporter — measure-first architecture.
 * Iterate score → measures → voices → notes. No measure packing.
 */

import type { Score } from '../../shared/scoreModel';
import { validateScore } from '../../shared/barComposer';
import { scoreToMeasureEvents } from '../../shared/scoreToTimedEvents';
import { MEASURE_DURATION, DIVISIONS } from '../../shared/notationTimingConstants';
import { eventsToMeasureXml } from '../../shared/musicxmlMeasurePacker';
import * as fs from 'fs';
import * as path from 'path';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Export Score to MusicXML. Throws if validation fails. */
export function exportScoreToMusicXML(
  score: Score,
  options?: { title?: string; runPath?: string }
): string {
  const title = options?.title ?? score.title ?? 'Wyble Etude';

  const validation = validateScore(score.measures);
  if (options?.runPath) {
    fs.writeFileSync(
      path.join(options.runPath, 'timing_report.json'),
      JSON.stringify({
        measuresChecked: score.measures.length,
        valid: validation.valid,
        errors: validation.errors,
        warnings: [],
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
    throw new Error(`Wyble score validation failed: ${validation.errors.join('; ')}`);
  }

  const measureEvents = scoreToMeasureEvents(score);

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

  for (let m = 0; m < score.measures.length; m++) {
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
    xml += eventsToMeasureXml(events, m, m * MEASURE_DURATION);
    xml += `  </measure>\n`;
  }

  xml += `  </part>
</score-partwise>
`;
  return xml;
}
