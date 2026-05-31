/**
 * MusicXML 4.0 drum export from ImportedGrooveMusicContext (v1.7p2).
 * GM unpitched kit · two voices · backup between layers.
 */

import { loopGrooveEventsForSection } from './attachGrooveToSections';
import {
  beatsPerBarFromTimeSignature,
  GmDrumPitch,
  type GrooveDrumEvent,
  type GrooveSectionAssignment,
  type ImportedGrooveMusicContext,
} from './importGrooveMidiTypes';
import { noteXmlRestFragment } from '../export/musicXmlNoteFragment';
import {
  decomposeTicksToMinimalParts,
  tickSpecForLength,
  typeAndDotsXml,
} from '../export/musicXmlTickEncoding';

const PART_ID = 'P1';
const DIVISIONS = 480;
const SIXTEENTH_TICKS = 120;
const STAFF_XML = '<staff>1</staff>';

type DrumVoice = 1 | 2;
type NoteheadKind = 'normal' | 'x' | 'slash';

interface DrumDisplaySpec {
  instrumentName: string;
  step: string;
  octave: number;
  voice: DrumVoice;
  stem: 'up' | 'down';
  notehead: NoteheadKind;
}

const EXPORTED_GM_PITCHES: readonly GmDrumPitch[] = [
  GmDrumPitch.KICK,
  GmDrumPitch.SNARE,
  GmDrumPitch.SNARE_RIM,
  GmDrumPitch.HI_HAT_CLOSED,
  GmDrumPitch.HI_HAT_OPEN,
  GmDrumPitch.RIDE,
  GmDrumPitch.HI_HAT_FOOT,
];

const DISPLAY_BY_PITCH: Record<number, DrumDisplaySpec> = {
  [GmDrumPitch.KICK]: {
    instrumentName: 'Kick Drum',
    step: 'F',
    octave: 4,
    voice: 2,
    stem: 'down',
    notehead: 'normal',
  },
  [GmDrumPitch.SNARE]: {
    instrumentName: 'Snare Drum',
    step: 'C',
    octave: 5,
    voice: 1,
    stem: 'up',
    notehead: 'normal',
  },
  [GmDrumPitch.SNARE_RIM]: {
    instrumentName: 'Snare Rimshot',
    step: 'C',
    octave: 5,
    voice: 1,
    stem: 'up',
    notehead: 'slash',
  },
  [GmDrumPitch.HI_HAT_CLOSED]: {
    instrumentName: 'Closed Hi-Hat',
    step: 'G',
    octave: 5,
    voice: 1,
    stem: 'up',
    notehead: 'x',
  },
  [GmDrumPitch.HI_HAT_OPEN]: {
    instrumentName: 'Open Hi-Hat',
    step: 'G',
    octave: 5,
    voice: 1,
    stem: 'up',
    notehead: 'x',
  },
  [GmDrumPitch.RIDE]: {
    instrumentName: 'Ride Cymbal',
    step: 'A',
    octave: 5,
    voice: 1,
    stem: 'up',
    notehead: 'x',
  },
  [GmDrumPitch.HI_HAT_FOOT]: {
    instrumentName: 'Pedal Hi-Hat',
    step: 'D',
    octave: 4,
    voice: 2,
    stem: 'down',
    notehead: 'x',
  },
};

interface TimedHit {
  tick: number;
  pitch: GmDrumPitch;
  velocity: number;
}

function instrumentId(gm: number): string {
  return `${PART_ID}-I${gm}`;
}

function quantizeTick(tick: number, max: number): number {
  const q = Math.round(tick / SIXTEENTH_TICKS) * SIXTEENTH_TICKS;
  return Math.min(max, Math.max(0, q));
}

function quantizeDuration(duration: number, max: number): number {
  const q = Math.round(duration / SIXTEENTH_TICKS) * SIXTEENTH_TICKS;
  return Math.min(max, Math.max(SIXTEENTH_TICKS, q));
}

function beatToTick(beat: number, measureCapacity: number): number {
  return quantizeTick(Math.round(beat * DIVISIONS), measureCapacity);
}

function unpitchedXml(step: string, octave: number): string {
  return `<unpitched><display-step>${step}</display-step><display-octave>${octave}</display-octave></unpitched>`;
}

function noteheadXml(kind: NoteheadKind): string {
  if (kind === 'x') return '<notehead>x</notehead>';
  if (kind === 'slash') return '<notehead>slash</notehead>';
  return '';
}

function beamXmlForEighth(indexInRun: number, runLength: number): string {
  if (runLength <= 1) return '';
  if (indexInRun === 0) return '<beam number="1">begin</beam>';
  if (indexInRun === runLength - 1) return '<beam number="1">end</beam>';
  return '<beam number="1">continue</beam>';
}

