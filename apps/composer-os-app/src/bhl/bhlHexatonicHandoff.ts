export const BHL_HEXATONIC_HANDOFF_KEY = 'bhl-hexatonic-handoff';
export const EVALUATION_HANDOFF_KEY = 'evaluation-score-handoff';

export interface BhlHexatonicHandoff {
  family: 'scalar' | 'wps' | 'provisional';
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

export function storeHexatonicHandoff(value: BhlHexatonicHandoff): void {
  sessionStorage.setItem(BHL_HEXATONIC_HANDOFF_KEY, JSON.stringify(value));
}

export function takeHexatonicHandoff(): BhlHexatonicHandoff | null {
  const raw = sessionStorage.getItem(BHL_HEXATONIC_HANDOFF_KEY);
  sessionStorage.removeItem(BHL_HEXATONIC_HANDOFF_KEY);
  if (!raw) return heldHexatonic;
  const parsed = JSON.parse(raw) as BhlHexatonicHandoff;
  if (parsed.family !== 'scalar' && parsed.family !== 'wps' && parsed.family !== 'provisional') return null;
  if (typeof parsed.id !== 'string' || !Number.isInteger(parsed.referencePc)) return null;
  return rememberHexatonic(parsed);
}

export function storeEvaluationHandoff(value: EvaluationHandoff): void {
  sessionStorage.setItem(EVALUATION_HANDOFF_KEY, JSON.stringify(value));
}

export function takeEvaluationHandoff(): EvaluationHandoff | null {
  const raw = sessionStorage.getItem(EVALUATION_HANDOFF_KEY);
  sessionStorage.removeItem(EVALUATION_HANDOFF_KEY);
  if (!raw) return heldEvaluation;
  const parsed = JSON.parse(raw) as EvaluationHandoff;
  if (typeof parsed.xml !== 'string' || !parsed.xml.trim()) return null;
  return rememberEvaluation(parsed);
}
