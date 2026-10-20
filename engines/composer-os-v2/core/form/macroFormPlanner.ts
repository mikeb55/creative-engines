/**
 * Macro form goals per section — pacing, motif posture, energy/register for duo golden path.
 */

import type { FormMap } from '../compositionContext';
import type { CoreMotif } from '../motif/motifEngineTypes';
import {
  applyDerivedTransform,
  estimateMotifIntervalSimilarity,
  generateMosaicSourceMotif,
  mosaicMelodyNotesForFourFourBar,
  transformMotifForSection,
  type DerivedMotifTransform,
  type MosaicMotifBarNote,
} from '../mosaic-mode/mosaicMotifEngine';
import { notateTicks } from '../performance-composer/pcLane';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import {
  toCompositionSection,
  validateSectionPartition,
  type CompositionSection,
} from '../section-architecture/sectionArchitectureDomain';

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

/**
 * Opt-in 48-bar form (metadata only): Intro 4 | A 12 | B 15 | A′ 11 | Coda 6.
 * Not used by legacy `planMacroForm`. No note, orchestration, or export output.
 */
export const FORTY_EIGHT_BAR_FORM_ID = 'form_48_intro_a_b_a_prime_coda' as const;

export type FortyEightBarThematicRole =
  | 'intro'
  | 'statement'
  | 'development_fragmentation'
  | 'transformed_return'
  | 'coda';

export interface FortyEightBarThematicMark {
  sectionId: string;
  label: string;
  role: FortyEightBarThematicRole;
  /** Present when this section is a transformed return of an earlier section. */
  transformedReturnOfSectionId?: string;
}

export interface FortyEightBarFormPlan {
  id: typeof FORTY_EIGHT_BAR_FORM_ID;
  totalBars: 48;
  sections: CompositionSection[];
  macro: MacroFormPlan;
  thematic: FortyEightBarThematicMark[];
}

/** Symphonic / piano-chamber phrase kinds (`statement` | `development` | `return`). */
export type SymphonicPhraseRole = 'statement' | 'development' | 'return';

export interface FortyEightBarSymphonicPhrase {
  id: string;
  label: string;
  startBar: number;
  endBar: number;
  thematicRole: FortyEightBarThematicRole;
  phraseRole: SymphonicPhraseRole;
}

const FORTY_EIGHT_BAR_THEMATIC_TO_SYMPHONIC_PHRASE: Record<FortyEightBarThematicRole, SymphonicPhraseRole> = {
  intro: 'statement',
  statement: 'statement',
  development_fragmentation: 'development',
  transformed_return: 'return',
  coda: 'return',
};

/** Map 48-bar thematic roles to symphonic phrase roles (orchestration API). */
export function symphonicPhraseRoleForFortyEightBarThematic(
  role: FortyEightBarThematicRole
): SymphonicPhraseRole {
  return FORTY_EIGHT_BAR_THEMATIC_TO_SYMPHONIC_PHRASE[role];
}

/** Phrase bounds + roles from an existing 48-bar form plan (no melody inference). */
export function symphonicPhrasesFromFortyEightBarPlan(
  plan: FortyEightBarFormPlan
): FortyEightBarSymphonicPhrase[] {
  return plan.thematic.map((mark, index) => {
    const section = plan.sections[index]!;
    return {
      id: mark.sectionId,
      label: mark.label,
      startBar: section.startBar,
      endBar: section.endBar,
      thematicRole: mark.role,
      phraseRole: symphonicPhraseRoleForFortyEightBarThematic(mark.role),
    };
  });
}

const FORTY_EIGHT_BAR_SPEC: readonly {
  label: string;
  length: number;
  sectionId?: string;
  role: FortyEightBarThematicRole;
  transformedReturnOfSectionId?: string;
}[] = [
  { label: 'Intro', length: 4, role: 'intro' },
  { label: 'A', length: 12, role: 'statement' },
  { label: 'B', length: 15, role: 'development_fragmentation' },
  {
    label: "A'",
    length: 11,
    sectionId: 'a_prime',
    role: 'transformed_return',
    transformedReturnOfSectionId: 'a',
  },
  { label: 'Coda', length: 6, role: 'coda' },
];

