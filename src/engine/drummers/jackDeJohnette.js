/** @type {import('../drumTypes').DrummerModule} */
export const drummerId = 'dejohnette';

export const name = 'Jack DeJohnette';

export const description =
  'Fluid meter changes, melodic drumming, ECM spaciousness, and simultaneous jazz-rock feels with brushes and mallets.';

/** @type {import('../drumTypes').DrumPattern[]} */
export const patterns = [
  {
    name: 'ECM Space',
    feel: 'swing',
    meter: '4/4',
    kicks: [0],
    snares: [8],
    hats: [4, 12],
    ride: [0, 8],
    description: 'Sparse ECM texture — long rests, melodic ride placement.',
  },
  {
    name: 'Brush Ballad',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 12],
    snares: [6, 14],
    hats: [2, 6, 10, 14],
    ride: [0, 4, 8, 12],
    description: 'Soft brush swish on ride row; gentle snare color.',
  },
  {
    name: 'Rock-Jazz Hybrid',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 8],
    snares: [4, 12],
    hats: [0, 2, 4, 6, 8, 10, 12, 14],
    ride: [0, 3, 6, 9, 12, 15],
    description: 'Rock backbeat with jazz ride syncopation.',
  },
  {
    name: 'Floating Five',
    feel: 'polyrhythm',
    meter: '5/4',
    kicks: [0, 10],
    snares: [5, 12],
    hats: [2, 7, 12],
    ride: [0, 4, 8, 12],
    description: '5/4 melodic ride with understated kick and snare.',
  },
  {
    name: 'Melodic Tom Colors',
    feel: 'free',
    meter: '4/4',
    kicks: [0, 5, 11],
    snares: [7, 15],
    hats: [3, 9],
    ride: [0, 2, 5, 8, 11, 14],
    description: 'Melodic phrasing across ride and snare; fluid metric hints.',
  },
  {
    name: 'Brush Waltz',
    feel: 'swing',
    meter: '3/4',
    kicks: [0],
    snares: [6],
    hats: [3, 9],
    ride: [0, 4, 8],
    description: 'Brush pattern in 3/4 with wide spacing and lyrical ride.',
  },
];
