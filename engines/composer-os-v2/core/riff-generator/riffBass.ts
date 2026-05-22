/**

 * Co-compositional bass: guide tones + roots, interlock from compiled contour policy.

 */



import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';

import type { RiffProfile } from '../composer/riffProfileTypes';

import type { ResolvedPitchField } from '../harmony/pitchFieldSpineTypes';

import { bassRiffPitchFieldForBar } from './riffPitchField';

import { isInGuitarRestWindow } from './riffCallResponseEngine';

import type { GuitarRestWindow } from './riffMultiVoiceTypes';

import type { RiffRhythmSegment } from './riffTypes';

import { randInt } from './riffRandom';



const BASS_LOW = 40;

const BASS_HIGH = 88;



function clampBass(m: number): number {

  return Math.max(BASS_LOW, Math.min(BASS_HIGH, m));

}



function midiFromPc(pc: number, preferLow = true): number {

  let m = (preferLow ? 36 : 48) + ((pc % 12) + 12) % 12;

  while (m < BASS_LOW) m += 12;

  while (m > BASS_HIGH) m -= 12;

  return clampBass(m);

}



function pickMelodicBassPitch(

  tones: ChordToneSet,

  field: ResolvedPitchField | undefined,

  rng: () => number

): number {

  if (field?.allowedPcs.length) {

    const pool = field.allowedPcs;

    const pick = pool[randInt(rng, 0, pool.length - 1)]!;

    return midiFromPc(pick.pc);

  }

  const guide = rng() > 0.35 ? tones.third : rng() > 0.4 ? tones.seventh : tones.fifth;

  return clampBass(guide);

}



export interface BassNote {

  startBeat: number;

  duration: number;

  pitch: number;

}



export interface GuitarEventForBass {

  startBeat: number;

  duration: number;

  pitch: number;

}



/**

 * Sly / contour interlock: anticipations, melodic contour, call-response spacing vs guitar.

 */

export function bassInterlockForBar(

  chordSymbol: string,

  barIndex: number,

  vrbProfile: RiffProfile | undefined,

  guitarEvents: GuitarEventForBass[],

  bar: RiffRhythmSegment[],

  rng: () => number,

  restWindows?: GuitarRestWindow[],

  pedalRigid = false

): BassNote[] {

  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });

  const field = bassRiffPitchFieldForBar(chordSymbol, barIndex, vrbProfile);

  const contour = vrbProfile?.bassContourPolicy;

  const out: BassNote[] = [];



  if (pedalRigid) {
    const pedalRoot = midiFromPc(tones.root % 12);
    for (const s of bar) {
      if (s.rest) continue;
      const onDown = [0, 1, 2, 3].some((b) => Math.abs(s.startBeat - b) < 0.12);
      if (!onDown) continue;
      out.push({ startBeat: s.startBeat, duration: s.duration, pitch: pedalRoot });
    }
    if (out.length === 0) {
      out.push({ startBeat: 0, duration: 1, pitch: pedalRoot });
    }
    return out;
  }



  const guitarActive = new Set(

    guitarEvents.map((g) => Math.round(g.startBeat * 4) / 4)

  );

  const jumpProb = contour?.octaveJumpProbability ?? 0.4;

  const anticipate = contour?.anticipateBeats ?? [0, 2];



  if (anticipate.includes(0)) {

    out.push({ startBeat: 3.75, duration: 0.25, pitch: pickMelodicBassPitch(tones, field, rng) });

  }

  if (anticipate.includes(2)) {

    out.push({ startBeat: 2.75, duration: 0.25, pitch: pickMelodicBassPitch(tones, field, rng) });

  }



  for (const s of bar) {

    if (s.rest) continue;

    const beatKey = Math.round(s.startBeat * 4) / 4;

    const guitarResting =

      isInGuitarRestWindow(restWindows, barIndex, s.startBeat) ||

      !guitarActive.has(beatKey);

    if (!guitarResting && guitarEvents.length > 2) continue;



    let p = pickMelodicBassPitch(tones, field, rng);

    const onDownbeat = [0, 1, 2, 3].some((b) => Math.abs(s.startBeat - b) < 0.12);

    if (onDownbeat && rng() > 0.35) p = clampBass(tones.root);



    if (

      contour?.octaveJumpEveryBars &&

      (barIndex + 1) % contour.octaveJumpEveryBars === 0 &&

      rng() < jumpProb

    ) {

      p = clampBass(p + 12);

    }

    if (contour?.enterOnBeatFraction !== undefined && Math.abs(s.startBeat - contour.enterOnBeatFraction) < 0.15) {

      p = clampBass(tones.root);

    }

    out.push({ startBeat: s.startBeat, duration: s.duration, pitch: p });

  }



  return out.sort((a, b) => a.startBeat - b.startBeat);

}



function pickBassPitch(

  tones: ChordToneSet,

  field: ResolvedPitchField | undefined,

  rng: () => number,

  onDownbeat: boolean,

  rootCount: number,

  contour?: RiffProfile['bassContourPolicy']

): number {

  if (field?.allowedPcs.length) {

    const pool = field.allowedPcs;

    const pick = pool[randInt(rng, 0, pool.length - 1)]!;

    return midiFromPc(pick.pc);

  }

  const guide = rng() > 0.35 ? tones.third : rng() > 0.4 ? tones.seventh : tones.fifth;

  if (onDownbeat && rootCount < 2) {

    if (contour?.anticipateBeats?.length && rng() > 0.4) {

      return clampBass(tones.root);

    }

    return rng() > 0.45 ? clampBass(tones.root) : clampBass(guide);

  }

  return clampBass(guide);

}



export function assignBassToBar(

  bar: RiffRhythmSegment[],

  chord: string,

  rng: () => number,

  barIndex = 0,

  vrbProfile?: RiffProfile,

  guitarEvents?: GuitarEventForBass[],

  restWindows?: GuitarRestWindow[]

): BassNote[] {

  const pedalRigid = vrbProfile?.pedalRigid === true;

  if (vrbProfile?.bassContourPolicy || pedalRigid) {

    return bassInterlockForBar(

      chord,

      barIndex,

      vrbProfile,

      guitarEvents ?? [],

      bar,

      rng,

      restWindows,

      pedalRigid

    );

  }



  const tones = chordTonesForChordSymbol(chord, { lockedHarmony: true });

  const field = bassRiffPitchFieldForBar(chord, barIndex, vrbProfile);

  const contour = vrbProfile?.bassContourPolicy;

  const out: BassNote[] = [];

  let rootCount = 0;



  for (const s of bar) {

    if (s.rest) continue;

    const onDownbeat = [0, 1, 2, 3].some((b) => Math.abs(s.startBeat - b) < 0.12);

    let p = pickBassPitch(tones, field, rng, onDownbeat, rootCount, contour);

    if (p % 12 === tones.root % 12) rootCount++;

    if (

      contour?.octaveJumpEveryBars &&

      (barIndex + 1) % contour.octaveJumpEveryBars === 0 &&

      rng() < (contour.octaveJumpProbability ?? 0.45)

    ) {

      p = clampBass(p + 12);

    }

    if (contour?.enterOnBeatFraction !== undefined && Math.abs(s.startBeat - contour.enterOnBeatFraction) < 0.15) {

      p = clampBass(tones.root);

    }

    out.push({ startBeat: s.startBeat, duration: s.duration, pitch: p });

  }

  return out;

}


