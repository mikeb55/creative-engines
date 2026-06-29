/**
 * Duo Stage 1 — pure Tonality Vault symbol resolution (no duo pipeline wiring).
 * Maps lead-sheet symbols to vault quadratonic / shell pcs or safe chordTonesFromSymbol fallback.
 */

import { parseChordSymbol, chordTonesFromSymbol } from './chordSymbolAnalysis';
import { selectQuadratonicMelodySpec, vaultDegreeToPitchClass } from './quadratonicMelodySelector';
import { TONALITY_VAULT_DATABASE } from './tonalityVaultDatabase';
import { mapChordToVaultType, parseRootNoteToPc } from '../irealpro/chordSymbolMapper';
import type { ParsedChord } from '../irealpro/parsedChart';

export type DuoHarmonySource = 'vault' | 'fallback';

export type DuoHarmonyResolution = {
  inputSymbol: string;
  harmonyPart: string;
  slashBassPc?: number;
  rootPc: number;
  vaultChordTypeId?: string;
  source: DuoHarmonySource;
  melodyPcs: number[];
  identityPcs: number[];
  shellPcs: number[];
};

const ROW_BY_TYPE = new Map(TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r]));

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function absPc(rootPc: number, relPc: number): number {
  return normalizePc(rootPc + relPc);
}

function uniqSortedPcs(pcs: number[]): number[] {
  return [...new Set(pcs.map(normalizePc))].sort((a, b) => a - b);
}

/** Split harmony-only token into vault {@link ParsedChord} fields (no slash). */
function parsedChordFromHarmonyPart(harmonyPart: string): ParsedChord | null {
  const s = harmonyPart.trim();
  if (!s) return null;
  const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(s);
  if (!m) return null;
  const rootNote = (m[1]! + (m[2] ?? '')).toLowerCase();
  const chordQuality = (m[3] ?? '').trim();
  if (parseRootNoteToPc(rootNote) === null) return null;
  return {
    symbol: s,
    rootNote,
    chordQuality,
    duration: 1,
    barIndex: 0,
    beatIndex: 0,
  };
}

function identityPcsForResolution(
  primaryTensionPc: number | undefined,
  rootPc: number,
  slashBassPc: number | undefined
): number[] {
  const out: number[] = [];
  if (primaryTensionPc !== undefined) out.push(normalizePc(primaryTensionPc));
  if (slashBassPc !== undefined && normalizePc(slashBassPc) !== normalizePc(rootPc)) {
    out.push(normalizePc(slashBassPc));
  }
  return uniqSortedPcs(out);
}

function resolveVaultPath(
  inputSymbol: string,
  harmonyPart: string,
  slashBassPc: number | undefined,
  vaultChordTypeId: string,
  rootPc: number,
  lockedHarmony: boolean
): DuoHarmonyResolution {
  const row = ROW_BY_TYPE.get(vaultChordTypeId);
  const spec = selectQuadratonicMelodySpec(vaultChordTypeId);
  if (!row || !spec) {
    return resolveFallbackPath(inputSymbol, harmonyPart, slashBassPc, rootPc, lockedHarmony);
  }

  const melodyPcs = uniqSortedPcs(
    spec.quadratonicPitchClassesFromRoot.map((rel) => absPc(rootPc, rel))
  );

  const shellPcs = uniqSortedPcs(
    row.leftHandShell
      .map((deg) => vaultDegreeToPitchClass(row, deg))
      .filter((rel): rel is number => rel !== undefined)
      .map((rel) => absPc(rootPc, rel))
  );

  const primaryTensionPc = absPc(rootPc, spec.primaryTension.pitchClassFromRoot);

  return {
    inputSymbol,
    harmonyPart,
    slashBassPc,
    rootPc,
    vaultChordTypeId,
    source: 'vault',
    melodyPcs,
    identityPcs: identityPcsForResolution(primaryTensionPc, rootPc, slashBassPc),
    shellPcs,
  };
}

function resolveFallbackPath(
  inputSymbol: string,
  harmonyPart: string,
  slashBassPc: number | undefined,
  rootPc: number,
  lockedHarmony = true
): DuoHarmonyResolution {
  const tones = chordTonesFromSymbol(harmonyPart, { lockedHarmony });
  const melodyPcs = uniqSortedPcs([tones.root, tones.third, tones.fifth, tones.seventh]);
  const shellPcs = uniqSortedPcs([tones.root, tones.third, tones.seventh]);

  const identityPcs =
    slashBassPc !== undefined && normalizePc(slashBassPc) !== normalizePc(rootPc)
      ? [normalizePc(slashBassPc)]
      : [];

  return {
    inputSymbol,
    harmonyPart,
    slashBassPc,
    rootPc,
    source: 'fallback',
    melodyPcs,
    identityPcs,
    shellPcs,
  };
}

/**
 * Map a lead-sheet symbol to Tonality Vault melody/shell/identity pitch classes,
 * or a safe {@link chordTonesFromSymbol} fallback when vault mapping misses.
 *
 * Slash symbols are split via {@link parseChordSymbol}; vault mapping uses **harmonyPart only**.
 */
export function resolveDuoHarmonyForSymbol(
  symbol: string,
  opts?: { lockedHarmony?: boolean }
): DuoHarmonyResolution {
  const inputSymbol = symbol.trim();
  const parsed = parseChordSymbol(inputSymbol);
  const harmonyPart = parsed.harmonyPart;
  const slashBassPc = parsed.slashBassPc;

  const harmonyChord = parsedChordFromHarmonyPart(harmonyPart);
  const rootPc =
    harmonyChord !== null ? (parseRootNoteToPc(harmonyChord.rootNote) ?? 0) : 0;

  const lockedHarmony = opts?.lockedHarmony ?? true;

  if (harmonyChord === null) {
    return resolveFallbackPath(inputSymbol, harmonyPart, slashBassPc, rootPc, lockedHarmony);
  }

  const mapped = mapChordToVaultType(harmonyChord);
  if (mapped === null) {
    return resolveFallbackPath(
      inputSymbol,
      harmonyPart,
      slashBassPc,
      rootPc,
      lockedHarmony
    );
  }

  return resolveVaultPath(
    inputSymbol,
    harmonyPart,
    slashBassPc,
    mapped.vaultChordTypeId,
    mapped.rootPc,
    lockedHarmony
  );
}