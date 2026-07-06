import type { SlonimskyGbdWriterId } from '../types/slonimskyGbdState';
import type { SlonimskySongModeWriterId, SlonimskySourcePreset } from '../types/slonimskyMacroState';

export const SLONIMSKY_FLAVOR_DISPLAY: Record<SlonimskySourcePreset, string> = {
  lyrical: 'Lyrical',
  angular: 'Angular',
  symmetric: 'Patterned',
  chromatic: 'Chromatic',
  riff: 'Riff',
};

export const SLONIMSKY_FLAVOR_SHORT_TOOLTIP: Record<SlonimskySourcePreset, string> = {
  lyrical: 'Smooth, singable, flowing',
  angular: 'Jumping, sharp-edged, restless',
  symmetric: 'Patterned, balanced, uncanny',
  chromatic: 'Slippery, dark, searching',
  riff: 'Hooky, driving, repeatable',
};

export const SLONIMSKY_FLAVOR_LONG_DESCRIPTION: Record<SlonimskySourcePreset, string> = {
  lyrical:
    'Sings like a line you could breathe, with smooth shape and a natural sense of direction.',
  angular: 'Jumps, twists, and changes direction in a way that feels sharp, restless, and alive.',
  symmetric: 'Feels patterned, poised, and slightly uncanny, like a phrase turning around itself.',
  chromatic: 'Slides and squeezes between notes for a darker, more searching, less settled sound.',
  riff: 'Locks into a memorable shape with bite, repetition, and strong physical pull.',
};

export const SLONIMSKY_FLAVOR_GENRE_HINT: Record<SlonimskySourcePreset, string> = {
  lyrical: 'Jazz ballads · Film scoring · ECM-style improv',
  angular: 'Art rock · Post-bop · Tense modern chamber',
  symmetric: 'Modern classical · Prog · Hypnotic soundtrack',
  chromatic: 'Noir film cues · Avant-jazz · Uneasy slow burns',
  riff: 'Guitar-driven rock · Fusion vamps · Groove-based',
};

export const SLONIMSKY_KNOB_TOOLTIP = {
  motion: 'From grounded to wide-leaping',
  tension: 'From calm to charged',
  variation: 'From consistent to unpredictable',
} as const;

export const SLONIMSKY_PIN_AVOID_TOOLTIP = {
  pin: 'Keep this flavor in play here',
  avoid: 'Keep this flavor out of this section',
} as const;

export const SLONIMSKY_WRITER_ONE_LINER: Record<SlonimskySongModeWriterId, string> = {
  pat_metheny: 'Open, singing lines with lift and space',
  frank_zappa: 'Twisted, jagged, colorful, a little dangerous',
  sonic_youth: 'Raw, slashing, noisy — texture over polish',
  joni_mitchell: 'Clear, floating, graceful with surprising turns',
  radiohead: 'Uneasy, fragile, tense, art-rock bite',
  wayne_shorter: 'Motive-driven, chromatic, searching post-bop',
  bill_evans: 'Lyrical piano color, voice-led harmony',
  herbie_hancock: 'Angular funk-jazz harmony, quartal colour',
  larry_carlton: 'Fusion-funk guitar, lyrical then chromatic',
  david_gilmour: 'Singing rock lead, riff hooks and sustain',
  mccoy_tyner: 'Quartal m11/sus stacks, pentatonic clusters, IV-quartal over minor',
  miles_davis: 'Cool modal space, lyrical then chromatic',
};

export const SLONIMSKY_GBD_WRITER_ONE_LINER: Record<SlonimskyGbdWriterId, string> = {
  nile_rodgers: 'Groove-first, hook-driven, rhythmically tight',
  eddie_van_halen: 'Virtuosic rock energy, riff-forward',
  larry_carlton: 'Smooth fusion guitar, lyrical then chromatic',
  david_gilmour: 'Singing rock lead, riff hooks and sustain',
  hendrix: 'Blues-rock fire, wide dynamic expression',
  fripp: 'Oblique, layered, textural outside the groove',
  verlaine: 'Suspended-field harmony, slash voicings, sparse guitar–bass interlock',
  wes_montgomery: 'Warm octave jazz lines, bebop-blues riff cells, lyrical then riff',
  joe_pass: 'Fingerstyle chord-melody line, chromatic bebop phrasing',
  allan_holdsworth: 'Chromatic legato outside lines, wide leaps, floating rhythm',
  scott_henderson: 'Angular fusion riffs, blues chromaticism, grounded 16ths',
};

export const SLONIMSKY_FLAVOR_ORDER: readonly SlonimskySourcePreset[] = [
  'lyrical',
  'angular',
  'symmetric',
  'chromatic',
  'riff',
];
