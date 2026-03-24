/**
 * Desktop config tests
 */
import * as path from 'path';
import * as fs from 'fs';

describe('Desktop config', () => {
  const appRoot = path.resolve(__dirname, '..');
  const resourcesDir = path.join(appRoot, 'resources');

  it('resources directory exists', () => {
    expect(fs.existsSync(resourcesDir)).toBe(true);
  });

  it('packaging config: icon path wired', () => {
    const iconPath = path.join(resourcesDir, 'icon.png');
    expect(fs.existsSync(iconPath)).toBe(true);
  });

  it('packaging config: icon path is valid', () => {
    const iconPath = path.join(resourcesDir, 'icon.png');
    expect(path.isAbsolute(iconPath)).toBe(true);
    expect(iconPath).toContain('icon.png');
  });

  it('package.json has desktop scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['desktop:dev']).toBeDefined();
    expect(pkg.scripts['desktop:build']).toBeDefined();
    expect(pkg.scripts['desktop:package']).toBeDefined();
    expect(pkg.scripts['desktop:clean-install']).toBeDefined();
  });

  it('electron-builder config valid', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf-8'));
    expect(pkg.build).toBeDefined();
    expect(pkg.build.appId).toBe('com.mikeb55.composeros.desktop');
    expect(pkg.build.productName).toBe('Composer OS Desktop');
    expect(pkg.build.win).toBeDefined();
    expect(pkg.build.win.icon).toBeDefined();
  });
});
