/**
 * ContrapuntalLineEngine — line-first SATB composer + BB/SQ routers.
 * Bartók dedicated grammar; other `contrapuntalLinePolicy.enabled` VRBs use shared swing-chord grid (`buildSwingChordLineSetForVrb`).
 */

import type { CompositionContext } from '../compositionContext';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import type { ResolvedHarmonyBar } from '../harmony/harmonySpineProvider';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import { shouldUsePitchFieldSubstrate } from '../harmony/pitchFieldResolver';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { USE_PITCH_FIELD_NOTE_SELECTION } from './engineFeatureFlags';
import { applyAntimetricTransform, buildAntimetricPolicy } from '../rhythm/sqAntimetricRhythmEngine';
import { applySwingTransform, buildSwingPolicy } from '../rhythm/sqSwingRhythmEngine';
import {
  readSqToBbVrbWire,
  resolveVrbForBar,
  type SqToBbFormSectionRef,
} from './vrbProfiles/vrbContextResolver';
import type { VrbContextMap } from './vrbProfiles/vrbContextMap';
import type { BackgroundsPlan, SoliPlan } from '../composer/bigBandSectionWriter';
import { backgroundsPlanFromScene } from '../composer/bigBandSectionWriter';
import type { VoicingGeometry } from './chooseVoicingGeometry';
import type { BackgroundsRhythmPlan, SoliRhythmPlan } from './planSoliAndBackgroundsRhythm';
import type { QuartetFeatures, SectionWritingIntent } from './quartetFeatureTypes';
import { sectionPlansForBigBandFromAbstract } from './sectionPlansForBigBandFromAbstract';
import type {
  AbstractLineSet,
  CadenceTag,
  DensityEnvelope,
  ImitationEvent,
  LineRole,
  LineRoleTag,
  NoteEvent,
} from './abstractLineSet';
import type {
  MosaicSqContrapuntalGuide,
  MosaicSqContrapuntalGuideMap,
} from '../string-quartet/mosaicSqContrapuntalGuide';
import { buildBartokScoredLineSet } from './bartokPitchScorer';

export type ContrapuntalGenerateLinesOptions = {
  mosaicSqGuides?: MosaicSqContrapuntalGuideMap;
};

const MOSAIC_SQ_SOFT_BIAS = 0.42;

function resolveMosaicGuideForBar(
  bar1: number,
  guides: MosaicSqContrapuntalGuideMap | undefined,
): MosaicSqContrapuntalGuide | undefined {
  if (!guides) return undefined;
  for (const guide of Object.values(guides)) {
    if (bar1 >= guide.startBar && bar1 <= guide.endBar && !guide.protectedBars.includes(bar1)) {
      return guide;
    }
  }
  return undefined;
}

function mosaicAnchorForOnset(
  guide: MosaicSqContrapuntalGuide,
  bar1: number,
  beatInBar: number,
): MosaicSqContrapuntalGuide['motifAnchors'][number] | undefined {
  let best: MosaicSqContrapuntalGuide['motifAnchors'][number] | undefined;
  let bestDist = 0.35;
  for (const anchor of guide.motifAnchors) {
    if (anchor.bar !== bar1) continue;
    const dist = Math.abs(anchor.beat - beatInBar);
    if (dist <= bestDist) {
      bestDist = dist;
      best = anchor;
    }
  }
  return best;
}

function applyMosaicSqPitchBias(
  pitch: number,
  guide: MosaicSqContrapuntalGuide | undefined,
  bar1: number,
  beatInBar: number,
): number {
  if (!guide) return pitch;
  const anchor = mosaicAnchorForOnset(guide, bar1, beatInBar);
  if (!anchor || anchor.pitchMidi == null) return pitch;
  if (anchor.weight === 'hard') return anchor.pitchMidi;
  const delta = anchor.pitchMidi - pitch;
  return pitch + Math.round(delta * MOSAIC_SQ_SOFT_BIAS);
}

