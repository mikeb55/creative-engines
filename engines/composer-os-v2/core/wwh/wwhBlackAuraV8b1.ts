/**
 * Black Aura V8B.1 — same guitar-talk window, any spelled triad pair.
 * D minor / Ab major keeps the approved V8B notes.
 * Other pairs use the triad-pair search. V8B files are not rewritten.
 */

import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml } from './wwhDuoImport';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import type { SourceIndex } from './director/sourceIndexAdapter';
import { assertWwhBar, wwhNote, wwhRest, wwhDyad, wwhTriad, WWH_DIVISIONS, type WwhAtom } from './wwhPerformanceTypes';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from './wwhBlackAuraV8a';
import { inspectV8bParentTriad } from './wwhBlackAuraV8aVault';
import { buildV8bBundle, type V8bBundle } from './wwhBlackAuraV8b';
import { midiOf, V8B_SEED, V8B_VOICE_MOVEMENTS } from './wwhBlackAuraV8bRecipe';
import {
  analyzeTriadPair,
  pitchName,
  realizeTriadPair,
  type ContextualTone,
  type LiquidSlot,
  type PairContext,
  type PairVoicing,
  type ParentTriadInput,
  type TriadPairRealization,
} from './wwhTriadPair';

export const V8B1_OUT_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V8-PILOT/B1';
export const V8B1_SEED = V8B_SEED;
const BAR_TICKS = 1024;
const WRITTEN_OCTAVE_SHIFT = 1;

export const V8B1_SLOTS: LiquidSlot[] = [
  { bar: 1, duration: 'quarter', rest: true },
  { bar: 1, duration: 'eighth', rest: false, kind: 'resolution' },
  { bar: 1, duration: 'quarter.', rest: false, kind: 'connect' },
  { bar: 1, duration: 'quarter', rest: true },
  { bar: 2, duration: 'quarter', rest: true },
  { bar: 2, duration: 'eighth', rest: false, kind: 'single', singleIndex: 0 },
  { bar: 2, duration: 'eighth', rest: false, kind: 'single', singleIndex: 1 },
  { bar: 2, duration: 'quarter', rest: true },
  { bar: 2, duration: 'eighth', rest: false, kind: 'single', singleIndex: 2 },
  { bar: 2, duration: 'eighth', rest: false, kind: 'single', singleIndex: 3 },
  { bar: 3, duration: 'half', rest: true },
  { bar: 3, duration: 'eighth', rest: false, kind: 'connect' },
  { bar: 3, duration: 'quarter', rest: false, kind: 'move' },
  { bar: 3, duration: 'eighth', rest: true },
  { bar: 4, duration: 'quarter', rest: true },
  { bar: 4, duration: 'eighth', rest: false, kind: 'hinge' },
  { bar: 4, duration: 'eighth', rest: true },
  { bar: 4, duration: 'eighth', rest: false, kind: 'single', singleIndex: 4 },
  { bar: 4, duration: 'quarter', rest: true },
  { bar: 4, duration: 'eighth', rest: false, kind: 'single', singleIndex: 5 },
];

export const V8B1_DM_AB = {
  resolution: {
    id: 'D_minor',
    rootSpelling: 'D',
    quality: 'minor',
    notes: ['D', 'F', 'A'],
    pitchClasses: [2, 5, 9],
    provenance: 'user',
  },
  tension: {
    id: 'Ab_major',
    rootSpelling: 'Ab',
    quality: 'major',
    notes: ['Ab', 'C', 'Eb'],
    pitchClasses: [8, 0, 3],
    provenance: 'user',
  },
} as const;

export const V8B1_C_AM = {
  resolution: {
    id: 'C_major',
    rootSpelling: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    pitchClasses: [0, 4, 7],
    provenance: 'user',
  },
  tension: {
    id: 'A_minor',
    rootSpelling: 'A',
    quality: 'minor',
    notes: ['A', 'C', 'E'],
    pitchClasses: [9, 0, 4],
    provenance: 'user',
  },
} as const;

