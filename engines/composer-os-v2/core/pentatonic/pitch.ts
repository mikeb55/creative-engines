/**
 * Pentatonic pitch-class helpers.
 * Spelling is a deterministic letter-step fallback. It is not contextual enharmonic analysis.
 * Canonical identity is the sorted pitch-class list and does not depend on spelling.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const PENTATONIC_NOTE_CHOICES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export interface ParsedNote {
  pc: number;
  spelling: string;
  letter: string;
}

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function canonicalPitchSet(pcs: readonly number[]): number[] {
  return [...new Set(pcs.map((pc) => mod12(pc)))].sort((a, b) => a - b);
}

export function canonicalPitchSetId(pcs: readonly number[]): string {
  return canonicalPitchSet(pcs).join(',');
}

export function parseNoteToken(raw: string): ParsedNote | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([A-Ga-g])(bb|##|b|#|x)?$/);
  if (!match) return null;
  const letter = match[1]!.toUpperCase();
  const accidental = match[2] ?? '';
  let delta = 0;
  if (accidental === '#') delta = 1;
  else if (accidental === '##' || accidental === 'x') delta = 2;
  else if (accidental === 'b') delta = -1;
  else if (accidental === 'bb') delta = -2;
  const pc = mod12((NATURAL_PC[letter] ?? 0) + delta);
  const spelling = letter + accidental.replace('x', '##');
  return { pc, spelling, letter };
}

export function parseNoteList(raw: readonly string[]): { ok: true; notes: ParsedNote[] } | { ok: false; error: string } {
  const notes: ParsedNote[] = [];
  for (const token of raw) {
    const parsed = parseNoteToken(token);
    if (!parsed) return { ok: false, error: `Malformed note "${token}".` };
    notes.push(parsed);
  }
  return { ok: true, notes };
}

export function uniquePitchClasses(notes: readonly ParsedNote[]): number[] {
  return canonicalPitchSet(notes.map((note) => note.pc));
}

function accidentalSuffix(delta: number): string {
  if (delta === 0) return '';
  if (delta === 1) return '#';
  if (delta === 2) return '##';
  if (delta === -1) return 'b';
  if (delta === -2) return 'bb';
  if (delta > 0) return '#'.repeat(delta);
  return 'b'.repeat(-delta);
}

/**
 * Spell a transposed archetype from its reference note using fixed scale-degree letters.
 * Limitation: this follows the archetype's letter steps from the reference spelling.
 * It does not choose enharmonics from a key signature or from surrounding chords.
 */
export function spellFromReference(
  referenceSpelling: string,
  intervals: readonly number[],
  letterSteps: readonly number[]
): string[] {
  const reference = parseNoteToken(referenceSpelling);
  if (!reference || intervals.length !== letterSteps.length) {
    return intervals.map((interval) => sharpName(mod12((reference?.pc ?? 0) + interval)));
  }
  const letterIndex = LETTERS.indexOf(reference.letter as (typeof LETTERS)[number]);
  return intervals.map((interval, index) => {
    const letter = LETTERS[(letterIndex + letterSteps[index]!) % 7]!;
    const target = mod12(reference.pc + interval);
    let delta = target - NATURAL_PC[letter]!;
    delta = ((delta + 6) % 12) - 6;
    return `${letter}${accidentalSuffix(delta)}`;
  });
}

export function sharpName(pc: number): string {
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][mod12(pc)]!;
}

export function spellingForPc(pc: number, preferred: readonly ParsedNote[]): string {
  const found = preferred.find((note) => note.pc === mod12(pc));
  return found ? found.spelling : sharpName(pc);
}
