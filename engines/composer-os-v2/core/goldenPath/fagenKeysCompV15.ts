/**
 * Song Mode — Donald Fagen-only keys-comp: split-hand registers, density caps, chord-tone dyads,
 * then musical augment (`fagenKeysCompMusical.ts`) — generative jazz-pop voicing bias, not an imitation claim.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { chordTonesForChordSymbolWithContext } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import { appendSongModeStyleSurfaceNotes } from '../song-mode/songModeStyleSurface';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { createNote } from '../score-model/scoreEventBuilder';
import {
  applyFagenKeysCompMusicalAugment,
  ensureFagenOpeningLhShellBars1to8,
  fagenCompanionMidiForSparseRhDyad,
  fagenFormSegmentEnds,
  lhClampRangeForFagenBar,
  maxNotesFagenKeysCompBar,
  rhClampRangeForFagenBar,
} from './fagenKeysCompMusical';

export { maxNotesFagenKeysCompBar as maxNotesFagenKeysCompV15Bar, fagenCompanionMidiForSparseRhDyad } from './fagenKeysCompMusical';

const MOTIF_REF_RE = /^song_motif/;

function clampPitchToRange(p: number, lo: number, hi: number): number {
  let x = p;
  while (x < lo) x += 12;
  while (x > hi) x -= 12;
  return x;
}

/** Drop shortest-duration notes first until at or under cap (rests unchanged). Prefer keeping `song_motif*` notes so motif validators stay satisfied. */
export function thinMeasureNotesToCap(measure: MeasureModel, maxKeep: number): void {
  const notes = measure.events.filter((e): e is NoteEvent => e.kind === 'note');
  if (notes.length <= maxKeep) return;
  const dropCount = notes.length - maxKeep;
  const shortSide = [...notes].sort((a, b) => a.duration - b.duration);
  const withoutMotif = shortSide.filter((n) => !n.motifRef || !MOTIF_REF_RE.test(n.motifRef));
  const withMotif = shortSide.filter((n) => n.motifRef && MOTIF_REF_RE.test(n.motifRef));
  const toDrop = new Set<NoteEvent>();
  for (const n of withoutMotif) {
    if (toDrop.size >= dropCount) break;
    toDrop.add(n);
  }
  for (const n of withMotif) {
    if (toDrop.size >= dropCount) break;
    toDrop.add(n);
  }
  measure.events = measure.events.filter((e) => e.kind !== 'note' || !toDrop.has(e as NoteEvent));
}

/** Add up to `maxAdds` chord-tone dyads on voice 1 where a 16th attack has a single RH note (bars 1–16). */
function applyFagenRhSparseCompDyads(
  measure: MeasureModel,
  barIndex: number,
  context: CompositionContext,
  maxAdds: number,
  totalBars: number = 32
): void {
  if (maxAdds <= 0) return;
  const chord = getChordForBar(barIndex, context);
  if (!chord.trim()) return;
  const tones = chordTonesForChordSymbolWithContext(chord, context);

  const v1notes = measure.events.filter(
    (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1
  );
  const byGrid = new Map<number, NoteEvent[]>();
  for (const n of v1notes) {
    const k = Math.round(n.startBeat * 16) / 16;
    const g = byGrid.get(k);
    if (g) g.push(n);
    else byGrid.set(k, [n]);
  }

  let added = 0;
  const gridKeys = [...byGrid.keys()].sort((a, b) => a - b);
  for (const k of gridKeys) {
    if (added >= maxAdds) break;
    const g = byGrid.get(k)!;
    if (g.length !== 1) continue;
    const base = g[0];
    if (base.duration < 0.125) continue;
    const companion = fagenCompanionMidiForSparseRhDyad(base.pitch, tones, chord, context, barIndex, totalBars);
    if (companion === undefined) continue;
    const vel = Math.max(34, Math.min(120, (base.velocity ?? 74) - 5));
    /** Voice 2 = comp layer so Barry Harris VL checks (voice-1 chain) stay on the hook strand. */
    measure.events.push(createNote(companion, base.startBeat, Math.min(base.duration, 0.75), 2));
    const last = measure.events[measure.events.length - 1] as NoteEvent;
    last.velocity = vel;
    added += 1;
  }
  measure.events.sort(
    (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
  );
}

/**
 * Post-pass after generic keys presentation: Fagen-only split-hand voicing bias, density restraint,
 * musical rhythm / inner-line / section contrast (see `fagenKeysCompMusical.ts`).
 */
export function applySongModeFagenKeysCompV15(score: ScoreModel, context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata | undefined;
  if (!md?.songModeHookFirstIdentity) return;
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  if (context.form.totalBars < 32) return;
  if (md.songwriterStyleId !== 'donald_fagen') return;

  const g = score.parts.find((p) => p.id === 'guitar');
  if (!g) return;

  const tb = context.form.totalBars ?? 32;

  ensureFagenOpeningLhShellBars1to8(g, context, tb);

  const { aEnd, bEnd } = fagenFormSegmentEnds(tb);

  for (const m of g.measures) {
    const b = m.index;
    const cap = maxNotesFagenKeysCompBar(b, tb);
    const rh = rhClampRangeForFagenBar(b, tb);
    const lh = lhClampRangeForFagenBar(b, tb);

    for (const ev of m.events) {
      if (ev.kind !== 'note') continue;
      const n = ev as NoteEvent;
      const v = n.voice ?? 1;
      if (v === 2) {
        n.pitch = clampPitchToRange(n.pitch, lh.lo, lh.hi);
      } else {
        n.pitch = clampPitchToRange(n.pitch, rh.lo, rh.hi);
      }
    }

    const dyadBudget = b <= aEnd ? 4 : b <= bEnd ? 3 : 0;
    applyFagenRhSparseCompDyads(m, b, context, dyadBudget, tb);

    thinMeasureNotesToCap(m, cap);
  }

  applyFagenKeysCompMusicalAugment(score, context);

  appendSongModeStyleSurfaceNotes(md, [
    'Song Mode Fagen keys-comp (musical): keyboard-led syncopated comp fingerprint (anticipations toward 2/4, short off-beat stabs, pads thinned), inner-voice motion on LH shells, compact tension-rich dyads where harmony allows. Not an imitation of any artist.',
    'Song Mode Fagen keys-comp (sections): B-section brighter register + higher density vs cool A; phrase tension sculpt; form-relative return entry / mid-return gestures (quarter-based pivots). Rule-based colour bias only.',
    'Song Mode Fagen keys-comp (duo gates): chord-tone companions on voice 2; opening A gains soft LH half-note shells when voice 2 was empty; Barry Harris behaviour check prefers the song_motif pitch strand when present (generative routing only).',
    'Song Mode Fagen keys-comp (metrics): objective diagnostics on generationMetadata.fagenKeysCompMusicalDiagnostics — syncopation by section, voicing density, phrase tension means, optional single signature pivot, return variation summary.',
  ]);

  md.songModeFagenKeysCompV15Applied = true;
}