function drumHitNoteXml(opts: {
  pitch: GmDrumPitch;
  durationTicks: number;
  chord: boolean;
  beamIndex?: number;
  beamRunLength?: number;
}): string {
  const spec = DISPLAY_BY_PITCH[opts.pitch];
  if (!spec) {
    throw new Error(`exportGrooveDrumsMusicXml: unsupported GM pitch ${opts.pitch}`);
  }
  const tickSpec = tickSpecForLength(opts.durationTicks);
  const typeDots = typeAndDotsXml(tickSpec);
  const beam =
    opts.durationTicks === 240 && opts.beamIndex != null && opts.beamRunLength != null
      ? beamXmlForEighth(opts.beamIndex, opts.beamRunLength)
      : '';
  const chordEl = opts.chord ? '<chord/>' : '';
  return `        <note>${chordEl}${unpitchedXml(spec.step, spec.octave)}<duration>${opts.durationTicks}</duration><instrument id="${instrumentId(opts.pitch)}"/><voice>${spec.voice}</voice>${typeDots}<stem>${spec.stem}</stem>${noteheadXml(spec.notehead)}${beam}${STAFF_XML}</note>\n`;
}

function emitRestTicks(ticksParts: number[], voice: DrumVoice): string {
  let xml = '';
  for (const t of ticksParts) {
    const spec = tickSpecForLength(t);
    xml += noteXmlRestFragment({
      durationTicks: t,
      voice,
      typeAndDotsXml: typeAndDotsXml(spec),
      staffXml: STAFF_XML,
    });
  }
  return xml;
}

function assignEighthBeamRuns(durations: number[]): { index: number; runLength: number }[] {
  const meta = durations.map(() => ({ index: 0, runLength: 1 }));
  let i = 0;
  while (i < durations.length) {
    if (durations[i] !== 240) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < durations.length && durations[j] === 240) j += 1;
    const runLength = j - i;
    for (let k = i; k < j; k += 1) {
      meta[k] = { index: k - i, runLength };
    }
    i = j;
  }
  return meta;
}

function buildVoiceLayerXml(hits: TimedHit[], voice: DrumVoice, measureCapacity: number): string {
  const voiceHits = hits
    .filter((h) => DISPLAY_BY_PITCH[h.pitch]?.voice === voice)
    .sort((a, b) => a.tick - b.tick || a.pitch - b.pitch);

  let xml = '';
  let cursor = 0;

  if (voiceHits.length === 0) {
    return emitRestTicks(decomposeTicksToMinimalParts(measureCapacity, measureCapacity), voice);
  }

  const tickGroups = new Map<number, TimedHit[]>();
  for (const hit of voiceHits) {
    const group = tickGroups.get(hit.tick) ?? [];
    group.push(hit);
    tickGroups.set(hit.tick, group);
  }
  const ticks = [...tickGroups.keys()].sort((a, b) => a - b);

  const noteDurations: number[] = [];
  for (let i = 0; i < ticks.length; i += 1) {
    const tick = ticks[i]!;
    const nextTick = i + 1 < ticks.length ? ticks[i + 1]! : Math.min(measureCapacity, tick + DIVISIONS);
    noteDurations.push(quantizeDuration(nextTick - tick, measureCapacity - tick));
  }
  const beamMeta = assignEighthBeamRuns(noteDurations);

  for (let i = 0; i < ticks.length; i += 1) {
    const tick = ticks[i]!;
    const group = tickGroups.get(tick)!;
    if (tick > cursor) {
      xml += emitRestTicks(
        decomposeTicksToMinimalParts(tick - cursor, measureCapacity),
        voice,
      );
      cursor = tick;
    }
    const dur = noteDurations[i]!;
    const parts = decomposeTicksToMinimalParts(dur, measureCapacity);
    let partOffset = 0;
    for (let pi = 0; pi < parts.length; pi += 1) {
      const partDur = parts[pi]!;
      const isFirstPart = pi === 0;
      group.forEach((hit, hi) => {
        xml += drumHitNoteXml({
          pitch: hit.pitch,
          durationTicks: partDur,
          chord: !isFirstPart || hi > 0,
          beamIndex: pi === 0 ? beamMeta[i]!.index : undefined,
          beamRunLength: pi === 0 ? beamMeta[i]!.runLength : undefined,
        });
      });
      partOffset += partDur;
    }
    cursor = tick + dur;
  }

  if (cursor < measureCapacity) {
    xml += emitRestTicks(
      decomposeTicksToMinimalParts(measureCapacity - cursor, measureCapacity),
      voice,
    );
  }

  return xml;
}

function expandedEventsByAssignment(assignment: GrooveSectionAssignment): GrooveDrumEvent[] {
  const preExpanded = assignment.groove.events.some(
    (e) =>
      e.beatPosition >=
      beatsPerBarFromTimeSignature(
        assignment.groove.timeSignatureNumerator,
        assignment.groove.timeSignatureDenominator,
      ) *
        (assignment.endBar - assignment.startBar),
  );
  if (preExpanded && assignment.groove.events.length > 0) {
    return assignment.groove.events;
  }
  return loopGrooveEventsForSection(assignment.groove, assignment.startBar, assignment.endBar);
}

