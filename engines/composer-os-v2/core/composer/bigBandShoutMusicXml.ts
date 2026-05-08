/**
 * Big Band shout-chorus + Mingus overlay — in-place brass/reed merge + collective append.
 *
 * Uses `@xmldom/xmldom` (not browser DOM). Avoid naming clashes with lib.dom `Document`/`Element`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { ShoutChorusScore } from './bigBandSectionWriter';
import type { VoiceRuleBundle } from './voiceRuleBundle';
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

export function extractDivisions(xml: string): number {
  const dm = /<divisions>\s*(\d+)\s*<\/divisions>/.exec(xml);
  if (dm) return parseInt(dm[1]!, 10);
  return 8;
}

function extractDivisionsFromDoc(doc: any): number {
  const divs = doc.getElementsByTagName('divisions');
  if (divs.length > 0 && divs[0]?.textContent) {
    const n = parseInt(divs[0].textContent.trim(), 10);
    if (!Number.isNaN(n)) return n;
  }
  return 8;
}

/** Elements kept when replacing shout measures (clef, dynamics, harmony symbols). */
const PRESERVE_MEASURE_CHILD_TAGS = new Set([
  'attributes',
  'direction',
  'harmony',
  'barline',
  'print',
  'sound',
  'bookmark',
  'grouping',
]);

function isBigBandBrassReedPartId(partId: string): boolean {
  const u = partId.toUpperCase();
  const brass: string[] = [
    'P_TRUMPET',
    'P_TROMBONE',
    'P_ALTO_SAX',
    'P_TENOR_SAX',
    'P_BARI_SAX',
    'P_BASS_TROMBONE',
  ];
  return brass.some((p) => u.startsWith(p));
}

function shouldSkipNonBrassMergePart(partId: string): boolean {
  const u = partId.toUpperCase();
  if (u.startsWith('SQ_')) return true;
  if (u.startsWith('P_MINGUS_COLLECTIVE')) return true;
  if (u.startsWith('P_IMPROV_PHASE')) return true;
  if (u.startsWith('P_MINGUS_GOSPEL_LAYER')) return true;
  if (u.startsWith('P_SHOUT_UNISON_EXPORT')) return true;
  if (u === 'P_BASS') return true;
  if (u.startsWith('P_DRUM')) return true;
  if (u.startsWith('P_PIANO')) return true;
  if (u.startsWith('P_GUITAR')) return true;
  return false;
}

function isShoutMergeTargetPart(partId: string): boolean {
  if (shouldSkipNonBrassMergePart(partId)) return false;
  return isBigBandBrassReedPartId(partId);
}

function removePartsAndScorePartsWithIdPrefix(doc: any, prefix: string): void {
  const parts = [...doc.getElementsByTagName('part')];
  for (const p of parts) {
    const id = p.getAttribute('id') ?? '';
    if (id.startsWith(prefix)) {
      p.parentNode?.removeChild(p);
    }
  }
  const scoreParts = [...doc.getElementsByTagName('score-part')];
  for (const sp of scoreParts) {
    const sid = sp.getAttribute('id') ?? '';
    if (sid.startsWith(prefix)) {
      sp.parentNode?.removeChild(sp);
    }
  }
}

function midiToPitchParts(midi: number): { step: string; alter?: number; octave: number } {
  const table: { step: string; alter?: number }[] = [
    { step: 'C' },
    { step: 'C', alter: 1 },
    { step: 'D' },
    { step: 'D', alter: 1 },
    { step: 'E' },
    { step: 'F' },
    { step: 'F', alter: 1 },
    { step: 'G' },
    { step: 'G', alter: 1 },
    { step: 'A' },
    { step: 'A', alter: 1 },
    { step: 'B' },
  ];
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const oct = Math.floor(Math.round(midi) / 12) - 1;
  const octave = Math.min(6, Math.max(3, oct));
  const t = table[pc]!;
  return t.alter !== undefined ? { step: t.step, alter: t.alter, octave } : { step: t.step, octave };
}

function durationToType(divisions: number, dur: number): string {
  const ratio = dur / divisions;
  if (ratio >= 3.5) return 'whole';
  if (ratio >= 1.75) return 'half';
  if (ratio >= 0.85) return 'quarter';
  if (ratio >= 0.45) return 'eighth';
  return '16th';
}

