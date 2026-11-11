/**
 * Focused — Proto1 user polychordBars may use a 3-PC combined field;
 * adaptive planner still requires ≥4 distinct pitch classes.
 */

import {
  analyzeSyProtoCombinedPolychord,
  buildSonicYouthProto1MelodicDialogue,
  planSyProto1PolychordBars,
  SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR,
  SY_PROTO_ACCGGSHARP_C_OPEN,
  SY_PROTO_LEE_AAEEAA_OPEN,
  type SyProtoPolychordPair,
} from '../core/song-mode/sonicYouthPolychordScore';

function catchMsg(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function sameArr(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/** Identical C major parents → 3-PC union. */
const THREE_PC_IDENTICAL: SyProtoPolychordPair = {
  guitar1: { rootPc: 0, quality: 'major' },
  guitar2: { rootPc: 0, quality: 'major' },
};

/** C aug + E aug share the same 3-PC set. */
const THREE_PC_AUG_CYCLE: SyProtoPolychordPair = {
  guitar1: { rootPc: 0, quality: 'augmented' },
  guitar2: { rootPc: 4, quality: 'augmented' },
};

export function runSonicYouthProto1User3PcFieldTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  {
    const analysis = analyzeSyProtoCombinedPolychord(THREE_PC_IDENTICAL);
    out.push({
      name: 'identical C major parents analyse as 3-PC union',
      ok: analysis.pitchClassCount === 3 && sameArr(analysis.unionPitchClasses, [0, 4, 7]),
    });
  }

  {
    const dialogue = buildSonicYouthProto1MelodicDialogue({
      polychordBars: [THREE_PC_IDENTICAL],
      seed: 1,
    });
    out.push({
      name: 'user 3-PC identical triad pair builds Proto1 dialogue',
      ok:
        dialogue.combinedField.length === 3 &&
        sameArr(dialogue.combinedField, [0, 4, 7]) &&
        dialogue.pairs.length === 1 &&
        dialogue.score.parts.length === 2,
    });
  }

  {
    const dialogue = buildSonicYouthProto1MelodicDialogue({
      polychordBars: [THREE_PC_AUG_CYCLE],
      guitar1Tuning: SY_PROTO_LEE_AAEEAA_OPEN,
      guitar2Tuning: SY_PROTO_ACCGGSHARP_C_OPEN,
      seed: 2,
    });
    out.push({
      name: 'user 3-PC aug-cycle pair builds with custom tunings',
      ok:
        dialogue.combinedField.length === 3 &&
        sameArr(dialogue.chordBars.guitar1OpenPitches, SY_PROTO_LEE_AAEEAA_OPEN) &&
        sameArr(dialogue.chordBars.guitar2OpenPitches, SY_PROTO_ACCGGSHARP_C_OPEN),
    });
  }

  {
    const dialogue = buildSonicYouthProto1MelodicDialogue({
      polychordBars: [SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR],
      seed: 1,
    });
    const analysis = analyzeSyProtoCombinedPolychord(SY_PROTO1_C_MAJOR_FSHARP_MINOR_PAIR);
    out.push({
      name: 'existing 4+ PC user pair (C / F♯m) still builds',
      ok:
        analysis.pitchClassCount === 6 &&
        dialogue.combinedField.length === 6 &&
        sameArr(dialogue.combinedField, analysis.unionPitchClasses),
    });
  }

  {
    const planned = planSyProto1PolychordBars(1, 8);
    const counts = planned.map((p) => analyzeSyProtoCombinedPolychord(p).pitchClassCount);
    out.push({
      name: 'adaptive planner rejects 3-PC (all planned bars ≥4 pcs)',
      ok: planned.length === 8 && counts.every((n) => n >= 4 && n <= 6),
    });
  }

  {
    const dialogue = buildSonicYouthProto1MelodicDialogue({
      harmonyMode: 'adaptive',
      seed: 3,
      barCount: 8,
    });
    const counts = dialogue.pairs.map((p) => analyzeSyProtoCombinedPolychord(p).pitchClassCount);
    out.push({
      name: 'adaptive Proto1 dialogue keeps ≥4 PC combined fields',
      ok:
        dialogue.harmonyMode === 'adaptive' &&
        dialogue.pairs.length === 8 &&
        counts.every((n) => n >= 4) &&
        dialogue.combinedField.length >= 4,
    });
  }

  {
    const msg = catchMsg(() => {
      buildSonicYouthProto1MelodicDialogue({
        polychordBars: [THREE_PC_IDENTICAL, THREE_PC_AUG_CYCLE],
        seed: 4,
      });
    });
    out.push({
      name: 'multi-bar user 3-PC pairs do not throw adaptive 4-PC rejection',
      ok: msg === null,
    });
  }

  return out;
}

if (require.main === module) {
  const results = runSonicYouthProto1User3PcFieldTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  const pass = results.filter((r) => r.ok).length;
  console.log(`${pass}/${results.length} PASS`);
  if (!results.every((r) => r.ok)) process.exit(1);
}
