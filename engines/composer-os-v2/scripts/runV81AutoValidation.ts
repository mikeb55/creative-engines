/**
 * V81 auto-validation CLI (8 tests).
 * Run: npx tsx --tsconfig ../../tsconfig.json scripts/runV81AutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import { dim7ChordTones, sixthChordTones } from '../core/barry-harris/chordTones';
import {
  applyChordMelodyToScore,
  closeBlockVoicingBelowMelody,
  DEFAULT_BH_MELODY_RHYTHM_PROFILE,
  familyKey,
  isDrop2InnerSpacing,
  isDrop2Voicing,
  precomputeBarryHarrisChordMelodyFoundation,
  runBarryHarrisChordMelodyPipeline,
  scoreMelodyToImportMelody,
} from '../core/barry-harris';
import {
  BARRY_HARRIS_EVAL_CHORDS_16,
  BARRY_HARRIS_EVAL_MELODY_16,
} from '../core/barry-harris/chordMelodyPipeline';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { melodyLinesMatchPitchForPitch } from '../core/import/mosaicStyleTransfer';
import type { ImportMelodyNote } from '../core/import/mosaicImportTimeline';
import { planLeadMelody } from '../core/song-mode/leadMelodyPlanner';
import { planMelodyBehaviour } from '../core/song-mode/melodyBehaviourPlanner';
import { planChorusMetadata } from '../core/song-mode/chorusPlanner';
import { planHookMetadata } from '../core/song-mode/hookPlanner';
import { buildSongHook } from '../core/song-mode/songModeBuilder';
import type { SectionChordPlan } from '../core/song-mode/songCompilationTypes';
import type { SongSectionPlan } from '../core/song-mode/songModeTypes';
import type { ResolvedChordMelodyNote } from '../core/barry-harris/types';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const UPPER_REGISTER_CLOSE_TOP_MIDI = 76;
const FAMILY_CHANGE_LEAP_MAX_SEMITONES = 10;

const JAZZ_BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);
const JAZZ_BENCHMARK_LEGACY = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'barry_harris',
  'BH_Benchmark_JazzMelody.musicxml'
);

function resolveJazzBenchmarkMusicXmlPath(): string {
  if (fs.existsSync(JAZZ_BENCHMARK_FIXTURE)) return JAZZ_BENCHMARK_FIXTURE;
  if (fs.existsSync(JAZZ_BENCHMARK_LEGACY)) return JAZZ_BENCHMARK_LEGACY;
  throw new Error(`BH jazz benchmark fixture missing: ${JAZZ_BENCHMARK_FIXTURE}`);
}

type AssertResult = { label: string; pass: boolean; detail?: string };

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function melodyNote(
  bar: number,
  onsetBeat: number,
  midiPitch: number,
  durationBeats = 1
): ImportMelodyNote {
  return { bar, onsetBeat, durationBeats, midiPitch, confidence: 1, fieldOrigin: 'explicit' };
}

const JAZZ_HARMONY = ['G', 'G', 'Am7', 'D7', 'Bm7', 'Bm7', 'D7', 'G'] as const;

const JAZZ_MELODY: ImportMelodyNote[] = [
  melodyNote(1, 0, 66),
  melodyNote(1, 2, 71),
  melodyNote(2, 0, 69),
  melodyNote(2, 2, 67),
  melodyNote(3, 0, 69),
  melodyNote(3, 2, 68),
  melodyNote(4, 0, 70),
  melodyNote(4, 2, 66),
  melodyNote(5, 0, 71),
  melodyNote(5, 2, 69),
  melodyNote(6, 0, 71),
  melodyNote(6, 2, 66),
  melodyNote(7, 0, 70),
  melodyNote(7, 2, 68),
  melodyNote(8, 0, 67),
  melodyNote(8, 2, 71),
];

function cMajorDiatonicStrongBeatMelody(): ImportMelodyNote[] {
  const scale = [60, 62, 64, 65, 67, 69, 71, 72];
  const out: ImportMelodyNote[] = [];
  for (let bar = 1; bar <= 8; bar++) {
    out.push(melodyNote(bar, 0, scale[(bar - 1) % scale.length]!));
    out.push(melodyNote(bar, 2, scale[(bar + 2) % scale.length]!));
  }
  return out;
}

function chromaticWeakBeatMelody(): ImportMelodyNote[] {
  const out: ImportMelodyNote[] = [];
  let midi = 60;
  for (let bar = 1; bar <= 8; bar++) {
    for (const beat of [1, 3] as const) {
      out.push(melodyNote(bar, beat, midi));
      midi += 1;
    }
  }
  return out;
}

function runPipeline(
  harmonyBars: readonly string[],
  melody: readonly ImportMelodyNote[],
  presetId: 'guitar_bass_duo' | 'string_quartet' | 'big_band' = 'guitar_bass_duo'
) {
  const context = {
    form: { totalBars: harmonyBars.length, sections: [] },
    lockedHarmonyBarsRaw: [...harmonyBars],
    generationMetadata: {},
  } as CompositionContext;
  const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
  const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, harmonyBars.length, harmonyBars, {
    presetId,
    bhRhythmProfile: DEFAULT_BH_MELODY_RHYTHM_PROFILE,
  });
  return { foundation, pipeline };
}

function scoreBenchmark(
  harmonyBars: readonly string[],
  melody: readonly ImportMelodyNote[],
  presetId: 'guitar_bass_duo' | 'string_quartet' | 'big_band'
) {
  const { pipeline } = runPipeline(harmonyBars, melody, presetId);
  const emptyScore: ScoreModel =
    presetId === 'string_quartet'
      ? {
          title: 'BH SQ V81',
          parts: [
            { id: 'sq_violin_1', name: 'Violin I', instrumentIdentity: 'violin_1', measures: [] },
            { id: 'sq_violin_2', name: 'Violin II', instrumentIdentity: 'violin_2', measures: [] },
            { id: 'sq_viola', name: 'Viola', instrumentIdentity: 'viola', measures: [] },
            { id: 'sq_cello', name: 'Cello', instrumentIdentity: 'cello', measures: [] },
          ],
        }
      : presetId === 'big_band'
        ? { title: 'BH BB V81', parts: [] }
        : {
            title: 'BH guitar V81',
            parts: [
              {
                id: 'guitar',
                name: 'Guitar',
                instrumentIdentity: 'clean_electric_guitar',
                measures: [],
              },
            ],
          };
  const scored = applyChordMelodyToScore(emptyScore, pipeline.resolvedNotes, melody, presetId);
  const xmlResult = exportScoreModelToMusicXml(scored, { bpm: 120, preserveChordKindLiterals: true });
  return { pipeline, scored, xml: xmlResult.xml ?? '' };
}

function printAssertions(title: string, assertions: AssertResult[]): boolean {
  console.log(`\n=== ${title} ===`);
  let all = true;
  for (const a of assertions) {
    console.log(`${a.pass ? 'PASS' : 'FAIL'}: ${a.label}${a.detail ? ` (${a.detail})` : ''}`);
    if (!a.pass) all = false;
  }
  console.log(`TEST ${all ? 'PASS' : 'FAIL'}`);
  return all;
}

function passingDimReceipts(cmReceipts: readonly string[] | undefined): string[] {
  return (cmReceipts ?? []).filter((r) => r.startsWith('bh:cm:passing_dim@'));
}

function reportPassingDimCase(label: string, harmony: readonly string[], melody: readonly ImportMelodyNote[]) {
  const { pipeline } = runPipeline(harmony, melody);
  const s = pipeline.summary;
  const pdReceipts = passingDimReceipts(s.cmReceipts);
  console.log(`\n--- ${label} ---`);
  console.log(`passingDimCount: ${s.passingDimCount ?? 0}`);
  console.log(`structuralSixthCount: ${s.structuralSixthCount ?? 0}`);
  console.log(`passingDimDensity: ${(s.passingDimDensity ?? 0).toFixed(3)}`);
  console.log(`first 3 passing_dim receipts: ${pdReceipts.slice(0, 3).join(' | ') || '(none)'}`);
  return s.passingDimDensity ?? 0;
}

function test1PassingDimDensity(): boolean {
  const densityA = reportPassingDimCase('1a jazz benchmark', JAZZ_HARMONY, JAZZ_MELODY);
  const cHarm = Array.from({ length: 8 }, () => 'C');
  const densityB = reportPassingDimCase('1b C major strong beats', cHarm, cMajorDiatonicStrongBeatMelody());
  const densityC = reportPassingDimCase('1c chromatic weak beats', cHarm, chromaticWeakBeatMelody());
  const { pipeline: evalPipeline } = runPipeline(
    [...BARRY_HARRIS_EVAL_CHORDS_16],
    BARRY_HARRIS_EVAL_MELODY_16
  );
  const andOfOneMelody: ImportMelodyNote[] = [
    melodyNote(1, 0, 67),
    melodyNote(1, 1, 69),
    melodyNote(2, 0, 65),
    melodyNote(2, 2, 64),
    melodyNote(3, 0, 67),
    melodyNote(3, 1, 68),
    melodyNote(4, 0, 70),
    melodyNote(4, 2, 67),
  ];
  const cHarm8 = Array.from({ length: 8 }, () => 'C');
  const andOfOneMelodyC: ImportMelodyNote[] = [
    melodyNote(1, 0, 60),
    melodyNote(1, 1, 62),
    melodyNote(2, 0, 64),
    melodyNote(2, 2, 65),
  ];
  const { pipeline: andOfOnePipeline } = runPipeline(cHarm8, andOfOneMelodyC);
  const andOfOneCount = andOfOnePipeline.harmonyEvents.filter(
    (e) => e.eventKind === 'passing_dim' && Math.abs(e.onsetBeat - 0.5) < 0.02
  ).length;
  const passingAll = andOfOnePipeline.harmonyEvents
    .filter((e) => e.eventKind === 'passing_dim')
    .map((e) => `b${e.bar}@${e.onsetBeat}`)
    .join(' | ');
  console.log(`\n--- V83e and-of-1 (beat-1 → beat-2 passing fixture) ---`);
  console.log(`andOfOnePassingDimCount: ${andOfOneCount}`);
  console.log(`passing_dim onsets: ${passingAll || '(none)'}`);

  const inBand = (d: number) => d >= 0.15 && d <= 0.5;
  return printAssertions('TEST 1 — Passing dim density', [
    { label: '1a density in [0.15, 0.50]', pass: inBand(densityA), detail: densityA.toFixed(3) },
    { label: '1b density in [0.15, 0.50]', pass: inBand(densityB), detail: densityB.toFixed(3) },
    { label: '1c density === 0', pass: densityC === 0, detail: densityC.toFixed(3) },
    {
      label: 'V83e and-of-1 passing dim >= 1 (beat-1→beat-2 fixture)',
      pass: andOfOneCount >= 1,
      detail: `andOfOneCount=${andOfOneCount}`,
    },
  ]);
}

function test2SongModeAdapter(): boolean {
  const harmonyBars = ['C', 'F', 'Am', 'G'];
  const sections: SongSectionPlan[] = [{ order: 0, kind: 'verse' }];
  const chordPlan: SectionChordPlan[] = [
    { sectionOrder: 0, sectionKind: 'verse', intensity: 'medium', chordSymbols: [...harmonyBars] },
  ];
  const lead = planLeadMelody({
    seed: 81001,
    sections,
    chordPlan,
    hookPlan: planHookMetadata(81001, sections, 'barry_harris'),
    chorusPlan: planChorusMetadata(sections, 'barry_harris'),
    hook: buildSongHook(81001),
    voiceType: 'male_tenor',
    melodyBehaviour: planMelodyBehaviour(81001, 'barry_harris'),
    harmonyBars,
  });
  const fourBarNotes = lead.notes.filter((n) => n.measure >= 1 && n.measure <= 4);
  const imported = scoreMelodyToImportMelody(fourBarNotes);
  const roundTripOk =
    imported.length === fourBarNotes.length &&
    imported.every((n, i) => {
      const src = fourBarNotes[i]!;
      return n.midiPitch === src.midi && n.bar === src.measure;
    });

  const context = {
    form: { totalBars: 4, sections: [] },
    lockedHarmonyBarsRaw: harmonyBars,
    generationMetadata: {},
  } as CompositionContext;
  const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
  const pipeline = runBarryHarrisChordMelodyPipeline(foundation, [], 4, harmonyBars, {
    songMode: true,
    generatedMelody: fourBarNotes,
  });

  console.log(`\nlead planner notes (4 bars): ${fourBarNotes.length}`);
  console.log(`import melody notes: ${imported.length}`);
  console.log(
    `first 3 harmony events: ${pipeline.harmonyEvents
      .slice(0, 3)
      .map((e) => `bar${e.bar}@${e.onsetBeat}:${e.eventKind}`)
      .join(' | ') || '(none)'}`
  );

  return printAssertions('TEST 2 — Song Mode adapter', [
    { label: 'round-trip length match', pass: imported.length === fourBarNotes.length },
    { label: 'round-trip MIDI match', pass: roundTripOk },
    { label: 'harmonyEvents non-empty', pass: pipeline.harmonyEvents.length > 0 },
  ]);
}

function extractPartNames(xml: string): string[] {
  const names: string[] = [];
  const re = /<part-name>([^<]*)<\/part-name>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) names.push(m[1]!.trim());
  return names;
}

function test3StringQuartet(): boolean {
  const { pipeline } = scoreBenchmark(JAZZ_HARMONY, JAZZ_MELODY, 'string_quartet');
  const { scored, xml } = scoreBenchmark(JAZZ_HARMONY, JAZZ_MELODY, 'string_quartet');
  void scored;
  const partNames = extractPartNames(xml);
  const expected = ['Violin I', 'Violin II', 'Viola', 'Cello'];
  const namesOk = expected.every((n) => partNames.includes(n));

  const structural = pipeline.resolvedNotes.filter((r) => r.eventKind !== 'passing_dim' && !r.harmonyOnly);
  const passing = pipeline.resolvedNotes.filter((r) => r.eventKind === 'passing_dim');

  const vn1Structural = structural.every((r) => r.sqVoiceMidis?.violin1 != null);
  const vn1PassingNull = passing.every((r) => r.sqVoiceMidis?.violin1 == null);

  const dissonanceWarnings = pipeline.resolvedNotes.flatMap((r) => r.sqFeasibilityWarnings ?? []);
  const noDissonanceTop = !dissonanceWarnings.some((w) => w.startsWith('DISSONANCE_TOP'));

  let noVlaCross = true;
  for (const r of pipeline.resolvedNotes) {
    const sq = r.sqVoiceMidis;
    if (!sq) continue;
    if (sq.viola != null && sq.violin2 != null && sq.viola > sq.violin2) noVlaCross = false;
  }

  return printAssertions('TEST 3 — String quartet jazz benchmark', [
    { label: 'part names Violin I/II, Viola, Cello', pass: namesOk, detail: partNames.join(', ') },
    { label: 'Vn1 present on structural', pass: vn1Structural },
    { label: 'Vn1 null on passing_dim', pass: vn1PassingNull },
    { label: 'zero DISSONANCE_TOP warnings', pass: noDissonanceTop, detail: String(dissonanceWarnings.filter((w) => w.startsWith('DISSONANCE_TOP')).length) },
    { label: 'no Viola > Violin II crossing', pass: noVlaCross },
  ]);
}

function bbVoiceCount(v: NonNullable<ResolvedChordMelodyNote['bbVoiceMidis']>): number {
  return [v.alto1, v.alto2, v.tenor1, v.tenor2, v.bari].filter((m) => m != null).length;
}

function noAdjacentBbCross(v: NonNullable<ResolvedChordMelodyNote['bbVoiceMidis']>): boolean {
  const chain: Array<number | null | undefined> = [v.bari, v.tenor2, v.tenor1, v.alto2, v.alto1];
  const pitches = chain.filter((m): m is number => m != null);
  for (let i = 1; i < pitches.length; i++) {
    if (pitches[i - 1]! > pitches[i]!) return false;
  }
  return true;
}

function test4BigBand(): boolean {
  const { pipeline, xml } = scoreBenchmark(JAZZ_HARMONY, JAZZ_MELODY, 'big_band');
  const partNames = extractPartNames(xml);
  const expected = ['Alto Sax 1', 'Alto Sax 2', 'Tenor Sax 1', 'Tenor Sax 2', 'Bari Sax'];
  const namesOk = expected.every((n) => partNames.includes(n));

  const structural = pipeline.resolvedNotes.filter((r) => r.eventKind !== 'passing_dim' && !r.harmonyOnly);
  const passing = pipeline.resolvedNotes.filter((r) => r.eventKind === 'passing_dim');
  const alto1Structural = structural.every((r) => r.bbVoiceMidis?.alto1 != null);
  const alto1PassingNull = passing.every((r) => r.bbVoiceMidis?.alto1 == null);

  let bariThickOk = true;
  let crossOk = true;
  for (const r of pipeline.resolvedNotes) {
    const bb = r.bbVoiceMidis;
    if (!bb) continue;
    if (!noAdjacentBbCross(bb)) crossOk = false;
    if (bbVoiceCount(bb) >= 3 && bb.bari != null && bb.bari > 62) bariThickOk = false;
  }

  return printAssertions('TEST 4 — Big band jazz benchmark', [
    { label: '5 sax part names', pass: namesOk, detail: partNames.join(', ') },
    { label: 'Alto1 on structural', pass: alto1Structural },
    { label: 'Alto1 null on passing_dim', pass: alto1PassingNull },
    { label: 'Bari <= MIDI 62 on thick (>=3 voices)', pass: bariThickOk },
    { label: 'no adjacent sax crossing', pass: crossOk },
  ]);
}

function parseMeasureDurationUnits(measureInner: string, defaultDivisions: number): { sum: number; divisions: number } {
  let divisions = defaultDivisions;
  const divMatch = measureInner.match(/<divisions>(\d+)<\/divisions>/);
  if (divMatch) divisions = Number(divMatch[1]);

  let beats = 4;
  const timeMatch = measureInner.match(/<beats>(\d+)<\/beats>/);
  const beatTypeMatch = measureInner.match(/<beat-type>(\d+)<\/beat-type>/);
  if (timeMatch && beatTypeMatch) {
    beats = Number(timeMatch[1]) * (4 / Number(beatTypeMatch[1]));
  }
  const expected = divisions * beats;

  let sum = 0;
  const noteRestRe = /<(note|rest)([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = noteRestRe.exec(measureInner)) !== null) {
    const chunk = m[2]!;
    if (/<chord\s*\/>/.test(chunk)) continue;
    const durMatch = chunk.match(/<duration>(\d+)<\/duration>/);
    if (durMatch) sum += Number(durMatch[1]);
  }
  return { sum, divisions: expected };
}

function guitarPartXml(xml: string): string | null {
  const parts = [...xml.matchAll(/<score-part id=\"([^\"]+)\"[\s\S]*?<part-name>([^<]+)<\/part-name>/g)];
  const guitar = parts.find((p) => /guitar/i.test(p[2]!));
  if (!guitar) return null;
  const id = guitar[1]!;
  const partRe = new RegExp(`<part id=\"${id}\">([\\s\\S]*?)<\\/part>`);
  const pm = xml.match(partRe);
  return pm ? pm[1]! : null;
}

function test5RestArtifact(): boolean {
  const { xml } = scoreBenchmark(JAZZ_HARMONY, JAZZ_MELODY, 'guitar_bass_duo');
  const partBody = guitarPartXml(xml);
  if (!partBody) {
    return printAssertions('TEST 5 — Rest artifact guitar export', [
      { label: 'guitar part found in MusicXML', pass: false },
    ]);
  }

  const measures = [...partBody.matchAll(/<measure[^>]*number=\"(\d+)\"[^>]*>([\s\S]*?)<\/measure>/g)];
  let divisions = 1;
  const divGlobal = xml.match(/<divisions>(\d+)<\/divisions>/);
  if (divGlobal) divisions = Number(divGlobal[1]);

  let allBarsOk = true;
  const bad: string[] = [];
  for (const m of measures) {
    const barNum = m[1]!;
    const inner = m[2]!;
    if (inner.includes('<divisions>')) {
      const d = inner.match(/<divisions>(\d+)<\/divisions>/);
      if (d) divisions = Number(d[1]);
    }
    const voiceSegments = inner.split(/<backup>/);
    for (let vi = 0; vi < voiceSegments.length; vi++) {
      const { sum, divisions: expected } = parseMeasureDurationUnits(voiceSegments[vi]!, divisions);
      if (Math.abs(sum - expected) > 0.5) {
        allBarsOk = false;
        bad.push(`bar ${barNum} voice ${vi + 1}: sum=${sum} expected=${expected}`);
      }
    }
  }

  return printAssertions('TEST 5 — Rest artifact guitar export', [
    { label: 'each bar voice note+rest durations sum to bar length', pass: allBarsOk, detail: bad.slice(0, 4).join('; ') || `${measures.length} bars checked` },
  ]);
}

function maxInnerDisplacement(prevInner: readonly number[], currInner: readonly number[]): number {
  if (prevInner.length === 0 || currInner.length === 0) return 0;
  const prev = [...prevInner].sort((a, b) => a - b);
  const curr = [...currInner].sort((a, b) => a - b);
  const used = new Set<number>();
  let max = 0;
  for (const a of prev) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < curr.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(curr[j]! - a);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) continue;
    used.add(bestIdx);
    max = Math.max(max, bestDist);
  }
  return max;
}

function test6FamilyChangeLeapWarn(): boolean {
  const { pipeline } = runPipeline([...BARRY_HARRIS_EVAL_CHORDS_16], BARRY_HARRIS_EVAL_MELODY_16);
  const structural = pipeline.resolvedNotes
    .filter(
      (r) =>
        r.eventKind !== 'passing_dim' &&
        !r.harmonyOnly &&
        r.phrasingRole !== 'single' &&
        (r.innerVoicingMidis?.length ?? 0) > 0
    )
    .sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);

  let familyChanges = 0;
  let familyOverMaxLeap = 0;
  let familyMaxLeapSeen = 0;
  let softLeapCases = 0;
  let softLeapMissingReceipt = 0;

  let adjacentStructuralPairs = 0;
  let adjacentOverMaxLeap = 0;
  let adjacentMaxLeapSeen = 0;
  const adjacentViolations: string[] = [];

  for (let i = 1; i < structural.length; i++) {
    const prev = structural[i - 1]!;
    const curr = structural[i]!;
    adjacentStructuralPairs++;
    const leap = maxInnerDisplacement(prev.innerVoicingMidis, curr.innerVoicingMidis);
    adjacentMaxLeapSeen = Math.max(adjacentMaxLeapSeen, leap);
    if (leap > FAMILY_CHANGE_LEAP_MAX_SEMITONES) {
      adjacentOverMaxLeap++;
      adjacentViolations.push(`b${prev.bar}→b${curr.bar}:${leap}`);
    }

    const prevFk = familyKey(prev.anchor);
    const currFk = familyKey(curr.anchor);
    if (prevFk === currFk) continue;
    familyChanges++;
    familyMaxLeapSeen = Math.max(familyMaxLeapSeen, leap);
    if (leap > FAMILY_CHANGE_LEAP_MAX_SEMITONES) familyOverMaxLeap++;
    if (leap > 7 && leap <= FAMILY_CHANGE_LEAP_MAX_SEMITONES) {
      softLeapCases++;
      const receipt = `bh:cm:family_change_leap_warn@bar${curr.bar}`;
      const hasReceipt =
        (pipeline.cmReceipts ?? []).includes(receipt) || curr.familyChangeLeapWarn === true;
      if (!hasReceipt) softLeapMissingReceipt++;
    }
  }

  if (adjacentViolations.length > 0) {
    console.log(`TEST 6 adjacent inner-comp leap violations: ${adjacentViolations.join(', ')}`);
  }
  console.log(
    `TEST 6 max adjacent structural inner-comp leap: ${adjacentMaxLeapSeen} semitones (${adjacentStructuralPairs} pairs)`
  );

  return printAssertions('TEST 6 — Inner-comp VL cap (chromatic eval benchmark)', [
    {
      label: 'chromatic eval produces >=1 sixth-family change with voiced inner motion',
      pass: familyChanges >= 1,
      detail: `familyChanges=${familyChanges}`,
    },
    {
      label: `max inner displacement on family change <= ${FAMILY_CHANGE_LEAP_MAX_SEMITONES} semitones`,
      pass: familyOverMaxLeap === 0 && familyChanges >= 1,
      detail: `maxLeap=${familyMaxLeapSeen} overMax=${familyOverMaxLeap}`,
    },
    {
      label: `max inner displacement on ALL adjacent structural pairs <= ${FAMILY_CHANGE_LEAP_MAX_SEMITONES} semitones`,
      pass: adjacentOverMaxLeap === 0 && adjacentStructuralPairs >= 1,
      detail: `maxLeap=${adjacentMaxLeapSeen} overMax=${adjacentOverMaxLeap} pairs=${adjacentStructuralPairs}`,
    },
    {
      label: 'soft band (7,10] semitones emits family_change_leap_warn receipt when triggered',
      pass: softLeapCases === 0 || softLeapMissingReceipt === 0,
      detail: `softCases=${softLeapCases} missingReceipt=${softLeapMissingReceipt}`,
    },
  ]);
}

function closeTopInnerMidi(resolved: ResolvedChordMelodyNote, melodyMidi: number): number {
  const tones =
    resolved.kind === 'dim7'
      ? dim7ChordTones(resolved.anchor.dim7RootPc)
      : sixthChordTones(resolved.anchor.sixthRootPc, resolved.anchor.sixthQuality);
  const inner = closeBlockVoicingBelowMelody(melodyMidi, tones, mod12(melodyMidi));
  return inner.length > 0 ? Math.max(...inner) : 0;
}

function upperRegisterVoicingOk(resolved: ResolvedChordMelodyNote, melodyMidi: number): boolean {
  const inner = [...resolved.innerVoicingMidis].sort((a, b) => a - b);
  if (inner.length < 2) return true;
  if (isDrop2Voicing(resolved, melodyMidi) || isDrop2InnerSpacing(melodyMidi, inner)) return true;
  const innerTop = Math.max(...inner);
  return innerTop <= UPPER_REGISTER_CLOSE_TOP_MIDI;
}

function melodyMidiForResolved(r: ResolvedChordMelodyNote, melody: readonly ImportMelodyNote[]): number {
  const m = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
  return m?.midiPitch ?? 60;
}

function test8StyleTransferJazzBenchmark(): boolean {
  const xml = fs.readFileSync(resolveJazzBenchmarkMusicXmlPath(), 'utf8');
  const ir = musicXmlToImportTimeline(xml);
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);
  const inputMelody = ir.melodyLine;

  const gp = runGoldenPathOnce(88108, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    totalBars,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: 'barry_harris',
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    suppressWybleVoiceLayoutForTest: true,
  });

  const st = gp.context?.generationMetadata?.styleTransferResult;
  const cm = st?.barryHarrisChordMelody;
  const cmReceipts =
    cm?.cmReceipts ??
    gp.context?.generationMetadata?.barryHarrisChordMelodyReceipts ??
    [];
  const pdReceipts = passingDimReceipts(cmReceipts);
  const andOfOneReceipts = pdReceipts.filter((r) => /onset=0\.5(?::|$)/.test(r));
  const density = cm?.passingDimDensity ?? 0;
  const retained = st?.retainedMelody ?? [];
  const melodyPreserved =
    inputMelody.length === 16 &&
    retained.length === 16 &&
    melodyLinesMatchPitchForPitch(inputMelody, retained);
  const generationOk =
    gp.score != null &&
    gp.score.parts.length > 0 &&
    (gp.xml?.length ?? 0) > 0 &&
    st?.composerApplied === 'barry_harris' &&
    !gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e));

  console.log('\n--- TEST 8 style-transfer jazz benchmark ---');
  console.log(`fixture: ${resolveJazzBenchmarkMusicXmlPath()}`);
  console.log(`generationOk: ${generationOk} (gp.success=${gp.success})`);
  console.log(`input melody notes: ${inputMelody.length}`);
  console.log(`retainedMelody notes: ${retained.length}`);
  console.log(`passingDimCount: ${cm?.passingDimCount ?? 0}`);
  console.log(`passingDimDensity: ${density.toFixed(3)}`);
  console.log(`first passing_dim receipt: ${pdReceipts[0] ?? '(none)'}`);
  console.log(`and-of-1 passing_dim receipts: ${andOfOneReceipts.length}`);

  const densityOk = density >= 0.25 && density <= 0.4;

  return printAssertions('TEST 8 — Style-transfer jazz benchmark', [
    {
      label: 'generation succeeds (style-transfer output, no authority failure)',
      pass: generationOk,
      detail: gp.errors[0] ?? 'ok',
    },
    { label: 'input has 16 melody notes', pass: inputMelody.length === 16 },
    { label: '>=1 passing_dim receipt', pass: pdReceipts.length >= 1, detail: String(pdReceipts.length) },
    {
      label: 'passingDimDensity in [0.25, 0.40]',
      pass: densityOk,
      detail: density.toFixed(3),
    },
    {
      label: 'all 16 melody notes preserved',
      pass: melodyPreserved,
      detail: `retained=${retained.length}`,
    },
  ]);
}

function highRegisterJazzMelody(): ImportMelodyNote[] {
  return JAZZ_MELODY.map((n) => ({ ...n, midiPitch: n.midiPitch + 12 }));
}

function test7Drop2UpperRegister(): boolean {
  const melody = highRegisterJazzMelody();
  const { pipeline } = runPipeline(JAZZ_HARMONY, melody);
  const structural = pipeline.resolvedNotes.filter((r) => r.eventKind !== 'passing_dim' && !r.harmonyOnly);

  let crampedCloseCandidates = 0;
  let fail = 0;
  let melodyAboveE5 = 0;
  for (const r of structural) {
    if (r.phrasingRole === 'single') continue;
    const mel = melodyMidiForResolved(r, melody);
    if (mel > UPPER_REGISTER_CLOSE_TOP_MIDI) melodyAboveE5++;
    const closeTop = closeTopInnerMidi(r, mel);
    if (closeTop <= UPPER_REGISTER_CLOSE_TOP_MIDI) continue;
    crampedCloseCandidates++;
    if (!upperRegisterVoicingOk(r, mel)) fail++;
  }

  return printAssertions('TEST 7 — Drop-2 K upper register (melody above E5)', [
    {
      label: 'high-register jazz benchmark has >=1 melody attack above MIDI 76 (E5)',
      pass: melodyAboveE5 >= 1,
      detail: `melodyAboveE5=${melodyAboveE5}`,
    },
    {
      label: 'cramped-close candidates >=1 (close-top would exceed E5)',
      pass: crampedCloseCandidates >= 1,
      detail: `candidates=${crampedCloseCandidates}`,
    },
    {
      label: 'upper-register policy: drop-2 spacing or inner top <= E5 on cramped-close candidates',
      pass: fail === 0 && crampedCloseCandidates >= 1,
      detail: `failures=${fail}`,
    },
  ]);
}

const V83C_NOTATION_CHECK_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'v83c-notation-check.musicxml'
);

const V83E_AND_OF_ONE_QA_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'v83e-and-of-1-check.musicxml'
);

const MUSICXML_DIVISIONS = 480;

/** V83e+f — voice-2 chord-stack onset (beats) per bar from exported MusicXML. */
function voice2StackOnsetsFromMusicXml(xml: string, bar: number): number[] {
  const measureRe = new RegExp(`<measure number="${bar}">([\\s\\S]*?)<\\/measure>`);
  const body = xml.match(measureRe)?.[1] ?? '';
  const backupIdx = body.indexOf('<backup>');
  if (backupIdx < 0) return [];
  const v2 = body.slice(backupIdx);
  let cursor = 0;
  const onsets: number[] = [];
  const noteRe = /<note>([\s\S]*?)<\/note>/g;
  let nm: RegExpExecArray | null;
  while ((nm = noteRe.exec(v2)) !== null) {
    const block = nm[1]!;
    if (block.includes('<rest')) {
      const restDurM = block.match(/<duration>(\d+)<\/duration>/);
      if (restDurM) cursor += parseInt(restDurM[1]!, 10);
      continue;
    }
    const isChord = block.includes('<chord/>');
    const durM = block.match(/<duration>(\d+)<\/duration>/);
    if (!durM) continue;
    const dur = parseInt(durM[1]!, 10);
    if (!isChord) {
      cursor += dur;
      onsets.push(cursor / MUSICXML_DIVISIONS - dur / MUSICXML_DIVISIONS);
    }
  }
  return [...new Set(onsets.map((b) => Math.round(b * 1000) / 1000))].sort((a, b) => a - b);
}

