/**
 * Strict JSON parse for Performance Plan schema 1.0.
 * Unknown fields and unknown enums fail. This module does not bind a score.
 */

import type {
  Cue,
  Development,
  Exchange,
  GuitarMode,
  Length,
  Material,
  MeterPolicy,
  MotifRef,
  PerformancePlan,
  PlanSection,
  Player,
  Point,
  PracticeView,
  Purpose,
  Rat,
  Role,
  Span,
  TempoPolicy,
  VoicePlan,
} from './performancePlanTypes';

export interface PlanSchemaError {
  code: string;
  path: string;
  message: string;
}

export class PerformancePlanSchemaError extends Error {
  readonly errors: PlanSchemaError[];

  constructor(errors: PlanSchemaError[]) {
    super(errors.map((error) => `${error.path}: ${error.message}`).join('\n'));
    this.name = 'PerformancePlanSchemaError';
    this.errors = errors;
  }
}

const PLAYERS = ['guitar', 'bass'] as const;
const MODES: GuitarMode[] = ['MELODIC', 'CHORDAL', 'HYBRID', 'CHORD_MELODY'];
const ROLES: Role[] = ['lead', 'respond', 'support', 'counterpoint', 'listen'];
const PURPOSES: Purpose[] = [
  'statement',
  'fragmentation',
  'extension',
  'contrast',
  'improvisation',
  'bass_feature',
  'dialogue',
  'recall',
  'transformation',
  'silence',
  'ending',
];
const DENSITIES = ['sparse', 'moderate', 'active'] as const;
const PRESERVE = ['rhythm', 'contour', 'pitch', 'rests', 'landing'] as const;
const RETAINED = ['rhythm', 'contour', 'pitch', 'silence', 'source_field'] as const;
const DEPARTURES = ['register', 'rhythm', 'texture', 'harmony'] as const;
const RELATIONS = ['retain_rhythm', 'answer_contour', 'literal_recall', 'contrast_then_return', 'leave_space'] as const;

let activeEdition: '7.3' | '7.3b' = '7.3';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function fail(errors: PlanSchemaError[], path: string, message: string, code = 'SCHEMA'): void {
  errors.push({ code, path, message });
}

function rejectUnknown(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: PlanSchemaError[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(errors, `${path}.${key}`, `unknown field ${key}`, 'UNKNOWN_FIELD');
  }
}

function need(value: Record<string, unknown>, key: string, path: string, errors: PlanSchemaError[]): unknown {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    fail(errors, `${path}.${key}`, `missing ${key}`, 'MISSING_FIELD');
    return undefined;
  }
  return value[key];
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], path: string, errors: PlanSchemaError[]): T | null {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(errors, path, `expected one of ${allowed.join('|')}`, 'BAD_ENUM');
    return null;
  }
  return value as T;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function parseRat(value: unknown, path: string, errors: PlanSchemaError[]): Rat | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected rational');
    return null;
  }
  rejectUnknown(value, ['n', 'd'], path, errors);
  const n = value.n;
  const d = value.d;
  if (typeof n !== 'number' || typeof d !== 'number' || !Number.isInteger(n) || !Number.isInteger(d)) {
    fail(errors, path, 'rational terms must be integers', 'BAD_RATIONAL');
    return null;
  }
  if (d <= 0) {
    fail(errors, path, 'denominator must be > 0', 'BAD_RATIONAL');
    return null;
  }
  if (gcd(n, d) !== 1) {
    fail(errors, path, 'rational must already be reduced', 'BAD_RATIONAL');
    return null;
  }
  return { n, d };
}

function parseSpan(value: unknown, path: string, errors: PlanSchemaError[]): Span | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected span');
    return null;
  }
  rejectUnknown(value, ['firstMeasureId', 'lastMeasureId'], path, errors);
  const first = need(value, 'firstMeasureId', path, errors);
  const last = need(value, 'lastMeasureId', path, errors);
  if (typeof first !== 'string' || !first) fail(errors, `${path}.firstMeasureId`, 'expected measure id');
  if (typeof last !== 'string' || !last) fail(errors, `${path}.lastMeasureId`, 'expected measure id');
  if (typeof first !== 'string' || typeof last !== 'string' || !first || !last) return null;
  return { firstMeasureId: first, lastMeasureId: last };
}

function parsePoint(value: unknown, path: string, errors: PlanSchemaError[]): Point | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected point');
    return null;
  }
  rejectUnknown(value, ['bar', 'offsetQ'], path, errors);
  const bar = need(value, 'bar', path, errors);
  const offsetQ = parseRat(need(value, 'offsetQ', path, errors), `${path}.offsetQ`, errors);
  if (typeof bar !== 'number' || !Number.isInteger(bar) || bar < 0) {
    fail(errors, `${path}.bar`, 'bar must be an integer >= 0', 'BAD_POINT');
    return null;
  }
  if (!offsetQ) return null;
  if (offsetQ.n < 0) fail(errors, `${path}.offsetQ`, 'offset must be >= 0', 'BAD_POINT');
  return { bar, offsetQ };
}

function parseIdList(value: unknown, path: string, errors: PlanSchemaError[]): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item)) {
    fail(errors, path, 'expected string ids');
    return [];
  }
  return value as string[];
}

function parseStringList(value: unknown, allowed: readonly string[], path: string, errors: PlanSchemaError[]): string[] {
  if (!Array.isArray(value)) {
    fail(errors, path, 'expected list');
    return [];
  }
  const out: string[] = [];
  value.forEach((item, index) => {
    const parsed = parseEnum(item, allowed, `${path}[${index}]`, errors);
    if (parsed) out.push(parsed);
  });
  return out;
}

