/**
 * Second line / NOLA brass percussion grid → MusicXML 4.0 (GM unpitched; voices + backup, no chord stacks).
 */

import type { SecondLineRhythmPreset } from './secondLineRhythmTypes';
import {
  DEFAULT_SECOND_LINE_RHYTHM_PRESET_ID,
  getSecondLineRhythmPresetById,
  SECOND_LINE_RHYTHM_PRESETS,
} from './secondLineRhythmPresets';
import { validateSecondLineRhythmPreset } from './secondLineRhythmValidate';
import { MUSIC_XML_DIVISIONS_PER_QUARTER } from '../score-model/scoreModelTypes';
import { noteXmlRestFragment } from '../export/musicXmlNoteFragment';
import {
  decomposeTicksToMinimalParts,
  tickSpecForLength,
  typeAndDotsXml,
  type TickNoteSpec,
} from '../export/musicXmlTickEncoding';

export {
  DEFAULT_SECOND_LINE_RHYTHM_PRESET_ID,
  getSecondLineRhythmPresetById,
  SECOND_LINE_RHYTHM_PRESETS,
} from './secondLineRhythmPresets';

/** Matches `RhythmOutputEngine` in app `outputPaths.ts` for save routing. */
export const SECOND_LINE_RHYTHM_EXPORT_ENGINE = 'second-line' as const;

const PART_ID = 'P1';
const STAFF_1 = '<staff>1</staff>';

type LaneKey = keyof SecondLineRhythmPreset['lanes'];

const STEP_LANE_ORDER: LaneKey[] = ['low', 'high', 'jingle', 'ghost'];

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function drumUnpitchedDisplay(step: string, octave: number): string {
  return `<unpitched><display-step>${step}</display-step><display-octave>${octave}</display-octave></unpitched>`;
}

function instrumentIdForGm(gm: number): string {
  return `${PART_ID}-I${gm}`;
}

function parseMeterSignature(signature: string): { beats: number; beatType: number } {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(signature.trim());
  if (!m) {
    throw new Error(`secondLineRhythmMusicXmlExporter: invalid meter signature "${signature}"`);
  }
  return { beats: Number(m[1]), beatType: Number(m[2]) };
}

/** GM kit notes — display only (octaves 4–5). */
function secondLinePercussionDrumGlyph(midi: number): {
  step: string;
  octave: number;
  accidentalXml: string;
  notehead: 'x' | 'normal';
} {
  switch (midi) {
    case 36:
      return { step: 'F', octave: 4, accidentalXml: '', notehead: 'normal' };
    case 37:
      return { step: 'C', octave: 5, accidentalXml: '', notehead: 'normal' };
    case 38:
      return { step: 'D', octave: 4, accidentalXml: '', notehead: 'normal' };
    case 42:
      return { step: 'F', octave: 5, accidentalXml: '<accidental>sharp</accidental>', notehead: 'x' };
    case 54:
      return { step: 'D', octave: 5, accidentalXml: '', notehead: 'normal' };
    case 56:
      return { step: 'E', octave: 5, accidentalXml: '', notehead: 'normal' };
    default:
      throw new Error(`secondLineRhythmMusicXmlExporter: unsupported GM percussion MIDI ${midi}`);
  }
}

function stemForVoiceSlot(voice: 1 | 2 | 3 | 4): 'up' | 'down' {
  return voice === 1 ? 'down' : 'up';
}

function drumUnpitchedHitNoteXml(opts: {
  ticks480: number;
  step: string;
  octave: number;
  stem: 'up' | 'down';
  notehead: 'x' | 'normal';
  accidentalXml: string;
  voice: 1 | 2 | 3 | 4;
  instrumentId: string;
}): string {
  const spec: TickNoteSpec = tickSpecForLength(opts.ticks480);
  const typeDots = typeAndDotsXml(spec);
  const nh = opts.notehead === 'x' ? '<notehead>x</notehead>' : '';
  const body = `${drumUnpitchedDisplay(opts.step, opts.octave)}<duration>${opts.ticks480}</duration><instrument id="${opts.instrumentId}"/><voice>${opts.voice}</voice>${typeDots}${opts.accidentalXml}<stem>${opts.stem}</stem>${nh}${STAFF_1}`;
  return `        <note>${body}</note>\n`;
}

