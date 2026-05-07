/**
 * Standalone Greek rebetiko percussion grid → MusicXML 4.0 (string output; Sibelius-oriented unpitched glyphs).
 */

import type { RhythmPreset } from './greekRebetikoRhythmTypes';
import { validateRhythmPreset } from './greekRebetikoRhythmValidate';
import {
  DEFAULT_GREEK_RHYTHM_PRESET_ID,
  GREEK_REBETIKO_RHYTHM_PRESETS,
  getGreekRebetikoPresetById,
} from './greekRebetikoRhythmPresets';
import { MUSIC_XML_DIVISIONS_PER_QUARTER } from '../score-model/scoreModelTypes';
import { noteXmlRestFragment } from '../export/musicXmlNoteFragment';
import {
  decomposeTicksToMinimalParts,
  tickSpecForLength,
  typeAndDotsXml,
  type TickNoteSpec,
} from '../export/musicXmlTickEncoding';

export {
  DEFAULT_GREEK_RHYTHM_PRESET_ID,
  GREEK_REBETIKO_RHYTHM_PRESETS,
  getGreekRebetikoPresetById,
} from './greekRebetikoRhythmPresets';

const PART_ID = 'P1';
const INST_ID = `${PART_ID}-I1`;
const VOICE = 1;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function drumUnpitchedDisplay(step: string, octave: number): string {
  return `<unpitched><display-step>${step}</display-step><display-octave>${octave}</display-octave></unpitched>`;
}

/** GM kit notes used by presets — display only (octaves 4–5). */
function greekPercussionDrumGlyph(midi: number): {
  step: string;
  octave: number;
  accidentalXml: string;
  notehead: 'x' | 'normal';
  stem: 'up' | 'down';
} {
  switch (midi) {
    case 36:
      return { step: 'F', octave: 4, accidentalXml: '', notehead: 'normal', stem: 'down' };
    case 38:
      return { step: 'D', octave: 4, accidentalXml: '', notehead: 'normal', stem: 'down' };
    case 42:
      return { step: 'F', octave: 5, accidentalXml: '<accidental>sharp</accidental>', notehead: 'x', stem: 'up' };
    case 44:
      return { step: 'G', octave: 5, accidentalXml: '<accidental>sharp</accidental>', notehead: 'normal', stem: 'up' };
    case 50:
      return { step: 'D', octave: 5, accidentalXml: '', notehead: 'normal', stem: 'down' };
    case 56:
      return { step: 'E', octave: 5, accidentalXml: '', notehead: 'normal', stem: 'up' };
    default:
      throw new Error(`greekRhythmMusicXmlExporter: unsupported GM percussion MIDI ${midi}`);
  }
}

function measureTicksForPreset(p: RhythmPreset): number {
  const { beats, beatType } = p.timeSignature;
  const quarters = (beats * 4) / beatType;
  return Math.round(quarters * MUSIC_XML_DIVISIONS_PER_QUARTER);
}

function drumHitNoteXml(opts: {
  chord: boolean;
  ticks480: number;
  step: string;
  octave: number;
  stem: 'up' | 'down';
  notehead: 'x' | 'normal';
  accidentalXml: string;
}): string {
  const chordEl = opts.chord ? '<chord/>' : '';
  const spec: TickNoteSpec = tickSpecForLength(opts.ticks480);
  const typeDots = typeAndDotsXml(spec);
  const nh = opts.notehead === 'x' ? '<notehead>x</notehead>' : '';
  const body = `${chordEl}${drumUnpitchedDisplay(opts.step, opts.octave)}<duration>${opts.ticks480}</duration><instrument id="${INST_ID}"/><voice>${VOICE}</voice>${typeDots}${opts.accidentalXml}<stem>${opts.stem}</stem>${nh}<staff>1</staff>`;
  return `        <note>${body}</note>\n`;
}

function buildMeasureInnerXml(preset: RhythmPreset, measureCapacity: number): string {
  const mTicks = measureTicksForPreset(preset);
  const stepTicks = mTicks / preset.stepsPerBar;
  if (!Number.isInteger(stepTicks)) {
    throw new Error(
      `greekRhythmMusicXmlExporter: measure ${mTicks} ticks not divisible by stepsPerBar ${preset.stepsPerBar}`
    );
  }

  let xml = '';
  for (let step = 0; step < preset.stepsPerBar; step++) {
    const hits: number[] = [];
    for (const L of preset.layers) {
      if (L.pattern[step]) hits.push(L.gmMidi);
    }
    hits.sort((a, b) => a - b);

    if (hits.length === 0) {
      const parts = decomposeTicksToMinimalParts(stepTicks, measureCapacity);
      for (const t of parts) {
        const spec = tickSpecForLength(t);
        xml += noteXmlRestFragment({
          durationTicks: t,
          voice: VOICE,
          typeAndDotsXml: typeAndDotsXml(spec),
          staffXml: '<staff>1</staff>',
        });
      }
      continue;
    }

    for (let i = 0; i < hits.length; i++) {
      const g = greekPercussionDrumGlyph(hits[i]!);
      xml += drumHitNoteXml({
        chord: i > 0,
        ticks480: stepTicks,
        step: g.step,
        octave: g.octave,
        stem: g.stem,
        notehead: g.notehead,
        accidentalXml: g.accidentalXml,
      });
    }
  }

  return xml;
}

/**
 * One-part percussion staff (P1), MusicXML 4.0, clef percussion, five-line staff.
 * `bars` defaults to **2** — repeats the same grid pattern for each bar.
 */
export function exportGreekRhythmToMusicXml(preset: RhythmPreset, bars = 2): string {
  validateRhythmPreset(preset);
  const barCount = Math.min(256, Math.max(1, Math.floor(Number(bars)) || 2));
  const cap = measureTicksForPreset(preset);
  const inner = buildMeasureInnerXml(preset, cap);

  const title = escapeXml(preset.workTitle);
  const bpm = Math.min(300, Math.max(40, Math.round(preset.defaultTempo)));
  const beats = preset.timeSignature.beats;
  const beatType = preset.timeSignature.beatType;
  const divisions = MUSIC_XML_DIVISIONS_PER_QUARTER;

  const attrs = `    <attributes>
      <divisions>${divisions}</divisions>
      <key><fifths>0</fifths><mode>major</mode></key>
      <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
      <staves>1</staves>
      <staff-details number="1"><staff-lines>5</staff-lines></staff-details>
      <clef number="1"><sign>percussion</sign><line>2</line></clef>
    </attributes>`;

  const tempoDir = `    <direction placement="above">
      <direction-type>
        <metronome>
          <beat-unit>quarter</beat-unit>
          <per-minute>${bpm}</per-minute>
        </metronome>
      </direction-type>
      <sound tempo="${bpm}"/>
    </direction>`;

  let measuresXml = '';
  for (let m = 1; m <= barCount; m++) {
    const head = m === 1 ? `${attrs}\n${tempoDir}\n` : '';
    measuresXml += `  <measure number="${m}">\n${head}${inner}  </measure>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${title}</work-title></work>
  <part-list>
    <score-part id="${PART_ID}">
      <part-name>Greek Rebetiko Percussion</part-name>
      <score-instrument id="${INST_ID}"><instrument-name>GM Drum Kit</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="${PART_ID}">
${measuresXml}  </part>
</score-partwise>
`;
}
