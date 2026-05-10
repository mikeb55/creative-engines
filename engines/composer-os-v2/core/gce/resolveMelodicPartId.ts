/**
 * Pick lead-melody staff for GCE — Big Band has no `guitar`; duo scores use guitar/piano lead.
 */

import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

const DRUM_IDS = new Set<string>(['bb_drums']);
const BASS_IDS = new Set<string>(['bb_rhythm_section']);

function leadVoiceNoteCount(part: PartModel): number {
  let n = 0;
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const ne = e as NoteEvent;
      const v = ne.voice ?? 1;
      if (v === 1) n++;
    }
  }
  return n;
}

/**
 * Prefer BB alto lead (locked melody), then trumpet, then first pitched non-drum/non-bass part with voice-1 notes.
 * Fallback `guitar` preserves duo / ECM golden-path behaviour when no BB parts exist.
 */
export function resolveMelodicPartId(score: ScoreModel): string {
  const priority = ['bb_alto_sax', 'bb_trumpets'] as const;
  for (const id of priority) {
    const p = score.parts.find((x) => x.id === id);
    if (p && leadVoiceNoteCount(p) > 0) return id;
  }

  for (const p of score.parts) {
    if (DRUM_IDS.has(p.id) || BASS_IDS.has(p.id)) continue;
    if (leadVoiceNoteCount(p) > 0) return p.id;
  }

  const g = score.parts.find((x) => x.id === 'guitar');
  if (g && leadVoiceNoteCount(g) > 0) return 'guitar';

  return 'guitar';
}
