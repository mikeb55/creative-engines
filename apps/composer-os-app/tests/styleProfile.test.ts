import { describe, expect, it } from 'vitest';
import {
  BADALAMENTI_HARMONIC_STYLE_KEYS,
  GIL_EVANS_HARMONIC_STYLE_KEYS,
  HENRY_THREADGILL_HARMONIC_STYLE_KEYS,
  CHARLES_MINGUS_HARMONIC_STYLE_KEYS,
  HERRMANN_HARMONIC_STYLE_KEYS,
  JOHN_COLTRANE_HARMONIC_STYLE_KEYS,
  MARIA_SCHNEIDER_HARMONIC_STYLE_KEYS,
  MORRICONE_HARMONIC_STYLE_KEYS,
  QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS,
  WAYNE_SHORTER_HARMONIC_STYLE_KEYS,
  PAT_METHENY_HARMONIC_STYLE_KEYS,
} from '@composer-os/core/song-mode/harmonicVoiceStyleContextKeys';
import {
  buildGenerationContext,
  HARMONIC_VOICE_LABELS,
  migrateArrangerStyleToArrangerBlend,
  migrateLegacySongwriterValue,
  resolveHarmonicContextKeys,
  resolveRhythmContextKeys,
} from '../src/types/styleProfile';

