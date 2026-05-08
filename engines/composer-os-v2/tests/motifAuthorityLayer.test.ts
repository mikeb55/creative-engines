/**
 * Motif Authority Layer V2 — ThemeGenome / similarity / recall (non-smoke harness).
 */

import { buildThemeGenome } from '../core/motif/themeGenomeBuilder';
import { meetsRecallThreshold, scoreMotifSimilarity } from '../core/motif/motifSimilarityScorer';
import {
  buildSectionRecallMap,
  enforceRecallContract,
  leadMelodyPlanToPartModel,
} from '../core/motif/sectionRecallEnforcer';
import type { LeadMelodyPlan } from '../core/song-mode/leadMelodyTypes';
import type { SectionChordPlan } from '../core/song-mode/songCompilationTypes';
import type { SongSectionPlan } from '../core/song-mode/songModeTypes';

function testBuildThemeGenomeVoices(): boolean {
  const ge = buildThemeGenome('gil_evans', 101);
  if (ge.primaryCell.harmonicMask.chordTonesBias !== 0.3) return false;
  if (ge.primaryCell.registerBand[0] !== 55 || ge.primaryCell.registerBand[1] !== 76) return false;
  if (!ge.primaryCell.harmonicMask.avoidStrongLT || !ge.primaryCell.harmonicMask.pedalFriendly) return false;

  const ms = buildThemeGenome('maria_schneider', 101);
  if (ms.primaryCell.registerBand[0] !== 57 || ms.primaryCell.registerBand[1] !== 79) return false;

  const jc = buildThemeGenome('john_coltrane', 101);
  if (jc.primaryCell.harmonicMask.chordTonesBias !== 0.6) return false;

  const def = buildThemeGenome('brian_wilson', 202);
  if (def.primaryCell.harmonicMask.chordTonesBias !== 0.5) return false;

  return ge.recallQuota === 0.6 && ge.voiceId === 'gil_evans' && def.recallQuota === 0.6;
}

function testScoreIdenticalOne(): boolean {
  const g = buildThemeGenome('brian_wilson', 1);
  const p = g.primaryCell;
  const s = scoreMotifSimilarity(p, p);
  const ok = (x: number) => Math.abs(x - 1) < 1e-9;
  return ok(s.total) && ok(s.intervalScore) && ok(s.rhythmScore) && ok(s.contourScore) && ok(s.registerScore);
}

function testScoreInvertedLower(): boolean {
  const g = buildThemeGenome('john_coltrane', 3);
  const sec = g.secondaryCell;
  if (!sec) return false;
  const s = scoreMotifSimilarity(sec, g.primaryCell);
  return s.total < 1 && s.total >= 0;
}

function testMeetsRecallThresholdRoles(): boolean {
  const z = { total: 0, intervalScore: 0, rhythmScore: 0, contourScore: 0, registerScore: 0 };
  const low = { ...z, total: 0.4 };
  const bPass = { ...z, total: 0.46 };
  const codaFail = { ...z, total: 0.5 };
  const codaPass = { ...z, total: 0.56 };
  const hi = { ...z, total: 0.7 };
  if (meetsRecallThreshold(low, 'A')) return false;
  if (!meetsRecallThreshold(bPass, 'B')) return false;
  if (meetsRecallThreshold(codaFail, 'coda')) return false;
  if (!meetsRecallThreshold(codaPass, 'coda')) return false;
  return meetsRecallThreshold(hi, 'A');
}

function testEnforceRecallContractNoThrow(): boolean {
  const g = buildThemeGenome('brian_wilson', 9);
  const chordPlan: SectionChordPlan[] = [
    {
      sectionOrder: 0,
      sectionKind: 'verse',
      intensity: 'medium',
      chordSymbols: ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Fmaj7', 'Fmaj7', 'G7', 'G7'],
    },
    {
      sectionOrder: 1,
      sectionKind: 'bridge',
      intensity: 'high',
      chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
    },
  ];
  const sections: SongSectionPlan[] = [
    { order: 0, kind: 'verse' },
    { order: 1, kind: 'bridge' },
  ];
  const plan: LeadMelodyPlan = {
    phrases: [
      {
        phraseId: 'p1',
        sectionOrder: 0,
        sectionKind: 'verse',
        startMeasure: 1,
        endMeasure: 4,
        cadenceMeasure: 4,
        contour: 'wave',
        repetitionTag: 'statement',
        phraseLengthBars: 4,
      },
    ],
    notes: [
      { measure: 1, beat: 0, duration: 1, midi: 60 },
      { measure: 1, beat: 1, duration: 1, midi: 62 },
      { measure: 2, beat: 0, duration: 2, midi: 64 },
    ],
    contourArc: 'balanced',
    cadenceMeasures: [4],
  };
  const part = leadMelodyPlanToPartModel(plan);
  const secMap = buildSectionRecallMap(sections, chordPlan);
  try {
    const out = enforceRecallContract(part, g, secMap);
    return out.measures.length >= 1;
  } catch {
    return false;
  }
}

export function runMotifAuthorityLayerTests(): { name: string; ok: boolean }[] {
  return [
    ['MAL buildThemeGenome voice defaults', testBuildThemeGenomeVoices],
    ['MAL similarity identical is 1.0', testScoreIdenticalOne],
    ['MAL similarity inverted < 1', testScoreInvertedLower],
    ['MAL meetsRecallThreshold per section role', testMeetsRecallThresholdRoles],
    ['MAL enforceRecallContract runs', testEnforceRecallContractNoThrow],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