/** V83e QA — chromatic eval fixture with profile-driven and-of-1 passing dims. */
function writeV83eAndOfOneQa(): void {
  const { pipeline, xml } = scoreBenchmark(
    [...BARRY_HARRIS_EVAL_CHORDS_16],
    BARRY_HARRIS_EVAL_MELODY_16,
    'guitar_bass_duo'
  );
  if (!xml || xml.length < 500) {
    throw new Error('V83e QA export empty or too small');
  }
  const andOfOneEvents = pipeline.harmonyEvents.filter(
    (e) => e.eventKind === 'passing_dim' && Math.abs(e.onsetBeat - 0.5) < 0.02
  );
  const andOfOneCount = andOfOneEvents.length;
  fs.mkdirSync(path.dirname(V83E_AND_OF_ONE_QA_PATH), { recursive: true });
  fs.writeFileSync(V83E_AND_OF_ONE_QA_PATH, xml, 'utf8');
  console.log(`\nV83e and-of-1 QA written: ${V83E_AND_OF_ONE_QA_PATH}`);
  console.log(`bytes: ${xml.length}`);
  console.log(`andOfOnePassingDimCount: ${andOfOneCount}`);
  console.log('V83e+f MusicXML voice-2 stack onsets for and-of-1 bars (expect 0.5):');
  for (const e of andOfOneEvents) {
    const stacks = voice2StackOnsetsFromMusicXml(xml, e.bar);
    const dimStack = stacks.find((b) => Math.abs(b - 0.5) < 0.06) ?? stacks[0];
    console.log(`  bar ${e.bar}: engine onset=${e.onsetBeat} xml stacks=${stacks.join(',') || '(none)'} dimGripAt=${dimStack ?? 'n/a'}`);
  }
  if (andOfOneCount < 1) {
    throw new Error('V83e QA export missing and-of-1 passing_dim');
  }
  if (andOfOneCount < 3 || andOfOneCount > 5) {
    console.warn(`V83e+f and-of-1 count ${andOfOneCount} outside benchmark band 3-5`);
  }
}

