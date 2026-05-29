import {
  irealChordToMartino,
  irealChordSymbolToMartino,
  mapIrealQualityToMartino,
} from '../irealToMartino.js';
import { parseMartinoChords } from '../martinoGeneratePipeline.js';

describe('irealToMartino', () => {
  test('maps ^ to maj7', () => {
    expect(mapIrealQualityToMartino('^7')).toBe('maj7');
    expect(irealChordSymbolToMartino('C', '^7')).toBe('Cmaj7');
  });

  test('maps - to m', () => {
    expect(mapIrealQualityToMartino('-')).toBe('m');
    expect(irealChordSymbolToMartino('D', '-')).toBe('Dm');
    expect(irealChordSymbolToMartino('D', '-7')).toBe('Dm7');
  });

  test('maps h to m7b5', () => {
    expect(mapIrealQualityToMartino('h7')).toBe('m7b5');
    expect(irealChordSymbolToMartino('A', 'h7')).toBe('Am7b5');
  });

  test('maps o to dim7', () => {
    expect(mapIrealQualityToMartino('o7')).toBe('dim7');
    expect(irealChordSymbolToMartino('B', 'o')).toBe('Bdim7');
  });

  test('returns valid parseMartinoChords-compatible string', () => {
    const parsedChart = {
      measures: [
        [{ symbol: 'Cm7', rootNote: 'C', chordQuality: '-7' }],
        [{ symbol: 'F7', rootNote: 'F', chordQuality: '7' }],
        [{ symbol: 'Bb^7', rootNote: 'Bb', chordQuality: '^7' }],
        [{ symbol: 'Eb^7', rootNote: 'Eb', chordQuality: '^7' }],
      ],
    };
    const result = irealChordToMartino(parsedChart);
    expect(result).toBe('Cm7 | F7 | Bbmaj7 | Ebmaj7');
    const parsed = parseMartinoChords(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.chords).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7']);
  });

  test('handles empty measures gracefully', () => {
    expect(irealChordToMartino({ measures: [] })).toBe('');
    expect(irealChordToMartino({ measures: [[{ symbol: 'N.C.', rootNote: '', chordQuality: '' }]] })).toBe('');
  });

  test('handles null parsedChart gracefully', () => {
    expect(irealChordToMartino(null)).toBe('');
    expect(irealChordToMartino(undefined)).toBe('');
  });
});