export interface V8b1Example {
  id: 'D-minor-Ab-major' | 'C-major-A-minor';
  writtenFrom: 'approved-v8b-baseline' | 'triad-pair-search';
  realization: TriadPairRealization;
  guitarAtoms: WwhAtom[][];
  scores: { extract: string; duo: string };
}

export interface V8b1Bundle {
  seed: number;
  sourceSha256: string;
  vaultStillBlocked: boolean;
  context: PairContext;
  contrasting: V8b1Example;
  sharedTone: V8b1Example;
  baseline: V8bBundle;
}

function pairInput(pair: typeof V8B1_DM_AB | typeof V8B1_C_AM): { resolution: ParentTriadInput; tension: ParentTriadInput } {
  return {
    resolution: {
      id: pair.resolution.id,
      rootSpelling: pair.resolution.rootSpelling,
      quality: pair.resolution.quality,
      notes: [...pair.resolution.notes] as [string, string, string],
      pitchClasses: [...pair.resolution.pitchClasses] as [number, number, number],
      provenance: pair.resolution.provenance,
    },
    tension: {
      id: pair.tension.id,
      rootSpelling: pair.tension.rootSpelling,
      quality: pair.tension.quality,
      notes: [...pair.tension.notes] as [string, string, string],
      pitchClasses: [...pair.tension.pitchClasses] as [number, number, number],
      provenance: pair.tension.provenance,
    },
  };
}

function contextualTone(
  role: ContextualTone['role'],
  step: string,
  alter: number,
  printedOctave: number,
  transposeOctave: number
): ContextualTone {
  const soundingOctave = printedOctave + transposeOctave;
  const printed = pitchName(step, alter, printedOctave);
  const sounding = pitchName(step, alter, soundingOctave);
  return {
    role,
    printed,
    sounding: `${printed} sounding ${sounding}`,
    step,
    alter,
    soundingMidi: midiOf(step, alter, soundingOctave),
  };
}

export function loadBlackAuraPairContext(): { context: PairContext; sha256: string; index: SourceIndex } {
  const { index, sha256 } = loadBlackAuraIndex();
  const tones: ContextualTone[] = [];
  for (const order of [V8A_WINDOW.motifFirstOrder, V8A_WINDOW.motifLastOrder]) {
    const measure = index.measures[order];
    if (!measure) throw new Error(`motif bar ${order} missing`);
    if (measure.guitar.transposeOctave !== -1) throw new Error('guitar octave transposition is not −1');
    for (const note of measure.guitar.notes) {
      if (note.rest || note.chord || !note.step || note.octave === undefined) continue;
      tones.push(contextualTone('melody', note.step, note.alter ?? 0, note.octave, measure.guitar.transposeOctave));
    }
  }
  const bassBar = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!bassBar) throw new Error('bar 16 missing');
  if (bassBar.bass.transposeOctave !== -1) throw new Error('bass octave transposition is not −1');
  for (const note of bassBar.bass.notes) {
    if (note.rest || note.chord || !note.step || note.octave === undefined) continue;
    tones.push(contextualTone('bass', note.step, note.alter ?? 0, note.octave, bassBar.bass.transposeOctave));
  }
  const returning = index.measures[V8A_WINDOW.returnOrder];
  if (!returning) throw new Error('return bar missing');
  return {
    index,
    sha256,
    context: {
      tones,
      printedHarmony: [
        `order ${V8A_WINDOW.cutAfterOrder}: ${bassBar.guitar.harmony.join(' ') || '(none)'}`,
        `order ${V8A_WINDOW.returnOrder}: ${returning.guitar.harmony.join(' ') || '(none)'}`,
      ],
    },
  };
}

function writtenFromVoicing(voicing: PairVoicing, duration: LiquidSlot['duration']): WwhAtom[] {
  const specs = voicing.points.map(
    (point) => [point.step, point.octave + WRITTEN_OCTAVE_SHIFT, point.alter] as [string, number, number]
  );
  const low = specs[0];
  if (!low) throw new Error(`${voicing.id} empty`);
  if (specs.length === 1) return [wwhNote(low[0], low[1], duration, low[2])];
  const mid = specs[1];
  if (!mid) throw new Error(`${voicing.id} missing upper note`);
  if (specs.length === 2) return wwhDyad(low, mid, duration);
  const high = specs[2];
  if (!high || specs.length !== 3) throw new Error(`${voicing.id} has ${specs.length} notes`);
  return wwhTriad(low, mid, high, duration);
}

