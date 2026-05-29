import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.resolve('temp/desktop-smoke');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0]?.pages()[0];
if (!page) {
  console.error('No page');
  process.exit(1);
}

const apiResult = await page.evaluate(async () => {
  const w = window;
  if (!w.composerOsDesktop?.invokeApi) {
    return { ok: false, error: 'no composerOsDesktop' };
  }
  const body = {
    presetId: 'martino_linear',
    title: 'TestSmoke2',
    chordProgressionText: 'Dm7 G7 Cmaj7 Cmaj7',
    martinoConfig: {
      enabled: true,
      tune: 'TestSmoke2',
      progression: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
      dominantTensionDefault: 'low',
      activeActivity: 'A1_LINEAR_CORE',
      secondaryActivities: ['A2_DIAGONAL_BRIDGE', 'A3_PIVOT_CELL', 'A4_ANCHOR_ARP'],
      choruses: 1,
      asteriskMeasures: [],
      lfv: { min_fret: 5, max_fret: 9 },
      mode: 'teaching',
    },
  };
  try {
    const r = await w.composerOsDesktop.invokeApi('composer-os-api:generate', body);
    return { ok: true, r };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

fs.writeFileSync(path.join(outDir, 'api-result-smoke2.json'), JSON.stringify(apiResult, null, 2));

await page.locator('select').first().selectOption('martino_linear');
await page.locator('#martino-tune-name').fill('TestSmoke2');
await page.locator('label:has-text("Manual entry") input[type="radio"]').check();
await page.locator('input[placeholder="Dm7 G7 Cmaj7 Cmaj7"]').fill('Dm7 G7 Cmaj7 Cmaj7');
await page.getByRole('button', { name: /^Generate$/i }).first().click();

const success = page.getByText(/TestSmoke2 generated/i);
const failed = page.getByText(/Generation failed/i);
await Promise.race([
  success.waitFor({ timeout: 90000 }),
  failed.waitFor({ timeout: 90000 }),
]).catch(() => {});

const panelText = await page.locator('[role="status"]').allTextContents().catch(() => []);
await page.locator('text=TestSmoke2 generated').scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: path.join(outDir, '07-testsmoke2-result.png'), fullPage: true });

const prov = apiResult.ok ? apiResult.r?.runManifest?.martinoProvenance : null;
console.log(
  JSON.stringify(
    {
      apiSuccess: apiResult.ok && apiResult.r?.success,
      apiError: apiResult.ok ? apiResult.r?.error : apiResult.error,
      filepath: apiResult.ok ? apiResult.r?.filepath : null,
      martinoGceOverall: prov?.martinoGceOverall,
      gce_gate_failed: prov?.gce_gate_failed,
      martinoGce: prov?.martinoGce,
      uiStatus: (await success.count()) > 0 ? 'success' : (await failed.count()) > 0 ? 'failed' : 'timeout',
      panelText,
      screenshot: path.join(outDir, '07-testsmoke2-result.png'),
    },
    null,
    2
  )
);

await browser.close();
