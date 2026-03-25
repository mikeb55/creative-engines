/**
 * Deploy/install entry wiring and repo constraints (static).
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

describe('desktop deploy / install wiring', () => {
  it('package.json defines self-test, clean-install, and packaged-exe verify', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['desktop:clean-install']).toBeDefined();
    expect(pkg.scripts['desktop:self-test-install']).toBeDefined();
    expect(pkg.scripts['desktop:install']).toContain('desktop:clean-install');
    expect(pkg.scripts['desktop:deploy']).toContain('desktop:clean-install');
    expect(pkg.scripts['desktop:clean-install']).toContain('desktop:self-test-install');
    expect(pkg.scripts['desktop:self-test-install']).toContain('desktop:package');
    expect(pkg.scripts['desktop:self-test-install']).toContain('verify:packaged-exe');
    expect(pkg.scripts['desktop:self-test-install']).toContain('installComposerOsDesktop');
    expect(pkg.scripts['desktop:package']).toContain('bumpDesktopVersionCli');
    expect(pkg.scripts['desktop:package']).toContain('pruneOldPortableExesCli');
    expect(pkg.scripts['desktop:package']).toContain('logReleaseArtifactsCli');
    expect(pkg.scripts['desktop:package']).toContain('verifyStableBuildOutputCli');
    expect(pkg.scripts['desktop:install-icon']).toContain('installDesktopIconCli');
    expect(pkg.scripts['desktop:create-shortcut']).toBe(pkg.scripts['desktop:install-icon']);
  });

  it('full install script delegates to installComposerOsDesktopIcon', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'installComposerOsDesktop.ts'), 'utf-8');
    expect(src).toContain('installComposerOsDesktopIcon');
    expect(src).toContain('SHORTCUT_FILE_NAME');
  });

  it('install sources exist and avoid .bat / launchers / composer-studio in active flow', () => {
    const installDir = path.join(desktopRoot, 'install');
    expect(fs.existsSync(path.join(installDir, 'installComposerOsDesktop.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'cleanupLegacyShortcuts.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'shortcutUtils.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'installRules.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'launchInstalledDesktopApp.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'verifyPackagedDesktop.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'bumpDesktopVersionCli.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'pruneOldPortableExesCli.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'verifyStableBuildOutputCli.ts'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'logReleaseArtifactsCli.ts'))).toBe(true);

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
