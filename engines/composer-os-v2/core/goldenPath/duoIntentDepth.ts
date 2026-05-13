import type { CompositionContext } from '../compositionContext';
import type { ChordEvent, NoteEvent, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';

export type ProductDuoIntent = 'conversational' | 'supportive';
export type MidiRegisterBand = readonly [number, number];

export interface DuoIntentRegisterOwnershipPlan {
  intent: ProductDuoIntent;
  guitarMelody: MidiRegisterBand;
  guitarComp: MidiRegisterBand;
  bassFoundation: MidiRegisterBand;
  bassResponse: MidiRegisterBand;
  receipt: string;
}

export interface DuoIntentVelocityBalanceReceipt {
  intent: ProductDuoIntent;
  guitarMeanBefore: number;
  guitarMeanAfter: number;
  bassMeanBefore: number;
  bassMeanAfter: number;
  accompanimentDelta: number;
  receipt: string;
}

function clampMidi(value: number, [low, high]: MidiRegisterBand): number {
  return Math.max(low, Math.min(high, value));
}

function clampVelocity(value: number): number {
  return Math.max(1, Math.min(127, Math.round(value)));
}

export function resolveProductDuoIntent(context: CompositionContext): ProductDuoIntent | undefined {
  const intent = context.generationMetadata?.duoIntent;
  return intent === 'conversational' || intent === 'supportive' ? intent : undefined;
}

export function resolveDuoIntentRegisterOwnershipPlan(
  intent: ProductDuoIntent | undefined
): DuoIntentRegisterOwnershipPlan | undefined {
  if (intent === 'conversational') {
    return {
      intent,
      guitarMelody: [58, 76],
      guitarComp: [50, 67],
      bassFoundation: [36, 50],
      bassResponse: [43, 57],
      receipt: 'duoIntentRegisterOwnership:conversational:guitar=mid-high,bass=low-response',
    };
  }
  if (intent === 'supportive') {
    return {
      intent,
      guitarMelody: [62, 79],
      guitarComp: [48, 64],
      bassFoundation: [35, 48],
      bassResponse: [40, 52],
      receipt: 'duoIntentRegisterOwnership:supportive:guitar=upper-lead,bass=low-foundation',
    };
  }
  return undefined;
}

function clampGuitarEventRegister(event: ScoreEvent, plan: DuoIntentRegisterOwnershipPlan): void {
  if (event.kind === 'note') {
    const n = event as NoteEvent;
    const band = (n.voice ?? 1) === 1 ? plan.guitarMelody : plan.guitarComp;
    n.pitch = clampMidi(n.pitch, band);
    if (n.pitches?.length) n.pitches = n.pitches.map((pitch) => clampMidi(pitch, band));
  } else if (event.kind === 'chord') {
    const ch = event as ChordEvent;
    ch.pitches = ch.pitches.map((pitch) => clampMidi(pitch, plan.guitarComp));
  }
}

function clampBassEventRegister(event: ScoreEvent, plan: DuoIntentRegisterOwnershipPlan): void {
  if (event.kind !== 'note') return;
  const n = event as NoteEvent;
  const band = plan.intent === 'conversational' && n.startBeat > 0.01 ? plan.bassResponse : plan.bassFoundation;
  n.pitch = clampMidi(n.pitch, band);
  if (n.pitches?.length) n.pitches = n.pitches.map((pitch) => clampMidi(pitch, band));
}

export function applyDuoIntentRegisterOwnership(
  score: ScoreModel,
  context: CompositionContext
): DuoIntentRegisterOwnershipPlan | undefined {
  const plan = resolveDuoIntentRegisterOwnershipPlan(resolveProductDuoIntent(context));
  if (!plan) return undefined;

  const guitar = score.parts.find((part) => part.id === 'guitar' || part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.id === 'bass' || part.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return undefined;

  for (const measure of guitar.measures) {
    for (const event of measure.events) clampGuitarEventRegister(event, plan);
  }
  for (const measure of bass.measures) {
    for (const event of measure.events) clampBassEventRegister(event, plan);
  }

  context.generationMetadata = {
    ...context.generationMetadata,
    duoIntentRegisterOwnershipPlan: {
      intent: plan.intent,
      guitarMelody: [...plan.guitarMelody],
      guitarComp: [...plan.guitarComp],
      bassFoundation: [...plan.bassFoundation],
      bassResponse: [...plan.bassResponse],
      receipt: plan.receipt,
    },
  };
  return plan;
}

export function meanNoteVelocity(part: PartModel | undefined): number {
  if (!part) return 0;
  const velocities: number[] = [];
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind === 'note') velocities.push((event as NoteEvent).velocity ?? 80);
    }
  }
  if (velocities.length === 0) return 0;
  return velocities.reduce((sum, value) => sum + value, 0) / velocities.length;
}

function applyVelocityDelta(part: PartModel, deltaForNote: (note: NoteEvent) => number): void {
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const note = event as NoteEvent;
      note.velocity = clampVelocity((note.velocity ?? 80) + deltaForNote(note));
    }
  }
}

export function applyDuoIntentVelocityBalance(
  score: ScoreModel,
  context: CompositionContext
): DuoIntentVelocityBalanceReceipt | undefined {
  const intent = resolveProductDuoIntent(context);
  if (!intent) return undefined;

  const guitar = score.parts.find((part) => part.id === 'guitar' || part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.id === 'bass' || part.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return undefined;

  const guitarMeanBefore = meanNoteVelocity(guitar);
  const bassMeanBefore = meanNoteVelocity(bass);
  const accompanimentDelta = intent === 'conversational' ? -8 : 7;

  applyVelocityDelta(guitar, (note) => ((note.voice ?? 1) === 1 ? (intent === 'supportive' ? 2 : 0) : accompanimentDelta));
  applyVelocityDelta(bass, () => accompanimentDelta);

  const receipt: DuoIntentVelocityBalanceReceipt = {
    intent,
    guitarMeanBefore,
    guitarMeanAfter: meanNoteVelocity(guitar),
    bassMeanBefore,
    bassMeanAfter: meanNoteVelocity(bass),
    accompanimentDelta,
    receipt:
      intent === 'conversational'
        ? 'duoIntentVelocityBalance:conversational:accompaniment=-8'
        : 'duoIntentVelocityBalance:supportive:accompaniment=+7',
  };

  context.generationMetadata = {
    ...context.generationMetadata,
    duoIntentVelocityBalanceReceipt: receipt,
  };
  return receipt;
}