function measureTicksForPreset(p: SecondLineRhythmPreset): number {
  const { beats, beatType } = parseMeterSignature(p.meter.signature);
  const quarters = (beats * 4) / beatType;
  return Math.round(quarters * MUSIC_XML_DIVISIONS_PER_QUARTER);
}

function laneVoice(lane: LaneKey): 1 | 2 | 3 | 4 {
  if (lane === 'low') return 1;
  if (lane === 'high') return 2;
  if (lane === 'jingle') return 3;
  return 4;
}

function buildMeasureInnerXml(preset: SecondLineRhythmPreset, measureCapacity: number): string {
  const mTicks = measureTicksForPreset(preset);
  const stepTicks = mTicks / preset.meter.gridSteps;
  if (!Number.isInteger(stepTicks)) {
    throw new Error(
      `secondLineRhythmMusicXmlExporter: measure ${mTicks} ticks not divisible by gridSteps ${preset.meter.gridSteps}`
    );
  }

  let xml = '';
  for (let step = 0; step < preset.meter.gridSteps; step++) {
    for (let vi = 0; vi < STEP_LANE_ORDER.length; vi++) {
      const lane = STEP_LANE_ORDER[vi];
      const voice = laneVoice(lane);
      if (vi > 0) {
        xml += `        <backup><duration>${stepTicks}</duration></backup>\n`;
      }
      const vel = preset.lanes[lane][step] ?? 0;
      const gmMidi = preset.gmNoteMap[lane];
      const hitGm = vel > 0 ? gmMidi : null;
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
        const g = secondLinePercussionDrumGlyph(hitGm);
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

function uniqueGmMidiSorted(preset: SecondLineRhythmPreset): number[] {
  const m = preset.gmNoteMap;
  return [...new Set([m.low, m.high, m.jingle, m.ghost])].sort((a, b) => a - b);
}

function secondLineScorePartListXml(preset: SecondLineRhythmPreset): string {
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
      <part-name>Second Line Rhythm Percussion</part-name>
      <part-abbreviation>Perc.</part-abbreviation>${instrumentsAndMidi}
    </score-part>`;
}

function defaultTempoFromPreset(preset: SecondLineRhythmPreset, tempoBpmOverride?: number): number {
  if (tempoBpmOverride != null && Number.isFinite(tempoBpmOverride)) {
    return Math.round(tempoBpmOverride);
  }
  const [a, b] = preset.feel.tempoBPMRange;
  return Math.round((a + b) / 2);
}

/**
 * One-part percussion staff (P1), MusicXML 4.0, percussion clef. `bars` defaults to **2**.
 * Optional `tempoBpmOverride` sets the written tempo (feel slider).
 */
export function exportSecondLineRhythmToMusicXml(
  preset: SecondLineRhythmPreset,
  bars = 2,
  tempoBpmOverride?: number
): string {
  const v = validateSecondLineRhythmPreset(preset);
  if (!v.ok) {
    throw new Error(`secondLineRhythmMusicXmlExporter: invalid preset ${preset.id}: ${v.errors.join('; ')}`);
  }
  const barCount = Math.min(256, Math.max(1, Math.floor(Number(bars)) || 2));
  const cap = measureTicksForPreset(preset);
  const inner = buildMeasureInnerXml(preset, cap);

  const title = escapeXml(preset.id.replace(/-/g, ' '));
  const bpm = Math.min(300, Math.max(40, defaultTempoFromPreset(preset, tempoBpmOverride)));
  const { beats, beatType } = parseMeterSignature(preset.meter.signature);
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

  const partList = secondLineScorePartListXml(preset);

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
