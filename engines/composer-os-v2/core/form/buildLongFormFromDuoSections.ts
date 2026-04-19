/**
 * Builds 16/32-bar CompositionContext for Duo long-form — wraps harmony planning; does not replace the 8-bar builder.
 */

import type { CompositionContext } from '../compositionContext';
import type { HarmonyPlan } from '../primitives/harmonyTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { planSectionRoles } from '../section-roles/sectionRolePlanner';
import type { SectionRole } from '../section-roles/sectionRoleTypes';
import { planDensityCurve } from '../density/densityCurvePlanner';
import { planGuitarRegisterMap, planBassRegisterMap } from '../register-map/registerMapPlanner';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import { buildHarmonyPlanFromBars, buildChordSymbolPlanFromBars } from '../harmony/chordProgressionParser';
import { generateModulationPlan } from '../modulation/modulationPlanner';
import { transposeChordSymbol } from '../modulation/modulationTransitions';
import type { ModulationPlan } from '../modulation/modulationPlanTypes';
import { validateModulationPlan } from '../modulation/modulationValidation';
import {
  buildDuoLongFormPlanForBarCount,
  buildDuoLongFormPlan16,
} from './duoLongFormPlanner';
import { LONG_FORM_DUO_BARS } from './longFormRouteResolver';
import { assertLockedHarmonyContractsToneParity, buildLockedHarmonyBarContracts } from '../harmony/harmonyBarContract';
import { wybleVoiceLayoutForPreset } from '../wyble/wybleVoiceLayoutForPreset';

const BUILTIN_EIGHT: readonly string[] = ['Dmin9', 'G13', 'Cmaj9', 'A7alt', 'Dmin9', 'G13', 'Cmaj9', 'A7alt'];

const LONG_FORM_ROLE_MAP_16: Record<string, SectionRole> = {
  A: 'statement',
  B: 'contrast',
};

function build32ChordBars(mod: ModulationPlan, seed: number): string[] {
  const bars: string[] = [];
  if (!mod.active || mod.sections.length < 4) {
    for (let c = 0; c < 4; c++) {
      bars.push(...BUILTIN_EIGHT);
    }
    return bars;
  }
  for (const sec of mod.sections) {
    const off = sec.semitoneOffset;
    for (let i = 0; i < 8; i++) {
      bars.push(transposeChordSymbol(BUILTIN_EIGHT[i], off));
    }
  }
  return bars;
}

export interface BuildDuoLongFormContextOptions {
  parsedChordBars8?: string[];
  /** 16-bar mid-form, or 32–64-bar long-form (steps of 8). Default 32. */
  targetTotalBars?: number;
  presetId?: string;
}

function duoSectionRoleMapFromPlan(plan: ReturnType<typeof buildDuoLongFormPlanForBarCount>): Record<string, SectionRole> {
  return Object.fromEntries(plan.sections.map((s) => [s.label, s.role])) as Record<string, SectionRole>;
}

function tileBuiltinEightToLength(eight: readonly string[], target: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < target; i++) {
    out.push(eight[i % eight.length]!);
  }
  return out;
}

/** Builtin long-form chords: derive a 32-bar baseline then repeat to `target` (32–64). */
function expandBuiltinLongFormBars(mod: ModulationPlan, seed: number, target: number): string[] {
  const b32 = build32ChordBars(mod, seed);
  if (target <= 32) return b32.slice(0, target);
  const out: string[] = [];
  for (let i = 0; i < target; i++) {
    out.push(b32[i % 32]!);
  }
  return out;
}

/**
 * Long-form Duo with **exact** user chords (one symbol per bar) — 16–64 bars in steps of 8.
 */
