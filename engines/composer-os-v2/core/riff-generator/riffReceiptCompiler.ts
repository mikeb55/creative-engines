/**
 * Compile VRB orchestrationPolicy.fingerprintReceipts → {@link RiffProfile} patches.
 */

import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type {
  LedZeppelinStyleMode,
  RiffBassContourPolicy,
  RiffBowEventPolicy,
  RiffCadenceTypeWeights,
  RiffDoubleTrackPolicy,
  RiffEnsembleInterlockMode,
  RiffFxMarkerPolicy,
  RiffHornStabTopology,
  RiffLoopIdentityPolicy,
  RiffProfile,
  RiffSectionDensityPolicy,
  RiffSoloGeneratorProfile,
  RiffSpacePolicy,
  RiffVariationOperator,
} from '../composer/riffProfileTypes';

export const SLY_STONE_RESEARCH_RECEIPT_IDS = [
  'sly_horns_thank_you_main_stab',
  'sly_horns_higher_chorus_drive',
  'sly_horns_dance_to_the_music_blocks',
  'sly_vocal_gtr_callresp_thank_you',
  'sly_vocal_gtr_callresp_higher_intro_hook',
  'sly_organ_family_affair_minimal_rhodes',
  'sly_organ_sing_simple_song_callfills',
  'sly_bass_thank_you_larry_pushes',
  'sly_bass_higher_answering_riff',
  'sly_variation_thank_you_bars',
  'sly_variation_higher_tag',
  'sly_riff_identity_thank_you_sections',
  'sly_riff_identity_higher_sections',
] as const;

export const LED_ZEPPELIN_RESEARCH_RECEIPT_IDS = [
  'page_bow_dazed_and_confused',
  'page_bow_how_many_more_times',
  'page_bow_live_whole_lotta_love',
  'page_theremin_whole_lotta_love_breakdown',
  'page_fx_dazed_confused_reverse_echo',
  'page_fx_no_quarter_theremin_live',
  'page_variation_black_dog_verse_riff',
  'page_variation_whole_lotta_love_main_riff',
  'page_variation_kashmir_pedal_dyads',
  'page_variation_bronyaur_open_drone',
  'page_variation_over_the_hills_intro_verse',
  'page_doubletrack_blues_rock_lead',
  'page_unison_riff_octaves_epic',
  'page_cadence_tailfill_bluesrock',
  'page_cadence_sustained_sus_epic',
  'page_cadence_hard_stop_heavy',
  'page_density_intro_to_verse_whole_lotta_love',
  'page_density_verse_to_chorus_black_dog',
  'page_density_over_the_hills_acoustic_to_electric',
] as const;

export const FRANK_ZAPPA_RESEARCH_RECEIPT_IDS = [
  'zappa_solo_inca_roads_modal',
  'zappa_solo_watermelon_easter_hay',
  'zappa_solo_apostrophe_blues',
  'zappa_solo_muffin_man_groove',
  'zappa_solo_montana_country_fusion',
  'zappa_solo_blessed_relief_lyrical',
  'zappa_solo_interval_tritone',
  'zappa_solo_phrasing_breath',
] as const;

const RESEARCH_PREFIX =
  /^(sly_horns_|sly_vocal_gtr_|sly_organ_|sly_bass_|sly_variation_|sly_riff_identity_|page_bow_|page_theremin_|page_fx_|page_variation_|page_doubletrack_|page_cadence_|page_density_|page_unison_|zappa_solo_)/;

export type ReceiptCompileMeta = { metadataOnly: boolean };

