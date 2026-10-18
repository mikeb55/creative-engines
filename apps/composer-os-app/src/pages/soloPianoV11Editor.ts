/**
 * Editable Solo Piano V1.1 request.
 * The page submits this object through api.composePiano.
 */

import {
  PIANO_V11_METRES,
  buildPianoTimeline,
  meterSupported,
  validatePianoMeterPlan,
  type PianoMeterBarPlan,
} from '@composer-os/core/piano/pianoMeterPlan';
import { parentMemberLetters, type PianoPolychordRegion, type PianoTriadQuality } from '@composer-os/core/piano/pianoV11Polychord';
import { phraseRegionSummary } from '@composer-os/core/piano/pianoV11Phrase';
import { resolvePianoV11 } from '@composer-os/core/piano/pianoV11Request';
import {
  canonicalStageBHarmony,
  fullV11DemonstrationBody,
  requestFingerprint,
  windowContinuation,
  type PianoFieldError,
  type PianoPublicRhythmicWindow,
} from '@composer-os/core/piano/pianoV11Windows';

export const SOLO_PIANO_CONFIG_KIND = 'solo-piano-v11-config';
export const SOLO_PIANO_CONFIG_VERSION = 1;

export type PieceId = 'fixture' | 'coffee-run' | 'general';
export type BarCount = 8 | 16 | 24;
export type TonalCentre = 'C' | 'Am';
export type TriadQuality = PianoTriadQuality;
export type MeterMode = 'legacy' | 'uniform' | 'cycle';
export type Polyrhythm = 'off' | '3:2' | '5:4' | 'both';
export type PolychordMode = 'off' | 'acceptance' | 'single';

export interface MeterDraftRow {
  bar: string;
  numerator: string;
  denominator: string;
  groups: string;
}

export interface WindowDraft {
  id: string;
  bar: string;
  offsetN: string;
  offsetD: string;
  extentN: string;
  extentD: string;
  hand: 'RH' | 'LH';
  subdivision: string;
  rests: string;
  material: string;
  against: string;
}

export interface PolychordDraft {
  startBar: string;
  endBar: string;
  upperRoot: string;
  upperQuality: string;
  lowerRoot: string;
  lowerQuality: string;
}

export interface SoloPianoFormState {
  piece: PieceId;
  seed: number;
  innerVoice: boolean;
  bars: BarCount;
  tempo: number;
  tonalCentre: TonalCentre;
  harmony: string[];
  advanced: boolean;
  phraseDevelopment: 'off' | 'on';
  polychordMode: PolychordMode;
  upperRoot: string;
  upperQuality: TriadQuality;
  lowerRoot: string;
  lowerQuality: TriadQuality;
  meterMode: MeterMode;
  uniformMeter: string;
  polyrhythm: Polyrhythm;
  useExplicitWindows: boolean;
  meterRows: MeterDraftRow[];
  windows: WindowDraft[];
  polychordRegions: PolychordDraft[];
}

export interface SoloPianoBuildOk {
  ok: true;
  body: Record<string, unknown>;
  fieldErrors: [];
}

export interface SoloPianoBuildFail {
  ok: false;
  error: string;
  fieldErrors: PianoFieldError[];
}

export const V11_METRE_OPTIONS = PIANO_V11_METRES.map((meter) => ({
  id: `${meter.numerator}/${meter.denominator}`,
  numerator: meter.numerator,
  denominator: meter.denominator,
  groups: [...meter.groups],
}));

const QUALITIES = new Set<string>(['major', 'minor', 'augmented', 'diminished']);

export function emptyWindowDraft(hand: 'RH' | 'LH', index: number): WindowDraft {
  return {
    id: `window-${index + 1}`,
    bar: '1',
    offsetN: '0',
    offsetD: '1',
    extentN: '1',
    extentD: '1',
    hand,
    subdivision: 'straight-eighths',
    rests: '',
    material: 'parent-repeated',
    against: '',
  };
}

export function emptyPolychordDraft(): PolychordDraft {
  return {
    startBar: '1',
    endBar: '1',
    upperRoot: 'C',
    upperQuality: 'major',
    lowerRoot: 'D',
    lowerQuality: 'minor',
  };
}

