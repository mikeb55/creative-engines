/**
 * Read-only chord export diagnostics for generation receipts (no parsing/export behaviour changes).
 * Describes normalized symbols, MusicXML kind/degrees, fallback and Sibelius-approximation hints.
 */

import type { CanonicalChord } from './canonicalChord';
import { chordDiagnosticForInput } from './leadSheetChordNormalize';
import { buildChordSemantics } from './chordSemantics';
import { musicXmlKindContentFromKindText, parseChordForMusicXmlHarmony } from './chordSymbolMusicXmlCore';

export const CHORD_EXPORT_TARGET_PRIMARY_NOTE =
  'GP8 is primary detailed chord-validation target';
export const CHORD_EXPORT_TARGET_SIBELIUS_NOTE =
  'Sibelius is accepted as simplification-prone fallback';

export interface ChordExportDiagnosticEntry {
  barIndex: number;
  originalInput: string;
  normalizedSymbol: string;
  slashBass?: string;
  parsedQuality: string;
  extensions: string[];
  alterations: string[];
  /** MusicXML &lt;kind&gt; body (enumeration text). */
  exportKind: string;
  /** Human-readable summary of semantic degrees (extensions + altered degrees). */
  exportDegrees: string;
  usedFallback: boolean;
  /** Heuristic: Sibelius often simplifies this vocabulary on import. */
  exportApproximation: boolean;
  /** Per-chord importer / fallback note. */
  targetWarning: string;
  /** Present when chordWithFallback rewrote the symbol. */
  warning?: string;
}

export interface ChordExportDiagnosticsReceipt {
  perChord: ChordExportDiagnosticEntry[];
  summary: {
    totalChordsParsed: number;
    totalFallbacksUsed: number;
    totalApproximations: number;
    slashChordsPreserved: number;
  };
  exportTargetNotes: {
    primaryValidationTarget: string;
    sibeliusFallback: string;
  };
  /** Receipt-level note for importers. */
  aggregateTargetWarning: string;
}

function degreeSummaryFromSemantics(canonicalText: string): string {
  const sem = buildChordSemantics(canonicalText);
  const parts: string[] = [];
  for (const x of sem.extensions) parts.push(`ext${x}`);
  for (const a of sem.alterations) {
    parts.push(`${a.degree}${a.alter === 1 ? '#' : 'b'}`);
  }
  if (sem.additions.length) parts.push(`add${sem.additions.join('+')}`);
  return parts.length ? parts.join(' ') : '—';
}

/** Heuristic: display in Sibelius may not match full jazz spelling. */
function exportApproximationLikely(kindText: string): boolean {
  const s = kindText;
  if (/maj7.*#11|#11/i.test(s) && /maj/i.test(s)) return true;
  if (/\balt\b|7alt/i.test(s)) return true;
  if (/13sus|13sus4/i.test(s)) return true;
  if (/\([^)]*[#b]/.test(s)) return true;
  if (/\(#11\)|\(b9\)|\(#9\)/i.test(s)) return true;
  return false;
}

function perChordTargetWarning(
  fallback: boolean,
  approx: boolean,
  kindText: string,
  fallbackWarning?: string
): string {
  if (fallback && fallbackWarning) return fallbackWarning;
  if (fallback) return 'Chord normalized/fallback applied — compare normalizedSymbol to originalInput.';
  if (!approx) return 'No fallback applied';
  if (/\balt\b|7alt/i.test(kindText)) {
    return 'alt exported semantically; display may vary by importer';
  }
  if (/#11/i.test(kindText) && /maj/i.test(kindText)) {
    return 'Sibelius may simplify maj7#11 to maj7';
  }
  if (/13sus/i.test(kindText)) {
    return '13sus may display as 13(sus4) in Sibelius';
  }
  return 'Complex chord: Sibelius may simplify display — GP8 recommended for full fidelity';
}

/**
 * Build a full chord export diagnostics receipt from parallel bar strings and canonical chords
 * (same length), without mutating engine state.
 */
export function buildChordExportDiagnosticsReceipt(
  barStrings: string[],
  canonicalChords: CanonicalChord[]
): ChordExportDiagnosticsReceipt {
  if (barStrings.length !== canonicalChords.length) {
    throw new Error(
      `chordExportDiagnostics: barStrings (${barStrings.length}) !== canonicalChords (${canonicalChords.length})`
    );
  }

  const perChord: ChordExportDiagnosticEntry[] = [];
  let totalFallbacksUsed = 0;
  let totalApproximations = 0;
  let slashChordsPreserved = 0;

  for (let i = 0; i < barStrings.length; i++) {
    const originalInput = String(barStrings[i] ?? '').trim();
    const cc = canonicalChords[i]!;
    const diag = chordDiagnosticForInput(originalInput);
    const usedFallback = diag.fallbackApplied === true;
    if (usedFallback) totalFallbacksUsed++;

    const parts = parseChordForMusicXmlHarmony(cc.text, { literalKind: true });
    const kindText = parts.kindText ?? '';
    const exportKind = musicXmlKindContentFromKindText(kindText);
    /** Stacked extensions + altered degrees (same semantic layer as export); compact for receipts. */
    const exportDegrees = degreeSummaryFromSemantics(cc.text);

    const struct = diag.parsed;
    const slashBass = struct?.bass ?? (cc.bass ?? undefined) ?? undefined;
    if (slashBass) slashChordsPreserved++;

    const approx = exportApproximationLikely(kindText);
    if (approx) totalApproximations++;

    const targetWarning = perChordTargetWarning(usedFallback, approx, kindText, diag.warning);

    perChord.push({
      barIndex: i + 1,
      originalInput,
      normalizedSymbol: cc.text,
      slashBass: slashBass ?? undefined,
      parsedQuality: cc.quality,
      extensions: [...cc.extensions],
      alterations: [...cc.alterations],
      exportKind,
      exportDegrees,
      usedFallback,
      exportApproximation: approx,
      targetWarning,
      warning: diag.warning,
    });
  }

  const aggregateTargetWarning =
    totalFallbacksUsed > 0
      ? `${totalFallbacksUsed} bar(s) used chord fallback — see perChord[].warning`
      : totalApproximations > 0
        ? `${totalApproximations} bar(s) flagged for possible Sibelius simplification — ${CHORD_EXPORT_TARGET_PRIMARY_NOTE}; ${CHORD_EXPORT_TARGET_SIBELIUS_NOTE}`
        : `No chord fallback applied. ${CHORD_EXPORT_TARGET_PRIMARY_NOTE}.`;

  return {
    perChord,
    summary: {
      totalChordsParsed: barStrings.length,
      totalFallbacksUsed,
      totalApproximations,
      slashChordsPreserved,
    },
    exportTargetNotes: {
      primaryValidationTarget: CHORD_EXPORT_TARGET_PRIMARY_NOTE,
      sibeliusFallback: CHORD_EXPORT_TARGET_SIBELIUS_NOTE,
    },
    aggregateTargetWarning,
  };
}
