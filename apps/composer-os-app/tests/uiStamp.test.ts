/**
 * Dist stamp file produced by Vite (run `npm run build` so dist/ exists).
 */
import * as fs from 'fs';
import * as path from 'path';

const stampPath = path.join(__dirname, '..', 'dist', 'composer-os-ui-stamp.json');
const hasStamp = fs.existsSync(stampPath);

describe('composer-os-ui-stamp.json', () => {
  test.skipIf(!hasStamp)('matches Composer OS product and allowed pages only', () => {
    const raw = JSON.parse(fs.readFileSync(stampPath, 'utf-8')) as {
      productId: string;
      productName: string;
      supportedPages: string[];
      appShellVersion: string;
      buildTimestamp: string;
      gitCommit: string;
    };
    expect(raw.productId).toBe('composer-os');
    expect(raw.productName).toBe('Composer OS');
    expect(raw.appShellVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(raw.buildTimestamp?.length).toBeGreaterThan(10);
    expect(raw.supportedPages.map((p) => p.toLowerCase())).not.toContain('hybrid');
    expect(raw.supportedPages.map((p) => p.toLowerCase())).not.toContain('projects');
    expect(raw.supportedPages.map((p) => p.toLowerCase())).not.toContain('score');
  });
});
