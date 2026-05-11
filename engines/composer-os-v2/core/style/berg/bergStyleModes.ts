/**
 * Berg historical posture modes — planning discriminant for row modules vs quotation policy.
 */

export type BergStyleMode = 'middle_berg' | 'late_berg';

export interface BergMiddlePosture {
  mode: 'middle_berg';
  /** Free atonality with classical form scaffolds. */
  freeAtonality: true;
  denseCounterpointBias: number;
}

export interface BergLatePosture {
  mode: 'late_berg';
  /** Triadic row segments + tonal quotations allowed as foreign objects when subset of row. */
  triadicRowSegments: true;
  tonalQuotations: true;
  externalQuotationAsForeignObject: true;
}

export type BergStylePosture = BergMiddlePosture | BergLatePosture;
