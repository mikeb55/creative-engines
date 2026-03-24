/**
 * Composer OS V2 — First Intelligence retro tests
 */

import { runGoldenPath } from '../../core/goldenPath/runGoldenPath';

function testMotifsGenerated(): boolean {
  const r = runGoldenPath(20);
  return (r.plans?.motifState?.baseMotifs?.length ?? 0) >= 1;
}

function testMotifsRecurAcrossForm(): boolean {
  const r = runGoldenPath(21);
  const placements = r.plans?.motifState?.placements ?? [];
  const aBars = placements.filter((p) => p.startBar <= 4).length;
  const bBars = placements.filter((p) => p.startBar >= 5).length;
  return aBars >= 1 && bBars >= 1;
}

function testMotifVariationOccurs(): boolean {
  const r = runGoldenPath(22);
  const placements = r.plans?.motifState?.placements ?? [];
  const variants = new Set(placements.map((p) => p.variant));
  return placements.length >= 2 && (variants.size >= 2 || placements.some((p) => p.notes.length > 0));
}

function testBarryHarrisDetectableEffect(): boolean {
  const r = runGoldenPath(23);
  const stack = r.plans?.styleStack;
  if (!stack || stack.primary !== 'barry_harris') return false;
  const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return false;
  return guitar.measures.some((m) => m.events.length > 0);
}

function testVoiceLeadingConstraintsActive(): boolean {
  const r = runGoldenPath(24);
  return r.behaviourGatesPassed;
}

function testMotifRecurrencePresent(): boolean {
  const r = runGoldenPath(25);
  const placements = r.plans?.motifState?.placements ?? [];
  return placements.length >= 2;
}

export function runFirstIntelligenceRetroTests(): { name: string; ok: boolean }[] {
  return [
    ['Motifs generated', testMotifsGenerated],
    ['Motifs recur across form', testMotifsRecurAcrossForm],
    ['Motif variation occurs', testMotifVariationOccurs],
    ['Barry Harris detectable effect', testBarryHarrisDetectableEffect],
    ['Voice-leading constraints active', testVoiceLeadingConstraintsActive],
    ['Motif recurrence present', testMotifRecurrencePresent],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
