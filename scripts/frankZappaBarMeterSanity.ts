import { apiGenerate, getComposerFilesRoot } from '../engines/composer-os-v2/app-api/composerOsApiCore';

const barMeterMap: Record<string, { numerator: number; denominator: number }> = {};
for (let i = 1; i <= 32; i++) {
  barMeterMap[String(i)] = i % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 };
}

const r = apiGenerate(
  {
    presetId: 'song_mode',
    primarySongwriterStyle: 'frank_zappa',
    totalBars: 32,
    seed: 50200,
    barMeterMap,
    stylePairing: { songwriterStyle: 'frank_zappa', arrangerStyle: 'thad', era: 'post_bop' },
    styleProfile: 'STYLE_ECM',
  },
  getComposerFilesRoot()
) as Record<string, unknown>;

if (!r.success) {
  const d = typeof r.detail === 'string' ? r.detail : '';
  process.stdout.write(`FAIL: ${r.error}\n${d.slice(0, 2000)}\n`);
  process.exit(1);
}
process.stdout.write('OK frank_zappa + zappa classic barMeterMap\n');
