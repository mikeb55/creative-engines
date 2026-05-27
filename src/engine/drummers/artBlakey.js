/** @type {import('../drumTypes').DrummerModule} */
export const drummerId = 'blakey';

export const name = 'Art Blakey';

export const description =
  'Hard bop drive with heavy backbeat, press rolls, mambo bell figures, and rim shots on two and four.';

/** @type {import('../drumTypes').DrumPattern[]} */
export const patterns = [
  {
    name: 'Hard Bop Drive',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 8],
    snares: [4, 12],
    hats: [0, 2, 4, 6, 8, 10, 12, 14],
    ride: [0, 4, 8, 12],
    description: 'Classic 2 and 4 snare with driving ride and feathered kick.',
  },
  {
    name: 'Rim Shot Backbeat',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 6, 8, 14],
    snares: [4, 12],
    hats: [2, 6, 10, 14],
    ride: [0, 3, 6, 9, 12, 15],
    description: 'Accented rim shots on 2 and 4 with syncopated kick.',
  },
  {
    name: 'Mambo Bell',
    feel: 'latin',
    meter: '4/4',
    kicks: [0, 10],
    snares: [4, 7, 12, 15],
    hats: [2, 6, 10, 14],
    ride: [0, 3, 6, 8, 11, 14],
    description: 'Bell-pattern ride with mambo snare and clave-aware kick.',
  },
  {
    name: 'Afro-Cuban Shout',
    feel: 'latin',
    meter: '4/4',
    kicks: [0, 5, 10, 15],
    snares: [4, 8, 12],
    hats: [1, 5, 9, 13],
    ride: [0, 2, 4, 6, 8, 10, 12, 14],
    description: 'Afro-Cuban bell ride with layered snare and tumbao kick.',
  },
  {
    name: 'Press Roll Fill',
    feel: 'swing',
    meter: '4/4',
    kicks: [0, 8],
    snares: [4, 6, 8, 10, 12, 13, 14, 15],
    hats: [0, 4, 8, 12],
    ride: [0, 4, 8, 12],
    description: 'Bar-end press roll on snare with unwavering ride time.',
  },
];
