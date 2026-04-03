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
import { buildDuoLongFormPlan, buildDuoLongFormPlan16 } from './duoLongFormPlanner';
import { LONG_FORM_DUO_BARS } from './longFormRouteResolver';
import { assertLockedHarmonyContractsToneParity, buildLockedHarmonyBarContracts } from '../harmony/harmonyBarContract';

const BUILTIN_EIGHT: readonly string[] = ['Dmin9', 'G13', 'Cmaj9', 'A7alt', 'Dmin9', 'G13', 'Cmaj9', 'A7alt'];

const LONG_FORM_ROLE_MAP: Record<string, SectionRole> = {
  A: 'statement',
  "A'": 'development',
  B: 'contrast',
  "A''": 'return',
};

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
  /** 16: native 16-bar; 32: full long-form (default). */
  targetTotalBars?: 16 | 32;
  presetId?: string;
}

/**
 * Long-form Duo with **exact** user chords (one symbol per bar) — 16 or 32 bars; no tiling inside this function.
 */
export function buildDuoLongFormCompositionContextFromBars(
  seed: number,
  bars: string[],
  opts?: { chordProgressionInputRaw?: string; presetId?: string }
): { context: CompositionContext; modulationPlan: ModulationPlan } {
  const n = bars.length;
  if (n !== 16 && n !== 32) {
    throw new Error(`buildDuoLongFormCompositionContextFromBars: expected 16 or 32 bars, got ${n}`);
  }
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const lf = n === 32 ? buildDuoLongFormPlan() : buildDuoLongFormPlan16();
  const form = {
    sections: lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: n,
  };

  const modulationPlan = generateModulationPlan(seed, n);
  modulationPlan.active = false;

  const harmony: HarmonyPlan = buildHarmonyPlanFromBars(bars);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(bars);
  const phrase = { segments: form.sections.map((s) => ({ ...s, density: undefined })), totalBars: n };

  const roleMap = n === 32 ? LONG_FORM_ROLE_MAP : LONG_FORM_ROLE_MAP_16;
  const sectionRoles = planSectionRoles(form.sections, roleMap);
  const densityPlan = planDensityCurve(sectionRoles, n);
  const densityCurve = { segments: densityPlan.segments, totalBars: n };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [36, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [36, 55],
    },
  };

  const rehearsalMarkPlan =
    n === 32
      ? {
          marks: [
            { label: 'A', bar: 1 },
            { label: "A'", bar: 9 },
            { label: 'B', bar: 17 },
            { label: "A''", bar: 25 },
          ],
        }
      : {
          marks: [
            { label: 'A', bar: 1 },
            { label: 'B', bar: 9 },
          ],
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
      bass: [36, 55] as [number, number],
      byInstrument: {
        clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
        acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [36, 55],
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
      },
      validation: { gates: [], passed: true },
      readiness: { release: release.release, mx: release.mx },
    };

    return { context, modulationPlan };
  }

  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const lf = buildDuoLongFormPlan();
  const form = {
    sections: lf.sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: LONG_FORM_DUO_BARS,
  };

  const modulationPlan = generateModulationPlan(seed, LONG_FORM_DUO_BARS);
  const v = validateModulationPlan(modulationPlan);
  if (!v.valid) {
    modulationPlan.active = false;
  }

  let bars32: string[];
  if (options?.parsedChordBars8?.length === 8) {
    const t = options.parsedChordBars8;
    bars32 = [...t, ...t, ...t, ...t];
  } else {
    bars32 = build32ChordBars(modulationPlan, seed);
  }

  const harmony: HarmonyPlan = buildHarmonyPlanFromBars(bars32);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(bars32);
  const phrase = { segments: form.sections.map((s) => ({ ...s, density: undefined })), totalBars: LONG_FORM_DUO_BARS };

  const sectionRoles = planSectionRoles(form.sections, LONG_FORM_ROLE_MAP);
  const densityPlan = planDensityCurve(sectionRoles, LONG_FORM_DUO_BARS);
  const densityCurve = { segments: densityPlan.segments, totalBars: LONG_FORM_DUO_BARS };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [36, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [36, 55],
    },
  };

  const rehearsalMarkPlan = {
    marks: [
      { label: 'A', bar: 1 },
      { label: "A'", bar: 9 },
      { label: 'B', bar: 17 },
      { label: "A''", bar: 25 },
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
    lockedHarmonyBarsRaw: [...bars32],
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: options?.parsedChordBars8 ? 'custom' : 'builtin',
      longFormDuo: true,
      modulationPlanActive: modulationPlan.active,
      totalBars: LONG_FORM_DUO_BARS,
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };

  return { context, modulationPlan };
}