function parseMaterial(value: unknown, path: string, errors: PlanSchemaError[]): Material | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected material');
    return null;
  }
  const kind = value.kind;
  if (kind === 'source') {
    rejectUnknown(value, ['kind', 'span', 'sourcePlayer', 'integrity'], path, errors);
    const span = parseSpan(need(value, 'span', path, errors), `${path}.span`, errors);
    const sourcePlayer = parseEnum(need(value, 'sourcePlayer', path, errors), PLAYERS, `${path}.sourcePlayer`, errors);
    if (value.integrity !== 'exact') fail(errors, `${path}.integrity`, 'V7.3A copies are exact', 'BAD_ENUM');
    if (!span || !sourcePlayer) return null;
    return { kind: 'source', span, sourcePlayer, integrity: 'exact' };
  }
  if (kind === 'chord_melody') {
    rejectUnknown(value, ['kind', 'sourceSpan', 'arrangementSpan', 'integrity'], path, errors);
    const sourceSpan = parseSpan(need(value, 'sourceSpan', path, errors), `${path}.sourceSpan`, errors);
    const arrangementSpan = parseSpan(need(value, 'arrangementSpan', path, errors), `${path}.arrangementSpan`, errors);
    if (value.integrity !== 'exact') fail(errors, `${path}.integrity`, 'chord-melody copies are exact', 'BAD_ENUM');
    if (!sourceSpan || !arrangementSpan) return null;
    return { kind: 'chord_melody', sourceSpan, arrangementSpan, integrity: 'exact' };
  }
  if (kind === 'performer') {
    rejectUnknown(value, ['kind', 'motifIds', 'instruction'], path, errors);
    const motifIds = parseIdList(need(value, 'motifIds', path, errors), `${path}.motifIds`, errors);
    const instruction = need(value, 'instruction', path, errors);
    if (typeof instruction !== 'string' || !instruction.trim()) {
      fail(errors, `${path}.instruction`, 'performer instruction is required', 'MISSING_FIELD');
      return null;
    }
    return { kind: 'performer', motifIds, instruction };
  }
  if (kind === 'tacet') {
    rejectUnknown(value, ['kind', 'reason'], path, errors);
    const reason = parseEnum(need(value, 'reason', path, errors), ['yield', 'structural', 'breath'] as const, `${path}.reason`, errors);
    if (!reason) return null;
    return { kind: 'tacet', reason };
  }
  fail(errors, `${path}.kind`, 'expected source|performer|tacet', 'BAD_ENUM');
  return null;
}

function parseVoice(value: unknown, path: string, errors: PlanSchemaError[]): VoicePlan | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected voice');
    return null;
  }
  rejectUnknown(value, ['material', 'role', 'entry', 'exit', 'density'], path, errors);
  const material = parseMaterial(need(value, 'material', path, errors), `${path}.material`, errors);
  const role = parseEnum(need(value, 'role', path, errors), ROLES, `${path}.role`, errors);
  const entry = parseEntry(need(value, 'entry', path, errors), `${path}.entry`, errors);
  const exit = parseExit(need(value, 'exit', path, errors), `${path}.exit`, errors);
  const densityRaw = need(value, 'density', path, errors);
  const density: VoicePlan['density'] = [];
  if (!Array.isArray(densityRaw) || densityRaw.length === 0) fail(errors, `${path}.density`, 'density envelope is required');
  else {
    densityRaw.forEach((item, index) => {
      if (!isRecord(item)) {
        fail(errors, `${path}.density[${index}]`, 'expected density point');
        return;
      }
      rejectUnknown(item, ['at', 'level'], `${path}.density[${index}]`, errors);
      const at = parsePoint(need(item, 'at', `${path}.density[${index}]`, errors), `${path}.density[${index}].at`, errors);
      const level = parseEnum(need(item, 'level', `${path}.density[${index}]`, errors), DENSITIES, `${path}.density[${index}].level`, errors);
      if (at && level) density.push({ at, level });
    });
  }
  if (!material || !role || !entry || !exit) return null;
  return { material, role, entry, exit, density };
}

function parseEntry(value: unknown, path: string, errors: PlanSchemaError[]): VoicePlan['entry'] | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected entry');
    return null;
  }
  if (value.kind === 'at') {
    rejectUnknown(value, ['kind', 'point'], path, errors);
    const point = parsePoint(need(value, 'point', path, errors), `${path}.point`, errors);
    return point ? { kind: 'at', point } : null;
  }
  if (value.kind === 'cue') {
    rejectUnknown(value, ['kind', 'cueId'], path, errors);
    const cueId = need(value, 'cueId', path, errors);
    if (typeof cueId !== 'string' || !cueId) {
      fail(errors, `${path}.cueId`, 'expected cue id');
      return null;
    }
    return { kind: 'cue', cueId };
  }
  fail(errors, `${path}.kind`, 'expected at|cue', 'BAD_ENUM');
  return null;
}

function parseExit(value: unknown, path: string, errors: PlanSchemaError[]): VoicePlan['exit'] | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected exit');
    return null;
  }
  if (value.kind === 'section_end') {
    rejectUnknown(value, ['kind'], path, errors);
    return { kind: 'section_end' };
  }
  if (value.kind === 'at') {
    rejectUnknown(value, ['kind', 'point'], path, errors);
    const point = parsePoint(need(value, 'point', path, errors), `${path}.point`, errors);
    return point ? { kind: 'at', point } : null;
  }
  if (value.kind === 'cue') {
    rejectUnknown(value, ['kind', 'cueId'], path, errors);
    const cueId = need(value, 'cueId', path, errors);
    if (typeof cueId !== 'string' || !cueId) {
      fail(errors, `${path}.cueId`, 'expected cue id');
      return null;
    }
    return { kind: 'cue', cueId };
  }
  fail(errors, `${path}.kind`, 'expected section_end|at|cue', 'BAD_ENUM');
  return null;
}

