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
    title: 'TestSmoke',
    chordProgressionText: 'Dm7 G7 Cmaj7 Cmaj7',
    martinoConfig: {
      enabled: true,
      tune: 'TestSmoke',
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

fs.writeFileSync(path.join(outDir, 'api-result.json'), JSON.stringify(apiResult, null, 2));

// Trigger UI state via clicking Generate after IPC (optional) — reload page first for clean UI
await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
await page.locator('select').first().selectOption('martino_linear');
await page.locator('#martino-tune-name').fill('TestSmoke');
await page.locator('label:has-text("Manual entry") input[type="radio"]').check();
await page.locator('input[placeholder="Dm7 G7 Cmaj7 Cmaj7"]').fill('Dm7 G7 Cmaj7 Cmaj7');
await page.getByRole('button', { name: /^Generate$/i }).first().click();

await page.waitForTimeout(35000);

const panelText = await page.locator('[role="status"]').allTextContents().catch(() => []);
await page.screenshot({ path: path.join(outDir, '06-packaged-exe-result.png'), fullPage: true });

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
      panelText,
      screenshot: path.join(outDir, '06-packaged-exe-result.png'),
    },
    null,
    2
  )
);

await browser.close();
