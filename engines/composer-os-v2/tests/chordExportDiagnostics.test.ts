/**
 * #17 Chord export diagnostics — transparency only (no parsing/export changes).
 */

import { parseLeadSheetChordToCanonical } from '../../core/canonicalChord';
import { buildChordExportDiagnosticsReceipt } from '../../core/chordExportDiagnostics';
import { chordWithFallback } from '../../core/leadSheetChordNormalize';
import { parseBarStringsToCanonicalChords } from '../core/harmony/chordPipeline';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function runChordExportDiagnosticsTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'no fallback path: Cmaj7 clean summary',
    ok: (() => {
      const bars = ['Cmaj7'];
      const r = buildChordExportDiagnosticsReceipt(bars, parseBarStringsToCanonicalChords(bars));
      assert(r.summary.totalChordsParsed === 1, 'count');
      assert(r.summary.totalFallbacksUsed === 0, 'fb');
      assert(r.perChord[0].exportApproximation === false, 'apx');
      assert(r.perChord[0].targetWarning.includes('No fallback'), 'tw');
      return true;
    })(),
  });

  tests.push({
    name: 'exportApproximation: maj7#11 and alt flagged',
    ok: (() => {
      const bars = ['Cmaj7#11', 'A7alt'];
      const r = buildChordExportDiagnosticsReceipt(bars, parseBarStringsToCanonicalChords(bars));
      assert(r.perChord[0].exportApproximation === true, 'maj7#11');
      assert(r.perChord[1].exportApproximation === true, 'alt');
      assert(r.summary.totalApproximations === 2, 'sum apx');
      return true;
    })(),
  });

  tests.push({
    name: 'slash chord: Dm9/A preserved in summary',
    ok: (() => {
      const bars = ['Dm9/A'];
      const r = buildChordExportDiagnosticsReceipt(bars, parseBarStringsToCanonicalChords(bars));
      assert(r.summary.slashChordsPreserved === 1, 'slash count');
      assert(r.perChord[0].slashBass === 'A', 'bass');
      return true;
    })(),
  });

  tests.push({
    name: 'fallback path: unrecognized token uses chordWithFallback + receipt',
    ok: (() => {
      const raw = 'Cbadtokenxyz';
      const fb = chordWithFallback(raw);
      assert(fb.usedFallback === true, 'fallback expected');
      const cc = parseLeadSheetChordToCanonical(fb.chord);
      const r = buildChordExportDiagnosticsReceipt([raw], [cc]);
      assert(r.summary.totalFallbacksUsed >= 1, 'receipt fallback count');
      assert(r.perChord[0].usedFallback === true, 'per row');
      return true;
    })(),
  });

  tests.push({
    name: 'export target notes present',
    ok: (() => {
      const bars = ['G7'];
      const r = buildChordExportDiagnosticsReceipt(bars, parseBarStringsToCanonicalChords(bars));
      assert(r.exportTargetNotes.primaryValidationTarget.includes('GP8'), 'gp8');
      assert(r.exportTargetNotes.sibeliusFallback.includes('Sibelius'), 'sib');
      return true;
    })(),
  });

  return tests;
}