function eventsForBar(
  assignment: GrooveSectionAssignment,
  sectionEvents: GrooveDrumEvent[],
  barNum: number,
  beatsPerBar: number,
): GrooveDrumEvent[] {
  const localBar = barNum - assignment.startBar;
  const barStartQ = localBar * beatsPerBar;
  const barEndQ = barStartQ + beatsPerBar;
  return sectionEvents
    .filter((e) => e.beatPosition >= barStartQ - 1e-9 && e.beatPosition < barEndQ - 1e-9)
    .map((e) => ({
      ...e,
      beatPosition: e.beatPosition - barStartQ,
    }));
}

function hitsFromBarEvents(events: GrooveDrumEvent[], measureCapacity: number): TimedHit[] {
  const hits: TimedHit[] = [];
  for (const event of events) {
    if (!DISPLAY_BY_PITCH[event.pitch]) continue;
    hits.push({
      tick: beatToTick(event.beatPosition, measureCapacity),
      pitch: event.pitch,
      velocity: event.velocity,
    });
  }
  return hits;
}

function scorePartListXml(): string {
  let blocks = '';
  for (const gm of EXPORTED_GM_PITCHES) {
    const id = instrumentId(gm);
    const name = DISPLAY_BY_PITCH[gm]!.instrumentName;
    blocks += `
      <score-instrument id="${id}">
        <instrument-name>${name}</instrument-name>
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
      <part-name>Drum Set</part-name>${blocks}
    </score-part>`;
}

function firstMeasureAttributesXml(
  tempo: number,
  timeSignatureNumerator: number,
  timeSignatureDenominator: number,
): string {
  return `    <attributes>
      <divisions>${DIVISIONS}</divisions>
      <time><beats>${timeSignatureNumerator}</beats><beat-type>${timeSignatureDenominator}</beat-type></time>
      <clef><sign>percussion</sign></clef>
      <staff-details><staff-lines>5</staff-lines></staff-details>
    </attributes>
    <direction placement="above">
      <direction-type>
        <metronome>
          <beat-unit>quarter</beat-unit>
          <per-minute>${Math.round(tempo)}</per-minute>
        </metronome>
      </direction-type>
      <sound tempo="${Math.round(tempo)}"/>
    </direction>`;
}

function buildMeasureXml(
  barNum: number,
  hits: TimedHit[],
  measureCapacity: number,
  includeAttributes: boolean,
  tempo: number,
  timeSignatureNumerator: number,
  timeSignatureDenominator: number,
): string {
  const head = includeAttributes
    ? `${firstMeasureAttributesXml(tempo, timeSignatureNumerator, timeSignatureDenominator)}\n`
    : '';
  const voice1 = buildVoiceLayerXml(hits, 1, measureCapacity);
  const voice2 = buildVoiceLayerXml(hits, 2, measureCapacity);
  const backup = `        <backup><duration>${measureCapacity}</duration></backup>\n`;
  return `  <measure number="${barNum}">\n${head}${voice1}${backup}${voice2}  </measure>\n`;
}

/**
 * Export imported groove assignments to a complete MusicXML 4.0 partwise document (drum set only).
 */
export function exportGrooveDrumsToMusicXml(
  context: ImportedGrooveMusicContext,
  tempo: number,
  timeSignatureNumerator: number,
  timeSignatureDenominator: number,
): string {
  const beatsPerBar = beatsPerBarFromTimeSignature(timeSignatureNumerator, timeSignatureDenominator);
  const measureCapacity = Math.round(DIVISIONS * beatsPerBar);
  const totalBars = Math.max(
    context.totalBars,
    context.assignments.length === 0 ? 0 : Math.max(...context.assignments.map((a) => a.endBar)),
  );

  const expandedByAssignment = new Map<GrooveSectionAssignment, GrooveDrumEvent[]>();
  for (const assignment of context.assignments) {
    expandedByAssignment.set(assignment, expandedEventsByAssignment(assignment));
  }

  let measuresXml = '';
  for (let bar = 1; bar <= totalBars; bar += 1) {
    const assignment = context.assignments.find((a) => bar >= a.startBar && bar <= a.endBar);
    const sectionEvents = assignment ? expandedByAssignment.get(assignment)! : [];
    const barEvents = assignment
      ? eventsForBar(assignment, sectionEvents, bar, beatsPerBar)
      : [];
    const hits = hitsFromBarEvents(barEvents, measureCapacity);
    measuresXml += buildMeasureXml(
      bar,
      hits,
      measureCapacity,
      bar === 1,
      tempo,
      timeSignatureNumerator,
      timeSignatureDenominator,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
${scorePartListXml()}
  </part-list>
  <part id="${PART_ID}">
${measuresXml}  </part>
</score-partwise>
`;
}
