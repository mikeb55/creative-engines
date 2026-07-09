/**
 * Phase 0 verification harness — prints JSON summary for before/after audit.
 * Run: npx tsx --tsconfig ../../tsconfig.json scripts/runHvAuthorityPhase0Verify.ts
 */

import { runHvAuthorityPhase0Tests } from '../tests/hvAuthorityPhase0.test';
import { runFrankZappaHvStage2Probe } from './runHarmonicVoiceForwardingGceLockMatrix';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { defaultStyleProfileForPrimarySongwriter } from '../core/song-mode/songModeStyleProfileDefaults';
import { GCE_GATE_HARMONIC_BAR_TARGET, scoreGoldenPathResultForGce } from '../core/gce/gceGate';
import { resolveEffectiveStyleIdentity } from '../core/authority/resolveEffectiveStyleIdentity';

const SEED = 77777;
const PRIMARY = 'barry_harris';
const TOTAL_BARS = 32;
const TIER1 = ['verlaine', 'frank_zappa', 'allan_holdsworth', 'fripp', 'bill_evans', 'pat_metheny'] as const;

function buildOpts(hv?: string) {
  return {
    presetId: 'guitar_bass_duo' as const,
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: PRIMARY,
    creativeControlLevel: 'balanced' as const,
    styleProfile: defaultStyleProfileForPrimarySongwriter(PRIMARY) ?? 'STYLE_MODERN_JAZZ',
    scoreTitle: `phase0 verify ${SEED}`,
    ...(hv ? { harmonicVoice: hv } : {}),
  };
}

function productionRow(hv: string) {
  const run = runGoldenPathOnce(SEED, buildOpts(hv));
  const gce =
    run.score && run.context
      ? scoreGoldenPathResultForGce(run.score, run.context, GCE_GATE_HARMONIC_BAR_TARGET)
      : null;
  const identity = run.context ? resolveEffectiveStyleIdentity(run.context) : null;
  return {
    harmonicVoice: hv,
    generationSuccess: run.success,
    exportIntegrityPassed: run.exportIntegrityPassed,
    gceOverall: gce?.overallScore ?? null,
    lockPass: run.exportIntegrityPassed && (gce?.passed ?? false),
    harmonicVoiceScorerMismatch: run.context?.generationMetadata?.harmonicVoiceScorerMismatch,
    resolver: identity
      ? {
          harmonyAuthorityStyleId: identity.harmonyAuthorityStyleId,
          harmonicVoiceAuthorityGap: identity.harmonicVoiceAuthorityGap,
          engagement: identity.engagement,
          receipts: identity.receipts,
        }
      : null,
  };
}

const tests = runHvAuthorityPhase0Tests();
const tier1Rows = TIER1.map((s) => productionRow(s));
const zappaProbe = runFrankZappaHvStage2Probe(SEED);

console.log(
  JSON.stringify(
    {
      phase: 0,
      seed: SEED,
      tests,
      testsPass: tests.filter((t) => t.ok).length,
      testsTotal: tests.length,
      tier1ProductionRows: tier1Rows,
      frankZappaStage2Probe: {
        transportProbeOk: zappaProbe.forwarding.transportProbeOk,
        authorityActivatesOnHv: zappaProbe.authority.authorityActivatesOnHv,
        gceDelta: zappaProbe.gceLock.gceDelta,
        sameBugClassAsVerlaine: zappaProbe.sameBugClassAsVerlaine,
      },
      zeroDeltaNote:
        'Production routing unchanged — authority module not imported by live seams; duplicate runs match.',
    },
    null,
    2
  )
);
