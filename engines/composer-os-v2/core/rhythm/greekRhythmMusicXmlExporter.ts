/**
 * Standalone Greek rebetiko percussion grid → MusicXML 4.0 (string output; Sibelius-oriented unpitched glyphs).
 * Simultaneous hits use separate voices + &lt;backup&gt; (no &lt;chord/&gt;) so Sibelius maps GM kits correctly.
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

/** Matches `RhythmOutputEngine` in app `outputPaths.ts` for save routing. */
export const GREEK_RHYTHM_EXPORT_ENGINE = 'greek' as const;

const PART_ID = 'P1';
const STAFF_1 = '<staff>1</staff>';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function drumUnpitchedDisplay(step: string, octave: number): string {
  return `<unpitched><display-step>${step}</display-step><display-octave>${octave}</display-octave></unpitched>`;
}

function instrumentIdForGm(gm: number): string {
  return `${PART_ID}-I${gm}`;
}

/** GM kit notes used by presets — display only (octaves 4–5). */
function greekPercussionDrumGlyph(midi: number): {
  step: string;
  octave: number;
  accidentalXml: string;
  notehead: 'x' | 'normal';
} {
  switch (midi) {
    case 36:
      return { step: 'F', octave: 4, accidentalXml: '', notehead: 'normal' };
    case 38:
      return { step: 'D', octave: 4, accidentalXml: '', notehead: 'normal' };
    case 42:
      return { step: 'F', octave: 5, accidentalXml: '<accidental>sharp</accidental>', notehead: 'x' };
    case 44:
      return { step: 'G', octave: 5, accidentalXml: '<accidental>sharp</accidental>', notehead: 'normal' };
    case 50:
      return { step: 'D', octave: 5, accidentalXml: '', notehead: 'normal' };
    case 56:
      return { step: 'E', octave: 5, accidentalXml: '', notehead: 'normal' };
    default:
      throw new Error(`greekRhythmMusicXmlExporter: unsupported GM percussion MIDI ${midi}`);
  }
}

function stemForVoiceSlot(voice: 1 | 2 | 3): 'up' | 'down' {
  return voice === 1 ? 'down' : 'up';
}

function drumUnpitchedHitNoteXml(opts: {
  ticks480: number;
  step: string;
  octave: number;
  stem: 'up' | 'down';
  notehead: 'x' | 'normal';
  accidentalXml: string;
  voice: 1 | 2 | 3;
  instrumentId: string;
}): string {
  const spec: TickNoteSpec = tickSpecForLength(opts.ticks480);
  const typeDots = typeAndDotsXml(spec);
  const nh = opts.notehead === 'x' ? '<notehead>x</notehead>' : '';
  const body = `${drumUnpitchedDisplay(opts.step, opts.octave)}<duration>${opts.ticks480}</duration><instrument id="${opts.instrumentId}"/><voice>${opts.voice}</voice>${typeDots}${opts.accidentalXml}<stem>${opts.stem}</stem>${nh}${STAFF_1}`;
  return `        <note>${body}</note>\n`;
}

function measureTicksForPreset(p: RhythmPreset): number {
  const { beats, beatType } = p.timeSignature;
  const quarters = (beats * 4) / beatType;
  return Math.round(quarters * MUSIC_XML_DIVISIONS_PER_QUARTER);
}

/** Layer index 0..2 → voices 1..3 (low / mid-high / high auxiliary). */
function buildMeasureInnerXml(preset: RhythmPreset, measureCapacity: number): string {
  if (preset.layers.length > 3) {
    throw new Error(`greekRhythmMusicXmlExporter: at most 3 layers for MusicXML export, got ${preset.layers.length}`);
  }
  const mTicks = measureTicksForPreset(preset);
  const stepTicks = mTicks / preset.stepsPerBar;
  if (!Number.isInteger(stepTicks)) {
    throw new Error(
      `greekRhythmMusicXmlExporter: measure ${mTicks} ticks not divisible by stepsPerBar ${preset.stepsPerBar}`
    );
  }

  let xml = '';
  for (let step = 0; step < preset.stepsPerBar; step++) {
    for (let vi = 0; vi < 3; vi++) {
      const voice = (vi + 1) as 1 | 2 | 3;
      if (vi > 0) {
        xml += `        <backup><duration>${stepTicks}</duration></backup>\n`;
      }
      const layer = preset.layers[vi];
      const hitGm = layer && layer.pattern[step] ? layer.gmMidi : null;
      if (hitGm === null) {
        const parts = decomposeTicksToMinimalParts(stepTicks, measureCapacity);
        for (const t of parts) {
          const spec = tickSpecForLength(t);
          xml += noteXmlRestFragment({
            durationTicks: t,
            voice,
            typeAndDotsXml: typeAndDotsXml(spec),
            staffXml: STAFF_1,
          });
        }
      } else {
        const g = greekPercussionDrumGlyph(hitGm);
        const stem = stemForVoiceSlot(voice);
        xml += drumUnpitchedHitNoteXml({
          ticks480: stepTicks,
          step: g.step,
          octave: g.octave,
          stem,
          notehead: g.notehead,
          accidentalXml: g.accidentalXml,
          voice,
          instrumentId: instrumentIdForGm(hitGm),
        });
      }
    }
  }

  return xml;
}

function uniqueGmMidiSorted(preset: RhythmPreset): number[] {
  return [...new Set(preset.layers.map((l) => l.gmMidi))].sort((a, b) => a - b);
}

function greekScorePartListXml(preset: RhythmPreset): string {
  const uniq = uniqueGmMidiSorted(preset);
  let instrumentsAndMidi = '';
  for (const gm of uniq) {
    const id = instrumentIdForGm(gm);
    instrumentsAndMidi += `
      <score-instrument id="${id}">
        <instrument-name>GM ${gm}</instrument-name>
        <instrument-sound>drum.kit</instrument-sound>
      </score-instrument>
      <midi-instrument id="${id}">
        <midi-channel>10</midi-channel>
        <midi-program>1</midi-program>
        <midi-unpitched>${gm}</midi-unpitched>
        <volume>78.7402</volume>
        <pan>0</pan>
      </midi-instrument>`;
  }

  return `    <score-part id="${PART_ID}">
      <part-name>Greek Rebetiko Percussion</part-name>
      <part-abbreviation>Perc.</part-abbreviation>${instrumentsAndMidi}
    </score-part>`;
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
      <clef number="1"><sign>percussion</sign><line>2</line></clef>
      <staff-details number="1"><staff-lines>5</staff-lines></staff-details>
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

  const partList = greekScorePartListXml(preset);

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${title}</work-title></work>
  <part-list>
${partList}
  </part-list>
  <part id="${PART_ID}">
${measuresXml}  </part>
</score-partwise>
`;
}
