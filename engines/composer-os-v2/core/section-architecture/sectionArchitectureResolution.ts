/**
 * P6 — Song schema merge + validation implementations.
 */

import { toCompositionSection, validateSectionPartition } from './sectionArchitectureDomain';
import type {
  DensityLevel,
  EffectiveGenerationContext,
  HumanizeSettings,
  InstrumentKind,
  InstrumentOverride,
  LocalOverride,
  PitchProfile,
  RhythmProfile,
  SectionPreset,
  Song,
  TuningProfile,
  ValidationIssue,
  ValidationResult,
  VoicingProfile,
} from './sectionArchitectureTypes';

function clonePitch(p?: PitchProfile): PitchProfile {
  return p ? { ...p } : {};
}

function cloneRhythm(p?: RhythmProfile): RhythmProfile {
  return p ? { ...p } : {};
}

function cloneVoicing(p?: VoicingProfile): VoicingProfile {
  return p ? { ...p } : {};
}

function cloneHumanize(h?: HumanizeSettings): HumanizeSettings {
  return h ? { ...h } : {};
}

function mergePitch(base: PitchProfile, overlay?: PitchProfile): PitchProfile {
  return overlay ? { ...base, ...overlay } : { ...base };
}

function mergeRhythm(base: RhythmProfile, overlay?: RhythmProfile): RhythmProfile {
  return overlay ? { ...base, ...overlay } : { ...base };
}

function mergeVoicing(base: VoicingProfile, overlay?: VoicingProfile): VoicingProfile {
  return overlay ? { ...base, ...overlay } : { ...base };
}

function barInRange(bar: number, range: { startBar: number; endBar: number }): boolean {
  return bar >= range.startBar && bar <= range.endBar;
}