function groupsText(groups: readonly number[]): string {
  return groups.join(',');
}

function meterRowFromPlan(row: PianoMeterBarPlan): MeterDraftRow {
  return {
    bar: String(row.bar),
    numerator: String(row.numerator),
    denominator: String(row.denominator),
    groups: groupsText(row.groups),
  };
}

function windowDraft(window: PianoPublicRhythmicWindow): WindowDraft {
  return {
    id: window.id,
    bar: String(window.bar),
    offsetN: String(window.offset.n),
    offsetD: String(window.offset.d),
    extentN: String(window.extent.n),
    extentD: String(window.extent.d),
    hand: window.hand,
    subdivision: window.subdivision,
    rests: window.rests ? window.rests.map((flag) => (flag ? 'true' : 'false')).join(',') : '',
    material: window.material,
    against: window.against?.subdivision ?? '',
  };
}

function regionDraft(region: PianoPolychordRegion): PolychordDraft {
  return {
    startBar: String(region.startBar),
    endBar: String(region.endBar),
    upperRoot: region.polychord.upper.root,
    upperQuality: region.polychord.upper.quality,
    lowerRoot: region.polychord.lower.root,
    lowerQuality: region.polychord.lower.quality,
  };
}

export function cycleMeterRows(bars: number): MeterDraftRow[] {
  return Array.from({ length: bars }, (_, index) => {
    const meter = PIANO_V11_METRES[index % PIANO_V11_METRES.length]!;
    return meterRowFromPlan({
      bar: index + 1,
      numerator: meter.numerator,
      denominator: meter.denominator,
      groups: [...meter.groups],
    });
  });
}

export function uniformMeterRows(bars: number, meterId: string): MeterDraftRow[] {
  const meter = V11_METRE_OPTIONS.find((item) => item.id === meterId) ?? V11_METRE_OPTIONS[0]!;
  return Array.from({ length: bars }, (_, index) => meterRowFromPlan({
    bar: index + 1,
    numerator: meter.numerator,
    denominator: meter.denominator,
    groups: [...meter.groups],
  }));
}

export function acceptanceRegionDrafts(): PolychordDraft[] {
  return fullV11DemonstrationBody().polychords.map(regionDraft);
}

export function defaultV11Fields(bars: BarCount): Pick<SoloPianoFormState, 'phraseDevelopment' | 'polychordMode' | 'upperRoot' | 'upperQuality' | 'lowerRoot' | 'lowerQuality' | 'meterMode' | 'uniformMeter' | 'polyrhythm' | 'useExplicitWindows' | 'meterRows' | 'windows' | 'polychordRegions'> {
  return {
    phraseDevelopment: 'off',
    polychordMode: 'off',
    upperRoot: 'C',
    upperQuality: 'major',
    lowerRoot: 'D',
    lowerQuality: 'minor',
    meterMode: 'legacy',
    uniformMeter: '4/4',
    polyrhythm: 'off',
    useExplicitWindows: false,
    meterRows: cycleMeterRows(bars),
    windows: [],
    polychordRegions: acceptanceRegionDrafts(),
  };
}

export function applyFullV11Demonstration(current: SoloPianoFormState): SoloPianoFormState {
  const body = fullV11DemonstrationBody();
  return {
    ...current,
    piece: 'general',
    seed: 76018,
    innerVoice: current.innerVoice,
    bars: 24,
    tempo: 48,
    tonalCentre: 'C',
    harmony: canonicalStageBHarmony(24),
    advanced: true,
    phraseDevelopment: 'on',
    polychordMode: 'acceptance',
    upperRoot: 'C',
    upperQuality: 'major',
    lowerRoot: 'D',
    lowerQuality: 'minor',
    meterMode: 'cycle',
    uniformMeter: '4/4',
    polyrhythm: 'off',
    useExplicitWindows: true,
    meterRows: body.meterPlan.map(meterRowFromPlan),
    windows: body.rhythmicWindows.map(windowDraft),
    polychordRegions: body.polychords.map(regionDraft),
  };
}

