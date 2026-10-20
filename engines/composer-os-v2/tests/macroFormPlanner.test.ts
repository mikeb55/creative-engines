/**
 * Macro form planner — AABA goals + songwriter biases + section-boundary motif posture.
 */

import {
  macroGoalsForBar,
  planFortyEightBarForm,
  planFortyEightBarMotifDevelopment,
  planMacroForm,
} from '../core/form/macroFormPlanner';
import { resolveFormSections } from '../core/form/formPlanner';
import { validateSectionPartition } from '../core/section-architecture/sectionArchitectureDomain';

function aaba32Form() {
  const sections = resolveFormSections('aaba');
  return {
    sections: sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: 32,
  };
}

/** Bar boundaries, A′ transformed return of A, B development/fragmentation, determinism. */
export function runFortyEightBarFormPlanTest(): { ok: boolean; name: string } {
  const first = planFortyEightBarForm(null);
  const second = planFortyEightBarForm(undefined);
  const bounds = first.sections.map((s) => [s.label, s.startBar, s.endBar, s.length]);
  const aPrime = first.thematic.find((t) => t.sectionId === 'a_prime');
  const development = first.thematic.find((t) => t.sectionId === 'b');
  const statement = first.sections.find((s) => s.label === 'A');
  const macroReturn = first.macro.sections.find((s) => s.label === "A'");
  const macroDevelopment = first.macro.sections.find((s) => s.label === 'B');
  const partition = validateSectionPartition(first.sections, first.totalBars);
  const ok =
    partition.ok === true &&
    first.id === 'form_48_intro_a_b_a_prime_coda' &&
    first.totalBars === 48 &&
    first.macro.totalBars === 48 &&
    first.macro.songwriterBias === 'neutral' &&
    JSON.stringify(bounds) ===
      JSON.stringify([
        ['Intro', 1, 4, 4],
        ['A', 5, 16, 12],
        ['B', 17, 31, 15],
        ["A'", 32, 42, 11],
        ['Coda', 43, 48, 6],
      ]) &&
    aPrime?.role === 'transformed_return' &&
    aPrime.transformedReturnOfSectionId === 'a' &&
    statement?.sectionId === 'a' &&
    macroReturn?.motifTreatment === 'return' &&
    development?.role === 'development_fragmentation' &&
    macroDevelopment?.motifTreatment === 'development' &&
    JSON.stringify(first) === JSON.stringify(second);
  return {
    ok,
    name: 'macroForm: 48-bar opt-in plan — boundaries, A′ transformed return of A, B development/fragmentation, deterministic',
  };
}

/** Fixed source — proves A retention without relying on seeded generator alone. */
function motifDevFixtureSource() {
  return {
    id: 'fixture_source',
    intervalPattern: [2, -1, 5, -2],
    rhythmPattern: [
      { startBeat: 0, duration: 0.5 },
      { startBeat: 0.5, duration: 0.5 },
      { startBeat: 1.5, duration: 1 },
      { startBeat: 2.5, duration: 0.5 },
      { startBeat: 3, duration: 1 },
    ],
    contourPattern: [1, -1, 1, -1],
    roleTags: [] as [],
    registerTags: ['mid' as const],
  };
}