function atomsFromRealization(realization: TriadPairRealization): WwhAtom[][] {
  const bars = new Map<number, WwhAtom[]>();
  for (const event of realization.events) {
    const list = bars.get(event.bar) ?? [];
    if (!event.voicing) list.push(wwhRest(event.duration));
    else list.push(...writtenFromVoicing(event.voicing, event.duration));
    bars.set(event.bar, list);
  }
  return [1, 2, 3, 4].map((bar) => {
    const atoms = bars.get(bar) ?? [];
    assertWwhBar(atoms, BAR_TICKS, `v8b1-${bar}`);
    const attacks = atoms.filter((atom) => !atom.rest && !atom.chord).length;
    if (attacks > 4) throw new Error(`v8b1-${bar} has ${attacks} attacks`);
    return atoms;
  });
}

function header(movementTitle: string): WwhScoreHeader {
  return {
    title: 'Black Aura',
    movementTitle,
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V8B.1',
    tempo: 92,
    transposeOctave: -1,
  };
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

function writtenWindow(guitarBars: WwhAtom[][], templateBass: WwhWrittenBar['bassClone'], label: string): WwhWrittenBar[] {
  return guitarBars.map((guitar, index) => ({
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
    words: index === 0 ? [`${V8A_WINDOW.id} ${label}`] : undefined,
    tempoMark: index === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: '92', soundTempo: null } : undefined,
  }));
}

function duoBars(index: SourceIndex, atoms: WwhAtom[][], templateBass: WwhWrittenBar['bassClone'], label: string): WwhWrittenBar[] {
  const source = sourceWritten(index);
  return [...source.slice(0, V8A_WINDOW.returnOrder), ...writtenWindow(atoms, templateBass, label), ...source.slice(V8A_WINDOW.returnOrder)];
}

function sameApprovedParent(
  input: ParentTriadInput,
  approved: (typeof V8B1_DM_AB)['resolution'] | (typeof V8B1_DM_AB)['tension']
): boolean {
  return (
    input.rootSpelling === approved.rootSpelling &&
    input.quality === approved.quality &&
    input.notes.join('|') === approved.notes.join('|') &&
    input.pitchClasses.join('|') === approved.pitchClasses.join('|')
  );
}

/** Full Black Aura duo for one spelled pair. Does not write the approved V8B or V8B.1 files. */
export function scoreBlackAuraLiquidPair(
  resolution: ParentTriadInput,
  tension: ParentTriadInput,
  seed: number
): {
  duo: string;
  writtenFrom: 'approved-v8b-baseline' | 'triad-pair-search';
  realization: TriadPairRealization;
  sourceSha256: string;
} {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  const loaded = loadBlackAuraPairContext();
  const approved =
    sameApprovedParent(resolution, V8B1_DM_AB.resolution) && sameApprovedParent(tension, V8B1_DM_AB.tension);
  if (approved && seed !== V8B1_SEED) {
    throw new Error(`D minor / Ab major keeps the approved V8B notes, fixed at seed ${V8B1_SEED}. This seed was ${seed}.`);
  }
  const realization = realizeTriadPair(resolution, tension, seed, V8B1_SLOTS, loaded.context);
  if (approved) {
    const baseline = buildV8bBundle(V8B_SEED);
    const scores = renderPair(loaded.index, baseline.guitarAtoms, 'V8B.1 D minor / Ab major', 'LIQUID Dm/Ab');
    return { duo: scores.duo, writtenFrom: 'approved-v8b-baseline', realization, sourceSha256: loaded.sha256 };
  }
  const atoms = atomsFromRealization(realization);
  const label = `${resolution.rootSpelling} ${resolution.quality} / ${tension.rootSpelling} ${tension.quality}`;
  const scores = renderPair(loaded.index, atoms, `V8 liquid ${label}`, 'LIQUID');
  return { duo: scores.duo, writtenFrom: 'triad-pair-search', realization, sourceSha256: loaded.sha256 };
}