describe('styleProfile', () => {
  it('migrateArrangerStyleToArrangerBlend(undefined) maps to none @ 1', () => {
    expect(migrateArrangerStyleToArrangerBlend(undefined)).toEqual([{ id: 'none', weight: 1 }]);
  });

  it('migrateArrangerStyleToArrangerBlend("") maps to none @ 1', () => {
    expect(migrateArrangerStyleToArrangerBlend('')).toEqual([{ id: 'none', weight: 1 }]);
  });

  it('migrateArrangerStyleToArrangerBlend(ravel) single entry weight 1', () => {
    expect(migrateArrangerStyleToArrangerBlend('ravel')).toEqual([{ id: 'ravel', weight: 1 }]);
  });

  it('migrateLegacySongwriterValue(greek_rebetiko) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('greek_rebetiko');
    expect(m.rhythm?.engineId).toBe('greek_rebetiko');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it('migrateLegacySongwriterValue(debussy) returns harmonic voiceId', () => {
    const m = migrateLegacySongwriterValue('debussy');
    expect(m.harmonic?.voiceId).toBe('debussy');
    expect(m.rhythm?.engineId).toBeUndefined();
  });

  it('buildGenerationContext with both selected returns combinedKeys with hv: and gr:', () => {
    const ctx = buildGenerationContext({
      harmonic: { voiceId: 'debussy' },
      rhythm: { engineId: 'greek_rebetiko', presetId: 'zeibekiko_9_8', contextKeys: [] },
    });
    expect(ctx.harmonicKeys).toEqual(['hv:debussy']);
    expect(ctx.rhythmKeys).toEqual(['gr:core', 'gr:zeibekiko_9_8']);
    expect(ctx.combinedKeys).toEqual(['hv:debussy', 'gr:core', 'gr:zeibekiko_9_8']);
  });

  it('buildGenerationContext with only harmonic returns empty rhythmKeys', () => {
    const ctx = buildGenerationContext({
      harmonic: { voiceId: 'bill_evans' },
      rhythm: { engineId: null, presetId: null, contextKeys: [] },
    });
    expect(ctx.harmonicKeys).toEqual(['hv:bill_evans']);
    expect(ctx.rhythmKeys).toEqual([]);
  });

  it('buildGenerationContext with only rhythm returns empty harmonicKeys', () => {
    const ctx = buildGenerationContext({
      harmonic: { voiceId: null },
      rhythm: { engineId: 'brazilian', presetId: null, contextKeys: [] },
    });
    expect(ctx.harmonicKeys).toEqual([]);
    expect(ctx.rhythmKeys).toEqual(['br:core']);
  });

  it("resolveRhythmContextKeys('brazilian', 'bossa-nova-basic') returns br: keys", () => {
    expect(resolveRhythmContextKeys('brazilian', 'bossa-nova-basic')).toEqual([
      'br:core',
      'br:bossa-nova-basic',
    ]);
  });

  it("resolveRhythmContextKeys('bartok_bulgarian_aksak', 'b1') returns bg: keys", () => {
    expect(resolveRhythmContextKeys('bartok_bulgarian_aksak', 'b1')).toEqual(['bg:core', 'bg:b1']);
  });

  it('migrateLegacySongwriterValue(bartok_bulgarian_aksak) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('bartok_bulgarian_aksak');
    expect(m.rhythm?.engineId).toBe('bartok_bulgarian_aksak');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it("resolveRhythmContextKeys('free_proportional', 'dutilleux') returns fp: keys", () => {
    expect(resolveRhythmContextKeys('free_proportional', 'dutilleux')).toEqual(['fp:core', 'fp:dutilleux']);
  });

  it('migrateLegacySongwriterValue(free_proportional) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('free_proportional');
    expect(m.rhythm?.engineId).toBe('free_proportional');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it("resolveRhythmContextKeys('baroque_dance', 'bd1') returns bd: keys", () => {
    expect(resolveRhythmContextKeys('baroque_dance', 'bd1')).toEqual(['bd:core', 'bd:bd1']);
  });

  it('migrateLegacySongwriterValue(baroque_dance) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('baroque_dance');
    expect(m.rhythm?.engineId).toBe('baroque_dance');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it("resolveRhythmContextKeys('reich_phasing_grid', 'rp12') returns rp: keys", () => {
    expect(resolveRhythmContextKeys('reich_phasing_grid', 'rp12')).toEqual(['rp:core', 'rp:rp12']);
  });

  it('migrateLegacySongwriterValue(reich_phasing_grid) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('reich_phasing_grid');
    expect(m.rhythm?.engineId).toBe('reich_phasing_grid');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it("resolveRhythmContextKeys('viennese_waltz', 'standard') returns vw: keys", () => {
    expect(resolveRhythmContextKeys('viennese_waltz', 'standard')).toEqual(['vw:core', 'vw:standard']);
  });

  it('migrateLegacySongwriterValue(viennese_waltz) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('viennese_waltz');
    expect(m.rhythm?.engineId).toBe('viennese_waltz');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it("resolveRhythmContextKeys('jewish_klezmer', 'kl_chain') returns kl: keys", () => {
    expect(resolveRhythmContextKeys('jewish_klezmer', 'kl_chain')).toEqual(['kl:core', 'kl:kl_chain']);
  });

  it('migrateLegacySongwriterValue(jewish_klezmer) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('jewish_klezmer');
    expect(m.rhythm?.engineId).toBe('jewish_klezmer');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it('resolveHarmonicContextKeys(ennio_morricone) includes hv + research tags', () => {
    expect(MORRICONE_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('ennio_morricone')).toEqual([
      'hv:ennio_morricone',
      ...MORRICONE_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(bernard_herrmann) includes hv + research tags', () => {
    expect(HERRMANN_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('bernard_herrmann')).toEqual([
      'hv:bernard_herrmann',
      ...HERRMANN_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(quincy_jones_film) includes hv + research tags', () => {
    expect(QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('quincy_jones_film')).toEqual([
      'hv:quincy_jones_film',
      ...QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(angelo_badalamenti) includes hv + research tags', () => {
    expect(BADALAMENTI_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('angelo_badalamenti')).toEqual([
      'hv:angelo_badalamenti',
      ...BADALAMENTI_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(john_coltrane) returns hv + 14 research tags', () => {
    expect(JOHN_COLTRANE_HARMONIC_STYLE_KEYS).toHaveLength(14);
    expect(resolveHarmonicContextKeys('john_coltrane')).toEqual([
      'hv:john_coltrane',
      ...JOHN_COLTRANE_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(gil_evans) returns hv + 15 research tags', () => {
    expect(GIL_EVANS_HARMONIC_STYLE_KEYS).toHaveLength(15);
    expect(resolveHarmonicContextKeys('gil_evans')).toEqual([
      'hv:gil_evans',
      ...GIL_EVANS_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(maria_schneider) returns hv + 15 research tags', () => {
    expect(MARIA_SCHNEIDER_HARMONIC_STYLE_KEYS).toHaveLength(15);
    expect(resolveHarmonicContextKeys('maria_schneider')).toEqual([
      'hv:maria_schneider',
      ...MARIA_SCHNEIDER_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(wayne_shorter) returns hv + 16 research-grounded tags', () => {
    expect(WAYNE_SHORTER_HARMONIC_STYLE_KEYS).toHaveLength(16);
    expect(resolveHarmonicContextKeys('wayne_shorter')).toEqual([
      'hv:wayne_shorter',
      ...WAYNE_SHORTER_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(henry_threadgill) returns hv + 16 interval-system tags', () => {
    expect(HENRY_THREADGILL_HARMONIC_STYLE_KEYS).toHaveLength(16);
    expect(resolveHarmonicContextKeys('henry_threadgill')).toEqual([
      'hv:henry_threadgill',
      ...HENRY_THREADGILL_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(charles_mingus) returns hv + 16 blues-suite tags', () => {
    expect(CHARLES_MINGUS_HARMONIC_STYLE_KEYS).toHaveLength(16);
    expect(resolveHarmonicContextKeys('charles_mingus')).toEqual([
      'hv:charles_mingus',
      ...CHARLES_MINGUS_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(pat_metheny) returns hv + 16 research tags', () => {
    expect(PAT_METHENY_HARMONIC_STYLE_KEYS).toHaveLength(16);
    expect(resolveHarmonicContextKeys('pat_metheny')).toEqual([
      'hv:pat_metheny',
      ...PAT_METHENY_HARMONIC_STYLE_KEYS,
    ]);
    expect(HARMONIC_VOICE_LABELS.pat_metheny).toBe('Pat Metheny');
  });
});
