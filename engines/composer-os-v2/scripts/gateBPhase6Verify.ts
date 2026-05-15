/**
 * Phase 6 Gate B — quartet feature pipeline + duo routing invariants.
 * Run: npx ts-node --project ../../tsconfig.json scripts/gateBPhase6Verify.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { deriveSectionWritingIntent } from '../core/counterpoint/deriveSectionWritingIntent';
import {
  LINE_FIRST_DUO_ENGINE_VRB_ID_SET,
  LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET,
} from '../core/goldenPath/lineFirstDuoEngineVrbIds';
import { postProcessDuoAbstractGuitar } from '../core/goldenPath/duoAbstractLineComposerTransforms';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { planBackgroundsRhythm, planSoliRhythm, type HarmonyBar } from '../core/counterpoint/planSoliAndBackgroundsRhythm';
import type { QuartetFeatures, VoiceActivityProfile } from '../core/counterpoint/quartetFeatureTypes';
import { createNote } from '../core/score-model/scoreEventBuilder';
import type { MeasureModel } from '../core/score-model/scoreModelTypes';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function vp(voiceId: 'S' | 'A' | 'T' | 'B'): VoiceActivityProfile {
  return {
    voiceId,
    meanNoteDurationBeats: 2,
    attackRatePerBar: 1.2,
    restRatio: 0.1,
    leapRatio: 0.35,
    stepRatio: 0.65,
    sustainedRatio: 0.4,
    registerCenterMidi: 60,
    registerSpanSemitones: 14,
    independenceScore: 0.72,
    salienceScore: 0.55,
  };
}

function highIndependenceFeatures(): QuartetFeatures {
  return {
    phraseId: 'gateb-p0',
    startBeat: 0,
    endBeat: 4,
    textureClass: 'contrapuntal',
    motionProfile: 'mixed',
    harmonicRhythmPerBar: 0.25,
    verticalChangeRate: 0.4,
    rhythmicDensity: 0.45,
    syncopationScore: 0.25,
    contrapuntalIndependence: 0.72,
    imitationScore: 0.05,
    homorhythmScore: 0.25,
    chordalStabilityScore: 0.35,
    registralSpreadSemitones: 22,
    crossingCount: 6,
    convergenceScore: 0.45,
    divergenceScore: 0.55,
    sustainedVoicesCount: 2,
    activeVoicesCount: 4,
    pedalPresence: false,
    pedalVoiceIds: [],
    cadenceStrength: 'weak',
    arrivalBeatOffsets: [],
    accentBeats: [],
    primaryLineVoiceIds: ['S', 'A'],
    secondaryLineVoiceIds: ['T', 'B'],
    voiceProfiles: [vp('S'), vp('A'), vp('T'), vp('B')],
  };
}

function checkIndependence(): boolean {
  const bundle = getVoiceRuleBundle('bob_brookmeyer');
  const feats = [highIndependenceFeatures()];
  if (feats[0]!.contrapuntalIndependence <= 0.6) return false;
  const intents = deriveSectionWritingIntent(feats, bundle, undefined);
  const intent = intents[0];
  if (!intent) return false;
  const n = intent.assignments.filter((a) => a.lineDerived).length;
  return n >= 2;
}

function checkRouting(): boolean {
  for (const id of ['bob_brookmeyer', 'bartok'] as const) {
    if (!LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has(id)) return false;
    if (LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET.has(id)) return false;
  }
  const r = runGoldenPathOnce(91001, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    harmonyMode: 'builtin',
    longFormEnabled: true,
  });
  const ctx = r.context;
  if (!ctx) return false;
  const m: MeasureModel = {
    index: 1,
    events: [createNote(60, 0, 2, 1), createNote(64, 2, 2, 1)],
  };
  const snap = JSON.stringify(m.events);
  for (const id of ['bob_brookmeyer', 'bartok'] as const) {
    const m2: MeasureModel = { index: 1, events: JSON.parse(snap) };
    postProcessDuoAbstractGuitar(id, m2, ctx, 1, 40, 90, 4);
    if (JSON.stringify(m2.events) !== snap) return false;
  }
  return true;
}

function checkAntiCollapse(): boolean {
  const bundle = getVoiceRuleBundle('bob_brookmeyer');
  const feats = [highIndependenceFeatures()];
  const intents = deriveSectionWritingIntent(feats, bundle, undefined);
  const intent = {
    ...intents[0]!,
    antiCollapse: { ...intents[0]!.antiCollapse, forbidFullEnsembleChordHits: true },
  };
  const bar: HarmonyBar = { barIndex: 0, densityClass: 'busy' };
  const soli = planSoliRhythm(intent, bar, bundle);
  const bg = planBackgroundsRhythm(intent, bar, bundle);
  return !soli.fullEnsembleAttackCluster && !bg.fullEnsembleAttackCluster;
}

function checkSystemSmoke(): boolean {
  try {
    const out = execSync('npm run test:composer-smoke', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return /Passed:\s*248/.test(out) && /Failed:\s*0/.test(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return /Passed:\s*248/.test(msg) && /Failed:\s*0/.test(msg);
  }
}

function main(): void {
  const checks: Array<{ name: string; ok: boolean }> = [
    { name: 'INDEPENDENCE', ok: checkIndependence() },
    { name: 'ROUTING', ok: checkRouting() },
    { name: 'ANTI-COLLAPSE', ok: checkAntiCollapse() },
    { name: 'SYSTEM', ok: checkSystemSmoke() },
  ];
  let bad = 0;
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}: ${c.name}`);
    if (!c.ok) bad++;
  }
  if (bad > 0) {
    process.exit(1);
  }
  console.log('Gate B Phase 6: all checks passed');
}

main();
