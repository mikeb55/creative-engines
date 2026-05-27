/** @type {import('../drumTypes').DrummerModule} */
export const drummerId = 'elvin';

export const name = 'Elvin Jones';

export const description =
  'Triplet-based polyrhythm with cascading ride cymbal and four-limb independence, often implying 3-over-4 against the pulse.';

/** @type {import('../drumTypes').DrumPattern[]} */
export const patterns = [
  {
    name: 'Triplet Cascade',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 6, 10, 14],
    snares: [4, 8, 12],
    hats: [2, 5, 8, 11, 14],
    ride: [0, 3, 6, 9, 12, 15],
    description: 'Ride in implied triplets; snare answers staggered across the bar.',
  },
  {
    name: '3-over-4 Poly',
    feel: 'polyrhythm',
    meter: '4/4',
    kicks: [0, 5, 10, 15],
    snares: [3, 7, 11, 15],
    hats: [1, 4, 7, 10, 13],
    ride: [0, 2, 5, 8, 11, 14],
    description: 'Three evenly spaced ride layers against four-on-the-floor kick anchors.',
  },
  {
    name: 'Coltrane Pulse',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 8],
    snares: [6, 10, 14],
    hats: [0, 2, 4, 6, 8, 10, 12, 14],
    ride: [0, 3, 6, 9, 12],
    description: 'Open ride wash with delayed snare placements and sparse kick.',
  },
  {
    name: 'Waltz Float',
    feel: 'swing',
    meter: '3/4',
    kicks: [0, 8],
    snares: [4, 10],
    hats: [2, 6, 10],
    ride: [0, 3, 6, 9],
    description: 'Triplet ride in 3/4 with cross-limb snare commentary.',
  },
  {
    name: 'Burning Six',
    feel: 'polyrhythm',
    meter: '6/8',
    kicks: [0, 6, 12],
    snares: [4, 10],
    hats: [2, 5, 8, 11, 14],
    ride: [0, 2, 4, 6, 8, 10, 12, 14],
    description: 'Compound 6/8 with continuous ride and displaced snare.',
  },
];
