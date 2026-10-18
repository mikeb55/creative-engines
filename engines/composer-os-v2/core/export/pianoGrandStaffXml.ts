/**
 * Grand-staff serialization for an explicit PartModel.pianoGrandStaff contract.
 * Absent configuration never reaches this module.
 * A same-duration stack counts once on the rhythmic cursor and expands to chord followers.
 * Every pitch of every decomposed segment receives sound ties and notation ties.
 */

import { DIVISIONS, type MeasureModel, type NoteEvent, type PartModel, type PianoExactTiming, type PianoPedalEvent, type RestEvent, type ScoreEvent } from '../score-model/scoreModelTypes';
import { pianoStaffForVoice } from '../piano/pianoTypes';
import { PIANO_V11_EXPORT_PPQ, integralTicks } from '../piano/pianoExactTiming';
import {
  beatSpanToTicks,
  tickSpecForLength,
  typeAndDotsXml,
} from './musicXmlTickEncoding';
import { midiToPitch, noteXmlPitchedFragment, noteXmlRestFragment, pitchPartsForExport } from './musicXmlNoteFragment';
import { v34NotationsXml } from './v34NotationXml';

function stemXml(voice: number): string {
  return voice % 2 === 1 ? '<stem>up</stem>' : '<stem>down</stem>';
}

function segmentTies(
  index: number,
  count: number,
  cross: 'start' | 'stop' | 'continue' | undefined,
): { sound: string; notations: string } {
  let stop = false;
  let start = false;
  if (count > 1 && index > 0) stop = true;
  if (count > 1 && index < count - 1) start = true;
  if ((cross === 'stop' || cross === 'continue') && index === 0) stop = true;
  if ((cross === 'start' || cross === 'continue') && index === count - 1) start = true;
  const sound = `${stop ? '<tie type="stop"/>' : ''}${start ? '<tie type="start"/>' : ''}`;
  const tied = `${stop ? '<tied type="stop"/>' : ''}${start ? '<tied type="start"/>' : ''}`;
  return { sound, notations: tied ? `<notations>${tied}</notations>` : '' };
}

function mergeNotations(tieNotations: string, other: string): string {
  if (!tieNotations) return other;
  if (!other) return tieNotations;
  const inner = (xml: string) => xml.replace(/^<notations>/, '').replace(/<\/notations>$/, '');
  return `<notations>${inner(tieNotations)}${inner(other)}</notations>`;
}

function stackFollowers(note: NoteEvent): number[] {
  const listed = note.pitches ?? [];
  if (listed.length > 1) return listed.slice(1).filter((pitch) => pitch !== note.pitch);
  return listed.filter((pitch) => pitch !== note.pitch);
}

function exactTicks(exact: PianoExactTiming, label: string): { start: number; duration: number } {
  const start = integralTicks(exact.onsetQ, PIANO_V11_EXPORT_PPQ);
  const duration = integralTicks(exact.durationQ, PIANO_V11_EXPORT_PPQ);
  if (start === null || duration === null || duration < 1) {
    throw new Error(`Piano V1.1 exact export cannot represent ${label} at PPQ ${PIANO_V11_EXPORT_PPQ}`);
  }
  return { start, duration };
}

function exactTypeXml(exact: PianoExactTiming): string {
  const dots = '<dot/>'.repeat(exact.dots);
  const mod = exact.tuplet
    ? `<time-modification><actual-notes>${exact.tuplet.actualNotes}</actual-notes><normal-notes>${exact.tuplet.normalNotes}</normal-notes><normal-type>${exact.tuplet.normalType}</normal-type></time-modification>`
    : '';
  return `<type>${exact.writtenType}</type>${dots}${mod}`;
}

function tupletNumber(events: readonly (NoteEvent | RestEvent)[], exact: PianoExactTiming): number {
  if (!exact.tuplet) return 1;
  const ids: string[] = [];
  for (const event of events) {
    const group = event.pianoExact?.tuplet?.groupId;
    if (group && !ids.includes(group)) ids.push(group);
  }
  return ids.indexOf(exact.tuplet.groupId) + 1;
}

function exactNotation(exact: PianoExactTiming, number: number, ties: string): string {
  const tuplet = exact.tuplet && exact.tuplet.bracket !== 'continue'
    ? `<tuplet type="${exact.tuplet.bracket}" number="${number}" bracket="yes"/>`
    : '';
  const beams = (exact.beams ?? []).map((beam) => `<beam number="${beam.number}">${beam.value}</beam>`).join('');
  const notations = ties || tuplet ? `<notations>${ties}${tuplet}</notations>` : '';
  return `${beams}${notations}`;
}

/**
 * Scoped exact path. Durations are already sounding ticks.
 * time-modification is not applied again.
 */
