/**
 * Packaged desktop launch must default to full composer-os-app UI, not musician shell.
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
    const isFullUiIdx = main.indexOf('function isFullUiEnabled()');
    expect(isFullUiIdx).toBeGreaterThan(loadEnvIdx);
  });

  it('launchApp loads verified resources/ui when full UI enabled, musician only as fallback', () => {
    expect(main).toContain('const fullUiEnabled = isFullUiEnabled();');
    expect(main).toContain('const uiPath = resolveUiPath();');
    expect(main).toContain('verifyUiBundleAtPath(uiPath)');
    expect(main).toContain("path.join(uiPath, 'index.html')");
    expect(main).toContain('await win.loadFile(indexHtml)');
    expect(main).toContain('resolveMusicianUiIndexPath()');
    expect(main).toContain('await win.loadFile(musicianIndex)');

    const fullUiBlock = main.slice(main.indexOf('if (fullUiEnabled)'), main.indexOf('cachedUiStamp = null'));
    expect(fullUiBlock).toContain('verifyUiBundleAtPath');
    expect(fullUiBlock).not.toContain('musicianIndex');

    const musicianFallback = main.slice(main.indexOf('cachedUiStamp = null'));
    expect(musicianFallback).toContain('resolveMusicianUiIndexPath()');
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