function createPitchNoteElement(
  doc: any,
  divisions: number,
  duration: number,
  instrumentId: string,
  chord: boolean,
  midi: number,
  voice: number
): any {
  const disp = midiToPitchParts(midi);
  const alterXml = disp.alter !== undefined ? `<alter>${disp.alter}</alter>` : '';
  const type = durationToType(divisions, duration);
  const chordTag = chord ? '<chord/>' : '';
  const safeInst = instrumentId.replace(/"/g, '');
  const xml = `<note>${chordTag}
<pitch>
<step>${disp.step}</step>
${alterXml}
<octave>${disp.octave}</octave>
</pitch>
<duration>${duration}</duration>
<instrument id="${safeInst}"/>
<voice>${voice}</voice>
<type>${type}</type>
<stem>up</stem>
<notehead>normal</notehead>
<staff>1</staff>
</note>`;
  const parser = new DOMParser();
  const parsed = parser.parseFromString(xml, 'text/xml');
  const root = parsed.documentElement;
  if (!root || root.tagName === 'parsererror') {
    throw new Error('createPitchNoteElement: parse failed');
  }
  return doc.importNode(root, true);
}

/** Build shout rhythm as pitched eighth-note shell (rd_shout_grid / default). */
function appendShoutRhythmNotesToMeasure(
  doc: any,
  measure: any,
  divisions: number,
  instrumentId: string,
  baseMidi: number,
  rhythmCellId: string,
  insertLeadingComment: boolean,
  commentText?: string
): void {
  const eighth = Math.max(1, Math.floor(divisions / 2));
  const steps = [0, 2, 0, 4, 0, 5, 0, 7];
  const children = [...measure.childNodes];
  for (const ch of children) {
    if (ch.nodeType !== 1) continue;
    const el = ch as any;
    const tag = el.tagName;
    if (!PRESERVE_MEASURE_CHILD_TAGS.has(tag)) {
      measure.removeChild(ch);
    }
  }
  if (insertLeadingComment && commentText) {
    measure.appendChild(doc.createComment(` ${commentText} `));
  }
  measure.appendChild(doc.createComment(` rhythm-cell:${rhythmCellId} dominant:tritone-sus tension:0.95 `));
  for (let i = 0; i < 8; i++) {
    const midi = baseMidi + steps[i % steps.length]!;
    const noteEl = createPitchNoteElement(doc, divisions, eighth, instrumentId, i > 0, midi, 1);
    measure.appendChild(noteEl);
  }
}

function resolveInstrumentIdForPart(partEl: any, partId: string): string {
  const notes = partEl.getElementsByTagName('note');
  for (let i = 0; i < notes.length; i++) {
    const inst = notes[i]?.getElementsByTagName('instrument').item(0);
    const iid = inst?.getAttribute('id');
    if (iid) return iid;
  }
  return `${partId}-I1`;
}

function parseMeasureNumber(measure: any): number {
  const raw = measure.getAttribute('number') ?? '1';
  const n = parseInt(raw.replace(/\D/g, '') || '1', 10);
  return Number.isNaN(n) ? 1 : n;
}

function collectBrassPartElements(doc: any): any[] {
  const out: any[] = [];
  const parts = doc.getElementsByTagName('part');
  for (let i = 0; i < parts.length; i++) {
    const p = parts.item(i);
    if (!p) continue;
    const id = p.getAttribute('id') ?? '';
    if (isShoutMergeTargetPart(id)) out.push(p);
  }
  return out;
}

function mergeShoutMeasuresForPart(
  doc: any,
  partEl: any,
  lo: number,
  hi: number,
  divisions: number,
  instrumentId: string,
  rhythmCellId: string,
  baseMidi: number,
  gospelComment?: string
): void {
  const measures = partEl.getElementsByTagName('measure');
  for (let i = 0; i < measures.length; i++) {
    const m = measures.item(i);
    if (!m) continue;
    const num = parseMeasureNumber(m);
    if (num >= lo && num <= hi) {
      appendShoutRhythmNotesToMeasure(doc, m, divisions, instrumentId, baseMidi, rhythmCellId, Boolean(gospelComment), gospelComment);
    }
  }
}

/**
 * Replace shout-chorus bar measures in existing brass/reed parts (in-place).
 * Removes legacy appended gospel layers + old shout export part from XML before merging.
 */
export function mergeShoutChorusIntoExistingParts(
  partwiseXml: string,
  shoutChorusScore: ShoutChorusScore,
  bundle: VoiceRuleBundle
): string {
  if (!partwiseXml.includes('</score-partwise>')) return partwiseXml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(partwiseXml, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.tagName === 'parsererror') {
    throw new Error('mergeShoutChorusIntoExistingParts: XML parse failed');
  }

  removePartsAndScorePartsWithIdPrefix(doc, 'P_MINGUS_GOSPEL_LAYER');
  removePartsAndScorePartsWithIdPrefix(doc, 'P_SHOUT_UNISON_EXPORT');

  const [lo, hi] = shoutChorusScore.shoutBarRange;
  const divisions =
    shoutChorusScore.divisions > 0 ? shoutChorusScore.divisions : extractDivisionsFromDoc(doc);
  const rhythmCellId = shoutChorusScore.rhythmCellId;

  const brassParts = collectBrassPartElements(doc);
  const spread = bundle.voicingPolicy.maxSpreadSemitones;
  const n = Math.max(1, brassParts.length);

  let merged = 0;
  brassParts.forEach((partEl, idx) => {
    const partId = partEl.getAttribute('id') ?? '';
    const instId = resolveInstrumentIdForPart(partEl, partId);
    const baseMidi =
      n <= 1 ? 60 : 58 + Math.floor((idx * spread) / Math.max(1, n - 1));
    mergeShoutMeasuresForPart(doc, partEl, lo, hi, divisions, instId, rhythmCellId, baseMidi);
    merged++;
  });

  console.log(`[ShoutChorus] merged into ${merged} parts bars ${lo}-${hi}`);

  const xml = serializeScorePartwiseDoc(doc);
  const v = validateMusicXml(xml);
  if (!v.valid) {
    throw new Error(`mergeShoutChorusIntoExistingParts: ${v.errors.join('; ')}`);
  }
  return xml;
}

/** Mingus gospel pass — rd_shout_grid in-place on brass measures (no appended parts). */
export function applyMingusGospelShoutInPlace(
  partwiseXml: string,
  opts: { shoutLo: number; shoutHi: number },
  bundle: VoiceRuleBundle
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(partwiseXml, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.tagName === 'parsererror') {
    throw new Error('applyMingusGospelShoutInPlace: XML parse failed');
  }

  const divisions = extractDivisionsFromDoc(doc);
  const brassParts = collectBrassPartElements(doc);
  const spread = bundle.voicingPolicy.maxSpreadSemitones;
  const n = Math.max(1, brassParts.length);

  brassParts.forEach((partEl, idx) => {
    const partId = partEl.getAttribute('id') ?? '';
    const instId = resolveInstrumentIdForPart(partEl, partId);
    const baseMidi = n <= 1 ? 60 : 58 + Math.floor((idx * spread) / Math.max(1, n - 1));
    mergeShoutMeasuresForPart(
      doc,
      partEl,
      opts.shoutLo,
      opts.shoutHi,
      divisions,
      instId,
      'rd_shout_grid',
      baseMidi,
      'rd_shout_grid'
    );
  });

  const xml = serializeScorePartwiseDoc(doc);
  const v = validateMusicXml(xml);
  if (!v.valid) {
    throw new Error(`applyMingusGospelShoutInPlace: ${v.errors.join('; ')}`);
  }
  return xml;
}

function serializeScorePartwiseDoc(doc: any): string {
  const ser = new XMLSerializer();
  let s = ser.serializeToString(doc);
  if (!s.trimStart().startsWith('<?xml')) {
    s = `<?xml version="1.0" encoding="UTF-8"?>\n${s}`;
  }
  return s;
}

function legacyAppendShoutUnisonPart(baseXml: string, score: ShoutChorusScore): string {
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
      body = `${attrs}<!-- shout-chorus-unison rhythm-cell:${score.rhythmCellId} -->\n${legacyShoutGridUnpitched(divisions, instId)}`;
    } else if (m >= lo && m <= hi) {
      body = `${attrs}${legacyShoutGridUnpitched(divisions, instId)}`;
    } else {
      body = `${attrs}${legacyRestWhole(divisions, instId)}`;
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

function legacyShoutGridUnpitched(divisions: number, instrumentId: string): string {
  const eighth = Math.max(1, Math.floor(divisions / 2));
  const steps = ['C', 'D', 'C', 'E', 'C', 'F', 'C', 'G'];
  const oct = 5;
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    parts.push(legacyUnpitchedNote(divisions, eighth, instrumentId, i > 0, steps[i % steps.length]!, oct));
  }
  return parts.join('\n');
}

function legacyUnpitchedNote(
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

function legacyRestWhole(divisions: number, instrumentId: string): string {
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

/** @deprecated Smoke harness / legacy append path — prefer {@link mergeShoutChorusIntoExistingParts}. */
export function mergeShoutChorusIntoPartwiseXml(baseXml: string, score: ShoutChorusScore): string {
  return legacyAppendShoutUnisonPart(baseXml, score);
}

export interface MingusGospelOverlayOpts {
  triggerBar: number;
  shoutHi: number;
}

/** @deprecated Tests only — appended gospel layers; production uses {@link applyMingusGospelShoutInPlace}. */
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
        body = `${attrs}<!-- rd_shout_grid -->\n${legacyShoutGridUnpitched(divisions, instId)}`;
      } else if (m >= lo && m <= hi) {
        body = `${attrs}${legacyShoutGridUnpitched(divisions, instId)}`;
      } else {
        body = `${attrs}${legacyRestWhole(divisions, instId)}`;
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

/** Minimal collective-improv ostinato line — appended part (not merged in-place). */
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
    const disp = { step, octave };
    const note = `<note>
<unpitched>
<display-step>${disp.step}</display-step>
<display-octave>${disp.octave}</display-octave>
</unpitched>
<duration>${dur}</duration>
<instrument id="${instId}"/>
<voice>1</voice>
<type>half</type>
<stem>up</stem>
<notehead>normal</notehead>
<staff>1</staff>
</note>`;
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
