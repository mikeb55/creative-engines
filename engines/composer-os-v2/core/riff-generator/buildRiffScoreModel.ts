/**
 * Assemble ScoreModel for riff (guitar ± octave double-stop voice, optional bass + horns).
 */

import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { RiffRhythmSegment } from './riffTypes';
import { createMeasure, createNote, createRest, createScore } from '../score-model/scoreEventBuilder';
import { assignBassToBar } from './riffBass';
import {
  applyLoopClosure,
  applyRockStructuralCellRecall,
  assignMelodyToBar,
  enforceHook,
  isPhraseSeededCoreMotif,
  type MelodyLine,
} from './riffMelody';
import type { RiffGeneratorParams } from './riffTypes';
import { buildMultiBarRhythm } from './riffRhythm';
import { mulberry32 } from './riffRandom';
import { resolveRiffCoreMotif } from './riffSaxMotifSeedPoc';
import { riffPitchFieldForBar, voicingClassForChordSymbol } from './riffPitchField';
import { buildHornStabTrack } from './riffHornStabBuilder';
import { computeGuitarRestWindows } from './riffCallResponseEngine';
import { buildFxMarkerTrack } from './riffFxMarkerBuilder';
import { applyGuitarRestWindowsToBar } from './riffGuitarRestApply';
import { buildRiffGenerationMetadata } from './riffMultiVoiceMetadata';
import { buildSoloPartForScore } from './riffSoloBuilder';
import { zappaRiffSoloControlsFrom } from './zappaRiffSoloParams';
import type { RiffGenerationMetadata } from './riffMultiVoiceTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';

function measuresFromChordLoop(chords: string[]): import('../score-model/scoreModelTypes').MeasureModel[] {
  return chords.map((chord, i) => createMeasure(i + 1, chord));
}

function hornPitchForStab(chord: string, voicing: ReturnType<typeof voicingClassForChordSymbol>): number {
  const tones = chordTonesForChordSymbol(chord, { lockedHarmony: true });
  if (voicing === 'power5' || voicing === 'sus_no_third') return tones.fifth;
  if (voicing === 'dom_close_379') return tones.seventh;
  return tones.third;
}

export interface BuiltRiffScore {
  score: ScoreModel;
  perBarRhythm: RiffRhythmSegment[][];
  coreMotif: import('../motif/motifEngineTypes').CoreMotif;
  generationMetadata: RiffGenerationMetadata;
}

