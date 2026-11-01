/**
 * Sustained locked-bass compatibility for contrasting passage reharm (Stage H1 slice).
 * Pure helpers — no ranking, no melody rules, no semitone clash bans.
 */

import { TONALITY_VAULT_DATABASE, type TonalityVaultChordRow } from './tonalityVaultDatabase';
import { vaultDegreeToPitchClass } from './quadratonicMelodySelector';
import type {
  AlternativeBar,
  AlternativeProgression,
  ReharmLockedEvent,
} from './reharmSequenceTypes';

const ROW_BY_TYPE = new Map<string, TonalityVaultChordRow>(
  TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r])
);

const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const EPS = 1e-7;

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function formatChord(rootPc: number, vaultChordTypeId: string): string {
  return `${ROOT_NAMES[normalizePc(rootPc)]!}${vaultChordTypeId}`;
}

/** Quarters in one bar from a MusicXML-style metre label (`4/4`, `7/8`, `9/8 2+2+2+3`). */
export function quartersFromMetreLabel(metre?: string): number {
  if (!metre || !metre.trim()) return 4;
  const head = metre.trim().split(/\s+/)[0]!;
  const m = /^(\d+(?:\+\d+)*)\/(\d+)$/.exec(head);
  if (!m) return 4;
  const beats = m[1]!
    .split('+')
    .map(Number)
    .reduce((a, b) => a + b, 0);
  const beatType = Number(m[2]);
  if (!(beats > 0) || !(beatType > 0)) return 4;
  return beats * (4 / beatType);
}

/**
 * Degrees named explicitly on the vault chord-type id (extensions / alterations),
 * mapped to vault degree slots (9 / 11 / 13 / 5 / 6 / 4).
 */