function augmentAbstractLineSetSchema(vrbId: string, lines: AbstractLineSet): AbstractLineSet {
  if (vrbId === 'fripp_king_crimson') {
    return {
      ...lines,
      asymmetricMeterMap: [
        { barIndex: 0, numerator: 7, denominator: 8, lcmGridUnit: '16th' },
        { barIndex: 1, numerator: 15, denominator: 16, lcmGridUnit: '16th' },
        { barIndex: 2, numerator: 5, denominator: 4, lcmGridUnit: '16th' },
      ],
    };
  }
  if (vrbId === 'messiaen' || vrbId === 'sq_vrb_messiaen') {
    return {
      ...lines,
      extendedTechniquePolicy: {
        limitedTranspositionMode: true,
        colourTag: 'mode_3_resonance',
        suppressFunctionalResolution: true,
        minBarsPerChord: vrbId === 'sq_vrb_messiaen' ? 1 : 2,
      },
    };
  }
  if (vrbId === 'james_brown') {
    return {
      ...lines,
      textureTag: {
        type: 'funk_grid',
        gridUnit: '16th',
        strongBeatPattern: [1, 0, 0, 0],
      },
    };
  }
  return lines;
}

function resolveGenerationBpm(context: CompositionContext): number {
  const fromOverride = context.styleOverrides?.bpm;
  if (typeof fromOverride === 'number' && Number.isFinite(fromOverride) && fromOverride > 0) {
    return fromOverride;
  }
  const fromMeta = (context.generationMetadata as { bpm?: number } | undefined)?.bpm;
  if (typeof fromMeta === 'number' && Number.isFinite(fromMeta) && fromMeta > 0) {
    return fromMeta;
  }
  return 120;
}

function applySqSwingRhythmToLineSet(
  lines: AbstractLineSet,
  vrbId: string,
  bpm: number,
  lengthBars: number,
): AbstractLineSet {
  const bundle = getVoiceRuleBundle(vrbId);
  if (bundle.sqRhythmEngineId !== 'sq_swing') {
    return lines;
  }
  const policy = buildSwingPolicy(bundle, bpm);
  return {
    ...lines,
    voices: lines.voices.map((v) => ({
      ...v,
      notes: applySwingTransform(v.notes, policy, lengthBars),
    })),
  };
}

function applySqAntimetricRhythmToLineSet(
  lines: AbstractLineSet,
  vrbId: string,
  bpm: number,
): AbstractLineSet {
  const bundle = getVoiceRuleBundle(vrbId);
  if (bundle.sqRhythmEngineId !== 'sq_antimetric') {
    return lines;
  }
  const policy = buildAntimetricPolicy(bundle, bpm);
  const voiceOrder: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
  return {
    ...lines,
    voices: lines.voices.map((v) => {
      const voiceIndex = Math.max(0, voiceOrder.indexOf(v.role));
      return {
        ...v,
        notes: applyAntimetricTransform(v.notes, policy, voiceIndex),
      };
    }),
  };
}

function rng01(seed: number, salt: number): number {
  let x = Math.imul(seed + salt * 7919, 1103515245);
  x = (x ^ (x >>> 13)) >>> 0;
  return (x % 100000) / 100000;
}

function rootPcFromBarSymbol(symbol: string): number {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/i);
  const name = m?.[1] ?? 'C';
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  return noteNameToPitchClass(key) ?? 0;
}

function midiForVoice(role: LineRole, pc: number, octave: number): number {
  const o = octave * 12;
  return Math.max(24, Math.min(108, o + ((pc % 12) + 12) % 12));
}

function pitchFieldVoiceId(role: LineRole): string {
  if (role === 'soprano') return 'melody';
  if (role === 'bass') return 'bass';
  return 'inner';
}

const ROLE_OCTAVE: Record<LineRole, number> = {
  soprano: 5,
  alto: 4,
  tenor: 4,
  bass: 3,
};

function pickWeightedPc(
  pool: ReadonlyArray<{ pc: PitchClass; weight: number }>,
  seed: number,
  salt: number,
): PitchClass {
  if (pool.length === 0) return 0;
  const total = pool.reduce((s, e) => s + Math.max(0, e.weight), 0);
  if (total <= 0) return pool[0]!.pc;
  let r = rng01(seed, salt) * total;
  for (const e of pool) {
    r -= Math.max(0, e.weight);
    if (r <= 0) return e.pc;
  }
  return pool[pool.length - 1]!.pc;
}

