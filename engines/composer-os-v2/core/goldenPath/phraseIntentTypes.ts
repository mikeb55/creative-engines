/** Duo golden-path bar-level phrase roles — shared without importing `guitarPhraseAuthority` (breaks cycles). */
export type PhraseIntent =
  | 'guitar_lead'
  | 'bass_lead'
  | 'answer_guitar'
  | 'answer_bass'
  | 'cadence'
  | 'development'
  | 'contrast'
  | 'return';
