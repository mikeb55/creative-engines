/**
 * Batch E GUI acceptance after the targeted repair.
 * Three isolated runs. Each run uses its own BHL export directory via the API already pointed there.
 * Usage: node engines/composer-os-v2/scripts/bhlTargetedRepairAcceptance.mjs <baseUrl> <runId>
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2];
const runId = process.argv[3];
const exportDir = process.argv[4];
if (!baseUrl || !runId || !exportDir) {
  console.error('usage: node bhlTargetedRepairAcceptance.mjs <baseUrl> <runId> <exportDir>');
  process.exit(2);
}

const source =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';
const seed = 3340 + Number(runId);
const log = [];
function note(message) {
  log.push(message);
  console.log(message);
}

async function setInput(locator, value) {
  await locator.waitFor();
  await locator.evaluate((el, next) => {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto.set.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

function guitarPitches(xml) {
  const part = xml.split('<part id="G">')[1]?.split('</part>')[0] ?? xml;
  return (part.match(/<pitch>/g) ?? []).length;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(60000);
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

try {
  await page.goto(`${baseUrl}#/bhl`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('bhl-page').waitFor();
  await page.getByTestId('bhl-world').waitFor();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="bhl-source"]');
    return el instanceof HTMLInputElement && el.value.includes('.musicxml');
  });
  await setInput(page.getByTestId('bhl-source'), source);
  await setInput(page.getByTestId('bhl-from'), '33');
  await setInput(page.getByTestId('bhl-to'), '40');
  await setInput(page.getByTestId('bhl-seed'), String(seed));
  await page.getByTestId('bhl-import-lock').click();
  await page.getByTestId('bhl-lock').waitFor();
  note('imported and locked');

  await page.locator('[data-testid="bhl-profile"] option[value="colour-field"]').waitFor({ state: 'attached' });
  await page.getByTestId('bhl-world').selectOption('E');
  await page.getByTestId('bhl-profile').selectOption('colour-field');
  await page.getByTestId('bhl-resources').locator('summary').click();
  await page.getByTestId('bhl-pentatonic-on').check();
  await page.getByTestId('bhl-archetype').selectOption('suspended_pentatonic');
  await page.getByTestId('bhl-reference').selectOption('D');
  await page.getByTestId('bhl-contrast').selectOption('hirajoshi');
  await page.getByTestId('bhl-pitch-source').selectOption('riff');
  await page.getByTestId('bhl-rhythm-source').selectOption('bhl');
  note('world, style, pentatonic, and independent riff pitch/rhythm set');

  await page.getByTestId('bhl-candidates-generate').click();
  await page.getByTestId('bhl-candidate').nth(2).waitFor();
  const candidateCount = await page.getByTestId('bhl-candidate').count();
  if (candidateCount < 3) throw new Error(`expected 3 candidates, saw ${candidateCount}`);
  note(`generated ${candidateCount} candidates`);

  await page.getByTestId('bhl-compare').click();
  await page.getByTestId('bhl-compare-text').waitFor();
  const compared = await page.getByTestId('bhl-compare-text').innerText();
  if (!compared.includes('attacks')) throw new Error(`comparison did not read stored MusicXML: ${compared}`);
  note('compared stored MusicXML');

  const beforeRefine = await page.getByTestId('bhl-candidate').count();
  await page.getByTestId('bhl-refine').click();
  await page.waitForFunction(
    (count) => document.querySelectorAll('[data-testid="bhl-candidate"]').length > count,
    beforeRefine,
  );
  const afterRefine = await page.getByTestId('bhl-candidate').count();
  if (afterRefine !== beforeRefine + 1) throw new Error(`refine replaced the list: ${beforeRefine} -> ${afterRefine}`);
  note('refined and kept the parent candidate');

  const projectId = `bhl-repair-run-${runId}`;
  await setInput(page.getByTestId('bhl-project-id'), projectId);
  await page.getByTestId('bhl-save-project').click();
  await page.getByTestId('bhl-status').filter({ hasText: 'Saved ' }).waitFor();
  const savedStatus = await page.getByTestId('bhl-status').innerText();
  const projectPath = savedStatus.replace(/^Saved\s+/, '').trim();
  if (!projectPath.endsWith('.bhl.json')) throw new Error(`save did not report a project path: ${savedStatus}`);
  note(`saved ${projectPath}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('bhl-world').waitFor({ timeout: 15000 });
  note('world control present after reload');

  await setInput(page.getByTestId('bhl-project-path'), projectPath);
  await page.getByTestId('bhl-open-project').click();
  await page.getByTestId('bhl-status').filter({ hasText: 'Harmonic world E restored' }).waitFor();
  const world = await page.getByTestId('bhl-world').inputValue();
  const pitch = await page.getByTestId('bhl-pitch-source').inputValue();
  const rhythm = await page.getByTestId('bhl-rhythm-source').inputValue();
  const pentOn = await page.getByTestId('bhl-pentatonic-on').isChecked();
  const archetype = await page.getByTestId('bhl-archetype').inputValue();
  if (world !== 'E' || pitch !== 'riff' || rhythm !== 'bhl' || !pentOn || archetype !== 'suspended_pentatonic') {
    throw new Error(`restored settings world=${world} pitch=${pitch} rhythm=${rhythm} pent=${pentOn} colour=${archetype}`);
  }
  note('reopened project restored world E, riff pitch, BHL rhythm, and suspended pentatonic');

  await page.getByTestId('bhl-generate').click();
  await page.getByTestId('bhl-export').waitFor();
  await page.getByTestId('bhl-status').filter({ hasText: 'Generated' }).waitFor();
  if (await page.getByTestId('bhl-export').isDisabled()) {
    const status = await page.getByTestId('bhl-status').innerText();
    throw new Error(`export stayed disabled after generate: ${status}`);
  }
  await page.getByTestId('bhl-export').click();
  await page.getByTestId('bhl-output').waitFor();
  const importedExport = await page.getByTestId('bhl-output').innerText();
  note(`exported ${importedExport}`);

  await page.getByTestId('bhl-mode').selectOption('scratch');
  await setInput(page.getByTestId('bhl-seed'), String(seed));
  await setInput(page.getByTestId('bhl-scratch-bars'), '16');
  await setInput(page.getByTestId('bhl-scratch-beats'), '4');
  await setInput(page.getByTestId('bhl-scratch-type'), '4');
  await setInput(page.getByTestId('bhl-scratch-tempo'), '92');
  await page.getByTestId('bhl-scratch-create').click();
  await page.getByTestId('bhl-status').filter({ hasText: 'New score' }).waitFor();
  await page.getByTestId('bhl-import-lock').click();
  await page.getByTestId('bhl-lock').waitFor();
  await page.getByTestId('bhl-world').selectOption('A');
  await page.getByTestId('bhl-pitch-source').selectOption('world');
  await page.getByTestId('bhl-rhythm-source').selectOption('bhl');
  await page.getByTestId('bhl-resources').locator('summary').click();
  await page.getByTestId('bhl-pentatonic-on').uncheck();
  await page.getByTestId('bhl-generate').click();
  await page.getByTestId('bhl-status').filter({ hasText: 'Generated' }).waitFor();
  if (await page.getByTestId('bhl-export').isDisabled()) {
    throw new Error(`scratch export disabled: ${await page.getByTestId('bhl-status').innerText()}`);
  }
  await page.getByTestId('bhl-export').click();
  await page.getByTestId('bhl-output').waitFor();
  const scratchExport = (await page.getByTestId('bhl-output').innerText()).trim();
  const xml = fs.readFileSync(scratchExport, 'utf8');
  const pitches = guitarPitches(xml);
  if (pitches < 8) throw new Error(`scratch export guitar pitches ${pitches} in ${scratchExport}`);
  if (!xml.includes('<per-minute>92</per-minute>')) throw new Error('scratch export tempo is not 92');
  note(`scratch export has ${pitches} guitar pitches at ${scratchExport}`);

  if (!importedExport.startsWith(exportDir) && !scratchExport.startsWith(exportDir)) {
    note(`warning: exports are not under ${exportDir}`);
  }
  if (consoleErrors.length) note(`console errors: ${consoleErrors.slice(0, 5).join(' | ')}`);
  const receipt = path.join(exportDir, `acceptance-run-${runId}.txt`);
  fs.mkdirSync(exportDir, { recursive: true });
  fs.writeFileSync(receipt, `${log.join('\n')}\nPASS\n`);
  note(`PASS run ${runId}`);
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  const uiError = await page.getByTestId('bhl-error').innerText().catch(() => '');
  const uiStatus = await page.getByTestId('bhl-status').innerText().catch(() => '');
  note(`FAIL run ${runId}: ${message}`);
  if (uiError) note(`ui error: ${uiError}`);
  if (uiStatus) note(`ui status: ${uiStatus}`);
  if (consoleErrors.length) note(`console: ${consoleErrors.slice(0, 8).join(' | ')}`);
  const shot = path.join(exportDir, `acceptance-run-${runId}-fail.png`);
  fs.mkdirSync(exportDir, { recursive: true });
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(exportDir, `acceptance-run-${runId}.txt`), `${log.join('\n')}\nFAIL\n${message}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