function pianoExactGrandStaffXml(
  measure: MeasureModel,
  part: PartModel,
  preferFlats: boolean,
  measureCapacity: number,
): string {
  const contract = part.pianoGrandStaff;
  if (!contract || contract.kind !== 'grand-staff-v1') {
    throw new Error(`MusicXML export: part ${part.id} has no piano grand-staff contract`);
  }
  const voices = contract.innerVoiceEnabled ? [1, 2, 3] : [1, 3];
  const allowed = new Set(voices);
  const byVoice = new Map<number, (NoteEvent | RestEvent)[]>();
  for (const voice of voices) byVoice.set(voice, []);
  for (const event of measure.events) {
    if (event.kind === 'chord') {
      throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} chord events are unsupported on the piano grand staff`);
    }
    if (event.kind !== 'note' && event.kind !== 'rest') continue;
    const voice = event.voice ?? 1;
    if (!allowed.has(voice)) {
      throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} is outside the piano contract`);
    }
    if (!event.pianoExact) {
      throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} mixes exact and legacy piano timing`);
    }
    byVoice.get(voice)!.push(event);
  }
  let xml = '';
  for (let layer = 0; layer < voices.length; layer += 1) {
    const voice = voices[layer]!;
    if (layer > 0) xml += `        <backup><duration>${measureCapacity}</duration></backup>\n`;
    const staffXml = `<staff>${pianoStaffForVoice(voice)}</staff>`;
    const stem = stemXml(voice);
    const voiceEvents = [...(byVoice.get(voice) ?? [])].sort((a, b) => exactTicks(a.pianoExact!, 'onset').start - exactTicks(b.pianoExact!, 'onset').start);
    let cursor = 0;
    for (const event of voiceEvents) {
      const ticks = exactTicks(event.pianoExact!, `${event.kind} bar ${measure.index}`);
      if (ticks.start < cursor) {
        throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} overlaps at tick ${ticks.start}`);
      }
      if (ticks.start !== cursor) {
        throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} has an unspelled gap at tick ${cursor}`);
      }
      const number = tupletNumber(voiceEvents, event.pianoExact!);
      const typeAndDots = exactTypeXml(event.pianoExact!);
      if (event.kind === 'rest') {
        const trailing = exactNotation(event.pianoExact!, number, '');
        xml += noteXmlRestFragment({
          durationTicks: ticks.duration,
          voice,
          typeAndDotsXml: typeAndDots,
          staffXml,
          trailingXml: trailing,
        });
      } else {
        const pitches = [event.pitch, ...stackFollowers(event)];
        const cross = event.notation?.tie;
        const ties = segmentTies(0, 1, cross);
        for (let pi = 0; pi < pitches.length; pi += 1) {
          const midi = pitches[pi]!;
          const spelled = pi === 0 && event.spelling
            ? pitchPartsForExport(midi, preferFlats, event.spelling)
            : midiToPitch(midi, preferFlats);
          const alterEl = spelled.alter !== 0 ? `<alter>${spelled.alter}</alter>` : '';
          const pitchXml = `<pitch><step>${spelled.step}</step>${alterEl}<octave>${spelled.octave}</octave></pitch>`;
          const notation = pi === 0 ? exactNotation(event.pianoExact!, number, ties.notations.replace(/^<notations>|<\/notations>$/g, '')) : '';
          const beam = pi === 0 ? (notation.match(/<beam\b[\s\S]*?<\/beam>/g) ?? []).join('') : '';
          const notationsXml = pi === 0 ? (notation.match(/<notations>[\s\S]*<\/notations>/)?.[0] ?? '') : (ties.notations);
          xml += noteXmlPitchedFragment({
            dynamicsAttr: '',
            chordXml: pi > 0 ? '<chord/>' : '',
            pitchXml,
            durationTicks: ticks.duration,
            tieXml: ties.sound,
            voice,
            typeAndDotsXml: typeAndDots,
            stemXml: stem,
            staffXml,
            beamXml: beam,
            notationsXml,
          });
        }
      }
      cursor += ticks.duration;
    }
    if (cursor !== measureCapacity) {
      throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice}: tick sum ${cursor} ≠ expected ${measureCapacity}`);
    }
  }
  return xml;
}

