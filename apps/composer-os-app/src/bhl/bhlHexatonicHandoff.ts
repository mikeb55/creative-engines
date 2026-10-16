export const BHL_HEXATONIC_HANDOFF_KEY = 'bhl-hexatonic-handoff';
export const EVALUATION_HANDOFF_KEY = 'evaluation-score-handoff';

export interface BhlHexatonicHandoff {
  family: 'scalar' | 'wps' | 'provisional' | 'advanced';
  id: string;
  referencePc: number;
}

export interface EvaluationHandoff {
  label: string;
  xml: string;
  fieldLabel: string;
  fieldFamily: string;
  fieldPcs: string;
  provisional: boolean;
  status: string;
}

/** Survives React StrictMode’s mount → cleanup → mount so the second read still sees the payload. */
let heldHexatonic: BhlHexatonicHandoff | null = null;
let heldEvaluation: EvaluationHandoff | null = null;

function rememberHexatonic(value: BhlHexatonicHandoff): BhlHexatonicHandoff {
  heldHexatonic = value;
  queueMicrotask(() => {
    if (heldHexatonic === value) heldHexatonic = null;
  });
  return value;
}

function rememberEvaluation(value: EvaluationHandoff): EvaluationHandoff {
  heldEvaluation = value;
  queueMicrotask(() => {
    if (heldEvaluation === value) heldEvaluation = null;
  });
  return value;
}

/** Node vitest and non-browser hosts have no sessionStorage. Browser and jsdom still use it. */
function handoffStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

export function storeHexatonicHandoff(value: BhlHexatonicHandoff): void {
  handoffStorage()?.setItem(BHL_HEXATONIC_HANDOFF_KEY, JSON.stringify(value));
}

export function takeHexatonicHandoff(): BhlHexatonicHandoff | null {
  const storage = handoffStorage();
  const raw = storage?.getItem(BHL_HEXATONIC_HANDOFF_KEY) ?? null;
  storage?.removeItem(BHL_HEXATONIC_HANDOFF_KEY);
  if (!raw) return heldHexatonic;
  const parsed = JSON.parse(raw) as BhlHexatonicHandoff;
  if (parsed.family !== 'scalar' && parsed.family !== 'wps' && parsed.family !== 'provisional' && parsed.family !== 'advanced') return null;
  if (typeof parsed.id !== 'string' || !Number.isInteger(parsed.referencePc)) return null;
  return rememberHexatonic(parsed);
}

export function storeEvaluationHandoff(value: EvaluationHandoff): void {
  handoffStorage()?.setItem(EVALUATION_HANDOFF_KEY, JSON.stringify(value));
}

export function takeEvaluationHandoff(): EvaluationHandoff | null {
  const storage = handoffStorage();
  const raw = storage?.getItem(EVALUATION_HANDOFF_KEY) ?? null;
  storage?.removeItem(EVALUATION_HANDOFF_KEY);
  if (!raw) return heldEvaluation;
  const parsed = JSON.parse(raw) as EvaluationHandoff;
  if (typeof parsed.xml !== 'string' || !parsed.xml.trim()) return null;
  return rememberEvaluation(parsed);
}
