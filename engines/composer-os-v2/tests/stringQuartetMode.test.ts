/**
 * String quartet mode — runStringQuartetMode + preset + registry (Prompt 6/7).
 */

import { createRunManifest } from '../core/run-ledger/createRunManifest';
import { invokeModule } from '../core/module-invocation/invokeModule';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';
import { stringQuartetPreset } from '../presets/stringQuartetPreset';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import { runSongMode } from '../core/song-mode/runSongMode';
import { getPresets } from '../app-api/getPresets';

export function runStringQuartetModeTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok:
      stringQuartetPreset.id === 'string_quartet' &&
      stringQuartetPreset.stringQuartetMetadata?.ensembleFamily === 'string_quartet' &&
      stringQuartetPreset.stringQuartetMetadata?.sectionPlanReady === true,
    name: 'string_quartet preset loads as planning preset',
  });

  out.push({
    ok: getPresets().some((p) => p.id === 'string_quartet' && p.supported),
    name: 'getPresets includes supported string_quartet',
  });

  const r = runStringQuartetMode({ seed: 60_001, title: 'Test String Quartet Plan' });
  out.push({
    ok: r.validation.ok && r.manifestHints.stringQuartetOrchestrationReady === true,
    name: 'runStringQuartetMode produces valid planning + manifest hints',
  });

  out.push({
    ok:
      r.manifestHints.stringQuartetFormSequence.includes('statement') &&
      r.manifestHints.stringQuartetFormSequence.includes('coda') &&
      r.manifestHints.stringQuartetFormSequence.includes('contrast'),
    name: 'form sequence includes statement, contrast, coda',
  });

  const mod = invokeModule('string_quartet_plan', { seed: 88 }) as ReturnType<typeof runStringQuartetMode>;
  out.push({
    ok: mod.orchestrationPlan.presetId === 'string_quartet',
    name: 'invokeModule string_quartet_plan returns orchestration result',
  });

  const m = createRunManifest({
    version: '2.0.0',
    seed: 1,
    presetId: 'string_quartet',
    activeModules: [],
    feelMode: 'straight',
    instrumentProfiles: ['clean_electric_guitar', 'acoustic_upright_bass'],
    readinessScores: { release: 0, mx: 0 },
    validationPassed: true,
    timestamp: new Date().toISOString(),
    stringQuartetFormSequence: ['statement', 'coda'],
    stringQuartetOrchestrationReady: true,
    stringQuartetModuleIds: ['string_quartet_plan'],
  });
  out.push({
    ok: m.stringQuartetFormSequence?.length === 2 && m.stringQuartetOrchestrationReady === true,
    name: 'run manifest accepts string quartet optional fields',
  });

  const bb = runBigBandMode({ seed: 12_345 });
  const sm = runSongMode({ seed: 12_345 });
  out.push({
    ok: bb.validation.ok && sm.validation.valid,
    name: 'regression: Big Band + Song Mode runs still validate',
  });

  return out;
}
