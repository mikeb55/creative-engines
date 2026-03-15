/**
 * MusicXML Import — Parse to progression (V1)
 * Extracts chord symbols and bar counts into internal format.
 */

import type { ChordProgressionSegment, MusicXMLParseOutput } from './musicxmlTypes';
import { validateMusicXMLContent } from './musicxmlValidation';

function parseChordFromHarmony(rootStep: string, rootAlter: number, kind: string): string {
  const alterStr = rootAlter === 1 ? '#' : rootAlter === -1 ? 'b' : '';
  const root = rootStep + alterStr;
  const k = (kind || '').toLowerCase();
  if (k.includes('major') || k.includes('maj') || k === '') return root + 'maj7';
  if ((k.includes('dominant') || k === '7') && !k.includes('minor')) return root + '7';
  if (k.includes('minor') || k.includes('min')) return root + 'm7';
  if (k.includes('dim')) return root + 'dim';
  if (k.includes('halfdim') || k.includes('m7b5')) return root + 'm7b5';
  if (k.includes('aug')) return root + 'aug';
  return root + '7';
}

function extractHarmoniesFromMeasure(measureXml: string): string[] {
  const chords: string[] = [];
  const harmonyRegex = /<harmony[^>]*>([\s\S]*?)<\/harmony>/gi;
  let m;
  while ((m = harmonyRegex.exec(measureXml)) !== null) {
    const inner = m[1];
    const rootStepMatch = inner.match(/<root-step>([A-G])<\/root-step>/i);
    const rootAlterMatch = inner.match(/<root-alter>(-?\d+)<\/root-alter>/);
    const kindMatch = inner.match(/<kind[^>]*>([^<]+)<\/kind>/i) || inner.match(/<kind[^>]*\/>/);
    const rootStep = rootStepMatch ? rootStepMatch[1].toUpperCase() : 'C';
    const rootAlter = rootAlterMatch ? parseInt(rootAlterMatch[1], 10) : 0;
    const kind = kindMatch && kindMatch[1] ? kindMatch[1] : 'major';
    const chord = parseChordFromHarmony(rootStep, rootAlter, kind);
    chords.push(chord);
  }
  const frameNoteRegex = /<frame[\s\S]*?<frame-note[\s\S]*?<root-step>([A-G])<\/root-step>[\s\S]*?<root-alter>(-?\d+)<\/root-alter>/gi;
  while ((m = frameNoteRegex.exec(measureXml)) !== null) {
    const rootStep = m[1].toUpperCase();
    const rootAlter = parseInt(m[2], 10) || 0;
    chords.push(parseChordFromHarmony(rootStep, rootAlter, 'major'));
  }
  return chords;
}

function coalesceProgression(measureChords: string[][]): ChordProgressionSegment[] {
  const result: ChordProgressionSegment[] = [];
  for (const chords of measureChords) {
    const chord = chords.length > 0 ? chords[0] : 'Cmaj7';
    if (result.length > 0 && result[result.length - 1].chord === chord) {
      result[result.length - 1].bars += 1;
    } else {
      result.push({ chord, bars: 1 });
    }
  }
  return result;
}

export function parseMusicXMLToProgression(xml: string): MusicXMLParseOutput {
  const validationError = validateMusicXMLContent(xml);
  if (validationError) return validationError;

  const measureRegex = /<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/gi;
  const measures: { num: number; xml: string }[] = [];
  let m;
  while ((m = measureRegex.exec(xml)) !== null) {
    measures.push({ num: parseInt(m[1], 10), xml: m[2] });
  }

  if (measures.length === 0) {
    return { success: false, error: 'No measures found in MusicXML', code: 'INVALID_XML' };
  }

  measures.sort((a, b) => a.num - b.num);
  const measureChords = measures.map(meas => extractHarmoniesFromMeasure(meas.xml));

  const hasAnyChords = measureChords.some(c => c.length > 0);
  if (!hasAnyChords) {
    return { success: false, error: 'No chord symbols found in any measure. V1 requires explicit harmony tags.', code: 'NO_CHORD_SYMBOLS' };
  }

  const progression = coalesceProgression(measureChords);
  const totalBars = measures.length;

  return {
    success: true,
    progression,
    totalBars,
    timeSignature: { beats: 4, beatType: 4 },
  };
}
