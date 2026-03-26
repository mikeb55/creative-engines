"use strict";
/**
 * Big Band Architecture Engine — Default architecture patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALLAD_FORM = exports.ELLINGTON_STYLE = exports.STANDARD_SWING = void 0;
exports.STANDARD_SWING = [
    { name: 'Intro', role: 'intro', startBar: 1, length: 4, leadSection: 'saxes', density: 'sparse', notes: '4-bar intro' },
    { name: 'Head A', role: 'head', startBar: 5, length: 8, leadSection: 'saxes', density: 'medium', notes: 'Melody A' },
    { name: 'Head B', role: 'head', startBar: 13, length: 8, leadSection: 'trumpets', density: 'medium', notes: 'Melody B' },
    { name: 'Background Chorus', role: 'background_chorus', startBar: 21, length: 8, leadSection: 'saxes', density: 'medium', notes: 'Reeds pad' },
    { name: 'Soli', role: 'soli', startBar: 29, length: 8, leadSection: 'saxes', density: 'dense', notes: 'Sax soli' },
    { name: 'Shout Chorus', role: 'shout_chorus', startBar: 37, length: 8, leadSection: 'tutti', density: 'tutti', notes: 'Brass shout' },
    { name: 'Head Out', role: 'head', startBar: 45, length: 8, leadSection: 'saxes', density: 'medium', notes: 'Melody reprise' },
    { name: 'Tag', role: 'tag', startBar: 53, length: 4, leadSection: 'tutti', density: 'tutti', notes: 'Ending tag' },
];
exports.ELLINGTON_STYLE = [
    { name: 'Intro Reeds', role: 'intro', startBar: 1, length: 4, leadSection: 'saxes', density: 'sparse', notes: 'Reeds intro' },
    { name: 'Head Sax', role: 'head', startBar: 5, length: 8, leadSection: 'saxes', density: 'medium', notes: 'Sax lead' },
    { name: 'Brass Response', role: 'interlude', startBar: 13, length: 4, leadSection: 'trumpets', density: 'medium', notes: 'Brass punctuation' },
    { name: 'Background Reeds', role: 'background_chorus', startBar: 17, length: 8, leadSection: 'saxes', density: 'sparse', notes: 'Reeds pad' },
    { name: 'Trumpet Soli', role: 'soli', startBar: 25, length: 8, leadSection: 'trumpets', density: 'dense', notes: 'Trumpet soli' },
    { name: 'Shout Chorus', role: 'shout_chorus', startBar: 33, length: 8, leadSection: 'tutti', density: 'tutti', notes: 'Brass shout' },
    { name: 'Release Reeds', role: 'outro', startBar: 41, length: 4, leadSection: 'saxes', density: 'medium', notes: 'Release reeds' },
];
exports.BALLAD_FORM = [
    { name: 'Intro Pad', role: 'intro', startBar: 1, length: 4, leadSection: 'saxes', density: 'sparse', notes: 'Pad intro' },
    { name: 'Head', role: 'head', startBar: 5, length: 16, leadSection: 'saxes', density: 'sparse', notes: 'Ballad melody' },
    { name: 'Background Chorus', role: 'background_chorus', startBar: 21, length: 8, leadSection: 'saxes', density: 'sparse', notes: 'Soft pad' },
    { name: 'Soli', role: 'soli', startBar: 29, length: 8, leadSection: 'saxes', density: 'medium', notes: 'Sax soli' },
    { name: 'Head Reprint', role: 'head', startBar: 37, length: 8, leadSection: 'saxes', density: 'sparse', notes: 'Melody reprise' },
    { name: 'Tag', role: 'tag', startBar: 45, length: 4, leadSection: 'tutti', density: 'medium', notes: 'Ballad ending' },
];
