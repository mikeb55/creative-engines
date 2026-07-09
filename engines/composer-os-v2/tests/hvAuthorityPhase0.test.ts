/**
 * Phase 0 — HV authority abstraction infrastructure verification.
 * NOT registered in runSmokeTests until Phase 1 wiring.
 *
 * Run: npx tsx --tsconfig ../../tsconfig.json tests/hvAuthorityPhase0.test.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { defaultStyleProfileForPrimarySongwriter } from '../core/song-mode/songModeStyleProfileDefaults';
import {
  GCE_GATE_HARMONIC_BAR_TARGET,
  scoreGoldenPathResultForGce,
} from '../core/gce/gceGate';
import { resolveGceScorerRouting } from '../core/gce/resolveEffectiveGceStyle';
import { classifyAuthoritativeLayerForBar } from '../core/harmony/harmonySpineProvider';
import { getCapabilityLevel } from '../core/authority/harmonicVoiceCapabilityRegistry';
import {
  PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY,
  resolveEffectiveStyleIdentity,
} from '../core/authority/resolveEffectiveStyleIdentity';
import { resolveHarmonyAuthority } from '../core/authority/adapters/harmonyAuthorityAdapter';
import { resolveGceScorerStyle } from '../core/authority/adapters/gceScorerAdapter';
import { runFrankZappaHvStage2Probe } from '../scripts/runHarmonicVoiceForwardingGceLockMatrix';
import { runGceScorerRoutingTests } from './gceScorerRouting.test';
import type { CompositionContext } from '../core/compositionContext';

const HV_PROBE_PRIMARY = 'barry_harris';
const TOTAL_BARS = 32;
const SEED = 77777;

const TIER1_HV_STYLES = [
  'verlaine',
  'frank_zappa',
  'allan_holdsworth',
  'fripp',
  'bill_evans',
  'pat_metheny',
] as const;

const LIVE_SEAM_FILES = [
  'core/harmony/harmonyResolution.ts',
  'core/gce/gceGate.ts',
  'core/goldenPath/generateGoldenPathDuoScore.ts',
  'core/goldenPath/runGoldenPath.ts',
  'core/gce/resolveEffectiveGceStyle.ts',
  'core/goldenPath/customLockedHarmonyRouting.ts',
];

function buildGbdOpts(primary: string, harmonicVoice?: string) {
  return {
    presetId: 'guitar_bass_duo' as const,
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: primary,
    creativeControlLevel: 'balanced' as const,
    styleProfile: defaultStyleProfileForPrimarySongwriter(primary) ?? 'STYLE_MODERN_JAZZ',
    scoreTitle: `hv authority phase0 seed ${SEED}`,
    ...(harmonicVoice ? { harmonicVoice } : {}),
  };
}

type RunMetrics = {
  generationSuccess: boolean;
  exportIntegrityPassed: boolean;
  gceOverall: number | null;
  lockPass: boolean;
  harmonicVoice: string | undefined;
  harmonyContextStyleId: string | undefined;
  spineSliceIdBar2: string | undefined;
  harmonicVoiceScorerMismatch: string | undefined;
};

function scoreRun(primary: string, harmonicVoice?: string): RunMetrics {
  const result = runGoldenPathOnce(SEED, buildGbdOpts(primary, harmonicVoice));
  const md = result.context?.generationMetadata;
  const spineBar2 = result.context
    ? classifyAuthoritativeLayerForBar(2, result.context)
    : undefined;
  let gceOverall: number | null = null;
  let lockPass = false;
  if (result.score && result.context) {
    const gate = scoreGoldenPathResultForGce(
      result.score,
      result.context,
      GCE_GATE_HARMONIC_BAR_TARGET
    );
    gceOverall = gate.overallScore;
    lockPass = result.exportIntegrityPassed && gate.passed;
  }
  return {
    generationSuccess: result.success,
    exportIntegrityPassed: result.exportIntegrityPassed,
    gceOverall,
    lockPass,
    harmonicVoice: md?.harmonicVoice,
    harmonyContextStyleId: result.context?.harmonyContext?.styleId,
    spineSliceIdBar2: spineBar2?.sliceId,
    harmonicVoiceScorerMismatch: md?.harmonicVoiceScorerMismatch,
  };
}

function metricsEqual(a: RunMetrics, b: RunMetrics): boolean {
  return (
    a.generationSuccess === b.generationSuccess &&
    a.exportIntegrityPassed === b.exportIntegrityPassed &&
    a.gceOverall === b.gceOverall &&
    a.lockPass === b.lockPass &&
    a.harmonicVoice === b.harmonicVoice &&
    a.harmonyContextStyleId === b.harmonyContextStyleId &&
    a.spineSliceIdBar2 === b.spineSliceIdBar2 &&
    a.harmonicVoiceScorerMismatch === b.harmonicVoiceScorerMismatch
  );
}

function testPhase0HarmonyAuthorityAlwaysPrimary(): boolean {
  const result = runGoldenPathOnce(
    SEED,
    buildGbdOpts(HV_PROBE_PRIMARY, 'frank_zappa')
  );
  if (!result.context) return false;
  const identity = resolveEffectiveStyleIdentity(result.context);
  const harmony = resolveHarmonyAuthority(result.context);
  return (
    PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY === true &&
    identity.harmonyAuthorityStyleId === HV_PROBE_PRIMARY &&
    harmony.harmonyAuthorityStyleId === HV_PROBE_PRIMARY &&
    identity.harmonicVoiceAuthorityGap === true
  );
}

function testRegistrySeedRows(): boolean {
  return (
    getCapabilityLevel('verlaine', 'harmony') === 'hv_full' &&
    getCapabilityLevel('frank_zappa', 'gce_scorer') === 'hv_full' &&
    getCapabilityLevel('bill_evans', 'harmony') === 'none' &&
    getCapabilityLevel('unknown_style_xyz', 'harmony') === 'none'
  );
}

function testEngagedNotMerelyRequested(): boolean {
  const ctx = {
    presetId: 'guitar_bass_duo',
    form: { totalBars: 32, sections: [{ label: 'A', startBar: 1, length: 32 }] },
    generationMetadata: {
      songwriterStyleId: 'barry_harris',
      harmonicVoice: 'frank_zappa',
    },
  } as CompositionContext;
  const identity = resolveEffectiveStyleIdentity(ctx);
  return identity.harmonicVoiceRequested && !identity.engagement.harmony;
}

function testNoLiveSeamImportsAuthority(): boolean {
  const root = path.join(__dirname, '..');
  for (const rel of LIVE_SEAM_FILES) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    if (/core\/authority|from ['"].*authority/.test(src)) return false;
  }
  return true;
}

function testDeterministicProductionMetricsUnchanged(): boolean {
  for (const style of TIER1_HV_STYLES) {
    const a = scoreRun(HV_PROBE_PRIMARY, style);
    const b = scoreRun(HV_PROBE_PRIMARY, style);
    if (!metricsEqual(a, b)) return false;
  }
  const primaryA = scoreRun(HV_PROBE_PRIMARY);
  const primaryB = scoreRun(HV_PROBE_PRIMARY);
  return metricsEqual(primaryA, primaryB);
}

function testGceScorerRoutingSuiteUnchanged(): boolean {
  return runGceScorerRoutingTests().every((r) => r.ok);
}

function testFrankZappaStage2ProbeBaseline(): boolean {
  const probe = runFrankZappaHvStage2Probe(SEED);
  const hv = probe.gceLock.barryPrimaryZappaHv;
  if (!hv || hv.gceOverall == null) return false;
  return probe.forwarding.transportProbeOk && !probe.authority.authorityActivatesOnHv;
}

function testResolverDiagnosticsIsolatedFromProductionRouting(): boolean {
  const result = runGoldenPathOnce(
    SEED,
    buildGbdOpts(HV_PROBE_PRIMARY, 'frank_zappa')
  );
  if (!result.context) return false;
  const mdBefore = JSON.stringify(result.context.generationMetadata);
  const productionRouting = resolveGceScorerRouting(result.context);
  const adapterDecision = resolveGceScorerStyle(result.context);
  const identity = resolveEffectiveStyleIdentity(result.context);
  resolveHarmonyAuthority(result.context);
  const mdAfter = JSON.stringify(result.context.generationMetadata);
  return (
    productionRouting.effectiveStyleId === HV_PROBE_PRIMARY &&
    identity.harmonyAuthorityStyleId === HV_PROBE_PRIMARY &&
    adapterDecision.gceEffectiveStyleId === HV_PROBE_PRIMARY &&
    !adapterDecision.harmonicVoiceScorerEngaged &&
    identity.receipts.some((r) => r.startsWith('phase0:')) &&
    mdBefore === mdAfter
  );
}

export function runHvAuthorityPhase0Tests(): { name: string; ok: boolean }[] {
  return [
    ['Phase0 - harmonyAuthorityStyleId stays primary on HV run', testPhase0HarmonyAuthorityAlwaysPrimary],
    ['Phase0 - registry seed rows + missing fallback none', testRegistrySeedRows],
    ['Phase0 - engaged != merely harmonicVoice set', testEngagedNotMerelyRequested],
    ['Phase0 - live seam files do not import authority', testNoLiveSeamImportsAuthority],
    ['Phase0 - deterministic production metrics unchanged (6 Tier1 HV)', testDeterministicProductionMetricsUnchanged],
    ['Phase0 - gceScorerRouting suite unchanged', testGceScorerRoutingSuiteUnchanged],
    ['Phase0 - frank_zappa Stage2 probe baseline intact', testFrankZappaStage2ProbeBaseline],
    ['Phase0 - resolver diagnostics isolated from production GCE routing', testResolverDiagnosticsIsolatedFromProductionRouting],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runHvAuthorityPhase0Tests();
  let failed = 0;
  for (const row of rows) {
    console.log(row.ok ? 'PASS' : 'FAIL', row.name);
    if (!row.ok) failed++;
  }
  console.log(`\nPhase0: ${rows.length - failed}/${rows.length} PASS`);
  process.exit(failed > 0 ? 1 : 0);
}
