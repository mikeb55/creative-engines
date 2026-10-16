import { CHROMATIC_MASK_COUNT, getScaleExplorerEntry, type ScaleRegistration, type ScaleRegistryId } from './scaleExplorer';
import { transposeMask } from './scaleGlossary';

export const PRACTICE_HANDOFF_KEY = 'practice-studio-handoff';

export type PracticeHandoffSource = 'generate' | 'bhl' | 'hexatonic' | 'pentatonic';

export interface PracticeHandoff {
  source: PracticeHandoffSource;
  label: string;
  musicXml: string | null;
  collectionId: string | null;
  registry: ScaleRegistryId | null;
  referencePc: number | null;
  status: string | null;
  seed: number | null;
  mask: number | null;
  tuningId: string | null;
}

export type PracticeHandoffResult = { ok: true; handoff: PracticeHandoff } | { ok: false; error: string };

const SOURCES = new Set<PracticeHandoffSource>(['generate', 'bhl', 'hexatonic', 'pentatonic']);

let held: PracticeHandoff | null = null;

function remember(value: PracticeHandoff): PracticeHandoff {
  held = value;
  queueMicrotask(() => {
    if (held === value) held = null;
  });
  return value;
}

function handoffStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

function isSource(value: unknown): value is PracticeHandoffSource {
  return typeof value === 'string' && SOURCES.has(value as PracticeHandoffSource);
}

function isMusicXml(value: string): boolean {
  return value.includes('<score-partwise') || value.includes('<score-timewise');
}

export function findPracticeRegistration(
  registry: ScaleRegistryId,
  id: string,
): { mask: number; registration: ScaleRegistration } | null {
  for (let mask = 0; mask < CHROMATIC_MASK_COUNT; mask += 1) {
    const entry = getScaleExplorerEntry(mask);
    const registration = entry.registrations.find((row) => row.registry === registry && row.id === id);
    if (registration) return { mask, registration };
  }
  return null;
}

export function validatePracticeHandoff(input: unknown): PracticeHandoffResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Practice handoff is empty.' };
  const raw = input as Partial<PracticeHandoff>;
  if (!isSource(raw.source)) {
    return { ok: false, error: `Unsupported practice source${raw.source ? `: ${String(raw.source)}` : ''}.` };
  }
  if (typeof raw.label !== 'string' || !raw.label.trim()) {
    return { ok: false, error: 'Practice handoff needs a label.' };
  }
  const musicXml = raw.musicXml == null || raw.musicXml === '' ? null : raw.musicXml;
  if (musicXml !== null && typeof musicXml !== 'string') {
    return { ok: false, error: 'Practice handoff score must be MusicXML text.' };
  }
  if (typeof musicXml === 'string' && !isMusicXml(musicXml)) {
    return { ok: false, error: 'Practice handoff does not open composition files. Pass MusicXML text.' };
  }
  const collectionId = raw.collectionId ?? null;
  const registry = raw.registry ?? null;
  if ((collectionId == null) !== (registry == null)) {
    return { ok: false, error: 'Practice collection needs both a registry and an id.' };
  }
  if (raw.source === 'generate' && !musicXml) {
    return { ok: false, error: 'Generate handoff needs a MusicXML score.' };
  }
  if (raw.source === 'bhl' && !musicXml) {
    return { ok: false, error: 'BHL handoff needs the candidate MusicXML.' };
  }
  if ((raw.source === 'hexatonic' || raw.source === 'pentatonic') && !collectionId && raw.mask == null) {
    return { ok: false, error: `${raw.source} handoff needs a collection or a pitch-class mask.` };
  }
  let referencePc: number | null = raw.referencePc ?? null;
  if (referencePc !== null && (!Number.isInteger(referencePc) || referencePc < 0 || referencePc > 11)) {
    return { ok: false, error: 'Practice reference note must be a pitch class 0–11.' };
  }
  let mask = raw.mask ?? null;
  let status = raw.status === undefined ? null : raw.status;
  if (mask !== null && (!Number.isInteger(mask) || mask < 0 || mask >= CHROMATIC_MASK_COUNT)) {
    return { ok: false, error: 'Practice pitch-class mask is out of range.' };
  }
  if (registry && collectionId) {
    const found = findPracticeRegistration(registry, collectionId);
    if (!found) return { ok: false, error: `Unknown practice collection ${registry} ${collectionId}.` };
    const shifted = transposeMask(found.mask, referencePc ?? 0);
    if (mask !== null && mask !== shifted) {
      return { ok: false, error: 'Pitch-class set does not match the collection.' };
    }
    mask = shifted;
    if (status !== null && status !== found.registration.status) {
      return { ok: false, error: 'Status does not match the collection.' };
    }
    status = found.registration.status;
  }
  if (raw.seed != null && !Number.isInteger(raw.seed)) {
    return { ok: false, error: 'Practice seed must be an integer.' };
  }
  const tuningId = raw.tuningId ?? null;
  if (tuningId !== null && typeof tuningId !== 'string') {
    return { ok: false, error: 'Practice tuning id must be text.' };
  }
  const handoff: PracticeHandoff = {
    source: raw.source,
    label: raw.label.trim(),
    musicXml,
    collectionId,
    registry,
    referencePc,
    status,
    seed: raw.seed ?? null,
    mask,
    tuningId,
  };
  return { ok: true, handoff };
}

export function storePracticeHandoff(input: PracticeHandoff): PracticeHandoffResult {
  const checked = validatePracticeHandoff(input);
  if (!checked.ok) return checked;
  const copy = JSON.parse(JSON.stringify(checked.handoff)) as PracticeHandoff;
  handoffStorage()?.setItem(PRACTICE_HANDOFF_KEY, JSON.stringify(copy));
  remember(copy);
  return { ok: true, handoff: copy };
}

export function takePracticeHandoff(): PracticeHandoffResult | null {
  const storage = handoffStorage();
  const raw = storage?.getItem(PRACTICE_HANDOFF_KEY) ?? null;
  storage?.removeItem(PRACTICE_HANDOFF_KEY);
  if (!raw) return held ? { ok: true, handoff: held } : null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Practice handoff could not be read.' };
  }
  const checked = validatePracticeHandoff(parsed);
  if (!checked.ok) return checked;
  return { ok: true, handoff: remember(checked.handoff) };
}