function integerToken(text: string): number | string {
  const trimmed = text.trim();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function restTokens(text: string): unknown[] | undefined {
  if (text.trim() === '') return undefined;
  return text.split(',').map((part) => {
    const token = part.trim();
    if (token === 'true') return true;
    if (token === 'false') return false;
    return token;
  });
}

function meterPayload(rows: readonly MeterDraftRow[]): unknown[] {
  return rows.map((row) => ({
    bar: integerToken(row.bar),
    numerator: integerToken(row.numerator),
    denominator: integerToken(row.denominator),
    groups: row.groups.split(',').map((part) => integerToken(part)).filter((part) => part !== ''),
  }));
}

function windowPayload(rows: readonly WindowDraft[]): unknown[] {
  return rows.map((row) => {
    const rests = restTokens(row.rests);
    const against = row.against.trim();
    return {
      id: row.id,
      bar: integerToken(row.bar),
      offset: { n: integerToken(row.offsetN), d: integerToken(row.offsetD) },
      extent: { n: integerToken(row.extentN), d: integerToken(row.extentD) },
      hand: row.hand,
      subdivision: row.subdivision,
      material: row.material,
      ...(rests ? { rests } : {}),
      ...(against ? { against: { subdivision: against } } : {}),
    };
  });
}

function regionPayload(rows: readonly PolychordDraft[]): unknown[] {
  return rows.map((row) => ({
    startBar: integerToken(row.startBar),
    endBar: integerToken(row.endBar),
    polychord: {
      upper: { root: row.upperRoot.trim(), quality: row.upperQuality },
      lower: { root: row.lowerRoot.trim(), quality: row.lowerQuality },
      assignment: { upper: 'RH', lower: 'LH' },
    },
  }));
}

export function pianoV11Payload(form: SoloPianoFormState): Record<string, unknown> {
  const polychords = form.polychordMode === 'single'
    ? regionPayload([{
      startBar: '1',
      endBar: String(form.bars),
      upperRoot: form.upperRoot,
      upperQuality: form.upperQuality,
      lowerRoot: form.lowerRoot,
      lowerQuality: form.lowerQuality,
    }])
    : form.polychordMode === 'acceptance'
      ? regionPayload(form.polychordRegions)
      : undefined;
  const meterPlan = form.meterMode === 'legacy' ? undefined : meterPayload(form.meterRows);
  const rhythmicWindows = form.useExplicitWindows ? windowPayload(form.windows) : undefined;
  return {
    phraseDevelopment: form.phraseDevelopment === 'on',
    ...(polychords ? { polychords } : {}),
    ...(meterPlan ? { meterPlan } : {}),
    ...(rhythmicWindows ? { rhythmicWindows } : {}),
    polyrhythm: form.polyrhythm,
  };
}

function fail(errors: PianoFieldError[]): SoloPianoBuildFail {
  return {
    ok: false,
    error: errors.map((item) => `${item.field}: ${item.message}`).join('; '),
    fieldErrors: errors,
  };
}

export function buildSoloPianoComposeBody(form: SoloPianoFormState): SoloPianoBuildOk | SoloPianoBuildFail {
  if (!Number.isInteger(form.seed)) {
    return fail([{ field: 'seed', message: 'must be an integer' }]);
  }
  if (form.piece !== 'general') {
    const body: Record<string, unknown> = {
      pianoCompositionV1: true,
      seed: form.seed,
      innerVoice: form.innerVoice,
    };
    if (form.piece === 'coffee-run') body.filmCue = 'coffee-run-variation';
    return { ok: true, body, fieldErrors: [] };
  }
  if (!Number.isInteger(form.tempo)) {
    return fail([{ field: 'tempo', message: 'must be an integer' }]);
  }
  const body: Record<string, unknown> = {
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: form.seed,
    bars: form.bars,
    tempo: form.tempo,
    tonalCentre: form.tonalCentre,
    harmony: form.harmony.map((symbol) => symbol.trim()),
  };
  if (!form.advanced) {
    body.metre = '4/4';
    return { ok: true, body, fieldErrors: [] };
  }
  const errors: PianoFieldError[] = [];
  if (form.meterMode === 'cycle' && form.bars !== 24) {
    errors.push({ field: 'pianoV11.meterPlan', message: 'The six-metre cycle needs 24 bars.' });
  }
  if (form.polychordMode === 'acceptance' && form.bars !== 24) {
    errors.push({ field: 'pianoV11.polychords', message: 'Acceptance polychord regions need 24 bars.' });
  }
  const pianoV11 = pianoV11Payload(form);
  if (errors.length > 0) return fail(errors);
  const resolved = resolvePianoV11(pianoV11, form.bars);
  if ('error' in resolved) return fail(resolved.fieldErrors);
  body.pianoV11 = pianoV11;
  return { ok: true, body, fieldErrors: [] };
}

export function formRequestIdentity(form: SoloPianoFormState): string {
  const built = buildSoloPianoComposeBody(form);
  if (built.ok) return requestFingerprint(built.body);
  return `invalid:${requestFingerprint({ errors: built.fieldErrors.map((item) => `${item.field}: ${item.message}`) })}`;
}

export function canonicalDemonstrationRequest(): Record<string, unknown> {
  return {
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: 76018,
    bars: 24,
    tempo: 48,
    tonalCentre: 'C',
    harmony: canonicalStageBHarmony(24),
    pianoV11: fullV11DemonstrationBody(),
  };
}

export function meterRowStatus(row: MeterDraftRow, rows: readonly MeterDraftRow[]): string {
  const bar = integerToken(row.bar);
  if (typeof bar !== 'number') return 'Bar number is invalid.';
  if (rows.filter((item) => integerToken(item.bar) === bar).length > 1) return `Bar ${bar} is duplicated.`;
  const numerator = integerToken(row.numerator);
  const denominator = integerToken(row.denominator);
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || numerator <= 0 || denominator <= 0) {
    return 'Time signature is invalid.';
  }
  if (!meterSupported(numerator, denominator)) return `Unsupported metre ${numerator}/${denominator}.`;
  const groups = row.groups.split(',').map((part) => integerToken(part)).filter((part) => part !== '');
  if (groups.length === 0 || groups.some((group) => typeof group !== 'number' || group <= 0)) {
    return 'Beat grouping is invalid.';
  }
  const sum = groups.reduce<number>((total, group) => total + (group as number), 0);
  if (sum !== numerator) return `Grouping ${groups.join('+')} does not equal ${numerator}.`;
  return 'Valid.';
}

