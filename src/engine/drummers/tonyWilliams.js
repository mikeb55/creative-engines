/** @type {import('../drumTypes').DrummerModule} */
export const drummerId = 'tony';

export const name = 'Tony Williams';

export const description =
  'Explosive ride texture, extreme dynamic range, metric displacement, and anarchic snare placement at fast tempos.';

/** @type {import('../drumTypes').DrumPattern[]} */
export const patterns = [
  {
    name: 'Explosive Ride',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 7, 12],
    snares: [5, 9, 13],
    hats: [2, 6, 10, 14],
    ride: [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15],
    description: 'Dense ride chatter with snare hits off the grid.',
  },
  {
    name: 'Metric Shift',
    feel: 'polyrhythm',
    meter: '4/4',
    kicks: [2, 6, 10, 14],
    snares: [1, 7, 11, 15],
    hats: [0, 4, 8, 12],
    ride: [0, 5, 8, 13],
    description: 'Entire pattern displaced by a 16th; kick leads the displacement.',
  },
  {
    name: 'Anarchic Snare',
    feel: 'free',
    meter: '4/4',
    kicks: [0, 10],
    snares: [3, 5, 8, 11, 14, 15],
    hats: [1, 4, 7, 9, 12],
    ride: [0, 2, 4, 6, 8, 10, 12, 14],
    description: 'Snare clusters avoid predictable backbeat placement.',
  },
  {
    name: 'Fast Fusion',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 4, 8, 12],
    snares: [6, 14],
    hats: [0, 2, 4, 6, 8, 10, 12, 14],
    ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    description: 'Machine-gun ride with kick on every downbeat subdivision.',
  },
  {
    name: 'Seven Storm',
    feel: 'polyrhythm',
    meter: '7/8',
    kicks: [0, 8, 14],
    snares: [4, 11],
    hats: [2, 6, 10, 14],
    ride: [0, 2, 4, 6, 8, 10, 12, 14],
    description: 'Odd-meter ride ostinato with explosive snare accents.',
  },
];
