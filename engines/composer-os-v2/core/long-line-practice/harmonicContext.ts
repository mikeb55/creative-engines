/**
 * Harmonic-context adapter for long-line practice.
 * Bar pitch-class fields constrain the line. Bass notes are preserved, never rewritten.
 * No chord substitutions. No riff gates. Uses generateLongLine per bar.
 */

import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';
import { generateLongLine, longLineEventSignature } from './generateLongLine';
import { longLineMeterSpanQuarters } from './meter';
import {
  LONG_LINE_PRACTICE_VERSION,
  LONG_LINE_PROFILES,
  type LongLineEvent,
  type LongLineHarmonyBar,
  type LongLineHarmonyCandidate,
  type LongLineHarmonyRequest,
  type LongLineHarmonyResult,
  type LongLineMeter,
  type LongLineProfile,
  type LongLineRegister,
  type LongLineResult,
  type LongLineTimedBassEvent,
} from './types';

function commonTonePcs(previous: readonly number[], current: readonly number[]): number[] {
  const curr = new Set(current.map((pc) => mod12(pc)));
  return previous.map((pc) => mod12(pc)).filter((pc) => curr.has(pc));
}

function freezeBass(bars: readonly LongLineHarmonyBar[]): readonly (readonly number[])[] {
  return bars.map((bar) => {
    if (bar.bassMidis) return Object.freeze([...bar.bassMidis]);
    if (bar.bassEvents?.length) return Object.freeze(bar.bassEvents.map((e) => e.midi));
    return Object.freeze([] as number[]);
  });
}

function freezeBassEvents(bars: readonly LongLineHarmonyBar[]): readonly (readonly LongLineTimedBassEvent[])[] {
  return bars.map((bar) => {
    if (!bar.bassEvents?.length) return Object.freeze([] as LongLineTimedBassEvent[]);
    return Object.freeze(
      bar.bassEvents.map((e) =>
        Object.freeze({
          startBeat: e.startBeat,
          duration: e.duration,
          midi: e.midi,
        }),
      ),
    );
  });
}

function generateProfileOverHarmony(args: {
  profile: LongLineProfile;
  fields: readonly (readonly number[])[];
  metersByBar: readonly (LongLineMeter | null)[];
  bassByBar: readonly (readonly number[])[];
  bassEventsByBar: readonly (readonly LongLineTimedBassEvent[])[];
  register: LongLineRegister;
  seed: number;
  beatsPerBar: number;
}): LongLineHarmonyCandidate {
  const { profile, fields, metersByBar, bassByBar, bassEventsByBar, register, seed, beatsPerBar } = args;
  const events: LongLineEvent[] = [];
  let anchorMidi: number | undefined;
  let previousField: readonly number[] | undefined;

  for (let barIndex = 0; barIndex < fields.length; barIndex += 1) {
    const field = fields[barIndex]!;
    // Lyrical keeps common-tone bar joins. Intervallic / experimental use anchor only so
    // register-lane leaps are not re-collapsed toward shared pcs at every bar boundary.
    const prefer =
      profile === 'lyrical' && previousField && previousField.length > 0
        ? commonTonePcs(previousField, field)
        : undefined;
    const meter = metersByBar[barIndex];
    const barSpan = meter ? longLineMeterSpanQuarters(meter) : beatsPerBar;

    const slice = generateLongLine({
      pitchClasses: field,
      bars: 1,
      register,
      profile,
      // Distinct per-bar stream; profile salt still applied inside generateLongLine.
      seed: (seed + barIndex * 0x9e3779b9) >>> 0,
      beatsPerBar: barSpan,
      anchorMidi,
      preferPitchClasses: prefer && prefer.length > 0 ? prefer : undefined,
    });

    for (const event of slice.events) {
      events.push({
        ...event,
        bar: barIndex,
      });
    }

    const last = slice.events[slice.events.length - 1];
    if (last) anchorMidi = last.midi;
    previousField = field;
  }

  const unionPcs = canonicalPitchSet(fields.flatMap((f) => [...f]));
  const line: LongLineResult = {
    version: LONG_LINE_PRACTICE_VERSION,
    profile,
    seed,
    bars: fields.length,
    beatsPerBar,
    pitchClasses: unionPcs,
    register,
    events,
    signature: longLineEventSignature(events),
  };

  return {
    profile,
    line,
    bassByBar,
    bassEventsByBar,
  };
}

/**
 * Generate Lyrical / Intervallic / Experimental lines over bar-by-bar pitch-class fields.
 * Source fields and bass notes are not modified or substituted.
 */
export function generateLongLinesOverHarmony(request: LongLineHarmonyRequest): LongLineHarmonyResult {
  if (!request.bars.length) {
    throw new Error('long-line-practice: harmony bars must not be empty');
  }

  const fields: number[][] = [];
  for (let i = 0; i < request.bars.length; i += 1) {
    const pcs = canonicalPitchSet(request.bars[i]!.pitchClasses);
    if (pcs.length === 0) {
      throw new Error(`long-line-practice: harmony bar ${i} has empty pitchClasses`);
    }
    fields.push(pcs);
  }

  const register: LongLineRegister = {
    low: Math.trunc(request.register.low),
    high: Math.trunc(request.register.high),
  };
  if (register.high < register.low) {
    throw new Error('long-line-practice: register.high must be >= register.low');
  }

  const beatsPerBar = request.beatsPerBar ?? 4;
  if (!(beatsPerBar > 0)) {
    throw new Error('long-line-practice: beatsPerBar must be positive');
  }

  const bassByBar = freezeBass(request.bars);
  const bassEventsByBar = freezeBassEvents(request.bars);
  const metersByBar: (LongLineMeter | null)[] = request.bars.map((bar) =>
    bar.meter && bar.meter.beats > 0 && bar.meter.beatType > 0
      ? Object.freeze({ beats: bar.meter.beats, beatType: bar.meter.beatType })
      : null,
  );
  const profiles: readonly LongLineProfile[] = request.profiles?.length
    ? request.profiles
    : LONG_LINE_PROFILES;

  const candidates = profiles.map((profile) =>
    generateProfileOverHarmony({
      profile,
      fields,
      metersByBar,
      bassByBar,
      bassEventsByBar,
      register,
      seed: request.seed,
      beatsPerBar,
    }),
  );

  return {
    version: LONG_LINE_PRACTICE_VERSION,
    seed: request.seed,
    beatsPerBar,
    fields: fields.map((f) => Object.freeze([...f])),
    metersByBar: metersByBar.map((m) => (m ? Object.freeze({ ...m }) : null)),
    candidates,
  };
}

/** True when every melodic event pitch class sits inside its bar's field. */
export function eventsRespectHarmonyFields(
  events: readonly LongLineEvent[],
  fields: readonly (readonly number[])[],
): boolean {
  for (const event of events) {
    const field = fields[event.bar];
    if (!field) return false;
    const allowed = new Set(field.map((pc) => mod12(pc)));
    if (!allowed.has(mod12(event.midi))) return false;
  }
  return true;
}
