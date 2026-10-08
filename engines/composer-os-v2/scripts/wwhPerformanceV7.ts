/**
 * WWH Performance Composer V7.0 CLI.
 *
 * npm run wwh:performance-v7 -- --edition 7.2 --input <musicxml> --output-dir <dir> --seed 7 --outputs all
 * --outputs: performance | leadsheet | guitar_study | bass_partner | all
 * --edition: 7.0 | 7.1 | 7.2. Default 7.2. 7.0 and 7.1 stay curated Black Aura baselines.
 * --plan <json> reads seed and outputType when those flags are omitted.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { composeWwhPerformance } from '../core/wwh/wwhPerformanceComposerV7';
import type { WwhEdition, WwhOutputKind } from '../core/wwh/wwhPerformanceTypes';
import { auditWwhMusicXml } from '../core/wwh/wwhValidate';
import { runWwhV72Album } from './wwhPerformanceV72Album';

const DEFAULT_INPUT =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V1.1.musicxml';
const DEFAULT_OUTPUT = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V7.2';

function isProtectedBaseline(target: string): boolean {
  const normalized = target.replace(/\\/g, '/');
  if (/\/V7\//.test(normalized) && !/\/V7\.2\//.test(normalized)) return true;
  const base = path.basename(normalized);
  if (/V7\.1/.test(base)) return true;
  if (/V7(?!\.\d)/.test(base)) return true;
  return false;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const OUTPUTS = new Set<WwhOutputKind>(['performance', 'leadsheet', 'guitar_study', 'bass_partner', 'all']);

function main(): void {
  if (process.argv.includes('--batch')) {
    const code = runWwhV72Album({
      albumDir: path.resolve(flag('album-dir') ?? '/Users/user/Documents/DEVS/ECM-Album-Nov-2027'),
      outputDir: path.resolve(flag('output-dir') ?? DEFAULT_OUTPUT),
      seed: flag('seed') ? Number(flag('seed')) : 7,
      render: !process.argv.includes('--no-render'),
    });
    process.exitCode = code;
    return;
  }
  const input = path.resolve(flag('input') ?? DEFAULT_INPUT);
  const outputDir = path.resolve(flag('output-dir') ?? DEFAULT_OUTPUT);
  const planPath = flag('plan');
  let seed = flag('seed') ? Number(flag('seed')) : 7;
  let outputs = (flag('outputs') ?? 'all') as WwhOutputKind;
  if (planPath) {
    const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8')) as {
      seed?: number;
      outputType?: WwhOutputKind;
    };
    if (!flag('seed') && typeof plan.seed === 'number') seed = plan.seed;
    if (!flag('outputs') && plan.outputType && OUTPUTS.has(plan.outputType)) outputs = plan.outputType;
  }
  if (!OUTPUTS.has(outputs)) throw new Error(`unknown --outputs ${outputs}`);
  if (!Number.isFinite(seed)) throw new Error('seed must be a number');
  if (!fs.existsSync(input)) throw new Error(`missing input ${input}`);
  const before = fs.readFileSync(input);
  const beforeSha = createHash('sha256').update(before).digest('hex');
  const xml = before.toString('utf8');
  const editionFlag = flag('edition');
  const edition: WwhEdition = editionFlag === '7.0' || editionFlag === '7.1' || editionFlag === '7.2' ? editionFlag : '7.2';
  const result = composeWwhPerformance({ xml, sourcePath: input, seed, output: outputs, edition });
  fs.mkdirSync(outputDir, { recursive: true });
  const written: string[] = [];
  for (const file of result.files) {
    const target = path.join(outputDir, file.name);
    if (path.resolve(target) === input) throw new Error('refusing to overwrite the source MusicXML');
    if (isProtectedBaseline(target)) throw new Error(`refusing to overwrite V7.0 or V7.1 baseline ${target}`);
    fs.writeFileSync(target, file.contents);
    written.push(target);
  }
  const afterSha = createHash('sha256').update(fs.readFileSync(input)).digest('hex');
  const checks = [
    `source unchanged ${beforeSha === afterSha ? 'PASS' : 'FAIL'} ${beforeSha}`,
    `plan sections ${result.plan.sections.length}`,
  ];
  let auditOk = beforeSha === afterSha;
  for (const file of result.files) {
    if (!file.name.endsWith('.musicxml')) continue;
    const audit = auditWwhMusicXml(file.contents, file.name);
    checks.push(...audit.lines, `${file.name} audit ${audit.ok ? 'PASS' : 'FAIL'}`);
    auditOk = auditOk && audit.ok;
  }
  const validationName = result.files.find((file) => file.name.endsWith('PERFORMANCE-PLAN.json'))
    ? result.files.find((file) => file.name.endsWith('.musicxml'))!.name.replace(/-PERFORMANCE\.musicxml|-RECORDING-LEADSHEET\.musicxml|-GUITAR-STUDY\.musicxml|-BASS-PARTNER\.musicxml/, '')
    : 'WWH-V7';
  const stem = path.basename(result.files.find((file) => file.name.endsWith('-PERFORMANCE-PLAN.json'))!.name).replace(
    '-PERFORMANCE-PLAN.json',
    ''
  );
  const validation = `# ${result.plan.title} — V${result.plan.version} validation

Source: \`${input}\`
SHA-256: \`${beforeSha}\`
Seed: ${seed}
Edition: ${result.plan.version}
Outputs: ${outputs}
Source unchanged: ${beforeSha === afterSha ? 'PASS' : 'FAIL'}

## Checks

${checks.map((line) => `- ${line}`).join('\n')}

## Files

${written.map((file) => `- \`${file}\``).join('\n')}

## Limitations

${result.plan.limitations.map((line) => `- ${line}`).join('\n')}

Support: ${result.plan.support}
${result.plan.supportReasons.map((line) => `- ${line}`).join('\n')}

MuseScore 4 was not opened by this command. A PDF from a later render is not playback and is not an import proof.
`;
  const validationPath = path.join(outputDir, `${stem}-VALIDATION.md`);
  fs.writeFileSync(validationPath, validation);
  written.push(validationPath);
  const status = !auditOk && result.plan.support === 'pass' ? 'FAIL' : !auditOk || result.plan.support === 'incomplete' ? 'INCOMPLETE' : 'PASS';
  console.log(status);
  for (const file of written) console.log(file);
  if (status === 'FAIL') process.exitCode = 1;
  if (status === 'INCOMPLETE') process.exitCode = 2;
  void validationName;
}

main();