/** Deterministic 48-bar geometry + macro goals. `songwriterId` only selects existing bias. */
export function planFortyEightBarForm(songwriterId?: string | null): FortyEightBarFormPlan {
  let startBar = 1;
  const sections = FORTY_EIGHT_BAR_SPEC.map((spec) => {
    const section = toCompositionSection(spec.label, startBar, spec.length, spec.sectionId);
    startBar += spec.length;
    return section;
  });
  const form: FormMap = {
    sections: sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: 48,
  };
  const partition = validateSectionPartition(sections, form.totalBars);
  if (!partition.ok) {
    throw new Error(
      `48-bar form partition invalid: ${partition.issues.map((issue) => issue.kind).join(',')}`
    );
  }
  const macro = planMacroForm(form, songwriterId ?? null, undefined);
  const thematic: FortyEightBarThematicMark[] = FORTY_EIGHT_BAR_SPEC.map((spec, i) => {
    const section = sections[i]!;
    const mark: FortyEightBarThematicMark = {
      sectionId: section.sectionId,
      label: section.label,
      role: spec.role,
    };
    if (spec.transformedReturnOfSectionId) {
      mark.transformedReturnOfSectionId = spec.transformedReturnOfSectionId;
    }
    return mark;
  });
  return {
    id: FORTY_EIGHT_BAR_FORM_ID,
    totalBars: 48,
    sections,
    macro,
    thematic,
  };
}

/**
 * Opt-in A → B → A′ motif-development plan (metadata + CoreMotif cells only).
 * Reuses MOSAIC `generateMosaicSourceMotif` + `applyDerivedTransform`.
 * Does not touch BHL harmony, source-note locks, orchestration, or export.
 */
export const FORTY_EIGHT_BAR_MOTIF_DEV_ID = 'motif_dev_48_a_b_a_prime' as const;

/** B: fragmentation / development via existing DerivedMotifTransform knobs. */
const FORTY_EIGHT_BAR_B_TRANSFORM: DerivedMotifTransform = {
  intervalNudge: 1,
  intervalClamp: 7,
  rhythmScale: 1.25,
  onsetDisplace: true,
  preserveContour: false,
  preserveSalientLeap: false,
};

export interface FortyEightBarMotifDevelopmentPlan {
  id: typeof FORTY_EIGHT_BAR_MOTIF_DEV_ID;
  seed: number;
  /** Section A — original source motif. */
  a: CoreMotif;
  /** Section B — fragmentation / development. */
  b: CoreMotif;
  /** Section A′ — transformed return of A. */
  aPrime: CoreMotif;
  similarityToA: { a: number; b: number; aPrime: number };
  /** Explicit non-mutation of harmony / locked source notes. */
  locks: { preserveBhlHarmony: true; preserveSourceNoteLocks: true };
}

function cloneCoreMotif(motif: CoreMotif, id: string): CoreMotif {
  return {
    ...motif,
    id,
    intervalPattern: [...motif.intervalPattern],
    rhythmPattern: motif.rhythmPattern.map((r) => ({ ...r })),
    contourPattern: [...motif.contourPattern],
    roleTags: [...motif.roleTags],
    registerTags: [...motif.registerTags],
  };
}

/** Deterministic opt-in motif plan for 48-bar A / B / A′. Optional `source` skips generation. */
export function planFortyEightBarMotifDevelopment(
  seed: number,
  source?: CoreMotif
): FortyEightBarMotifDevelopmentPlan {
  const generated = source ?? generateMosaicSourceMotif(seed, 48);
  const a = cloneCoreMotif(generated, 'motif_48_a');
  // B: applyDerivedTransform (development / fragmentation knobs).
  const b = { ...applyDerivedTransform(a, FORTY_EIGHT_BAR_B_TRANSFORM, 0), id: 'motif_48_b' };
  // A′: neutral transformMotifForSection + mild tonic — recognisable return (no VRB corridor crush).
  const aPrime = {
    ...transformMotifForSection(a, "A'", '', 1),
    id: 'motif_48_a_prime',
  };
  return {
    id: FORTY_EIGHT_BAR_MOTIF_DEV_ID,
    seed,
    a,
    b,
    aPrime,
    similarityToA: {
      a: 1,
      b: estimateMotifIntervalSimilarity(a.intervalPattern, b.intervalPattern),
      aPrime: estimateMotifIntervalSimilarity(a.intervalPattern, aPrime.intervalPattern),
    },
    locks: { preserveBhlHarmony: true, preserveSourceNoteLocks: true },
  };
}

