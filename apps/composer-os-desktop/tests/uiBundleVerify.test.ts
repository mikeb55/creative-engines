/**
 * UI bundle identity rules (must match composer-os-app stamp output).
 */
import { verifyComposerOsUiStamp, verifyUiBundleAtPath } from '../electron/uiBundleVerify';
import * as fs from 'fs';
import * as path from 'path';

describe('uiBundleVerify', () => {
  const good = {
    productId: 'composer-os',
    productName: 'Composer OS',
    appShellVersion: '1.0.0',
    buildTimestamp: new Date().toISOString(),
    gitCommit: 'abc123',
    supportedPages: ['Generate', 'Presets', 'Style Stack', 'Outputs', 'Diagnostics'],
  };

  it('accepts valid Composer OS stamp', () => {
    const r = verifyComposerOsUiStamp(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stamp.productId).toBe('composer-os');
  });

  it('rejects wrong productId', () => {
    const r = verifyComposerOsUiStamp({ ...good, productId: 'composer-studio' });
    expect(r.ok).toBe(false);
  });

  it('rejects wrong productName', () => {
    const r = verifyComposerOsUiStamp({ ...good, productName: 'Composer Studio' });
    expect(r.ok).toBe(false);
  });

  it('rejects forbidden supported page Hybrid', () => {
    const r = verifyComposerOsUiStamp({
      ...good,
      supportedPages: ['Generate', 'Hybrid'],
    });
    expect(r.ok).toBe(false);
  });

  it('rejects forbidden supported page Projects', () => {
    const r = verifyComposerOsUiStamp({
      ...good,
      supportedPages: ['Projects'],
    });
    expect(r.ok).toBe(false);
  });

  it('rejects forbidden supported page Score', () => {
    const r = verifyComposerOsUiStamp({
      ...good,
      supportedPages: ['Score'],
    });
    expect(r.ok).toBe(false);
  });

  it('verifyUiBundleAtPath reads resources/ui after desktop build', () => {
    const uiDir = path.join(__dirname, '..', 'resources', 'ui');
    if (!fs.existsSync(path.join(uiDir, 'composer-os-ui-stamp.json'))) {
      throw new Error('Run full desktop build (npm run build:ui) before this test.');
    }
    const r = verifyUiBundleAtPath(uiDir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stamp.productId).toBe('composer-os');
      expect(r.resolvedPath).toContain('resources');
    }
  });
});
