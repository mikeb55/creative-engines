/**
 * Big Band Score Skeleton — MusicXML structure builder
 */

import type { StaffDefinition } from './scoreTypes';
import type { ScoreSkeletonData } from './scoreTypes';
import { BIG_BAND_STAFF_LAYOUT } from './scoreLayout';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseChordForHarmony(chord: string): { root: string; alter: number; kind: string; text: string } {
  const c = chord.trim().replace(/\s+/g, '');
  if (!c) return { root: 'C', alter: 0, kind: 'major', text: 'C' };
  const rootMatch = c.match(/^([A-Ga-g])([#b])?/i);
  const rootStep = rootMatch ? rootMatch[1].toUpperCase() : 'C';
  const alter = rootMatch?.[2] === 'b' ? -1 : rootMatch?.[2] === '#' ? 1 : 0;
  const suffix = c.slice(rootMatch ? rootMatch[0].length : 0) || 'maj';
  const kindMap: Record<string, string> = {
    maj: 'major', maj7: 'major-seventh', '7': 'dominant', m: 'minor', m7: 'minor-seventh',
    min: 'minor', min7: 'minor-seventh', dim: 'diminished', dim7: 'diminished-seventh',
    aug: 'augmented', '-': 'minor', '-7': 'minor-seventh',
  };
  const kind = kindMap[suffix] || kindMap[suffix.slice(0, 2)] || kindMap[suffix.slice(0, 3)] || 'major';
  return { root: rootStep, alter, kind, text: escapeXml(c) };
}

export function buildMusicXML(
  skeleton: ScoreSkeletonData,
  staffLayout: StaffDefinition[] = BIG_BAND_STAFF_LAYOUT
): string {
  const { totalBars, timeSignature, keySignature, rehearsalMarks, sectionLabels, cueAnnotations, chordSymbols } = skeleton;
  const num = timeSignature.beats;
  const den = timeSignature.beatType;
  const divisions = 4;

  const rehearsalByBar = new Map<number, string>();
  for (const r of rehearsalMarks) rehearsalByBar.set(r.bar, r.label);
  const sectionByBar = new Map<number, string>();
  for (const s of sectionLabels) sectionByBar.set(s.bar, s.text);
  const cuesByBar = new Map<number, string[]>();
  for (const c of cueAnnotations) {
    const list = cuesByBar.get(c.bar) ?? [];
    list.push(c.text);
    cuesByBar.set(c.bar, list);
  }
  const chordByBar = new Map<number, string>();
  for (const h of chordSymbols) chordByBar.set(h.bar, h.chord);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="3.1">\n';
  xml += '  <work><work-title>Big Band Score Skeleton</work-title></work>\n';
  xml += '  <part-list>\n';

  for (const staff of staffLayout) {
    xml += `    <score-part id="${staff.partId}">\n`;
    xml += `      <part-name>${escapeXml(staff.instrumentName)}</part-name>\n`;
    xml += `      <score-instrument id="${staff.partId}-I">\n`;
    xml += `        <instrument-name>${escapeXml(staff.instrumentName)}</instrument-name>\n`;
    xml += `      </score-instrument>\n`;
    xml += `      <midi-device id="${staff.partId}-D" port="1"></midi-device>\n`;
    xml += `      <midi-instrument id="${staff.partId}-I">\n`;
    xml += `        <midi-channel>1</midi-channel>\n`;
    xml += `      </midi-instrument>\n`;
    xml += `    </score-part>\n`;
  } 
  xml += '  </part-list>\n';

  const firstPartId = staffLayout[0]?.partId ?? 'P1';
  for (const staff of staffLayout) {
    const isFirstPart = staff.partId === firstPartId;
    xml += `  <part id="${staff.partId}">\n`;
    for (let m = 1; m <= totalBars; m++) {
      xml += `    <measure number="${m}">\n`;
      if (m === 1) {
        xml += `      <attributes>\n`;
        xml += `        <divisions>${divisions}</divisions>\n`;
        xml += `        <key><fifths>0</fifths><mode>major</mode></key>\n`;
        xml += `        <time><beats>${num}</beats><beat-type>${den}</beat-type></time>\n`;
        xml += `        <clef><sign>G</sign><line>2</line></clef>\n`;
        if (staff.group === 'rhythm' && staff.instrumentName === 'Bass') {
          xml += `        <clef><sign>F</sign><line>4</line></clef>\n`;
        }
        if (staff.instrumentName === 'Drums') {
          xml += `        <clef><sign>percussion</sign><line>2</line></clef>\n`;
        }
        xml += `      </attributes>\n`;
      }

      const rehearsal = rehearsalByBar.get(m);
      const section = sectionByBar.get(m);
      const cues = cuesByBar.get(m);
      const chord = chordByBar.get(m);

      if (isFirstPart) {
        if (rehearsal) {
          xml += `      <direction placement="above">\n`;
          xml += `        <direction-type><rehearsal>${escapeXml(rehearsal)}</rehearsal></direction-type>\n`;
          xml += `        <sound rehearsal="yes"/>\n`;
          xml += `      </direction>\n`;
        }
        if (section) {
          xml += `      <direction placement="above">\n`;
          xml += `        <direction-type><words>${escapeXml(section)}</words></direction-type>\n`;
          xml += `      </direction>\n`;
        }
        if (cues && cues.length > 0) {
          xml += `      <direction placement="above">\n`;
          xml += `        <direction-type><words>${escapeXml(cues.join(' | '))}</words></direction-type>\n`;
          xml += `      </direction>\n`;
        }
        if (chord) {
          const { root, alter, kind, text } = parseChordForHarmony(chord);
          xml += `      <harmony>\n`;
          xml += `        <root><root-step>${root}</root-step>${alter !== 0 ? `<root-alter>${alter}</root-alter>` : ''}</root>\n`;
          xml += `        <kind text="${text}">${kind}</kind>\n`;
          xml += `      </harmony>\n`;
        }
      }

      xml += `      <note>\n`;
      xml += `        <rest/><duration>${divisions * num}</duration><type>whole</type>\n`;
      xml += `      </note>\n`;
      xml += `    </measure>\n`;
    }
    xml += `  </part>\n`;
  }

  xml += '</score-partwise>\n';
  return xml;
}
