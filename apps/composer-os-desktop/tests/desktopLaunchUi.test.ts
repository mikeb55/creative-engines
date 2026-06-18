/**
 * Packaged desktop launch must default to full composer-os-app UI, not musician shell.
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');
const mainPath = path.join(desktopRoot, 'electron', 'main.ts');
const uiStampPath = path.join(desktopRoot, 'resources', 'ui', 'composer-os-ui-stamp.json');

describe('Desktop packaged launch UI (static)', () => {
  const main = fs.readFileSync(mainPath, 'utf-8');

  it('sets COMPOSER_OS_FULL_UI=1 after loadEnv when packaged', () => {
    const loadEnvIdx = main.indexOf('loadEnv();');
    expect(loadEnvIdx).toBeGreaterThan(-1);
    const afterLoadEnv = main.slice(loadEnvIdx, loadEnvIdx + 400);
    expect(afterLoadEnv).toMatch(/app\.isPackaged/);
    expect(afterLoadEnv).toContain("process.env.COMPOSER_OS_FULL_UI = '1'");
    const isFullUiIdx = main.indexOf('function isFullUiEnabled()');
    expect(isFullUiIdx).toBeGreaterThan(loadEnvIdx);
  });

  it('launchApp loads verified resources/ui when full UI enabled, musician only as fallback', () => {
    expect(main).toContain('const fullUiEnabled = isFullUiEnabled();');
    expect(main).toContain('const uiPath = resolveUiPath();');
    expect(main).toContain('verifyUiBundleAtPath(uiPath)');
    expect(main).toContain("path.join(uiPath, 'index.html')");
    expect(main).toContain('await win.loadFile(indexHtml)');
    expect(main).toContain('resolveMusicianUiIndexPath()');
    expect(main).toContain('await win.loadFile(musicianIndex)');

    const fullUiBlock = main.slice(main.indexOf('if (fullUiEnabled)'), main.indexOf('cachedUiStamp = null'));
    expect(fullUiBlock).toContain('verifyUiBundleAtPath');
    expect(fullUiBlock).not.toContain('musicianIndex');

    const musicianFallback = main.slice(main.indexOf('cachedUiStamp = null'));
    expect(musicianFallback).toContain('resolveMusicianUiIndexPath()');
  });

  it('bundled UI stamp lists Generate/Presets/Outputs (not musician-only shell)', () => {
    expect(fs.existsSync(uiStampPath)).toBe(true);
    const stamp = JSON.parse(fs.readFileSync(uiStampPath, 'utf-8')) as {
      productId: string;
      supportedPages: string[];
    };
    expect(stamp.productId).toBe('composer-os');
    expect(stamp.supportedPages).toEqual(
      expect.arrayContaining(['Generate', 'Presets', 'Outputs'])
    );
  });
});