function parseLength(value: unknown, path: string, errors: PlanSchemaError[]): Length | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected length');
    return null;
  }
  if (value.kind === 'source') {
    rejectUnknown(value, ['kind', 'span'], path, errors);
    const span = parseSpan(need(value, 'span', path, errors), `${path}.span`, errors);
    return span ? { kind: 'source', span } : null;
  }
  if (value.kind === 'fixed') {
    rejectUnknown(value, ['kind', 'bars'], path, errors);
    const bars = value.bars;
    if (typeof bars !== 'number' || !Number.isInteger(bars) || bars <= 0) {
      fail(errors, `${path}.bars`, 'fixed length must be an integer > 0', 'BAD_LENGTH');
      return null;
    }
    return { kind: 'fixed', bars };
  }
  if (value.kind === 'cue_window') {
    rejectUnknown(value, ['kind', 'cycleBars', 'minCycles', 'maxCycles', 'previewCycles', 'releaseCueId'], path, errors);
    const nums = ['cycleBars', 'minCycles', 'maxCycles', 'previewCycles'] as const;
    for (const key of nums) {
      const item = value[key];
      if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) {
        fail(errors, `${path}.${key}`, `${key} must be an integer > 0`, 'BAD_LENGTH');
      }
    }
    if (typeof value.releaseCueId !== 'string' || !value.releaseCueId) fail(errors, `${path}.releaseCueId`, 'expected cue id');
    if (activeEdition !== '7.3b') {
      fail(errors, path, 'cue windows are deferred to V7.3B', 'CUE_WINDOW_DEFERRED');
      return null;
    }
    const cycleBars = value.cycleBars;
    const minCycles = value.minCycles;
    const maxCycles = value.maxCycles;
    const previewCycles = value.previewCycles;
    if (
      typeof cycleBars !== 'number' ||
      typeof minCycles !== 'number' ||
      typeof maxCycles !== 'number' ||
      typeof previewCycles !== 'number' ||
      typeof value.releaseCueId !== 'string'
    ) {
      return null;
    }
    if (minCycles > previewCycles || previewCycles > maxCycles) {
      fail(errors, path, 'preview cycles must sit between min and max', 'BAD_LENGTH');
    }
    return { kind: 'cue_window', cycleBars, minCycles, maxCycles, previewCycles, releaseCueId: value.releaseCueId };
  }
  fail(errors, `${path}.kind`, 'expected source|fixed|cue_window', 'BAD_ENUM');
  return null;
}

function parseMeter(value: unknown, path: string, errors: PlanSchemaError[]): MeterPolicy | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected metre');
    return null;
  }
  if (value.kind === 'source' || value.kind === 'repeat_template') {
    rejectUnknown(value, ['kind', 'span'], path, errors);
    const span = parseSpan(need(value, 'span', path, errors), `${path}.span`, errors);
    return span ? { kind: value.kind, span } : null;
  }
  if (value.kind === 'explicit') {
    rejectUnknown(value, ['kind', 'beats', 'beatType', 'groups'], path, errors);
    const beats = value.beats;
    const beatType = value.beatType;
    if (typeof beats !== 'number' || !Number.isInteger(beats) || beats <= 0) fail(errors, `${path}.beats`, 'beats must be > 0');
    if (typeof beatType !== 'number' || ![1, 2, 4, 8, 16].includes(beatType)) fail(errors, `${path}.beatType`, 'beat type must be 1, 2, 4, 8, or 16');
    if (!Array.isArray(value.groups) || value.groups.some((item) => typeof item !== 'number' || item <= 0)) {
      fail(errors, `${path}.groups`, 'groups must be positive numbers');
      return null;
    }
    const groups = value.groups as number[];
    if (typeof beats === 'number' && groups.reduce((sum, item) => sum + item, 0) !== beats) {
      fail(errors, `${path}.groups`, 'groups must sum to beats', 'BAD_METER');
    }
    if (typeof beats !== 'number' || typeof beatType !== 'number') return null;
    return { kind: 'explicit', beats, beatType, groups };
  }
  fail(errors, `${path}.kind`, 'expected source|repeat_template|explicit', 'BAD_ENUM');
  return null;
}

function parseTempo(value: unknown, path: string, errors: PlanSchemaError[]): TempoPolicy | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected tempo');
    return null;
  }
  if (value.kind === 'source') {
    rejectUnknown(value, ['kind', 'span'], path, errors);
    const span = parseSpan(need(value, 'span', path, errors), `${path}.span`, errors);
    return span ? { kind: 'source', span } : null;
  }
  if (value.kind === 'inherit_entry') {
    rejectUnknown(value, ['kind'], path, errors);
    return { kind: 'inherit_entry' };
  }
  if (value.kind === 'explicit') {
    rejectUnknown(value, ['kind', 'unitDenominator', 'dots', 'bpm'], path, errors);
    const unitDenominator = value.unitDenominator;
    const dots = value.dots;
    const bpm = value.bpm;
    if (typeof unitDenominator !== 'number' || ![1, 2, 4, 8, 16].includes(unitDenominator)) {
      fail(errors, `${path}.unitDenominator`, 'expected beat denominator');
    }
    if (typeof dots !== 'number' || !Number.isInteger(dots) || dots < 0 || dots > 2) fail(errors, `${path}.dots`, 'dots must be 0, 1, or 2');
    if (typeof bpm !== 'number' || bpm <= 0) fail(errors, `${path}.bpm`, 'bpm must be > 0');
    if (typeof unitDenominator !== 'number' || typeof dots !== 'number' || typeof bpm !== 'number') return null;
    return { kind: 'explicit', unitDenominator, dots, bpm };
  }
  if (value.kind === 'rubato') {
    if (activeEdition !== '7.3b') {
      fail(errors, path, 'rubato preview is deferred to V7.3B', 'RUBATO_DEFERRED');
      return null;
    }
    rejectUnknown(value, ['kind', 'rejoinSectionId', 'previewQuarterBpm'], path, errors);
    const rejoinSectionId = value.rejoinSectionId;
    const previewQuarterBpm = value.previewQuarterBpm;
    if (typeof rejoinSectionId !== 'string' || !rejoinSectionId) fail(errors, `${path}.rejoinSectionId`, 'expected section id');
    if (typeof previewQuarterBpm !== 'number' || previewQuarterBpm <= 0) fail(errors, `${path}.previewQuarterBpm`, 'bpm must be > 0');
    if (typeof rejoinSectionId !== 'string' || typeof previewQuarterBpm !== 'number') return null;
    return { kind: 'rubato', rejoinSectionId, previewQuarterBpm };
  }
  fail(errors, `${path}.kind`, 'expected source|inherit_entry|explicit|rubato', 'BAD_ENUM');
  return null;
}