/** Keys allowed on {@link RiffProfile} patches from the compiler. */
export const RIFF_PROFILE_PATCH_KEYS = new Set<string>([
  'meterPolicy',
  'subdivisionGrid',
  'oddMeterTemplate',
  'talaCycleLength',
  'densityCurve',
  'accentTopology',
  'accentTemplatePerVoice',
  'antiCoincidenceVoices',
  'preferCoincidenceSlots',
  'groupingPatterns',
  'metricDisplacement',
  'phaseOffsetPolicy',
  'repetitionPolicy',
  'variationOperators',
  'processLoopPolicy',
  'silencePolicy',
  'attackPolicy',
  'ghostChainRules',
  'killSwitchPattern',
  'riffContourPolicy',
  'registerAnchor',
  'riffRegisterFloor',
  'riffRegisterCeiling',
  'registerBandPerVoice',
  'pedalBias',
  'octaveDisplacementTolerance',
  'crossInstrumentUnisonProb',
  'powerIntervalPolicy',
  'tritoneStable',
  'homeChordType',
  'chordQualitySet',
  'chromaticBudget',
  'intervalCell',
  'shorterCellLibrary',
  'harmonicColourCycle',
  'topNoteLinePolicy',
  'thumbBassPolicy',
  'ornamentPolicy',
  'whammyEvents',
  'hornStabTopology',
  'chordFragmentVocabulary',
  'counterpartVoicePolicy',
  'ensembleInterlockMode',
  'polyGroupingMode',
  'allowPitchStreak',
  'modalUsage',
  'swingStyle',
  'scalePool',
  'riffHarmonicCycleLengthBars',
  'rhythmLeadBlendPolicy',
  'doubleStopPolicy',
  'tuningPolicy',
  'rhythmFeel',
  'intervalWeights',
  'textureMix',
  'oddMeterUsage',
  'spacePolicy',
  'phraseLengthBeats',
  'cadenceTypes',
  'styleModes',
  'contourPreferences',
  'pedalPoint',
  'chromaticApproachRules',
  'bassContourPolicy',
  'loopIdentityPolicy',
  'bowEventPolicy',
  'fxMarkerPolicy',
  'doubleTrackPolicy',
  'sectionDensityPolicy',
  'variationOperatorsByStyleMode',
  'pedalRigid',
  'soloGeneratorProfile',
]);

function receiptIdFromLine(line: string): string {
  const dash = line.indexOf(' — ');
  if (dash >= 0) return line.slice(0, dash).trim();
  const idMatch = /id:\s*([a-z0-9_]+)/i.exec(line);
  if (idMatch) return idMatch[1]!;
  return line.trim().split(/\s/)[0] ?? '';
}