function sameRhythm(
  a: { startBeat: number; duration: number }[],
  b: { startBeat: number; duration: number }[]
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A′ keeps contour signs + shared onset count with A (recognisable return). */
function aPrimePreservesIdentity(
  a: ReturnType<typeof motifDevFixtureSource>,
  aPrime: { intervalPattern: number[]; rhythmPattern: { startBeat: number; duration: number }[]; contourPattern: number[] }
): boolean {
  if (aPrime.intervalPattern.length !== a.intervalPattern.length) return false;
  if (aPrime.rhythmPattern.length !== a.rhythmPattern.length) return false;
  if (aPrime.contourPattern.length !== a.contourPattern.length) return false;
  const contourOk = a.contourPattern.every(
    (dir, i) => dir === 0 || aPrime.contourPattern[i] === 0 || Math.sign(aPrime.contourPattern[i]!) === Math.sign(dir)
  );
  const onsetOk = a.rhythmPattern.every(
    (r, i) => Math.abs(r.startBeat - aPrime.rhythmPattern[i]!.startBeat) < 1e-6
  );
  return contourOk && onsetOk;
}

/** A original, B genuine transform, A′ recognisable return; locks + determinism. */
export function runFortyEightBarMotifDevelopmentTest(): { ok: boolean; name: string } {
  const seed = 48001;
  const source = motifDevFixtureSource();
  const first = planFortyEightBarMotifDevelopment(seed, source);
  const second = planFortyEightBarMotifDevelopment(seed, source);
  const aKeepsSource =
    JSON.stringify(first.a.intervalPattern) === JSON.stringify(source.intervalPattern) &&
    sameRhythm(first.a.rhythmPattern, source.rhythmPattern) &&
    JSON.stringify(first.a.contourPattern) === JSON.stringify(source.contourPattern);
  const bNotExactCopy =
    JSON.stringify(first.b.intervalPattern) !== JSON.stringify(first.a.intervalPattern) ||
    !sameRhythm(first.b.rhythmPattern, first.a.rhythmPattern);
  const bChangedMusically =
    JSON.stringify({
      i: first.b.intervalPattern,
      r: first.b.rhythmPattern,
    }) !==
    JSON.stringify({
      i: first.a.intervalPattern,
      r: first.a.rhythmPattern,
    });
  const ok =
    first.id === 'motif_dev_48_a_b_a_prime' &&
    first.a.id === 'motif_48_a' &&
    first.b.id === 'motif_48_b' &&
    first.aPrime.id === 'motif_48_a_prime' &&
    aKeepsSource &&
    first.similarityToA.a === 1 &&
    bNotExactCopy &&
    bChangedMusically &&
    first.similarityToA.b < first.similarityToA.a &&
    first.similarityToA.aPrime > first.similarityToA.b &&
    first.similarityToA.aPrime >= 0.4 &&
    aPrimePreservesIdentity(first.a, first.aPrime) &&
    first.locks.preserveBhlHarmony === true &&
    first.locks.preserveSourceNoteLocks === true &&
    JSON.stringify(first) === JSON.stringify(second);
  return {
    ok,
    name: 'macroForm: 48-bar motif development — A original, B fragmentation, A′ return, locks, deterministic',
  };
}

export function runMacroFormPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const form = aaba32Form();

  const glass = planMacroForm(form, 'philip_glass', undefined);
  out.push({
    ok:
      glass.songwriterBias === 'glass_flat' &&
      glass.sections[0]!.motifTreatment === 'statement' &&
      glass.sections[0]!.harmonyPacing === 'static' &&
      glass.sections.find((s) => s.label === 'B')?.motifTreatment === 'development',
    name: 'macroForm: Philip Glass — flat bias + AABA section roles',
  });

  const herrmann = planMacroForm(form, 'bernard_herrmann', undefined);
  out.push({
    ok:
      herrmann.songwriterBias === 'herrmann_contrast' &&
      herrmann.sections.find((s) => s.label === 'B')?.harmonyPacing === 'dense',
    name: 'macroForm: Bernard Herrmann — contrast bias + B section dense harmony pacing',
  });

  const evans = planMacroForm(form, 'bill_evans', undefined);
  out.push({
    ok:
      evans.songwriterBias === 'evans_moderate' &&
      evans.sections.every((s) => s.energyCurve === 'mid'),
    name: 'macroForm: Bill Evans — moderate energy on all sections',
  });

  const neutral = planMacroForm(form, undefined, undefined);
  const g16 = macroGoalsForBar(16, neutral);
  const g17 = macroGoalsForBar(17, neutral);
  out.push({
    ok:
      g16 !== undefined &&
      g17 !== undefined &&
      g16.motifTreatment === 'return' &&
      g17.motifTreatment === 'development',
    name: 'macroForm: motifTreatment flips across B boundary (bar 16 A′ → bar 17 B)',
  });

  out.push(runFortyEightBarFormPlanTest());

  return out;
}
