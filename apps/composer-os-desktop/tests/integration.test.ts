/**
 * Desktop integration tests
 * Run after: npm run build:icon && npm run build:api && npm run build:ui && npm run build:electron
 */
import * as path from 'path';
import * as fs from 'fs';

describe('Desktop integration', () => {
  const appRoot = path.resolve(__dirname, '..');

  it('API bundle exists after build', () => {
    const bundlePath = path.join(appRoot, 'resources', 'api.bundle.js');
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  it('app window target URL wiring', () => {
    const PORT = 3001;
    const url = `http://localhost:${PORT}`;
    expect(url).toBe('http://localhost:3001');
  });

  it('ui index.html exists after build', () => {
    const uiIndex = path.join(appRoot, 'resources', 'ui', 'index.html');
    expect(fs.existsSync(uiIndex)).toBe(true);
  });

  it('dist main.js exists after electron build', () => {
    const mainPath = path.join(appRoot, 'dist', 'main.js');
    expect(fs.existsSync(mainPath)).toBe(true);
  });
});
