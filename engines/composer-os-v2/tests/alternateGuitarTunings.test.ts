import {
  getPresetsByZone,
  normalizeAlternateGuitarTuningRequest,
  resolveIndieArtPopTuningTexture,
  ROADMAP_ZONE_TUNING_PRESET_IDS,
  type AlternateGuitarTuningRequest,
  type AlternateGuitarTuningResolved,
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

  // Roadmap 24 — each resolves with six strings
  for (const pid of ROADMAP_ZONE_TUNING_PRESET_IDS) {
    const req: AlternateGuitarTuningRequest = { mode: 'shared', shared: { presetId: pid } };
    const res = normalizeAlternateGuitarTuningRequest(req);
    const ok =
      res?.mode === 'shared' &&
      res.shared?.strings?.length === 6 &&
      res.shared.strings.every((s) => typeof s === 'string' && s.length > 0);
    out.push({
      ok: !!ok,
      name: `roadmap preset resolves: ${pid}`,
    });
  }

  out.push({
    ok: getPresetsByZone('jazz_sophisticated').length === 7,
    name: 'getPresetsByZone jazz_sophisticated has 7 presets',
  });
  out.push({
    ok: getPresetsByZone('sonic_youth_noise').length === 9,
    name: 'getPresetsByZone sonic_youth_noise has 9 presets',
  });
  out.push({
    ok: getPresetsByZone('joni_mitchell').length === 10,
    name: 'getPresetsByZone joni_mitchell has 10 presets',
  });
  out.push({
    ok: getPresetsByZone('hybrid_harmonic').length === 9,
    name: 'getPresetsByZone hybrid_harmonic has 9 presets',
  });

  const texSy: AlternateGuitarTuningResolved = {
    mode: 'shared',
    shared: { presetId: 'sy_cgdgcd', strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'D4'] },
  };
  out.push({
    ok: resolveIndieArtPopTuningTexture(texSy) === 'drone_cluster',
    name: 'texture: sy_cgdgcd → drone_cluster',
  });

  const texJoni: AlternateGuitarTuningResolved = {
    mode: 'shared',
    shared: { presetId: 'joni_dgdfce', strings: ['D2', 'G2', 'D3', 'F3', 'C4', 'E4'] },
  };
  out.push({
    ok: resolveIndieArtPopTuningTexture(texJoni) === 'open_modal',
    name: 'texture: joni_dgdfce → open_modal',
  });

  const texJazz: AlternateGuitarTuningResolved = {
    mode: 'shared',
    shared: { presetId: 'all_fourths', strings: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'] },
  };
  out.push({
    ok: resolveIndieArtPopTuningTexture(texJazz) === 'open_modal',
    name: 'texture: all_fourths → open_modal',
  });

  return out;
}
