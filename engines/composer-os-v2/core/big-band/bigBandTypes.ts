/**
 * Big Band — role vocabulary for arranging / planning (Prompt 5/7).
 */

export type BigBandRoleType =
  | 'lead_melody'
  | 'pads'
  | 'backgrounds'
  | 'riffs'
  | 'punches'
  | 'shout'
  | 'counterline'
  | 'rhythm_anchor'
  | 'bass_anchor'
  | 'silence';

/** Orbit / custom big-band score-builder orchestration profiles. */
export type BigBandArrangementProfile =
  | 'default'
  | 'orbit_v2'
  | 'orbit_v3_melody_authority'
  | 'orbit_v4_64'
  | 'orbit_v5_64'
  | 'orbit_v6_64'
  | 'orbit_steely_v1_64'
  | 'orbit_steely_v1_1_64'
  | 'orbit_steely_v1_2_64'
  | 'orbit_steely_v1_3_64'
  | 'orbit_steely_v1_4_64'
  | 'orbit_steely_v1_5_64'
  | 'orbit_steely_v1_7_64'
  | 'orbit_28_v1'
  | 'orbit_28_v2'
  | 'bb101_v1';
