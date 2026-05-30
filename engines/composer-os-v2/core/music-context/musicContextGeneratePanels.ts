/**
 * V105p8 — Derive VaultMicroscope + FretboardPanel views from MusicContext (no backend).
 */

import { buildBeatContextLegalityMap } from '../harmony/beatContextLegalityMap';
import { LayerStateMachine, type TensionState } from '../harmony/layerStateMachine';
import type { NoteTonalRole } from '../harmony/noteTag';
import { inspectChordSymbol } from '../irealpro/chordSymbolMapper';
import { normalizeChordSymbol, noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import type { ScoreNote } from '../guitar/vaultRiffGenerator';
import type { MusicContext } from './musicContextTypes';

const STANDARD_OPEN_MIDIS = [40, 45, 50, 55, 59, 64] as const;

export type GeneratePanelFretboardNote = {
  stringIndex: number;
  fret: number;
  role:
    | 'triadRoot'
    | 'triadThird'
    | 'triadFifth'
    | 'primaryTension'
    | 'secondaryTension'
    | 'triadPairTension'
    | 'bebopPassing'
    | 'chaos';
  beatLegality?: 'strong' | 'weak' | 'syncopated' | 'approachOnly';
};

export const VAULT_MICROSCOPE_SOURCE_ENGINE_IDS = new Set(['vault', 'wyble_tritonic']);

export const GUITAR_FRETBOARD_SOURCE_ENGINE_IDS = new Set(['wyble', 'riff', 'duo', 'wyble_tritonic']);

export type VaultBarHarmonicDetail = {
  barIndex: number;
  symbol: string;
  vaultChordTypeId: string | null;
  rootPc: number | null;
  tensionState: TensionState;
  layers: readonly number[];
};

export type VaultHarmonicDetail = {
  tuningLabel: string | null;
  tuningOffsetSummary: string | null;
  barDetails: readonly VaultBarHarmonicDetail[];
  reharmDecisions: readonly {
    originalSymbol: string;
    alternatives: readonly { symbol: string; rationale: string }[];
  }[];
  receiptsSummary: readonly { engine: string; kind: string }[];
};

export type FretboardViewFromMusicContext = {
  notes: GeneratePanelFretboardNote[];
  tritonicFloatCount: number;
  guideToneCount: number;
  tuning?: string[];
  frets?: { from: number; to: number };
};

function sourceEngineId(ctx: MusicContext): string {
  return String(ctx.provenance?.sourceEngineId ?? '').trim();
}

export function shouldShowVaultMicroscope(ctx: MusicContext): boolean {
  return VAULT_MICROSCOPE_SOURCE_ENGINE_IDS.has(sourceEngineId(ctx));
}

export function shouldShowFretboardPanel(ctx: MusicContext): boolean {
  return GUITAR_FRETBOARD_SOURCE_ENGINE_IDS.has(sourceEngineId(ctx));
}

function tonalRoleToFretboardRole(role: NoteTonalRole): GeneratePanelFretboardNote['role'] {
  return role;
}

function tuningLabel(ctx: MusicContext): string | null {
  if (!ctx.tuning) return null;
  const capo = ctx.tuning.capo ? ` · capo ${ctx.tuning.capo}` : '';
  return `${ctx.tuning.name}${capo}`;
}

function reharmDecisionsFromReceipts(ctx: MusicContext): VaultHarmonicDetail['reharmDecisions'] {
  const receipt = ctx.receipts.find((r) => r.kind === 'composition_depth_complete');
  const payload = receipt?.payload as { reharmonisationSuggestions?: unknown } | undefined;
  const rows = payload?.reharmonisationSuggestions;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const originalSymbol = String((row as { originalSymbol?: string }).originalSymbol ?? '');
      const alternatives = (row as { alternatives?: unknown }).alternatives;
      if (!originalSymbol || !Array.isArray(alternatives)) return null;
      return {
        originalSymbol,
        alternatives: alternatives
          .filter((a): a is { symbol: string; rationale: string } => {
            return (
              !!a &&
              typeof a === 'object' &&
              typeof (a as { symbol?: string }).symbol === 'string' &&
              typeof (a as { rationale?: string }).rationale === 'string'
            );
          })
          .slice(0, 2),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}

export function buildVaultHarmonicDetailFromMusicContext(ctx: MusicContext): VaultHarmonicDetail {
  const lsm = new LayerStateMachine();
  const barDetails: VaultBarHarmonicDetail[] = [];
  for (let i = 0; i < ctx.harmony.bars.length; i++) {
    const symbol = normalizeChordSymbol(String(ctx.harmony.bars[i] ?? ''));
    lsm.advance(i % 2 === 0 ? 'strong' : 'weak');
    const inspected = symbol ? inspectChordSymbol(symbol, ctx.tuning?.name ?? 'standard') : null;
    const vaultChordTypeId = inspected?.vaultChordTypeId ?? null;
    const rootPc = inspected?.rootPc ?? null;
    const layers: number[] = [];
    if (vaultChordTypeId && rootPc != null) {
      const legality = buildBeatContextLegalityMap(vaultChordTypeId, rootPc);
      for (const tag of legality.values()) {
        if (!layers.includes(tag.layer)) layers.push(tag.layer);
      }
      layers.sort();
    }
    barDetails.push({
      barIndex: i,
      symbol,
      vaultChordTypeId,
      rootPc,
      tensionState: lsm.currentState,
      layers,
    });
  }

  const tuningOffsetSummary =
    ctx.tuning?.strings?.length === 6
      ? ctx.tuning.strings.map((s, i) => `S${6 - i}:${s}`).join(' · ')
      : null;

  return {
    tuningLabel: tuningLabel(ctx),
    tuningOffsetSummary,
    barDetails,
    reharmDecisions: reharmDecisionsFromReceipts(ctx),
    receiptsSummary: ctx.receipts.map((r) => ({ engine: r.engine, kind: r.kind })),
  };
}

/** Synthesise vault-style score notes from harmony bars (for VaultMicroscope scrubber). */
export function synthesizeScoreNotesFromMusicContext(ctx: MusicContext): ScoreNote[] {
  const out: ScoreNote[] = [];
  for (let i = 0; i < ctx.harmony.bars.length; i++) {
    const symbol = normalizeChordSymbol(String(ctx.harmony.bars[i] ?? ''));
    if (!symbol) continue;
    const inspected = inspectChordSymbol(symbol, ctx.tuning?.name ?? 'standard');
    if (!inspected?.guitarGrips.length) continue;
    const grip = inspected.guitarGrips[0]!;
    for (let g = 0; g < grip.strings.length; g++) {
      const stringIndex = grip.strings[g]!;
      const fret = grip.frets[g]!;
      const open = STANDARD_OPEN_MIDIS[stringIndex] ?? 40;
      out.push({
        pitch: open + fret,
        startBeat: 0,
        duration: 4,
        guitarString: stringIndex,
        guitarFret: fret,
        barIndex: i + 1,
      });
    }
  }
  return out;
}

export function buildVaultMicroscopePropsFromMusicContext(ctx: MusicContext): {
  scoreNotes: ScoreNote[];
  totalBars: number;
  chordTypeId: string;
  rootPc: number;
} | null {
  if (!shouldShowVaultMicroscope(ctx)) return null;
  const scoreNotes = synthesizeScoreNotesFromMusicContext(ctx);
  for (const bar of ctx.harmony.bars) {
    const symbol = normalizeChordSymbol(String(bar ?? ''));
    const inspected = inspectChordSymbol(symbol, ctx.tuning?.name ?? 'standard');
    if (inspected) {
      return {
        scoreNotes,
        totalBars: Math.max(ctx.totalBars, ctx.harmony.bars.length),
        chordTypeId: inspected.vaultChordTypeId,
        rootPc: inspected.rootPc,
      };
    }
  }
  return null;
}

export function buildFretboardViewFromMusicContext(ctx: MusicContext): FretboardViewFromMusicContext | null {
  if (!shouldShowFretboardPanel(ctx)) return null;
  const notes: GeneratePanelFretboardNote[] = [];
  let tritonicFloatCount = 0;
  let guideToneCount = 0;
  const hasTritonicReceipt = ctx.receipts.some(
    (r) =>
      r.kind === 'tritonic_vault_realisation_complete' ||
      r.kind === 'wyble_tritonic_realisation_complete',
  );

  for (let i = 0; i < ctx.harmony.bars.length; i++) {
    const symbol = normalizeChordSymbol(String(ctx.harmony.bars[i] ?? ''));
    if (!symbol) continue;
    const inspected = inspectChordSymbol(symbol, ctx.tuning?.name ?? 'standard');
    if (!inspected) continue;
    const legality = buildBeatContextLegalityMap(inspected.vaultChordTypeId, inspected.rootPc);
    const grip = inspected.guitarGrips[0];
    if (grip) {
      for (let g = 0; g < grip.strings.length; g++) {
        const pc = ((grip.pitchClasses[g] ?? 0) % 12 + 12) % 12;
        const tag = legality.get(pc);
        const role = tonalRoleToFretboardRole(tag?.tonalRole ?? 'triadRoot');
        if (role === 'triadThird' || role === 'primaryTension') guideToneCount += 1;
        notes.push({
          stringIndex: grip.strings[g]!,
          fret: grip.frets[g]!,
          role,
          beatLegality: tag?.beatLegality ?? 'strong',
        });
      }
    }
    if (hasTritonicReceipt) {
      for (const pc of inspected.quadratonicPitchClasses) {
        const gripPcs = new Set(grip?.pitchClasses.map((p) => ((p % 12) + 12) % 12) ?? []);
        if (gripPcs.has(((pc % 12) + 12) % 12)) continue;
        const floatPc = ((pc % 12) + 12) % 12;
        let placed = false;
        for (let str = 4; str >= 2 && !placed; str--) {
          const open = STANDARD_OPEN_MIDIS[str] ?? 55;
          for (let fret = 0; fret <= 12; fret++) {
            if (((open + fret) % 12 + 12) % 12 === floatPc) {
              notes.push({
                stringIndex: str,
                fret,
                role: 'chaos',
                beatLegality: 'syncopated',
              });
              tritonicFloatCount += 1;
              placed = true;
              break;
            }
          }
        }
      }
    }
  }

  return {
    notes,
    tritonicFloatCount,
    guideToneCount,
    ...(ctx.tuning?.strings?.length
      ? { tuning: ctx.tuning.strings.map(String) }
      : {}),
    frets: { from: 0, to: 12 },
  };
}

export function resolveVaultMicroscopeSeedChord(ctx: MusicContext): {
  chordTypeId: string;
  rootPc: number;
} | null {
  for (const bar of ctx.harmony.bars) {
    const inspected = inspectChordSymbol(
      normalizeChordSymbol(String(bar ?? '')),
      ctx.tuning?.name ?? 'standard',
    );
    if (inspected) {
      return { chordTypeId: inspected.vaultChordTypeId, rootPc: inspected.rootPc };
    }
  }
  const root = noteNameToPitchClass(ctx.key.root) ?? 0;
  return { chordTypeId: 'Maj7', rootPc: root };
}
