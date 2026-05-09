/**
 * Macro form goals per section — pacing, motif posture, energy/register for duo golden path.
 */

import type { FormMap } from '../compositionContext';

export type HarmonyPacing = 'static' | 'moderate' | 'dense';
export type MotifTreatmentMacro = 'statement' | 'development' | 'fragmentation' | 'return';
export type EnergyCurve = 'low' | 'mid' | 'high' | 'peak';
export type RegisterTargetMacro = 'low' | 'mid' | 'high';

export interface MacroSectionGoals {
  label: string;
  startBar: number;
  length: number;
  harmonyPacing: HarmonyPacing;
  motifTreatment: MotifTreatmentMacro;
  energyCurve: EnergyCurve;
  registerTarget: RegisterTargetMacro;
}

export type MacroSongwriterBias = 'glass_flat' | 'herrmann_contrast' | 'evans_moderate' | 'neutral';

export interface MacroFormPlan {
  sections: MacroSectionGoals[];
  totalBars: number;
  songwriterBias: MacroSongwriterBias;
}

function classifySongwriterBias(songwriterId?: string | null): MacroSongwriterBias {
  if (!songwriterId) return 'neutral';
  if (songwriterId === 'philip_glass' || songwriterId === 'steve_reich') return 'glass_flat';
  if (songwriterId === 'bernard_herrmann') return 'herrmann_contrast';
  if (songwriterId === 'bill_evans') return 'evans_moderate';
  return 'neutral';
}

function baseGoalsForSection(
  label: string,
  index: number,
  totalSections: number
): Omit<MacroSectionGoals, 'label' | 'startBar' | 'length'> {
  const L = label.trim();
  const lower = L.toLowerCase();
  const isLast = index === totalSections - 1;
  const isB = /^B$/i.test(L) || /^B-\d+$/i.test(L);
  const isAprime =
    /^A''$/i.test(L) ||
    /^A'$/i.test(L) ||
    /^A''-\d+$/i.test(L) ||
    /^A'-\d+$/i.test(L);
  const isPlainA = /^A$/i.test(L);

  let harmonyPacing: HarmonyPacing = 'moderate';
  let motifTreatment: MotifTreatmentMacro = 'statement';
  let energyCurve: EnergyCurve = 'mid';
  let registerTarget: RegisterTargetMacro = 'mid';

  if (isB) {
    harmonyPacing = 'moderate';
    motifTreatment = 'development';
    energyCurve = 'high';
    registerTarget = 'high';
  } else if (isAprime) {
    harmonyPacing = 'moderate';
    motifTreatment = 'return';
    energyCurve = isLast ? 'peak' : 'high';
    registerTarget = 'mid';
  } else if (isPlainA && index === 0) {
    harmonyPacing = 'static';
    motifTreatment = 'statement';
    energyCurve = 'low';
    registerTarget = 'mid';
  } else if (isPlainA) {
    harmonyPacing = 'static';
    motifTreatment = 'statement';
    energyCurve = 'mid';
    registerTarget = 'mid';
  } else if (lower.startsWith('verse')) {
    harmonyPacing = 'static';
    motifTreatment = 'statement';
    energyCurve = 'low';
    registerTarget = 'mid';
  } else if (lower.startsWith('chorus')) {
    harmonyPacing = 'moderate';
    motifTreatment = 'development';
    energyCurve = 'high';
    registerTarget = 'high';
  } else if (lower.startsWith('bridge') || lower.startsWith('pre_chorus')) {
    harmonyPacing = 'dense';
    motifTreatment = 'fragmentation';
    energyCurve = 'high';
    registerTarget = 'high';
  }

  const roleDevelopment =
    lower.includes('development') || (lower.includes('dev') && lower.includes('section'));
  if (roleDevelopment) {
    harmonyPacing = 'dense';
    motifTreatment = 'fragmentation';
    energyCurve = 'high';
    registerTarget = 'high';
  }

  if (isLast) {
    energyCurve = 'peak';
  }

  return { harmonyPacing, motifTreatment, energyCurve, registerTarget };
}

