/**
 * MusicXML measure packer — converts TimedNoteEvents to MusicXML measure content.
 * Uses shared timing constants and produces valid 4/4 measure output.
 */

import { DIVISIONS, divisionsToType, MEASURE_DURATION } from './notationTimingConstants';
import type { TimedNoteEvent } from './notationTimingEngine';

function midiToPitch(midi: number): { step: string; alter: number; octave: number } {
  const semitones = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const stepMap: Record<number, { step: string; alter: number }> = {
    0: { step: 'C', alter: 0 }, 1: { step: 'C', alter: 1 }, 2: { step: 'D', alter: 0 },
    3: { step: 'D', alter: 1 }, 4: { step: 'E', alter: 0 }, 5: { step: 'F', alter: 0 },
    6: { step: 'F', alter: 1 }, 7: { step: 'G', alter: 0 }, 8: { step: 'G', alter: 1 },
    9: { step: 'A', alter: 0 }, 10: { step: 'A', alter: 1 }, 11: { step: 'B', alter: 0 },
  };
  const { step, alter } = stepMap[semitones];
  return { step, alter, octave };
}

export function eventsToMeasureXml(
  events: TimedNoteEvent[],
  measureIndex: number,
  measureStart: number
): string {
  const sorted = [...events].sort((a, b) => {
    if (a.startDivision !== b.startDivision) return a.startDivision - b.startDivision;
    return a.voice - b.voice;
  });

  let xml = '';
  const voices = [...new Set(sorted.map((e) => e.voice))].sort((a, b) => a - b);

  for (const voice of voices) {
    const voiceEvents = sorted.filter((e) => e.voice === voice);
    let cursor = measureStart;

    for (const e of voiceEvents) {
      if (e.startDivision > cursor) {
        const restDiv = e.startDivision - cursor;
        xml += `        <note><rest/><duration>${restDiv}</duration><type>${divisionsToType(restDiv)}</type><voice>${voice}</voice></note>\n`;
        cursor = e.startDivision;
      }
      if (e.rest) {
        xml += `        <note><rest/><duration>${e.durationDivisions}</duration><type>${divisionsToType(e.durationDivisions)}</type><voice>${voice}</voice></note>\n`;
      } else {
        const { step, alter, octave } = midiToPitch(e.pitch);
        const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
        const notations: string[] = [];
        if (e.tieStart) notations.push('<tie type="start"/>');
        if (e.tieStop) notations.push('<tie type="stop"/>');
        const notationsEl = notations.length ? `<notations>${notations.join('')}</notations>` : '';
        const staffEl = e.staff ? `<staff>${e.staff}</staff>` : '';
        xml += `        <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${e.durationDivisions}</duration><type>${divisionsToType(e.durationDivisions)}</type><voice>${voice}</voice>${staffEl}${notationsEl}</note>\n`;
      }
      cursor += e.durationDivisions;
    }

    if (cursor < measureStart + MEASURE_DURATION) {
      const restDiv = measureStart + MEASURE_DURATION - cursor;
      xml += `        <note><rest/><duration>${restDiv}</duration><type>${divisionsToType(restDiv)}</type><voice>${voice}</voice></note>\n`;
    }
  }

  return xml;
}

/** Pack events for multi-voice (backup/forward) layout. Voice 1 first, then backup, then voice 2. */
export function eventsToMeasureXmlWithBackup(
  events: TimedNoteEvent[],
  measureIndex: number,
  measureStart: number
): string {
  const sorted = [...events].sort((a, b) => a.startDivision - b.startDivision);
  const voices = [...new Set(sorted.map((e) => e.voice))].sort((a, b) => a - b);

  if (voices.length <= 1) {
    return eventsToMeasureXml(events, measureIndex, measureStart);
  }

  let xml = '';
  const slotDuration = MEASURE_DURATION / 4; // 4 beats per measure

  for (let slot = 0; slot < 4; slot++) {
    const slotStart = measureStart + slot * slotDuration;
    const slotEnd = slotStart + slotDuration;

    const slotEvents = sorted.filter(
      (e) => e.startDivision >= slotStart && e.startDivision < slotEnd && !e.rest
    );
    const v1 = slotEvents.find((e) => e.voice === 1);
    const v2 = slotEvents.find((e) => e.voice === 2);

    if (v1) {
      const { step, alter, octave } = midiToPitch(v1.pitch);
      const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
      const staffEl = v1.staff ? `<staff>${v1.staff}</staff>` : '';
      xml += `    <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${slotDuration}</duration><type>quarter</type><voice>1</voice>${staffEl}</note>\n`;
    }
    if (v2) {
      if (v1) xml += `    <backup><duration>${slotDuration}</duration></backup>\n`;
      const { step, alter, octave } = midiToPitch(v2.pitch);
      const alterEl = alter !== 0 ? `<alter>${alter}</alter>` : '';
      const staffEl = v2.staff ? `<staff>${v2.staff}</staff>` : '';
      xml += `    <note><pitch><step>${step}</step>${alterEl}<octave>${octave}</octave></pitch><duration>${slotDuration}</duration><type>quarter</type><voice>2</voice>${staffEl}</note>\n`;
    }
    if (!v1 && !v2) {
      xml += `    <note><rest/><duration>${slotDuration}</duration><type>quarter</type><voice>1</voice></note>\n`;
    }
  }

  return xml;
}
