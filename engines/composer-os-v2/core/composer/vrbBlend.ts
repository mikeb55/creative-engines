/**
 * String Quartet multi-arranger — VoiceRuleBundle blend (Phase 1+2).
 * Merge function + explicit flag conflict resolution. No UI.
 */

import type { VoiceRuleBundle, ContrapuntalLinePolicy } from './voiceRuleBundle';

export class BlendConflictError extends Error {
  override readonly name = 'BlendConflictError';

  readonly flagA: string;

  readonly flagB: string;

  readonly primaryVoiceId: string;

  readonly secondaryVoiceId: string;

  constructor(opts: {
    flagA: string;
    flagB: string;
    primaryVoiceId: string;
    secondaryVoiceId: string;
    message: string;
  }) {
    super(opts.message);
    this.flagA = opts.flagA;
    this.flagB = opts.flagB;
    this.primaryVoiceId = opts.primaryVoiceId;
    this.secondaryVoiceId = opts.secondaryVoiceId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Pairs confirmed compatible for SQ VRB blending (no BlendConflictError from known-incompatible gate or table). */
export const KNOWN_SAFE_SQ_BLEND_PAIRS = [
  ['bartok', 'ravel'],
  ['bartok', 'dutilleux'],
  ['bartok', 'shostakovich'],
  ['ravel', 'dutilleux'],
  ['ravel', 'debussy'],
  ['dutilleux', 'ligeti'],
  ['beethoven_late', 'bartok'],
  ['beethoven_late', 'shostakovich'],
  ['beethoven_late', 'ravel'],
  ['reich_glass', 'ligeti'],
  ['reich_glass', 'turtle_island'],
  ['shostakovich', 'bartok'],
  ['turtle_island', 'gershwin'],
  ['turtle_island', 'cole_porter'],
  ['gershwin', 'cole_porter'],
  ['part', 'dutilleux'],
  ['part', 'ravel'],
  ['satie', 'debussy'],
  ['satie', 'ravel'],
  ['ornette_coleman', 'turtle_island'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** Pairs that always throw BlendConflictError before numeric merge. */
export const KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS = [
  ['part', 'lachenmann'],
  ['part', 'ornette_coleman'],
  ['part', 'crumb_black_angels'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

function blendKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const INCOMPATIBLE_BLEND_META: Record<
  string,
  { flagA: string; flagB: string; message: string }
> = {
  'lachenmann|part': {
    flagA: 'tintinnabuliEnabled',
    flagB: 'pitchRoleDecoupled',
    message:
      'Arvo Pärt tintinnabuli (strict diatonic M/T shadow) cannot blend with Lachenmann pitch-role decoupling (noise grammar).',
  },
  'ornette_coleman|part': {
    flagA: 'tintinnabuliEnabled',
    flagB: 'harmolodicsEnabled',
    message: 'Tintinnabuli harmonic shadow grammar is incompatible with Ornette harmolodics (coequal pitch field).',
  },
  'crumb_black_angels|part': {
    flagA: 'tintinnabuliEnabled',
    flagB: 'quotationEventsEnabled',
    message:
      'Pärt tintinnabuli sacred minimalism conflicts with Crumb quotation / symbolic-numerology overlay density.',
  },
};

function throwIncompatiblePair(primaryVoiceId: string, secondaryVoiceId: string): never {
  const meta = INCOMPATIBLE_BLEND_META[blendKey(primaryVoiceId, secondaryVoiceId)];
  if (!meta) {
    throw new BlendConflictError({
      flagA: 'voiceId',
      flagB: 'voiceId',
      primaryVoiceId,
      secondaryVoiceId,
      message: `Voice pair ${primaryVoiceId} + ${secondaryVoiceId} is listed as incompatible for SQ VRB blend.`,
    });
  }
  throw new BlendConflictError({
    ...meta,
    primaryVoiceId,
    secondaryVoiceId,
  });
}

function assertWeight(primaryWeight: number): { pw: number; sw: number } {
  if (!Number.isFinite(primaryWeight) || primaryWeight < 0 || primaryWeight > 1) {
    throw new RangeError('blendVoiceRuleBundles: primaryWeight must be finite and in [0, 1].');
  }
  const pw = primaryWeight;
  const sw = 1 - pw;
  return { pw, sw };
}

function mergeContrapuntalLinePolicy(
  p: VoiceRuleBundle,
  s: VoiceRuleBundle,
  pw: number,
  sw: number,
): ContrapuntalLinePolicy | undefined {
  const pe = p.contrapuntalLinePolicy;
  const se = s.contrapuntalLinePolicy;
  if (!pe && !se) return undefined;
  if (!pe) return { ...se! };
  if (!se) return { ...pe! };
  const dissonanceProfile = pw >= sw ? { ...pe.dissonanceProfile } : { ...se.dissonanceProfile };
  const preferredImitationTypes = [
    ...new Set([...pe.preferredImitationTypes, ...se.preferredImitationTypes]),
  ] as ContrapuntalLinePolicy['preferredImitationTypes'];
  return {
    enabled: pe.enabled || se.enabled,
    dissonanceProfile,
    preferredImitationTypes,
    rhythmicIndependenceRequired: pe.rhythmicIndependenceRequired || se.rhythmicIndependenceRequired,
    lineRoleAssignment:
      pe.lineRoleAssignment === 'dynamic' || se.lineRoleAssignment === 'dynamic' ? 'dynamic' : 'fixed',
  };
}

function wavg(a: number, b: number, pw: number, sw: number): number {
  return Math.round(pw * a + sw * b);
}

function weightedUnionPreferredIntervals(
  a: number[] | undefined,
  b: number[] | undefined,
  _pw: number,
  _sw: number,
): number[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  const set = new Set<number>([...(a ?? []), ...(b ?? [])]);
  return [...set].sort((x, y) => x - y);
}

function pickEnum<T>(vp: T, vs: T, pw: number, sw: number): T {
  return pw >= sw ? vp : vs;
}

function pickOptBool(pa: boolean | undefined, sb: boolean | undefined, pw: number, sw: number): boolean | undefined {
  if (pa === undefined) return sb;
  if (sb === undefined) return pa;
  if (pa === sb) return pa;
  return pw >= sw ? pa : sb;
}

function pickOptString<T extends string>(pa: T | undefined, sb: T | undefined, pw: number, sw: number): T | undefined {
  if (pa === undefined) return sb;
  if (sb === undefined) return pa;
  if (pa === sb) return pa;
  return pw >= sw ? pa : sb;
}

function pickOptNumber(pa: number | undefined, sb: number | undefined, pw: number, sw: number): number | undefined {
  if (pa === undefined) return sb;
  if (sb === undefined) return pa;
  if (pa === sb) return pa;
  return pw >= sw ? pa : sb;
}

function pickHigherWeightReadonlyArray<T>(
  a: readonly T[] | undefined,
  b: readonly T[] | undefined,
  pw: number,
  sw: number,
): readonly T[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  if (!a?.length) return b;
  if (!b?.length) return a;
  return pw >= sw ? a : b;
}

function prefixReceipts(voiceId: string, receipts: readonly string[] | undefined): string[] {
  if (!receipts?.length) return [];
  return receipts.map((r) => `${voiceId}:${r}`);
}

function carrierWeight(flagOnPrimary: boolean, flagOnSecondary: boolean, pw: number, sw: number): number {
  if (flagOnPrimary && flagOnSecondary) return Math.max(pw, sw);
  if (flagOnPrimary) return pw;
  if (flagOnSecondary) return sw;
  return 0;
}

function resolveBlendFlagConflicts(
  out: VoiceRuleBundle,
  primary: VoiceRuleBundle,
  secondary: VoiceRuleBundle,
  pw: number,
  sw: number,
): void {
  const p = primary;
  const s = secondary;

  if (p.tintinnabuliEnabled && s.harmolodicsEnabled) {
    throw new BlendConflictError({
      flagA: 'tintinnabuliEnabled',
      flagB: 'harmolodicsEnabled',
      primaryVoiceId: p.voiceId,
      secondaryVoiceId: s.voiceId,
      message: 'Tintinnabuli M/T shadow grammar cannot coexist with harmolodics.',
    });
  }
  if (s.tintinnabuliEnabled && p.harmolodicsEnabled) {
    throw new BlendConflictError({
      flagA: 'tintinnabuliEnabled',
      flagB: 'harmolodicsEnabled',
      primaryVoiceId: p.voiceId,
      secondaryVoiceId: s.voiceId,
      message: 'Tintinnabuli M/T shadow grammar cannot coexist with harmolodics.',
    });
  }

  if (
    (p.tintinnabuliEnabled || s.tintinnabuliEnabled) &&
    (p.pitchRoleDecoupled || s.pitchRoleDecoupled)
  ) {
    throw new BlendConflictError({
      flagA: 'tintinnabuliEnabled',
      flagB: 'pitchRoleDecoupled',
      primaryVoiceId: p.voiceId,
      secondaryVoiceId: s.voiceId,
      message: 'Tintinnabuli strict voice roles cannot blend with Lachenmann-style pitch-role decoupling.',
    });
  }

  const sacred = Boolean(out.sacredProfile);
  const ironic = Boolean(out.ironicStyleSwitchEnabled);
  if (sacred && ironic) {
    const sacredW = carrierWeight(Boolean(p.sacredProfile), Boolean(s.sacredProfile), pw, sw);
    const ironicW = carrierWeight(Boolean(p.ironicStyleSwitchEnabled), Boolean(s.ironicStyleSwitchEnabled), pw, sw);
    if (sacredW >= 0.6) {
      out.ironicStyleSwitchEnabled = false;
    } else if (ironicW >= 0.6) {
      out.sacredProfile = false;
    } else {
      throw new BlendConflictError({
        flagA: 'sacredProfile',
        flagB: 'ironicStyleSwitchEnabled',
        primaryVoiceId: p.voiceId,
        secondaryVoiceId: s.voiceId,
        message:
          'Sacred profile and Satie ironic style switches conflict; need ≥0.6 weight on one side (sacred vs ironic carrier).',
      });
    }
  }

  if (out.sacredProfile && out.furnitureModeEnabled) {
    out.furnitureModeEnabled = false;
  }

  if (out.sacredProfile && out.noSemanticOverlay) {
    out.noSemanticOverlay = false;
  }

  const tint = Boolean(out.tintinnabuliEnabled);
  const stGrammar = Boolean(out.soundTypeGrammarEnabled);
  if (tint && stGrammar) {
    const tintW = carrierWeight(Boolean(p.tintinnabuliEnabled), Boolean(s.tintinnabuliEnabled), pw, sw);
    if (tintW >= 0.6) {
      out.soundTypeGrammarEnabled = false;
    } else {
      throw new BlendConflictError({
        flagA: 'tintinnabuliEnabled',
        flagB: 'soundTypeGrammarEnabled',
        primaryVoiceId: p.voiceId,
        secondaryVoiceId: s.voiceId,
        message: 'Tintinnabuli vs Lachenmann sound-type grammar needs ≥0.6 weight on the tintinnabuli carrier.',
      });
    }
  }

  const crossTintMicro =
    (Boolean(p.tintinnabuliEnabled) && Boolean(s.micropolyphonyMode)) ||
    (Boolean(s.tintinnabuliEnabled) && Boolean(p.micropolyphonyMode));
  if (crossTintMicro && Boolean(out.tintinnabuliEnabled) && Boolean(out.micropolyphonyMode)) {
    const usePrimary = pw >= sw;
    const src = usePrimary ? p : s;
    out.tintinnabuliEnabled = Boolean(src.tintinnabuliEnabled);
    out.micropolyphonyMode = Boolean(src.micropolyphonyMode);
  }

  if (out.noSemanticOverlay && out.quotationEventsEnabled) {
    out.quotationEventsEnabled = false;
  }

  if (out.micropolyphonyMode && out.pulseState === 'steady') {
    out.rhythmPolicy = { ...out.rhythmPolicy, antiMetric: true };
  }

  if (out.swingFeel && out.rhythmPolicy.antiMetric) {
    out.swingFeel = false;
  }

  if (out.swingFeel && out.sacredProfile) {
    out.swingFeel = false;
  }

  if (out.blueNoteEnabled && out.tintinnabuliEnabled) {
    out.blueNoteEnabled = false;
  }

  if (out.pitchRoleDecoupled && out.blueNoteEnabled) {
    out.blueNoteEnabled = false;
  }

  if (out.rhythmChangesEnabled && out.tintinnabuliEnabled) {
    out.rhythmChangesEnabled = false;
  }

  const crossFurnMicro =
    (Boolean(p.furnitureModeEnabled) && Boolean(s.micropolyphonyMode)) ||
    (Boolean(s.furnitureModeEnabled) && Boolean(p.micropolyphonyMode));
  if (crossFurnMicro && Boolean(out.furnitureModeEnabled) && Boolean(out.micropolyphonyMode)) {
    const usePrimary = pw >= sw;
    const src = usePrimary ? p : s;
    out.furnitureModeEnabled = Boolean(src.furnitureModeEnabled);
    out.micropolyphonyMode = Boolean(src.micropolyphonyMode);
  }
}

export function blendVoiceRuleBundles(
  primary: VoiceRuleBundle,
  secondary: VoiceRuleBundle,
  primaryWeight: number,
): VoiceRuleBundle {
  const { pw, sw } = assertWeight(primaryWeight);

  const ik = blendKey(primary.voiceId, secondary.voiceId);
  for (const [va, vb] of KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS) {
    if (blendKey(va, vb) === ik) {
      throwIncompatiblePair(primary.voiceId, secondary.voiceId);
    }
  }

  const p = primary;
  const s = secondary;

  const harmonicRhythm = {
    minChordDurationBars: wavg(p.harmonicRhythm.minChordDurationBars, s.harmonicRhythm.minChordDurationBars, pw, sw),
    maxChordDurationBars: wavg(p.harmonicRhythm.maxChordDurationBars, s.harmonicRhythm.maxChordDurationBars, pw, sw),
    allowMidBarChange: pickEnum(p.harmonicRhythm.allowMidBarChange, s.harmonicRhythm.allowMidBarChange, pw, sw),
  };

  const bassPolicy = {
    role: pickEnum(p.bassPolicy.role, s.bassPolicy.role, pw, sw),
    allowOctaveDoubling: pickEnum(p.bassPolicy.allowOctaveDoubling, s.bassPolicy.allowOctaveDoubling, pw, sw),
  };

  const voicingPolicy = {
    minSpreadSemitones: wavg(p.voicingPolicy.minSpreadSemitones, s.voicingPolicy.minSpreadSemitones, pw, sw),
    maxSpreadSemitones: wavg(p.voicingPolicy.maxSpreadSemitones, s.voicingPolicy.maxSpreadSemitones, pw, sw),
    clusterSizeNotes: [
      wavg(p.voicingPolicy.clusterSizeNotes[0], s.voicingPolicy.clusterSizeNotes[0], pw, sw),
      wavg(p.voicingPolicy.clusterSizeNotes[1], s.voicingPolicy.clusterSizeNotes[1], pw, sw),
    ] as [number, number],
    forbidParallelFifths: pickEnum(
      p.voicingPolicy.forbidParallelFifths,
      s.voicingPolicy.forbidParallelFifths,
      pw,
      sw,
    ),
    forbidOctaveDoubling: pickEnum(
      p.voicingPolicy.forbidOctaveDoubling,
      s.voicingPolicy.forbidOctaveDoubling,
      pw,
      sw,
    ),
    augmentedTriadLatticeBasis: pickOptBool(
      p.voicingPolicy.augmentedTriadLatticeBasis,
      s.voicingPolicy.augmentedTriadLatticeBasis,
      pw,
      sw,
    ),
    lydianMaj7Sharp11Default: pickOptBool(
      p.voicingPolicy.lydianMaj7Sharp11Default,
      s.voicingPolicy.lydianMaj7Sharp11Default,
      pw,
      sw,
    ),
  };

  const melodicPolicy = {
    contour: pickEnum(p.melodicPolicy.contour, s.melodicPolicy.contour, pw, sw),
    maxLeapSemitones: wavg(p.melodicPolicy.maxLeapSemitones, s.melodicPolicy.maxLeapSemitones, pw, sw),
    preferredIntervalSets: weightedUnionPreferredIntervals(
      p.melodicPolicy.preferredIntervalSets,
      s.melodicPolicy.preferredIntervalSets,
      pw,
      sw,
    ),
    flatTwoMaj7Approach: pickOptBool(p.melodicPolicy.flatTwoMaj7Approach, s.melodicPolicy.flatTwoMaj7Approach, pw, sw),
  };

  const fpP = prefixReceipts(p.voiceId, p.orchestrationPolicy.fingerprintReceipts);
  const fpS = prefixReceipts(s.voiceId, s.orchestrationPolicy.fingerprintReceipts);
  const fingerprintReceipts = [...fpP, ...fpS];

  const orchestrationPolicy = {
    anchorToneCount: wavg(p.orchestrationPolicy.anchorToneCount, s.orchestrationPolicy.anchorToneCount, pw, sw),
    mutateSingleVoiceAtTime: pickEnum(
      p.orchestrationPolicy.mutateSingleVoiceAtTime,
      s.orchestrationPolicy.mutateSingleVoiceAtTime,
      pw,
      sw,
    ),
    allowCollectiveImprov: pickEnum(
      p.orchestrationPolicy.allowCollectiveImprov,
      s.orchestrationPolicy.allowCollectiveImprov,
      pw,
      sw,
    ),
    fingerprintReceipts,
  };

  const formPolicy = {
    narrativeArc: pickEnum(p.formPolicy.narrativeArc, s.formPolicy.narrativeArc, pw, sw),
    sectionRecallEnforced: pickEnum(p.formPolicy.sectionRecallEnforced, s.formPolicy.sectionRecallEnforced, pw, sw),
  };

  const rhythmPolicy = {
    antiMetric: pickEnum(p.rhythmPolicy.antiMetric, s.rhythmPolicy.antiMetric, pw, sw),
    gospelShoutThreshold: pickOptNumber(
      p.rhythmPolicy.gospelShoutThreshold,
      s.rhythmPolicy.gospelShoutThreshold,
      pw,
      sw,
    ),
  };

  const repairPolicy = {
    resolveParallels: pickEnum(p.repairPolicy.resolveParallels, s.repairPolicy.resolveParallels, pw, sw),
    maxVoiceOverlap: wavg(p.repairPolicy.maxVoiceOverlap, s.repairPolicy.maxVoiceOverlap, pw, sw),
  };

  const out: VoiceRuleBundle = {
    voiceId: `blend:${p.voiceId}+${s.voiceId}`,
    harmonicRhythm,
    bassPolicy,
    voicingPolicy,
    melodicPolicy,
    orchestrationPolicy,
    formPolicy,
    rhythmPolicy,
    repairPolicy,
    lineFirstHierarchy: pickOptBool(p.lineFirstHierarchy, s.lineFirstHierarchy, pw, sw),
    dim7EnharmonicModulationEnabled: pickOptBool(
      p.dim7EnharmonicModulationEnabled,
      s.dim7EnharmonicModulationEnabled,
      pw,
      sw,
    ),
    speciesVoiceLeadingBias: pickOptString(p.speciesVoiceLeadingBias, s.speciesVoiceLeadingBias, pw, sw),
    swingFeel: pickOptBool(p.swingFeel, s.swingFeel, pw, sw),
    guideToneVoiceLeading: pickOptBool(p.guideToneVoiceLeading, s.guideToneVoiceLeading, pw, sw),
    improvSlots: pickOptBool(p.improvSlots, s.improvSlots, pw, sw),
    composerProfile: pickOptString(p.composerProfile, s.composerProfile, pw, sw),
    pulseState: pickOptString(p.pulseState, s.pulseState, pw, sw),
    phaseProcessEnabled: pickOptBool(p.phaseProcessEnabled, s.phaseProcessEnabled, pw, sw),
    additiveProcessEnabled: pickOptBool(p.additiveProcessEnabled, s.additiveProcessEnabled, pw, sw),
    patternIntegrityMinRepeats: pickOptNumber(
      p.patternIntegrityMinRepeats,
      s.patternIntegrityMinRepeats,
      pw,
      sw,
    ),
    dschMotifEnabled: pickOptBool(p.dschMotifEnabled, s.dschMotifEnabled, pw, sw),
    quotationEventsEnabled: pickOptBool(p.quotationEventsEnabled, s.quotationEventsEnabled, pw, sw),
    tragicSlowMovementProfile: pickOptBool(
      p.tragicSlowMovementProfile,
      s.tragicSlowMovementProfile,
      pw,
      sw,
    ),
    shostakovichPeriod: pickOptString(p.shostakovichPeriod, s.shostakovichPeriod, pw, sw),
    soundTypeGrammarEnabled: pickOptBool(p.soundTypeGrammarEnabled, s.soundTypeGrammarEnabled, pw, sw),
    klangtypenPrimary: pickHigherWeightReadonlyArray(p.klangtypenPrimary, s.klangtypenPrimary, pw, sw) as
      | VoiceRuleBundle['klangtypenPrimary']
      | undefined,
    pitchRoleDecoupled: pickOptBool(p.pitchRoleDecoupled, s.pitchRoleDecoupled, pw, sw),
    noSemanticOverlay: pickOptBool(p.noSemanticOverlay, s.noSemanticOverlay, pw, sw),
    ligetiProfile: pickOptString(p.ligetiProfile, s.ligetiProfile, pw, sw),
    g4GerminalSetEnabled: pickOptBool(p.g4GerminalSetEnabled, s.g4GerminalSetEnabled, pw, sw),
    micropolyphonyMode: pickOptBool(p.micropolyphonyMode, s.micropolyphonyMode, pw, sw),
    tensionMetricCurvesRequired: pickOptBool(
      p.tensionMetricCurvesRequired,
      s.tensionMetricCurvesRequired,
      pw,
      sw,
    ),
    pcFieldStateGrammarEnabled: pickOptBool(
      p.pcFieldStateGrammarEnabled,
      s.pcFieldStateGrammarEnabled,
      pw,
      sw,
    ),
    silenceAsStructureEnabled: pickOptBool(
      p.silenceAsStructureEnabled,
      s.silenceAsStructureEnabled,
      pw,
      sw,
    ),
    tempoCurveDirection: pickOptString(p.tempoCurveDirection, s.tempoCurveDirection, pw, sw),
    textureAsHarmonyEnabled: pickOptBool(p.textureAsHarmonyEnabled, s.textureAsHarmonyEnabled, pw, sw),
    numerologyEnabled: pickOptBool(p.numerologyEnabled, s.numerologyEnabled, pw, sw),
    amplificationDecoupled: pickOptBool(p.amplificationDecoupled, s.amplificationDecoupled, pw, sw),
    symbolicTechniqueStatesEnabled: pickOptBool(
      p.symbolicTechniqueStatesEnabled,
      s.symbolicTechniqueStatesEnabled,
      pw,
      sw,
    ),
    soundTypeStates: pickHigherWeightReadonlyArray(p.soundTypeStates, s.soundTypeStates, pw, sw) as
      | VoiceRuleBundle['soundTypeStates']
      | undefined,
    mirrorEchoEnabled: pickOptBool(p.mirrorEchoEnabled, s.mirrorEchoEnabled, pw, sw),
    bossaNovaFeel: pickOptBool(p.bossaNovaFeel, s.bossaNovaFeel, pw, sw),
    lydianColourEnabled: pickOptBool(p.lydianColourEnabled, s.lydianColourEnabled, pw, sw),
    tintinnabuliEnabled: pickOptBool(p.tintinnabuliEnabled, s.tintinnabuliEnabled, pw, sw),
    tVoicePositionModes: pickHigherWeightReadonlyArray(p.tVoicePositionModes, s.tVoicePositionModes, pw, sw) as
      | VoiceRuleBundle['tVoicePositionModes']
      | undefined,
    sacredProfile: pickOptBool(p.sacredProfile, s.sacredProfile, pw, sw),
    silenceAsStructure: pickOptBool(p.silenceAsStructure, s.silenceAsStructure, pw, sw),
    tintinnabuliExtendedTechniquesLevel: pickOptString(
      p.tintinnabuliExtendedTechniquesLevel,
      s.tintinnabuliExtendedTechniquesLevel,
      pw,
      sw,
    ),
    dynamicCeiling: pickOptString(p.dynamicCeiling, s.dynamicCeiling, pw, sw),
    noTeleologicalDevelopment: pickOptBool(
      p.noTeleologicalDevelopment,
      s.noTeleologicalDevelopment,
      pw,
      sw,
    ),
    forbidAudibleProcessOperators: pickOptBool(
      p.forbidAudibleProcessOperators,
      s.forbidAudibleProcessOperators,
      pw,
      sw,
    ),
    parallelChordsEnabled: pickOptBool(p.parallelChordsEnabled, s.parallelChordsEnabled, pw, sw),
    unresolvedDominantEnabled: pickOptBool(
      p.unresolvedDominantEnabled,
      s.unresolvedDominantEnabled,
      pw,
      sw,
    ),
    furnitureModeEnabled: pickOptBool(p.furnitureModeEnabled, s.furnitureModeEnabled, pw, sw),
    ironicStyleSwitchEnabled: pickOptBool(
      p.ironicStyleSwitchEnabled,
      s.ironicStyleSwitchEnabled,
      pw,
      sw,
    ),
    harmolodicsEnabled: pickOptBool(p.harmolodicsEnabled, s.harmolodicsEnabled, pw, sw),
    pitchFieldGoverned: pickOptBool(p.pitchFieldGoverned, s.pitchFieldGoverned, pw, sw),
    democraticEnsemble: pickOptBool(p.democraticEnsemble, s.democraticEnsemble, pw, sw),
    collectiveImprovEnabled: pickOptBool(
      p.collectiveImprovEnabled,
      s.collectiveImprovEnabled,
      pw,
      sw,
    ),
    bluesInflectionRequired: pickOptBool(
      p.bluesInflectionRequired,
      s.bluesInflectionRequired,
      pw,
      sw,
    ),
    blueNoteEnabled: pickOptBool(p.blueNoteEnabled, s.blueNoteEnabled, pw, sw),
    rhythmChangesEnabled: pickOptBool(p.rhythmChangesEnabled, s.rhythmChangesEnabled, pw, sw),
    concertModeEnabled: pickOptBool(p.concertModeEnabled, s.concertModeEnabled, pw, sw),
    songModeEnabled: pickOptBool(p.songModeEnabled, s.songModeEnabled, pw, sw),
    chromaticBassEnabled: pickOptBool(p.chromaticBassEnabled, s.chromaticBassEnabled, pw, sw),
    majorMinorMixtureEnabled: pickOptBool(
      p.majorMinorMixtureEnabled,
      s.majorMinorMixtureEnabled,
      pw,
      sw,
    ),
    repeatedNoteOpeningEnabled: pickOptBool(
      p.repeatedNoteOpeningEnabled,
      s.repeatedNoteOpeningEnabled,
      pw,
      sw,
    ),
    textCoupledHarmonyEnabled: pickOptBool(
      p.textCoupledHarmonyEnabled,
      s.textCoupledHarmonyEnabled,
      pw,
      sw,
    ),
    witStyleProfile: pickOptBool(p.witStyleProfile, s.witStyleProfile, pw, sw),
    contrapuntalLinePolicy: mergeContrapuntalLinePolicy(p, s, pw, sw),
  };

  if (p.bergVoiceLeading && s.bergVoiceLeading) {
    out.bergVoiceLeading = pw >= sw ? { ...p.bergVoiceLeading } : { ...s.bergVoiceLeading };
  } else if (p.bergVoiceLeading) {
    out.bergVoiceLeading = { ...p.bergVoiceLeading };
  } else if (s.bergVoiceLeading) {
    out.bergVoiceLeading = { ...s.bergVoiceLeading };
  }

  const stripUndefinedOptionals = (bundle: VoiceRuleBundle) => {
    (Object.keys(bundle) as (keyof VoiceRuleBundle)[]).forEach((k) => {
      if (k === 'voiceId') return;
      if (bundle[k] === undefined) {
        delete (bundle as unknown as Record<string, unknown>)[k as string];
      }
    });
  };

  stripUndefinedOptionals(out);

  resolveBlendFlagConflicts(out, p, s, pw, sw);

  return out;
}
