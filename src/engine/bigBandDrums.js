/**
 * Big-band drum style catalogue — 16th-grid patterns per historical band feel.
 * @typedef {'basie'|'ellington'|'kenton'|'rich'|'thad'} BigBandDrumBandStyle
 * @typedef {{ kicks: number[], snares: number[], hats: number[], ride: number[] }} BigBandDrumPatternLanes
 * @typedef {{
 *   id: string,
 *   name: string,
 *   bandStyle: BigBandDrumBandStyle,
 *   feel: string,
 *   patterns: BigBandDrumPatternLanes,
 *   description: string,
 * }} BigBandDrumStyleEntry
 */

/** @type {readonly BigBandDrumStyleEntry[]} */
export const BIG_BAND_DRUM_STYLES = [
  {
    id: 'basie-laid-back-brushes',
    name: 'Basie — Laid-Back Brushes',
    bandStyle: 'basie',
    feel: 'swing',
    patterns: {
      kicks: [0, 8],
      snares: [4, 12],
      hats: [2, 6, 10, 14],
      ride: [0, 2, 4, 6, 8, 10, 12, 14],
    },
    description: 'Laid-back 4/4: sparse kick, brush swish on ride, feathered snare backbeats.',
  },
  {
    id: 'basie-all-american-walk',
    name: 'Basie — All-American Walk',
    bandStyle: 'basie',
    feel: 'swing',
    patterns: {
      kicks: [0, 4, 8, 12],
      snares: [4, 12],
      hats: [2, 6, 10, 14],
      ride: [0, 3, 6, 9, 12, 15],
    },
    description: 'Walking pulse with light kick four and classic Basie ride spacing.',
  },
  {
    id: 'ellington-dramatic-stop',
    name: 'Ellington — Dramatic Stop',
    bandStyle: 'ellington',
    feel: 'stop-time',
    patterns: {
      kicks: [0, 6, 10],
      snares: [4, 8, 12, 15],
      hats: [0, 8],
      ride: [0, 4, 8, 12],
    },
    description: 'Dramatic stops and hits: accented snare clusters with held ride punches.',
  },
  {
    id: 'ellington-latin-tinge',
    name: 'Ellington — Latin Tinge',
    bandStyle: 'ellington',
    feel: 'latin-swing',
    patterns: {
      kicks: [0, 3, 6, 10, 13],
      snares: [4, 11],
      hats: [1, 5, 9, 13],
      ride: [0, 2, 5, 8, 11, 14],
    },
    description: 'Cuban-tinged ride with cross-stick snare and displaced kick tumbao color.',
  },
  {
    id: 'kenton-march-pulse',
    name: 'Kenton — March Pulse',
    bandStyle: 'kenton',
    feel: 'march',
    patterns: {
      kicks: [0, 4, 8, 12],
      snares: [2, 6, 10, 14],
      hats: [0, 2, 4, 6, 8, 10, 12, 14],
      ride: [0, 4, 8, 12],
    },
    description: 'Heavy brass pulse: marching snare grid under driving quarter-note ride.',
  },
  {
    id: 'kenton-progressive-meter',
    name: 'Kenton — Progressive Meter',
    bandStyle: 'kenton',
    feel: 'odd-meter',
    patterns: {
      kicks: [0, 5, 10, 15],
      snares: [3, 7, 11, 14],
      hats: [1, 4, 8, 12],
      ride: [0, 2, 5, 8, 11, 14],
    },
    description: 'Progressive meter feel: displaced accents implying 5+3 grouping over 4/4.',
  },
  {
    id: 'rich-show-roll',
    name: 'Buddy Rich — Show Roll',
    bandStyle: 'rich',
    feel: 'show',
    patterns: {
      kicks: [0, 2, 4, 6, 8, 10, 12, 14],
      snares: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      hats: [0, 4, 8, 12],
      ride: [0, 2, 4, 6, 8, 10, 12, 14],
    },
    description: 'Explosive single-stroke roll fill energy with fast bass drum and military precision.',
  },
  {
    id: 'rich-military-drive',
    name: 'Buddy Rich — Military Drive',
    bandStyle: 'rich',
    feel: 'driving',
    patterns: {
      kicks: [0, 3, 6, 8, 11, 14],
      snares: [4, 7, 12, 15],
      hats: [0, 2, 4, 6, 8, 10, 12, 14],
      ride: [0, 3, 6, 9, 12, 15],
    },
    description: 'Showmanship drive: tight snare press rolls and rapid-fire kick doubles.',
  },
  {
    id: 'thad-samba-displace',
    name: 'Thad Jones — Samba Displace',
    bandStyle: 'thad',
    feel: 'samba',
    patterns: {
      kicks: [0, 3, 6, 10, 13],
      snares: [5, 9, 14],
      hats: [2, 5, 8, 11, 14],
      ride: [0, 2, 4, 7, 9, 12, 14],
    },
    description: 'Rhythmic displacement with samba influence and mixed-meter kick placement.',
  },
  {
    id: 'thad-melodic-snare',
    name: 'Thad Jones — Melodic Snare',
    bandStyle: 'thad',
    feel: 'melodic',
    patterns: {
      kicks: [0, 8],
      snares: [2, 5, 8, 11, 14],
      hats: [4, 12],
      ride: [0, 3, 6, 9, 12, 15],
    },
    description: 'Melodic snare line weaving against sparse kick; Thad-style conversational phrasing.',
  },
];

/** @param {BigBandDrumBandStyle} bandStyle */
export function bigBandDrumStylesForBand(bandStyle) {
  return BIG_BAND_DRUM_STYLES.filter((s) => s.bandStyle === bandStyle);
}

/** @param {string} id */
export function getBigBandDrumStyle(id) {
  return BIG_BAND_DRUM_STYLES.find((s) => s.id === id);
}
