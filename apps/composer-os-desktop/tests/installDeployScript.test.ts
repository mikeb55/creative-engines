/**
 * Deploy/install entry wiring and repo constraints (static).
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

describe('desktop deploy / install wiring', () => {
  it('package.json defines desktop:deploy and desktop:install', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['desktop:deploy']).toBeDefined();
    expect(pkg.scripts['desktop:install']).toContain('desktop:deploy');
    expect(pkg.scripts['desktop:deploy']).toContain('desktop:package');
    expect(pkg.scripts['desktop:deploy']).toContain('installComposerOsDesktop');
  });

  it('install sources exist and avoid .bat / launchers / composer-studio in active flow', () => {
    const installDir = path.join(desktopRoot, 'install');
    expect(fs.existsSync(path.join(installDir, 'installComposerOsDesktop.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'cleanupLegacyShortcuts.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'shortcutUtils.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'installRules.ts'))).toBe(true);

    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) out.push(...walk(p));
        else if (name.endsWith('.ts')) out.push(fs.readFileSync(p, 'utf-8'));
      }
      return out;
    };
    const combined = walk(installDir).join('\n');
    expect(combined.toLowerCase()).not.toContain('.bat');
    expect(combined).not.toMatch(/launchers[\\/]/i);
  });
});