export const FORTY_EIGHT_BAR_EXAMPLE_SEED = 48042;

export type FortyEightBarPianoSourceRhythmMode = 'legacy_quarters' | 'mosaic_rhythm';

export interface FortyEightBarPianoSourceOptions {
  /** Default `legacy_quarters` — four equal melody quarters (existing Rescue C / Phase 4B path). */
  rhythmMode?: FortyEightBarPianoSourceRhythmMode;
}

const FORTY_EIGHT_BAR_SOURCE_DIVISIONS = 480;
const FORTY_EIGHT_BAR_QUARTER_TICKS = FORTY_EIGHT_BAR_SOURCE_DIVISIONS;
const FORTY_EIGHT_BAR_MEASURE_TICKS = 4 * FORTY_EIGHT_BAR_SOURCE_DIVISIONS;
const FORTY_EIGHT_PHRASE_BREATH_BEATS = 0.5;

const FORTY_EIGHT_BASS_PEDALS = [48, 45, 43, 41, 53, 48, 43, 41] as const;
const FORTY_EIGHT_MELODY_START_MIDI = 72;

const FORTY_EIGHT_RHYTHM_ONLY_BASE: Omit<DerivedMotifTransform, 'rhythmScale' | 'onsetDisplace'> = {
  intervalNudge: 0,
  intervalClamp: 12,
  preserveContour: true,
  preserveSalientLeap: true,
};

/** Statement phrase: canonical MOSAIC rhythm (identity scale, on-beat). */
const FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM: DerivedMotifTransform = {
  ...FORTY_EIGHT_RHYTHM_ONLY_BASE,
  rhythmScale: 1.0,
  onsetDisplace: false,
};

/** Development phrase: stretched attacks + mild syncopation (intervals unchanged). */
const FORTY_EIGHT_DEVELOPMENT_RHYTHM_TRANSFORM: DerivedMotifTransform = {
  ...FORTY_EIGHT_RHYTHM_ONLY_BASE,
  rhythmScale: 1.25,
  onsetDisplace: true,
};

/** Return phrase: compressed rhythm + displacement on the return cell (intervals unchanged). */
const FORTY_EIGHT_RETURN_RHYTHM_TRANSFORM: DerivedMotifTransform = {
  ...FORTY_EIGHT_RHYTHM_ONLY_BASE,
  rhythmScale: 0.75,
  onsetDisplace: true,
};

const FORTY_EIGHT_PHRASE_RHYTHM_TRANSFORM: Record<SymphonicPhraseRole, DerivedMotifTransform> = {
  statement: FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM,
  development: FORTY_EIGHT_DEVELOPMENT_RHYTHM_TRANSFORM,
  return: FORTY_EIGHT_RETURN_RHYTHM_TRANSFORM,
};

/** Rhythm-only slice of the existing B fragmentation operator (intervals untouched downstream). */
const FORTY_EIGHT_BAR_B_RHYTHM_ONLY: DerivedMotifTransform = {
  ...FORTY_EIGHT_RHYTHM_ONLY_BASE,
  rhythmScale: FORTY_EIGHT_BAR_B_TRANSFORM.rhythmScale,
  onsetDisplace: FORTY_EIGHT_BAR_B_TRANSFORM.onsetDisplace,
};

