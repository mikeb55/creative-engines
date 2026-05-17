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

export interface SectionAssignment {
  section: EnsembleSection;
  role: SectionRole;
  sourceVoiceIds: Array<'S' | 'A' | 'T' | 'B'>;
  prominence: number;
  lineDerived: boolean;
  maxPlayers?: number;
  octaveTransfer?: 'none' | '8va' | '8vb' | 'double_8va_8vb';
}

export interface DensityPlan {
  simultaneousSections: number;
  targetActiveParts: number;
  allowSectionUnisons: boolean;
  allowPads: boolean;
  allowBackgroundFigures: boolean;
}

export interface AntiCollapsePolicy {
  forbidFullEnsembleChordHits: boolean;
  minIndependentLineCount: number;
  maxConsecutiveHomorhythmicEvents: number;
  requireSourceLineMapping: boolean;
}

export interface SectionWritingIntent {
  phraseId: string;
  startBeat: number;
  endBeat: number;
  textureGoal: TextureClass;
  energyLevel: number;
  transparencyLevel: number;
  motionRetention: number;
  leadSection: EnsembleSection;
  supportSections: EnsembleSection[];
  assignments: SectionAssignment[];
  densityPlan: DensityPlan;
  articulationFamily: 'legato' | 'tenuto' | 'light_marcato' | 'accented' | 'mixed';
  dynamicShape: 'flat' | 'crescendo' | 'decrescendo' | 'swell' | 'arrival_accented';
  harmonicHandling: 'line_implied' | 'selective_reharm' | 'pad_support' | 'punctuation_only';
  vrbProfileId?: string;
  styleProfileId?: string;
  preservePedal: boolean;
  preserveImitation: boolean;
  preserveVoiceIndependence: boolean;
  permitBlockVoicingRelease: boolean;
  antiCollapse: AntiCollapsePolicy;
  notes?: string[];
}