export function buildDuoLongFormCompositionContextFromBars(
  seed: number,
  bars: string[],
  opts?: { chordProgressionInputRaw?: string; presetId?: string }
): { context: CompositionContext; modulationPlan: ModulationPlan } {
  const n = bars.length;
  if (n % 8 !== 0 || n < 16 || n > 64) {
    throw new Error(
      `buildDuoLongFormCompositionContextFromBars: expected 16–64 bars in steps of 8, got ${n}`
    );
  }
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const lf = buildDuoLongFormPlanForBarCount(n);
  const form = {
    sections: lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: n,
  };

  const modulationPlan = generateModulationPlan(seed, n);
  modulationPlan.active = false;

  const harmony: HarmonyPlan = buildHarmonyPlanFromBars(bars);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(bars);
  const phrase = { segments: form.sections.map((s) => ({ ...s, density: undefined })), totalBars: n };

  const roleMap = duoSectionRoleMapFromPlan(lf);
  const sectionRoles = planSectionRoles(form.sections, roleMap);
  const densityPlan = planDensityCurve(sectionRoles, n);
  const densityCurve = { segments: densityPlan.segments, totalBars: n };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [40, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [28, 55],
    },
  };

  const rehearsalMarkPlan = {
    marks: lf.sections.map((s) => ({ label: s.label, bar: s.startBar })),
  };

  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });

  const raw = opts?.chordProgressionInputRaw?.trim();

  const lockedHarmonyBarContracts = buildLockedHarmonyBarContracts(bars);
  assertLockedHarmonyContractsToneParity(lockedHarmonyBarContracts);

  const context: CompositionContext = {
    systemVersion: '2.0.0',
    presetId: opts?.presetId ?? 'guitar_bass_duo',
    seed,
    form,
    feel,
    harmony,
    motif: { activeMotifs: [], variants: {} },
    phrase,
    register,
    density: densityCurve,
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan,
    rehearsalMarkPlan,
    lockedHarmonyBarsRaw: [...bars],
    lockedHarmonyBarContracts,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: 'custom',
      customHarmonyLocked: true,
      progressionMode: 'custom',
      customChordProgressionSummary: bars.join(' | '),
      parsedCustomProgressionBars: [...bars],
      chordProgressionInputRaw: raw && raw.length > 0 ? raw : undefined,
      builtInHarmonyFallbackOccurred: false,
      longFormDuo: true,
      modulationPlanActive: false,
      totalBars: n,
      wybleVoiceLayout: wybleVoiceLayoutForPreset(opts?.presetId ?? 'guitar_bass_duo'),
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };

  return { context, modulationPlan };
}

/** @deprecated Prefer {@link buildDuoLongFormCompositionContextFromBars} */
export function buildDuoLongFormCompositionContextFromBars32(
  seed: number,
  bars32: string[],
  opts?: { chordProgressionInputRaw?: string; presetId?: string }
): { context: CompositionContext; modulationPlan: ModulationPlan } {
  return buildDuoLongFormCompositionContextFromBars(seed, bars32, opts);
}