function fieldMap(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split(';')) {
    const p = part.trim();
    const colon = p.indexOf(':');
    if (colon < 0) continue;
    const k = p.slice(0, colon).trim().toLowerCase();
    const v = p.slice(colon + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function parseOperatorsFromBody(body: string): RiffVariationOperator[] {
  const ops: RiffVariationOperator[] = [];
  const m = /operators:\s*([^;]+)/i.exec(body);
  if (!m) return ops;
  const raw = m[1]!.toLowerCase();
  const push = (op: RiffVariationOperator) => {
    if (!ops.includes(op)) ops.push(op);
  };
  if (/microtiming|micro.?timing/.test(raw)) push('microTimingShift');
  if (/endtruncation|truncation/.test(raw)) push('endTruncation');
  if (/ornamentadd|ornament(?!ondrone)/.test(raw)) push('ornamentAdd');
  if (/ornamentondrone/.test(raw)) push('ornamentOnDrone');
  if (/chromaticadd/.test(raw)) push('chromaticAdd');
  if (/dynamicsvariation|dynamics/.test(raw)) push('dynamicsVariation');
  if (/harmoniccolourswap|harmonicswap|harmoniccolour|harmonicswap/.test(raw)) push('harmonicColourSwap');
  if (/uppervoicingcolourswap|voicingcolourswap/.test(raw)) push('upperVoicingColourSwap');
  if (/strumpattern/.test(raw)) push('strumPatternChange');
  if (/bassnoteswap/.test(raw)) push('bassNoteSwap');
  if (/tailfill/.test(raw)) push('tailFill');
  if (/rhythmicdisplacement|rhythmicwarp/.test(raw)) push('rhythmicWarp');
  if (/octaveshift|octavereposition|occasionaloctave/.test(raw)) push('registerShift');
  if (/calllengthchange/.test(raw)) push('startOffsetShift');
  if (/truncation\/extension|truncate/.test(raw)) push('truncateOrExtend');
  if (/calllengthchange|startoffset/.test(raw)) push('startOffsetShift');
  return ops;
}

function parseStyleMode(body: string): LedZeppelinStyleMode | undefined {
  const m = /stylemode:\s*([a-z_]+)/i.exec(body);
  if (!m) return undefined;
  const s = m[1]!.toLowerCase();
  if (s === 'blues_rock' || s === 'folk_modal' || s === 'epic_modal_heavy') return s;
  return undefined;
}

function hornTopologyForId(id: string): RiffHornStabTopology {
  if (id.includes('dance_to_the_music')) {
    return { slots: [0, 8], minRestAfter: 2, repeatEveryBars: 4 };
  }
  if (id.includes('higher_chorus')) {
    return { slots: [4, 6, 14], minRestAfter: 1, repeatEveryBars: 2 };
  }
  return { slots: [4, 14], minRestAfter: 2, repeatEveryBars: 2 };
}

function bassPolicyForId(id: string, fields: Record<string, string>): RiffBassContourPolicy {
  if (id.includes('higher_answering')) {
    return { enterOnBeatFraction: 0.5, melodicCounterpart: true, octaveJumpEveryBars: 2 };
  }
  return {
    anticipateBeats: [0, 2],
    octaveJumpEveryBars: 2,
    octaveJumpProbability: /octave/.test(fields.topology ?? '') ? 0.55 : 0.4,
    melodicCounterpart: /counterpart|static guitar/.test(fields.behavior ?? ''),
  };
}

function loopIdentityForId(id: string): RiffLoopIdentityPolicy {
  if (id.includes('higher_sections')) {
    return { fragmentedVerseHook: true, densityBySection: 'verse_sparse_chorus_full' };
  }
  return {
    coreChordSymbol: 'E9',
    densityBySection: 'section_density_curve',
    breakdownToGhosts: true,
  };
}

function patchForReceipt(id: string, body: string): { patch: Partial<RiffProfile>; metadataOnly: boolean } {
  const fields = fieldMap(body);

  if (id.startsWith('sly_horns_')) {
    const prev = [] as RiffHornStabTopology[];
    return {
      patch: { hornStabTopology: [...prev, hornTopologyForId(id)] },
      metadataOnly: false,
    };
  }
  if (id.startsWith('sly_vocal_gtr_')) {
    const spacePolicy: RiffSpacePolicy = {
      internalRestProb: 0.35,
      phraseEndRestBeats: id.includes('higher') ? [1] : [0.5],
      callResponsePattern: id.includes('higher') ? 'rest_window_vocal_entry' : 'drop_full_hits_under_vocal',
    };
    return { patch: { spacePolicy }, metadataOnly: false };
  }
  if (id.startsWith('sly_organ_')) {
    const mode: RiffEnsembleInterlockMode = id.includes('callfills') ? 'callResponse' : 'layeredOstinati';
    return { patch: { ensembleInterlockMode: mode }, metadataOnly: false };
  }
  if (id.startsWith('sly_bass_')) {
    return { patch: { bassContourPolicy: bassPolicyForId(id, fields) }, metadataOnly: false };
  }
  if (id.startsWith('sly_variation_')) {
    return { patch: { variationOperators: parseOperatorsFromBody(body) }, metadataOnly: false };
  }
  if (id.startsWith('sly_riff_identity_')) {
    return {
      patch: {
        loopIdentityPolicy: loopIdentityForId(id),
        repetitionPolicy: {
          exactLoopAllowed: true,
          pedalToneAllowed: true,
          barIdentityPersistence: 4,
          minExactRepetitions: 2,
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('page_bow_')) {
    const bow: RiffBowEventPolicy = {
      events: [{ receiptId: id, metadataOnly: true }],
    };
    return { patch: { bowEventPolicy: bow }, metadataOnly: true };
  }
  if (id.startsWith('page_theremin_') || id.startsWith('page_fx_')) {
    const fx: RiffFxMarkerPolicy = {
      markers: [{ receiptId: id, metadataOnly: true }],
    };
    return { patch: { fxMarkerPolicy: fx }, metadataOnly: true };
  }
  if (id.startsWith('page_variation_')) {
    const mode = parseStyleMode(body) ?? 'blues_rock';
    const ops = parseOperatorsFromBody(body);
    const pedalRigid = /pedalrigid:\s*true/i.test(body) || id.includes('kashmir_pedal');
    return {
      patch: {
        variationOperatorsByStyleMode: { [mode]: ops },
        variationOperators: ops,
        ...(pedalRigid ? { pedalRigid: true } : {}),
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('page_doubletrack_')) {
    const dt: RiffDoubleTrackPolicy = {
      bluesRockFrequency: 'frequent',
      epicModalHeavyFrequency: 'moderate',
      folkModalFrequency: 'rare',
      microVariation: true,
    };
    return { patch: { doubleTrackPolicy: dt }, metadataOnly: false };
  }
  if (id.startsWith('page_cadence_')) {
    const cadenceTypes: RiffCadenceTypeWeights = id.includes('sustained')
      ? { tail_fill: 0.15, sustained_sus_chord: 0.7, hard_stop_rest: 0.15 }
      : id.includes('hard_stop')
        ? { tail_fill: 0.1, sustained_sus_chord: 0.2, hard_stop_rest: 0.7 }
        : { tail_fill: 0.65, sustained_sus_chord: 0.25, hard_stop_rest: 0.1 };
    return { patch: { cadenceTypes }, metadataOnly: false };
  }
  if (id.startsWith('page_density_')) {
    const sectionDensityPolicy: RiffSectionDensityPolicy = {
      transitions: [{ receiptId: id, fromDensity: 'thick', toDensity: 'thin' }],
    };
    return { patch: { sectionDensityPolicy }, metadataOnly: false };
  }
  if (id.startsWith('page_unison_')) {
    return { patch: {}, metadataOnly: true };
  }
  if (id.startsWith('zappa_solo_')) {
    const solo = soloPatchFromZappaReceipt(id, body, fields);
    return { patch: { soloGeneratorProfile: solo }, metadataOnly: false };
  }

  return { patch: {}, metadataOnly: true };
}

function parseFloatField(fields: Record<string, string>, key: string): number | undefined {
  const v = fields[key];
  if (!v) return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseIntField(fields: Record<string, string>, key: string): number | undefined {
  const v = fields[key];
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function soloPatchFromZappaReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): RiffSoloGeneratorProfile {
  const base: RiffSoloGeneratorProfile = {
    enabled: true,
    registerFloor: 60,
    registerCeiling: 84,
    chromaticBudget: 0.5,
    maxLeapSemitones: 12,
    phraseBars: 4,
    rhythmicCellEighths: [3, 3, 2],
  };
  const reg = /register:\s*(\d+)[–-](\d+)/i.exec(body);
  if (reg) {
    base.registerFloor = Number.parseInt(reg[1]!, 10);
    base.registerCeiling = Number.parseInt(reg[2]!, 10);
  }
  const cell = /rhythmicCellEighths:\s*([\d,\s]+)/i.exec(body);
  if (cell) {
    base.rhythmicCellEighths = cell[1]!
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  const chrom = parseFloatField(fields, 'chromaticbudget');
  if (chrom !== undefined) base.chromaticBudget = chrom;
  const leap = parseIntField(fields, 'maxleapsemitones');
  if (leap !== undefined) base.maxLeapSemitones = leap;
  const phrase = parseIntField(fields, 'phrasebars');
  if (phrase !== undefined) base.phraseBars = phrase;
  const floor = parseIntField(fields, 'registerfloor');
  const ceil = parseIntField(fields, 'registerceiling');
  if (floor !== undefined) base.registerFloor = floor;
  if (ceil !== undefined) base.registerCeiling = ceil;
  const ops = parseOperatorsFromBody(body);
  if (ops.length) base.variationOperators = ops;
  if (id.includes('blessed_relief')) {
    base.chromaticBudget = 0.35;
    base.maxLeapSemitones = 8;
    base.phraseBars = 8;
  }
  if (id.includes('muffin_man')) {
    base.rhythmicCellEighths = [3, 3, 2];
  }
  return base;
}

function mergePatch(acc: Partial<RiffProfile>, next: Partial<RiffProfile>): Partial<RiffProfile> {
  const out: Partial<RiffProfile> = { ...acc, ...next };
  if (next.hornStabTopology) {
    out.hornStabTopology = [...(acc.hornStabTopology ?? []), ...next.hornStabTopology];
  }
  if (next.spacePolicy) {
    out.spacePolicy = { ...acc.spacePolicy, ...next.spacePolicy };
  }
  if (next.variationOperators) {
    out.variationOperators = [...new Set([...(acc.variationOperators ?? []), ...next.variationOperators])];
  }
  if (next.variationOperatorsByStyleMode) {
    out.variationOperatorsByStyleMode = {
      ...acc.variationOperatorsByStyleMode,
      ...next.variationOperatorsByStyleMode,
    };
    for (const [mode, ops] of Object.entries(next.variationOperatorsByStyleMode)) {
      const m = mode as LedZeppelinStyleMode;
      const prev = acc.variationOperatorsByStyleMode?.[m] ?? [];
      out.variationOperatorsByStyleMode![m] = [...new Set([...prev, ...(ops ?? [])])];
    }
  }
  if (next.bowEventPolicy) {
    out.bowEventPolicy = {
      events: [...(acc.bowEventPolicy?.events ?? []), ...next.bowEventPolicy.events],
    };
  }
  if (next.fxMarkerPolicy) {
    out.fxMarkerPolicy = {
      markers: [...(acc.fxMarkerPolicy?.markers ?? []), ...next.fxMarkerPolicy.markers],
    };
  }
  if (next.sectionDensityPolicy) {
    out.sectionDensityPolicy = {
      transitions: [
        ...(acc.sectionDensityPolicy?.transitions ?? []),
        ...next.sectionDensityPolicy.transitions,
      ],
    };
  }
  if (next.bassContourPolicy) {
    out.bassContourPolicy = { ...acc.bassContourPolicy, ...next.bassContourPolicy };
  }
  if (next.loopIdentityPolicy) {
    out.loopIdentityPolicy = { ...acc.loopIdentityPolicy, ...next.loopIdentityPolicy };
  }
  if (next.repetitionPolicy) {
    out.repetitionPolicy = { ...acc.repetitionPolicy, ...next.repetitionPolicy };
  }
  if (next.soloGeneratorProfile) {
    out.soloGeneratorProfile = {
      ...acc.soloGeneratorProfile,
      ...next.soloGeneratorProfile,
      enabled: next.soloGeneratorProfile.enabled ?? acc.soloGeneratorProfile?.enabled ?? true,
    };
  }
  return out;
}

let receiptMetaCache: Record<string, Record<string, ReceiptCompileMeta>> = {};

/** Per-receipt compile flags (research ids only). */
export function compileReceiptMetadata(vrbId: string): Record<string, ReceiptCompileMeta> {
  compileReceiptsToRiffProfilePatch(vrbId);
  return { ...(receiptMetaCache[vrbId] ?? {}) };
}

/**
 * Parse fingerprintReceipts for `vrbId` and return a profile patch (research receipts only).
 * Compiled fields override stub defaults when merged in {@link resolveRiffGeneratorProfileWithMeta}.
 */
export function compileReceiptsToRiffProfilePatch(vrbId: string): Partial<RiffProfile> {
  const bundle = getVoiceRuleBundle(vrbId);
  const receipts = bundle.orchestrationPolicy?.fingerprintReceipts ?? [];
  let patch: Partial<RiffProfile> = {};
  const meta: Record<string, ReceiptCompileMeta> = {};

  for (const line of receipts) {
    const id = receiptIdFromLine(line);
    if (!RESEARCH_PREFIX.test(id)) continue;
    const body = line.includes(' — ') ? line.slice(line.indexOf(' — ') + 3) : line;
    const { patch: p, metadataOnly } = patchForReceipt(id, body);
    meta[id] = { metadataOnly };
    patch = mergePatch(patch, p);
  }

  receiptMetaCache[vrbId] = meta;
  return patch;
}

export function mergeRiffProfilePatch(base: RiffProfile, patch: Partial<RiffProfile>): RiffProfile {
  const merged = mergePatch(base, patch);
  return { ...base, ...merged } as RiffProfile;
}

export function assertPatchKeysKnown(patch: Partial<RiffProfile>): string[] {
  return Object.keys(patch).filter((k) => !RIFF_PROFILE_PATCH_KEYS.has(k));
}