function targetsFromChordSpine(sym: string): Record<LineRole, number> {
  const rpc = rootPcFromBarSymbol(sym);
  const third = (rpc + 4) % 12;
  const seventh = (rpc + 10) % 12;
  const fifth = (rpc + 7) % 12;
  return {
    soprano: midiForVoice('soprano', third, 5),
    alto: midiForVoice('alto', seventh, 4),
    tenor: midiForVoice('tenor', fifth, 4),
    bass: midiForVoice('bass', rpc, 3),
  };
}

function targetsFromPitchField(
  resolved: ResolvedHarmonyBar,
  role: LineRole,
  seed: number,
  bar: number,
): number {
  const pool = resolved.pitchField?.allowedPcs ?? [];
  const pc = pickWeightedPc(pool, seed, bar * 17 + role.charCodeAt(0));
  let midi = midiForVoice(role, pc, ROLE_OCTAVE[role]);
  const center = resolved.pitchField?.registerCenterMidi;
  const spread = resolved.pitchField?.registerSpread;
  if (center != null && spread != null) {
    const jitter = Math.floor(rng01(seed, bar * 31 + role.length) * spread) - Math.floor(spread / 2);
    midi = Math.max(24, Math.min(108, center + jitter));
    midi = midi - (midi % 12) + pc;
  }
  return midi;
}

function resolveTargetsForBar(
  context: CompositionContext,
  bar: number,
  bundle: VoiceRuleBundle,
  seed: number,
): Record<LineRole, number> {
  const sectionLabelMode =
    context.sectionLabelMode ?? context.generationMetadata?.sectionLabelMode;
  const useField =
    USE_PITCH_FIELD_NOTE_SELECTION &&
    shouldUsePitchFieldSubstrate(bundle, sectionLabelMode);
  const roles: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
  if (!useField) {
    const sym = resolveBarSymbol(context, bar).symbol;
    return targetsFromChordSpine(sym);
  }
  const out = {} as Record<LineRole, number>;
  for (const role of roles) {
    const resolved = resolveBarSymbol(context, bar, pitchFieldVoiceId(role));
    if (resolved.pitchField?.allowedPcs?.length) {
      out[role] = targetsFromPitchField(resolved, role, seed, bar);
    } else {
      out[role] = targetsFromChordSpine(resolved.symbol)[role];
    }
  }
  return out;
}

function intervalClass(a: number, b: number): number {
  return Math.abs(a - b) % 12;
}

function hasParallelOctaveOrFifth(
  prev: Record<LineRole, number | undefined>,
  curr: Record<LineRole, number | undefined>,
  forbidOct: boolean,
  forbidFif: boolean,
): boolean {
  const pairs: [LineRole, LineRole][] = [
    ['soprano', 'bass'],
    ['soprano', 'alto'],
    ['alto', 'tenor'],
  ];
  for (const [hi, lo] of pairs) {
    const p1 = prev[hi];
    const p2 = prev[lo];
    const c1 = curr[hi];
    const c2 = curr[lo];
    if (p1 === undefined || p2 === undefined || c1 === undefined || c2 === undefined) continue;
    const icp = intervalClass(p1, p2);
    const icc = intervalClass(c1, c2);
    const d1 = c1 - p1;
    const d2 = c2 - p2;
    const sameDir = Math.sign(d1) === Math.sign(d2) && d1 !== 0 && d2 !== 0;
    if (!sameDir) continue;
    if (forbidOct && icp === 0 && icc === 0 && Math.abs(c1 - p1) >= 12) return true;
    if (forbidFif && icp === 7 && icc === 7) return true;
  }
  return false;
}

