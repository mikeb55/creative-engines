/**
 * Composer OS V3.4 Stage C app API.
 * Orchestrate stays off unless the request sets enabled.
 */

import { orchestrate, type OrchestrateResult } from '../core/orchestrate/orchestrate';
import type { EnsembleTemplateId, OrchestrateRequest, SectionColourPlan } from '../core/orchestrate/types';

const TEMPLATES: readonly EnsembleTemplateId[] = ['string_quartet', 'pierrot', 'wind_quintet', 'chamber_orchestra'];

function isPlan(value: unknown): value is SectionColourPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as SectionColourPlan;
  return typeof plan.section === 'string'
    && typeof plan.startBar === 'number'
    && typeof plan.endBar === 'number'
    && typeof plan.registerCentre === 'number'
    && Array.isArray(plan.melodyCarriers)
    && (plan.density === 'sparse' || plan.density === 'medium' || plan.density === 'dense' || plan.density === 'very_dense');
}

export function apiOrchestrate(body: unknown): OrchestrateResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Orchestrate is off.' };
  const request = body as Partial<OrchestrateRequest>;
  if (request.enabled !== true) return { ok: false, error: 'Orchestrate is off.' };
  if (request.preserveMelody !== true) return { ok: false, error: 'Melody preservation is required.' };
  if (typeof request.sourceMusicXml !== 'string' || !request.sourceMusicXml.trim()) {
    return { ok: false, error: 'Orchestrate needs source MusicXML.' };
  }
  if (!TEMPLATES.includes(request.template as EnsembleTemplateId)) {
    return { ok: false, error: 'Unknown ensemble template.' };
  }
  if (!Array.isArray(request.plan) || request.plan.length === 0 || !request.plan.every(isPlan)) {
    return { ok: false, error: 'Orchestrate needs a section colour plan.' };
  }
  if (typeof request.seed !== 'number' || !Number.isFinite(request.seed)) {
    return { ok: false, error: 'Orchestrate needs a numeric seed.' };
  }
  return orchestrate({
    enabled: true,
    sourceMusicXml: request.sourceMusicXml,
    template: request.template as EnsembleTemplateId,
    plan: request.plan,
    seed: request.seed,
    preserveMelody: true,
  });
}
