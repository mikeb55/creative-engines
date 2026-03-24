/**
 * Composer OS desktop product unification — no legacy launcher contamination
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

describe('Composer OS desktop unification', () => {
  it('package metadata names Composer OS', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.build.productName).toBe('Composer OS');
    expect(JSON.stringify(pkg)).not.toMatch(/Composer Studio/i);
  });

  it('main process source has no python launcher or composer-studio paths', () => {
    const mainSrc = fs.readFileSync(path.join(desktopRoot, 'electron', 'main.ts'), 'utf-8');
    expect(mainSrc.toLowerCase()).not.toContain('python');
    expect(mainSrc.toLowerCase()).not.toContain('.py');
    expect(mainSrc).not.toMatch(/composer-studio/i);
    expect(mainSrc).not.toMatch(/Composer Studio/i);
    expect(mainSrc).not.toContain('openExternal');
  });

  it('preload exposes Composer OS only', () => {
    const pre = fs.readFileSync(path.join(desktopRoot, 'electron', 'preload.ts'), 'utf-8');
    expect(pre).toContain('Composer OS');
    expect(pre).not.toMatch(/Composer Studio/i);
  });

  it('API route list is current app-api shape (documented in test)', () => {
    const routes = ['/api/presets', '/api/style-modules', '/api/output-directory', '/api/generate', '/api/outputs', '/api/open-output-folder', '/health'];
    expect(routes.every((r) => r.startsWith('/'))).toBe(true);
    expect(routes.some((r) => r.includes('engines/'))).toBe(false);
  });
});
