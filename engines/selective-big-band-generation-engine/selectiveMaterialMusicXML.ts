/**
 * Selective Big-Band Generation — MusicXML export for note-level fragments
 */

import type { SelectiveMaterialPlan, NoteEvent } from './selectiveGenerationTypes';

const STAFF_LAYOUT = [
  { partId: 'P1', instrumentName: 'Alto Saxophone 1' },
  { partId: 'P2', instrumentName: 'Alto Saxophone 2' },
  { partId: 'P3', instrumentName: 'Tenor Saxophone 1' },
  { partId: 'P4', instrumentName: 'Tenor Saxophone 2' },
  { partId: 'P5', instrumentName: 'Baritone Saxophone' },
  { partId: 'P6', instrumentName: 'Trumpet 1' },
  { partId: 'P7', instrumentName: 'Trumpet 2' },
  { partId: 'P8', instrumentName: 'Trumpet 3' },
  { partId: 'P9', instrumentName: 'Trumpet 4' },
  { partId: 'P10', instrumentName: 'Trombone 1' },
  { partId: 'P11', instrumentName: 'Trombone 2' },
  { partId: 'P12', instrumentName: 'Trombone 3' },
  { partId: 'P13', instrumentName: 'Bass Trombone' },
  { partId: 'P14', instrumentName: 'Piano' },
  { partId: 'P15', instrumentName: 'Guitar' },
  { partId: 'P16', instrumentName: 'Bass' },
  { partId: 'P17', instrumentName: 'Drums' },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function parsePitch(pitch: string): { step: string; octave: number; alter?: number } {
  const m = pitch.match(/^([A-Ga-g])([#b])?(\d+)$/);
  const step = (m?.[1] ?? 'C').toUpperCase();
  const alter = m?.[2] === 'b' ? -1 : m?.[2] === '#' ? 1 : undefined;
  const octave = parseInt(m?.[3] ?? '4', 10);
  return { step, octave, alter };
}

function durationToType(dur: number): string {
  if (dur >= 16) return 'whole';
  if (dur >= 8) return 'half';
  if (dur >= 4) return 'quarter';
  if (dur >= 2) return 'eighth';
  return '16th';
}

export function buildSelectiveMusicXML(plan: SelectiveMaterialPlan, totalBars: number): string {
  const divisions = 4;
  const eventsByStaffBar = new Map<string, Map<number, NoteEvent[]>>();

  for (const unit of plan.units) {
    for (const ev of unit.noteEvents ?? []) {
      const key = ev.staffId;
      if (!eventsByStaffBar.has(key)) eventsByStaffBar.set(key, new Map());
      const byBar = eventsByStaffBar.get(key)!;
      const list = byBar.get(ev.bar) ?? [];
      list.push(ev);
      byBar.set(ev.bar, list);
    }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="3.1">\n';
  xml += `  <work><work-title>Selective Material: ${escapeXml(plan.targetType)}</work-title></work>\n`;
  xml += '  <part-list>\n';
  for (const s of STAFF_LAYOUT) {
    xml += `    <score-part id="${s.partId}">\n`;
    xml += `      <part-name>${escapeXml(s.instrumentName)}</part-name>\n`;
    xml += `      <score-instrument id="${s.partId}-I"><instrument-name>${escapeXml(s.instrumentName)}</instrument-name></score-instrument>\n`;
    xml += `      <midi-instrument id="${s.partId}-I"><midi-channel>1</midi-channel></midi-instrument>\n`;
    xml += `    </score-part>\n`;
  }
  xml += '  </part-list>\n';

  for (const staff of STAFF_LAYOUT) {
    const pid = staff.partId;
    const byBar = eventsByStaffBar.get(pid) ?? new Map();
    xml += `  <part id="${pid}">\n`;
    for (let m = 1; m <= totalBars; m++) {
      xml += `    <measure number="${m}">\n`;
      if (m === 1) {
        xml += `      <attributes>\n`;
        xml += `        <divisions>${divisions}</divisions>\n`;
        xml += `        <key><fifths>0</fifths><mode>major</mode></key>\n`;
        xml += `        <time><beats>4</beats><beat-type>4</beat-type></time>\n`;
        xml += `        <clef><sign>G</sign><line>2</line></clef>\n`;
        if (pid === 'P16') xml += `        <clef><sign>F</sign><line>4</line></clef>\n`;
        if (pid === 'P17') xml += `        <clef><sign>percussion</sign><line>2</line></clef>\n`;
        xml += `      </attributes>\n`;
      }

      const evs = byBar.get(m) ?? [];
      if (evs.length === 0) {
        xml += `      <note><rest/><duration>${divisions * 4}</duration><type>whole</type></note>\n`;
      } else {
        let offset = 0;
        for (const ev of evs.sort((a: NoteEvent, b: NoteEvent) => a.beat - b.beat)) {
          const restDur = (ev.beat * divisions) - offset;
          if (restDur > 0) {
            xml += `      <note><rest/><duration>${restDur}</duration><type>${durationToType(restDur)}</type></note>\n`;
            offset += restDur;
          }
          const { step, octave, alter } = parsePitch(ev.pitch);
          const durDivs = ev.duration * divisions;
          xml += `      <note>\n`;
          xml += `        <pitch><step>${step}</step>${alter !== undefined ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>\n`;
          xml += `        <duration>${durDivs}</duration><type>${durationToType(durDivs)}</type>\n`;
          xml += `      </note>\n`;
          offset += durDivs;
        }
        const remaining = divisions * 4 - offset;
        if (remaining > 0) {
          xml += `      <note><rest/><duration>${remaining}</duration><type>${durationToType(remaining)}</type></note>\n`;
        }
      }
      xml += `    </measure>\n`;
    }
    xml += `  </part>\n`;
  }
  xml += '</score-partwise>\n';
  return xml;
}
