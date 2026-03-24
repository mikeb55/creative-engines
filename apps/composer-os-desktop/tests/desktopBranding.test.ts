/**
 * Runtime branding: window title and headings must be Composer OS (not legacy Studio).
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

describe('Desktop branding (Composer OS)', () => {
  it('BrowserWindow title includes Composer OS and desktop version marker', () => {
    const mainSrc = fs.readFileSync(path.join(desktopRoot, 'electron', 'main.ts'), 'utf-8');
    expect(mainSrc).toContain('DESKTOP_PRODUCT_NAME');
    expect(mainSrc).toContain("app.getVersion()");
    expect(mainSrc).not.toMatch(/Composer Studio/i);
  });

  it('App header source shows Composer OS stamp line (not Studio)', () => {
    const appSrc = fs.readFileSync(
      path.join(desktopRoot, '..', 'composer-os-app', 'src', 'App.tsx'),
      'utf-8'
    );
    expect(appSrc).toContain('Composer OS');
    expect(appSrc).not.toMatch(/Composer Studio/i);
  });
});