function parseCue(value: unknown, path: string, errors: PlanSchemaError[]): Cue | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected cue');
    return null;
  }
  const cueKeys = ['id', 'owner', 'action', 'target', 'trigger', 'printedText'];
  if (activeEdition === '7.3b') cueKeys.push('prerequisites', 'responseDelay', 'interruption', 'returnLandmarkId');
  rejectUnknown(value, cueKeys, path, errors);
  const id = need(value, 'id', path, errors);
  const owner = parseEnum(need(value, 'owner', path, errors), ['guitar', 'bass', 'both'] as const, `${path}.owner`, errors);
  const actions = activeEdition === '7.3b' ? (['enter', 'release', 'handoff', 'rejoin', 'end', 'interrupt'] as const) : (['enter', 'release', 'handoff', 'rejoin', 'end'] as const);
  const action = parseEnum(need(value, 'action', path, errors), actions, `${path}.action`, errors);
  const target = parseEnum(need(value, 'target', path, errors), ['guitar', 'bass', 'both'] as const, `${path}.target`, errors);
  const printedText = need(value, 'printedText', path, errors);
  const triggerRaw = need(value, 'trigger', path, errors);
  if (typeof id !== 'string' || !id) fail(errors, `${path}.id`, 'expected cue id');
  if (typeof printedText !== 'string' || !printedText.trim()) fail(errors, `${path}.printedText`, 'cue text is required');
  if (!owner || !action || !target || typeof id !== 'string' || typeof printedText !== 'string') return null;
  if (!isRecord(triggerRaw)) {
    fail(errors, `${path}.trigger`, 'expected trigger');
    return null;
  }
  let trigger: Cue['trigger'] | null = null;
  if (triggerRaw.kind === 'at') {
    rejectUnknown(triggerRaw, ['kind', 'point'], `${path}.trigger`, errors);
    const point = parsePoint(need(triggerRaw, 'point', `${path}.trigger`, errors), `${path}.trigger.point`, errors);
    if (!point) return null;
    trigger = { kind: 'at', point };
  } else if (triggerRaw.kind === 'performer_signal') {
    rejectUnknown(triggerRaw, ['kind', 'earliest', 'latest', 'afterCueId'], `${path}.trigger`, errors);
    const earliest = parsePoint(need(triggerRaw, 'earliest', `${path}.trigger`, errors), `${path}.trigger.earliest`, errors);
    const latest = parsePoint(need(triggerRaw, 'latest', `${path}.trigger`, errors), `${path}.trigger.latest`, errors);
    const afterCueId = triggerRaw.afterCueId;
    if (afterCueId !== null && typeof afterCueId !== 'string') fail(errors, `${path}.trigger.afterCueId`, 'expected cue id or null');
    if (!earliest || !latest || (afterCueId !== null && typeof afterCueId !== 'string')) return null;
    trigger = { kind: 'performer_signal', earliest, latest, afterCueId };
  } else {
    fail(errors, `${path}.trigger.kind`, 'expected at|performer_signal', 'BAD_ENUM');
    return null;
  }
  const cue: Cue = { id, owner, action, target, trigger, printedText };
  if (activeEdition !== '7.3b') return cue;
  const prerequisites = value.prerequisites === undefined ? [] : parseIdList(value.prerequisites, `${path}.prerequisites`, errors);
  const responseDelay = parseResponseDelay(value.responseDelay, `${path}.responseDelay`, errors);
  const interruption = parseInterruption(value.interruption, `${path}.interruption`, errors);
  const returnLandmarkId = value.returnLandmarkId === undefined ? null : value.returnLandmarkId;
  if (returnLandmarkId !== null && typeof returnLandmarkId !== 'string') {
    fail(errors, `${path}.returnLandmarkId`, 'expected landmark id or null');
  }
  if (!responseDelay || !interruption || (returnLandmarkId !== null && typeof returnLandmarkId !== 'string')) return null;
  cue.prerequisites = prerequisites;
  cue.responseDelay = responseDelay;
  cue.interruption = interruption;
  cue.returnLandmarkId = returnLandmarkId as string | null;
  return cue;
}

function parseResponseDelay(value: unknown, path: string, errors: PlanSchemaError[]): Cue['responseDelay'] | null {
  if (value === undefined) return { minQ: { n: 0, d: 1 }, maxQ: { n: 0, d: 1 }, previewQ: { n: 0, d: 1 } };
  if (!isRecord(value)) {
    fail(errors, path, 'expected response delay');
    return null;
  }
  rejectUnknown(value, ['minQ', 'maxQ', 'previewQ'], path, errors);
  const minQ = parseRat(need(value, 'minQ', path, errors), `${path}.minQ`, errors);
  const maxQ = parseRat(need(value, 'maxQ', path, errors), `${path}.maxQ`, errors);
  const previewQ = parseRat(need(value, 'previewQ', path, errors), `${path}.previewQ`, errors);
  if (!minQ || !maxQ || !previewQ) return null;
  return { minQ, maxQ, previewQ };
}

