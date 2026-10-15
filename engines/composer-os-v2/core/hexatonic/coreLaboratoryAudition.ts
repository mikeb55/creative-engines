/**
 * Short notation-only audition scores for the provisional Core pairs.
 * A render is not musical acceptance.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { parseSpelledPitch } from '../wwh/wwhTriadPair';
import { createNote, createPart, createScore } from '../score-model/scoreEventBuilder';
import { analyzeCoreCandidate, getCoreCandidate } from './coreLaboratory';
import { getHexatonicScalar } from './collections';
import { getHexatonicWpsPair } from './triadPairs';

function midiOf(token: string, octave: number): number {
  return (octave + 1) * 12 + parseSpelledPitch(token).pc;
}

function stack(tokens: readonly string[], octave: number) {
  const notes: { midi: number; step: string; alter: number }[] = [];
  for (const token of tokens) {
    const parsed = parseSpelledPitch(token);
    let midi = midiOf(token, octave);
    const previous = notes[notes.length - 1]?.midi ?? 0;
    while (midi <= previous) midi += 12;
    notes.push({ midi, step: parsed.step, alter: parsed.alter });
  }
  return notes;
}

function putChord(
  partEvents: { pitch: number; startBeat: number; duration: number; spelling: { step: string; alter: number } }[],
  tokens: readonly string[],
  startBeat: number,
  duration: number,
  octave: number,
) {
  for (const note of stack(tokens, octave)) {
    partEvents.push({ pitch: note.midi, startBeat, duration, spelling: { step: note.step, alter: note.alter } });
  }
}

function contrastTokens(nearestId: string): { tokens: string[]; label: string } {
  const pair = getHexatonicWpsPair(nearestId);
  if (pair) return { tokens: [...pair.resolution.spelling], label: 'CONTRAST' };
  const scalar = getHexatonicScalar(nearestId);
  const reading = scalar?.triadReading?.[0];
  if (reading) return { tokens: [...reading.spelling], label: 'CONTRAST' };
  const spelling = scalar?.referenceSpelling.slice(0, 3) ?? ['C', 'D', 'E'];
  return { tokens: [...spelling], label: 'CONTRAST' };
}

/** Keep the status in the title. A staff direction collided with the tempo, and a long contrast id clipped the margin. */
export function placeAuditionEngraving(xml: string): string {
  const withoutDirection = xml.replace(
    /\s*<direction placement="above"><direction-type><words font-style="italic">PROVISIONAL — NOT MUSICALLY APPROVED<\/words><\/direction-type><\/direction>/,
    '',
  );
  if (withoutDirection === xml) throw new Error('provisional direction was not in the audition score');
  return withoutDirection.replace(
    /<words font-style="italic">/g,
    '<words default-y="48" font-style="italic">',
  );
}

export function coreCandidateAuditionMusicXml(id: string): string {
  const candidate = getCoreCandidate(id);
  if (!candidate) throw new Error(`unknown core candidate ${id}`);
  const analysis = analyzeCoreCandidate(id);
  const nearest = analysis.nearestCatalogueIds[0] ?? 'hex_major_omit_seventh';
  const contrast = contrastTokens(nearest);
  const noChord = () => undefined;
  const guitar = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', 4, noChord, noChord);
  const bass = createPart('bass', 'Upright Bass', ACOUSTIC_UPRIGHT_BASS.instrumentIdentity, ACOUSTIC_UPRIGHT_BASS.midiProgram, 'bass', 4, noChord, noChord);
  const guitarEvents: { pitch: number; startBeat: number; duration: number; spelling: { step: string; alter: number } }[] = [];
  putChord(guitarEvents, candidate.leftSpelling, 0, 4, 4);
  putChord(guitarEvents, candidate.rightSpelling, 0, 4, 4);
  putChord(guitarEvents, candidate.leftSpelling, 0, 2, 4);
  putChord(guitarEvents, candidate.rightSpelling, 2, 2, 4);
  putChord(guitarEvents, contrast.tokens, 0, 4, 4);
  const bassToken = candidate.leftSpelling[0]!;
  const bassMidi = midiOf(bassToken, 2);
  const bassSpelling = parseSpelledPitch(bassToken);
  for (let bar = 0; bar < 4; bar += 1) {
    const guitarBar = guitarEvents.filter((_, index) => {
      if (bar === 0) return index < candidate.leftSpelling.length;
      if (bar === 1) return index >= candidate.leftSpelling.length && index < candidate.leftSpelling.length + candidate.rightSpelling.length;
      if (bar === 2) return index >= 6 && index < 6 + candidate.leftSpelling.length + candidate.rightSpelling.length;
      return index >= 6 + candidate.leftSpelling.length + candidate.rightSpelling.length;
    });
    guitar.measures[bar]!.measureBeatSpanQuarters = 4;
    guitar.measures[bar]!.events = guitarBar.map((note) => {
      const event = createNote(note.pitch, note.startBeat, note.duration, 1);
      event.spelling = note.spelling;
      return event;
    });
    bass.measures[bar]!.measureBeatSpanQuarters = 4;
    const bassEvent = createNote(bassMidi, 0, 4, 1);
    bassEvent.spelling = { step: bassSpelling.step, alter: bassSpelling.alter };
    bass.measures[bar]!.events = [bassEvent];
  }
  const score = createScore(`${candidate.label} provisional`, [guitar, bass], { tempo: 72 });
  score.timeSignature = { beats: 4, beatType: 4 };
  score.barMeterMap = { 1: { numerator: 4, denominator: 4 }, 2: { numerator: 4, denominator: 4 }, 3: { numerator: 4, denominator: 4 }, 4: { numerator: 4, denominator: 4 } };
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  score.measureWordsMarkings = {
    1: 'PROVISIONAL — NOT MUSICALLY APPROVED',
    4: contrast.label,
  };
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join(' ') || 'audition export failed');
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(exported.xml)) throw new Error('audition wrote TAB');
  return placeAuditionEngraving(exported.xml);
}