function enforceRegisterInterlock(voices: AbstractLineSet['voices']): void {
  const grid = new Map<number, Partial<Record<LineRole, NoteEvent>>>();
  for (const v of voices) {
    for (const n of v.notes) {
      const k = Math.round(n.offsetBars * 64) / 64;
      let slot = grid.get(k);
      if (!slot) {
        slot = {};
        grid.set(k, slot);
      }
      slot[v.role] = n;
    }
  }
  for (const [, slot] of grid) {
    const s = slot.soprano;
    const a = slot.alto;
    const t = slot.tenor;
    const b = slot.bass;
    if (!s || !a || !t || !b) continue;
    const arr = [s.pitchMidi, a.pitchMidi, t.pitchMidi, b.pitchMidi].sort((x, y) => y - x);
    s.pitchMidi = arr[0]!;
    a.pitchMidi = Math.min(arr[1]!, s.pitchMidi - 2);
    t.pitchMidi = Math.min(arr[2]!, a.pitchMidi - 2);
    b.pitchMidi = Math.min(arr[3]!, t.pitchMidi - 2);
  }
}

/** Chord-spine + swing-offset SATB grid — Brookmeyer baseline; reused for other jazz VRBs with `contrapuntalLinePolicy.enabled`. */
function buildSwingChordLineSetForVrb(
  context: CompositionContext,
  lengthBars: number,
  seed: number,
  vrbId: string,
  vrbContextMap?: VrbContextMap | null,
  formSections?: readonly SqToBbFormSectionRef[] | null,
  mosaicSqGuides?: MosaicSqContrapuntalGuideMap,
): AbstractLineSet {
  const wire = readSqToBbVrbWire(context);
  const contextMap = vrbContextMap ?? wire.contextMap;
  const sections = formSections ?? wire.sections;
  const globalFallback = vrbId;
  const lineBundle = getVoiceRuleBundle(vrbId);
  const policy = lineBundle.contrapuntalLinePolicy!;
  const dissonanceProfile = policy.dissonanceProfile;
  const swingOffsets: Record<LineRole, number[]> = {
    soprano: [0, 0.5],
    alto: [0.25, 0.75],
    tenor: [0.33, 0.66],
    bass: [0.125, 0.625],
  };
  const tags: Record<LineRole, LineRoleTag[]> = {
    soprano: ['melodic_lead'],
    alto: ['counter_melody'],
    tenor: ['harmonic_fill'],
    bass: ['bass_anchor', 'rhythmic_anchor'],
  };
  const voices: AbstractLineSet['voices'] = (['soprano', 'alto', 'tenor', 'bass'] as const).map((role) => ({
    role,
    tags: tags[role],
    notes: [] as NoteEvent[],
  }));
  const byRole = Object.fromEntries(voices.map((v) => [v.role, v])) as Record<
    LineRole,
    (typeof voices)[0]
  >;
  let prevPitches: Record<LineRole, number | undefined> = {
    soprano: undefined,
    alto: undefined,
    tenor: undefined,
    bass: undefined,
  };
  const hasMosaicGuides = Boolean(mosaicSqGuides && Object.keys(mosaicSqGuides).length > 0);
  for (let b = 0; b < lengthBars; b++) {
    const bar = b + 1;
    const mosaicGuide = resolveMosaicGuideForBar(bar, mosaicSqGuides);
    const barVrbId = resolveVrbForBar(bar, contextMap, globalFallback, sections).vrbId || vrbId;
    const barDissonance =
      getVoiceRuleBundle(barVrbId).contrapuntalLinePolicy?.dissonanceProfile ?? dissonanceProfile;
    const barBundle = getVoiceRuleBundle(barVrbId);
    const targets = resolveTargetsForBar(context, bar, barBundle ?? lineBundle, seed);
    (['soprano', 'alto', 'tenor', 'bass'] as const).forEach((role) => {
      const chrom = Math.floor(rng01(seed, b * 17 + role.charCodeAt(0)) * 5) - 2;
      targets[role] += chrom;
    });
    const curr: Record<LineRole, number | undefined> = { ...prevPitches };
    for (const role of ['soprano', 'alto', 'tenor', 'bass'] as const) {
      for (const off of swingOffsets[role]) {
        const base = targets[role];
        let pitch = base + Math.floor(rng01(seed, b * 100 + off * 1000 + role.length) * 3) - 1;
        curr[role] = pitch;
        if (
          hasParallelOctaveOrFifth(
            prevPitches,
            curr,
            !barDissonance.parallelOctavesAllowed,
            !barDissonance.parallelFifthsAllowed,
          )
        ) {
          pitch += role === 'bass' ? -1 : 1;
          curr[role] = pitch;
        }
        if (role === 'soprano' && mosaicGuide) {
          const beatInBar = off * 4;
          pitch = applyMosaicSqPitchBias(pitch, mosaicGuide, bar, beatInBar);
          curr[role] = pitch;
        }
        byRole[role].notes.push({
          pitchMidi: pitch,
          durationBars: 0.25,
          offsetBars: b + off,
        });
      }
    }
    prevPitches = {
      soprano: targets.soprano,
      alto: targets.alto,
      tenor: targets.tenor,
      bass: targets.bass,
    };
  }
  enforceRegisterInterlock(voices);
  const densityEnvelope: DensityEnvelope = {
    segments: [{ startBar: 1, endBar: lengthBars, density: 'medium' }],
  };
  const cadenceTags: CadenceTag[] =
    lengthBars >= 4
      ? [{ positionBars: lengthBars, type: 'authentic', strength: 'weak' }]
      : [];
  return {
    voices,
    cadenceTags,
    densityEnvelope,
    dissonanceProfile: { ...dissonanceProfile },
    sourceMode: hasMosaicGuides ? 'melody_plus_chords' : 'chords_only',
    lengthBars,
    styleSourceVrbId: vrbId,
  };
}

