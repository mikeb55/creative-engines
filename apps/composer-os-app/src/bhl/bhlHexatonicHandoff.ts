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

export function storeHexatonicHandoff(value: BhlHexatonicHandoff): void {
  sessionStorage.setItem(BHL_HEXATONIC_HANDOFF_KEY, JSON.stringify(value));
}

export function takeHexatonicHandoff(): BhlHexatonicHandoff | null {
  const raw = sessionStorage.getItem(BHL_HEXATONIC_HANDOFF_KEY);
  sessionStorage.removeItem(BHL_HEXATONIC_HANDOFF_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as BhlHexatonicHandoff;
  if (parsed.family !== 'scalar' && parsed.family !== 'wps' && parsed.family !== 'provisional') return null;
  if (typeof parsed.id !== 'string' || !Number.isInteger(parsed.referencePc)) return null;
  return parsed;
}

export function storeEvaluationHandoff(value: EvaluationHandoff): void {
  sessionStorage.setItem(EVALUATION_HANDOFF_KEY, JSON.stringify(value));
}

export function takeEvaluationHandoff(): EvaluationHandoff | null {
  const raw = sessionStorage.getItem(EVALUATION_HANDOFF_KEY);
  sessionStorage.removeItem(EVALUATION_HANDOFF_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as EvaluationHandoff;
  if (typeof parsed.xml !== 'string' || !parsed.xml.trim()) return null;
  return parsed;
}