function fortyEightMosaicRhythmCarrier(
  phraseRole: SymphonicPhraseRole,
  motifs: FortyEightBarMotifDevelopmentPlan,
  barInSection: number,
  sectionLength: number
): CoreMotif {
  if (phraseRole === 'return') {
    return transformMotifForSection(motifs.a, "A'", '', 0);
  }
  if (phraseRole === 'development') {
    const fragAt = Math.max(2, Math.floor(sectionLength * 0.35));
    if (barInSection >= fragAt) {
      const fragmented = applyDerivedTransform(motifs.a, FORTY_EIGHT_BAR_B_TRANSFORM, 0);
      return { ...motifs.a, rhythmPattern: fragmented.rhythmPattern };
    }
  }
  return motifs.a;
}

function fortyEightMosaicBarRhythmTransform(
  phraseRole: SymphonicPhraseRole,
  phraseTransform: DerivedMotifTransform,
  barInSection: number,
  sectionLength: number,
  seed: number,
  bar: number
): DerivedMotifTransform {
  const progress = sectionLength <= 1 ? 0 : barInSection / Math.max(1, sectionLength - 1);
  const u = seededUnit(seed, 94001, bar);
  const v = seededUnit(seed, 94002, bar * 17 + barInSection);
  const roleDrift =
    phraseRole === 'development' ? 0.12 * progress : phraseRole === 'return' ? -0.08 * progress : 0.06 * progress;
  const rhythmScale = Math.max(
    0.55,
    Math.min(1.45, phraseTransform.rhythmScale + roleDrift + (u - 0.5) * 0.14)
  );
  return {
    ...FORTY_EIGHT_RHYTHM_ONLY_BASE,
    rhythmScale,
    onsetDisplace: phraseTransform.onsetDisplace || (barInSection > 0 && v > 0.52),
  };
}

/** Phrase-role + per-bar MOSAIC rhythm (applyDerivedTransform / transformMotifForSection only). */
function fortyEightMosaicRhythmPatternForBar(
  phraseRole: SymphonicPhraseRole,
  motifs: FortyEightBarMotifDevelopmentPlan,
  barInSection: number,
  sectionLength: number,
  seed: number,
  bar: number
): CoreMotif['rhythmPattern'] {
  const phraseTransform = FORTY_EIGHT_PHRASE_RHYTHM_TRANSFORM[phraseRole];
  const carrier = fortyEightMosaicRhythmCarrier(phraseRole, motifs, barInSection, sectionLength);
  let phraseMotif = applyDerivedTransform(carrier, phraseTransform, 0);
  if (phraseRole === 'development' && barInSection > 0 && seededUnit(seed, 94150, bar + barInSection * 13) > 0.48) {
    phraseMotif = applyDerivedTransform(phraseMotif, FORTY_EIGHT_BAR_B_RHYTHM_ONLY, 0);
  }
  const barTransform = fortyEightMosaicBarRhythmTransform(
    phraseRole,
    phraseTransform,
    barInSection,
    sectionLength,
    seed,
    bar
  );
  return applyDerivedTransform(phraseMotif, barTransform, 0).rhythmPattern;
}

function assertFortyEightBarMotifSourceLocks(motifs: FortyEightBarMotifDevelopmentPlan): void {
  if (!motifs.locks.preserveBhlHarmony || !motifs.locks.preserveSourceNoteLocks) {
    throw new Error('48-bar motif plan must preserve BHL harmony and source-note locks');
  }
}

function midiPitchXml(midi: number): string {
  const spell: Array<[string, number]> = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
  ];
  const [step, alter] = spell[((midi % 12) + 12) % 12]!;
  const octave = Math.floor(midi / 12) - 1;
  const alterXml = alter ? `<alter>${alter}</alter>` : '';
  return `<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`;
}

function pianoNoteXml(
  midi: number | null,
  durationDiv: number,
  staff: number,
  voice: number
): string {
  if (midi === null) {
    return `<note><rest/><duration>${durationDiv}</duration><voice>${voice}</voice><type>quarter</type><staff>${staff}</staff></note>`;
  }
  const type = durationDiv >= 1920 ? 'whole' : durationDiv >= 960 ? 'half' : 'quarter';
  return `<note>${midiPitchXml(midi)}<duration>${durationDiv}</duration><voice>${voice}</voice><type>${type}</type><staff>${staff}</staff></note>`;
}

