/**
 * Phase 4+5 — attach form arc, tension envelope, and RhythmDNA binding after HarmonicScene bundle wiring.
 */

import type { CompositionContext } from '../compositionContext';
import { buildThemeGenome } from '../motif/themeGenomeBuilder';
import { buildFormSections } from './formController';
import { computeRhythmMotifBinding } from './rhythmDnaMotifBinder';
import { applyTensionScheduleToContext } from './tensionScheduler';

export function attachFormPlanRhythmAndTension(context: CompositionContext, seed: number): void {
  const vb = context.voiceBundle;
  if (!vb) return;

  context.formSections = buildFormSections(context.form, vb);
  applyTensionScheduleToContext(context, context.form.totalBars);

  const hv = context.generationMetadata.harmonicVoice ?? vb.voiceId;
  const tg = buildThemeGenome(hv, seed, undefined, vb);
  context.generationMetadata = {
    ...context.generationMetadata,
    rhythmMotifBinding: computeRhythmMotifBinding(tg.id, tg.primaryCell, vb, false),
  };
}
