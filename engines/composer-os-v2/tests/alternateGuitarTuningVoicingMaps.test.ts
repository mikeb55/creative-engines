/**
 * Alternate tuning voicing-map registry + `applyTuningVoicingMapToChordTones` (pilot: `new_standard`).
 */

import { seededUnit } from '../core/goldenPath/guitarBassDuoHarmony';
import {
  applyTuningVoicingMapToChordTones,
  guitarChordTonesInRange,
  liftToneToRange,
} from '../core/goldenPath/guitarPhraseAuthority';
import type { AlternateGuitarTuningResolved } from '../core/song-mode/alternateGuitarTunings';
import { buildResolvedTuningVoicingContext } from '../core/song-mode/alternateGuitarTuningVoicingMaps';

export function runAlternateGuitarTuningVoicingMapsTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const low = 40;
  const high = 76;
  const chord = 'Cmaj7';
  const base = guitarChordTonesInRange(chord, low, high);

  const emptyCtx = buildResolvedTuningVoicingContext(undefined, 'guitar');
  const passthrough = applyTuningVoicingMapToChordTones(
    base,
    chord,
    low,
    high,
    emptyCtx,
    12345,
    1,
    999
  );
  out.push({
    ok:
      emptyCtx.map === null &&
      passthrough.root === base.root &&
      passthrough.third === base.third &&
      passthrough.fifth === base.fifth &&
      passthrough.seventh === base.seventh,
    name: 'null / absent registry map leaves chord tones identical to guitarChordTonesInRange',
  });

  const unknownPreset: AlternateGuitarTuningResolved = {
    mode: 'shared',
    shared: {
      presetId: 'dadgad',
      strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
    },
  };
  const unknownCtx = buildResolvedTuningVoicingContext(unknownPreset, 'guitar');
  const noRegistry = applyTuningVoicingMapToChordTones(
    base,
    chord,
    low,
    high,
    unknownCtx,
    99999,
    2,
    1000
  );
  out.push({
    ok: unknownCtx.map === null && noRegistry.fifth === base.fifth,
    name: 'resolved preset id with no registry entry still yields unchanged fifth',
  });

  const newStandard: AlternateGuitarTuningResolved = {
    mode: 'shared',
    shared: {
      presetId: 'new_standard',
      strings: ['C2', 'G2', 'D3', 'A3', 'E4', 'G4'],
    },
  };
  const nsCtx = buildResolvedTuningVoicingContext(newStandard, 'guitar');
  const seed = 90210;
  const bar = 4;
  const salt = 26410;
  const u = seededUnit(seed, bar, salt);
  const expectedFifth = u < 0.55 ? liftToneToRange(base.fifth + 12, low, high) : base.fifth;
  const once = applyTuningVoicingMapToChordTones(base, chord, low, high, nsCtx, seed, bar, salt);
  const twice = applyTuningVoicingMapToChordTones(base, chord, low, high, nsCtx, seed, bar, salt);
  out.push({
    ok:
      nsCtx.map?.presetId === 'new_standard' &&
      once.fifth === twice.fifth &&
      once.fifth === expectedFifth &&
      once.root === base.root,
    name: 'new_standard map: deterministic fifth (fifth-heavy gate) for fixed seed/bar/salt',
  });

  return out;
}