function applySongwriterBias(goals: MacroSectionGoals[], bias: MacroSongwriterBias): MacroSectionGoals[] {
  if (bias === 'neutral') return goals.map((g) => ({ ...g }));
  return goals.map((g) => {
    let energyCurve = g.energyCurve;
    let harmonyPacing = g.harmonyPacing;
    let registerTarget = g.registerTarget;

    if (bias === 'glass_flat') {
      energyCurve =
        energyCurve === 'peak' ? 'high' : energyCurve === 'low' ? 'mid' : energyCurve === 'high' ? 'mid' : 'mid';
      if (harmonyPacing === 'dense') harmonyPacing = 'moderate';
    } else if (bias === 'herrmann_contrast') {
      energyCurve =
        energyCurve === 'low' ? 'low' : energyCurve === 'mid' ? 'mid' : energyCurve === 'high' ? 'peak' : 'peak';
      if (g.motifTreatment === 'development' && harmonyPacing === 'moderate') harmonyPacing = 'dense';
    } else if (bias === 'evans_moderate') {
      energyCurve = 'mid';
      harmonyPacing = harmonyPacing === 'dense' ? 'moderate' : harmonyPacing;
      registerTarget = 'mid';
    }

    return { ...g, energyCurve, harmonyPacing, registerTarget };
  });
}

/**
 * Build per-section macro goals from resolved form + songwriter bias.
 * Third argument reserved for future receipt hooks.
 */
export function planMacroForm(
  form: FormMap,
  songwriterId: string | undefined | null,
  _generationMetadata?: unknown
): MacroFormPlan {
  void _generationMetadata;
  const bias = classifySongwriterBias(songwriterId ?? undefined);
  const n = form.sections.length;
  const ordered = [...form.sections].sort((a, b) => a.startBar - b.startBar);
  const raw: MacroSectionGoals[] = ordered.map((s, i) => {
    const base = baseGoalsForSection(s.label, i, n);
    return {
      label: s.label,
      startBar: s.startBar,
      length: s.length,
      ...base,
    };
  });
  const sections = applySongwriterBias(raw, bias);
  return {
    sections,
    totalBars: form.totalBars,
    songwriterBias: bias,
  };
}

/** Lookup macro row for a 1-based bar index. */
export function macroGoalsForBar(bar: number, macro: MacroFormPlan | undefined): MacroSectionGoals | undefined {
  if (!macro?.sections?.length) return undefined;
  return macro.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
}

/** Nudge phrase density toward harmony pacing (spine / chord rhythm hint). */
export function mergeHarmonyPacingDensityHint(
  pacing: HarmonyPacing | undefined,
  densityLevel: 'sparse' | 'medium' | 'dense'
): 'sparse' | 'medium' | 'dense' {
  if (!pacing) return densityLevel;
  if (pacing === 'static') {
    if (densityLevel === 'dense') return 'medium';
    if (densityLevel === 'medium') return 'sparse';
    return densityLevel;
  }
  if (pacing === 'dense') {
    if (densityLevel === 'sparse') return 'medium';
    return 'dense';
  }
  return densityLevel;
}

/** Small MIDI register offset from macro energy + register (duo guitar window). */
export function macroRegisterMidiOffset(goals: MacroSectionGoals | undefined): number {
  if (!goals) return 0;
  let o = 0;
  if (goals.registerTarget === 'high') o += 2;
  else if (goals.registerTarget === 'low') o -= 2;
  if (goals.energyCurve === 'peak') o += 2;
  else if (goals.energyCurve === 'high') o += 1;
  else if (goals.energyCurve === 'low') o -= 1;
  return Math.max(-4, Math.min(4, o));
}

/** Motif authority return threshold nudge from treatment (subtle, deterministic). */
export function macroMotifReturnThresholdNudge(motifTreatment: MotifTreatmentMacro | undefined): number {
  if (!motifTreatment) return 0;
  if (motifTreatment === 'fragmentation') return -0.04;
  if (motifTreatment === 'return') return 0.03;
  if (motifTreatment === 'development') return -0.02;
  return 0;
}
