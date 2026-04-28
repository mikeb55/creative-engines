/**
 * Song Mode (Indie Art Pop) + separate tunings: guitar_2 comp ChordEvent quality invariants
 * (2–4 unique PCs, no weak-beat v2 singles when comp chords present, strong-beat-1&3 share floor).
 */
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { normalizeAlternateGuitarTuningRequest } from '../core/song-mode/alternateGuitarTunings';
import type { ChordEvent, NoteEvent } from '../core/score-model/scoreModelTypes';

function buildIndieDualGuitar2RunOptions() {
  const alt = normalizeAlternateGuitarTuningRequest({
    mode: 'separate',
    guitar1: { presetId: 'dadgad' },
    guitar2: { presetId: 'open_g' },
  });
  if (!alt) {
    throw new Error('indieGuitar2QualityTest: could not resolve alternateGuitarTuning');
  }
  return {
    presetId: 'guitar_bass_duo' as const,
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleProfile: 'STYLE_INDIE_ART_POP' as const,
    primarySongwriterStyle: 'donald_fagen',
    alternateGuitarTuning: alt,
    harmonyMode: 'builtin' as const,
  };
}

function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/** Beat 1 or 3 in 4/4: local positions 0.0 and 2.0 (integer-aligned). */
function isOnBeatsOneOrThreeInBar(startBeat: number): boolean {
  const p = ((startBeat % 4) + 4) % 4;
  return p < 0.01 || Math.abs(p - 2) < 0.01;
}

function onWholeBeatGrid(startBeat: number): boolean {
  const frac = Math.abs(((startBeat % 1) + 1) % 1);
  return frac < 1e-5 || frac > 1 - 1e-5;
}

const INDIE_G2_QUALITY_SEED = 424242;

function runIndieGuitar2QualityProbe(): {
  ok: boolean;
  chordPitches2To4UniquePc: boolean;
  noResidue: boolean;
  strong13Floor: boolean;
  thinVoice1PeakOk: boolean;
} {
  const res = runGoldenPath(INDIE_G2_QUALITY_SEED, buildIndieDualGuitar2RunOptions());
  const bassOnlyFailure =
    !res.success && res.errors?.every((e: string) => /bass|voice.leading/i.test(e));
  if (!res.success && !bassOnlyFailure) {
    return {
      ok: false,
      chordPitches2To4UniquePc: false,
      noResidue: false,
      strong13Floor: false,
      thinVoice1PeakOk: false,
    };
  }
  const g2 = res.score.parts.find((p) => p.id === 'guitar_2');
  if (!g2) {
    return {
      ok: false,
      chordPitches2To4UniquePc: false,
      noResidue: false,
      strong13Floor: false,
      thinVoice1PeakOk: false,
    };
  }
  const chordHits: { startBeat: number }[] = [];
  let chordPitches2To4UniquePc = true;
  for (const m of g2.measures) {
    for (const e of m.events) {
      if (e.kind !== 'chord' || (e as ChordEvent).voice !== 2) continue;
      const ch = e as ChordEvent;
      const n = ch.pitches.length;
      const pcs = ch.pitches.map(pitchClass);
      if (n < 2 || n > 4 || new Set(pcs).size !== n) {
        chordPitches2To4UniquePc = false;
      }
      chordHits.push({ startBeat: e.startBeat });
    }
  }
  let noResidue = true;
  for (const m of g2.measures) {
    const hasG2Chord = m.events.some((e) => e.kind === 'chord' && (e as ChordEvent).voice === 2);
    if (!hasG2Chord) continue;
    for (const e of m.events) {
      if (e.kind !== 'note' || (e as NoteEvent).voice !== 2) continue;
      if (onWholeBeatGrid(e.startBeat)) continue;
      noResidue = false;
    }
  }
  let strong13Floor = chordHits.length >= 4;
  if (chordHits.length > 0) {
    const on13 = chordHits.filter((c) => isOnBeatsOneOrThreeInBar(c.startBeat)).length;
    strong13Floor = strong13Floor && on13 / chordHits.length >= 0.6;
  } else {
    strong13Floor = false;
  }
  /** Post–`thinGuitar2Voice1InChordMeasures` peak (final sealed score may atomize into more `<note>` events). */
  const peak = res.context.generationMetadata.indieGuitar2ThinVoice1Peak;
  const thinVoice1PeakOk = typeof peak === 'number' && peak <= 2;
  return { ok: true, chordPitches2To4UniquePc, noResidue, strong13Floor, thinVoice1PeakOk };
}

export function runIndieGuitar2SongModeChordEventQualityTests(): { name: string; ok: boolean }[] {
  const p = runIndieGuitar2QualityProbe();
  return [
    { name: 'Indie guitar_2 ChordEvents: 2–4 unique pitch classes, no PC doubles', ok: p.ok && p.chordPitches2To4UniquePc },
    {
      name: 'Indie guitar_2: no offbeat v2 single notes in measures with v2 comp chords',
      ok: p.ok && p.noResidue,
    },
    { name: 'Indie guitar_2: ≥60% comp ChordEvents on bar beats 1 & 3 (local 0/2)', ok: p.ok && p.strong13Floor },
    {
      name: 'Indie guitar_2: thin pass peak ≤ 2 voice-1 singles in chord measures (pre-atomize)',
      ok: p.ok && p.thinVoice1PeakOk,
    },
  ];
}
