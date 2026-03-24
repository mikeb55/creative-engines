/**
 * Composer OS V2 — Instrument behaviour types
 */

import type { MidiPitch } from '../primitives/primitiveTypes';

export type GuitarTexture = 'melody' | 'dyad' | 'triad' | 'four_note';

export interface GuitarBehaviourPlan {
  instrumentIdentity: 'clean_electric_guitar';
  perBar: Array<{
    bar: number;
    textureMix: Array<{ type: GuitarTexture; weight: number }>;
    eventCount: number;
    sustainRatio: number;
    registerTarget: [MidiPitch, MidiPitch];
  }>;
}

export type BassActivity = 'anchored' | 'walking' | 'sparse';

export interface BassBehaviourPlan {
  instrumentIdentity: 'acoustic_upright_bass';
  perBar: Array<{
    bar: number;
    activity: BassActivity;
    eventCount: number;
    harmonicAnchor: boolean;
    registerTarget: [MidiPitch, MidiPitch];
  }>;
}
