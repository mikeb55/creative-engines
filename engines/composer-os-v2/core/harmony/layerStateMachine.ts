import type { NoteLayer } from './noteTag';

/** High-level tension arc for liquid harmony (Build B). */
export type TensionState = 'resolve' | 'primary' | 'tension' | 'chaos' | 'recover';

const MAX_CHAOS_SUBDIVISIONS = 16;
/** ~15% deterministic escape from chaos (integer gate < 15 on 0–99). */
const ESCAPE_THRESHOLD = 15;

function beatStrengthOrdinal(b: 'strong' | 'weak' | 'offbeat'): number {
  if (b === 'strong') return 0;
  if (b === 'weak') return 1;
  return 2;
}

/**
 * Phrase-level layer state machine.
 *
 * Rules (implementation contract):
 * - **primary** is the initial / home state.
 * - **tension** is only entered from **primary** (weak beat entry).
 * - **chaos** accumulates a subdivision budget; past budget on a **strong** beat forces **resolve**.
 * - **chaos** may **escape** to **recover** with fixed probability 0.15 (deterministic gate).
 * - **chaos** must exit (recover / resolve) within **2 bars** of eighth-note subdivisions (16 steps).
 * - **recover** holds until the **next strong** beat, then becomes **resolve**.
 * - **resolve** is one subdivision long; the following advance returns to **primary**.
 */
export class LayerStateMachine {
  currentState: TensionState = 'primary';

  /** Subdivisions spent in chaos (eighth-note grid: 8 per bar). */
  private chaosSubdivisions = 0;

  /** Monotonic advance counter for deterministic escape jitter. */
  private advanceCount = 0;

  advance(beatStrength: 'strong' | 'weak' | 'offbeat'): TensionState {
    this.advanceCount++;

    if (this.currentState === 'recover') {
      if (beatStrength === 'strong') {
        this.currentState = 'resolve';
      }
      return this.currentState;
    }

    if (this.currentState === 'resolve') {
      this.currentState = 'primary';
      return this.currentState;
    }

    if (this.currentState === 'chaos') {
      this.chaosSubdivisions++;

      const overBudget = this.chaosSubdivisions >= MAX_CHAOS_SUBDIVISIONS;
      if (beatStrength === 'strong' && overBudget) {
        this.chaosSubdivisions = 0;
        this.currentState = 'resolve';
        return this.currentState;
      }

      if (this.escapeFromChaos(beatStrength)) {
        this.chaosSubdivisions = 0;
        this.currentState = 'recover';
        return this.currentState;
      }

      if (overBudget) {
        this.chaosSubdivisions = 0;
        this.currentState = 'recover';
        return this.currentState;
      }

      return this.currentState;
    }

    if (this.currentState === 'primary') {
      if (beatStrength === 'weak') {
        this.currentState = 'tension';
        return this.currentState;
      }
      if (beatStrength === 'strong') {
        this.currentState = 'resolve';
        return this.currentState;
      }
      return this.currentState;
    }

    if (this.currentState === 'tension') {
      if (beatStrength === 'strong') {
        this.currentState = 'resolve';
        return this.currentState;
      }
      this.currentState = 'chaos';
      this.chaosSubdivisions = 0;
      return this.currentState;
    }

    return this.currentState;
  }

  /** Deterministic ~15% escape: mixed with advanceCount + beat ordinal. */
  private escapeFromChaos(beatStrength: 'strong' | 'weak' | 'offbeat'): boolean {
    const gate =
      (this.chaosSubdivisions * 17 + this.advanceCount * 11 + beatStrengthOrdinal(beatStrength) * 23) %
      100;
    return gate < ESCAPE_THRESHOLD;
  }

  static getAllowedLayers(state: TensionState): NoteLayer[] {
    switch (state) {
      case 'resolve':
        return [0];
      case 'primary':
        return [0, 1];
      case 'tension':
        return [1, 2];
      case 'chaos':
        return [2, 3];
      case 'recover':
        return [0, 1];
      default:
        return [0, 1, 2, 3];
    }
  }
}
