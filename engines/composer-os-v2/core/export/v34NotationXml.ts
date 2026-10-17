/**
 * V3.4 MusicXML fragments. Callers must skip this module when the new fields are absent.
 */

import { DIVISIONS, type NoteNotationV34, type PartDynamicEvent, type TempoMapEvent, type TimecodeMark } from '../score-model/scoreModelTypes';
import type { Technique } from '../instruments/instrumentTypes';
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function offsetXml(beat: number): string {
  if (beat <= 0) return '';
  return `      <offset>${Math.round(beat * DIVISIONS)}</offset>\n`;
}

const TECHNIQUE_WORDS: Partial<Record<Technique, string>> = {
  pizz: 'pizz.',
  arco: 'arco',
  snap_pizz: 'snap pizz.',
  col_legno: 'col legno',
  sul_pont: 'sul pont.',
  sul_tasto: 'sul tasto',
  artificial_harmonic: 'art. harm.',
  con_sord: 'con sord.',
  senza_sord: 'senza sord.',
  straight_mute: 'straight mute',
  cup_mute: 'cup mute',
  harmon_mute: 'harmon mute',
  flutter: 'fluttertongue',
  stopped: 'stopped',
  open: 'open',
};

function wordsDirection(text: string, beat: number): string {
  return `    <direction placement="above">
      <direction-type><words font-style="italic">${escapeXml(text)}</words></direction-type>
${offsetXml(beat)}    </direction>
`;
}

export function v34NoteDirections(notation: NoteNotationV34 | undefined, beat: number): string {
  if (!notation) return '';
  let xml = '';
  if (notation.technique === 'pizz' || notation.technique === 'arco') {
    const yes = notation.technique === 'pizz' ? 'yes' : 'no';
    const word = TECHNIQUE_WORDS[notation.technique]!;
    xml += `    <direction placement="above">
      <direction-type><words font-style="italic">${word}</words></direction-type>
${offsetXml(beat)}      <sound pizzicato="${yes}"/>
    </direction>
`;
  } else if (notation.technique && TECHNIQUE_WORDS[notation.technique]) {
    xml += wordsDirection(TECHNIQUE_WORDS[notation.technique]!, beat);
  }
  if (notation.divisi) {
    xml += wordsDirection(`div. ${notation.divisi.group} (${notation.divisi.index})`, beat);
  }
  return xml;
}

export function v34NotationsXml(
  notation: NoteNotationV34 | undefined,
  legacyArticulation: string | undefined,
  durationAccent: 'none' | 'stress' | undefined,
): string {
  if (!notation) return '';
  const slurs: string[] = [];
  if (notation.slur === 'start' || notation.slur === 'stop') {
    slurs.push(`<slur type="${notation.slur}"/>`);
  }
  const ornaments: string[] = [];
  if (notation.tremolo) {
    const marks = notation.tremolo.marks ?? (notation.tremolo.type === 'unmeasured' ? 3 : 1);
    ornaments.push(`<tremolo type="${notation.tremolo.type}">${marks}</tremolo>`);
  } else if (notation.technique === 'tremolo_unmeasured') {
    ornaments.push('<tremolo type="unmeasured">3</tremolo>');
  }
  const technical: string[] = [];
  if (notation.harmonic || notation.technique === 'natural_harmonic' || notation.technique === 'artificial_harmonic') {
    technical.push('<harmonic/>');
  }
  if (notation.technique === 'snap_pizz') technical.push('<snap-pizzicato/>');
  const articulations: string[] = [];
  const names = notation.articulations ?? (legacyArticulation ? [legacyArticulation] : []);
  for (const name of names) {
    if (name === 'accent_staccato') {
      articulations.push('<accent/>', '<staccato/>');
    } else if (name === 'marcato') {
      articulations.push('<strong-accent/>');
    } else if (name === 'staccatissimo') {
      articulations.push('<staccatissimo/>');
    } else {
      articulations.push(`<${name}/>`);
    }
  }
  if (durationAccent === 'stress') articulations.push('<stress/>');
  const chunks: string[] = [];
  if (slurs.length) chunks.push(slurs.join(''));
  if (ornaments.length) chunks.push(`<ornaments>${ornaments.join('')}</ornaments>`);
  if (technical.length) chunks.push(`<technical>${technical.join('')}</technical>`);
  if (articulations.length) chunks.push(`<articulations>${articulations.join('')}</articulations>`);
  if (chunks.length === 0) return '';
  return `<notations>${chunks.join('')}</notations>`;
}

export function v34PartDynamicXml(event: PartDynamicEvent): string {
  let xml = '';
  if (event.mark) {
    xml += `    <direction placement="below">
      <direction-type>
        <dynamics><${event.mark}/></dynamics>
      </direction-type>
${offsetXml(event.beat)}    </direction>
`;
  }
  if (event.wedge) {
    xml += `    <direction placement="below">
      <direction-type>
        <wedge type="${event.wedge}"/>
      </direction-type>
${offsetXml(event.beat)}    </direction>
`;
  }
  return xml;
}

function quarterTempo(event: TempoMapEvent): number {
  if (event.beatUnit === 'half') return event.bpm * 2;
  if (event.beatUnit === 'eighth') return event.bpm / 2;
  if (event.beatUnit === 'dotted-quarter') return event.bpm * 1.5;
  return event.bpm;
}

export function v34TempoDirectionXml(event: TempoMapEvent): string {
  const unit = event.beatUnit === 'dotted-quarter' ? 'quarter' : event.beatUnit;
  const dot = event.beatUnit === 'dotted-quarter' ? '\n          <beat-unit-dot/>' : '';
  const quarter = quarterTempo(event);
  const label = event.label
    ? `      <direction-type><words>${escapeXml(event.label)}</words></direction-type>\n`
    : '';
  return `    <direction placement="above">
      <direction-type>
        <metronome>
          <beat-unit>${unit}</beat-unit>${dot}
          <per-minute>${event.bpm}</per-minute>
        </metronome>
      </direction-type>
${label}${offsetXml(event.beat)}      <sound tempo="${quarter}"/>
    </direction>
`;
}

export function v34TimecodeDirectionXml(mark: TimecodeMark): string {
  const text = mark.label ? `${mark.smpte} ${mark.label}` : mark.smpte;
  return `    <direction placement="above">
      <direction-type><words>${escapeXml(text)}</words></direction-type>
${offsetXml(mark.beat)}    </direction>
`;
}

export function v34TransposeXml(transposition: { diatonic: number; chromatic: number; octaveChange: number }): string {
  return `      <transpose><diatonic>${transposition.diatonic}</diatonic><chromatic>${transposition.chromatic}</chromatic><octave-change>${transposition.octaveChange}</octave-change></transpose>\n`;
}