function buildBrookmeyerLineSet(context: CompositionContext, lengthBars: number, seed: number): AbstractLineSet {
  return buildSwingChordLineSetForVrb(context, lengthBars, seed, 'bob_brookmeyer');
}

function buildBartokLineSet(context: CompositionContext, lengthBars: number, seed: number): AbstractLineSet {
  return buildBartokScoredLineSet(context, lengthBars, seed).lineSet;
}

/** Placeholder: SQ staff / technique assignment from AbstractLineSet. */
export type StringQuartetVoicing = {
  readonly format: 'string_quartet';
  readonly parts: readonly string[];
  readonly assignments: ReadonlyArray<{
    readonly role: LineRole;
    readonly staffName: string;
    readonly notes: readonly NoteEvent[];
  }>;
};

/** Routes through {@link sectionPlansForBigBandFromAbstract} → legacy {@link soliPlanForBundle} / {@link backgroundsPlanFromScene} + Phase 6 metadata. */
export type BigBandVoicing = {
  readonly format: 'big_band';
  readonly sectionLeaders: readonly string[];
  readonly soliPlan?: SoliPlan;
  readonly backgroundsPlan?: BackgroundsPlan;
  readonly quartetFeatures?: readonly QuartetFeatures[];
  readonly sectionWritingIntents?: readonly SectionWritingIntent[];
  readonly voicingGeometries?: readonly VoicingGeometry[];
  readonly soliRhythmPlans?: readonly SoliRhythmPlan[];
  readonly backgroundsRhythmPlans?: readonly BackgroundsRhythmPlan[];
};

export class ContrapuntalLineEngine {
  constructor(
    readonly vrbId: string,
    readonly context: CompositionContext,
    readonly vrbContextMap: VrbContextMap | null = null,
    readonly formSections: readonly SqToBbFormSectionRef[] | null = null,
  ) {}

  /** Alias for `generateLines` (Pass 3 naming). */
  generate(
    lengthBars: number,
    sourceMode: AbstractLineSet['sourceMode'],
    options?: ContrapuntalGenerateLinesOptions,
  ): AbstractLineSet {
    return this.generateLines(lengthBars, sourceMode, options);
  }