function parseInterruption(value: unknown, path: string, errors: PlanSchemaError[]): Cue['interruption'] | null {
  if (value === undefined) return { behaviour: 'none' };
  if (!isRecord(value)) {
    fail(errors, path, 'expected interruption');
    return null;
  }
  rejectUnknown(value, ['behaviour', 'overlapQ', 'handoffTo'], path, errors);
  const behaviour = parseEnum(
    need(value, 'behaviour', path, errors),
    ['none', 'stop', 'overlap', 'handoff'] as const,
    `${path}.behaviour`,
    errors
  );
  if (!behaviour) return null;
  const interruption: NonNullable<Cue['interruption']> = { behaviour };
  if (behaviour === 'overlap') {
    const overlapQ = parseRat(need(value, 'overlapQ', path, errors), `${path}.overlapQ`, errors);
    if (!overlapQ) return null;
    interruption.overlapQ = overlapQ;
  }
  if (behaviour === 'handoff') {
    const handoffTo = parseEnum(need(value, 'handoffTo', path, errors), PLAYERS, `${path}.handoffTo`, errors);
    if (!handoffTo) return null;
    interruption.handoffTo = handoffTo;
  }
  return interruption;
}

function parseExchange(value: unknown, path: string, errors: PlanSchemaError[]): Exchange | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected exchange');
    return null;
  }
  rejectUnknown(
    value,
    ['id', 'initiator', 'responder', 'motifIds', 'proposalCueId', 'responseCueId', 'relation', 'retainedAnchor', 'returnSectionId', 'execution'],
    path,
    errors
  );
  const id = need(value, 'id', path, errors);
  const initiator = parseEnum(need(value, 'initiator', path, errors), PLAYERS, `${path}.initiator`, errors);
  const responder = parseEnum(need(value, 'responder', path, errors), PLAYERS, `${path}.responder`, errors);
  const motifIds = parseIdList(need(value, 'motifIds', path, errors), `${path}.motifIds`, errors);
  const proposalCueId = need(value, 'proposalCueId', path, errors);
  const responseCueId = need(value, 'responseCueId', path, errors);
  const relation = parseEnum(need(value, 'relation', path, errors), RELATIONS, `${path}.relation`, errors);
  const retainedAnchor = need(value, 'retainedAnchor', path, errors);
  const returnSectionId = need(value, 'returnSectionId', path, errors);
  if (value.execution !== 'performer_directed') fail(errors, `${path}.execution`, 'exchange execution is performer_directed', 'BAD_ENUM');
  if (typeof id !== 'string' || !id) fail(errors, `${path}.id`, 'expected id');
  if (typeof proposalCueId !== 'string' || typeof responseCueId !== 'string') fail(errors, path, 'exchange cues must be ids');
  if (typeof retainedAnchor !== 'string' || !retainedAnchor) fail(errors, `${path}.retainedAnchor`, 'retained anchor is required');
  if (returnSectionId !== null && typeof returnSectionId !== 'string') fail(errors, `${path}.returnSectionId`, 'expected section id or null');
  if (!initiator || !responder || !relation || typeof id !== 'string' || typeof proposalCueId !== 'string' || typeof responseCueId !== 'string') {
    return null;
  }
  if (typeof retainedAnchor !== 'string') return null;
  return {
    id,
    initiator,
    responder,
    motifIds,
    proposalCueId,
    responseCueId,
    relation,
    retainedAnchor,
    returnSectionId: returnSectionId as string | null,
    execution: 'performer_directed',
  };
}

function parseDevelopment(value: unknown, path: string, errors: PlanSchemaError[]): Development | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected development');
    return null;
  }
  rejectUnknown(value, ['parentMotifIds', 'operation', 'retained', 'permittedDeparture', 'returnSectionId', 'execution'], path, errors);
  const operation = parseEnum(
    need(value, 'operation', path, errors),
    ['none', 'fragment', 'extend', 'contrast', 'recall', 'transform'] as const,
    `${path}.operation`,
    errors
  );
  const execution = parseEnum(need(value, 'execution', path, errors), ['literal_quote', 'performer_directed'] as const, `${path}.execution`, errors);
  const returnSectionId = need(value, 'returnSectionId', path, errors);
  if (returnSectionId !== null && typeof returnSectionId !== 'string') fail(errors, `${path}.returnSectionId`, 'expected section id or null');
  if (!operation || !execution) return null;
  return {
    parentMotifIds: parseIdList(need(value, 'parentMotifIds', path, errors), `${path}.parentMotifIds`, errors),
    operation,
    retained: parseStringList(need(value, 'retained', path, errors), RETAINED, `${path}.retained`, errors) as Development['retained'],
    permittedDeparture: parseStringList(
      need(value, 'permittedDeparture', path, errors),
      DEPARTURES,
      `${path}.permittedDeparture`,
      errors
    ) as Development['permittedDeparture'],
    returnSectionId: returnSectionId as string | null,
    execution,
  };
}

