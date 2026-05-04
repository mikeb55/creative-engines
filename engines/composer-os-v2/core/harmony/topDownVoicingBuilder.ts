import type { TonalityVaultChordRow } from './tonalityVaultDatabase';
import { TONALITY_VAULT_DATABASE } from './tonalityVaultDatabase';
import { selectQuadratonicMelodySpec, vaultDegreeToPitchClass } from './quadratonicMelodySelector';

const ROW_BY_TYPE = new Map<string, TonalityVaultChordRow>(
  TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r])
);

export type TopDownVoicingSpec = {
  chordType: string;
  displayName: string;
  /**
   * Four voices low → high: shell anchor under the melodic triad (register-resolved).
   * Values are semitone offsets from a reference chord root at MIDI 60 (middle C).
   */
  semitoneOffsetsFromRootBottomToTop: [number, number, number, number];
  /** Chord-tone degrees aligned with each voice (low → high). */
  voiceChordDegreesBottomToTop: [number, number, number, number];
};

function pickDefiningShellDegree(row: TonalityVaultChordRow, triadPitchClasses: ReadonlySet<number>): number | undefined {
  const shell = row.leftHandShell;
  const seen = new Set<number>();
  for (const deg of row.tensionHierarchy) {
    if (!shell.includes(deg) || seen.has(deg)) continue;
    seen.add(deg);
    const pc = vaultDegreeToPitchClass(row, deg);
    if (pc === undefined) continue;
    if (triadPitchClasses.has(pc)) continue;
    return deg;
  }
  for (const deg of shell) {
    const pc = vaultDegreeToPitchClass(row, deg);
    if (pc === undefined) continue;
    if (triadPitchClasses.has(pc)) continue;
    return deg;
  }
  return undefined;
}

type VoicedNote = { midi: number; degree: number };

function voicingNotesClosedShellBass(
  shellPc: number,
  shellDeg: number,
  triad: ReadonlyArray<{ pitchClassFromRoot: number; degree: number }>
): VoicedNote[] {
  const bassAnchor = 48;
  const upperAnchor = 60;
  const shellMidi = bassAnchor + shellPc;
  const triadMidis: VoicedNote[] = triad.map((t) => {
    const pc = ((t.pitchClassFromRoot % 12) + 12) % 12;
    let m = upperAnchor + pc;
    while (m <= shellMidi) m += 12;
    return { midi: m, degree: t.degree };
  });
  return [{ midi: shellMidi, degree: shellDeg }, ...triadMidis].sort((a, b) => a.midi - b.midi);
}

/**
 * Four-note voicing: melodic triad in upper structure, single left-hand shell tone beneath without
 * doubling triad pitch classes.
 */
export function buildTopDownVoicing(chordTypeId: string): TopDownVoicingSpec | null {
  const row = ROW_BY_TYPE.get(chordTypeId);
  if (!row) return null;

  const quad = selectQuadratonicMelodySpec(chordTypeId);
  if (!quad) return null;

  const triadPcs = new Set<number>(
    quad.melodicTriad.map((t) => ((t.pitchClassFromRoot % 12) + 12) % 12)
  );

  let shellDeg = pickDefiningShellDegree(row, triadPcs);
  if (shellDeg === undefined) {
    const fallback = row.leftHandShell.find((d) => {
      const pc = vaultDegreeToPitchClass(row, d);
      return pc !== undefined && !triadPcs.has(pc);
    });
    shellDeg = fallback ?? row.leftHandShell[0];
  }
  if (shellDeg === undefined) return null;

  const shellPc = vaultDegreeToPitchClass(row, shellDeg);
  if (shellPc === undefined) return null;

  const voiced = voicingNotesClosedShellBass(shellPc, shellDeg, quad.melodicTriad);
  const rootRef = 60;

  const semitoneOffsetsFromRootBottomToTop = voiced.map(
    (v) => v.midi - rootRef
  ) as [number, number, number, number];

  const voiceChordDegreesBottomToTop = voiced.map((v) => v.degree) as [
    number,
    number,
    number,
    number,
  ];

  return {
    chordType: row.chordType,
    displayName: row.displayName,
    semitoneOffsetsFromRootBottomToTop,
    voiceChordDegreesBottomToTop,
  };
}
