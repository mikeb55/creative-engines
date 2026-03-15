/**
 * Big Band Architecture Engine — Default architecture patterns
 */

import type { ArrangementSection } from './architectureTypes';

export const STANDARD_SWING: ArrangementSection[] = [
  { name: 'Intro', role: 'intro', startBar: 1, length: 4, leadSection: 'saxes', densityLevel: 'sparse', notes: '4-bar intro' },
  { name: 'Head A', role: 'head', startBar: 5, length: 8, leadSection: 'saxes', densityLevel: 'medium', notes: 'Melody A' },
  { name: 'Head B', role: 'head', startBar: 13, length: 8, leadSection: 'trumpets', densityLevel: 'medium', notes: 'Melody B' },
  { name: 'Background Chorus', role: 'background_chorus', startBar: 21, length: 8, leadSection: 'reeds', densityLevel: 'medium', notes: 'Reeds pad' },
  { name: 'Soli', role: 'soli', startBar: 29, length: 8, leadSection: 'saxes', densityLevel: 'dense', notes: 'Sax soli' },
  { name: 'Shout Chorus', role: 'shout_chorus', startBar: 37, length: 8, leadSection: 'brass', densityLevel: 'tutti', notes: 'Brass shout' },
  { name: 'Head Out', role: 'head', startBar: 45, length: 8, leadSection: 'saxes', densityLevel: 'medium', notes: 'Melody reprise' },
  { name: 'Tag', role: 'tag', startBar: 53, length: 4, leadSection: 'full', densityLevel: 'tutti', notes: 'Ending tag' },
];

export const ELLINGTON_STYLE: ArrangementSection[] = [
  { name: 'Intro Reeds', role: 'intro', startBar: 1, length: 4, leadSection: 'reeds', densityLevel: 'sparse', notes: 'Reeds intro' },
  { name: 'Head Sax', role: 'head', startBar: 5, length: 8, leadSection: 'saxes', densityLevel: 'medium', notes: 'Sax lead' },
  { name: 'Brass Answer', role: 'interlude', startBar: 13, length: 4, leadSection: 'brass', densityLevel: 'medium', notes: 'Brass punctuation' },
  { name: 'Background Reeds', role: 'background_chorus', startBar: 17, length: 8, leadSection: 'reeds', densityLevel: 'sparse', notes: 'Reeds pad' },
  { name: 'Soli Trumpet', role: 'soli', startBar: 25, length: 8, leadSection: 'trumpets', densityLevel: 'dense', notes: 'Trumpet soli' },
  { name: 'Shout Brass', role: 'shout_chorus', startBar: 33, length: 8, leadSection: 'brass', densityLevel: 'tutti', notes: 'Brass shout' },
  { name: 'Release Sax', role: 'outro', startBar: 41, length: 4, leadSection: 'saxes', densityLevel: 'medium', notes: 'Sax release' },
];

export const BALLAD_FORM: ArrangementSection[] = [
  { name: 'Intro Pad', role: 'intro', startBar: 1, length: 4, leadSection: 'reeds', densityLevel: 'sparse', notes: 'Pad intro' },
  { name: 'Head', role: 'head', startBar: 5, length: 16, leadSection: 'saxes', densityLevel: 'sparse', notes: 'Ballad melody' },
  { name: 'Background', role: 'background_chorus', startBar: 21, length: 8, leadSection: 'reeds', densityLevel: 'sparse', notes: 'Soft pad' },
  { name: 'Soli', role: 'soli', startBar: 29, length: 8, leadSection: 'saxes', densityLevel: 'medium', notes: 'Sax soli' },
  { name: 'Head Reprint', role: 'head', startBar: 37, length: 8, leadSection: 'saxes', densityLevel: 'sparse', notes: 'Melody reprise' },
  { name: 'Tag', role: 'tag', startBar: 45, length: 4, leadSection: 'full', densityLevel: 'medium', notes: 'Ballad ending' },
];
