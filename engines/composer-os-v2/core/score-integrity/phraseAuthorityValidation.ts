/**
 * Guitar phrase authority + duo dialogue gates (golden path).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';

export interface PhraseAuthorityResult {
  valid: boolean;
  errors: string[];
}

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

function collectGuitarNotes(score: ScoreModel): { bar: number; pitch: number; start: number }[] {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return [];
  const out: { bar: number; pitch: number; start: number }[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        out.push({
          bar: m.index,
          pitch: (e as { pitch: number }).pitch,
          start: (e as { startBeat: number }).startBeat,
        });
      }
    }
  }
  return out;
}

function firstNoteStart(score: ScoreModel, id: string, bar: number): number | undefined {
  const p = score.parts.find((x) => x.instrumentIdentity === id);
  const m = p?.measures.find((x) => x.index === bar);
  const n = m?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
  return n?.startBeat;
}

function lastNoteInBar(score: ScoreModel, bar: number): { pitch: number } | undefined {
  const p = score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
  const m = p?.measures.find((x) => x.index === bar);
  if (!m) return undefined;
  let last: { pitch: number; startBeat: number } | undefined;
  for (const e of m.events) {
    if (e.kind === 'note') {
      const n = e as { pitch: number; startBeat: number; duration: number };
      if (!last || n.startBeat >= last.startBeat) last = { pitch: n.pitch, startBeat: n.startBeat };
    }
  }
  return last ? { pitch: last.pitch } : undefined;
}

export function validateDuoPhraseAuthority(score: ScoreModel): PhraseAuthorityResult {
  const errors: string[] = [];
  const notes = collectGuitarNotes(score);
  if (notes.length < 8) {
    errors.push('Phrase authority: guitar content too thin');
    return { valid: false, errors };
  }

  const pitches = notes.map((n) => n.pitch);
  const span = Math.max(...pitches) - Math.min(...pitches);
  if (span < 7) {
    errors.push('Phrase authority: guitar register span too narrow (phrase lacks contour authority)');
  }

  const lastPcs: number[] = [];
  for (let bar = 1; bar <= 8; bar++) {
    const ln = lastNoteInBar(score, bar);
    if (ln) lastPcs.push(ln.pitch % 12);
  }
  if (new Set(lastPcs).size < 4) {
    errors.push('Phrase authority: guitar phrase endings lack variety');
  }

  let handoffs = 0;
  let maxOnsetGap = 0;
  let simultaneous = 0;
  let barsBoth = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gs = firstNoteStart(score, 'clean_electric_guitar', bar);
    const bs = firstNoteStart(score, 'acoustic_upright_bass', bar);
    if (gs !== undefined && bs !== undefined) {
      barsBoth++;
      const gap = Math.abs(gs - bs);
      maxOnsetGap = Math.max(maxOnsetGap, gap);
      if (gap >= 0.5) handoffs++;
      if (gap < 0.25) simultaneous++;
    }
  }
  if (barsBoth > 0 && handoffs < 3) {
    errors.push('Phrase authority: insufficient conversational handoffs between guitar and bass');
  }
  if (maxOnsetGap < 0.99) {
    errors.push('Phrase authority: no strong call/response moment (onset separation too small)');
  }
  if (barsBoth > 0 && simultaneous / barsBoth > 0.62) {
    errors.push('Phrase authority: excessive simultaneous attacks (dialogue too continuous)');
  }

  const aOn: number[] = [];
  const bOn: number[] = [];
  const aPit: number[] = [];
  const bPit: number[] = [];
  let aNotes = 0;
  let bNotes = 0;
  for (const n of notes) {
    if (n.bar <= 4) {
      aOn.push(n.start);
      aPit.push(n.pitch);
      aNotes++;
    } else {
      bOn.push(n.start);
      bPit.push(n.pitch);
      bNotes++;
    }
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const aBassP: number[] = [];
  const bBassP: number[] = [];
  if (bass) {
    for (const m of bass.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const p = (e as { pitch: number }).pitch;
        if (m.index <= 4) aBassP.push(p);
        else bBassP.push(p);
      }
    }
  }
  const contrastSignals = [
    Math.abs(mean(aOn) - mean(bOn)) > 0.08,
    Math.abs(mean(aPit) - mean(bPit)) > 1.0,
    Math.abs(aNotes - bNotes) >= 1,
    aBassP.length > 0 && bBassP.length > 0 && Math.abs(mean(aBassP) - mean(bBassP)) > 0.35,
  ];
  if (contrastSignals.filter(Boolean).length < 2) {
    errors.push('Phrase authority: section A/B contrast too subtle (need stronger rhetorical difference)');
  }

  let moment = false;
  for (const bar of [4, 7]) {
    const ln = lastNoteInBar(score, bar);
    if (!ln) continue;
    const t = chordTonesForGoldenChord(chordForBar(bar));
    const pc = ln.pitch % 12;
    if (pc === t.third % 12 || pc === t.seventh % 12) moment = true;
  }
  const gs4 = firstNoteStart(score, 'clean_electric_guitar', 4);
  const bs4 = firstNoteStart(score, 'acoustic_upright_bass', 4);
  if (gs4 !== undefined && bs4 !== undefined && Math.abs(gs4 - bs4) >= 0.75) moment = true;

  if (!moment) {
    errors.push('Phrase authority: no memorable cadence moment (landing or handoff)');
  }

  return { valid: errors.length === 0, errors };
}
