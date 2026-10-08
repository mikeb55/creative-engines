import { recommendPentatonicsFromRegion } from '@composer-os/core/pentatonic';
import { validateMusicXmlSchema } from '@composer-os/core/export/musicxmlValidation';
import { describe, expect, it } from 'vitest';
import { generateMusicFromPentatonicSelection } from '../src/pentatonic/generatePentatonicMusic';

const region = {
  tonalCentre: { root: 'A', mode: 'minor' as const },
  harmonyBars: ['Am(add9)'],
  melodyNotes: ['C', 'E', 'G', 'B'],
  bassNotes: ['A'],
  heldNotes: ['E'],
  purpose: 'continuity' as const,
};

describe('pentatonic generate music', () => {
  it('uses the selected recommendation and writes pitched MusicXML', () => {
    const result = recommendPentatonicsFromRegion(region);
    expect(result.kind).toBe('analysis');
    if (result.kind !== 'analysis') return;
    const pool = [...result.recommendations, ...result.alternatives];
    expect(pool.length).toBeGreaterThan(1);
    const first = generateMusicFromPentatonicSelection({
      collection: pool[0]!,
      harmonyBars: region.harmonyBars,
      melodyNotes: region.melodyNotes,
      bassNotes: region.bassNotes,
      heldNotes: region.heldNotes,
      purpose: region.purpose,
    });
    const second = generateMusicFromPentatonicSelection({
      collection: pool[1]!,
      harmonyBars: region.harmonyBars,
      melodyNotes: region.melodyNotes,
      bassNotes: region.bassNotes,
      heldNotes: region.heldNotes,
      purpose: region.purpose,
    });
    expect(first.collectionName).toBe(pool[0]!.transposedName);
    expect(second.collectionName).toBe(pool[1]!.transposedName);
    expect(first.notes).not.toBe(second.notes);
    expect(first.pitches.length).toBeGreaterThan(0);
    expect(first.musicXml).toContain('<pitch>');
    expect(first.musicXml).not.toContain('staff-tuning');
    expect(first.musicXml).toContain('<root-step>A</root-step>');
    expect(first.musicXml).toContain('text="m(add9)"');
    const schema = validateMusicXmlSchema(first.musicXml);
    expect(schema.errors).toEqual([]);
    expect(schema.valid).toBe(true);
  });
});