export function explicitExtensionDegrees(chordTypeId: string): number[] {
  const s = chordTypeId;
  const out: number[] = [];
  const add = (d: number) => {
    if (!out.includes(d)) out.push(d);
  };
  if (/b9|#9|(?:^|[^a-z#b])9/.test(s)) add(9);
  if (/b11|#11|(?:^|[^a-z#b])11/.test(s)) add(11);
  if (/b13|#13|(?:^|[^a-z#b])13/.test(s)) add(13);
  if (/#5|b5|aug/.test(s)) add(5);
  if (/(?:^|[^a-z])6(?:\/|$)|Maj6|min6|m6/i.test(s) || s === 'Maj6') add(6);
  if (/sus/i.test(s)) add(4);
  return out;
}

/**
 * Structured chord-member pitch classes for a vault substitute:
 * root, left-hand shell, fifth (when spelled), primary tension, and
 * degrees named in the chord-type id. Bass may be any member (inversion / slash OK).
 */
export function structuredChordMemberPcs(
  vaultChordTypeId: string,
  rootPc: number
): Set<number> | null {
  const row = ROW_BY_TYPE.get(vaultChordTypeId);
  if (!row) return null;
  const root = normalizePc(rootPc);
  const pcs = new Set<number>();
  const addDeg = (degree: number) => {
    const rel = vaultDegreeToPitchClass(row, degree);
    if (rel === undefined) return;
    pcs.add(normalizePc(root + rel));
  };
  addDeg(1);
  for (const d of row.leftHandShell) addDeg(d);
  addDeg(5);
  addDeg(row.primaryTensionNote);
  for (const d of explicitExtensionDegrees(vaultChordTypeId)) addDeg(d);
  return pcs;
}

export type ChordSpanWindow = { bar: number; start: number; end: number };

/** Passage-relative quarter windows for each absolute 1-based bar. */
export function buildPassageBarWindows(
  startBar: number,
  endBar: number,
  metreForBar: (bar: number) => string | undefined
): ChordSpanWindow[] {
  const out: ChordSpanWindow[] = [];
  let cursor = 0;
  for (let bar = startBar; bar <= endBar; bar++) {
    const dur = quartersFromMetreLabel(metreForBar(bar));
    out.push({ bar, start: cursor, end: cursor + dur });
    cursor += dur;
  }
  return out;
}

function metreLookupFromEvents(
  lockedEvents: readonly ReharmLockedEvent[]
): (bar: number) => string | undefined {
  const byBar = new Map<number, string>();
  for (const e of lockedEvents) {
    if (e.metre && !byBar.has(e.bar)) byBar.set(e.bar, e.metre);
  }
  return (bar) => byBar.get(bar);
}

/**
 * True when a timed note’s sounding interval fully covers [spanStart, spanEnd)
 * (includes attacks before the span / ties into the chord).
 */
export function noteCoversChordSpan(
  onset: number,
  dur: number,
  spanStart: number,
  spanEnd: number
): boolean {
  if (!(dur > 0) || !(spanEnd - spanStart > EPS)) return false;
  return onset <= spanStart + EPS && onset + dur >= spanEnd - EPS;
}

export type SustainedBassCompatResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      bar: number;
      /** Present on musical clash; omitted when the chord PC set could not be resolved. */
      bassPc?: number;
      kind: 'clash' | 'unknown';
    };

/**
 * Reject when a locked bass pitch class sounds for an entire chord span
 * but is absent from that substitute’s structured member PC set.
 * Shorter / moving bass notes are ignored.
 * Unresolved vault types (no structured PC set) exclude the candidate with
 * `kind: 'unknown'` — never reported as a musical clash.
 */
export function checkSustainedLockedBassCompat(
  bars: readonly AlternativeBar[],
  lockedEvents: readonly ReharmLockedEvent[] | undefined,
  startBar: number,
  endBar: number
): SustainedBassCompatResult {
  if (!lockedEvents || lockedEvents.length === 0) return { ok: true };

  const metreForBar = metreLookupFromEvents(lockedEvents);
  const windows = buildPassageBarWindows(startBar, endBar, metreForBar);
  const winByBar = new Map(windows.map((w) => [w.bar, w]));

  const bassNotes = lockedEvents.filter(
    (e) => e.part === 'bass' && e.kind === 'note' && e.pc !== null && Number.isFinite(e.pc)
  );

  for (const bar of bars) {
    if (bar.mappingNull || !bar.substituteChordTypeId) continue;
    if (bar.barIndex < startBar || bar.barIndex > endBar) continue;
    const win = winByBar.get(bar.barIndex);
    if (!win) continue;

    const sustained = bassNotes.filter((note) =>
      noteCoversChordSpan(note.onset, note.dur, win.start, win.end)
    );
    if (sustained.length === 0) continue;

    const members = structuredChordMemberPcs(bar.substituteChordTypeId, bar.substituteRootPc);
    const symbol = formatChord(bar.substituteRootPc, bar.substituteChordTypeId);
    if (!members) {
      return {
        ok: false,
        bar: bar.barIndex,
        kind: 'unknown',
        reason: `Bar ${bar.barIndex}: compatibility unknown for ${symbol} (unresolved chord type)`,
      };
    }

    for (const note of sustained) {
      const bassPc = normalizePc(note.pc!);
      if (members.has(bassPc)) continue;
      return {
        ok: false,
        bar: bar.barIndex,
        bassPc,
        kind: 'clash',
        reason: `Bar ${bar.barIndex}: sustained bass pc ${bassPc} incompatible with ${symbol}`,
      };
    }
  }

  return { ok: true };
}

/** Convenience: run {@link checkSustainedLockedBassCompat} on a full alternative. */
export function progressionPassesSustainedLockedBass(
  progression: AlternativeProgression,
  lockedEvents: readonly ReharmLockedEvent[] | undefined,
  startBar: number,
  endBar: number
): SustainedBassCompatResult {
  return checkSustainedLockedBassCompat(progression.bars, lockedEvents, startBar, endBar);
}
