/**
 * Composer OS desktop package must not chain to repo launchers, .bat, or legacy Studio entrypoints.
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

describe('Launcher / legacy path quarantine (desktop package)', () => {
  it('npm scripts do not reference launchers/ or .bat', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    const blob = JSON.stringify(pkg.scripts ?? {}) + JSON.stringify(pkg.build ?? {});
    expect(blob).not.toMatch(/launchers[\\/]/i);
    expect(blob).not.toContain('.bat');
  });

  it('electron and install sources do not reference launchers folder', () => {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) out.push(...walk(p));
        else if (name.endsWith('.ts')) out.push(fs.readFileSync(p, 'utf-8'));
      }
      return out;
    };
    const electronDir = path.join(desktopRoot, 'electron');
    const installDir = path.join(desktopRoot, 'install');
    const combined = [...walk(electronDir), ...walk(installDir)].join('\n');
    expect(combined).not.toMatch(/launchers[\\/]/i);
  });
});
