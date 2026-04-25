/**
 * Diagnostic fixture runner:
 * Generates a deterministic Song Mode -> Indie dual-guitar tuning-proof MusicXML through the real app API pipeline.
 *
 * Usage:
 *   npm --prefix engines/composer-os-v2 run fixture:indie-tuning-proof
 */
import { apiGenerate, getComposerFilesRoot } from '../app-api/composerOsApiCore';
import type { GenerateRequest } from '../app-api/appApiTypes';

const req: Partial<GenerateRequest> = {
  presetId: 'song_mode',
  styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
  seed: 424242,
  title: 'Indie Dual Guitar Tuning Proof Fixture',
  styleProfile: 'STYLE_INDEPENDENT_ART_POP',
  primarySongwriterStyle: 'donald_fagen',
  debugFixtureMode: 'indie_dual_guitar_tuning_proof',
};

const composerRoot = getComposerFilesRoot();
const result = apiGenerate(req, composerRoot);
if (!result.success || !result.filepath) {
  console.error('[fixture] generation failed:', result.error ?? 'Unknown error');
  process.exit(1);
}

console.log('[fixture] MusicXML generated:', result.filepath);
console.log('[fixture] Open in GP8/Sibelius and inspect bars 1-5 for open/3/5/7/12 fret six-note block chords.');
