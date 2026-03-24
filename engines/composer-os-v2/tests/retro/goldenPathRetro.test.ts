/**
 * Composer OS V2 — Golden path retro tests
 */

import { runGoldenPath } from '../../core/goldenPath/runGoldenPath';

function testEightBarScore(): boolean {
  const r = runGoldenPath(1);
  const guitar = r.score.parts.find((p) => p.id === 'guitar');
  const bass = r.score.parts.find((p) => p.id === 'bass');
  return (guitar?.measures.length ?? 0) === 8 && (bass?.measures.length ?? 0) === 8;
}

function testSectionsABExist(): boolean {
  const r = runGoldenPath(2);
  const marks = new Map<number, string>();
  for (const p of r.score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark) marks.set(m.index, m.rehearsalMark);
    }
  }
  return marks.get(1) === 'A' && marks.get(5) === 'B';
}

function testRehearsalMarksBars1And5(): boolean {
  const r = runGoldenPath(3);
  const bars: number[] = [];
  for (const p of r.score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark) bars.push(m.index);
    }
  }
  const unique = [...new Set(bars)];
  return unique.includes(1) && unique.includes(5);
}

function testChordSymbolsAllBars(): boolean {
  const r = runGoldenPath(4);
  for (const p of r.score.parts) {
    for (const m of p.measures) {
      if (!m.chord || m.chord.trim() === '') return false;
    }
  }
  return true;
}

function testExportSucceeds(): boolean {
  const r = runGoldenPath(5);
  return r.xml !== undefined && r.xml.length > 100;
}

function testMxValidationSucceeds(): boolean {
  const r = runGoldenPath(6);
  return r.mxValidationPassed;
}

function testRunManifestCreated(): boolean {
  const r = runGoldenPath(7);
  return r.runManifest !== undefined && typeof r.runManifest.timestamp === 'string';
}

function testBarCountStable(): boolean {
  const r = runGoldenPath(8);
  return r.score.parts.every((p) => p.measures.length === 8);
}

function testPerformancePassApplied(): boolean {
  const r = runGoldenPath(19);
  return !!r.xml && (r.xml.includes('<staccato') || r.xml.includes('<tenuto'));
}

function testInteractionPresent(): boolean {
  const r = runGoldenPath(9);
  return !!r.plans?.interactionPlan?.perSection?.length;
}

export function runGoldenPathRetroTests(): { name: string; ok: boolean }[] {
  return [
    ['8-bar score generated', testEightBarScore],
    ['Sections A and B exist', testSectionsABExist],
    ['Rehearsal marks at bars 1 and 5', testRehearsalMarksBars1And5],
    ['Chord symbols in all bars', testChordSymbolsAllBars],
    ['Export succeeds', testExportSucceeds],
    ['MX validation succeeds', testMxValidationSucceeds],
    ['Run manifest created', testRunManifestCreated],
    ['Bar count stable', testBarCountStable],
    ['Performance pass applied', testPerformancePassApplied],
    ['Interaction plan present', testInteractionPresent],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