/** V83c QA asset — dense BH style-transfer export for Sibelius notation check. */
function writeV83cNotationCheck(): void {
  const xml = fs.readFileSync(resolveJazzBenchmarkMusicXmlPath(), 'utf8');
  const ir = musicXmlToImportTimeline(xml);
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);
  const gp = runGoldenPathOnce(88108, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    totalBars,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: 'barry_harris',
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    suppressWybleVoiceLayoutForTest: true,
  });
  const st = gp.context?.generationMetadata?.styleTransferResult;
  const generationOk =
    gp.score != null &&
    gp.score.parts.length > 0 &&
    (gp.xml?.length ?? 0) > 0 &&
    st?.composerApplied === 'barry_harris' &&
    !gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e));
  if (!generationOk || !gp.xml) {
    throw new Error(`V83c QA export failed: ${gp.errors.join('; ')}`);
  }
  fs.mkdirSync(path.dirname(V83C_NOTATION_CHECK_PATH), { recursive: true });
  fs.writeFileSync(V83C_NOTATION_CHECK_PATH, gp.xml, 'utf8');
  const m1 = gp.xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
  const feelAbove =
    /<direction placement="above">[\s\S]*?<words font-style="italic">[^<]+feel; straight 8ths<\/words>/.test(m1);
  const harmonyAbove = m1.includes('<harmony placement="above">');
  const tempoBeforeHarmony =
    m1.indexOf('<metronome>') >= 0 && m1.indexOf('<metronome>') < m1.indexOf('<harmony');
  const noBelowFeel = !m1.includes('placement="below"><direction-type><words>Feel:');
  console.log(`\nV83c notation check written: ${V83C_NOTATION_CHECK_PATH}`);
  console.log(`bytes: ${gp.xml.length}`);
  console.log(`feel in above direction (italic): ${feelAbove}`);
  console.log(`harmony placement="above": ${harmonyAbove}`);
  console.log(`tempo before harmony: ${tempoBeforeHarmony}`);
  console.log(`no legacy below-staff feel: ${noBelowFeel}`);
  if (!feelAbove || !harmonyAbove || !tempoBeforeHarmony || !noBelowFeel) {
    throw new Error('V83c QA XML failed notation placement assertions');
  }
}

function main(): void {
  if (process.argv.includes('--write-v83c-qa')) {
    writeV83cNotationCheck();
    return;
  }
  if (process.argv.includes('--write-v83e-qa')) {
    writeV83eAndOfOneQa();
    return;
  }
  console.log('V81 auto-validation\n');
  const results = [
    test1PassingDimDensity(),
    test2SongModeAdapter(),
    test3StringQuartet(),
    test4BigBand(),
    test5RestArtifact(),
    test6FamilyChangeLeapWarn(),
    test7Drop2UpperRegister(),
    test8StyleTransferJazzBenchmark(),
  ];
  const passed = results.filter(Boolean).length;
  console.log(`\nSummary: ${passed}/8 tests passed`);
  try {
    writeV83eAndOfOneQa();
  } catch (e) {
    console.error(`V83e QA export skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
  process.exit(passed === 8 ? 0 : 1);
}

main();