function motifForThematicRole(
  role: FortyEightBarThematicRole,
  motifs: FortyEightBarMotifDevelopmentPlan
): CoreMotif {
  if (role === 'development_fragmentation') return motifs.b;
  if (role === 'transformed_return' || role === 'coda') return motifs.aPrime;
  return motifs.a;
}

function fortyEightRhythmPatternKey(rhythm: CoreMotif['rhythmPattern']): string {
  return rhythm.map((row) => `${row.startBeat}:${row.duration}`).join(',');
}

/**
 * Mosaic_rhythm: pitches/order from thematic cell; phrase-role base rhythm on motif A,
 * then per-bar development inside the section (avoids one frozen template per phrase).
 */
function motifForRhythmicSourceBar(
  phraseRole: SymphonicPhraseRole,
  thematicRole: FortyEightBarThematicRole,
  motifs: FortyEightBarMotifDevelopmentPlan,
  barInSection: number,
  sectionLength: number,
  seed: number,
  bar: number
): CoreMotif {
  const pitchCore = motifForThematicRole(thematicRole, motifs);
  const carrier = fortyEightMosaicRhythmCarrier(phraseRole, motifs, barInSection, sectionLength);
  const phraseMotif = applyDerivedTransform(carrier, FORTY_EIGHT_PHRASE_RHYTHM_TRANSFORM[phraseRole], 0);
  const symphonicSlices = symphonicPhrasesFromFortyEightBarPlan(planFortyEightBarForm(null));

  const resolveSlotTransform = (
    targetBar: number,
    targetBarInSection: number,
    targetThematicRole: FortyEightBarThematicRole,
    targetPhraseRole: SymphonicPhraseRole
  ): DerivedMotifTransform => {
    const targetPhraseEnd = symphonicSlices.some((phrase) => phrase.endBar === targetBar);
    if (targetThematicRole === 'coda' && targetBar >= 43) {
      const codaIndex = targetBar - 43;
      if (targetBar === 48) {
        return {
          ...FORTY_EIGHT_RETURN_RHYTHM_TRANSFORM,
          rhythmScale: 1.48,
          onsetDisplace: false,
        };
      }
      const codaOperators: DerivedMotifTransform[] = [
        FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM,
        {
          ...FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM,
          rhythmScale: 1.18,
          onsetDisplace: true,
        },
        {
          ...FORTY_EIGHT_DEVELOPMENT_RHYTHM_TRANSFORM,
          rhythmScale: 1.32,
          onsetDisplace: true,
        },
        {
          ...FORTY_EIGHT_BAR_B_RHYTHM_ONLY,
          rhythmScale: 1.22,
          onsetDisplace: false,
        },
        {
          ...FORTY_EIGHT_RETURN_RHYTHM_TRANSFORM,
          rhythmScale: 1.05,
          onsetDisplace: true,
        },
      ];
      return codaOperators[Math.min(codaIndex, codaOperators.length - 1)]!;
    }

    const targetSlot = targetBarInSection % 4;
    if (targetSlot === 0) {
      return FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM;
    }
    if (targetSlot === 1) {
      return {
        ...FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM,
        rhythmScale: 1.08,
        onsetDisplace: true,
      };
    }
    if (targetSlot === 2) {
      if (targetPhraseRole === 'development') {
        return {
          ...FORTY_EIGHT_BAR_B_RHYTHM_ONLY,
          rhythmScale: FORTY_EIGHT_DEVELOPMENT_RHYTHM_TRANSFORM.rhythmScale,
          onsetDisplace: true,
        };
      }
      return FORTY_EIGHT_BAR_B_RHYTHM_ONLY;
    }

    const cadenceU = seededUnit(seed, 94210, targetBar + targetPhraseRole.length);
    const phraseEndCadence = targetPhraseEnd && targetBar < 48;
    const cadenceScale = phraseEndCadence
      ? 0.58 + cadenceU * 0.14
      : 0.72 + cadenceU * 0.1;
    if (targetPhraseRole === 'return') {
      return {
        ...FORTY_EIGHT_RETURN_RHYTHM_TRANSFORM,
        rhythmScale: Math.min(cadenceScale, 0.7),
        onsetDisplace: cadenceU > 0.28,
      };
    }
    return {
      ...FORTY_EIGHT_RETURN_RHYTHM_TRANSFORM,
      rhythmScale: cadenceScale,
      onsetDisplace: phraseEndCadence ? cadenceU > 0.22 : cadenceU > 0.55,
    };
  };

  const rhythmFromSlot = (slotTransform: DerivedMotifTransform): CoreMotif['rhythmPattern'] =>
    applyDerivedTransform(phraseMotif, slotTransform, 0).rhythmPattern;

  let rhythmPattern = rhythmFromSlot(resolveSlotTransform(bar, barInSection, thematicRole, phraseRole));

  if (thematicRole === 'coda' && bar === 48) {
    rhythmPattern = [{ startBeat: 0, duration: 3.5 }];
  }

  if (barInSection >= 4 && thematicRole !== 'intro') {
    const prevBar = bar - 4;
    const prevSlice = symphonicSlices.find((s) => prevBar >= s.startBar && prevBar <= s.endBar);
    if (!prevSlice) {
      return { ...pitchCore, rhythmPattern, id: pitchCore.id };
    }
    const prevBarInSection = prevBar - prevSlice.startBar;
    const prevPhraseMotif = applyDerivedTransform(
      fortyEightMosaicRhythmCarrier(
        prevSlice.phraseRole,
        motifs,
        prevBarInSection,
        prevSlice.endBar - prevSlice.startBar + 1
      ),
      FORTY_EIGHT_PHRASE_RHYTHM_TRANSFORM[prevSlice.phraseRole],
      0
    );
    const prevSlot = resolveSlotTransform(
      prevBar,
      prevBarInSection,
      prevSlice.thematicRole,
      prevSlice.phraseRole
    );
    const prevPattern = applyDerivedTransform(prevPhraseMotif, prevSlot, 0).rhythmPattern;
    if (fortyEightRhythmPatternKey(prevPattern) === fortyEightRhythmPatternKey(rhythmPattern)) {
      const vary =
        seededUnit(seed, 94220, bar) > 0.5
          ? {
              ...FORTY_EIGHT_BAR_B_RHYTHM_ONLY,
              rhythmScale: 1.06 + seededUnit(seed, 94221, bar) * 0.12,
              onsetDisplace: true,
            }
          : {
              ...FORTY_EIGHT_STATEMENT_RHYTHM_TRANSFORM,
              rhythmScale: 1.1 + seededUnit(seed, 94222, bar) * 0.1,
              onsetDisplace: true,
            };
      rhythmPattern = applyDerivedTransform({ ...phraseMotif, rhythmPattern }, vary, 0).rhythmPattern;
    }
  }

  return {
    ...pitchCore,
    rhythmPattern,
    id: pitchCore.id,
  };
}