function setByDotPath(obj: Record<string, unknown>, path: string, value: unknown): boolean {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return false;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cur[key];
    if (next == null || typeof next !== 'object') {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
  return true;
}

function resolveNamedProfile<T>(
  profiles: readonly { id: string; value: T }[] | undefined,
  id: string | undefined
): T | undefined {
  if (!id || !profiles?.length) return undefined;
  return profiles.find((p) => p.id === id)?.value;
}

/** Return the section preset owning `bar`, or null if out of range / gap. */
export function resolveSectionForBar(
  bar: number,
  sections: readonly SectionPreset[]
): SectionPreset | null {
  const b = Math.floor(bar);
  if (b < 1) return null;
  for (const s of sections) {
    if (barInRange(b, s.barRange)) return s;
  }
  return null;
}

function collectInheritanceChain(
  section: SectionPreset,
  byId: ReadonlyMap<string, SectionPreset>
): SectionPreset[] {
  const chain: SectionPreset[] = [];
  const seen = new Set<string>();
  let cur: SectionPreset | undefined = section;
  while (cur?.inheritsFrom) {
    if (seen.has(cur.inheritsFrom)) break;
    seen.add(cur.inheritsFrom);
    const parent = byId.get(cur.inheritsFrom);
    if (!parent) break;
    chain.unshift(parent);
    cur = parent;
  }
  return chain;
}

function mergeInstrumentOverridesIntoTuning(
  tuningByInstrument: Partial<Record<InstrumentKind, TuningProfile>>,
  overrides: readonly InstrumentOverride[] | undefined
): Partial<Record<InstrumentKind, TuningProfile>> {
  if (!overrides?.length) return tuningByInstrument;
  const out = { ...tuningByInstrument };
  for (const ov of overrides) {
    const kind = ov.tuningProfile?.instrumentType;
    if (kind && ov.tuningProfile) {
      out[kind] = { ...ov.tuningProfile };
    }
  }
  return out;
}

/** Apply instrument-scoped override onto a resolved bar context. */
export function mergeInstrumentOverride(
  base: EffectiveGenerationContext,
  override: InstrumentOverride,
  instrumentKind?: InstrumentKind
): EffectiveGenerationContext {
  const next = { ...base };
  if (override.tuningProfile) {
    const kind = instrumentKind ?? override.tuningProfile.instrumentType;
    if (instrumentKind && override.tuningProfile.instrumentType !== instrumentKind) {
      return next;
    }
    next.tuningByInstrument = {
      ...next.tuningByInstrument,
      [kind]: { ...override.tuningProfile },
    };
  }
  if (typeof override.density !== 'undefined') {
    next.density = override.density;
  }
  return next;
}

/**
 * Resolve all generation fields for one bar after full precedence merge.
 * @see docs/COMPOSER_OS_SECTION_ARCHITECTURE.md
 */
export function resolveEffectiveContext(bar: number, song: Song): EffectiveGenerationContext {
  const trace: string[] = ['SongDefaults'];
  const b = Math.floor(bar);
  const defaults = song.globalDefaults;

  let pitch = clonePitch(defaults.defaultPitchProfile);
  let rhythm = cloneRhythm(defaults.defaultRhythmProfile);
  let voicing = cloneVoicing(defaults.defaultVoicingProfile);
  let density: DensityLevel = defaults.defaultDensity ?? 'moderate';
  let humanize = cloneHumanize(defaults.humanize);
  let tuningByInstrument: Partial<Record<InstrumentKind, TuningProfile>> = {
    ...(defaults.defaultTuningByInstrument ?? {}),
  };
  let tempo = defaults.tempo ?? 120;
  let meter = defaults.meter ?? '4/4';
  let energy: number | undefined;
  let transition: EffectiveGenerationContext['transition'];
  let meterMap: EffectiveGenerationContext['meterMap'];

  const section = resolveSectionForBar(b, song.sections);
  if (!section) {
    return {
      bar: b,
      sectionId: 'gap',
      sectionLabel: 'gap',
      sectionType: 'custom',
      tempo,
      meter,
      pitch,
      rhythm,
      voicing,
      density,
      humanize,
      tuningByInstrument,
      resolutionTrace: trace,
    };
  }

  const byId = new Map(song.sections.map((s) => [s.id, s]));
  const chain = collectInheritanceChain(section, byId);
  for (const ancestor of chain) {
    trace.push(`inheritsFrom:${ancestor.id}`);
    pitch = mergePitch(pitch, ancestor.pitchProfile);
    rhythm = mergeRhythm(rhythm, ancestor.rhythmProfile);
    voicing = mergeVoicing(voicing, ancestor.voicingProfile);
    if (typeof ancestor.energy === 'number') energy = ancestor.energy;
    if (ancestor.meterMap?.length) meterMap = ancestor.meterMap;
  }

  trace.push(`section:${section.id}`);
  pitch = mergePitch(pitch, section.pitchProfile);
  rhythm = mergeRhythm(rhythm, section.rhythmProfile);
  voicing = mergeVoicing(voicing, section.voicingProfile);
  if (typeof section.energy === 'number') energy = section.energy;
  if (section.meterMap?.length) meterMap = section.meterMap;
  if (section.transitionIn && b <= section.barRange.startBar + (section.transitionIn.bars ?? 0)) {
    transition = section.transitionIn;
  }
  if (section.transitionOut && b >= section.barRange.endBar - (section.transitionOut.bars ?? 0)) {
    transition = section.transitionOut;
  }

  tuningByInstrument = mergeInstrumentOverridesIntoTuning(
    tuningByInstrument,
    section.instrumentOverrides
  );
  if (section.instrumentOverrides?.length) {
    trace.push('InstrumentOverride');
  }

  const ctx: EffectiveGenerationContext = {
    bar: b,
    sectionId: section.id,
    sectionLabel: section.label,
    sectionType: section.type,
    tempo,
    meter,
    pitch,
    rhythm,
    voicing,
    density,
    humanize,
    tuningByInstrument,
    meterMap,
    energy,
    transition,
    resolutionTrace: trace,
  };

  for (const lo of song.localOverrides) {
    if (!barInRange(b, lo.barRange)) continue;
    trace.push(`LocalOverride:${lo.parameterPath}`);
    const patchTarget: Record<string, unknown> = {
      pitch: ctx.pitch,
      rhythm: ctx.rhythm,
      voicing: ctx.voicing,
      density: ctx.density,
      tempo: ctx.tempo,
      meter: ctx.meter,
      energy: ctx.energy,
    };
    const ok = setByDotPath(patchTarget, lo.parameterPath, lo.value);
    if (!ok) continue;
    if (lo.parameterPath.startsWith('pitch.')) {
      ctx.pitch = patchTarget.pitch as PitchProfile;
    } else if (lo.parameterPath.startsWith('rhythm.')) {
      ctx.rhythm = patchTarget.rhythm as RhythmProfile;
    } else if (lo.parameterPath.startsWith('voicing.')) {
      ctx.voicing = patchTarget.voicing as VoicingProfile;
    } else if (lo.parameterPath === 'density') {
      ctx.density = patchTarget.density as DensityLevel;
    } else if (lo.parameterPath === 'tempo') {
      ctx.tempo = patchTarget.tempo as number;
    } else if (lo.parameterPath === 'meter') {
      ctx.meter = patchTarget.meter as string;
    } else if (lo.parameterPath === 'energy') {
      ctx.energy = patchTarget.energy as number;
    }
  }

  ctx.resolutionTrace = trace;
  return ctx;
}

function detectInheritanceCycle(song: Song): string[] | null {
  const byId = new Map(song.sections.map((s) => [s.id, s]));
  for (const s of song.sections) {
    const seen = new Set<string>([s.id]);
    let cur: SectionPreset | undefined = s;
    while (cur?.inheritsFrom) {
      if (seen.has(cur.inheritsFrom)) return [s.id, cur.inheritsFrom];
      seen.add(cur.inheritsFrom);
      const parent = byId.get(cur.inheritsFrom);
      if (!parent) return null;
      cur = parent;
    }
  }
  return null;
}

/** Structural + semantic validation for a {@link Song} document. */
export function validateSong(song: Song): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(song.schemaVersion) || song.schemaVersion < 1) {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_VERSION_UNSUPPORTED',
      message: `Unsupported schemaVersion ${song.schemaVersion}`,
      path: 'schemaVersion',
    });
  }

  if (!Number.isFinite(song.totalBars) || song.totalBars < 1) {
    issues.push({
      severity: 'error',
      code: 'SECTION_OUT_OF_RANGE',
      message: 'totalBars must be >= 1',
      path: 'totalBars',
    });
  }

  const byId = new Map(song.sections.map((s) => [s.id, s]));
  for (const s of song.sections) {
    if (s.inheritsFrom && !byId.has(s.inheritsFrom)) {
      issues.push({
        severity: 'error',
        code: 'INHERITANCE_UNKNOWN_PARENT',
        message: `Section ${s.id} inheritsFrom unknown id ${s.inheritsFrom}`,
        path: `sections.${s.id}.inheritsFrom`,
      });
    }
    if (s.barRange.startBar < 1 || s.barRange.endBar < s.barRange.startBar) {
      issues.push({
        severity: 'error',
        code: 'SECTION_OUT_OF_RANGE',
        message: `Invalid barRange on section ${s.id}`,
        path: `sections.${s.id}.barRange`,
      });
    }
    if (s.barRange.endBar > song.totalBars) {
      issues.push({
        severity: 'error',
        code: 'SECTION_OUT_OF_RANGE',
        message: `Section ${s.id} endBar exceeds totalBars`,
        path: `sections.${s.id}.barRange.endBar`,
      });
    }
    for (const ov of s.instrumentOverrides ?? []) {
      if (ov.tuningProfile && !ov.tuningProfile.instrumentType) {
        issues.push({
          severity: 'error',
          code: 'TUNING_INSTRUMENT_MISMATCH',
          message: `instrumentOverrides on ${s.id} missing tuningProfile.instrumentType`,
          path: `sections.${s.id}.instrumentOverrides`,
        });
      }
    }
  }

  const cycle = detectInheritanceCycle(song);
  if (cycle) {
    issues.push({
      severity: 'error',
      code: 'INHERITANCE_CYCLE',
      message: `Circular inheritsFrom involving ${cycle.join(' → ')}`,
      path: 'sections',
    });
  }

  const compSections = song.sections.map((s) =>
    toCompositionSection(s.label, s.barRange.startBar, s.barRange.endBar - s.barRange.startBar + 1, s.id)
  );
  const partition = validateSectionPartition(compSections, song.totalBars);
  if (!partition.ok) {
    for (const pi of partition.issues) {
      if (pi.kind === 'overlap') {
        issues.push({
          severity: 'error',
          code: 'SECTION_OVERLAP',
          message: `Overlapping sections at bar ${pi.bar}: ${pi.labels.join(', ')}`,
          path: 'sections',
        });
      } else if (pi.kind === 'gap') {
        issues.push({
          severity: 'error',
          code: 'SECTION_GAP',
          message: `Gap between bar ${pi.afterBar} and ${pi.beforeBar}`,
          path: 'sections',
        });
      } else if (pi.kind === 'end_mismatch') {
        issues.push({
          severity: 'error',
          code: 'SECTION_GAP',
          message: `Partition ends at ${pi.endBar}, expected ${pi.totalBars}`,
          path: 'sections',
        });
      }
    }
  }

  if (song.globalDefaults.defaultTuningByInstrument) {
    for (const [key, profile] of Object.entries(song.globalDefaults.defaultTuningByInstrument)) {
      if (profile && profile.instrumentType !== key) {
        issues.push({
          severity: 'error',
          code: 'TUNING_INSTRUMENT_MISMATCH',
          message: `defaultTuningByInstrument key ${key} does not match instrumentType ${profile.instrumentType}`,
          path: `globalDefaults.defaultTuningByInstrument.${key}`,
        });
      }
    }
  }

  for (const lo of song.localOverrides) {
    const known =
      lo.parameterPath.startsWith('pitch.') ||
      lo.parameterPath.startsWith('rhythm.') ||
      lo.parameterPath.startsWith('voicing.') ||
      ['density', 'tempo', 'meter', 'energy'].includes(lo.parameterPath);
    if (!known) {
      issues.push({
        severity: 'warning',
        code: 'LOCAL_OVERRIDE_UNKNOWN_PATH',
        message: `Unknown local override path ${lo.parameterPath}`,
        path: 'localOverrides',
      });
    }
  }

  void resolveNamedProfile;

  return { ok: !issues.some((i) => i.severity === 'error'), issues };
}