/**
 * Big Band shout-chorus + Mingus overlay — append parts to partwise MusicXML (additive export path).
 */

import type { ShoutChorusScore } from './bigBandSectionWriter';
import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';

export function countMeasuresInPartwiseXml(xml: string): number {
  let max = 0;
  const re = /<measure number="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const n = parseInt(m[1]!, 10);
    if (n > max) max = n;
  }
  return Math.max(1, max);
}

function extractDivisions(xml: string): number {
  const dm = /<divisions>\s*(\d+)\s*<\/divisions>/.exec(xml);
  if (dm) return parseInt(dm[1]!, 10);
  return 8;
}

/** Unpitched percussion-style note — element order matches Phase 8 improv exporter. */
function unpitchedNoteChunk(
  divisions: number,
  duration: number,
  instrumentId: string,
  chord: boolean,
  displayStep: string,
  displayOctave: number
): string {
  const ct = chord ? '<chord/>' : '';
  const type =
    duration >= divisions * 3.5
      ? 'whole'
      : duration >= divisions * 1.75
        ? 'half'
        : duration >= divisions * 0.85
          ? 'quarter'
          : duration >= divisions * 0.45
            ? 'eighth'
            : '16th';
  return `<note>${ct}
<unpitched>
<display-step>${displayStep}</display-step>
<display-octave>${displayOctave}</display-octave>
</unpitched>
<duration>${duration}</duration>
<instrument id="${instrumentId}"/>
<voice>1</voice>
<type>${type}</type>
<stem>up</stem>
<notehead>normal</notehead>
<staff>1</staff>
</note>`;
}

function restWholeMeasure(divisions: number, instrumentId: string): string {
  const dur = divisions * 4;
  return `<note>
<rest measure="yes"/>
<duration>${dur}</duration>
<instrument id="${instrumentId}"/>
<voice>1</voice>
<type>whole</type>
<staff>1</staff>
</note>`;
}

/** Eight eighth-note shout grid (rd_shout_grid semantic). */
function shoutGridNotes(divisions: number, instrumentId: string): string {
  const eighth = Math.max(1, Math.floor(divisions / 2));
  const steps = ['C', 'D', 'C', 'E', 'C', 'F', 'C', 'G'];
  const oct = 5;
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    parts.push(unpitchedNoteChunk(divisions, eighth, instrumentId, i > 0, steps[i % steps.length]!, oct));
  }
  return parts.join('\n');
}

export function mergeShoutChorusIntoPartwiseXml(baseXml: string, score: ShoutChorusScore): string {
  if (!baseXml.includes('</score-partwise>')) return baseXml;
  const divisions = score.divisions > 0 ? score.divisions : extractDivisions(baseXml);
  const tb = Math.max(score.totalMeasures, countMeasuresInPartwiseXml(baseXml));
  const [lo, hi] = score.shoutBarRange;
  const partId = 'P_SHOUT_UNISON_EXPORT';
  const instId = `${partId}-I1`;

  const partListEntry = `<score-part id="${partId}"><part-name>Shout chorus (unison)</part-name><score-instrument id="${instId}"><instrument-name>Unpitched Percussion</instrument-name></score-instrument></score-part>`;

  const lines: string[] = [`<part id="${partId}">`];
  for (let m = 1; m <= tb; m++) {
    const attrs =
      m === 1
        ? `<attributes>
<divisions>${divisions}</divisions>
</attributes>
`
        : '';
    let body: string;
    if (m === lo) {
      body = `${attrs}<!-- shout-chorus-unison rhythm-cell:${score.rhythmCellId} -->\n${shoutGridNotes(divisions, instId)}`;
    } else if (m >= lo && m <= hi) {
      body = `${attrs}${shoutGridNotes(divisions, instId)}`;
    } else {
      body = `${attrs}${restWholeMeasure(divisions, instId)}`;
    }
    lines.push(`<measure number="${m}">
${body}
</measure>`);
  }
  lines.push('</part>');
  const partBody = lines.join('\n');

  let xml = baseXml;
  if (xml.includes('</part-list>')) {
    xml = xml.replace('</part-list>', `${partListEntry}\n</part-list>`);
  }
  xml = xml.replace('</score-partwise>', `${partBody}\n</score-partwise>`);

  const v = validateMusicXml(xml);
  if (!v.valid) {
    throw new Error(`mergeShoutChorusIntoPartwiseXml: ${v.errors.join('; ')}`);
  }
  return xml;
}

