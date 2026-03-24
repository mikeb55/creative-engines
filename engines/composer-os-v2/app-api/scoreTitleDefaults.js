"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE = void 0;
exports.resolveScoreTitleForPreset = resolveScoreTitleForPreset;
exports.DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE = 'Guitar-Bass Duo Study';
const MAX_TITLE_LEN = 200;
function resolveScoreTitleForPreset(presetId, userTitle) {
    const t = userTitle?.trim();
    if (t)
        return t.slice(0, MAX_TITLE_LEN);
    if (presetId === 'guitar_bass_duo')
        return exports.DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE;
    return 'Composer OS';
}