export function pianoGrandStaffEventsToXml(
  measure: MeasureModel,
  measureIndex: number,
  part: PartModel,
  decompose: (ticks: number) => number[],
  preferFlats: boolean,
  measureCapacity: number,
): string {
  const contract = part.pianoGrandStaff;
  if (!contract || contract.kind !== 'grand-staff-v1') {
    throw new Error(`MusicXML export: part ${part.id} has no piano grand-staff contract`);
  }
  if (measure.events.some((event) => (event.kind === 'note' || event.kind === 'rest') && event.pianoExact)) {
    return pianoExactGrandStaffXml(measure, part, preferFlats, measureCapacity);
  }
  const voices = contract.innerVoiceEnabled ? [1, 2, 3] : [1, 3];
  const allowed = new Set(voices);
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const voice of voices) byVoice.set(voice, []);
  for (const event of measure.events) {
    if (event.kind !== 'note' && event.kind !== 'rest' && event.kind !== 'chord') continue;
    const voice = event.voice ?? 1;
    if (!allowed.has(voice)) {
      throw new Error(
        `MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} is outside the three-lane piano contract`,
      );
    }
    if (event.kind === 'chord') {
      throw new Error(
        `MusicXML export: part ${part.id} measure ${measure.index} chord events are unsupported on the piano grand staff; use one NoteEvent pitches stack`,
      );
    }
    byVoice.get(voice)!.push(event);
  }

  let xml = '';
  for (let layer = 0; layer < voices.length; layer += 1) {
    const voice = voices[layer]!;
    if (layer > 0) {
      xml += `        <backup><duration>${measureCapacity}</duration></backup>\n`;
    }
    const staff = pianoStaffForVoice(voice);
    const staffXml = `<staff>${staff}</staff>`;
    const stem = stemXml(voice);
    const voiceEvents = [...(byVoice.get(voice) ?? [])].sort((a, b) => a.startBeat - b.startBeat);
    let cursor = 0;
    let voiceTickSum = 0;
    for (let i = 0; i < voiceEvents.length; i += 1) {
      const event = voiceEvents[i]!;
      const next = voiceEvents[i + 1];
      if (next && Math.abs(next.startBeat - event.startBeat) < 1e-6) {
        throw new Error(
          `MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} has simultaneous events; different durations need distinct voices and a stack must be one NoteEvent`,
        );
      }
      const { start: startDiv, end: endDiv } = beatSpanToTicks(event.startBeat, event.startBeat + event.duration, measureCapacity);
      if (startDiv < cursor) {
        throw new Error(
          `MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} overlaps at beat ${event.startBeat}`,
        );
      }
      if (startDiv > cursor) {
        for (const ticks of decompose(startDiv - cursor)) {
          const spec = tickSpecForLength(ticks);
          xml += noteXmlRestFragment({ durationTicks: ticks, voice, typeAndDotsXml: typeAndDotsXml(spec), staffXml });
          voiceTickSum += ticks;
        }
        cursor = startDiv;
      }
      if (endDiv <= startDiv) {
        throw new Error(
          `MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} dropped a zero-length event at beat ${event.startBeat}`,
        );
      }
      const parts = decompose(endDiv - startDiv);
      if (event.kind === 'rest') {
        for (const ticks of parts) {
          const spec = tickSpecForLength(ticks);
          xml += noteXmlRestFragment({ durationTicks: ticks, voice, typeAndDotsXml: typeAndDotsXml(spec), staffXml });
          voiceTickSum += ticks;
        }
      } else {
        const pitches = [event.pitch, ...stackFollowers(event)];
        const cross = event.notation?.tie;
        const art = event.notation
          ? v34NotationsXml({ ...event.notation, tie: undefined }, event.articulation, event.durationAccent)
          : '';
        for (let segment = 0; segment < parts.length; segment += 1) {
          const ticks = parts[segment]!;
          const spec = tickSpecForLength(ticks);
          const ties = segmentTies(segment, parts.length, cross);
          for (let pi = 0; pi < pitches.length; pi += 1) {
            const midi = pitches[pi]!;
            const spelled = pi === 0 && event.spelling
              ? pitchPartsForExport(midi, preferFlats, event.spelling)
              : midiToPitch(midi, preferFlats);
            const alterEl = spelled.alter !== 0 ? `<alter>${spelled.alter}</alter>` : '';
            const pitchXml = `<pitch><step>${spelled.step}</step>${alterEl}<octave>${spelled.octave}</octave></pitch>`;
            const notations = pi === 0 && segment === 0 ? mergeNotations(ties.notations, art) : ties.notations;
            xml += noteXmlPitchedFragment({
              dynamicsAttr: '',
              chordXml: pi > 0 ? '<chord/>' : '',
              pitchXml,
              durationTicks: ticks,
              tieXml: ties.sound,
              voice,
              typeAndDotsXml: typeAndDotsXml(spec),
              stemXml: stem,
              staffXml,
              notationsXml: notations,
            });
          }
          voiceTickSum += ticks;
        }
      }
      cursor = endDiv;
    }
    if (cursor < measureCapacity) {
      for (const ticks of decompose(measureCapacity - cursor)) {
        const spec = tickSpecForLength(ticks);
        xml += noteXmlRestFragment({ durationTicks: ticks, voice, typeAndDotsXml: typeAndDotsXml(spec), staffXml });
        voiceTickSum += ticks;
      }
    }
    if (voiceTickSum !== measureCapacity) {
      throw new Error(
        `MusicXML export: part ${part.id} measure ${measureIndex + 1} voice ${voice}: tick sum ${voiceTickSum} ≠ expected ${measureCapacity}`,
      );
    }
  }
  return xml;
}

export function pianoPedalDirectionXml(event: PianoPedalEvent): string {
  const offset = event.beat > 0
    ? `      <offset>${Math.round(event.beat * DIVISIONS)}</offset>\n`
    : '';
  return `    <direction placement="below">
      <direction-type>
        <pedal type="${event.type}" line="yes"/>
      </direction-type>
${offset}    </direction>
`;
}