export function buildRiffScoreModel(params: RiffGeneratorParams): BuiltRiffScore {
  const rng = mulberry32(params.seed);
  const profile = params.riffProfile;
  const coreMotif = resolveRiffCoreMotif(params.seed, params.vrbId, {
    phraseMotifSeed: params.phraseMotifSeed === true,
  });
  const perBarRhythm = buildMultiBarRhythm(rng, params.grid, params.density, params.bars, params.style);
  const chords = [...params.chordSymbols];
  while (chords.length < params.bars) {
    chords.push(chords[chords.length - 1] ?? 'Am7');
  }

  const guitarRestWindows = computeGuitarRestWindows(profile, params.bars, params.vrbId);
  const hornStabTrack = buildHornStabTrack(profile, params.bars, chords, params.vrbId);
  const fxMarkerTrack = buildFxMarkerTrack(profile);
  const soloPart = buildSoloPartForScore(
    profile?.soloGeneratorProfile,
    params.soloEnabled === true,
    params.bars,
    chords,
    params.seed,
    params.vrbId,
    zappaRiffSoloControlsFrom(params)
  );

  const guitarMeasures = measuresFromChordLoop(chords);
  guitarMeasures[0]!.rehearsalMark = 'Riff';

  const wantBass = params.bassEnabled && params.lineMode === 'guitar_bass';
  const bassMeasures = wantBass ? measuresFromChordLoop(chords) : null;
  const hornMeasures = hornStabTrack ? measuresFromChordLoop(chords) : null;
  const soloMeasures = soloPart ? measuresFromChordLoop(chords) : null;

  const perBarMelody: MelodyLine[][] = [];
  let prevLast: number | undefined;
  let firstPitch: number | undefined;
  let motifStepIdx = 0;
  const phraseSeeded = isPhraseSeededCoreMotif(coreMotif);

  for (let b = 0; b < params.bars; b++) {
    const chord = chords[b]!;
    const barRh = perBarRhythm[b]!;
    const pitchField = riffPitchFieldForBar(
      chord,
      params.style,
      profile,
      params.vrbId,
      b
    );
    const { notes, lastPitch, nextMotifStepIdx } = assignMelodyToBar(
      barRh,
      chord,
      params.style,
      rng,
      b,
      firstPitch,
      prevLast,
      coreMotif,
      pitchField,
      motifStepIdx
    );
    motifStepIdx = nextMotifStepIdx;
    // P5 / Phase 1.9: phrase-seeded — skip call-response rest windows so seeded contour stays intact
    // (EVH_SIL_* / twin_guitar_call_then_sustain_answer otherwise drop notes + inject ghosts).
    const shaped = phraseSeeded
      ? notes.map((n) => ({ ...n }))
      : applyGuitarRestWindowsToBar(notes, barRh, guitarRestWindows, b, chord);
    if (b === 0 && shaped[0]) firstPitch = shaped[0].pitch;
    perBarMelody.push(shaped);
    prevLast = lastPitch;
  }

  // Phase 1.9: phrase-seeded — skip enforceHook leap inject so seeded intervals stay intact.
  if (!phraseSeeded) {
    enforceHook(perBarMelody.flat(), rng, profile?.intervalWeights);
    // P1 — rock/fusion structural 4-note cell recall (raises GCE motifRecurrence).
    applyRockStructuralCellRecall(perBarMelody, params.vrbId);
  }

  if (firstPitch !== undefined && params.bars >= 1) {
    applyLoopClosure(perBarMelody[params.bars - 1]!, firstPitch, rng);
  }

  const doubleOct = params.lineMode === 'octave_double';

  for (let b = 0; b < params.bars; b++) {
    const gm = guitarMeasures[b]!;
    const lines = perBarMelody[b]!;
    const ev = [];
    for (const ln of lines) {
      const vel = 'velocity' in ln ? (ln as { velocity?: number }).velocity : undefined;
      ev.push(createNote(ln.pitch, ln.startBeat, ln.duration, 1, 'riff_core', undefined, vel));
      if (doubleOct) {
        ev.push(createNote(ln.pitch + 12, ln.startBeat, ln.duration, 2, 'riff_core', undefined, vel));
      }
    }
    if (ev.length === 0) {
      gm.events = [createRest(0, 4, 1)];
    } else {
      gm.events = ev;
    }

    const guitarForBass = lines.map((ln) => ({
      startBeat: ln.startBeat,
      duration: ln.duration,
      pitch: ln.pitch,
    }));

    if (bassMeasures) {
      const bnotes = assignBassToBar(
        perBarRhythm[b]!,
        chords[b]!,
        rng,
        b,
        profile,
        guitarForBass,
        guitarRestWindows
      );
      bassMeasures[b]!.events = bnotes.map((n) => createNote(n.pitch, n.startBeat, n.duration, 1));
    }

    if (hornMeasures && hornStabTrack) {
      const hm = hornMeasures[b]!;
      const barStabs = hornStabTrack.filter((s) => s.bar === b);
      hm.events = barStabs.map((s) => {
        const startBeat = s.beat16th / 4;
        const duration = s.duration16ths / 4;
        const pitch = hornPitchForStab(chords[b]!, s.voicingClass);
        return createNote(pitch, startBeat, duration, 1, `horn_${s.function}`);
      });
      if (hm.events.length === 0) {
        hm.events = [createRest(0, 4, 1)];
      }
    }

    if (soloMeasures && soloPart) {
      const sm = soloMeasures[b]!;
      const barSolo = soloPart[b] ?? [];
      sm.events = barSolo.map((n) => createNote(n.pitch, n.startBeat, n.duration, 1, 'riff_solo'));
      if (sm.events.length === 0) {
        sm.events = [createRest(0, 4, 1)];
      }
    }
  }

  const guitarPart: PartModel = {
    id: 'guitar',
    name: 'Clean Electric Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: guitarMeasures,
  };

  const parts: PartModel[] = [guitarPart];
  if (hornMeasures) {
    parts.push({
      id: 'horns',
      name: 'Brass Section',
      instrumentIdentity: 'brass_section',
      midiProgram: 61,
      clef: 'treble',
      measures: hornMeasures,
    });
  }
  if (bassMeasures) {
    parts.push({
      id: 'bass',
      name: 'Acoustic Upright Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: bassMeasures,
    });
  }
  if (soloMeasures) {
    parts.push({
      id: 'solo',
      name: 'Electric Guitar Solo',
      instrumentIdentity: 'electric_guitar_solo',
      midiProgram: 29,
      clef: 'treble',
      measures: soloMeasures,
    });
  }

  const score = createScore(params.title?.trim() || 'Riff', parts, {
    tempo: params.bpm,
  });

  const generationMetadata = buildRiffGenerationMetadata({
    hornStabTrack,
    fxMarkerTrack,
    guitarRestWindows,
    profile,
    vrbId: params.vrbId,
    bars: params.bars,
    hasBassPart: !!bassMeasures,
    hasSoloPart: !!soloMeasures,
  });

  return { score, perBarRhythm, coreMotif, generationMetadata };
}
