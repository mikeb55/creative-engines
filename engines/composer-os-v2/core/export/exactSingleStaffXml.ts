/**
 * Single-staff exact-duration MusicXML. Piano grand-staff export does not call this.
 * Durations are already sounding ticks. time-modification is not applied again.
 * ChordEvent grips (no pianoExact) emit via the same pitch-stack pattern as eventsToXml.
 */

import type {
  ChordEvent,
  MeasureModel,
  NoteEvent,
  PartModel,
  PianoExactTiming,
  RestEvent,
} from '../score-model/scoreModelTypes';
import { PIANO_V11_EXPORT_PPQ, integralTicks } from '../piano/pianoExactTiming';
import { midiToPitch, noteXmlPitchedFragment, noteXmlRestFragment, pitchPartsForExport } from './musicXmlNoteFragment';
import {
  beatSpanToTicks,
  decomposeTicksToStandardParts,
  tickSpecForLength,
  typeAndDotsXml,
} from './musicXmlTickEncoding';

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

function expressionXml(note: NoteEvent): { slur: string; articulations: string } {
  const slur = note.notation?.slur === 'start' || note.notation?.slur === 'stop'
    ? `<slur type="${note.notation.slur}"/>`
    : '';
  const tags = (note.notation?.articulations ?? []).map((name) => {
    if (name === 'accent_staccato') return '<accent/><staccato/>';
    if (name === 'marcato') return '<strong-accent/>';
    if (name === 'staccatissimo') return '<staccatissimo/>';
    return `<${name}/>`;
  }).join('');
  return { slur, articulations: tags ? `<articulations>${tags}</articulations>` : '' };
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
  const expression = expressionXml(note);
  const notations = tied || expression.slur || tuplet || expression.articulations
    ? `<notations>${tied}${expression.slur}${tuplet}${expression.articulations}</notations>`
    : '';
  return { sound, notations };
}

function eventOnsetTicks(event: NoteEvent | RestEvent | ChordEvent, measureIndex: number): number {
  if (event.kind === 'chord') {
    return beatSpanToTicks(event.startBeat, event.startBeat + event.duration).start;
  }
  return exactTicks(event.pianoExact!, `${event.kind} bar ${measureIndex}`).start;
}

/**
 * Legacy eventsToXml ChordEvent pitch-stack serialization (no &lt;harmony&gt;).
 * Beat-1 chordSymbol stays on the exporter front-matter path.
 */
function chordEventPitchStackXml(
  chordEv: ChordEvent,
  voice: number,
  durationParts: number[],
  preferFlats: boolean,
  stemXml: string,
): string {
  const firstTicks = durationParts[0]!;
  const typeDots = typeAndDotsXml(tickSpecForLength(firstTicks));
  let xml = '';
  for (let pi = 0; pi < chordEv.pitches.length; pi++) {
    const mid = chordEv.pitches[pi]!;
    const { step, alter, octave } = midiToPitch(mid, preferFlats);
    const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
    const pitchXml = `<pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch>`;
    if (pi === 0) {
      const n = durationParts.length;
      for (let i = 0; i < n; i++) {
        const t = durationParts[i]!;
        const spec = tickSpecForLength(t);
        const tie =
          n <= 1
            ? ''
            : i === 0
              ? '<tie type="start"/>'
              : i === n - 1
                ? '<tie type="stop"/>'
                : '<tie type="stop"/><tie type="start"/>';
        xml += noteXmlPitchedFragment({
          dynamicsAttr: '',
          chordXml: '',
          pitchXml,
          durationTicks: t,
          tieXml: tie,
          voice,
          typeAndDotsXml: typeAndDotsXml(spec),
          stemXml,
          notationsXml: '',
        });
      }
    } else {
      xml += noteXmlPitchedFragment({
        dynamicsAttr: '',
        chordXml: '<chord/>',
        pitchXml,
        durationTicks: firstTicks,
        tieXml: '',
        voice,
        typeAndDotsXml: typeDots,
        stemXml,
        notationsXml: '',
      });
    }
  }
  return xml;
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
  const byVoice = new Map<number, (NoteEvent | RestEvent | ChordEvent)[]>();
  for (const event of measure.events) {
    if (event.kind === 'chord') {
      const voice = event.voice ?? 1;
      const list = byVoice.get(voice) ?? [];
      list.push(event);
      byVoice.set(voice, list);
      continue;
    }
    if (event.kind !== 'note' && event.kind !== 'rest') continue;
    if (!event.pianoExact) {
      throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} mixes exact and legacy timing`);
    }
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
    const stemXml = voices.length > 1 ? (voice % 2 === 1 ? '<stem>up</stem>' : '<stem>down</stem>') : '';
    const voiceEvents = [...(byVoice.get(voice) ?? [])].sort(
      (a, b) => eventOnsetTicks(a, measure.index) - eventOnsetTicks(b, measure.index),
    );
    let cursor = 0;
    for (const event of voiceEvents) {
      if (event.kind === 'chord') {
        const span = beatSpanToTicks(event.startBeat, event.startBeat + event.duration, measureCapacity);
        const start = span.start;
        const duration = span.end - span.start;
        if (start !== cursor) {
          throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} gap at tick ${cursor}`);
        }
        if (duration < 1) {
          throw new Error(`MusicXML export: part ${part.id} measure ${measure.index} voice ${voice} empty chord span`);
        }
        const parts = decomposeTicksToStandardParts(duration, measureCapacity);
        xml += chordEventPitchStackXml(event, voice, parts, preferFlats, stemXml);
        cursor += duration;
        continue;
      }
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
            stemXml,
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
