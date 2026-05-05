import type { ScoreNote } from '../guitar/vaultRiffGenerator';
import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import type { ParsedChart } from './parsedChart';
import type { ChorusTensionProgression } from './vaultChorusPhraseDiagnostics';

const VALID_VAULT_ID = new Set(TONALITY_VAULT_DATABASE.map((r) => r.chordType));

/** Richer colours — both ids must exist in Tonality Vault DB. */
const HIGH_EXTENSION: Record<string, string> = {
  Maj7: 'Maj9',
  Maj6: 'Maj7',
  min9: 'min11',
  'Maj7#11': 'Maj7#11#9',
};

/** Lean toward fewer extensions / simpler qualities. */
const LOW_SIMPLIFY: Record<string, string> = {
  Maj9: 'Maj7',
  min11: 'min9',
  'Maj7#11#9': 'Maj7#11',
};

const HIGH_TENSION = 0.66;
const LOW_TENSION = 0.33;
const DENSITY_DELTA = 0.2;
const MIDI_HIGH_CAP = 84;
const MIDI_LOW_FLOOR = 40;

/** Duplicated from `irealVaultPipeline` — avoid circular import. */
function effectiveMeterForBar(chart: ParsedChart, barIndex: number): { num: number; den: number } {
  let running =
    chart.timeSignature && chart.timeSignature.den > 0 ? chart.timeSignature : { num: 4, den: 4 };
  const map = chart.barMeterMap ?? {};
  for (let b = 0; b <= barIndex; b++) {
    const o = map[b];
    if (o && o.den > 0) running = o;
  }
  return running;
}

function quarterSpanForBar(chart: ParsedChart, barIndex: number): number {
  const ts = effectiveMeterForBar(chart, barIndex);
  return (ts.num * 4) / ts.den;
}

function cumulativeQuarterBeatsThroughBar(chart: ParsedChart, barIndexExclusive: number): number {
  let sum = 0;
  for (let b = 0; b < barIndexExclusive; b++) sum += quarterSpanForBar(chart, b);
  return sum;
}

function barBeatRange(chart: ParsedChart, barIndex: number): { start: number; end: number } {
  const start = cumulativeQuarterBeatsThroughBar(chart, barIndex);
  return { start, end: start + quarterSpanForBar(chart, barIndex) };
}

function applyHighTensionChorus(
  chart: ParsedChart,
  chorusNotes: ScoreNote[],
  targetAdds: number
): ScoreNote[] {
  const out = chorusNotes.map((n) => ({ ...n }));
  for (const n of out) {
    if (n.pitch > 0) n.pitch = Math.min(n.pitch + 12, MIDI_HIGH_CAP);
  }

  const playable = out.filter((n) => n.pitch > 0);
  if (targetAdds <= 0 || playable.length === 0) return out;

  type Gap = { barIndex: number; startBeat: number; duration: number; lo: number; hi: number };
  const gaps: Gap[] = [];
  const byBar = new Map<number, ScoreNote[]>();
  for (const n of out) {
    if (n.pitch <= 0) continue;
    const arr = byBar.get(n.barIndex) ?? [];
    arr.push(n);
    byBar.set(n.barIndex, arr);
  }

  for (const [barIndex, arr] of byBar) {
    arr.sort((a, b) => a.startBeat - b.startBeat);
    const { start: barStart, end: barEnd } = barBeatRange(chart, barIndex);

    if (arr.length > 0) {
      const first = arr[0]!;
      const gap = first.startBeat - barStart;
      if (gap > 0.11) {
        gaps.push({
          barIndex,
          startBeat: barStart + gap * 0.22,
          duration: Math.min(gap * 0.42, 0.34),
          lo: first.pitch,
          hi: first.pitch,
        });
      }
    }

    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i]!;
      const b = arr[i + 1]!;
      const gapStart = a.startBeat + a.duration;
      const gapEnd = b.startBeat;
      const gap = gapEnd - gapStart;
      if (gap > 0.11) {
        gaps.push({
          barIndex,
          startBeat: gapStart + gap * 0.28,
          duration: Math.min(gap * 0.48, 0.38),
          lo: a.pitch,
          hi: b.pitch,
        });
      }
    }

    if (arr.length > 0) {
      const last = arr[arr.length - 1]!;
      const gapStart = last.startBeat + last.duration;
      const gap = barEnd - gapStart;
      if (gap > 0.11) {
        gaps.push({
          barIndex,
          startBeat: gapStart + gap * 0.18,
          duration: Math.min(gap * 0.48, 0.36),
          lo: last.pitch,
          hi: last.pitch,
        });
      }
    }
  }

  gaps.sort((a, b) => b.duration - a.duration);
  const inserts: ScoreNote[] = [];
  const nInsert = Math.min(targetAdds, Math.max(0, gaps.length));
  for (let i = 0; i < nInsert; i++) {
    const g = gaps[i]!;
    let mid = Math.round((g.lo + g.hi) / 2);
    const chrom = i % 2 === 0 ? 1 : -1;
    mid = Math.min(Math.max(mid + chrom, MIDI_LOW_FLOOR), MIDI_HIGH_CAP);
    inserts.push({
      pitch: mid,
      startBeat: g.startBeat,
      duration: g.duration,
      guitarString: 0,
      guitarFret: 0,
      barIndex: g.barIndex,
    });
  }

  return [...out, ...inserts];
}