export interface MingusGospelOverlayOpts {
  triggerBar: number;
  shoutHi: number;
}

/** Gospel shout grid overlay layers (parallel brass shells). */
export function injectMingusGospelShoutOverlay(baseXml: string, opts: MingusGospelOverlayOpts): string {
  if (!baseXml.includes('</score-partwise>')) return baseXml;
  const divisions = extractDivisions(baseXml);
  const tb = countMeasuresInPartwiseXml(baseXml);
  const lo = opts.triggerBar;
  const hi = opts.shoutHi;
  let xml = baseXml;

  for (let layer = 0; layer < 4; layer++) {
    const partId = `P_MINGUS_GOSPEL_LAYER_${layer + 1}`;
    const instId = `${partId}-I1`;
    const partListEntry = `<score-part id="${partId}"><part-name>Mingus Gospel Layer ${layer + 1}</part-name><score-instrument id="${instId}"><instrument-name>Unpitched Percussion</instrument-name></score-instrument></score-part>`;
    const lines: string[] = [`<part id="${partId}">`];
    for (let m = 1; m <= tb; m++) {
      const attrs =
        m === 1
          ? `<attributes>
<divisions>${divisions}</divisions>
</attributes>
`
          : '';
      let body: string;
      if (m === lo) {
        body = `${attrs}<!-- rd_shout_grid -->\n${shoutGridNotes(divisions, instId)}`;
      } else if (m >= lo && m <= hi) {
        body = `${attrs}${shoutGridNotes(divisions, instId)}`;
      } else {
        body = `${attrs}${restWholeMeasure(divisions, instId)}`;
      }
      lines.push(`<measure number="${m}">
${body}
</measure>`);
    }
    lines.push('</part>');
    const partBody = lines.join('\n');
    if (xml.includes('</part-list>')) {
      xml = xml.replace('</part-list>', `${partListEntry}\n</part-list>`);
    }
    xml = xml.replace('</score-partwise>', `${partBody}\n</score-partwise>`);
  }

  const v = validateMusicXml(xml);
  if (!v.valid) {
    throw new Error(`injectMingusGospelShoutOverlay: ${v.errors.join('; ')}`);
  }
  return xml;
}

/** Minimal collective-improv ostinato line — chromatic bass approaches + blues inflection every 4 bars. */
export function appendMingusCollectiveImprovPart(baseXml: string, totalMeasures: number): string {
  if (!baseXml.includes('</score-partwise>')) return baseXml;
  const divisions = extractDivisions(baseXml);
  const tb = Math.max(1, Math.min(totalMeasures, countMeasuresInPartwiseXml(baseXml)));
  const partId = 'P_MINGUS_COLLECTIVE';
  const instId = `${partId}-I1`;
  const partListEntry = `<score-part id="${partId}"><part-name>Mingus Collective</part-name><score-instrument id="${instId}"><instrument-name>Acoustic Bass</instrument-name></score-instrument></score-part>`;

  const chromatic = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'B', 'B'];
  const lines: string[] = [`<part id="${partId}">`];
  for (let m = 1; m <= tb; m++) {
    const attrs =
      m === 1
        ? `<attributes>
<divisions>${divisions}</divisions>
</attributes>
`
        : '';
    const pc = (m + 5) % 12;
    const step = chromatic[pc] ?? 'C';
    const bluesBump = m % 4 === 0 ? 1 : 0;
    const octave = Math.min(5, Math.max(4, 3 + bluesBump));
    const dur = divisions * 2;
    const note = unpitchedNoteChunk(divisions, dur, instId, false, step, octave);
    lines.push(`<measure number="${m}">
${attrs}${note}
</measure>`);
  }
  lines.push('</part>');
  const partBody = lines.join('\n');

  let xml = baseXml;
  if (xml.includes('</part-list>')) {
    xml = xml.replace('</part-list>', `${partListEntry}\n</part-list>`);
  }
  xml = xml.replace('</score-partwise>', `${partBody}\n</score-partwise>`);

  const v = validateMusicXml(xml);
  if (!v.valid) {
    throw new Error(`appendMingusCollectiveImprovPart: ${v.errors.join('; ')}`);
  }
  return xml;
}
