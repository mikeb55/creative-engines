/**
 * Afrobeat rhythm engine — pattern bundle + polyrhythm pulses + triplet-grid quantise.
 */

import {
  applyPolyrhythm,
  createAfrobeatRhythmEngine,
  expandSixteenthsToTripletGrid,
  foldTripletGridToSixteenths,
  loadDefaultTonyAllenPatternsBundle,
  modCycle,
  parseTonyAllenPatternsBundle,
  pulseIndices,
  quantise,
  validateDrumPattern,
} from '../core/percussion/afrobeatRhythmEngine';
import type { DrumPattern } from '../core/percussion/afrobeatRhythmEngine';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { buildFelaAfrobeatPercussionPart } from '../core/song-mode/felaKutiSlice';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

function emptyPattern(): DrumPattern {
  const z = (): number[] => new Array(16).fill(0);
  return { kick: z(), snare: z(), hiHat: z(), bell: z(), conga: z() };
}

function testLoadsCommittedJson(): boolean {
  const b = loadDefaultTonyAllenPatternsBundle();
  if (b.schemaVersion < 1) return false;
  for (const feel of ['straight', 'swing', 'afrobeat'] as const) {
    const p = b.feels[feel];
    validateDrumPattern(p, 16);
    if (p.kick.reduce((a, x) => a + x, 0) < 1) return false;
  }
  return true;
}

function testPulseIndicesThreeAgainstFour(): boolean {
  const ix = pulseIndices(3, 0, 16);
  const want = [0, 5, 11];
  if (ix.length !== want.length) return false;
  for (let i = 0; i < want.length; i++) {
    if (ix[i] !== want[i]) return false;
  }
  const shifted = pulseIndices(3, 1, 16);
  return shifted[0] === 1 && shifted[1] === 6 && shifted[2] === 12;
}

function testApplyPolyrhythmSnareTriple(): boolean {
  const base = emptyPattern();
  const out = applyPolyrhythm(base, [{ voice: 'snare', pulses: 3, phaseSteps: 0 }]);
  if (out.snare[0] !== 1 || out.snare[5] !== 1 || out.snare[11] !== 1) return false;
  let hits = 0;
  for (const x of out.snare) if (x) hits++;
  return hits === 3;
}

function testQuantise24ExpandsLength(): boolean {
  const eng = createAfrobeatRhythmEngine();
  const p = eng.selectPattern('afrobeat');
  const q = quantise(p, 24);
  validateDrumPattern(q, 24);
  return q.kick.length === 24 && quantise(p, 16).kick.length === 16;
}

function testModCycleNegativeAndLargePhase(): boolean {
  if (modCycle(-1, 16) !== 15) return false;
  if (modCycle(33, 16) !== 1) return false;
  const ix = pulseIndices(4, -4, 16);
  return ix.every((n) => n >= 0 && n < 16) && ix.length === 4;
}

function testPulseIndicesPhaseWrapMatchesEquivalent(): boolean {
  const a = pulseIndices(3, 1, 16);
  const b = pulseIndices(3, 17, 16);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function testParseBundleMissingFeelUsesEmptyRows(): boolean {
  const raw = {
    schemaVersion: 1,
    feels: {
      straight: {
        kick: Array(16).fill(0),
        snare: Array(16).fill(0),
        hiHat: Array(16).fill(0),
        bell: Array(16).fill(0),
        conga: Array(16).fill(0),
      },
      swing: {
        kick: Array(16).fill(0),
        snare: Array(16).fill(0),
        hiHat: Array(16).fill(0),
        bell: Array(16).fill(0),
        conga: Array(16).fill(0),
      },
      // afrobeat intentionally omitted → empty fallback
    },
  };
  const b = parseTonyAllenPatternsBundle(raw);
  validateDrumPattern(b.feels.afrobeat, 16);
  let sum = 0;
  for (const x of b.feels.afrobeat.kick) sum += x;
  return sum === 0;
}

function testQuantiseGridBarEdges(): boolean {
  const ones = Array(16).fill(1) as number[];
  const pat: DrumPattern = {
    kick: ones,
    snare: ones,
    hiHat: ones,
    bell: ones,
    conga: ones,
  };
  const q24 = quantise(pat, 24);
  validateDrumPattern(q24, 24);
  return q24.kick[0] === 1 && q24.kick[23] === 1;
}

function testFelaPercussionMusicXmlSibeliusShapes(): boolean {
  const eng = createAfrobeatRhythmEngine();
  for (const feel of ['straight', 'swing', 'afrobeat'] as const) {
    const drumPart = buildFelaAfrobeatPercussionPart(1, eng.selectPattern(feel));
    const score: ScoreModel = {
      title: `Fela percussion Sibelius check — ${feel}`,
      tempo: 108,
      timeSignature: { beats: 4, beatType: 4 },
      parts: [drumPart],
    };
    const xr = exportScoreModelToMusicXml(score);
    if (!xr.success || !xr.xml) return false;
    const xml = xr.xml;
    if (!xml.includes('Afrobeat Percussion')) return false;
    if (!xml.includes('<sign>percussion</sign>')) return false;
    if (!xml.includes('<unpitched>')) return false;
    if ((xml.match(/<part id=/g) ?? []).length !== 1) return false;
    if (!xml.includes('<accidental>sharp</accidental>')) return false;
  }
  return true;
}

function testTripletFoldRoundTrip(): boolean {
  const row = [
    1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
  ];
  const r24 = expandSixteenthsToTripletGrid(row);
  if (r24.length !== 24) return false;
  const back = foldTripletGridToSixteenths(r24);
  if (back.length !== 16) return false;
  for (let i = 0; i < 16; i++) {
    if (back[i] !== row[i]) return false;
  }
  return true;
}

export function runAfrobeatRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Loads tonyAllenPatterns.json (all feels, 16-step rows)', testLoadsCommittedJson],
    ['Polyrhythm pulseIndices 3-in-bar spacing', testPulseIndicesThreeAgainstFour],
    ['applyPolyrhythm merges 3 snare pulses', testApplyPolyrhythmSnareTriple],
    ['quantise expands to 24-step triplet grid', testQuantise24ExpandsLength],
    ['modCycle + pulseIndices phase wrap (bar boundary)', testModCycleNegativeAndLargePhase],
    ['pulseIndices(phase+16) equals pulseIndices(phase)', testPulseIndicesPhaseWrapMatchesEquivalent],
    ['parseTonyAllenPatternsBundle missing feel → empty rows', testParseBundleMissingFeelUsesEmptyRows],
    ['quantise 24-grid maps bar start/end slots', testQuantiseGridBarEdges],
    ['MusicXML Fela drum part (unpitched, percussion clef, F#/G# accidentals)', testFelaPercussionMusicXmlSibeliusShapes],
    ['triplet expand/fold round-trip preserves hits', testTripletFoldRoundTrip],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
