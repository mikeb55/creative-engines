/**
 * Song Mode — keyboard-centric songwriter: present the primary harmony staff as Piano in MusicXML
 * and clamp comp voicings to a mid register (deterministic).
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { normalizeStyleProfileId } from '../song-mode/songModeStyleProfile';

const KEYS_COMP_LOW = 58;
const KEYS_COMP_HIGH = 77;

function clampMidiToKeysCompRegister(midi: number): number {
  let p = midi;
  while (p < KEYS_COMP_LOW) p += 12;
  while (p > KEYS_COMP_HIGH) p -= 12;
  return p;
}

/**
 * When `songModeSongwriterKeysCompActive` is set (keyboard-centric primary), mark the duo “guitar” staff
 * for piano export and nudge pitches into a keyboard comp window. Internal part id stays `guitar` for gates.
 */
export function applySongwriterKeysCompPresentation(score: ScoreModel, context: CompositionContext): void {
  const md = context.generationMetadata;
  if (!md?.songModeSongwriterKeysCompActive) return;
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  /** Indie Art Pop route keeps electric guitar identity; do not remap to piano comp. */
  if (normalizeStyleProfileId(md.styleProfile) === 'STYLE_INDIE_ART_POP') return;

  const g = score.parts.find((p) => p.id === 'guitar');
  if (!g) return;

  g.songModePresentAsPianoComp = true;
  g.name = 'Piano';
  /** GM Acoustic Grand — export uses +1 in MusicXML midi-program tag; 0 is common offset. */
  g.midiProgram = 0;

  /** Donald Fagen uses `applySongModeFagenKeysCompV15` for split-hand ranges — do not collapse to one band here. */
  if (md.songwriterStyleId === 'donald_fagen') return;

  for (const m of g.measures) {
    for (const ev of m.events) {
      if (ev.kind === 'note') {
        ev.pitch = clampMidiToKeysCompRegister(ev.pitch);
      }
    }
  }
}
