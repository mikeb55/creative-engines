/**
 * Composer OS V2 — Golden path tests
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

function testGoldenPathReturnsValidScore(): boolean {
  const r = runGoldenPath(1);
  return r.success && r.score !== undefined && r.score.parts.length >= 2;
}

function testExactlyEightBars(): boolean {
  const r = runGoldenPath(2);
  const guitarMeasures = r.score.parts.find((p) => p.id === 'guitar')?.measures.length ?? 0;
  const bassMeasures = r.score.parts.find((p) => p.id === 'bass')?.measures.length ?? 0;
  return guitarMeasures === 8 && bassMeasures === 8;
}

function testChordSymbolsInAllBars(): boolean {
  const r = runGoldenPath(3);
  for (const part of r.score.parts) {
    for (const m of part.measures) {
      if (!m.chord) return false;
    }
  }
  return true;
}

function testRehearsalMarksAtBars1And5(): boolean {
  const r = runGoldenPath(4);
  const marks: Array<{ bar: number; label: string }> = [];
  for (const part of r.score.parts) {
    for (const m of part.measures) {
      if (m.rehearsalMark) marks.push({ bar: m.index, label: m.rehearsalMark });
    }
  }
  const hasA = marks.some((x) => x.label === 'A' && x.bar === 1);
  const hasB = marks.some((x) => x.label === 'B' && x.bar === 5);
  return hasA && hasB;
}

function testBothPartsExist(): boolean {
  const r = runGoldenPath(5);
  const guitar = r.score.parts.find((p) => p.id === 'guitar');
  const bass = r.score.parts.find((p) => p.id === 'bass');
  return !!guitar && !!bass;
}

function testGuitarAndBassIdentities(): boolean {
  const r = runGoldenPath(6);
  const guitar = r.score.parts.find((p) => p.id === 'guitar');
  const bass = r.score.parts.find((p) => p.id === 'bass');
  return (
    guitar?.instrumentIdentity === 'clean_electric_guitar' &&
    bass?.instrumentIdentity === 'acoustic_upright_bass'
  );
}

function testScoreIntegrityGatePasses(): boolean {
  const r = runGoldenPath(7);
  return r.integrityPassed;
}

function testMusicXmlExportSucceeds(): boolean {
  const r = runGoldenPath(8);
  return r.xml !== undefined && r.xml.length > 100 && r.xml.includes('score-partwise');
}

function testMxValidationPasses(): boolean {
  const r = runGoldenPath(9);
  return r.mxValidationPassed;
}

function testRunManifestCreated(): boolean {
  const r = runGoldenPath(10);
  return (
    r.runManifest !== undefined &&
    r.runManifest.presetId === 'guitar_bass_duo' &&
    r.runManifest.seed === 10
  );
}

export function runGoldenPathTests(): { name: string; ok: boolean }[] {
  return [
    ['Golden path returns valid score', testGoldenPathReturnsValidScore],
    ['Exactly 8 bars', testExactlyEightBars],
    ['Chord symbols in all bars', testChordSymbolsInAllBars],
    ['Rehearsal marks at bars 1 and 5', testRehearsalMarksAtBars1And5],
    ['Both parts exist', testBothPartsExist],
    ['Guitar and bass identities correct', testGuitarAndBassIdentities],
    ['Score integrity gate passes', testScoreIntegrityGatePasses],
    ['MusicXML export succeeds', testMusicXmlExportSucceeds],
    ['MX validation passes', testMxValidationPasses],
    ['Run manifest created', testRunManifestCreated],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
