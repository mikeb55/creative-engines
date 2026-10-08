/**
 * V7.2 album inventory and generation.
 * Missing sources are INCOMPLETE. V7.0 and V7.1 outputs are not replaced.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml, type WwhDuoScore } from '../core/wwh/wwhDuoImport';
import { composeWwhPerformance, wwhOutputStem } from '../core/wwh/wwhPerformanceComposerV7';
import { compareLockedSpan } from '../core/wwh/wwhSourceCompare';
import { durationAgreement, quarterPerMinute, type WwhTempoMark } from '../core/wwh/wwhTiming';
import { auditWwhMusicXml } from '../core/wwh/wwhValidate';

export const WWH_V72_SOURCES = [
  '01-Black-Aura-Duo-Leadsheet-V1.1.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
  '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml',
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml',
  '05-Orbit-Duo-Leadsheet-V2.1.musicxml',
  '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml',
  '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml',
] as const;

const OUTPUTS = ['PERFORMANCE', 'RECORDING-LEADSHEET', 'GUITAR-STUDY', 'BASS-PARTNER'] as const;
type OutputName = (typeof OUTPUTS)[number];
type Status = 'PASS' | 'FAIL' | 'INCOMPLETE';

const MSCORE = '/Applications/MuseScore 4.app/Contents/MacOS/mscore';

function protectedBaseline(target: string): boolean {
  const normalized = target.replace(/\\/g, '/');
  if (/\/V7\//.test(normalized) && !/\/V7\.2\//.test(normalized)) return true;
  const base = path.basename(normalized);
  if (/V7\.1/.test(base)) return true;
  if (/V7(?!\.\d)/.test(base)) return true;
  return false;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function formatTempo(mark: WwhTempoMark): string {
  if (mark.beatUnit && mark.perMinute) {
    const dots = mark.dots ? '.'.repeat(mark.dots) : '';
    return `${mark.beatUnit}${dots}=${mark.perMinute} (sound ${quarterPerMinute(mark)})`;
  }
  if (mark.soundTempo) return `sound ${mark.soundTempo}`;
  return '';
}

function inventoryOf(filePath: string, xml: string, score: WwhDuoScore) {
  const measures = [...score.guitar.measures, ...score.bass.measures];
  const unsupported: string[] = [];
  let mismatches = 0;
  let sample = '';
  for (const measure of measures) {
    for (const note of measure.notes) {
      if (durationAgreement(measure.divisions, note.type, note.dots, note.duration, note.timeModification) !== 'mismatch') continue;
      mismatches += 1;
      if (!sample) sample = `bar ${measure.number} ${note.type ?? 'untyped'} dots ${note.dots} duration ${note.duration}`;
    }
  }
  if (mismatches) unsupported.push(`${mismatches} duration/type mismatches (${sample})`);
  if (measures.some((measure) => measure.roundedTuplet)) unsupported.push('rounded tuplet copied, not rewritten');
  if (measures.some((measure) => measure.hasTuplet)) unsupported.push('tuplet');
  if (measures.some((measure) => measure.hasBackup)) unsupported.push('backup voice');
  if (measures.some((measure) => measure.hasRepeat)) unsupported.push('repeat');
  if (measures.some((measure) => measure.hasEnding)) unsupported.push('ending');
  if (measures.some((measure) => measure.implicit)) unsupported.push('pickup');
  if (measures.some((measure) => measure.openTieOut)) unsupported.push('tie leaves a bar');
  return {
    file: path.basename(filePath),
    path: filePath,
    sha256: createHash('sha256').update(xml).digest('hex'),
    bars: score.guitar.measures.length,
    instruments: `${score.guitar.name} + ${score.bass.name}`,
    divisions: unique(score.guitar.measures.map((measure) => String(measure.divisions))).join(', '),
    metres: unique(score.guitar.measures.map((measure) => `${measure.beats}/${measure.beatType}`)).join(', '),
    tempos: unique(score.guitar.measures.map((measure) => formatTempo(measure.tempo)).filter(Boolean)).join(' → '),
    unsupported: unsupported.length ? unsupported.join('; ') : 'none',
  };
}

function outputStatus(options: {
  sourceMissing: boolean;
  emitted: boolean;
  auditOk: boolean;
  gridOk: boolean;
  preservationOk: boolean;
  kind: OutputName;
}): { status: Status; reason: string } {
  if (options.sourceMissing) return { status: 'INCOMPLETE', reason: 'source file missing' };
  if (!options.emitted) return { status: 'INCOMPLETE', reason: 'not written' };
  if (options.kind === 'RECORDING-LEADSHEET' && !options.preservationOk) {
    return { status: 'FAIL', reason: 'locked span does not match the source' };
  }
  if (!options.gridOk) return { status: 'INCOMPLETE', reason: 'source timing grid does not agree' };
  if (!options.auditOk) return { status: 'FAIL', reason: 'generated MusicXML failed the timing audit' };
  if (options.kind === 'RECORDING-LEADSHEET' && options.preservationOk) return { status: 'PASS', reason: 'source span preserved' };
  return { status: 'PASS', reason: 'timing audit passed' };
}

export function runWwhV72Album(options: {
  albumDir: string;
  outputDir: string;
  seed: number;
  render: boolean;
}): number {
  const leadDir = path.join(options.albumDir, '00 - WWH DUO LEADSHEETS');
  fs.mkdirSync(options.outputDir, { recursive: true });
  const inventoryRows: ReturnType<typeof inventoryOf>[] = [];
  const manifest: Array<{ composition: string; output: OutputName; status: Status; reason: string; file: string }> = [];
  const notes: string[] = [];
  const passNames = new Set<string>();

  for (const name of WWH_V72_SOURCES) {
    const sourcePath = path.join(leadDir, name);
    if (!fs.existsSync(sourcePath)) {
      notes.push(`${name}: INCOMPLETE — source file missing`);
      for (const output of OUTPUTS) {
        manifest.push({ composition: name, output, status: 'INCOMPLETE', reason: 'source file missing', file: '' });
      }
      continue;
    }
    const before = fs.readFileSync(sourcePath);
    const xml = before.toString('utf8');
    const beforeSha = createHash('sha256').update(before).digest('hex');
    let score: WwhDuoScore;
    try {
      score = importWwhDuoMusicXml(xml);
    } catch (error) {
      notes.push(`${name}: FAIL — import ${error instanceof Error ? error.message : String(error)}`);
      for (const output of OUTPUTS) {
        manifest.push({ composition: name, output, status: 'FAIL', reason: 'import failed', file: '' });
      }
      continue;
    }
    const row = inventoryOf(sourcePath, xml, score);
    inventoryRows.push(row);
    const gridOk = score.guitar.measures.every((measure) => measure.gridAgrees) && score.bass.measures.every((measure) => measure.gridAgrees);
    const result = composeWwhPerformance({ xml, sourcePath, seed: options.seed, output: 'all', edition: '7.2' });
    const afterSha = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
    if (afterSha !== beforeSha) {
      notes.push(`${name}: FAIL — source bytes changed`);
    }
    const stem = wwhOutputStem(sourcePath, score.title, '7.2');
    const leadsheetXml = result.files.find((file) => file.name.endsWith('-RECORDING-LEADSHEET.musicxml'))?.contents;
    let preservationOk = false;
    if (leadsheetXml) {
      const lead = importWwhDuoMusicXml(leadsheetXml);
      const errors = compareLockedSpan(score.guitar.measures, lead.guitar.measures, 'guitar').concat(
        compareLockedSpan(score.bass.measures, lead.bass.measures, 'bass')
      );
      preservationOk = errors.length === 0 && afterSha === beforeSha;
      if (!preservationOk) notes.push(`${name}: preservation ${errors.slice(0, 6).join(' | ') || 'source bytes changed'}`);
    }
    for (const file of result.files) {
      const target = path.join(options.outputDir, file.name);
      if (path.resolve(target) === path.resolve(sourcePath) || protectedBaseline(target)) {
        throw new Error(`refusing to overwrite ${target}`);
      }
      fs.writeFileSync(target, file.contents);
    }
    for (const output of OUTPUTS) {
      const filename = `${stem}-${output}.musicxml`;
      const written = result.files.find((file) => file.name === filename);
      const audit = written ? auditWwhMusicXml(written.contents, filename) : null;
      const decided = outputStatus({
        sourceMissing: false,
        emitted: Boolean(written),
        auditOk: Boolean(audit?.ok),
        gridOk,
        preservationOk,
        kind: output,
      });
      manifest.push({ composition: name, output, status: decided.status, reason: decided.reason, file: written ? filename : '' });
      if (written && audit && !audit.ok && gridOk) notes.push(`${filename}: ${audit.lines.join(' | ')}`);
    }
    if (OUTPUTS.every((output) => manifest.find((item) => item.composition === name && item.output === output)?.status === 'PASS')) {
      passNames.add(name);
    }
    notes.push(
      `${name}: support ${result.plan.support}${result.plan.supportReasons.length ? ` — ${result.plan.supportReasons.join('; ')}` : ''}`
    );
  }

  const renderJobs: string[] = [];
  const renderPlan: Array<[string, OutputName]> = [
    ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'RECORDING-LEADSHEET'],
    ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'PERFORMANCE'],
    ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', 'RECORDING-LEADSHEET'],
    ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', 'PERFORMANCE'],
  ];
  for (const [name, output] of renderPlan) {
    if (!passNames.has(name)) continue;
    const stem = wwhOutputStem(path.join(leadDir, name), '', '7.2');
    renderJobs.push(path.join(options.outputDir, `${stem}-${output}.musicxml`));
  }
  const renders: string[] = [];
  if (options.render && fs.existsSync(MSCORE)) {
    for (const musicxml of renderJobs) {
      const pdf = musicxml.replace(/\.musicxml$/, '.pdf');
      const log = musicxml.replace(/\.musicxml$/, '.musescore.log');
      const started = Date.now();
      const env = { ...process.env };
      delete env.QT_QPA_PLATFORM;
      const child = spawnSync(MSCORE, ['-o', pdf, musicxml], {
        timeout: 90000,
        env,
        encoding: 'utf8',
      });
      const elapsed = Date.now() - started;
      const pdfExists = fs.existsSync(pdf);
      const pdfBytes = pdfExists ? fs.statSync(pdf).size : 0;
      const exitCode = child.status ?? (child.signal === 'SIGABRT' ? 134 : 'null');
      const line = [
        path.basename(musicxml),
        `exit ${exitCode}`,
        `signal ${child.signal ?? 'none'}`,
        `error ${child.error?.message ?? 'none'}`,
        `pdf ${pdfExists ? pdfBytes : 0} bytes`,
        `${elapsed} ms`,
      ].join(' | ');
      fs.writeFileSync(log, `${line}\n\nSTDOUT\n${child.stdout ?? ''}\n\nSTDERR\n${child.stderr ?? ''}\n`);
      renders.push(line);
    }
  } else if (options.render) {
    renders.push('MuseScore 4 binary missing. No import or playback claimed.');
  }

  const passPieces = WWH_V72_SOURCES.filter((name) =>
    OUTPUTS.every((output) => manifest.find((item) => item.composition === name && item.output === output)?.status === 'PASS')
  );

  const inventory = `# WWH V7.2 source inventory

Album directory: \`${leadDir}\`
Generated: ${new Date().toISOString()}

| File | SHA-256 | Bars | Instruments | Divisions | Metres | Tempo changes | Unsupported |
| --- | --- | --- | --- | --- | --- | --- | --- |
${inventoryRows
  .map(
    (row) =>
      `| ${row.file} | \`${row.sha256}\` | ${row.bars} | ${row.instruments} | ${row.divisions} | ${row.metres} | ${row.tempos || 'none'} | ${row.unsupported} |`
  )
  .join('\n')}

Missing sources are omitted from this table and marked INCOMPLETE in the manifest.
`;

  const manifestTable = `# WWH V7.2 validation

Seed: ${options.seed}
Edition: 7.2
Output: \`${options.outputDir}\`

## Manifest

| Composition | Output | Status | Reason | File |
| --- | --- | --- | --- | --- |
${manifest
  .map((item) => `| ${item.composition} | ${item.output} | ${item.status} | ${item.reason} | ${item.file} |`)
  .join('\n')}

## Compositions with all four outputs PASS

${passPieces.length ? passPieces.map((name) => `- ${name}`).join('\n') : '- none'}

## Notes

${notes.map((line) => `- ${line}`).join('\n')}

## MuseScore 4

${renders.length ? renders.map((line) => `- ${line}`).join('\n') : '- render not requested'}

MuseScore 4 on this Mac is running under Rosetta. The CLI aborts with signal SIGABRT, which the shell reports as exit 134. The message is \`mutex lock failed: Invalid argument\`. Forcing \`QT_QPA_PLATFORM=offscreen\` aborts earlier, because the only installed platform plugin is cocoa, and no PDF is written. A later cocoa run can leave a PDF on disk and still exit 134. That PDF is not an import proof and not a playback result.
No GCE score and no listening result is claimed.
`;

  const report = `# WWH V7.2 portability report

V7.2 is a timing and portability repair of the V7.1 checkpoint. It is not a new musical engine.
Curated Black Aura V7.0 and V7.1 stay behind \`--edition 7.0\` and \`--edition 7.1\`.
V7.2 does not choose musical material from the composition title.

## What changed

- Generated durations are fractions of a quarter, scaled to the source divisions.
- Metre, key, clef, transpose, divisions, and tempo are restated when a generated bar follows a copied bar that differs.
- A dotted-quarter metronome mark stays on the dotted quarter. Sound tempo is quarter notes per minute.
- Development is not inserted after an unresolved tie, a repeat, or an ending.
- Performance and study files are labelled EXPERIMENTAL TECHNICAL SKETCHES.
- Missing album files are INCOMPLETE.

## Results

Compositions with all four outputs PASS: ${passPieces.length}
${passPieces.map((name) => `- ${name}`).join('\n')}

## Reproduce

\`\`\`bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceV72Timing.test.ts
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceComposerV7.test.ts
npm run wwh:performance-v7 -- --batch --album-dir "${options.albumDir}" --output-dir "${options.outputDir}" --seed ${options.seed}
\`\`\`

Portable timing tests do not read the album. The album command reads the nine leadsheets and writes only under the V7.2 directory.
`;

  fs.writeFileSync(path.join(options.outputDir, 'WWH-V7.2-SOURCE-INVENTORY.md'), inventory);
  fs.writeFileSync(path.join(options.outputDir, 'WWH-V7.2-VALIDATION.md'), manifestTable);
  fs.writeFileSync(path.join(options.outputDir, 'WWH-V7.2-PORTABILITY-REPORT.md'), report);
  const repoReports = fs.existsSync(path.resolve(process.cwd(), 'core/wwh'))
    ? path.resolve(process.cwd(), 'reports/wwh-v72')
    : path.resolve(process.cwd(), 'engines/composer-os-v2/reports/wwh-v72');
  fs.mkdirSync(repoReports, { recursive: true });
  for (const filename of ['WWH-V7.2-SOURCE-INVENTORY.md', 'WWH-V7.2-VALIDATION.md', 'WWH-V7.2-PORTABILITY-REPORT.md']) {
    fs.copyFileSync(path.join(options.outputDir, filename), path.join(repoReports, filename));
  }
  const failed = manifest.some((item) => item.status === 'FAIL');
  const incomplete = manifest.some((item) => item.status === 'INCOMPLETE');
  console.log(inventory);
  console.log(manifestTable);
  if (failed) return 1;
  if (incomplete) return 2;
  return 0;
}