function pianoTimedNoteXml(
  midi: number | null,
  totalTicks: number,
  staff: number,
  voice: number
): string {
  const pieces = notateTicks(totalTicks, FORTY_EIGHT_BAR_SOURCE_DIVISIONS);
  let xml = '';
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index]!;
    const tie =
      midi !== null && pieces.length > 1
        ? index === 0
          ? '<tie type="start"/>'
          : index === pieces.length - 1
            ? '<tie type="stop"/>'
            : '<tie type="stop"/><tie type="start"/>'
        : '';
    const dotXml = piece.dots ? '<dot/>' : '';
    if (midi === null) {
      xml += `<note><rest/><duration>${piece.ticks}</duration><voice>${voice}</voice><type>${piece.type}</type>${dotXml}<staff>${staff}</staff></note>`;
    } else {
      xml += `<note>${midiPitchXml(midi)}<duration>${piece.ticks}</duration>${tie}<voice>${voice}</voice><type>${piece.type}</type>${dotXml}<staff>${staff}</staff></note>`;
    }
  }
  return xml;
}

function layMosaicMelodyMeasureXml(
  notes: readonly MosaicMotifBarNote[],
  breathTailBeats: number,
  staff: number,
  voice: number
): string {
  const maxCoverTicks = Math.max(
    0,
    Math.round((4 - breathTailBeats) * FORTY_EIGHT_BAR_QUARTER_TICKS)
  );
  const ordered = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  let cursor = 0;
  let xml = '';
  for (const note of ordered) {
    const startTicks = Math.round(note.startBeat * FORTY_EIGHT_BAR_QUARTER_TICKS);
    const durTicks = Math.round(note.duration * FORTY_EIGHT_BAR_QUARTER_TICKS);
    const placementStart = Math.max(startTicks, cursor);
    if (placementStart >= maxCoverTicks) continue;
    const effectiveDur = Math.min(durTicks, maxCoverTicks - placementStart);
    if (effectiveDur <= 0) continue;
    if (placementStart > cursor) {
      xml += pianoTimedNoteXml(null, placementStart - cursor, staff, voice);
    }
    xml += pianoTimedNoteXml(note.pitch, effectiveDur, staff, voice);
    cursor = placementStart + effectiveDur;
  }
  if (cursor < FORTY_EIGHT_BAR_MEASURE_TICKS) {
    xml += pianoTimedNoteXml(null, FORTY_EIGHT_BAR_MEASURE_TICKS - cursor, staff, voice);
  }
  return xml;
}

