/**
 * Composer OS desktop — legacy / Studio quarantine on all Electron sources (active launch path).
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');
const electronDir = path.join(desktopRoot, 'electron');

function readAllElectronSources(): string {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith('.ts')) files.push(p);
    }
  };
  walk(electronDir);
  return files.map((p) => fs.readFileSync(p, 'utf-8')).join('\n\n');
}

describe('Desktop quarantine (Composer OS only)', () => {
  const combined = readAllElectronSources();
  const mainPath = path.join(electronDir, 'main.ts');
  const mainSrc = fs.readFileSync(mainPath, 'utf-8');

  it('single BrowserWindow construction', () => {
    const matches = mainSrc.match(/new BrowserWindow\s*\(/g);
    expect(matches?.length).toBe(1);
  });

  it('no Composer Studio or composer-studio-app in electron sources', () => {
    expect(combined).not.toMatch(/composer-studio/i);
    expect(combined).not.toMatch(/Composer Studio/i);
    expect(combined).not.toMatch(/composer-studio-app/i);
  });

  it('no python invocation in electron sources', () => {
    expect(combined.toLowerCase()).not.toContain('python');
    expect(combined.toLowerCase()).not.toContain('.py');
    expect(combined).not.toMatch(/spawn\s*\(\s*['"]python/i);
  });

  it('no openExternal or shell.openExternal', () => {
    expect(combined).not.toContain('openExternal');
  });

  it('window open handler denies popups', () => {
    expect(mainSrc).toContain('setWindowOpenHandler');
    expect(mainSrc).toContain("'deny'");
  });

  it('no browser auto-open helper strings in electron sources', () => {
    expect(combined).not.toMatch(/Opening browser/i);
  });
});
