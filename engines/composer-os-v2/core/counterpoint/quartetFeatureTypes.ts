export type TextureClass =
  | 'chorale'
  | 'homorhythmic'
  | 'polyphonic'
  | 'contrapuntal'
  | 'imitative'
  | 'pedal_plus_lines'
  | 'riff_layered'
  | 'punctuated';

export type MotionProfile =
  | 'mostly_stepwise'
  | 'mixed'
  | 'angular'
  | 'static_outer_active_inner'
  | 'active_outer_static_inner';

export type PhraseCadenceStrength =
  | 'none'
  | 'weak'
  | 'medium'
  | 'strong';

export type SectionRole =
  | 'lead'
  | 'counterline'
  | 'pad'
  | 'punctuation'
  | 'pedal'
  | 'doubling'
  | 'rest';

export type EnsembleSection =
  | 'saxes'
  | 'trumpets'
  | 'trombones'
  | 'rhythm'
  | 'mixed_reeds_brass'
  | 'full_ensemble';

export interface VoiceActivityProfile {
  voiceId: 'S' | 'A' | 'T' | 'B';
  meanNoteDurationBeats: number;
  attackRatePerBar: number;
  restRatio: number;
  leapRatio: number;
  stepRatio: number;
  sustainedRatio: number;
  registerCenterMidi: number;
  registerSpanSemitones: number;
  independenceScore: number;
  salienceScore: number;
}

export interface QuartetFeatures {
  phraseId: string;
  startBeat: number;
  endBeat: number;
  textureClass: TextureClass;
  motionProfile: MotionProfile;
  harmonicRhythmPerBar: number;
  verticalChangeRate: number;
  rhythmicDensity: number;
  syncopationScore: number;
  contrapuntalIndependence: number;
  imitationScore: number;
  homorhythmScore: number;
  chordalStabilityScore: number;
  registralSpreadSemitones: number;
  crossingCount: number;
  convergenceScore: number;
  divergenceScore: number;
  sustainedVoicesCount: number;
  activeVoicesCount: number;
  pedalPresence: boolean;
  pedalVoiceIds: Array<'S' | 'A' | 'T' | 'B'>;
  cadenceStrength: PhraseCadenceStrength;
  arrivalBeatOffsets: number[];
  accentBeats: number[];
  primaryLineVoiceIds: Array<'S' | 'A' | 'T' | 'B'>;
  secondaryLineVoiceIds: Array<'S' | 'A' | 'T' | 'B'>;
  voiceProfiles: VoiceActivityProfile[];
}
