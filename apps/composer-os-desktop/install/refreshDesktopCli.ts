/**
 * npm run refresh:desktop — build, package, latest portable exe, Desktop shortcut, optional launch.
 */
import * as path from 'path';
import { runRefreshDesktop } from './refreshDesktop';

function parseArgs(argv: string[]): { launch: boolean; noPrune: boolean } {
  let launch = false;
  let noPrune = false;
  for (const a of argv) {
    if (a === '--launch') launch = true;
    if (a === '--no-prune') noPrune = true;
  }
  const env = process.env.COMPOSER_OS_REFRESH_LAUNCH;
  if (env === '1' || env === 'true' || env === 'yes') {
    launch = true;
  }
  return { launch, noPrune };
}

function main(): void {
  const root = path.resolve(__dirname, '..');
  const { launch, noPrune } = parseArgs(process.argv.slice(2));
  const r = runRefreshDesktop({
    desktopRoot: root,
    skipLaunch: !launch,
    skipPrune: noPrune,
  });
  if (!r.ok) {
    console.error(r.message);
    process.exit(1);
  }
  console.log('');
  console.log('SUCCESS');
  console.log('  exe:', r.exePath);
  console.log('  shortcut:', r.shortcutPath);
  if (r.launched) {
    console.log('  launched: yes');
  } else {
    console.log('  launched: no (pass --launch or set COMPOSER_OS_REFRESH_LAUNCH=1)');
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}
