/**
 * Packaged desktop launch must use full composer-os-app UI only (no musician shell).
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'node:child_process';
import { mapLeadSheetFileInputResponseToPanelState } from '../../composer-os-app/src/services/leadSheetFileInputDesktop';

const desktopRoot = path.resolve(__dirname, '..');
const mainPath = path.join(desktopRoot, 'electron', 'main.ts');
const uiStampPath = path.join(desktopRoot, 'resources', 'ui', 'composer-os-ui-stamp.json');
const leadSheetPanelPath = path.join(
  desktopRoot,
  '..',
  'composer-os-app',
  'src',
  'components',
  'leadsheet-input',
  'LeadSheetInputDesktopPanel.tsx'
);
const verifyMidiScriptPath = path.join(__dirname, 'verifyMidiLeadSheetAdvisory.ts');

describe('Desktop packaged launch UI (static)', () => {
  const main = fs.readFileSync(mainPath, 'utf-8');

  it('sets COMPOSER_OS_FULL_UI=1 after loadEnv when packaged', () => {
    const loadEnvIdx = main.indexOf('loadEnv();');
    expect(loadEnvIdx).toBeGreaterThan(-1);
    const afterLoadEnv = main.slice(loadEnvIdx, loadEnvIdx + 400);
    expect(afterLoadEnv).toMatch(/app\.isPackaged/);
    expect(afterLoadEnv).toContain("process.env.COMPOSER_OS_FULL_UI = '1'");
  });

  it('launchApp always loads verified resources/ui (no musician shell fallback)', () => {
    expect(main).not.toContain('COMPOSER_OS_MUSICIAN_SHELL');
    expect(main).not.toContain('isFullUiEnabled');
    expect(main).not.toContain('resolveMusicianUiIndexPath');
    expect(main).not.toContain('registerMusicianIpc');
    expect(main).not.toContain('preload-musician');
    expect(main).not.toContain('loadMusicianRegistryAtStartup');
    expect(main).not.toContain('musicianIndex');
    expect(main).not.toContain("from './musicianIpc'");

    expect(main).toContain('const uiPath = resolveUiPath();');
    expect(main).toContain('verifyUiBundleAtPath(uiPath)');
    expect(main).toContain("path.join(uiPath, 'index.html')");
    expect(main).toContain('await win.loadFile(indexHtml)');
    expect(main).toContain("path.join(__dirname, 'preload.js')");
  });

  it('recovers bad file:// route reloads via did-fail-load → loadFile + hash', () => {
    expect(main).toContain('did-fail-load');
    expect(main).toContain('hashFromFailedFileUrl');
    expect(main).toMatch(/loadFile\([\s\S]*hash/);
  });

  it('bundled UI stamp lists Generate/Presets/Outputs (not musician-only shell)', () => {
    expect(fs.existsSync(uiStampPath)).toBe(true);
    const stamp = JSON.parse(fs.readFileSync(uiStampPath, 'utf-8')) as {
      productId: string;
      supportedPages: string[];
    };
    expect(stamp.productId).toBe('composer-os');
    expect(stamp.supportedPages).toEqual(
      expect.arrayContaining(['Generate', 'Presets', 'Outputs'])
    );
  });

  it('single-track MIDI run surfaces harmony inferred advisory for Lead Sheet Input banner', () => {
    const panelSrc = fs.readFileSync(leadSheetPanelPath, 'utf-8');
    expect(panelSrc).toContain('data-testid="leadsheet-harmony-advisory"');
    expect(panelSrc).toContain('data-testid="leadsheet-harmony-override-strip"');
    expect(panelSrc).toContain('data-testid="leadsheet-harmony-override-editor"');
    expect(panelSrc).toContain('Harmony inferred (advisory)');

    const repoRoot = path.join(desktopRoot, '../..');
    const out = execSync(
      `npx tsx --tsconfig ${path.join(repoRoot, 'tsconfig.json')} ${verifyMidiScriptPath}`,
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    expect(out.trim()).toBe('ok');

    const mockMidiResponse = {
      ok: true,
      sourceFormat: 'midi' as const,
      harmonyProvenance: 'inferred-advisory' as const,
      midiQuantizeNote:
        'MIDI input v1: single-track melody only. Melody quantizes to eighth notes; harmony is inferred and advisory.',
    };
    const panelState = mapLeadSheetFileInputResponseToPanelState(mockMidiResponse);
    expect(panelState.advisory).toMatch(/single-track|inferred/i);
  });
});
