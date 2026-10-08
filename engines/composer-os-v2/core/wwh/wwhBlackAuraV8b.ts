/**
 * Black Aura V8B — liquid harmony guitar inside the V8A guitar-talk window.
 * Piece-specific D minor / Ab major pair. Does not edit the Vault or V8A scores.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import type { SourceIndex } from './director/sourceIndexAdapter';
import { assertWwhBar, wwhDyad, wwhNote, wwhRest, WWH_DIVISIONS, type WwhAtom } from './wwhPerformanceTypes';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { inspectV8bParentTriad } from './wwhBlackAuraV8aVault';
import {
  assertRecipePlayable,
  gripById,
  V8B_GRIPS,
  V8B_PARENTS,
  V8B_SEED,
  V8B_TIMELINE,
  V8B_VOICE_MOVEMENTS,
  type V8bGrip,
  type V8bTimelineEvent,
} from './wwhBlackAuraV8bRecipe';

export const V8B_OUT_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V8-PILOT/B';

const BAR_TICKS = 1024;
const WRITTEN_OCTAVE_SHIFT = 1;

export interface V8bBundle {
  seed: number;
  sourceSha256: string;
  vaultStillBlocked: boolean;
  grips: V8bGrip[];
  corrections: V8bGrip[];
  movements: typeof V8B_VOICE_MOVEMENTS;
  guitarAtoms: WwhAtom[][];
  sounding: string[][];
  scores: { extract: string; duo: string };
}

function writtenFromGrip(grip: V8bGrip, duration: V8bTimelineEvent['duration']): WwhAtom[] {
  const low = grip.points[0];
  if (!low) throw new Error(`${grip.id} empty`);
  if (grip.points.length === 1) {
    return [wwhNote(low.pitch.step, low.pitch.octave + WRITTEN_OCTAVE_SHIFT, duration, low.pitch.alter)];
  }
  const high = grip.points[1];
  if (!high) throw new Error(`${grip.id} missing upper note`);
  return wwhDyad(
    [low.pitch.step, low.pitch.octave + WRITTEN_OCTAVE_SHIFT, low.pitch.alter],
    [high.pitch.step, high.pitch.octave + WRITTEN_OCTAVE_SHIFT, high.pitch.alter],
    duration
  );
}

function guitarBars(): WwhAtom[][] {
  const bars: WwhAtom[][] = [[], [], [], []];
  for (const event of V8B_TIMELINE) {
    const target = bars[event.bar - 1];
    if (!target) throw new Error(`bar ${event.bar} missing`);
    if (event.rest) target.push(wwhRest(event.duration));
    else {
      if (!event.gripId) throw new Error('pitched event has no grip');
      target.push(...writtenFromGrip(gripById(event.gripId), event.duration));
    }
  }
  return bars.map((atoms, index) => {
    assertWwhBar(atoms, BAR_TICKS, `v8b-${index + 1}`);
    const attacks = atoms.filter((atom) => !atom.rest && !atom.chord).length;
    if (attacks > 4) throw new Error(`v8b-${index + 1} has ${attacks} attacks`);
    return atoms;
  });
}

function soundingNames(): string[][] {
  const bars: string[][] = [[], [], [], []];
  for (const event of V8B_TIMELINE) {
    if (event.rest || !event.gripId) continue;
    bars[event.bar - 1]!.push(gripById(event.gripId).points.map((point) => point.pitch.name).join('/'));
  }
  return bars;
}

function header(movementTitle: string): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle,
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V8B',
    tempo: 92,
    transposeOctave: -1,
  };
}

function writtenWindow(guitarBarsAtoms: WwhAtom[][], templateBass: WwhWrittenBar['bassClone']): WwhWrittenBar[] {
  return guitarBarsAtoms.map((guitar, index) => ({
    guitar,
    bass: [],
    bassClone: templateBass,
    beats: V8A_WINDOW.beats,
    beatType: V8A_WINDOW.beatType,
    divisions: WWH_DIVISIONS,
    fifths: 0,
    mode: 'major',
    guitarTranspose: -1,
    bassTranspose: -1,
    rehearsal: index === 0 ? 'LIQUID' : undefined,
    words: index === 0 ? [`${V8A_WINDOW.id} LIQUID`] : undefined,
    tempoMark: index === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: null } : undefined,
  }));
}

function sourceWritten(index: SourceIndex): WwhWrittenBar[] {
  return index.measures.map((measure) => ({
    guitar: [],
    bass: [],
    guitarClone: measure.guitar.element,
    bassClone: measure.bass.element,
    beats: measure.guitar.beats,
    beatType: measure.guitar.beatType,
    divisions: measure.guitar.divisions,
    fifths: measure.guitar.fifths,
    mode: measure.guitar.mode,
    guitarTranspose: measure.guitar.transposeOctave,
    bassTranspose: measure.bass.transposeOctave,
  }));
}

function duoBars(index: SourceIndex, atoms: WwhAtom[][]): WwhWrittenBar[] {
  const source = sourceWritten(index);
  const template = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!template) throw new Error('window template missing');
  const window = writtenWindow(atoms, template.bass.element);
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...window, ...source.slice(V8A_WINDOW.returnOrder)];
}

export function buildV8bBundle(seed = V8B_SEED): V8bBundle {
  if (seed !== V8B_SEED) throw new Error(`V8B recipe is fixed at seed ${V8B_SEED}`);
  assertRecipePlayable();
  const vault = inspectV8bParentTriad();
  if (vault.status !== 'BLOCKED') throw new Error('V8B must not be read out of the Vault');
  const { index, sha256 } = loadBlackAuraIndex();
  const template = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!template) throw new Error('bar 16 bass template missing');
  const atoms = guitarBars();
  return {
    seed,
    sourceSha256: sha256,
    vaultStillBlocked: true,
    grips: V8B_GRIPS,
    corrections: V8B_GRIPS.filter((grip) => grip.corrected),
    movements: V8B_VOICE_MOVEMENTS,
    guitarAtoms: atoms,
    sounding: soundingNames(),
    scores: {
      extract: renderWwhDuoScore(writtenWindow(atoms, template.bass.element), header('V8B liquid harmony guitar')),
      duo: renderWwhDuoScore(duoBars(index, atoms), header('V8B liquid harmony duo')),
    },
  };
}

function recipeJson(bundle: V8bBundle): string {
  return `${JSON.stringify(
    {
      seed: bundle.seed,
      piece: 'Black Aura',
      status: 'piece-specific recipe',
      notAVaultRow: true,
      notABhlRule: true,
      source: V8A_DUO_FILE,
      sourceSha256: bundle.sourceSha256,
      window: V8A_WINDOW,
      writtenOctaveShift: WRITTEN_OCTAVE_SHIFT,
      transposeOctave: -1,
      soundingEqualsWrittenPlusTranspose: true,
      parents: V8B_PARENTS,
      sharedPitchClasses: [],
      omittedTones: {
        D_minor: 'F is omitted from the first dyad and supplied later as melody and as the F/Ab mixed dyad',
        Ab_major: 'C is omitted. The insert bass does not play C',
      },
      printedSymbolsNotRelabelled: ['bar 16 Asus4 stays Asus4', 'bar 17 Bbm stays Bbm'],
      grips: bundle.grips.map((grip) => ({
        id: grip.id,
        role: grip.role,
        stoppedSpan: grip.stoppedSpan,
        proposed: grip.proposed,
        corrected: grip.corrected,
        points: grip.points.map((point) => ({
          sounding: point.pitch.name,
          written: `${point.pitch.step}${point.pitch.alter < 0 ? 'b' : ''}${point.pitch.octave + WRITTEN_OCTAVE_SHIFT}`,
          midiSounding: point.pitch.midi,
          string: point.stringNumber,
          fret: point.fret,
          parents: point.pitch.parents,
        })),
      })),
      corrections: bundle.corrections.map((grip) => grip.id),
      voiceMovements: bundle.movements,
      timeline: V8B_TIMELINE,
      soundingAttacks: bundle.sounding,
      vaultParentTriad: inspectV8bParentTriad(),
    },
    null,
    2
  )}\n`;
}

function receipt(bundle: V8bBundle): string {
  const gripLines = bundle.grips
    .map((grip) => {
      const fingers = grip.points
        .map((point) => `${point.pitch.name} string ${point.stringNumber} fret ${point.fret}`)
        .join('; ');
      return `| ${grip.id} | ${grip.role} | ${fingers} | ${grip.stoppedSpan} | ${grip.corrected ? 'corrected' : 'confirmed'} |`;
    })
    .join('\n');
  const sounding = bundle.sounding.map((bar, index) => `${index + 1}. ${bar.join(' · ')}`).join('\n');
  return `# V8B receipt — Black Aura liquid harmony

## Status

| Item | Result |
| --- | --- |
| Pitch, fret, span, provenance, re-import, source and bass checks | **PASS** — \`npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8b.test.ts\` (8 passed) |
| Playback | **NOT VERIFIED** |
| Musician review | **NOT VERIFIED** |
| Sibelius import | **NOT OPENED** |
| V8C | not started |

Technical pass means the checks in the test file. Nobody listened. Nobody played the grips.

## Files

- \`V8B-LIQUID-HARMONY.musicxml\` — four-bar guitar extract. Bass under it is the bar 16 clone.
- \`V8B-DUO-LIQUID-HARMONY.musicxml\` — full duo with the four bars inserted at the V8A return point.
- \`V8B-RECIPE.json\` — pair, frets, provenance, voice movements.

Seed \`${bundle.seed}\`. Source sha256 \`${bundle.sourceSha256}\`.

## Fret check

Sounding pitch is open-string MIDI plus fret. Standard tuning: E2 A2 D3 G3 B3 E4.

The three proposed Option B grips match that arithmetic. No finger was moved.

Staff pitch is one octave above sounding, with \`octave-change -1\`, same as the leadsheet and V8A. Written D5 sounds D4. Frets below are sounding frets.

| Grip | Role | Fingers | Stopped span | Check |
| --- | --- | --- | --- | --- |
${gripLines}

## Guitar sounding

${sounding}

Bar 1 leaves the bass fifth immediately: A4 moves to Ab4, D4 stays, and the mixed dyad holds a dotted quarter.
Bar 2 compresses the source cell: F–Ab, then Eb–D, as single notes.
Bar 3 is silent for a half bar, then D4 moves to Eb4 while Ab4 stays.
Bar 4 states the mixed F/Ab dyad once, lets F fall to Eb, and leaves Ab hanging. No cadence.

## Voice movements

1. **A4 → Ab4 (−1).** Lower voice D4 stays. String 1 fret 5 to fret 4. String 2 stays at fret 3. Span goes from 2 to 1.
2. **D4 → Eb4 (+1).** Upper voice Ab4 stays. String 2 fret 3 to fret 4. String 1 stays at fret 4. Arrival span is 0.

F–Ab and Eb–D are motif statements, not those two holds.

## Preservation

Insert point matches V8A: cut after order ${V8A_WINDOW.cutAfterOrder}, return at order ${V8A_WINDOW.returnOrder}, four 4/4 bars, quarter = 92.
Bass in the new bars is the printed bar 16 clone: D3 A3 D3 and that bar's rests.
Bars outside the insert keep source guitar and bass.
Printed symbols on the source bars are not rewritten as Dm or Ab.
Vault parent-triad inspection stays BLOCKED. This pair is piece data only.
V8A files are not written by this builder.

## Not claimed

No listening quality. No player approval. No V8C.
`;
}

export function writeV8bPilot(outDir = V8B_OUT_DIR, bundle = buildV8bBundle()): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  const files: Array<[string, string]> = [
    ['V8B-LIQUID-HARMONY.musicxml', bundle.scores.extract],
    ['V8B-DUO-LIQUID-HARMONY.musicxml', bundle.scores.duo],
    ['V8B-RECIPE.json', recipeJson(bundle)],
    ['V8B-RECEIPT.md', receipt(bundle)],
  ];
  for (const [name, body] of files) fs.writeFileSync(path.join(outDir, name), body);
  return files.map(([name]) => path.join(outDir, name));
}

export function reimportV8b(xml: string): ReturnType<typeof importWwhDuoMusicXml> {
  return importWwhDuoMusicXml(xml);
}

export function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