export function windowContinuationText(form: SoloPianoFormState, index: number): string {
  const payload = windowPayload(form.windows)[index];
  const meter = meterPayload(form.meterRows);
  const messages = validatePianoMeterPlan(meter as PianoMeterBarPlan[], form.bars);
  if (messages.length > 0) return 'Metre plan is invalid, so continuation is unknown.';
  const parsed = payload as PianoPublicRhythmicWindow;
  if (!parsed || typeof parsed.bar !== 'number' || typeof parsed.offset?.n !== 'number' || typeof parsed.extent?.n !== 'number') {
    return 'Window timing is invalid.';
  }
  try {
    return windowContinuation(buildPianoTimeline(meter as PianoMeterBarPlan[]), parsed);
  } catch {
    return 'Window timing is invalid.';
  }
}

export function sourceChordContext(harmony: readonly string[], region: PolychordDraft): string {
  const start = integerToken(region.startBar);
  const end = integerToken(region.endBar);
  if (typeof start !== 'number' || typeof end !== 'number' || start > end) return 'Source chord context is unavailable.';
  const names: string[] = [];
  for (let bar = start; bar <= end; bar += 1) {
    const symbol = harmony[bar - 1];
    names.push(`bar ${bar} ${symbol && symbol.trim() ? symbol.trim() : 'missing'}`);
  }
  return names.join(', ');
}

export function parentMemberText(root: string, quality: string): string {
  if (!QUALITIES.has(quality)) return 'Quality is invalid.';
  return parentMemberLetters(root.trim(), quality as PianoTriadQuality) ?? 'Root spelling is invalid.';
}

export function phraseRegions() {
  return phraseRegionSummary();
}

export interface SoloPianoConfigFile {
  kind: typeof SOLO_PIANO_CONFIG_KIND;
  version: typeof SOLO_PIANO_CONFIG_VERSION;
  form: SoloPianoFormState;
}

