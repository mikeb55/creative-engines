/**
 * Big Band mode — runBigBandMode + preset + registry (Prompt 5/7).
 */

import { createRunManifest } from '../core/run-ledger/createRunManifest';
import { invokeModule } from '../core/module-invocation/invokeModule';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import { bigBandPreset } from '../presets/bigBandPreset';

export function runBigBandModeTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok:
      bigBandPreset.id === 'big_band' &&
      bigBandPreset.bigBandMetadata?.ensembleFamily === 'big_band' &&
      bigBandPreset.bigBandMetadata.sectionPlanReady === true,
    name: 'big_band preset loads as planning preset',
  });

  const r = runBigBandMode({ seed: 50_001, title: 'Test Big Band Plan' });
  out.push({
    ok: r.validation.ok && r.manifestHints.bigBandOrchestrationReady === true,
    name: 'runBigBandMode produces valid planning + manifest hints',
  });

  out.push({
    ok:
      r.manifestHints.bigBandFormSequence.includes('shout_chorus') &&
      r.manifestHints.bigBandFormSequence.includes('ending'),
    name: 'shout_chorus and ending in form sequence',
  });

  const mod = invokeModule('big_band_plan', { seed: 77 }) as ReturnType<typeof runBigBandMode>;
  out.push({
    ok: mod.orchestrationPlan.presetId === 'big_band',
    name: 'invokeModule big_band_plan returns orchestration result',
  });

  const m = createRunManifest({
    version: '2.0.0',
    seed: 1,
    presetId: 'big_band',
    activeModules: [],
    feelMode: 'swing',
    instrumentProfiles: ['clean_electric_guitar', 'acoustic_upright_bass'],
    readinessScores: { release: 0, mx: 0 },
    validationPassed: true,
    timestamp: new Date().toISOString(),
    bigBandFormSequence: ['intro', 'melody_head'],
    bigBandOrchestrationReady: true,
    bigBandModuleIds: ['big_band_plan'],
  });
  out.push({
    ok: m.bigBandFormSequence?.length === 2 && m.bigBandOrchestrationReady === true,
    name: 'run manifest accepts big band optional fields',
  });

  return out;
}
