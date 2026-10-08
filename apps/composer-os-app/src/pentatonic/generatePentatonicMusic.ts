import {
  generatePracticeExample,
  type PentatonicPurpose,
  type PentatonicRecommendation,
} from '@composer-os/core/pentatonic';

export interface PentatonicGeneratedMusic {
  musicXml: string;
  notes: string;
  pitches: readonly number[];
  collectionName: string;
  limitations: readonly string[];
}

/**
 * Realises pitched notes from the collection the user selected.
 * Calls generatePracticeExample. Does not add a phrase algorithm.
 */
export function generateMusicFromPentatonicSelection(args: {
  collection: PentatonicRecommendation;
  harmonyBars: readonly string[];
  melodyNotes: readonly string[];
  bassNotes: readonly string[];
  heldNotes: readonly string[];
  purpose?: PentatonicPurpose | '';
}): PentatonicGeneratedMusic {
  const archetype = args.collection.archetypeId;
  if (archetype !== 'major_pentatonic' && archetype !== 'minor_pentatonic') {
    throw new Error('The phrase engine only realises major and minor pentatonic collections.');
  }
  const reference = args.collection.displaySpelling[0];
  if (!reference) throw new Error('Selected collection has no spelling.');
  if (args.melodyNotes.length < 3) {
    throw new Error('The phrase engine needs at least three melody notes. It will not invent a melody.');
  }
  const chord = args.harmonyBars[0]?.trim() ?? '';
  if (!chord) throw new Error('Enter a harmony symbol before generating music.');
  const lyrical = args.purpose === 'lyrical_answer' && args.bassNotes.length > 0;
  const example = generatePracticeExample({
    category: lyrical ? 'ANSWER_BASS' : 'HOME_CONTINUITY',
    difficulty: 'SPARSE',
    centre: reference,
    fieldId: archetype,
    chord,
    motif: args.melodyNotes.join(' '),
    bassNotes: args.bassNotes.join(' '),
    heldNotes: args.heldNotes.join(' '),
    variation: 0,
  });
  if (example.pitches.length === 0 || !example.musicXml.includes('<pitch>')) {
    throw new Error('The phrase engine returned no pitched notes for this cell.');
  }
  const limitations = [
    'Melody is the cell. M-DEG maps it onto the selected collection. Pitches already in that collection stay on their degree.',
    'Bass and held notes are grounding inputs. They are not written as a bass staff.',
    lyrical
      ? 'Lyrical answer uses the bass note as a landing.'
      : 'Purpose, colour preference, HOME, and the current collection stay on the recommendation. The phrase engine reads the selected collection.',
    args.harmonyBars.length > 1 ? 'The phrase engine uses the first harmony symbol.' : '',
  ].filter((line) => line.length > 0);
  return {
    musicXml: example.musicXml,
    notes: example.notes,
    pitches: example.pitches,
    collectionName: args.collection.transposedName,
    limitations,
  };
}
