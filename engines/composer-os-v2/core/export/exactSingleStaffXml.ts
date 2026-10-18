/**
 * Single-staff exact-duration MusicXML. Piano grand-staff export does not call this.
 * Durations are already sounding ticks. time-modification is not applied again.
 */

import type { MeasureModel, NoteEvent, PartModel, PianoExactTiming, RestEvent } from '../score-model/scoreModelTypes';
import { PIANO_V11_EXPORT_PPQ, integralTicks } from '../piano/pianoExactTiming';
import { midiToPitch, noteXmlPitchedFragment, noteXmlRestFragment, pitchPartsForExport } from './musicXmlNoteFragment';

function exactTicks(exact: PianoExactTiming, label: string): { start: number; duration: number } {
  const start = integralTicks(exact.onsetQ, PIANO_V11_EXPORT_PPQ);
  const duration = integralTicks(exact.durationQ, PIANO_V11_EXPORT_PPQ);
  if (start === null || duration === null || duration < 1) {
    throw new Error(`exact export cannot represent ${label} at PPQ ${PIANO_V11_EXPORT_PPQ}`);
  }
  return { start, duration };
}

function typeXml(exact: PianoExactTiming): string {
  const dots = '<dot/>'.repeat(exact.dots);
  const mod = exact.tuplet
    ? `<time-modification><actual-notes>${exact.tuplet.actualNotes}</actual-notes><normal-notes>${exact.tuplet.normalNotes}</normal-notes><normal-type>${exact.tuplet.normalType}</normal-type></time-modification>`
    : '';
  return `<type>${exact.writtenType}</type>${dots}${mod}`;
}

function tieXml(exact: PianoExactTiming, note: NoteEvent): { sound: string; notations: string } {
  const cross = note.notation?.tie;
  const stop = cross === 'stop' || cross === 'continue';
  const start = cross === 'start' || cross === 'continue';
  const sound = `${stop ? '<tie type="stop"/>' : ''}${start ? '<tie type="start"/>' : ''}`;
  const tied = `${stop ? '<tied type="stop"/>' : ''}${start ? '<tied type="start"/>' : ''}`;
  const tuplet = exact.tuplet && exact.tuplet.bracket !== 'continue'
    ? `<tuplet type="${exact.tuplet.bracket}" number="1" bracket="yes"/>`
    : '';
  const notations = tied || tuplet ? `<notations>${tied}${tuplet}</notations>` : '';
  return { sound, notations };
}

export function measureUsesExactStaff(measure: MeasureModel): boolean {
  return measure.events.some((event) => (event.kind === 'note' || event.kind === 'rest') && !!event.pianoExact);
}

export function exactSingleStaffEventsToXml(
  measure: MeasureModel,
  part: PartModel,
  preferFlats: boolean,
  measureCapacity: number,
): string {
  const byVoice = new Map<number, (NoteEvent | RestEvent)[]>();
  for (const event of measure.events) {
    if (event.kind !== 'note' && event.kind !== 'rest') continue;
    if (!event.pianoExact) throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} mixes exact and legacy timing`);
    const voice = event.voice ?? 1;
    const list = byVoice.get(voice) ?? [];
    list.push(event);
    byVoice.set(voice, list);
  }
  const voices = [...byVoice.keys()].sort((a, b) => a - b);
  let xml = '';
  for (let layer = 0; layer < voices.length; layer += 1) {
    const voice = voices[layer]!;
    if (layer > 0) xml += `        <backup><duration>${measureCapacity}</duration></backup>\n`;
    const voiceEvents = [...(byVoice.get(voice) ?? [])].sort((a, b) => exactTicks(a.pianoExact!, 'onset').start - exactTicks(b.pianoExact!, 'onset').start);
    let cursor = 0;
    for (const event of voiceEvents) {
      const ticks = exactTicks(event.pianoExact!, `${event.kind} bar ${measure.index}`);
      if (ticks.start !== cursor) {
        throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} gap at tick ${cursor}`);
      }
      const typeAndDots = typeXml(event.pianoExact!);
      if (event.kind === 'rest') {
        xml += noteXmlRestFragment({
          durationTicks: ticks.duration,
          voice,
          typeAndDotsXml: typeAndDots,
          trailingXml: event.pianoExact?.tuplet && event.pianoExact.tuplet.bracket !== 'continue'
            ? `<notations><tuplet type="${event.pianoExact.tuplet.bracket}" number="1" bracket="yes"/></notations>`
            : '',
        });
      } else {
        const pitches = [event.pitch, ...(event.pitches ?? []).filter((pitch) => pitch !== event.pitch)];
        const ties = tieXml(event.pianoExact!, event);
        for (let index = 0; index < pitches.length; index += 1) {
          const midi = pitches[index]!;
          const listed = event.stackSpellings?.[index] ?? (index === 0 ? event.spelling : undefined);
          const spelled = listed ? pitchPartsForExport(midi, preferFlats, listed) : midiToPitch(midi, preferFlats);
          const alter = spelled.alter !== 0 ? `<alter>${spelled.alter}</alter>` : '';
          xml += noteXmlPitchedFragment({
            dynamicsAttr: '',
            chordXml: index > 0 ? '<chord/>' : '',
            pitchXml: `<pitch><step>${spelled.step}</step>${alter}<octave>${spelled.octave}</octave></pitch>`,
            durationTicks: ticks.duration,
            tieXml: ties.sound,
            voice,
            typeAndDotsXml: typeAndDots,
            stemXml: voices.length > 1 ? (voice % 2 === 1 ? '<stem>up</stem>' : '<stem>down</stem>') : '',
            notationsXml: index === 0 ? ties.notations : '',
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