function parseSection(value: unknown, path: string, errors: PlanSchemaError[]): PlanSection | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected section');
    return null;
  }
  const sectionKeys = ['id', 'purpose', 'length', 'meter', 'tempo', 'primarySourceSpan', 'guitarMode', 'voices', 'development', 'harmony', 'cues', 'exchanges', 'rationale'];
  if (activeEdition === '7.3b') sectionKeys.push('leadership', 'authorisedSubstitution');
  rejectUnknown(value, sectionKeys, path, errors);
  const id = need(value, 'id', path, errors);
  const purpose = parseEnum(need(value, 'purpose', path, errors), PURPOSES, `${path}.purpose`, errors);
  const length = parseLength(need(value, 'length', path, errors), `${path}.length`, errors);
  const meter = parseMeter(need(value, 'meter', path, errors), `${path}.meter`, errors);
  const tempo = parseTempo(need(value, 'tempo', path, errors), `${path}.tempo`, errors);
  const primaryRaw = need(value, 'primarySourceSpan', path, errors);
  const primarySourceSpan = primaryRaw === null ? null : parseSpan(primaryRaw, `${path}.primarySourceSpan`, errors);
  const guitarMode = parseEnum(need(value, 'guitarMode', path, errors), MODES, `${path}.guitarMode`, errors);
  const voicesRaw = need(value, 'voices', path, errors);
  let voices: PlanSection['voices'] | null = null;
  if (!isRecord(voicesRaw)) fail(errors, `${path}.voices`, 'expected guitar and bass');
  else {
    rejectUnknown(voicesRaw, ['guitar', 'bass'], `${path}.voices`, errors);
    const guitar = parseVoice(need(voicesRaw, 'guitar', `${path}.voices`, errors), `${path}.voices.guitar`, errors);
    const bass = parseVoice(need(voicesRaw, 'bass', `${path}.voices`, errors), `${path}.voices.bass`, errors);
    if (guitar && bass) voices = { guitar, bass };
  }
  const development = parseDevelopment(need(value, 'development', path, errors), `${path}.development`, errors);
  const harmonyRaw = need(value, 'harmony', path, errors);
  let harmony: PlanSection['harmony'] | null = null;
  if (!isRecord(harmonyRaw)) fail(errors, `${path}.harmony`, 'expected harmony policy');
  else {
    rejectUnknown(harmonyRaw, ['policy', 'sourceSpan', 'vocabularyRefs', 'instruction'], `${path}.harmony`, errors);
    const policy = parseEnum(need(harmonyRaw, 'policy', `${path}.harmony`, errors), ['source', 'performer_intent'] as const, `${path}.harmony.policy`, errors);
    const sourceRaw = need(harmonyRaw, 'sourceSpan', `${path}.harmony`, errors);
    const sourceSpan = sourceRaw === null ? null : parseSpan(sourceRaw, `${path}.harmony.sourceSpan`, errors);
    const instruction = need(harmonyRaw, 'instruction', `${path}.harmony`, errors);
    if (instruction !== null && typeof instruction !== 'string') fail(errors, `${path}.harmony.instruction`, 'expected string or null');
    if (policy && (sourceRaw === null || sourceSpan) && (instruction === null || typeof instruction === 'string')) {
      harmony = {
        policy,
        sourceSpan,
        vocabularyRefs: parseIdList(need(harmonyRaw, 'vocabularyRefs', `${path}.harmony`, errors), `${path}.harmony.vocabularyRefs`, errors),
        instruction,
      };
    }
  }
  const cuesRaw = need(value, 'cues', path, errors);
  const exchangesRaw = need(value, 'exchanges', path, errors);
  const cues: Cue[] = [];
  const exchanges: Exchange[] = [];
  if (!Array.isArray(cuesRaw)) fail(errors, `${path}.cues`, 'expected list');
  else cuesRaw.forEach((item, index) => {
    const cue = parseCue(item, `${path}.cues[${index}]`, errors);
    if (cue) cues.push(cue);
  });
  if (!Array.isArray(exchangesRaw)) fail(errors, `${path}.exchanges`, 'expected list');
  else exchangesRaw.forEach((item, index) => {
    const exchange = parseExchange(item, `${path}.exchanges[${index}]`, errors);
    if (exchange) exchanges.push(exchange);
  });
  const rationale = need(value, 'rationale', path, errors);
  if (typeof id !== 'string' || !id) fail(errors, `${path}.id`, 'expected section id');
  if (typeof rationale !== 'string') fail(errors, `${path}.rationale`, 'expected rationale');
  if (!purpose || !length || !meter || !tempo || !guitarMode || !voices || !development || !harmony || typeof id !== 'string' || typeof rationale !== 'string') {
    return null;
  }
  const section: PlanSection = { id, purpose, length, meter, tempo, primarySourceSpan, guitarMode, voices, development, harmony, cues, exchanges, rationale };
  if (activeEdition === '7.3b') {
    if (value.leadership !== undefined) {
      const leadership = parseEnum(value.leadership, ['guitar', 'bass', 'shared'] as const, `${path}.leadership`, errors);
      if (leadership) section.leadership = leadership;
    }
    if (value.authorisedSubstitution !== undefined) {
      if (value.authorisedSubstitution === null) section.authorisedSubstitution = null;
      else if (!isRecord(value.authorisedSubstitution)) fail(errors, `${path}.authorisedSubstitution`, 'expected span pair or null');
      else {
        rejectUnknown(value.authorisedSubstitution, ['sourceSpan', 'arrangementSpan'], `${path}.authorisedSubstitution`, errors);
        const sourceSpan = parseSpan(value.authorisedSubstitution.sourceSpan, `${path}.authorisedSubstitution.sourceSpan`, errors);
        const arrangementSpan = parseSpan(value.authorisedSubstitution.arrangementSpan, `${path}.authorisedSubstitution.arrangementSpan`, errors);
        if (sourceSpan && arrangementSpan) section.authorisedSubstitution = { sourceSpan, arrangementSpan };
      }
    }
  }
  return section;
}