function isBarCount(value: unknown): value is BarCount {
  return value === 8 || value === 16 || value === 24;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMeterRow(value: unknown): value is MeterDraftRow {
  if (!isRecord(value)) return false;
  return typeof value.bar === 'string'
    && typeof value.numerator === 'string'
    && typeof value.denominator === 'string'
    && typeof value.groups === 'string';
}

function isWindowRow(value: unknown): value is WindowDraft {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.bar === 'string'
    && typeof value.offsetN === 'string'
    && typeof value.offsetD === 'string'
    && typeof value.extentN === 'string'
    && typeof value.extentD === 'string'
    && (value.hand === 'RH' || value.hand === 'LH')
    && typeof value.subdivision === 'string'
    && typeof value.rests === 'string'
    && typeof value.material === 'string'
    && typeof value.against === 'string';
}

function isRegionRow(value: unknown): value is PolychordDraft {
  if (!isRecord(value)) return false;
  return typeof value.startBar === 'string'
    && typeof value.endBar === 'string'
    && typeof value.upperRoot === 'string'
    && typeof value.upperQuality === 'string'
    && typeof value.lowerRoot === 'string'
    && typeof value.lowerQuality === 'string';
}

function isForm(value: unknown): value is SoloPianoFormState {
  if (!isRecord(value)) return false;
  const form = value as unknown as SoloPianoFormState;
  return (form.piece === 'fixture' || form.piece === 'coffee-run' || form.piece === 'general')
    && typeof form.seed === 'number'
    && typeof form.innerVoice === 'boolean'
    && isBarCount(form.bars)
    && typeof form.tempo === 'number'
    && (form.tonalCentre === 'C' || form.tonalCentre === 'Am')
    && Array.isArray(form.harmony)
    && form.harmony.every((symbol) => typeof symbol === 'string')
    && typeof form.advanced === 'boolean'
    && (form.phraseDevelopment === 'off' || form.phraseDevelopment === 'on')
    && (form.polychordMode === 'off' || form.polychordMode === 'acceptance' || form.polychordMode === 'single')
    && typeof form.upperRoot === 'string'
    && QUALITIES.has(form.upperQuality)
    && typeof form.lowerRoot === 'string'
    && QUALITIES.has(form.lowerQuality)
    && (form.meterMode === 'legacy' || form.meterMode === 'uniform' || form.meterMode === 'cycle')
    && typeof form.uniformMeter === 'string'
    && (form.polyrhythm === 'off' || form.polyrhythm === '3:2' || form.polyrhythm === '5:4' || form.polyrhythm === 'both')
    && typeof form.useExplicitWindows === 'boolean'
    && Array.isArray(form.meterRows)
    && form.meterRows.every(isMeterRow)
    && Array.isArray(form.windows)
    && form.windows.every(isWindowRow)
    && Array.isArray(form.polychordRegions)
    && form.polychordRegions.every(isRegionRow);
}

export function serializeSoloPianoConfig(form: SoloPianoFormState): string {
  const file: SoloPianoConfigFile = { kind: SOLO_PIANO_CONFIG_KIND, version: SOLO_PIANO_CONFIG_VERSION, form };
  return JSON.stringify(file, null, 2);
}

export function parseSoloPianoConfig(text: string): { ok: true; form: SoloPianoFormState } | { ok: false; error: string; fieldErrors: PianoFieldError[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail([{ field: 'soloPianoConfig', message: 'is not valid JSON' }]);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail([{ field: 'soloPianoConfig', message: 'must be an object' }]);
  }
  const file = parsed as { kind?: unknown; version?: unknown; form?: unknown };
  if (file.kind !== SOLO_PIANO_CONFIG_KIND) {
    return fail([{ field: 'soloPianoConfig.kind', message: `must be ${SOLO_PIANO_CONFIG_KIND}` }]);
  }
  if (file.version !== SOLO_PIANO_CONFIG_VERSION) {
    return fail([{ field: 'soloPianoConfig.version', message: `must be ${SOLO_PIANO_CONFIG_VERSION}` }]);
  }
  if (!isForm(file.form)) {
    return fail([{ field: 'soloPianoConfig.form', message: 'is missing a complete editable piano configuration' }]);
  }
  if (file.form.harmony.length !== file.form.bars) {
    return fail([{ field: 'harmony', message: `needs ${file.form.bars} chord symbols and has ${file.form.harmony.length}` }]);
  }
  return { ok: true, form: file.form };
}
