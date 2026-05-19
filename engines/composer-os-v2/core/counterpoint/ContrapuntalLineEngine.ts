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
  if (vrbId === 'messiaen') {
    return {
      ...lines,
      extendedTechniquePolicy: {
        limitedTranspositionMode: true,
        colourTag: 'mode_3_resonance',
        suppressFunctionalResolution: true,
        minBarsPerChord: 2,
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
  for (let b = 0; b < lengthBars; b++) {
    const bar = b + 1;
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
    sourceMode: 'chords_only',
    lengthBars,
    styleSourceVrbId: vrbId,
  };
}

function buildBrookmeyerLineSet(context: CompositionContext, lengthBars: number, seed: number): AbstractLineSet {
  return buildSwingChordLineSetForVrb(context, lengthBars, seed, 'bob_brookmeyer');
}

function buildBartokLineSet(context: CompositionContext, lengthBars: number, seed: number): AbstractLineSet {
  const policy = getVoiceRuleBundle('bartok').contrapuntalLinePolicy!;
  const dissonanceProfile = policy.dissonanceProfile;
  const additive: Record<LineRole, number> = {
    soprano: 0,
    alto: 0.125,
    tenor: 0.25,
    bass: 0.375,
  };
  /** ic1 / tritone-class / resolving step — repeats every bar (additive displacement on entries). */
  const cell = [1, 6, 6, -7] as const;
  const voices: AbstractLineSet['voices'] = (['soprano', 'alto', 'tenor', 'bass'] as const).map((role) => ({
    role,
    tags:
      role === 'soprano'
        ? (['melodic_lead'] as LineRoleTag[])
        : role === 'tenor'
          ? (['canonic_follower', 'rhythmic_anchor'] as LineRoleTag[])
          : (['harmonic_fill'] as LineRoleTag[]),
    notes: [] as NoteEvent[],
  }));
  const byRole = Object.fromEntries(voices.map((v) => [v.role, v])) as Record<
    LineRole,
    (typeof voices)[0]
  >;
  const delayBars = 1;
  const intervalAnswer = -12;
  /** Stagger follower vs downbeat pile-up with leader (keeps Gate B strong-beat co-onset ≤2 consecutive). */
  const tenorPhase = 1 / 32;
  let p = 60 + (Math.abs(seed) % 12);
  let idx = 0;
  for (let b = 0; b < lengthBars; b++) {
    for (let k = 0; k < 4; k++) {
      if (idx > 0) p += cell[(idx - 1) % 4];
      const off = b + additive.soprano + k * 0.25;
      byRole.soprano.notes.push({
        pitchMidi: p,
        durationBars: 0.25,
        offsetBars: off,
      });
      const tenOff = b + delayBars + additive.tenor + k * 0.25 + tenorPhase;
      if (tenOff < lengthBars + 0.999) {
        byRole.tenor.notes.push({
          pitchMidi: p + intervalAnswer,
          durationBars: 0.25,
          offsetBars: tenOff,
        });
      }
      idx++;
    }
  }
  for (let b = 0; b < lengthBars; b++) {
    const sym = resolveBarSymbol(context, b + 1).symbol;
    const rpc = rootPcFromBarSymbol(sym);
    const ap = midiForVoice('alto', (rpc + 1) % 12, 4) + (b % 3) + Math.floor((seed + b) % 3);
    byRole.alto.notes.push({
      pitchMidi: ap,
      durationBars: 0.25,
      offsetBars: b + additive.alto + (b % 2) * 0.25,
    });
    const bp = midiForVoice('bass', (rpc + 11) % 12, 2) - (b % 2);
    byRole.bass.notes.push({
      pitchMidi: bp,
      durationBars: 0.375,
      offsetBars: b + additive.bass,
    });
  }
  const imitationMap: ImitationEvent[] = [
    {
      sourceVoice: 'soprano',
      imitatingVoice: 'tenor',
      delayBars,
      intervalSemitones: intervalAnswer,
      type: 'strict',
    },
  ];
  enforceRegisterInterlock(voices);
  const densityEnvelope: DensityEnvelope = {
    segments: [{ startBar: 1, endBar: lengthBars, density: lengthBars > 8 ? 'dense' : 'sparse' }],
  };
  return {
    voices,
    cadenceTags: [{ positionBars: lengthBars, type: 'modal', strength: 'medium' }],
    densityEnvelope,
    imitationMap,
    dissonanceProfile: { ...dissonanceProfile },
    sourceMode: 'chords_only',
    lengthBars,
    styleSourceVrbId: 'bartok',
  };
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
  generate(lengthBars: number, sourceMode: AbstractLineSet['sourceMode']): AbstractLineSet {
    return this.generateLines(lengthBars, sourceMode);
  }

  generateLines(lengthBars: number, sourceMode: AbstractLineSet['sourceMode']): AbstractLineSet {
    void sourceMode;
    const seed = this.context.seed ?? 0;
    const bpm = resolveGenerationBpm(this.context);
    if (this.vrbId === 'bartok') {
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
          if (lines.styleSourceVrbId !== 'bartok' || v.role !== 'soprano') return { ...n };
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
