/** Orbit New Orleans — SD3 groove palette (V3 expanded) */
export const MIDI_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\New Orleans Orbit Beats';

export const GROOVE_FILES_V3 = {
  intro: 'Intro 01.mid',
  head: 'HeadGroove.mid',
  soli_light: 'SoliLight.mid',
  bridge: 'Bridge 01.mid',
  shout: 'ShoutParade.mid',
  rideout: 'RideoutHalfTime.mid',
  fill_01: 'Fills 01.mid',
  fill_03: 'Fills 03.mid',
  fill_05: 'Fills 05.mid',
};

/** V6 — HeadGroove for head/soli sections; no SoliLight */
export const GROOVE_FILES_V6 = {
  intro: 'Intro 01.mid',
  head: 'HeadGroove.mid',
  shout: 'ShoutParade.mid',
  rideout: 'RideoutHalfTime.mid',
  fill_01: 'Fills 01.mid',
  fill_03: 'Fills 03.mid',
  fill_05: 'Fills 05.mid',
};

/** V6 groove map — Dirty Dozen / Galactic pocket (HeadGroove not SoliLight) */
export const SECTIONS_V6 = [
  { label: 'Intro', start: 1, end: 4, groove: 'intro', fillAt: null },
  { label: 'Head (establish)', start: 5, end: 8, groove: 'head', fillAt: 8, fill: 'fill_01' },
  { label: 'Melody Head', start: 9, end: 16, groove: 'head', fillAt: [12, 16], fill: 'fill_03' },
  { label: 'Shout Chorus', start: 17, end: 24, groove: 'shout', fillAt: [20, 24], fill: 'fill_05' },
  { label: 'Rideout', start: 25, end: 32, groove: 'rideout', fillAt: [28, 32], fill: 'fill_05' },
  { label: 'Intro (A)', start: 33, end: 36, groove: 'intro', fillAt: null },
  { label: 'Melody Head (A)', start: 37, end: 44, groove: 'head', fillAt: [40, 44], fill: 'fill_03' },
  { label: 'Shout Chorus (A)', start: 45, end: 48, groove: 'shout', fillAt: 48, fill: 'fill_05' },
  { label: 'Head (A)', start: 49, end: 56, groove: 'head', fillAt: [52, 56], fill: 'fill_03' },
  { label: 'Rideout (A)', start: 57, end: 62, groove: 'rideout', fillAt: 62, fill: 'fill_01' },
  { label: 'Head (A2)', start: 63, end: 70, groove: 'head', fillAt: [66, 70], fill: 'fill_03' },
  { label: 'Head (tag)', start: 71, end: 74, groove: 'head', fillAt: 74, fill: 'fill_01' },
  { label: 'Melody Head (A2)', start: 75, end: 78, groove: 'head', fillAt: 78, fill: 'fill_03' },
  {
    label: 'Shout Chorus (final)',
    start: 79,
    end: 84,
    groove: 'shout',
    fillAt: [80, 84],
    fill: 'fill_05',
  },
];

/** V5 — solo sections use SoliLight; fills at all listed transition bars */
export const GROOVE_FILES_V5 = {
  intro: 'Intro 01.mid',
  head: 'HeadGroove.mid',
  soli_light: 'SoliLight.mid',
  shout: 'ShoutParade.mid',
  rideout: 'RideoutHalfTime.mid',
  fill_01: 'Fills 01.mid',
  fill_03: 'Fills 03.mid',
  fill_05: 'Fills 05.mid',
};

export const SECTIONS_V5 = [
  { label: 'Intro', start: 1, end: 4, groove: 'intro', fillAt: null },
  { label: 'Soli Chorus', start: 5, end: 8, groove: 'soli_light', fillAt: 8, fill: 'fill_01' },
  { label: 'Melody Head', start: 9, end: 12, groove: 'head', fillAt: 12, fill: 'fill_03' },
  { label: 'Solo Section', start: 13, end: 16, groove: 'soli_light', fillAt: 16, fill: 'fill_01' },
  { label: 'Shout Chorus', start: 17, end: 24, groove: 'shout', fillAt: [20, 24], fill: 'fill_05' },
  { label: 'Rideout', start: 25, end: 32, groove: 'rideout', fillAt: 32, fill: 'fill_05' },
  { label: 'Intro (A)', start: 33, end: 36, groove: 'intro', fillAt: 36, fill: 'fill_01' },
  { label: 'Melody Head (A)', start: 37, end: 44, groove: 'head', fillAt: 44, fill: 'fill_03' },
  { label: 'Shout Chorus (A)', start: 45, end: 48, groove: 'shout', fillAt: 48, fill: 'fill_05' },
  { label: 'Soli Chorus (A)', start: 49, end: 56, groove: 'soli_light', fillAt: 56, fill: 'fill_03' },
  { label: 'Rideout (A)', start: 57, end: 62, groove: 'rideout', fillAt: 62, fill: 'fill_01' },
  { label: 'Soli Chorus (A2)', start: 63, end: 70, groove: 'soli_light', fillAt: 70, fill: 'fill_03' },
  { label: 'Solo Section (A2)', start: 71, end: 74, groove: 'soli_light', fillAt: 74, fill: 'fill_01' },
  { label: 'Melody Head (A2)', start: 75, end: 78, groove: 'head', fillAt: 78, fill: 'fill_03' },
  {
    label: 'Shout Chorus (final)',
    start: 79,
    end: 84,
    groove: 'shout',
    fillAt: [80, 84],
    fill: 'fill_05',
  },
];

/** Labels align with GCE eval section names for V2 comparison */
export const SECTIONS_V3 = [
  { label: 'Intro', start: 1, end: 4, groove: 'intro', fillAt: null },
  { label: 'Soli Chorus', start: 5, end: 8, groove: 'soli_light', fillAt: 8, fill: 'fill_01' },
  { label: 'Melody Head', start: 9, end: 12, groove: 'head', fillAt: 12, fill: 'fill_03' },
  { label: 'Solo Section', start: 13, end: 16, groove: 'bridge', fillAt: 16, fill: 'fill_01' },
  { label: 'Shout Chorus', start: 17, end: 24, groove: 'shout', fillAt: [20, 24], fill: 'fill_05' },
  { label: 'Rideout', start: 25, end: 32, groove: 'rideout', fillAt: 32, fill: 'fill_05' },
  { label: 'Intro (A)', start: 33, end: 36, groove: 'intro', fillAt: 36, fill: 'fill_01' },
  { label: 'Melody Head (A)', start: 37, end: 44, groove: 'head', fillAt: 44, fill: 'fill_03' },
  { label: 'Shout Chorus (A)', start: 45, end: 48, groove: 'shout', fillAt: 48, fill: 'fill_05' },
  { label: 'Soli Chorus (A)', start: 49, end: 56, groove: 'soli_light', fillAt: 56, fill: 'fill_03' },
  { label: 'Rideout (A)', start: 57, end: 62, groove: 'rideout', fillAt: 62, fill: 'fill_01' },
  { label: 'Soli Chorus (A2)', start: 63, end: 70, groove: 'soli_light', fillAt: 70, fill: 'fill_03' },
  { label: 'Solo Section (A2)', start: 71, end: 74, groove: 'bridge', fillAt: 74, fill: 'fill_01' },
  { label: 'Melody Head (A2)', start: 75, end: 78, groove: 'head', fillAt: 78, fill: 'fill_03' },
  {
    label: 'Shout Chorus (final)',
    start: 79,
    end: 84,
    groove: 'shout',
    fillAt: [80, 84],
    fill: 'fill_05',
  },
];