function nudgeVaultIdHigh(id: string): string {
  const next = HIGH_EXTENSION[id];
  if (next && VALID_VAULT_ID.has(next)) return next;
  return id;
}

function nudgeVaultIdLow(id: string): string {
  const next = LOW_SIMPLIFY[id];
  if (next && VALID_VAULT_ID.has(next)) return next;
  return id;
}

function applyLowTensionChorus(chart: ParsedChart, chorusNotes: ScoreNote[]): ScoreNote[] {
  void chart;
  const playable = chorusNotes.filter((n) => n.pitch > 0);
  const removeCount = Math.min(
    Math.max(0, playable.length - 1),
    Math.floor(playable.length * DENSITY_DELTA)
  );
  const sorted = [...playable].sort((a, b) => a.duration - b.duration || b.pitch - a.pitch);
  const drop = new Set(sorted.slice(0, removeCount));

  const out: ScoreNote[] = [];
  for (const n of chorusNotes) {
    if (n.pitch > 0 && drop.has(n)) continue;
    const copy = { ...n };
    if (copy.pitch > 0) copy.pitch = Math.max(copy.pitch - 12, MIDI_LOW_FLOOR);
    out.push(copy);
  }
  return out;
}

export type VaultChordMappingRow = {
  barIndex: number;
  symbol: string;
  vaultChordTypeId: string;
  rootPc: number;
};

/**
 * Post-pass on stacked vault output: per-chorus tension thresholds adjust density and register
 * (chromatic passing inserts vs thinning + lower register), plus light vault-id filters when
 * a parallel mapping exists in Tonality Vault DB. Does not replace `generateVaultRiff`.
 */
export function applyVaultTensionProgressionShaping(params: {
  notes: ScoreNote[];
  chordMappings: VaultChordMappingRow[];
  tensionProgression: ChorusTensionProgression;
  barsPerChorus: number;
  chorusCount: number;
  chart: ParsedChart;
}): { notes: ScoreNote[]; chordMappings: VaultChordMappingRow[] } {
  const { tensionProgression, barsPerChorus, chorusCount, chart } = params;
  let notes = params.notes.map((n) => ({ ...n }));
  let chordMappings = params.chordMappings.map((m) => ({ ...m }));

  for (let chorusIndex = 0; chorusIndex < chorusCount; chorusIndex++) {
    const t = tensionProgression.perChorus[chorusIndex] ?? 0.5;
    const barLo = chorusIndex * barsPerChorus;
    const barHi = barLo + barsPerChorus;

    const chorusSlice = notes.filter((n) => n.barIndex >= barLo && n.barIndex < barHi);
    const outside = notes.filter((n) => n.barIndex < barLo || n.barIndex >= barHi);

    if (t > HIGH_TENSION) {
      const playableCount = chorusSlice.filter((n) => n.pitch > 0).length;
      const targetAdds = Math.max(0, Math.round(playableCount * DENSITY_DELTA));
      const shaped = applyHighTensionChorus(chart, chorusSlice, targetAdds);
      notes = [...outside, ...shaped];
      chordMappings = chordMappings.map((row) =>
        row.barIndex >= barLo && row.barIndex < barHi
          ? { ...row, vaultChordTypeId: nudgeVaultIdHigh(row.vaultChordTypeId) }
          : row
      );
    } else if (t < LOW_TENSION) {
      const shaped = applyLowTensionChorus(chart, chorusSlice);
      notes = [...outside, ...shaped];
      chordMappings = chordMappings.map((row) =>
        row.barIndex >= barLo && row.barIndex < barHi
          ? { ...row, vaultChordTypeId: nudgeVaultIdLow(row.vaultChordTypeId) }
          : row
      );
    }
  }

  notes.sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
  return { notes, chordMappings };
}