function renderPair(index: SourceIndex, atoms: WwhAtom[][], title: string, label: string): { extract: string; duo: string } {
  const template = index.measures[V8A_WINDOW.cutAfterOrder];
  if (!template) throw new Error('bass template missing');
  return {
    extract: renderWwhDuoScore(writtenWindow(atoms, template.bass.element, label), header(title)),
    duo: renderWwhDuoScore(duoBars(index, atoms, template.bass.element, label), header(`${title} duo`)),
  };
}

export function buildV8b1Bundle(seed = V8B1_SEED): V8b1Bundle {
  if (seed !== V8B1_SEED) throw new Error(`V8B.1 Black Aura examples are fixed at seed ${V8B1_SEED}`);
  const loaded = loadBlackAuraPairContext();
  const baseline = buildV8bBundle(V8B_SEED);
  const vault = inspectV8bParentTriad();
  if (vault.status !== 'BLOCKED') throw new Error('V8B.1 must not read a parent triad out of the Vault');
  const contrastingPair = pairInput(V8B1_DM_AB);
  const sharedPair = pairInput(V8B1_C_AM);
  const contrastingSearch = realizeTriadPair(
    contrastingPair.resolution,
    contrastingPair.tension,
    seed,
    V8B1_SLOTS,
    loaded.context
  );
  const sharedTone = realizeTriadPair(sharedPair.resolution, sharedPair.tension, seed, V8B1_SLOTS, loaded.context);
  const contrasting: V8b1Example = {
    id: 'D-minor-Ab-major',
    writtenFrom: 'approved-v8b-baseline',
    realization: contrastingSearch,
    guitarAtoms: baseline.guitarAtoms,
    scores: renderPair(loaded.index, baseline.guitarAtoms, 'V8B.1 D minor / Ab major', 'LIQUID Dm/Ab'),
  };
  const sharedAtoms = atomsFromRealization(sharedTone);
  const shared: V8b1Example = {
    id: 'C-major-A-minor',
    writtenFrom: 'triad-pair-search',
    realization: sharedTone,
    guitarAtoms: sharedAtoms,
    scores: renderPair(loaded.index, sharedAtoms, 'V8B.1 C major / A minor', 'LIQUID C/Am'),
  };
  return {
    seed,
    sourceSha256: loaded.sha256,
    vaultStillBlocked: true,
    context: loaded.context,
    contrasting,
    sharedTone: shared,
    baseline,
  };
}

function recipeJson(example: V8b1Example, bundle: V8b1Bundle): string {
  const pair = example.realization;
  return `${JSON.stringify(
    {
      seed: bundle.seed,
      piece: 'Black Aura',
      status: 'piece-specific recipe',
      notAVaultRow: true,
      notAGlobalRule: true,
      notABhlRule: true,
      writtenFrom: example.writtenFrom,
      source: V8A_DUO_FILE,
      sourceSha256: bundle.sourceSha256,
      window: V8A_WINDOW,
      writtenOctaveShift: WRITTEN_OCTAVE_SHIFT,
      transposeOctave: -1,
      feasibility: 'automated grip, fret and duration checks',
      humanPlayability: 'NOT VERIFIED',
      parents: {
        resolution: pair.resolution,
        tension: pair.tension,
      },
      relationship: pair.analysis,
      search: pair.search,
      consideredPerEvent: pair.consideredPerEvent,
      pathsKeptPerStep: pair.pathsKeptPerStep,
      finalists: pair.finalists,
      densityReduced: pair.densityReduced,
      searchMovements: pair.movements,
      approvedVoiceMovements: example.writtenFrom === 'approved-v8b-baseline' ? V8B_VOICE_MOVEMENTS : undefined,
      soundingAttacks:
        example.writtenFrom === 'approved-v8b-baseline'
          ? bundle.baseline.sounding
          : example.realization.events.filter((event) => event.voicing).map((event) => event.voicing!.points.map((point) => point.name).join('/')),
    },
    null,
    2
  )}\n`;
}