function parsePractice(value: unknown, path: string, errors: PlanSchemaError[]): PracticeView | null {
  if (!isRecord(value)) {
    fail(errors, path, 'expected practice view');
    return null;
  }
  rejectUnknown(value, ['id', 'product', 'sectionIds', 'focus', 'approaches'], path, errors);
  const id = need(value, 'id', path, errors);
  const product = parseEnum(need(value, 'product', path, errors), ['guitar_study', 'bass_partner'] as const, `${path}.product`, errors);
  const focus = parseEnum(need(value, 'focus', path, errors), PLAYERS, `${path}.focus`, errors);
  const approaches = parseStringList(
    need(value, 'approaches', path, errors),
    ['minimal', 'lyrical', 'adventurous'] as const,
    `${path}.approaches`,
    errors
  ) as PracticeView['approaches'];
  if (typeof id !== 'string' || !id || !product || !focus) return null;
  return { id, product, focus, sectionIds: parseIdList(need(value, 'sectionIds', path, errors), `${path}.sectionIds`, errors), approaches };
}

export function parsePerformancePlan(value: unknown): PerformancePlan {
  const errors: PlanSchemaError[] = [];
  if (!isRecord(value)) throw new PerformancePlanSchemaError([{ code: 'SCHEMA', path: '$', message: 'plan must be an object' }]);
  rejectUnknown(
    value,
    ['schemaVersion', 'engineEdition', 'id', 'source', 'motifs', 'identity', 'sections', 'ending', 'practiceViews', 'notes', 'chordMelody'],
    '$',
    errors
  );
  if (value.schemaVersion !== '1.0') fail(errors, '$.schemaVersion', 'expected schemaVersion 1.0', 'BAD_VERSION');
  if (value.engineEdition !== '7.3' && value.engineEdition !== '7.3b') {
    fail(errors, '$.engineEdition', 'expected engineEdition 7.3 or 7.3b', 'BAD_VERSION');
  }
  activeEdition = value.engineEdition === '7.3b' ? '7.3b' : '7.3';
  if (typeof value.id !== 'string' || !value.id) fail(errors, '$.id', 'expected plan id');
  const sourceRaw = need(value, 'source', '$', errors);
  let source: PerformancePlan['source'] | null = null;
  if (!isRecord(sourceRaw)) fail(errors, '$.source', 'expected source binding');
  else {
    rejectUnknown(sourceRaw, ['scoreId', 'sha256', 'partIds', 'annotationSha256'], '$.source', errors);
    const partIds = need(sourceRaw, 'partIds', '$.source', errors);
    let parts: PerformancePlan['source']['partIds'] | null = null;
    if (!isRecord(partIds)) fail(errors, '$.source.partIds', 'expected part ids');
    else {
      rejectUnknown(partIds, ['guitar', 'bass'], '$.source.partIds', errors);
      if (typeof partIds.guitar === 'string' && typeof partIds.bass === 'string') parts = { guitar: partIds.guitar, bass: partIds.bass };
      else fail(errors, '$.source.partIds', 'guitar and bass part ids are required');
    }
    if (typeof sourceRaw.scoreId !== 'string' || typeof sourceRaw.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sourceRaw.sha256)) {
      fail(errors, '$.source.sha256', 'expected score id and 64-char sha256', 'BAD_HASH');
    }
    if (sourceRaw.annotationSha256 !== null && (typeof sourceRaw.annotationSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sourceRaw.annotationSha256))) {
      fail(errors, '$.source.annotationSha256', 'expected null or sha256', 'BAD_HASH');
    }
    if (parts && typeof sourceRaw.scoreId === 'string' && typeof sourceRaw.sha256 === 'string') {
      source = { scoreId: sourceRaw.scoreId, sha256: sourceRaw.sha256, partIds: parts, annotationSha256: sourceRaw.annotationSha256 as string | null };
    }
  }
  const motifs: MotifRef[] = [];
  if (!Array.isArray(value.motifs)) fail(errors, '$.motifs', 'expected list');
  else {
    value.motifs.forEach((item, index) => {
      const path = `$.motifs[${index}]`;
      if (!isRecord(item)) {
        fail(errors, path, 'expected motif');
        return;
      }
      rejectUnknown(item, ['id', 'owner', 'span', 'sourceEventIds', 'provenance', 'preserve'], path, errors);
      const id = item.id;
      const owner = parseEnum(item.owner, PLAYERS, `${path}.owner`, errors);
      const span = parseSpan(item.span, `${path}.span`, errors);
      const provenance = parseEnum(item.provenance, ['source_annotation', 'user_confirmed', 'candidate'] as const, `${path}.provenance`, errors);
      if (typeof id !== 'string' || !owner || !span || !provenance) return;
      motifs.push({
        id,
        owner,
        span,
        sourceEventIds: parseIdList(item.sourceEventIds, `${path}.sourceEventIds`, errors),
        provenance,
        preserve: parseStringList(item.preserve, PRESERVE, `${path}.preserve`, errors) as MotifRef['preserve'],
      });
    });
  }
  const identityRaw = need(value, 'identity', '$', errors);
  let identity: PerformancePlan['identity'] | null = null;
  if (!isRecord(identityRaw)) fail(errors, '$.identity', 'expected identity');
  else {
    rejectUnknown(identityRaw, ['primaryTraversal', 'protectedSpans', 'requiredMotifIds', 'returnLandmarks'], '$.identity', errors);
    const primaryTraversal: Span[] = [];
    const protectedSpans: Span[] = [];
    const returnLandmarks: PerformancePlan['identity']['returnLandmarks'] = [];
    if (!Array.isArray(identityRaw.primaryTraversal)) fail(errors, '$.identity.primaryTraversal', 'expected spans');
    else identityRaw.primaryTraversal.forEach((item, index) => {
      const span = parseSpan(item, `$.identity.primaryTraversal[${index}]`, errors);
      if (span) primaryTraversal.push(span);
    });
    if (!Array.isArray(identityRaw.protectedSpans)) fail(errors, '$.identity.protectedSpans', 'expected spans');
    else identityRaw.protectedSpans.forEach((item, index) => {
      const span = parseSpan(item, `$.identity.protectedSpans[${index}]`, errors);
      if (span) protectedSpans.push(span);
    });
    if (!Array.isArray(identityRaw.returnLandmarks)) fail(errors, '$.identity.returnLandmarks', 'expected landmarks');
    else identityRaw.returnLandmarks.forEach((item, index) => {
      const path = `$.identity.returnLandmarks[${index}]`;
      if (!isRecord(item)) {
        fail(errors, path, 'expected landmark');
        return;
      }
      rejectUnknown(item, ['id', 'span'], path, errors);
      const span = parseSpan(item.span, `${path}.span`, errors);
      if (typeof item.id === 'string' && span) returnLandmarks.push({ id: item.id, span });
      else fail(errors, path, 'expected landmark id and span');
    });
    identity = {
      primaryTraversal,
      protectedSpans,
      requiredMotifIds: parseIdList(identityRaw.requiredMotifIds, '$.identity.requiredMotifIds', errors),
      returnLandmarks,
    };
  }
  const sections: PlanSection[] = [];
  if (!Array.isArray(value.sections) || value.sections.length === 0) fail(errors, '$.sections', 'plan needs at least one section');
  else value.sections.forEach((item, index) => {
    const section = parseSection(item, `$.sections[${index}]`, errors);
    if (section) sections.push(section);
  });
  const endingRaw = need(value, 'ending', '$', errors);
  let ending: PerformancePlan['ending'] | null = null;
  if (!isRecord(endingRaw)) fail(errors, '$.ending', 'expected ending');
  else if (endingRaw.kind === 'source') {
    rejectUnknown(endingRaw, ['kind', 'finalSectionId', 'tail'], '$.ending', errors);
    const tail = parseSpan(endingRaw.tail, '$.ending.tail', errors);
    if (typeof endingRaw.finalSectionId === 'string' && tail) ending = { kind: 'source', finalSectionId: endingRaw.finalSectionId, tail };
    else fail(errors, '$.ending', 'source ending needs a final section and tail');
  } else if (endingRaw.kind === 'cue_release') {
    if (activeEdition !== '7.3b') fail(errors, '$.ending', 'cue-release endings are deferred to V7.3B', 'CUE_RELEASE_DEFERRED');
    else {
      rejectUnknown(endingRaw, ['kind', 'finalSectionId', 'cueId', 'preserveFinalSonority'], '$.ending', errors);
      if (typeof endingRaw.finalSectionId !== 'string' || typeof endingRaw.cueId !== 'string' || typeof endingRaw.preserveFinalSonority !== 'boolean') {
        fail(errors, '$.ending', 'cue-release ending needs a final section, cue, and sonority flag');
      } else {
        ending = {
          kind: 'cue_release',
          finalSectionId: endingRaw.finalSectionId,
          cueId: endingRaw.cueId,
          preserveFinalSonority: endingRaw.preserveFinalSonority,
        };
      }
    }
  } else fail(errors, '$.ending.kind', 'expected source|cue_release', 'BAD_ENUM');
  const practiceViews: PracticeView[] = [];
  if (!Array.isArray(value.practiceViews)) fail(errors, '$.practiceViews', 'expected list');
  else value.practiceViews.forEach((item, index) => {
    const view = parsePractice(item, `$.practiceViews[${index}]`, errors);
    if (view) practiceViews.push(view);
  });
  if (!Array.isArray(value.notes) || value.notes.some((item) => typeof item !== 'string')) fail(errors, '$.notes', 'expected strings');
  let chordMelody: PerformancePlan['chordMelody'];
  if (Object.prototype.hasOwnProperty.call(value, 'chordMelody')) {
    if (value.chordMelody === null) chordMelody = null;
    else if (!isRecord(value.chordMelody)) fail(errors, '$.chordMelody', 'expected arrangement binding or null');
    else {
      rejectUnknown(value.chordMelody, ['id', 'sha256', 'scoreId', 'label'], '$.chordMelody', errors);
      const binding = value.chordMelody;
      if (typeof binding.id !== 'string' || typeof binding.scoreId !== 'string' || typeof binding.label !== 'string') {
        fail(errors, '$.chordMelody', 'expected id, scoreId, and label');
      }
      if (typeof binding.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(binding.sha256)) {
        fail(errors, '$.chordMelody.sha256', 'expected 64-char sha256', 'BAD_HASH');
      }
      if (typeof binding.id === 'string' && typeof binding.scoreId === 'string' && typeof binding.sha256 === 'string' && typeof binding.label === 'string') {
        chordMelody = { id: binding.id, sha256: binding.sha256, scoreId: binding.scoreId, label: binding.label };
      }
    }
  }
  if (errors.length || !source || !identity || !ending || typeof value.id !== 'string') {
    throw new PerformancePlanSchemaError(errors.length ? errors : [{ code: 'SCHEMA', path: '$', message: 'plan failed validation' }]);
  }
  const plan: PerformancePlan = {
    schemaVersion: '1.0',
    engineEdition: activeEdition,
    id: value.id,
    source,
    motifs,
    identity,
    sections,
    ending,
    practiceViews,
    notes: value.notes as string[],
  };
  if (chordMelody !== undefined) plan.chordMelody = chordMelody;
  return plan;
}

export function canonicalPlanJson(plan: PerformancePlan): string {
  return canonicalize(plan);
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
