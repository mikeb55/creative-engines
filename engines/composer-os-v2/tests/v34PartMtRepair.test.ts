/**
 * Pärt M/T repair. Technical checks and export evidence. Not an artistic approval.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { runGoldenPathOnce, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { writeScoreModelMidiFile } from '../core/export/midiScoreWriter';
import { addEvent, createNote, createPart, createScore } from '../core/score-model/scoreEventBuilder';
import { validateSibeliusUndottedBeatAtoms, validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import { runBehaviourGates } from '../core/score-integrity/behaviourGates';
import { lockedHarmonyChordSymbolsEquivalent } from '../core/harmony/chordProgressionParser';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';
import type { CompositionContext } from '../core/compositionContext';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import { applyArvoPartTintinnabuliToDuoScore, arvoPartLockedBarMotifIssueIsWarning } from '../core/song-mode/arvoPartSlice';
import { planSectionRoles } from '../core/section-roles/sectionRolePlanner';
import { planDensityCurve } from '../core/density/densityCurvePlanner';
import { planGuitarRegisterMap, planBassRegisterMap } from '../core/register-map/registerMapPlanner';
import { planGuitarBehaviour } from '../core/instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../core/instrument-behaviours/uprightBassBehaviour';
import { computeRhythmicConstraints } from '../core/rhythm-engine/rhythmEngine';
import type { InstrumentRegisterMap } from '../core/register-map/registerMapTypes';

type Row = { name: string; ok: boolean };

function songOpts(extra: Partial<RunGoldenPathOptions> = {}): RunGoldenPathOptions {
  return {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleStack: { primary: 'triad_pairs', weights: { primary: 1 } },
    creativeControlLevel: 'stable',
    chromaticStrength: 'prominent',
    endingContext: 'open_idiom',
    keySignatureMode: 'none',
    primarySongwriterStyle: 'arvo_part',
    scoreTitle: 'arvo_part',
    ...extra,
  };
}

function pc(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function rootPc(symbol: string): number {
  const match = symbol.match(/^([A-G](?:#|b)?)/);
  const name = match?.[1] ?? 'C';
  const letter = 'CDEFGAB'.indexOf(name[0]!.toUpperCase());
  const base = [0, 2, 4, 5, 7, 9, 11][letter] ?? 0;
  if (name[1] === '#') return (base + 1) % 12;
  if (name[1] === 'b') return (base + 11) % 12;
  return base;
}

function triadPcs(symbol: string): number[] {
  const root = rootPc(symbol);
  const head = symbol.toLowerCase();
  if (/dim|°/.test(head)) return [root, (root + 3) % 12, (root + 6) % 12];
  if (/aug|\+/.test(head)) return [root, (root + 4) % 12, (root + 8) % 12];
  if (/m(?!aj)|min/.test(head)) return [root, (root + 3) % 12, (root + 7) % 12];
  return [root, (root + 4) % 12, (root + 7) % 12];
}

function digest(score: ScoreModel | undefined): string {
  const parts = (score?.parts ?? []).map((part) =>
    part.measures
      .map((measure) =>
        measure.events
          .map((event) =>
            event.kind === 'note'
              ? `n${event.pitch}@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`
              : event.kind === 'rest'
                ? `r@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`
                : 'x',
          )
          .join(','),
      )
      .join(';'),
  );
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

function notes(score: ScoreModel, instrument: string, voice: number): NoteEvent[] {
  const part = score.parts.find((item) => item.instrumentIdentity === instrument);
  const out: NoteEvent[] = [];
  for (const measure of part?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind === 'note' && (event.voice ?? 1) === voice) out.push(event);
    }
  }
  return out;
}

const MAP: InstrumentRegisterMap = { instrumentIdentity: 'test', sections: [] };

function shell(): { guitar: ReturnType<typeof createPart>; bass: ReturnType<typeof createPart> } {
  const guitar = createPart('guitar', 'Clean Electric Guitar', 'clean_electric_guitar', 27, 'treble', 8, () => 'Cmaj7', () => undefined);
  const bass = createPart('bass', 'Acoustic Upright Bass', 'acoustic_upright_bass', 32, 'bass', 8, () => 'Cmaj7', () => undefined);
  guitar.measures[0]!.events = [{ kind: 'note', pitch: 60, startBeat: 0, duration: 4, voice: 1, motifRef: 'song_motif_lock' }];
  bass.measures[0]!.events = [{ kind: 'note', pitch: 40, startBeat: 0, duration: 4, voice: 1 }];
  guitar.measures[5]!.measureBeatSpanQuarters = 3;
  bass.measures[5]!.measureBeatSpanQuarters = 3;
  guitar.measures[5]!.events = [{ kind: 'note', pitch: 61, startBeat: 0, duration: 3, voice: 1 }];
  bass.measures[5]!.events = [{ kind: 'rest', startBeat: 0, duration: 3, voice: 1 }];
  return { guitar, bass };
}

function contextFor(mode: 'M1' | 'M2', position: 'below' | 'above' | 'alternating', posture: 'fur_alina' | 'fratres'): CompositionContext {
  return {
    seed: 3340,
    form: { totalBars: 8, sections: [{ label: 'A', startBar: 1, length: 8 }] },
    generationMetadata: {
      songwriterStyleId: 'arvo_part',
      arvoPartContext: posture,
      arvoPartTintinnabuli: { mode, position },
      arvoPartEffectiveHarmonyBars: ['Am', 'Am', 'Am', 'F', 'C', 'G', 'Dm', 'Am'],
    },
  } as CompositionContext;
}

function applyPair(mode: 'M1' | 'M2', position: 'below' | 'above' | 'alternating', posture: 'fur_alina' | 'fratres') {
  const built = shell();
  const context = contextFor(mode, position, posture);
  applyArvoPartTintinnabuliToDuoScore(built.guitar, built.bass, context, {
    guitarMap: MAP,
    bassMap: MAP,
    walkLow: 40,
    bassCeiling: 52,
  });
  return { ...built, score: createScore('part', [built.guitar, built.bass], { tempo: 66 }), context };
}

function legalTint(score: ScoreModel): boolean {
  const guitar = score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return false;
  for (const measure of guitar.measures) {
    if (measure.index === 1 || measure.index === 25) continue;
    if (Math.abs((measure.measureBeatSpanQuarters ?? 4) - 4) > 1e-4) continue;
    const pcs = triadPcs(measure.chord ?? 'C');
    const melody = measure.events.filter((event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === 1);
    const upper = measure.events.filter((event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === 2);
    for (const tone of upper) {
      if (!pcs.includes(pc(tone.pitch))) return false;
      const host = melody.find((note) => tone.startBeat + 1e-4 >= note.startBeat && tone.startBeat < note.startBeat + note.duration - 1e-4);
      if (!host || tone.pitch <= host.pitch) return false;
      for (let midi = host.pitch + 1; midi < tone.pitch; midi++) {
        if (midi >= 55 && midi <= 79 && pcs.includes(pc(midi))) return false;
      }
    }
    const bassMeasure = bass.measures.find((item) => item.index === measure.index);
    for (const tone of bassMeasure?.events ?? []) {
      if (tone.kind !== 'note') continue;
      if (tone.pitch < 40 || tone.pitch > 52) return false;
      if (!pcs.includes(pc(tone.pitch))) return false;
    }
    for (const note of melody) {
      if (note.pitch < 55 || note.pitch > 79) return false;
    }
  }
  return true;
}

export function runV34PartMtRepairTests(): Row[] {
  const out: Row[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });

  const below = applyPair('M1', 'below', 'fur_alina');
  const belowAgain = applyPair('M1', 'below', 'fur_alina');
  const lockedGuitar = below.guitar.measures[0]!.events.find((event) => event.kind === 'note');
  const oddGuitar = below.guitar.measures[5]!.events.find((event) => event.kind === 'note');
  const restBar = below.guitar.measures[2]!;
  const sounding = below.guitar.measures.filter((measure) => measure.index !== 1 && measure.index !== 3 && measure.index !== 6 && measure.index !== 7);
  t(
    'M1 below keeps locks, writes a triadic T under a diatonic M, and rests',
    digest(below.score) === digest(belowAgain.score) &&
      validateStrictBarMath(below.score).valid &&
      lockedGuitar?.kind === 'note' &&
      lockedGuitar.pitch === 60 &&
      lockedGuitar.motifRef === 'song_motif_lock' &&
      oddGuitar?.kind === 'note' &&
      oddGuitar.pitch === 61 &&
      restBar.events.every((event) => event.kind === 'rest') &&
      legalTint(below.score) &&
      notes(below.score, 'acoustic_upright_bass', 1).some((note) => note.pitch < 55) &&
      sounding.some((measure) => measure.events.some((event) => event.kind === 'note' && event.motifRef === 'song_motif_1')),
  );

  const both = applyPair('M2', 'below', 'fratres');
  const upper = notes(both.score, 'clean_electric_guitar', 2);
  const lower = notes(both.score, 'acoustic_upright_bass', 1);
  t(
    'M2 keeps a triad tone above and below the melody',
    validateStrictBarMath(both.score).valid && legalTint(both.score) && upper.length > 0 && lower.length > 0,
  );

  const above = applyPair('M1', 'above', 'spiegel');
  t(
    'M1 above puts the triad tone on the guitar and a pedal in the bass',
    legalTint(above.score) &&
      notes(above.score, 'clean_electric_guitar', 2).length > 0 &&
      notes(above.score, 'acoustic_upright_bass', 1).length > 0 &&
      validateStrictBarMath(above.score).valid,
  );

  const alt = applyPair('M1', 'alternating', 'fur_alina');
  t('alternating still selects both directions without leaving the triad', legalTint(alt.score) && validateStrictBarMath(alt.score).valid);

  const phraseA = below.guitar.measures[3]!.events.filter((event) => event.kind === 'note').map((event) => (event as NoteEvent).pitch);
  const phraseB = below.guitar.measures[7]!.events.filter((event) => event.kind === 'note').map((event) => (event as NoteEvent).pitch);
  t(
    'the next phrase moves the cell instead of repeating it',
    phraseA.length >= 2 && phraseB.length >= 2 && phraseA.join(',') !== phraseB.join(','),
  );

  const first = runGoldenPathOnce(3340, songOpts({
    arvoPartContext: 'fur_alina',
    arvoPartTintinnabuli: { mode: 'M1', position: 'below' },
    bpm: 66,
    scoreTitle: 'Part M1 below',
  }));
  const firstAgain = runGoldenPathOnce(3340, songOpts({
    arvoPartContext: 'fur_alina',
    arvoPartTintinnabuli: { mode: 'M1', position: 'below' },
    bpm: 66,
    scoreTitle: 'Part M1 below',
  }));
  const second = runGoldenPathOnce(3341, songOpts({
    arvoPartContext: 'spiegel',
    arvoPartTintinnabuli: { mode: 'M2', position: 'below' },
    bpm: 72,
    scoreTitle: 'Part M2',
  }));
  t(
    'golden-path M/T examples are deterministic, in time, and distinct',
    first.success === true &&
      second.success === true &&
      digest(first.score) === digest(firstAgain.score) &&
      digest(first.score) !== digest(second.score) &&
      first.strictBarMathPassed === true &&
      second.strictBarMathPassed === true &&
      !!first.xml &&
      !!second.xml &&
      validateMusicXmlSchema(first.xml).valid &&
      validateMusicXmlSchema(second.xml).valid &&
      legalTint(first.score) &&
      legalTint(second.score) &&
      first.score.tempo === 66 &&
      second.score.tempo === 72,
  );
  if (!first.success || !second.success) {
    console.log('PART ERRORS', first.errors, second.errors);
  }
  t(
    'locked bars keep their notes and match the effective harmony symbol',
    hookHarmonyHolds(first) && hookHarmonyHolds(second) && protectedEventsStay(),
  );
  t(
    'bar-1 motif warning is the locked-cell lines only',
    arvoPartLockedBarMotifIssueIsWarning('Song Mode motif v2: bar 1 identity cell is weak (fewer than 3 notes).') &&
      arvoPartLockedBarMotifIssueIsWarning('Song Mode motif v2: bar 1 lacks a featured leap or enough notes for identity.') &&
      !arvoPartLockedBarMotifIssueIsWarning('consecutive bars without motif-mapped notes') &&
      !arvoPartLockedBarMotifIssueIsWarning('Song Mode motif v2: bar 5 identity cell is weak'),
  );
  t('jazz bass exemptions stay on arvo_part', bassExemptionsStayOnArvoPart());

  return out;
}

function hookHarmonyHolds(run: ReturnType<typeof runGoldenPathOnce>): boolean {
  const bars = run.context.generationMetadata?.arvoPartEffectiveHarmonyBars ?? [];
  const guitar = run.score?.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const xmlMap = extractHarmoniesFromFirstPartXml(run.xml ?? '');
  if (!guitar || !validateSibeliusUndottedBeatAtoms(run.score!).valid) return false;
  return [1, 25].every((bar) => {
    const expected = bars[bar - 1] ?? '';
    const chord = guitar.measures.find((measure) => measure.index === bar)?.chord ?? '';
    return (
      expected.length > 0 &&
      lockedHarmonyChordSymbolsEquivalent(chord, expected) &&
      lockedHarmonyChordSymbolsEquivalent(xmlMap.get(bar) ?? '', expected)
    );
  });
}

function protectedEventsStay(): boolean {
  const built = shell();
  const guitarLock = JSON.stringify(built.guitar.measures[0]!.events);
  const bassLock = JSON.stringify(built.bass.measures[0]!.events);
  const odd = JSON.stringify(built.guitar.measures[5]!.events);
  applyArvoPartTintinnabuliToDuoScore(built.guitar, built.bass, contextFor('M1', 'below', 'fur_alina'), {
    guitarMap: MAP,
    bassMap: MAP,
    walkLow: 40,
    bassCeiling: 52,
  });
  return (
    guitarLock === JSON.stringify(built.guitar.measures[0]!.events) &&
    bassLock === JSON.stringify(built.bass.measures[0]!.events) &&
    odd === JSON.stringify(built.guitar.measures[5]!.events) &&
    built.guitar.measures[0]!.chord === 'Am' &&
    built.bass.measures[0]!.chord === 'Am' &&
    built.guitar.measures[5]!.chord === 'G'
  );
}

function bassExemptionsStayOnArvoPart(): boolean {
  const guitar = createPart('guitar', 'Guitar', 'clean_electric_guitar', 27, 'treble', 32, () => 'C', () => undefined);
  const bass = createPart('bass', 'Bass', 'acoustic_upright_bass', 32, 'bass', 32, () => 'C', () => undefined);
  for (let bar = 1; bar <= 32; bar++) {
    addEvent(guitar.measures[bar - 1]!, createNote(64, 0, 4));
    const measure = bass.measures[bar - 1]!;
    if (bar === 1) {
      addEvent(measure, createNote(50, 0, 1));
      addEvent(measure, createNote(50, 1, 1));
      addEvent(measure, createNote(50, 2, 2));
    } else if (bar === 2) {
      addEvent(measure, createNote(50, 0, 2));
      addEvent(measure, createNote(50, 2, 2));
    } else {
      addEvent(measure, createNote(53, 0, 2));
      addEvent(measure, createNote(53, 2, 2));
    }
  }
  const score = createScore('gate', [guitar, bass], { tempo: 120 });
  const sections = planSectionRoles([{ label: 'A', startBar: 1, length: 32 }], { A: 'statement' });
  const densityPlan = planDensityCurve(sections, 32);
  const guitarMap = planGuitarRegisterMap(sections);
  const bassMap = planBassRegisterMap(sections);
  const guitarBehaviour = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const bassBehaviour = planBassBehaviour(sections, densityPlan, bassMap);
  const rhythmConstraints = computeRhythmicConstraints({ mode: 'swing', intensity: 0.5, syncopationDensity: 'medium' });
  const gate = (songwriterStyleId: string) =>
    runBehaviourGates(score, rhythmConstraints, guitarBehaviour, bassBehaviour, sections, densityPlan, {
      presetId: 'guitar_bass_duo',
      compositionContext: { generationMetadata: { songwriterStyleId }, form: { totalBars: 32 } } as CompositionContext,
    });
  const other = gate('bill_evans');
  const arvo = gate('arvo_part');
  const held = 'identical contour reused too broadly';
  const roots = 'excessive root-only chain';
  const stillThere = 'rhythmic cell repeated across more than two consecutive bars';
  return (
    other.errors.some((error) => error.includes(held)) &&
    other.errors.some((error) => error.includes(roots)) &&
    other.errors.some((error) => error.includes(stillThere)) &&
    !arvo.errors.some((error) => error.includes(held)) &&
    !arvo.errors.some((error) => error.includes(roots)) &&
    arvo.errors.some((error) => error.includes(stillThere))
  );
}

export function writeV34PartMtExamples(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const specs = [
    {
      stem: 'fur-alina-m1-below-seed3340',
      title: 'Für Alina posture — M1 below',
      rule: 'M1 below. Melody is the diatonic cell. Tintinnabuli is the nearest triad tone under the melody, inside the bass range. On every second bar of the phrase the bass enters one beat later, so the melody holds alone. Every fourth bar is silence. The next phrase transposes the cell. Bars 1 and 25 stay the Song Mode identity lock.',
      opts: songOpts({
        arvoPartContext: 'fur_alina',
        arvoPartTintinnabuli: { mode: 'M1', position: 'below' },
        bpm: 66,
        scoreTitle: 'Part M1 below',
      }),
      seed: 3340,
    },
    {
      stem: 'spiegel-m2-seed3341',
      title: 'Spiegel posture — M2',
      rule: 'M2. The same diatonic melody carries two tintinnabuli voices: the nearest triad tone above it on the guitar, and the nearest triad tone below it on the bass. The lower voice enters after the melody on the first note of the bar. The cell moves in halves and quarters, then a silent bar, then a three-note cadence. The next phrase uses the next cell. Bars 1 and 25 stay the Song Mode identity lock.',
      opts: songOpts({
        arvoPartContext: 'spiegel',
        arvoPartTintinnabuli: { mode: 'M2', position: 'below' },
        bpm: 72,
        scoreTitle: 'Part M2',
      }),
      seed: 3341,
    },
  ];
  const lines = [
    'Pärt M/T repair examples',
    'Guitar and upright bass. Technical evidence for later listening. Not musical approval.',
    '',
  ];
  for (const spec of specs) {
    const run = runGoldenPathOnce(spec.seed, spec.opts);
    if (!run.success || !run.xml) throw new Error(`${spec.stem}: ${run.errors.join('; ')}`);
    fs.writeFileSync(path.join(dir, `${spec.stem}.musicxml`), run.xml);
    if (!writeScoreModelMidiFile(run.score, path.join(dir, `${spec.stem}.mid`))) throw new Error(`midi ${spec.stem}`);
    lines.push(spec.title);
    lines.push(spec.rule);
    lines.push(`MusicXML: ${spec.stem}.musicxml`);
    lines.push(`MIDI: ${spec.stem}.mid`);
    lines.push('');
  }
  fs.writeFileSync(path.join(dir, 'RULE.txt'), `${lines.join('\n')}\n`);
}

if (require.main === module) {
  const dir = path.resolve(__dirname, '../../../docs/v3.4-part-mt');
  const rows = runV34PartMtRepairTests();
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
  if (rows.some((row) => !row.ok)) process.exit(1);
  writeV34PartMtExamples(dir);
  console.log(`wrote ${dir}`);
}
