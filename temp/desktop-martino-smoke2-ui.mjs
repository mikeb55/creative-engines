import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.resolve('temp/desktop-smoke');
fs.mkdirSync(outDir, { recursive: true });

let browser;
try {
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
} catch (e) {
  console.error('CDP connect failed — launch Composer-OS.exe --remote-debugging-port=9222');
  process.exit(1);
}

const page = browser.contexts()[0]?.pages()[0];
if (!page) {
  console.error('No page');
  process.exit(1);
}

await page.locator('select').first().selectOption('martino_linear');
await page.waitForTimeout(400);
await page.locator('#martino-tune-name').fill('TestSmoke2');
await page.locator('label:has-text("Manual entry") input[type="radio"]').check();
await page.locator('input[placeholder="Dm7 G7 Cmaj7 Cmaj7"]').fill('Dm7 G7 Cmaj7 Cmaj7');

const drum = page.getByLabel('Generate drum guide (SD3)');
if (await drum.isChecked()) await drum.uncheck();

const genBtn = page.locator('section').getByRole('button', { name: /^Generate$/ });
await genBtn.click();

await page.getByRole('button', { name: /Generating/i }).waitFor({ timeout: 5000 }).catch(() => {});

let uiStatus = 'timeout';
try {
  await page.getByText(/TestSmoke2 generated/i).waitFor({ timeout: 120000 });
  uiStatus = 'success';
} catch {
  const fail = await page.getByText(/Generation failed/i).count();
  if (fail > 0) uiStatus = 'failed';
}

const panelText = await page.locator('[role="status"]').allTextContents();
const bodyHas = await page.evaluate(() => document.body.innerText.includes('TestSmoke2 generated'));

await page.evaluate(() => {
  const el = document.evaluate(
    "//*[contains(text(),'generated')]",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  el?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, '08-testsmoke2-ui-result.png'), fullPage: true });

console.log(JSON.stringify({ uiStatus, bodyHas, panelText, screenshot: path.join(outDir, '08-testsmoke2-ui-result.png') }, null, 2));
await browser.close();
