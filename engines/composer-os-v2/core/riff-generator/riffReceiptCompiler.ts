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
  RiffProfilePatch,
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

/** Semantic FZ_* cores from {@link ../composer/priority3VoiceRuleBundles} `FZ_BASE`. */
export const FRANK_ZAPPA_FZ_RECEIPT_IDS = [
  'FZ_HARM_01',
  'FZ_HARM_02',
  'FZ_MELO_01',
  'FZ_MELO_02',
  'FZ_RHY_01',
  'FZ_ORCH_01',
  'FZ_DIS_01',
  'FZ_FORM_01',
  'FZ_BASS_01',
  'FZ_GTR_01',
  'FZ_BURST',
  'FZ_METRIC_SHIFT',
  'FZ_REGISTER_COLLISION',
  'FZ_DIFF_01',
  'FZ_DIFF_02',
] as const;

/** Frank Zappa riff stub cores from {@link ../composer/riffVrbStubs} `FZ_RIFF_BASE`. */
export const FRANK_ZAPPA_RIFF_RECEIPT_IDS = [
  'FZ_RIFF_HARM_01',
  'FZ_RIFF_RHY_01',
  'FZ_RIFF_MELO_01',
  'FZ_RIFF_SOLO_01',
] as const;

/** Larry Carlton riff research cores (σ24 funk). */
export const LC_FINGERPRINT_RECEIPT_IDS = [
  'LC_REG_001',
  'LC_RHY_001',
  'LC_INT_001',
  'LC_INT_002',
  'LC_HARM_001',
  'LC_HARM_002',
  'LC_PHR_001',
  'LC_SIL_001',
  'LC_VAR_001',
  'LC_MODE_001',
] as const;

/** David Gilmour riff research cores (σ26 rock). */
export const DG_FINGERPRINT_RECEIPT_IDS = [
  'DG_REG_001',
  'DG_RHY_001',
  'DG_INT_001',
  'DG_INT_002',
  'DG_BEND_001',
  'DG_HARM_001',
  'DG_HARM_002',
  'DG_PHR_001',
  'DG_SIL_001',
  'DG_VAR_001',
  'DG_MODE_001',
] as const;

/** Frank Zappa blues-rock ferocious riff research cores (Slonimsky map lane). */
export const FZBLUES_RECEIPT_IDS = [
  'FZBLUES-MODAL',
  'FZBLUES-CHROM',
  'FZBLUES-DENS',
  'FZBLUES-RHYTHM',
  'FZBLUES-PHRASE',
  'FZBLUES-VAMP',
  'FZBLUES-VAR',
] as const;

/** Eddie Van Halen riff research cores (σ26 rock). */
export const EVH_FINGERPRINT_RECEIPT_IDS = [
  'EVH_REG_001',
  'EVH_RHY_001',
  'EVH_TAP_001',
  'EVH_INT_001',
  'EVH_INT_002',
  'EVH_HARM_001',
  'EVH_PHR_001',
  'EVH_SIL_001',
  'EVH_VAR_001',
  'EVH_MODE_001',
] as const;

export const FRANK_ZAPPA_RIFF_RECEIPT_LINES = [
  'FZ_RIFF_HARM_01 — Modal / chromatic pool; Lydian + Mixolydian + blues inflection; high chromatic budget.',
  'FZ_RIFF_RHY_01 — 7/8 feel via 3+3+2 eighth groups over 4/4; polyrhythm against straight grid.',
  'FZ_RIFF_MELO_01 — Angular contour; wide register; tritone + m6 identity leaps.',
  'FZ_RIFF_SOLO_01 — Riff-path solo lane: separate lead part; Slonimsky-adjacent cell motion (declarative).',
] as const;

const RESEARCH_PREFIX =
  /^(sly_horns_|sly_vocal_gtr_|sly_organ_|sly_bass_|sly_variation_|sly_riff_identity_|page_bow_|page_theremin_|page_fx_|page_variation_|page_doubletrack_|page_cadence_|page_density_|page_unison_|zappa_solo_|LC_|DG_|EVH_|FZBLUES_|FZ_RIFF_|FZ_|GROOVE_)/;

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
  if (/octavedisplacement|octaveshift/.test(raw)) push('registerShift');
  if (/rhythmicaaugmentation|rhythmicaugmentation/.test(raw)) push('rhythmicWarp');
  if (/vibratomicro|vibratointensity/.test(raw)) push('ornamentAdd');
  if (/bendmicro|bendandrelease|bendintensity/.test(raw)) push('ornamentAdd');
  if (/triadreharmonization|triadsuper/.test(raw)) push('harmonicColourSwap');
  if (/dynamiccontrast|dynamiccontrast/.test(raw)) push('dynamicsVariation');
  if (/delaydrivenrepetition/.test(raw)) push('startOffsetShift');
  if (/staccatovslegato|articulationswap/.test(raw)) push('articulationSwap');
  return ops;
}

function parseOperatorsListFromBody(body: string): RiffVariationOperator[] {
  const m = /variationoperators:\s*([^;]+)/i.exec(body);
  if (!m) return parseOperatorsFromBody(body);
  const ops: RiffVariationOperator[] = [];
  const push = (op: RiffVariationOperator) => {
    if (!ops.includes(op)) ops.push(op);
  };
  const tokens = m[1]!
    .toLowerCase()
    .split(',')
    .map((s) => s.trim().replace(/\s+/g, ''));
  for (const t of tokens) {
    if (/octavedisplacement|octaveshift/.test(t)) push('registerShift');
    else if (/rhythmicaaugmentation/.test(t)) push('rhythmicWarp');
    else if (/vibrato/.test(t)) push('ornamentAdd');
    else if (/bend/.test(t)) push('ornamentAdd');
    else if (/triadreharmonization/.test(t)) push('harmonicColourSwap');
    else if (/dynamic/.test(t)) push('dynamicsVariation');
    else if (/delay/.test(t)) push('startOffsetShift');
    else if (/staccato|legato/.test(t)) push('articulationSwap');
  }
  return ops;
}

function parseRangePair(text: string | undefined): [number, number] | undefined {
  if (!text) return undefined;
  const m = /(\d+)\s*[-–]\s*(\d+)/.exec(text);
  if (!m) return undefined;
  const a = Number.parseInt(m[1]!, 10);
  const b = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return [Math.min(a, b), Math.max(a, b)];
}

