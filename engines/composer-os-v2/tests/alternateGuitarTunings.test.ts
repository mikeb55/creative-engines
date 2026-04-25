import {
  normalizeAlternateGuitarTuningRequest,
  type AlternateGuitarTuningRequest,
} from '../core/song-mode/alternateGuitarTunings';

export function runAlternateGuitarTuningsTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: normalizeAlternateGuitarTuningRequest(undefined) === null,
    name: 'defaults unchanged when alternate tuning payload is absent',
  });

  const shared: AlternateGuitarTuningRequest = {
    mode: 'shared',
    shared: { presetId: 'dadgad' },
  };
  const sharedResolved = normalizeAlternateGuitarTuningRequest(shared);
  out.push({
    ok: sharedResolved?.mode === 'shared' && sharedResolved.shared?.presetId === 'dadgad',
    name: 'shared tuning mode resolves known preset',
  });

  const separate: AlternateGuitarTuningRequest = {
    mode: 'separate',
    guitar1: { presetId: 'drop_d' },
    guitar2: { presetId: 'open_g' },
  };
  const separateResolved = normalizeAlternateGuitarTuningRequest(separate);
  out.push({
    ok:
      separateResolved?.mode === 'separate' &&
      separateResolved.guitar1?.presetId === 'drop_d' &&
      separateResolved.guitar2?.presetId === 'open_g',
    name: 'separate tuning mode resolves independent guitar tunings',
  });

  const custom: AlternateGuitarTuningRequest = {
    mode: 'shared',
    shared: {
      presetId: 'custom',
      customStrings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
    },
  };
  const customResolved = normalizeAlternateGuitarTuningRequest(custom);
  out.push({
    ok: customResolved?.shared?.strings?.[0] === 'D2' && customResolved?.shared?.strings?.[5] === 'D4',
    name: 'custom six-string tuning is accepted and normalized',
  });

  const invalidCustom: AlternateGuitarTuningRequest = {
    mode: 'shared',
    shared: {
      presetId: 'custom',
      customStrings: ['X2', 'A2', 'D3', 'G3', 'A3', 'D4'],
    },
  };
  out.push({
    ok: normalizeAlternateGuitarTuningRequest(invalidCustom) === null,
    name: 'invalid custom note input is rejected safely',
  });

  out.push({
    ok: normalizeAlternateGuitarTuningRequest({ mode: 'standard' })?.mode === 'standard',
    name: 'standard mode is accepted and preserves default behavior',
  });

  return out;
}

