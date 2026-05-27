/**
 * Named drum presets — maps display presets to drummer pattern rows.
 */

/** @typedef {object} DrumPreset
 * @property {string} id
 * @property {string} name
 * @property {'elvin' | 'tony' | 'blakey' | 'dejohnette'} drummer
 * @property {string} patternName
 * @property {string[]} tags
 */

/** @type {readonly DrumPreset[]} */
export const DRUM_PRESETS = [
  {
    id: 'elvin-triplet-cascade',
    name: 'Elvin — Triplet Cascade',
    drummer: 'elvin',
    patternName: 'Triplet Cascade',
    tags: ['swing', 'hard-bop', 'medium-up', 'polyrhythm'],
  },
  {
    id: 'elvin-3-over-4',
    name: 'Elvin — 3 over 4',
    drummer: 'elvin',
    patternName: '3-over-4 Poly',
    tags: ['polyrhythm', 'avant-garde', 'fast', 'coltrane'],
  },
  {
    id: 'elvin-coltrane-pulse',
    name: 'Elvin — Coltrane Pulse',
    drummer: 'elvin',
    patternName: 'Coltrane Pulse',
    tags: ['swing', 'medium', 'open', 'post-bop'],
  },
  {
    id: 'elvin-burning-six',
    name: 'Elvin — Burning 6/8',
    drummer: 'elvin',
    patternName: 'Burning Six',
    tags: ['polyrhythm', '6/8', 'fast', 'fusion'],
  },
  {
    id: 'tony-explosive-ride',
    name: 'Tony — Explosive Ride',
    drummer: 'tony',
    patternName: 'Explosive Ride',
    tags: ['swing', 'fast', 'fusion', 'explosive'],
  },
  {
    id: 'tony-metric-shift',
    name: 'Tony — Metric Shift',
    drummer: 'tony',
    patternName: 'Metric Shift',
    tags: ['polyrhythm', 'displacement', 'medium-up', 'avant-garde'],
  },
  {
    id: 'tony-anarchic-snare',
    name: 'Tony — Anarchic Snare',
    drummer: 'tony',
    patternName: 'Anarchic Snare',
    tags: ['free', 'fast', 'experimental', 'displacement'],
  },
  {
    id: 'tony-fast-fusion',
    name: 'Tony — Fast Fusion',
    drummer: 'tony',
    patternName: 'Fast Fusion',
    tags: ['swing', 'fast', 'fusion', 'dense'],
  },
  {
    id: 'blakey-hard-bop',
    name: 'Blakey — Hard Bop Drive',
    drummer: 'blakey',
    patternName: 'Hard Bop Drive',
    tags: ['swing', 'hard-bop', 'medium', 'backbeat'],
  },
  {
    id: 'blakey-mambo-bell',
    name: 'Blakey — Mambo Bell',
    drummer: 'blakey',
    patternName: 'Mambo Bell',
    tags: ['latin', 'mambo', 'medium', 'afro-cuban'],
  },
  {
    id: 'blakey-afro-cuban-shout',
    name: 'Blakey — Afro-Cuban Shout',
    drummer: 'blakey',
    patternName: 'Afro-Cuban Shout',
    tags: ['latin', 'afro-cuban', 'medium-up', 'shout'],
  },
  {
    id: 'blakey-press-roll',
    name: 'Blakey — Press Roll Fill',
    drummer: 'blakey',
    patternName: 'Press Roll Fill',
    tags: ['swing', 'fill', 'medium', 'hard-bop'],
  },
  {
    id: 'dejohnette-ecm-space',
    name: 'DeJohnette — ECM Space',
    drummer: 'dejohnette',
    patternName: 'ECM Space',
    tags: ['swing', 'sparse', 'slow', 'ecm'],
  },
  {
    id: 'dejohnette-brush-ballad',
    name: 'DeJohnette — Brush Ballad',
    drummer: 'dejohnette',
    patternName: 'Brush Ballad',
    tags: ['swing', 'brushes', 'ballad', 'slow'],
  },
  {
    id: 'dejohnette-rock-jazz',
    name: 'DeJohnette — Rock-Jazz Hybrid',
    drummer: 'dejohnette',
    patternName: 'Rock-Jazz Hybrid',
    tags: ['swing', 'rock', 'medium', 'fusion'],
  },
  {
    id: 'dejohnette-floating-five',
    name: 'DeJohnette — Floating 5/4',
    drummer: 'dejohnette',
    patternName: 'Floating Five',
    tags: ['polyrhythm', '5/4', 'medium', 'ecm'],
  },
];