function parseIntervalWeightsFromBody(body: string): Record<string, number> {
  const out: Record<string, number> = {};
  const m = /intervalweights[^:]*:\s*([^;]+)/i.exec(body);
  if (!m) return out;
  for (const part of m[1]!.split(',')) {
    const p = part.trim();
    const wm = /^([mM]?2|m3|M3|P4|P5|M6)\s+([\d.]+)/.exec(p);
    if (!wm) continue;
    const key =
      wm[1] === 'M2'
        ? 'M2'
        : wm[1] === 'm2'
          ? 'm2'
          : wm[1] === 'M3'
            ? 'M3'
            : wm[1] === 'm3'
              ? 'm3'
              : wm[1] === 'P4'
                ? 'P4'
                : wm[1] === 'P5'
                  ? 'P5'
                  : wm[1] === 'M6'
                    ? 'M6'
                    : wm[1]!;
    out[key] = Number.parseFloat(wm[2]!);
  }
  return out;
}

function registerPatchFromFields(
  fields: Record<string, string>,
  defaults: { floor: number; ceil: number; mid: [number, number]; low: [number, number] }
): RiffProfilePatch {
  const floor = parseIntField(fields, 'midifloor') ?? defaults.floor;
  const ceil = parseIntField(fields, 'midiceiling') ?? defaults.ceil;
  const primary = parseRangePair(fields.primaryrange) ?? defaults.mid;
  const low = parseRangePair(fields.lowrange) ?? defaults.low;
  const fretBias = fields.fretbias ?? '';
  const pickup = fields.pickupbias ?? fields.pickup ?? '';
  return {
    riffRegisterFloor: floor,
    riffRegisterCeiling: ceil,
    registerBandPerVoice: {
      lead: { min: primary[0], max: primary[1] },
      guitar: { min: floor, max: ceil },
    },
    tuningPolicy: {
      midiFloor: floor,
      midiCeiling: ceil,
      riffLowBand: low,
      riffMidBand: primary,
      tuningOptions: {
        fretBiasLow: fretBias.includes('5') ? 5 : 0,
        fretBiasHigh: fretBias.includes('12') ? 12 : 17,
        pickupBias: pickup.includes('bridge') ? 0.85 : pickup.includes('neck') ? 0.9 : 0.5,
        gainProfile: /warm|moderate/.test(fields.gainprofile ?? '') ? 0.75 : 0.65,
        compressionBias: /longduration|compression/.test(fields.compressionbias ?? '') ? 0.8 : 0.4,
      },
    },
  };
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

function patchForReceipt(id: string, body: string): { patch: RiffProfilePatch; metadataOnly: boolean } {
  const fields = fieldMap(body);

  if (id.startsWith('GROOVE_')) {
    return { patch: {}, metadataOnly: true };
  }

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
  if (id.startsWith('FZBLUES_')) {
    return patchForFzBluesReceipt(id, body, fields);
  }
  if (id.startsWith('FZ_RIFF_')) {
    return patchForFzRiffReceipt(id, body, fields);
  }
  if (id.startsWith('FZ_')) {
    return patchForFzReceipt(id, body, fields);
  }
  if (id.startsWith('LC_')) {
    return patchForLcReceipt(id, body, fields);
  }
  if (id.startsWith('DG_')) {
    return patchForDgReceipt(id, body, fields);
  }
  if (id.startsWith('EVH_')) {
    return patchForEvhReceipt(id, body, fields);
  }

  return { patch: {}, metadataOnly: true };
}

function parseScalePoolFromBody(body: string): Record<string, number> {
  const out: Record<string, number> = {};
  const m = /scalepool:\s*([^;]+)/i.exec(body);
  if (!m) return out;
  const tier: Record<string, number> = {
    vhigh: 0.9,
    high: 0.75,
    mod: 0.55,
    moderate: 0.55,
    low: 0.35,
  };
  for (const part of m[1]!.split(',')) {
    const p = part.trim();
    const wm = /^([a-zA-Z]+(?:[A-Z][a-z]*)*)\s+([\d.]+|vhigh|high|mod|moderate|low)/i.exec(p);
    if (wm) {
      const name = wm[1]!;
      const w = tier[wm[2]!.toLowerCase()] ?? Number.parseFloat(wm[2]!);
      if (Number.isFinite(w)) out[name] = w;
      continue;
    }
    const nm = /^([a-zA-Z]+)/.exec(p);
    if (nm) out[nm[1]!] = out[nm[1]!] ?? 0.65;
  }
  return out;
}

function parseChordToneRatio(fields: Record<string, string>, body: string): number | undefined {
  const explicit = parseFloatField(fields, 'chordtoneratio');
  if (explicit !== undefined) return explicit;
  const m = /chord\s+([\d.]+)/i.exec(fields.chordtoneratio ?? body);
  if (m) return Number.parseFloat(m[1]!);
  const m2 = /chordtoneRatio chord\s+([\d.]+)/i.exec(body);
  if (m2) return Number.parseFloat(m2[1]!);
  const m3 = /chord\s+([\d.]+)\s+scale/i.exec(body);
  if (m3) return Number.parseFloat(m3[1]!);
  return undefined;
}

function parsePhraseLengthBeats(body: string, fields: Record<string, string>): number[] | undefined {
  const raw = fields.phraselengthbeats ?? fields.phraselength;
  if (raw) {
    return raw
      .split(/[, ]+/)
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  const m = /phraseLengthBeats\s+([\d,\s]+)/i.exec(body);
  if (!m) return undefined;
  return m[1]!
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function patchForLcReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): { patch: RiffProfilePatch; metadataOnly: boolean } {
  if (id.startsWith('LC_REG_')) {
    return {
      patch: registerPatchFromFields(fields, { floor: 40, ceil: 84, mid: [55, 79], low: [40, 55] }),
      metadataOnly: false,
    };
  }
  if (id.startsWith('LC_RHY_')) {
    return {
      patch: {
        rhythmFeel: {
          primarySubdivision: '16th',
          feelProfiles: ['funk', 'jazz_fusion'],
          swingRatio: { straight: 0.55, shuffle: 0.45 },
          beatPlacement: 'slightly_behind',
        },
        swingStyle: 'funk16th',
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('LC_INT_')) {
    return { patch: { intervalWeights: parseIntervalWeightsFromBody(body) }, metadataOnly: false };
  }
  if (id.startsWith('LC_HARM_')) {
    const scalePool = parseScalePoolFromBody(body);
    if (id.includes('_002')) {
      const chordRatio = parseChordToneRatio(fields, body) ?? 0.7;
      const strongBeat = parseFloatField(fields, 'strongbeatchordtone') ?? 0.85;
      const guide = /7th.*3rd|guideTone/i.test(body);
      const triadSuper = /triadsuper|triadSuperimposition high/i.test(body);
      return {
        patch: {
          scalePool: Object.keys(scalePool).length ? scalePool : { pentatonic: 0.85, Dorian: 0.75, Mixolydian: 0.7 },
          chromaticApproachRules: guide
            ? [{ degrees: [7, 3], chordContext: 'dominant', probability: 0.85 }]
            : undefined,
          tuningPolicy: {
            midiFloor: 40,
            midiCeiling: 84,
            riffLowBand: [40, 55],
            riffMidBand: [55, 79],
            tuningOptions: {
              chordToneRatio: chordRatio,
              scaleToneRatio: 1 - chordRatio,
              strongBeatChordToneFreq: strongBeat,
              triadSuperimposition: triadSuper ? 0.85 : 0.5,
            },
          },
        },
        metadataOnly: false,
      };
    }
    return {
      patch: {
        scalePool: Object.keys(scalePool).length
          ? scalePool
          : { pentatonic: 0.85, Dorian: 0.75, Mixolydian: 0.7, Ionian: 0.6, Lydian: 0.55 },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 84,
          riffLowBand: [40, 55],
          riffMidBand: [55, 79],
          tuningOptions: { blueNote: /moderate/.test(body) ? 0.55 : 0.4 },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('LC_PHR_')) {
    const beats = parsePhraseLengthBeats(body, fields) ?? [4, 8];
    const peak =
      parseFloatField(fields, 'peakthenresolve') ??
      (() => {
        const m = /peakThenResolve\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.6;
      })();
    const resolved =
      parseFloatField(fields, 'resolved') ??
      (() => {
        const m = /resolved\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.6;
      })();
    const hanging =
      parseFloatField(fields, 'hanging') ??
      (() => {
        const m = /hanging\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.4;
      })();
    return {
      patch: {
        phraseLengthBeats: beats,
        cadenceTypes: {
          tail_fill: resolved,
          sustained_sus_chord: hanging,
          hard_stop_rest: Math.max(0, 1 - resolved - hanging),
        },
        contourPreferences: {
          heavyRiffs: { descending: peak * 0.4, ascending: peak * 0.35, arched: peak * 0.25 },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('LC_SIL_')) {
    const callResp = /very_high|very high/i.test(body) ? 0.9 : 0.65;
    return {
      patch: {
        silencePolicy: {
          restProbabilityBySlot: Array(16).fill(0.12),
          styleClass: 'lc_funk_space',
          funkGridPreset: 'jamesBrown',
        },
        spacePolicy: {
          internalRestProb: 0.42,
          phraseEndRestBeats: [0.5, 1],
          callResponsePattern: callResp >= 0.85 ? 'very_high_call_response' : 'call_response_funk',
        },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 84,
          riffLowBand: [40, 55],
          riffMidBand: [55, 79],
          tuningOptions: {
            eventsPerBarRiffMin: 8,
            eventsPerBarRiffMax: 16,
            eventsPerBarRiffTypical: 12,
            eventsPerBarMelodicMin: 6,
            eventsPerBarMelodicMax: 14,
            eventsPerBarMelodicTypical: 10,
            restDevice: 0.85,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('LC_VAR_')) {
    const ops = parseOperatorsListFromBody(body);
    return { patch: { variationOperators: ops.length ? ops : ['registerShift', 'rhythmicWarp', 'ornamentAdd'] }, metadataOnly: false };
  }
  if (id.startsWith('LC_MODE_')) {
    return {
      patch: {
        styleModes: {
          blues_rock: { scales: ['pentatonic', 'Mixolydian'] },
          folk_modal: { scales: ['Dorian', 'Ionian'], droneUsage: 'medium' },
        },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 84,
          riffLowBand: [40, 55],
          riffMidBand: [55, 79],
          tuningOptions: {
            funkRiffModeDensityMin: 12,
            funkRiffModeDensityMax: 16,
            melodicSessionModeDensityMin: 8,
            melodicSessionModeDensityMax: 12,
            smoothJazzLeadModeDensityMin: 10,
            smoothJazzLeadModeDensityMax: 14,
            lcStyleModeSwitch: 1,
          },
        },
      },
      metadataOnly: false,
    };
  }
  return { patch: {}, metadataOnly: true };
}

function patchForDgReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): { patch: RiffProfilePatch; metadataOnly: boolean } {
  if (id.startsWith('DG_REG_')) {
    return {
      patch: registerPatchFromFields(fields, { floor: 40, ceil: 88, mid: [52, 79], low: [40, 52] }),
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_RHY_')) {
    const densityRiff = parseRangePair(fields.densityriff) ?? [4, 12];
    const densityLead = parseRangePair(fields.densitylead) ?? [2, 10];
    return {
      patch: {
        rhythmFeel: {
          primarySubdivision: '8th',
          feelProfiles: ['rock_ballad', 'pulse_riff'],
          swingRatio: { straight: 0.7, shuffle: 0.3 },
          beatPlacement: /slightlybehind|slightly_behind/.test(body) ? 'slightly_behind' : 'on_grid',
        },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 88,
          riffLowBand: [40, 52],
          riffMidBand: [52, 79],
          tuningOptions: {
            densityRiffMin: densityRiff[0],
            densityRiffMax: densityRiff[1],
            densityRiffTypical: 8,
            densityLeadMin: densityLead[0],
            densityLeadMax: densityLead[1],
            densityLeadTypical: 5,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_INT_')) {
    return { patch: { intervalWeights: parseIntervalWeightsFromBody(body) }, metadataOnly: false };
  }
  if (id.startsWith('DG_BEND_')) {
    return {
      patch: {
        ornamentPolicy: { slides: true, ghosts: false, graceAttacks: true, bends: true, deadNotes: false },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 88,
          riffLowBand: [40, 52],
          riffMidBand: [52, 79],
          tuningOptions: {
            bendHalfStep: 0.9,
            bendWholeStep: 0.9,
            bendStep1_5: 0.75,
            bendStep2: 0.55,
            bendQuarterTone: 0.75,
            preBend: 0.65,
            vibratoRateSlow: 0.9,
            vibratoRateMod: 0.7,
            vibratoRateFast: 0.25,
            vibratoDepthNarrow: 0.4,
            vibratoDepthModerate: 0.65,
            vibratoDepthWide: 0.85,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_HARM_')) {
    const scalePool = parseScalePoolFromBody(body);
    if (id.includes('_002')) {
      const chordRatio = parseChordToneRatio(fields, body) ?? 0.5;
      const strongBeat = parseFloatField(fields, 'strongbeatchordtone') ?? 0.6;
      return {
        patch: {
          scalePool: Object.keys(scalePool).length
            ? scalePool
            : { minorPentatonic: 0.9, majorPentatonic: 0.75, bluesScale: 0.55, Mixolydian: 0.55 },
          tuningPolicy: {
            midiFloor: 40,
            midiCeiling: 88,
            riffLowBand: [40, 52],
            riffMidBand: [52, 79],
            tuningOptions: {
              chordToneRatio: chordRatio,
              scaleToneRatio: 1 - chordRatio,
              strongBeatChordToneFreq: strongBeat,
              bendToChordTone: /bendToChordTone|bend to chord/i.test(body) ? 0.9 : 0.75,
            },
          },
        },
        metadataOnly: false,
      };
    }
    const pentRatio = parseFloatField(fields, 'pentatonicratio') ?? 0.85;
    return {
      patch: {
        scalePool: Object.keys(scalePool).length
          ? scalePool
          : { minorPentatonic: 0.9, majorPentatonic: 0.75, bluesScale: 0.55, Mixolydian: 0.55, Dorian: 0.35 },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 88,
          riffLowBand: [40, 52],
          riffMidBand: [52, 79],
          tuningOptions: {
            pentatonicRatio: pentRatio,
            bluesOverMajor: /bluesOverMajor|blues over major/i.test(body) ? 0.9 : 0.7,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_PHR_')) {
    const beats = parsePhraseLengthBeats(body, fields) ?? [8, 16, 32];
    const climb = parseFloatField(fields, 'slowclimtopeak') ?? parseFloatField(fields, 'slowclimbtopeak') ?? 0.65;
    const sustained = parseFloatField(fields, 'sustainedfade') ?? 0.6;
    const resolved = parseFloatField(fields, 'resolved') ?? 0.4;
    return {
      patch: {
        phraseLengthBeats: beats,
        cadenceTypes: {
          tail_fill: resolved,
          sustained_sus_chord: sustained,
          hard_stop_rest: Math.max(0, 1 - resolved - sustained),
        },
        contourPreferences: {
          heavyRiffs: { descending: climb * 0.25, ascending: climb * 0.55, arched: climb * 0.2 },
        },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 88,
          riffLowBand: [40, 52],
          riffMidBand: [52, 79],
          tuningOptions: {
            emotionalArcSparse: 0.25,
            emotionalArcBuild: 0.35,
            emotionalArcPeak: 0.25,
            emotionalArcSustain: 0.15,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_SIL_')) {
    return {
      patch: {
        silencePolicy: {
          restProbabilityBySlot: Array(8).fill(0.08),
          styleClass: 'dg_sustain_space',
          rockRiffPreset: 'generic',
        },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 88,
          riffLowBand: [40, 52],
          riffMidBand: [52, 79],
          tuningOptions: {
            sustainedNoteBias: 0.9,
            delayTailRhythm: 0.9,
            delayTailMsMin: 300,
            delayTailMsMax: 630,
            spaceFunctionEmotional: 0.7,
            spaceFunctionRhythmic: 0.3,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_VAR_')) {
    const ops = parseOperatorsListFromBody(body);
    return {
      patch: { variationOperators: ops.length ? ops : ['dynamicsVariation', 'ornamentAdd', 'registerShift'] },
      metadataOnly: false,
    };
  }
  if (id.startsWith('DG_MODE_')) {
    return {
      patch: {
        styleModes: {
          blues_rock: { scales: ['minorPentatonic', 'bluesScale'] },
          epic_modal_heavy: { scales: ['Mixolydian', 'Dorian'], droneUsage: 'high' },
        },
        tuningPolicy: {
          midiFloor: 40,
          midiCeiling: 88,
          riffLowBand: [40, 52],
          riffMidBand: [52, 79],
          tuningOptions: {
            slowBurnLeadModeDensityMin: 2,
            slowBurnLeadModeDensityMax: 6,
            rhythmicRiffModeDensityMin: 6,
            rhythmicRiffModeDensityMax: 12,
            texturalAtmosphericModeDensityMin: 2,
            texturalAtmosphericModeDensityMax: 8,
            dgStyleModeSwitch: 1,
          },
        },
      },
      metadataOnly: false,
    };
  }
  return { patch: {}, metadataOnly: true };
}

function parseEvhVariationOperators(body: string): RiffVariationOperator[] {
  const ops = parseOperatorsListFromBody(body);
  const push = (op: RiffVariationOperator) => {
    if (!ops.includes(op)) ops.push(op);
  };
  if (/octaveshift|octavedisplacement/i.test(body)) push('registerShift');
  if (/rhythmicdisplacement|rhythmicwarp/i.test(body)) push('rhythmicWarp');
  if (/whammydivebomb|whammy/i.test(body)) push('ornamentAdd');
  if (/sus2tosus4|sus2.*sus4/i.test(body)) push('harmonicColourSwap');
  if (/dynamiccontrast/i.test(body)) push('dynamicsVariation');
  if (/tapvspicked|tap.*picked/i.test(body)) push('articulationSwap');
  return ops.length
    ? ops
    : ['registerShift', 'rhythmicWarp', 'dynamicsVariation', 'harmonicColourSwap', 'articulationSwap'];
}

function patchForEvhReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): { patch: RiffProfilePatch; metadataOnly: boolean } {
  const evhTuningBase = {
    midiFloor: 40,
    midiCeiling: 88,
    riffLowBand: [40, 64] as [number, number],
    riffMidBand: [52, 76] as [number, number],
  };

  if (id.startsWith('EVH_REG_')) {
    const gain = parseFloatField(fields, 'gain') ?? 0.8;
    const brown = /brownsound|brown sound/i.test(body) || fields.brownsound === 'true';
    const leadRange = parseRangePair(fields.leadrange) ?? [5, 17];
    const reg = registerPatchFromFields(fields, { floor: 40, ceil: 88, mid: [52, 76], low: [40, 64] });
    return {
      patch: {
        ...reg,
        tuningPolicy: {
          ...reg.tuningPolicy,
          ...evhTuningBase,
          tuningOptions: {
            ...reg.tuningPolicy?.tuningOptions,
            gain,
            brownSound: brown ? 0.85 : 0.7,
            bridgeHumbuckerDominant: /bridge/i.test(fields.pickupbias ?? body) ? 0.95 : 0.8,
            fretSweetSpotLow: 5,
            fretSweetSpotHigh: 12,
            leadFretLow: leadRange[0],
            leadFretHigh: leadRange[1],
            naturalHarmonicFret5: 1,
            naturalHarmonicFret7: 1,
            naturalHarmonicFret12: 1,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_RHY_')) {
    const ghost =
      parseFloatField(fields, 'ghostnotedensity') ??
      (() => {
        const m = /ghostnotedensity\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.05;
      })();
    return {
      patch: {
        rhythmFeel: {
          primarySubdivision: '16th',
          feelProfiles: ['straight_0.95', 'syncopated_onset', 'palm_mute_downstroke'],
          swingRatio: { straight: 0.95, shuffle: 0.05 },
          beatPlacement: /slightlyahead|slightly_ahead/i.test(body) ? 'slightly_ahead' : 'on_grid',
        },
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: {
            palmMutingHigh: /extensive|high/i.test(body) ? 1.0 : 0.85,
            allDownstrokePreference: /downstroke.*high|high.*downstroke/i.test(body) ? 0.9 : 0.75,
            ghostNoteDensity: ghost,
            syncopationHigh: /syncopation.*high/i.test(body) ? 1.0 : 0.7,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_TAP_')) {
    const tapRatio =
      parseFloatField(fields, 'taptopulloffratio') ??
      (() => {
        const m = /taptopulloffratio\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.33;
      })();
    return {
      patch: {
        groupingPatterns: [[1, 1, 1], [3, 3, 3]],
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: {
            tapPattern: 1.0,
            tapToPulloffRatio: tapRatio,
            tapInterval_m3: 0.4,
            tapInterval_M3: 0.25,
            tapInterval_P4: 0.2,
            tapInterval_octave: 0.15,
            tapFret5: 1,
            tapFret7: 1,
            tapFret12: 1,
            tapFret14: 1,
            tapFret17: 1,
            tapTripletSyncopated: /syncopated/i.test(body) ? 1.0 : 0.75,
            tapTriadMajor: 1.0,
            tapTriadMinor: 1.0,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_INT_')) {
    if (id.includes('_002')) {
      return {
        patch: {
          intervalWeights: { m3: 0.4, M3: 0.25, P4: 0.2, P5: 0.15 },
          tuningPolicy: {
            ...evhTuningBase,
            tuningOptions: { chromaticRunsHigh: 1.0, wideLeapsHigh: 1.0 },
          },
        },
        metadataOnly: false,
      };
    }
    const openDrone =
      parseFloatField(fields, 'openstringdroneprob') ??
      (() => {
        const m = /openstringdroneprob\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.35;
      })();
    const whammy =
      parseFloatField(fields, 'whammydivebombprob') ??
      (() => {
        const m = /whammydivebombprob\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.3;
      })();
    return {
      patch: {
        intervalWeights: { P5: 0.4, P4: 0.2, m3: 0.15, M3: 0.1 },
        textureMix: {
          singleNoteRiff: 0.2,
          powerChordRiff: 0.4,
          hybridSinglePlusChord: 0.3,
          openStringDroneProb: openDrone,
        },
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: {
            powerChordWeight: 0.4,
            susWeight: 0.3,
            majorMinorMixWeight: 0.2,
            add9Weight: 0.1,
            whammyDiveBombProb: whammy,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_HARM_')) {
    const scalePool = parseScalePoolFromBody(body);
    const susHigh = /sususage.*very_high|very high sus/i.test(body);
    return {
      patch: {
        scalePool: Object.keys(scalePool).length
          ? scalePool
          : { Mixolydian: 0.6, Dorian: 0.3, vanHalenScale: 0.1 },
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: {
            harmonicMajor: 0.75,
            harmonicMinor: 0.15,
            harmonicModal: 0.1,
            susUsageVeryHigh: susHigh ? 1.0 : 0.85,
            openStringDroneHigh: /openstringdrone.*high/i.test(body) ? 1.0 : 0.75,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_PHR_')) {
    const beats = parsePhraseLengthBeats(body, fields) ?? [8, 16];
    const hanging =
      parseFloatField(fields, 'hangingsuspended') ??
      (() => {
        const m = /hangingsuspended\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.5;
      })();
    const resolved =
      parseFloatField(fields, 'resolvedroot') ??
      (() => {
        const m = /resolvedroot\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.3;
      })();
    const openEnded =
      parseFloatField(fields, 'openended') ??
      (() => {
        const m = /openended\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.2;
      })();
    return {
      patch: {
        phraseLengthBeats: beats,
        cadenceTypes: {
          sustained_sus_chord: hanging,
          tail_fill: resolved,
          hard_stop_rest: openEnded,
        },
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: { loopLength2Bar: 0.5, loopLength4Bar: 0.5 },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_SIL_')) {
    const callResp = /very_high|very high/i.test(body) ? 0.9 : 0.65;
    return {
      patch: {
        silencePolicy: {
          restProbabilityBySlot: Array(16).fill(0.12),
          styleClass: 'Busy',
          rockRiffPreset: 'generic',
        },
        spacePolicy: {
          internalRestProb: 0.15,
          phraseEndRestBeats: [0.25, 0.5],
          callResponsePattern: callResp >= 0.85 ? 'very_high_call_response' : 'rhythm_palm_mute_then_lead_tap_answer',
        },
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: {
            eventsPerBarRhythmMin: 16,
            eventsPerBarRhythmMax: 32,
            eventsPerBarRhythmTypical: 24,
            eventsPerBarLeadMin: 32,
            eventsPerBarLeadMax: 48,
            eventsPerBarLeadTypical: 40,
            intraBarRestProb: 0.15,
            callResponseWithVocals: callResp,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('EVH_VAR_')) {
    const ops = parseEvhVariationOperators(body);
    return { patch: { variationOperators: ops }, metadataOnly: false };
  }
  if (id.startsWith('EVH_MODE_')) {
    return {
      patch: {
        styleModes: {
          blues_rock: { scales: ['Mixolydian', 'power5', 'sus4', 'sus2'] },
        },
        tuningPolicy: {
          ...evhTuningBase,
          tuningOptions: {
            rhythmModeDensityMin: 16,
            rhythmModeDensityMax: 24,
            leadModeDensityMin: 32,
            leadModeDensityMax: 48,
            rhythmModePalmMute: 1.0,
            leadModeLegato31: 1.0,
            tappingModeTriplet: 1.0,
            harmonicTapsAt12: 1.0,
            harmonicTapsAt14: 1.0,
            evhStyleModeSwitch: 1,
          },
        },
      },
      metadataOnly: false,
    };
  }
  return { patch: {}, metadataOnly: true };
}

function parseFzBluesModalBase(body: string): string[] {
  const m = /modalbase:\s*([^;]+)/i.exec(body);
  if (!m) return ['Dorian', 'Mixolydian'];
  return m[1]!
    .split(/[, ]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseFzBluesRhythmicGroupings(body: string): number[][] {
  const groups: number[][] = [];
  if (/hemiola/i.test(body)) groups.push([3, 3, 2]);
  if (/\b5\b/.test(body) || /grouping.*5/i.test(body)) groups.push([2, 3]);
  if (/\b7\b/.test(body) || /grouping.*7/i.test(body)) groups.push([3, 2, 2]);
  if (/\b3\b/.test(body)) groups.push([3, 3, 3]);
  return groups.length ? groups : [[3, 3, 2], [2, 3]];
}

function parseFzBluesVariationOperators(body: string): RiffVariationOperator[] {
  const ops: RiffVariationOperator[] = [];
  const push = (op: RiffVariationOperator) => {
    if (!ops.includes(op)) ops.push(op);
  };
  if (/octavedisplacement|octaveshift/i.test(body)) push('registerShift');
  if (/cycledmotif|rhythmicvariation/i.test(body)) push('rhythmicWarp');
  if (/tremolo|textureburst/i.test(body)) push('strumPatternChange');
  if (/pullOff|ornament/i.test(body)) push('ornamentAdd');
  if (/neighbour|mingling|chromatic/i.test(body)) push('chromaticAdd');
  return ops.length ? ops : ['rhythmicWarp', 'registerShift', 'ornamentAdd'];
}

function fzBluesReceiptKind(id: string): string | null {
  const norm = id.toUpperCase().replace(/_/g, '-');
  if (norm.includes('FZBLUES-MODAL')) return 'MODAL';
  if (norm.includes('FZBLUES-CHROM')) return 'CHROM';
  if (norm.includes('FZBLUES-DENS')) return 'DENS';
  if (norm.includes('FZBLUES-RHYTHM') || norm.includes('FZBLUES-RHY')) return 'RHYTHM';
  if (norm.includes('FZBLUES-PHRASE') || norm.includes('FZBLUES-PHR')) return 'PHRASE';
  if (norm.includes('FZBLUES-VAMP')) return 'VAMP';
  if (norm.includes('FZBLUES-VAR')) return 'VAR';
  if (norm.includes('FZBLUES-SIL')) return 'SIL';
  if (norm.includes('FZBLUES-REG')) return 'REG';
  return null;
}

function patchForFzBluesReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): { patch: RiffProfilePatch; metadataOnly: boolean } {
  const profile = {
    modalBase: parseFzBluesModalBase(body),
    pentatonicAnchor: parseFloatField(fields, 'pentatonicanchorratio') ?? 0.38,
    chromaticBudget: parseFloatField(fields, 'chromaticbudget') ?? 0.3,
  };
  const kind = fzBluesReceiptKind(id);

  if (kind === 'MODAL') {
    const pool: Record<string, number> = {};
    for (const mode of profile.modalBase) {
      pool[mode] = 0.55;
    }
    return {
      patch: {
        scalePool: pool,
        soloGeneratorProfile: {
          enabled: true,
          scalePool: pool,
          scaleMinglingEnabled: /scalemingling|mingling.*true/i.test(body),
        },
        tuningPolicy: {
          tuningOptions: {
            pentatonicAnchorRatio: profile.pentatonicAnchor,
            scaleMinglingEnabled: /scalemingling|mingling.*true/i.test(body) ? 1 : 0,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'CHROM') {
    return {
      patch: {
        chromaticBudget: profile.chromaticBudget,
        soloGeneratorProfile: {
          enabled: true,
          chromaticBudget: profile.chromaticBudget,
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'DENS') {
    const minD = parseIntField(fields, 'notedensitymin') ?? 8;
    const maxD = parseIntField(fields, 'notedensitymax') ?? 24;
    const range = { min: minD, max: maxD };
    const m = /notedensityrange[:\s]+\{?\s*min:\s*(\d+)[,\s]+max:\s*(\d+)/i.exec(body);
    if (m) {
      range.min = Number.parseInt(m[1]!, 10);
      range.max = Number.parseInt(m[2]!, 10);
    }
    return {
      patch: {
        soloGeneratorProfile: {
          enabled: true,
          noteDensityRange: range,
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'RHYTHM') {
    return {
      patch: {
        chromaticBudget: profile.chromaticBudget,
        groupingPatterns: parseFzBluesRhythmicGroupings(body),
        oddMeterUsage: {
          meters: [
            { label: '5/4', groups: [3, 2] },
            { label: '7/8', groups: [3, 2, 2] },
          ],
          isSuperimposed: /hemiola/i.test(body),
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'PHRASE') {
    const arch = /contourshape.*arch|arch contour/i.test(body);
    return {
      patch: {
        contourPreferences: arch
          ? { heavyRiffs: { descending: 0.25, ascending: 0.45, arched: 0.3 } }
          : undefined,
        ornamentPolicy: {
          slides: /openstringpulloff|pulloff/i.test(body),
          ghosts: false,
          graceAttacks: true,
          bends: /threequarter|3\/4.*bend/i.test(body),
          deadNotes: false,
        },
        cadenceTypes: {
          tail_fill: /hardcut/i.test(body) ? 0.2 : 0.35,
          sustained_sus_chord: /feedbacksustain/i.test(body) ? 0.45 : 0.3,
          hard_stop_rest: /hardcut/i.test(body) ? 0.35 : 0.25,
        },
        tuningPolicy: {
          tuningOptions: {
            phraseEndingOpenStringPullOff: /openstringpulloff/i.test(body) ? 1 : 0,
            phraseEndingFeedbackSustain: /feedbacksustain/i.test(body) ? 1 : 0,
            phraseEndingThreeQuarterBend: /threequarter/i.test(body) ? 1 : 0,
            phraseEndingHardCut: /hardcut/i.test(body) ? 1 : 0,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'SIL') {
    return {
      patch: {
        silencePolicy: {
          restProbabilityBySlot: Array(16).fill(0.06),
          styleClass: 'Sparse',
          rockRiffPreset: 'generic',
        },
        tuningPolicy: {
          tuningOptions: {
            feedbackSustainAsRest: /feedbacksustainasrest/i.test(body) ? 1 : 0,
            hardCutAtSectionBoundary: /hardcutatsection/i.test(body) ? 1 : 0,
            restDensityLow: /restdensitylow/i.test(body) ? 1 : 0,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'VAR') {
    return { patch: { variationOperators: parseFzBluesVariationOperators(body) }, metadataOnly: false };
  }
  if (kind === 'REG') {
    const lowProb =
      parseFloatField(fields, 'lowstringmelodyprobability') ??
      (() => {
        const m = /lowstringmelodyprobability\s+([\d.]+)/i.exec(body);
        return m ? Number.parseFloat(m[1]!) : 0.25;
      })();
    return {
      patch: {
        registerAnchor: 'mid_register',
        tuningPolicy: {
          tuningOptions: {
            lowStringMelodyProbability: lowProb,
            feedbackHighRegisterMarker: /feedbackhighregister/i.test(body) ? 1 : 0,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (kind === 'VAMP') {
    const patterns = fields.keyvamppatterns ?? body.match(/keyvamppatterns[:\s]+([^;]+)/i)?.[1];
    const vampType = fields.vamptype ?? (body.match(/vamptype[:\s]+([a-zA-Z]+)/i)?.[1] ?? 'pedalOrTwoChord');
    return {
      patch: {
        homeChordType: 'power5',
        pedalPoint: { enabled: /pedal/i.test(vampType), targets: patterns ?? 'i-bVI7' },
        tuningPolicy: {
          tuningOptions: {
            vampType,
            keyVampPatternCount: patterns ? patterns.split(/[, ]+/).filter(Boolean).length : 4,
          },
        },
      },
      metadataOnly: false,
    };
  }
  return { patch: {}, metadataOnly: true };
}

function parseChromaticBudgetFromBody(body: string, fields: Record<string, string>): number {
  const explicit = parseFloatField(fields, 'chromaticbudget');
  if (explicit !== undefined) return explicit;
  if (/high chromatic budget/i.test(body)) return 0.58;
  if (/complex meters|metric resets|anti-metric/i.test(body)) return 0.56;
  if (/dissonance tolerance|unresolved clusters/i.test(body)) return 0.54;
  if (/angular chromatic bass/i.test(body)) return 0.52;
  return 0.5;
}

function defaultFzMeloOperators(body: string): RiffVariationOperator[] {
  const ops = parseOperatorsFromBody(body);
  const push = (op: RiffVariationOperator) => {
    if (!ops.includes(op)) ops.push(op);
  };
  if (/register jump|wide leap|angular/i.test(body)) {
    push('registerShift');
    push('rhythmicWarp');
  }
  if (/wrong metre|motivic/i.test(body)) push('startOffsetShift');
  if (/sprechstimme|colour/i.test(body)) push('ornamentAdd');
  return ops;
}

function patchForFzReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): { patch: RiffProfilePatch; metadataOnly: boolean } {
  if (id === 'FZ_BURST') {
    return {
      patch: {
        sectionDensityPolicy: {
          transitions: [
            { receiptId: id, fromDensity: 'thin', toDensity: 'thick' },
            { receiptId: id, fromDensity: 'thick', toDensity: 'thin' },
          ],
        },
        cadenceTypes: { tail_fill: 0.12, sustained_sus_chord: 0.08, hard_stop_rest: 0.8 },
        soloGeneratorProfile: {
          enabled: true,
          noteDensityRange: { min: 6, max: 28 },
        },
      },
      metadataOnly: false,
    };
  }
  if (id === 'FZ_METRIC_SHIFT') {
    const base = parseFloatField(fields, 'metricdisplacement') ?? 0.55;
    return {
      patch: {
        metricDisplacement: Math.min(1, base + 0.25),
        groupingPatterns: [[3, 3, 2], [2, 2, 2, 1]],
        oddMeterUsage: { meters: [{ label: '7/8', groups: [3, 3, 2] }], isSuperimposed: true },
      },
      metadataOnly: false,
    };
  }
  if (id === 'FZ_REGISTER_COLLISION') {
    const reg = registerPatchFromFields(fields, { floor: 40, ceil: 84, mid: [48, 80], low: [40, 55] });
    const ops: RiffVariationOperator[] = ['registerShift', 'rhythmicWarp', 'cellTransposition'];
    return {
      patch: {
        ...reg,
        riffRegisterFloor: 40,
        riffRegisterCeiling: 84,
        variationOperators: ops,
        tuningPolicy: {
          ...reg.tuningPolicy,
          midiFloor: 40,
          midiCeiling: 84,
          tuningOptions: {
            ...reg.tuningPolicy?.tuningOptions,
            zappaRegisterSwapForced: 1,
          },
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_MELO_')) {
    const ops = defaultFzMeloOperators(body);
    return { patch: { variationOperators: ops.length ? ops : ['registerShift', 'rhythmicWarp'] }, metadataOnly: false };
  }
  if (id.startsWith('FZ_RHY_')) {
    return { patch: { chromaticBudget: parseChromaticBudgetFromBody(body, fields) }, metadataOnly: false };
  }
  if (id.startsWith('FZ_HARM_')) {
    return {
      patch: {
        chordQualitySet: ['dom7', 'maj7', 'min7', 'sus4', 'dim', 'aug', 'maj', 'min'],
        tritoneStable: true,
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_BASS_')) {
    const bass: RiffBassContourPolicy = {
      melodicCounterpart: true,
      anticipateBeats: [0, 2],
      octaveJumpProbability: 0.45,
    };
    return { patch: { bassContourPolicy: bass, chromaticBudget: parseChromaticBudgetFromBody(body, fields) }, metadataOnly: false };
  }
  if (id.startsWith('FZ_FORM_')) {
    return {
      patch: {
        repetitionPolicy: {
          exactLoopAllowed: false,
          pedalToneAllowed: true,
          barIdentityPersistence: 0.25,
          minExactRepetitions: 1,
        },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_DIS_')) {
    return {
      patch: { tritoneStable: true, chromaticBudget: parseChromaticBudgetFromBody(body, fields) },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_GTR_')) {
    return {
      patch: {
        ornamentPolicy: { slides: true, ghosts: true, graceAttacks: true, bends: true, deadNotes: false },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_ORCH_')) {
    return {
      patch: {
        ensembleInterlockMode: 'layeredOstinati',
        textureMix: { singleNoteRiff: 0.35, powerChordRiff: 0.25, hybridSinglePlusChord: 0.4 },
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_DIFF_')) {
    return { patch: {}, metadataOnly: true };
  }
  return { patch: {}, metadataOnly: true };
}

function patchForFzRiffReceipt(
  id: string,
  body: string,
  fields: Record<string, string>
): { patch: RiffProfilePatch; metadataOnly: boolean } {
  if (id.startsWith('FZ_RIFF_HARM_')) {
    return {
      patch: {
        scalePool: { Lydian: 0.55, Mixolydian: 0.5, blues: 0.4 },
        chromaticBudget: parseChromaticBudgetFromBody(body, fields),
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_RIFF_RHY_')) {
    return {
      patch: {
        groupingPatterns: [[3, 3, 2]],
        oddMeterUsage: { meters: [{ label: '7/8', groups: [3, 3, 2] }], isSuperimposed: true },
        chromaticBudget: parseChromaticBudgetFromBody(body, fields),
      },
      metadataOnly: false,
    };
  }
  if (id.startsWith('FZ_RIFF_MELO_')) {
    const ops = defaultFzMeloOperators(body);
    if (!ops.includes('chromaticAdd')) ops.push('chromaticAdd');
    return { patch: { variationOperators: ops, tritoneStable: true }, metadataOnly: false };
  }
  if (id.startsWith('FZ_RIFF_SOLO_')) {
    return {
      patch: {
        soloGeneratorProfile: {
          enabled: true,
          registerFloor: 60,
          registerCeiling: 84,
          phraseBars: 4,
          rhythmicCellEighths: [3, 3, 2],
        },
      },
      metadataOnly: false,
    };
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

function mergePatch(acc: RiffProfilePatch, next: RiffProfilePatch): RiffProfilePatch {
  const out: RiffProfilePatch = { ...acc, ...next };
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
    const prev = acc.soloGeneratorProfile;
    const nxt = next.soloGeneratorProfile;
    out.soloGeneratorProfile = {
      ...prev,
      ...nxt,
      enabled: nxt.enabled ?? prev?.enabled ?? true,
      scalePool: nxt.scalePool ? { ...prev?.scalePool, ...nxt.scalePool } : prev?.scalePool,
      noteDensityRange: nxt.noteDensityRange ?? prev?.noteDensityRange,
      phraseEndingPolicy: nxt.phraseEndingPolicy ?? prev?.phraseEndingPolicy,
    };
  }
  if (next.tuningPolicy) {
    out.tuningPolicy = {
      ...acc.tuningPolicy,
      ...next.tuningPolicy,
      tuningOptions: { ...acc.tuningPolicy?.tuningOptions, ...next.tuningPolicy.tuningOptions },
    };
  }
  if (next.rhythmFeel) {
    out.rhythmFeel = {
      ...acc.rhythmFeel,
      ...next.rhythmFeel,
      swingRatio: { ...acc.rhythmFeel?.swingRatio, ...next.rhythmFeel.swingRatio },
    };
  }
  if (next.scalePool) {
    out.scalePool = { ...acc.scalePool, ...next.scalePool };
  }
  if (next.intervalWeights) {
    out.intervalWeights = { ...acc.intervalWeights, ...next.intervalWeights };
  }
  if (next.phraseLengthBeats) {
    out.phraseLengthBeats = [...new Set([...(acc.phraseLengthBeats ?? []), ...next.phraseLengthBeats])];
  }
  if (next.cadenceTypes) {
    out.cadenceTypes = { ...acc.cadenceTypes, ...next.cadenceTypes };
  }
  if (next.silencePolicy) {
    out.silencePolicy = { ...acc.silencePolicy, ...next.silencePolicy };
  }
  if (next.contourPreferences) {
    out.contourPreferences = { ...acc.contourPreferences, ...next.contourPreferences };
  }
  if (next.ornamentPolicy) {
    out.ornamentPolicy = { ...acc.ornamentPolicy, ...next.ornamentPolicy };
  }
  if (next.styleModes) {
    out.styleModes = { ...acc.styleModes, ...next.styleModes };
  }
  if (next.chromaticApproachRules) {
    out.chromaticApproachRules = [...(acc.chromaticApproachRules ?? []), ...next.chromaticApproachRules];
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
/** Compile one research receipt line (used for FZ_RIFF_* stubs not yet merged into a VRB bundle). */
export function compileResearchReceiptLine(line: string): {
  id: string;
  patch: RiffProfilePatch;
  metadataOnly: boolean;
} {
  const id = receiptIdFromLine(line);
  const body = line.includes(' — ') ? line.slice(line.indexOf(' — ') + 3) : line;
  const { patch, metadataOnly } = patchForReceipt(id, body);
  return { id, patch, metadataOnly };
}

export function compileResearchReceiptLines(lines: readonly string[]): RiffProfilePatch {
  let patch: RiffProfilePatch = {};
  for (const line of lines) {
    const { patch: p } = compileResearchReceiptLine(line);
    patch = mergePatch(patch, p);
  }
  return patch;
}

export function compileReceiptsToRiffProfilePatch(vrbId: string): RiffProfilePatch {
  const bundle = getVoiceRuleBundle(vrbId);
  const receipts = bundle.orchestrationPolicy?.fingerprintReceipts ?? [];
  let patch: RiffProfilePatch = {};
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

export function mergeRiffProfilePatch(base: RiffProfile, patch: RiffProfilePatch): RiffProfile {
  const merged = mergePatch(base, patch);
  return { ...base, ...merged } as RiffProfile;
}

export function assertPatchKeysKnown(patch: RiffProfilePatch): string[] {
  return Object.keys(patch).filter((k) => !RIFF_PROFILE_PATCH_KEYS.has(k));
}
