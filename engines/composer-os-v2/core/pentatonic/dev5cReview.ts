/**
 * Dev 5C musical review.
 * Colour resources stay out of the path. Operators stay off the rejected list.
 */

export const DEV5C_PATH_PROMOTIONS: readonly string[] = [];

/**
 * Kept after the nine-track WWH pass.
 * None of these enter path search. Far, low-retention fields stay names for
 * OUTSIDE / REMOTE colour talk. They are not phrase defaults.
 */
export const DEV5C_RETAINED_COLOUR: readonly { id: string; reason: string }[] = [
  { id: 'major_pentatonic', reason: 'Path home. Bright stable field. Quartal fourths are available inside it.' },
  { id: 'minor_pentatonic', reason: 'Path home. Dark stable field. Black Aura and the duo book already use it.' },
  { id: 'suspended_pentatonic', reason: 'Open fourth-and-flat-seven colour. Not selected as the WWH shortlist winner. Kept for suspended colour. Not a path switch.' },
  { id: 'open_pentatonic', reason: 'No third and no seventh. Holds common tones without deciding major or minor.' },
  { id: 'minor_sixth_pentatonic', reason: 'Dark colour when the fifth is too plain. Colour only.' },
  { id: 'mixolydian_pentatonic', reason: 'Bright colour with a flat seventh. Shares tones with major pentatonic.' },
  { id: 'dorian_pentatonic', reason: 'Inside minor colour. High retention. Not promoted, because the path already holds minor pentatonic.' },
  { id: 'aeolian_pentatonic', reason: 'Flat-six dark colour. Missed the coarse WWH shortlist. Kept as a colour name, not a path state.' },
  { id: 'kumoi', reason: 'Soft dark colour. Kept as a colour name. Not a default line.' },
  { id: 'hirajoshi', reason: 'Fragile dark colour. Kept as a colour name. Not a default line.' },
  { id: 'insen', reason: 'Not selected on the nine WWH probes. Kept so an EDGE label with a flat two and no third still exists. Not a phrase default and not a path resource.' },
  { id: 'iwato', reason: 'Not selected on WWH. Dev 5A still needs it as the outside-edge example. Phrase operators do not choose it. Not promoted.' },
  { id: 'phrygian_pentatonic', reason: 'Flat-two edge with a fifth still present. Colour only.' },
  { id: 'lydian_pentatonic', reason: 'Bright sharp-four colour. Missed this WWH shortlist. Kept beside major pentatonic. Not a path archetype.' },
  { id: 'whole_tone_pentachord', reason: 'Not selected on WWH. Symmetrical and far. Kept so an ambiguous field remains nameable. Operators do not select it.' },
  { id: 'blue_pentatonic', reason: 'Not selected on this WWH probe. One flat five, not a blues run. Colour only.' },
  { id: 'ambiguous_third', reason: 'Not selected on this WWH probe. Both thirds in one field. Colour description, not a switch.' },
  { id: 'leading_major', reason: 'Resolution colour. Not a cadence and not a path state.' },
  { id: 'leading_minor', reason: 'Dark resolution colour. Not a cadence and not a path state.' },
  { id: 'remote_altered', reason: 'Not selected on WWH. Dev 5A still needs it as the remote example. Operators do not select it. Not promoted.' },
];

export const DEV5C_DISABLED_OPERATORS = [
  'INTENSIFY',
  'fixed-interval SEQUENCE',
  'THROUGH one-cell-per-chord',
  'Woody Shaw semitone pair',
  'AUTO COLOR',
  'guitar fret-shift',
  'string-set optimisation',
] as const;