  generateLines(
    lengthBars: number,
    sourceMode: AbstractLineSet['sourceMode'],
    options?: ContrapuntalGenerateLinesOptions,
  ): AbstractLineSet {
    const mosaicSqGuides = options?.mosaicSqGuides;
    const effectiveSourceMode =
      mosaicSqGuides && Object.keys(mosaicSqGuides).length > 0 ? 'melody_plus_chords' : sourceMode;
    void effectiveSourceMode;
    const seed = this.context.seed ?? 0;
    const bpm = resolveGenerationBpm(this.context);
    if (this.vrbId === 'sq_vrb_bartok' && !mosaicSqGuides) {
      return augmentAbstractLineSetSchema(this.vrbId, buildBartokLineSet(this.context, lengthBars, seed));
    }
    const pol = getVoiceRuleBundle(this.vrbId).contrapuntalLinePolicy;
    if (pol?.enabled) {
      const raw = buildSwingChordLineSetForVrb(
        this.context,
        lengthBars,
        seed,
        this.vrbId,
        this.vrbContextMap,
        this.formSections,
        mosaicSqGuides,
      );
      const swung = applySqSwingRhythmToLineSet(raw, this.vrbId, bpm, lengthBars);
      const antimetric = applySqAntimetricRhythmToLineSet(swung, this.vrbId, bpm);
      return augmentAbstractLineSetSchema(this.vrbId, antimetric);
    }
    throw new Error(`ContrapuntalLineEngine: unsupported vrbId ${this.vrbId}`);
  }

  applyVrbFilter(lines: AbstractLineSet): AbstractLineSet {
    const out: AbstractLineSet = {
      ...lines,
      voices: lines.voices.map((v) => ({
        ...v,
        notes: v.notes.map((n) => {
          if (lines.styleSourceVrbId !== 'sq_vrb_bartok' || v.role !== 'soprano') return { ...n };
          const lo = 60;
          const hi = 105;
          const pm = Math.min(hi, Math.max(lo, n.pitchMidi));
          return {
            ...n,
            pitchMidi: pm,
            articulationTag: Math.abs((n.offsetBars * 4) % 1) < 0.01 ? 'snap_pizz_candidate' : n.articulationTag,
          };
        }),
      })),
    };
    return out;
  }

  renderForStringQuartet(lines: AbstractLineSet): StringQuartetVoicing {
    const staffNames = ['Violin I', 'Violin II', 'Viola', 'Violoncello'] as const;
    const order: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
    const assignments = order.map((role, i) => {
      const v = lines.voices.find((x) => x.role === role)!;
      return {
        role,
        staffName: staffNames[i]!,
        notes: v.notes.map((n) => ({ ...n })),
      };
    });
    return { format: 'string_quartet', parts: [...staffNames], assignments };
  }

  renderForBigBand(lines: AbstractLineSet): BigBandVoicing {
    const wire = readSqToBbVrbWire(this.context);
    const renderBar = wire.sections[0]?.startBar ?? 1;
    const renderVrbId =
      resolveVrbForBar(renderBar, this.vrbContextMap ?? wire.contextMap, this.vrbId, wire.sections)
        .vrbId || lines.styleSourceVrbId;
    const bundle = getVoiceRuleBundle(renderVrbId) ?? this.context.voiceBundle;
    const scene = this.context.harmonicScenes?.[0];
    const diag = this.context.generationMetadata?.songModeProfileRuleDiagnostics;
    const styleProfileId =
      diag?.styleProfile !== undefined && diag.styleProfile != null ? String(diag.styleProfile) : undefined;
    const plans = bundle
      ? sectionPlansForBigBandFromAbstract(bundle, scene, lines, styleProfileId, this.context)
      : null;
    const sectionLeaders = [
      'lead_trumpet_or_lead_alto',
      'lead_trombone',
      'third_trumpet_or_second_trombone',
      'bass_trombone_plus_string_bass',
    ] as const;
    return {
      format: 'big_band',
      sectionLeaders: [...sectionLeaders],
      soliPlan: plans?.soliPlan,
      backgroundsPlan: plans?.backgroundsPlan,
      quartetFeatures: plans?.quartetFeatures,
      sectionWritingIntents: plans?.sectionWritingIntents,
      voicingGeometries: plans?.voicingGeometries,
      soliRhythmPlans: plans?.soliRhythmPlans,
      backgroundsRhythmPlans: plans?.backgroundsRhythmPlans,
    };
  }
}