function legacyMelodyMeasureXml(
  melodyNotes: readonly MosaicMotifBarNote[],
  codaRelease: boolean
): string {
  if (!melodyNotes.length) {
    return pianoNoteXml(null, FORTY_EIGHT_BAR_MEASURE_TICKS, 1, 1);
  }
  const pitches = melodyNotes.map((note) => note.pitch);
  const fallback = pitches[0] ?? FORTY_EIGHT_MELODY_START_MIDI;
  const quarterCount = codaRelease ? 3 : 4;
  let melodyPart = '';
  for (let i = 0; i < quarterCount; i += 1) {
    melodyPart += pianoNoteXml(pitches[i] ?? fallback, FORTY_EIGHT_BAR_QUARTER_TICKS, 1, 1);
  }
  if (codaRelease) {
    melodyPart += pianoNoteXml(null, FORTY_EIGHT_BAR_QUARTER_TICKS, 1, 1);
  }
  return melodyPart;
}

/**
 * Deterministic 48-bar grand-staff piano source for symphonic orchestration.
 * Section A uses motif A; B uses development transform; A′/Coda use transformed return.
 */
export function buildFortyEightBarPianoSourceMusicXml(
  seed: number = FORTY_EIGHT_BAR_EXAMPLE_SEED,
  options?: FortyEightBarPianoSourceOptions
): string {
  const rhythmMode = options?.rhythmMode ?? 'legacy_quarters';
  const form = planFortyEightBarForm(null);
  const slices = symphonicPhrasesFromFortyEightBarPlan(form);
  const phraseEndBars = new Set(slices.map((slice) => slice.endBar));
  const motifs = planFortyEightBarMotifDevelopment(seed);
  assertFortyEightBarMotifSourceLocks(motifs);
  const measures: string[] = [];
  let continuePitch: number | undefined;
  for (let bar = 1; bar <= 48; bar += 1) {
    const slice = slices.find((s) => bar >= s.startBar && bar <= s.endBar)!;
    const barInSection = bar - slice.startBar;
    const sectionLength = slice.endBar - slice.startBar + 1;
    const core =
      rhythmMode === 'mosaic_rhythm'
        ? motifForRhythmicSourceBar(
            slice.phraseRole,
            slice.thematicRole,
            motifs,
            barInSection,
            sectionLength,
            seed,
            bar
          )
        : motifForThematicRole(slice.thematicRole, motifs);
    const sparseIntro = slice.thematicRole === 'intro' && barInSection >= 2;
    const codaRelease = slice.thematicRole === 'coda' && bar === 48;
    let melodyNotes = sparseIntro
      ? []
      : mosaicMelodyNotesForFourFourBar(core, seed + bar, barInSection, FORTY_EIGHT_MELODY_START_MIDI, continuePitch);
    if (codaRelease && melodyNotes.length > 3) {
      melodyNotes = melodyNotes.slice(0, 3);
    }
    if (melodyNotes.length) {
      continuePitch = melodyNotes[melodyNotes.length - 1]!.pitch;
    }
    const bassMidi = FORTY_EIGHT_BASS_PEDALS[(bar - 1) % FORTY_EIGHT_BASS_PEDALS.length]!;
    const upperInner = bassMidi + 12;
    const attrs =
      bar === 1
        ? `<attributes><divisions>${FORTY_EIGHT_BAR_SOURCE_DIVISIONS}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>`
        : '';
    const phraseBreath =
      rhythmMode === 'mosaic_rhythm' && phraseEndBars.has(bar) && bar < 48
        ? FORTY_EIGHT_PHRASE_BREATH_BEATS
        : 0;
    let melodyPart = '';
    if (sparseIntro) {
      melodyPart = pianoNoteXml(null, FORTY_EIGHT_BAR_MEASURE_TICKS, 1, 1);
    } else if (rhythmMode === 'mosaic_rhythm') {
      melodyPart = layMosaicMelodyMeasureXml(melodyNotes, phraseBreath, 1, 1);
    } else {
      melodyPart = legacyMelodyMeasureXml(melodyNotes, codaRelease);
    }
    const measureBody = `${melodyPart}<backup><duration>${FORTY_EIGHT_BAR_MEASURE_TICKS}</duration></backup>${pianoNoteXml(upperInner, FORTY_EIGHT_BAR_MEASURE_TICKS, 1, 2)}<backup><duration>${FORTY_EIGHT_BAR_MEASURE_TICKS}</duration></backup>${pianoNoteXml(bassMidi, FORTY_EIGHT_BAR_MEASURE_TICKS, 2, 1)}`;
    measures.push(`<measure number="${bar}">${attrs}${measureBody}</measure>`);
  }
  const software =
    rhythmMode === 'mosaic_rhythm'
      ? 'macroFormPlanner buildFortyEightBarPianoSourceMusicXml mosaic_rhythm'
      : 'macroFormPlanner buildFortyEightBarPianoSourceMusicXml';
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>V4.0 48-bar form example</work-title></work>
  <identification><encoding><software>${software}</software></encoding></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">${measures.join('')}</part>
</score-partwise>`;
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

/** Orchestration density tiers (symphonic 48-bar rescue). Harmony pacing unchanged. */
export type SymphonicOrchestrationDensity = 'sparse' | 'medium' | 'full';

/**
 * Section energy for orchestral texture only: principal climax on transformed return, genuine release on coda.
 * Does not modify `planMacroForm` rows or harmony pacing.
 */
export function orchestrationEnergyForFortyEightBarThematic(
  role: FortyEightBarThematicRole,
  macroRow: MacroSectionGoals | undefined
): EnergyCurve {
  switch (role) {
    case 'intro':
      return 'low';
    case 'statement':
      return 'mid';
    case 'development_fragmentation':
      return 'high';
    case 'transformed_return':
      return 'peak';
    case 'coda':
      return 'low';
    default:
      return macroRow?.energyCurve ?? 'mid';
  }
}

export function symphonicOrchestrationDensityFromEnergy(energy: EnergyCurve): SymphonicOrchestrationDensity {
  if (energy === 'low') return 'sparse';
  if (energy === 'mid') return 'medium';
  return 'full';
}

/** Climax section id for 48-bar symphonic acceptance (transformed return). */
export function fortyEightBarOrchestralClimaxSectionId(plan: FortyEightBarFormPlan): string {
  const mark = plan.thematic.find((row) => row.role === 'transformed_return');
  return mark?.sectionId ?? 'a_prime';
}
