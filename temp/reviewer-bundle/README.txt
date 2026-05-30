MISSING (not in repo at requested paths):
- engines/composer-os-v2/core/songMode/songModeProducer.ts
- engines/composer-os-v2/core/songMode/songModeLock.ts
- engines/composer-os-v2/core/songMode/songMode.test.ts

PATH CORRECTIONS:
- songModeTypes.ts lives at core/song-mode/ (hyphen), not core/songMode/
- composerOsAppGeneration.ts lives at app-api/composerOsAppGeneration.ts

SONG_MODE ROUTING (app-api/composerOsAppGeneration.ts lines 946-947):
  case 'song_mode': return runSongStructure(req, outputDir);

DUO MusicContext helper (lines 200-215): see composerOsAppGeneration.ts
runSongStructure: lines 1092-2440 (extracted to composerOsAppGeneration-runSongStructure.ts)
