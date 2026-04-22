import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

function testSongModePilotOffVsSoftVsStrongMetadata(): boolean {
  const seed = 50021;
  const baseOpts = {
    presetId: 'guitar_bass_duo' as const,
    totalBars: 32 as const,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'donald_fagen',
  };
  const off = runGoldenPathOnce(seed, { ...baseOpts, motifAuthorityLevel: 'off' });
  const soft = runGoldenPathOnce(seed, { ...baseOpts, motifAuthorityLevel: 'soft' });
  const strong = runGoldenPathOnce(seed, { ...baseOpts, motifAuthorityLevel: 'strong' });
  if (!off.success || !soft.success || !strong.success) return false;
  const mOff = off.context.generationMetadata;
  const mSoft = soft.context.generationMetadata;
  const mStrong = strong.context.generationMetadata;
  return (
    mOff.motifAuthorityLevel === 'off' &&
    mSoft.motifAuthorityLevel === 'soft' &&
    mStrong.motifAuthorityLevel === 'strong' &&
    mOff.motifPlan === undefined &&
    mOff.motifFingerprint === undefined &&
    (mOff.motifDevelopmentSummary?.recurrenceCountEstimate ?? 0) === 0 &&
    (mOff.motifDevelopmentSummary?.transformationSummary?.[0] ?? '') === 'none-guaranteed' &&
    (mOff.motifDevelopmentSummary?.motifCoherence ?? 1) === 0 &&
    (mSoft.motifDevelopmentSummary?.recurrenceCountEstimate ?? 0) > 0 &&
    (mSoft.motifDevelopmentSummary?.transformationSummary ?? []).some((x) => x.startsWith('return:anchor_nudge_'))
  );
}

function testPilotManifestCarriesMotifFields(): boolean {
  const r = runGoldenPathOnce(50021, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bacharach',
    motifAuthorityLevel: 'soft',
  });
  if (!r.success) return false;
  return (
    r.runManifest?.motifAuthorityLevel === 'soft' &&
    r.runManifest?.motifDevelopmentSummary?.motifAuthorityLevel === 'soft'
  );
}

function testHybridPilotMotifLedIdentitySummary(): boolean {
  const r = runGoldenPathOnce(50021, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'wayne_shorter',
    styleStack: {
      primary: 'barry_harris',
      secondary: 'metheny',
      colour: 'triad_pairs',
      weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
    },
    motifAuthorityLevel: 'strong',
  });
  if (!r.success) return false;
  return r.context.generationMetadata.motifDevelopmentSummary?.motifLedPrimaryIdentity === true;
}

function testEcmPilotMotifSummaryPresence(): boolean {
  const r = runGoldenPathOnce(50021, {
    presetId: 'ecm_chamber',
    ecmMode: 'ECM_METHENY_QUARTET',
    totalBars: 32,
    motifAuthorityLevel: 'soft',
  });
  if (!r.success) return false;
  return (
    r.context.generationMetadata.motifAuthorityLevel === 'soft' &&
    r.context.generationMetadata.motifDevelopmentSummary?.pilotPathTag === 'ecm_chamber'
  );
}

function testGenericDuoOutOfPilotHasNoMotifPilotFields(): boolean {
  const r = runGoldenPathOnce(50021, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    motifAuthorityV1: true,
  });
  const md = r.context?.generationMetadata;
  return md.motifAuthorityLevel === undefined && md.motifDevelopmentSummary === undefined;
}

function testMotifAuthorityV1SoftOnlyOnIntendedPilotRoutes(): boolean {
  const pilot = runGoldenPathOnce(50021, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'donald_fagen',
    motifAuthorityV1: true,
  });
  const outOfScope = runGoldenPathOnce(50021, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'pat_metheny',
    motifAuthorityV1: true,
  });
  return (
    pilot.context.generationMetadata.motifAuthorityLevel === 'soft' &&
    pilot.context.generationMetadata.motifAuthorityV1 === true &&
    outOfScope.context.generationMetadata.motifAuthorityLevel === undefined &&
    outOfScope.context.generationMetadata.motifAuthorityV1 === undefined
  );
}

function testOutOfScopePresetsDoNotEmitPilotMotifSummary(): boolean {
  const presets = ['big_band', 'string_quartet', 'riff_generator'] as const;
  for (const presetId of presets) {
    const r = runGoldenPathOnce(50021, {
      presetId,
      motifAuthorityLevel: 'soft',
      motifAuthorityV1: true,
    });
    const md = r.context?.generationMetadata;
    if (md.motifAuthorityLevel !== undefined || md.motifDevelopmentSummary !== undefined || md.motifAuthorityV1 !== undefined) {
      return false;
    }
  }
  return true;
}

function testStrongModeCanForceReturnNudgeAttemptVsSoft(): boolean {
  const baseOpts = {
    presetId: 'guitar_bass_duo' as const,
    totalBars: 32 as const,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'donald_fagen',
  };
  for (let seed = 50021; seed < 50081; seed++) {
    const soft = runGoldenPathOnce(seed, { ...baseOpts, motifAuthorityLevel: 'soft' });
    const strong = runGoldenPathOnce(seed, { ...baseOpts, motifAuthorityLevel: 'strong' });
    if (!soft.success || !strong.success) continue;
    const softSummary = soft.context.generationMetadata.motifDevelopmentSummary;
    const strongSummary = strong.context.generationMetadata.motifDevelopmentSummary;
    if (!softSummary || !strongSummary) continue;
    const softAttempted = softSummary.transformationSummary.includes('return:anchor_nudge_attempted');
    const strongAttempted = strongSummary.transformationSummary.includes('return:anchor_nudge_attempted');
    if (!softAttempted && strongAttempted) {
      return true;
    }
  }
  return false;
}

export function runMotifAuthorityPilotSliceTests(): { name: string; ok: boolean }[] {
  return [
    ['Motif pilot: Song Mode off/soft/strong metadata', testSongModePilotOffVsSoftVsStrongMetadata],
    ['Motif pilot: manifest includes motif fields', testPilotManifestCarriesMotifFields],
    ['Motif pilot: hybrid summary marks motif-led identity', testHybridPilotMotifLedIdentitySummary],
    ['Motif pilot: ECM summary field present', testEcmPilotMotifSummaryPresence],
    ['Motif pilot: generic duo non-pilot emits no motif pilot fields', testGenericDuoOutOfPilotHasNoMotifPilotFields],
    ['Motif pilot: motifAuthorityV1 maps to soft only on intended routes', testMotifAuthorityV1SoftOnlyOnIntendedPilotRoutes],
    ['Motif pilot: out-of-scope presets emit no motif pilot summary', testOutOfScopePresetsDoNotEmitPilotMotifSummary],
    ['Motif pilot: strong can force return nudge attempt where soft can skip', testStrongModeCanForceReturnNudgeAttemptVsSoft],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