export function buildDuoLongFormCompositionContext(
  seed: number,
  options?: BuildDuoLongFormContextOptions & { presetId?: string }
): { context: CompositionContext; modulationPlan: ModulationPlan } {
  const target = options?.targetTotalBars ?? 32;
  if (target === 16) {
    const preset = guitarBassDuoPreset;
    const feel = preset.defaultFeel;
    const lf = buildDuoLongFormPlan16();
    const form = {
      sections: lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
      totalBars: 16,
    };

    const modulationPlan = generateModulationPlan(seed, 16);
    const v = validateModulationPlan(modulationPlan);
    if (!v.valid) {
      modulationPlan.active = false;
    }

    let bars16: string[];
    if (options?.parsedChordBars8?.length === 8) {
      const t = options.parsedChordBars8;
      bars16 = [...t, ...t];
    } else {
      bars16 = build32ChordBars(modulationPlan, seed).slice(0, 16);
    }

    const harmony: HarmonyPlan = buildHarmonyPlanFromBars(bars16);
    const chordSymbolPlan = buildChordSymbolPlanFromBars(bars16);
    const phrase = { segments: form.sections.map((s) => ({ ...s, density: undefined })), totalBars: 16 };

    const sectionRoles = planSectionRoles(form.sections, LONG_FORM_ROLE_MAP_16);
    const densityPlan = planDensityCurve(sectionRoles, 16);
    const densityCurve = { segments: densityPlan.segments, totalBars: 16 };

    const guitarMap = planGuitarRegisterMap(sectionRoles);
    const bassMap = planBassRegisterMap(sectionRoles);
    const register = {
      melody: [55, 79] as [number, number],
      bass: [40, 55] as [number, number],
      byInstrument: {
        clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
        acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [28, 55],
      },
    };

    const rehearsalMarkPlan = {
      marks: [
        { label: 'A', bar: 1 },
        { label: 'B', bar: 9 },
      ],
    };

    const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });

    const context: CompositionContext = {
      systemVersion: '2.0.0',
      presetId: options?.presetId ?? 'guitar_bass_duo',
      seed,
      form,
      feel,
      harmony,
      motif: { activeMotifs: [], variants: {} },
      phrase,
      register,
      density: densityCurve,
      instrumentProfiles: preset.instrumentProfiles,
      chordSymbolPlan,
      rehearsalMarkPlan,
      lockedHarmonyBarsRaw: [...bars16],
      generationMetadata: {
        generatedAt: new Date().toISOString(),
        harmonySource: options?.parsedChordBars8 ? 'custom' : 'builtin',
        longFormDuo: true,
        modulationPlanActive: modulationPlan.active,
        totalBars: 16,
        wybleVoiceLayout: wybleVoiceLayoutForPreset(options?.presetId ?? 'guitar_bass_duo'),
      },
      validation: { gates: [], passed: true },
      readiness: { release: release.release, mx: release.mx },
    };

    return { context, modulationPlan };
  }

  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const tb =
    typeof options?.targetTotalBars === 'number' &&
    options.targetTotalBars >= 32 &&
    options.targetTotalBars <= 64 &&
    options.targetTotalBars % 8 === 0
      ? options.targetTotalBars
      : LONG_FORM_DUO_BARS;

  const lf = buildDuoLongFormPlanForBarCount(tb);
  const form = {
    sections: lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: tb,
  };

  const modulationPlan = generateModulationPlan(seed, tb);
  const v = validateModulationPlan(modulationPlan);
  if (!v.valid) {
    modulationPlan.active = false;
  }

  let barsTb: string[];
  if (options?.parsedChordBars8?.length === 8) {
    barsTb = tileBuiltinEightToLength(options.parsedChordBars8, tb);
  } else {
    barsTb = expandBuiltinLongFormBars(modulationPlan, seed, tb);
  }

  const harmony: HarmonyPlan = buildHarmonyPlanFromBars(barsTb);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(barsTb);
  const phrase = { segments: form.sections.map((s) => ({ ...s, density: undefined })), totalBars: tb };

  const roleMapLong = duoSectionRoleMapFromPlan(lf);
  const sectionRoles = planSectionRoles(form.sections, roleMapLong);
  const densityPlan = planDensityCurve(sectionRoles, tb);
  const densityCurve = { segments: densityPlan.segments, totalBars: tb };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [40, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [28, 55],
    },
  };

  const rehearsalMarkPlan = {
    marks: lf.sections.map((s) => ({ label: s.label, bar: s.startBar })),
  };

  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });

  const context: CompositionContext = {
    systemVersion: '2.0.0',
    presetId: options?.presetId ?? 'guitar_bass_duo',
    seed,
    form,
    feel,
    harmony,
    motif: { activeMotifs: [], variants: {} },
    phrase,
    register,
    density: densityCurve,
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan,
    rehearsalMarkPlan,
    lockedHarmonyBarsRaw: [...barsTb],
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: options?.parsedChordBars8 ? 'custom' : 'builtin',
      longFormDuo: true,
      modulationPlanActive: modulationPlan.active,
      totalBars: tb,
      wybleVoiceLayout: wybleVoiceLayoutForPreset(options?.presetId ?? 'guitar_bass_duo'),
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };

  return { context, modulationPlan };
}