function receipt(bundle: V8b1Bundle): string {
  const sharedMoves = bundle.sharedTone.realization.movements.filter((move) => move.held.length > 0 && move.moved.length === 1);
  const moveLines = sharedMoves
    .map((move) => {
      const held = move.held.map((point) => `${point.name} string ${point.stringNumber} fret ${point.fret}`).join(', ');
      const moved = move.moved.map((point) => `${point.from} to ${point.to} (${point.semitones}) on string ${point.stringNumber}`).join(', ');
      return `- Hold ${held}. Move ${moved}.`;
    })
    .join('\n');
  return `# V8B.1 receipt — triad-pair liquid harmony

## Status

| Item | Result |
| --- | --- |
| Pair validation, frets, retention, rhythm, re-import, source preservation | **PASS** when \`npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8b1.test.ts\` exits 0 |
| Playback | **NOT VERIFIED** |
| Musician review | **NOT VERIFIED** |
| Sibelius import | **NOT OPENED** |
| Human playability | **NOT VERIFIED** — fret span and string checks are automated feasibility only |
| V8C | not started |

Seed \`${bundle.seed}\`. Source sha256 \`${bundle.sourceSha256}\`. Vault parent-triad inspection stays **BLOCKED**.

## Files

- \`V8B1-EXTRACT-D-minor-Ab-major.musicxml\` — four-bar comparison. Notes match approved V8B.
- \`V8B1-DUO-D-minor-Ab-major.musicxml\` — full duo, same insert point as V8A/V8B.
- \`V8B1-EXTRACT-C-major-A-minor.musicxml\` — four-bar comparison from the search.
- \`V8B1-DUO-C-major-A-minor.musicxml\` — full duo for that pair.
- \`V8B1-RECIPE-D-minor-Ab-major.json\`
- \`V8B1-RECIPE-C-major-A-minor.json\`

V8B files are not rewritten. The D minor / Ab major search still runs and is stored as \`finalists\` in that recipe. The written notes for that pair are the approved V8B baseline, not the search winner.

## D minor / Ab major

${bundle.contrasting.realization.analysis.advice.join('\n\n')}

Approved sounding attacks:

${bundle.baseline.sounding.map((bar, index) => `${index + 1}. ${bar.join(' · ')}`).join('\n')}

Approved moves: A4 to Ab4 holding D4, then D4 to Eb4 holding Ab4.

## C major / A minor

${bundle.sharedTone.realization.analysis.advice.join('\n\n')}

Search sounding attacks:

${bundle.sharedTone.realization.finalists[0]?.attacks.join(' · ') || '(none)'}

One-voice moves with a retained fingering:

${moveLines || '- none'}

## Preservation

Insert point matches V8A: cut after order ${V8A_WINDOW.cutAfterOrder}, return at order ${V8A_WINDOW.returnOrder}, four 4/4 bars, quarter = 92.
Guitar staff writes one octave above sounding, with octave-change −1.
Bass in the new bars is the printed bar 16 clone.
Bars outside the insert keep source guitar, bass and chord symbols.
`;
}

export function writeV8b1Pilot(outDir = V8B1_OUT_DIR, bundle = buildV8b1Bundle()): string[] {
  fs.mkdirSync(outDir, { recursive: true });
  const files: Array<[string, string]> = [
    ['V8B1-EXTRACT-D-minor-Ab-major.musicxml', bundle.contrasting.scores.extract],
    ['V8B1-DUO-D-minor-Ab-major.musicxml', bundle.contrasting.scores.duo],
    ['V8B1-EXTRACT-C-major-A-minor.musicxml', bundle.sharedTone.scores.extract],
    ['V8B1-DUO-C-major-A-minor.musicxml', bundle.sharedTone.scores.duo],
    ['V8B1-RECIPE-D-minor-Ab-major.json', recipeJson(bundle.contrasting, bundle)],
    ['V8B1-RECIPE-C-major-A-minor.json', recipeJson(bundle.sharedTone, bundle)],
    ['V8B1-RECEIPT.md', receipt(bundle)],
  ];
  for (const [name, body] of files) fs.writeFileSync(path.join(outDir, name), body);
  return files.map(([name]) => path.join(outDir, name));
}

export function reimportV8b1(xml: string): ReturnType<typeof importWwhDuoMusicXml> {
  return importWwhDuoMusicXml(xml);
}
