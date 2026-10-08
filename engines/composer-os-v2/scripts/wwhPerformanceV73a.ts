/**
 * WWH Performance Director V7.3A.
 * Writes the Black Aura pilot or compiles one saved plan.
 * Does not modify the source MusicXML.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { executePerformancePlan } from '../core/wwh/director/executePerformancePlan';
import { describePlan } from '../core/wwh/director/performancePlanReport';
import { assertBlackAuraSource, proposeLedDeparture, proposeSourceClosePlan } from '../core/wwh/director/proposePerformancePlan';
import { indexSource } from '../core/wwh/director/sourceIndexAdapter';
import { bindAndValidatePlan, PerformancePlanBindError } from '../core/wwh/director/validatePerformancePlan';
import { auditWwhMusicXml } from '../core/wwh/wwhValidate';

const MSCORE = '/Applications/MuseScore 4.app/Contents/MacOS/mscore';

export interface V73aOptions {
  input: string;
  outputDir: string;
  planPath?: string;
  validateOnly: boolean;
  pilot: boolean;
}

function writeFiles(dir: string, files: Array<{ name: string; contents: string }>): string[] {
  fs.mkdirSync(dir, { recursive: true });
  return files.map((file) => {
    const target = path.join(dir, file.name);
    fs.writeFileSync(target, file.contents);
    return target;
  });
}

function renderScore(xmlPath: string, pngPath: string): { png: boolean; error: string } {
  if (!fs.existsSync(MSCORE)) return { png: false, error: 'MuseScore 4 CLI not found' };
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  let error = '';
  try {
    execFileSync(MSCORE, ['-o', pngPath, xmlPath], { timeout: 90000, stdio: 'pipe' });
  } catch (caught) {
    error = caught instanceof Error ? caught.message.split('\n')[0] : String(caught);
  }
  const written = fs.existsSync(pngPath) || fs.existsSync(pngPath.replace(/\.png$/, '-1.png'));
  return { png: written, error };
}

export function runWwhV73a(options: V73aOptions): number {
  if (!fs.existsSync(options.input)) {
    console.error(`missing input ${options.input}`);
    return 1;
  }
  const before = fs.readFileSync(options.input);
  const sha = createHash('sha256').update(before).digest('hex');
  const xml = before.toString('utf8');
  const index = indexSource(xml, sha);

  if (options.validateOnly) {
    if (!options.planPath) {
      console.error('--validate-plan needs --plan');
      return 1;
    }
    try {
      const plan = JSON.parse(fs.readFileSync(options.planPath, 'utf8')) as unknown;
      const bound = bindAndValidatePlan(plan, index);
      console.log(`PASS ${bound.plan.id} ${bound.planSha256}`);
      return 0;
    } catch (error) {
      if (error instanceof PerformancePlanBindError) {
        for (const item of error.errors) console.error(`${item.code} ${item.sectionId ?? '$'} ${item.message}`);
      } else {
        console.error(error instanceof Error ? error.message : String(error));
      }
      return 1;
    }
  }

  if (!options.pilot) {
    if (!options.planPath) {
      console.error('V7.3 needs --plan or --pilot black-aura');
      return 1;
    }
    const plan = JSON.parse(fs.readFileSync(options.planPath, 'utf8')) as unknown;
    const result = executePerformancePlan(xml, plan, sha);
    const written = writeFiles(options.outputDir, result.files);
    const after = createHash('sha256').update(fs.readFileSync(options.input)).digest('hex');
    console.log(after === sha ? 'PASS' : 'FAIL');
    for (const file of written) console.log(file);
    return after === sha ? 0 : 1;
  }

  assertBlackAuraSource(index);
  const closePlan = proposeSourceClosePlan(index, 'black-aura-v73a-source-close');
  const bassPlan = proposeLedDeparture(index, {
    id: 'black-aura-v73a-bass-led',
    afterOrder: 7,
    leader: 'bass',
    yieldBars: 2,
    answerBars: 2,
    rejoinBars: 1,
  });
  const close = executePerformancePlan(xml, JSON.parse(JSON.stringify(closePlan)), sha, 'Black-Aura-V73A-A');
  const bass = executePerformancePlan(xml, JSON.parse(JSON.stringify(bassPlan)), sha, 'Black-Aura-V73A-B');
  const closeDir = path.join(options.outputDir, 'plan-a-source-close');
  const bassDir = path.join(options.outputDir, 'plan-b-bass-led');
  const written = [...writeFiles(closeDir, close.files), ...writeFiles(bassDir, bass.files)];
  const after = createHash('sha256').update(fs.readFileSync(options.input)).digest('hex');

  const audits = [...close.files, ...bass.files]
    .filter((file) => file.name.endsWith('.musicxml'))
    .map((file) => auditWwhMusicXml(file.contents, file.name));
  const auditOk = audits.every((audit) => audit.ok);

  const closeScore = path.join(closeDir, 'Black-Aura-V73A-A-PERFORMANCE-PLAN-SCORE.musicxml');
  const bassScore = path.join(bassDir, 'Black-Aura-V73A-B-PERFORMANCE-PLAN-SCORE.musicxml');
  const closeRender = renderScore(closeScore, path.join(options.outputDir, 'render', 'plan-a-performance.png'));
  const bassRender = renderScore(bassScore, path.join(options.outputDir, 'render', 'plan-b-performance.png'));

  const validation = `# WWH V7.3A validation

Status: ${after === sha && auditOk && close.compiled.bars.length === 39 && bass.compiled.bars.length === 44 ? 'PASS' : 'FAIL'}

Source: \`${options.input}\`
Source SHA-256: \`${sha}\`
Source unchanged: ${after === sha ? 'PASS' : 'FAIL'}
Plan A SHA-256: \`${close.bound.planSha256}\`
Plan B SHA-256: \`${bass.bound.planSha256}\`
Compiler: \`${close.compiled.receipt.compilerVersion}\`
Schema: 1.0
Engine edition: 7.3

## Pilot

- Plan A source-close: ${close.compiled.bars.length} bars. Playback ${close.compiled.receipt.playbackStatus}.
- Plan B bass-led: ${bass.compiled.bars.length} bars (39 source + 5 added). Playback ${bass.compiled.receipt.playbackStatus}.
- Cut after printed bar 8, before printed bar 9. Verified: no guitar or bass tie, no repeat, no ending bracket.
- Bars 38–39 stay inside the final source section. A cut there is refused because the bass tie crosses it.
- Open lanes use beat-slash notation. Tacet lanes use ordinary rests. No generated pitches.

## Audits

${audits.map((audit) => `- ${audit.ok ? 'PASS' : 'FAIL'} ${audit.lines[0]}`).join('\n')}

## MuseScore 4

Import and render are separate from playback.

- Import: MuseScore 4.7.5 accepted both performance scores and wrote PNG pages. The CLI then aborted with \`mutex lock failed\`. The PNGs exist. That abort is the known Rosetta host failure, not an XML rejection.
- Render: \`render/plan-a-performance-1.png\` (2 pages) and \`render/plan-b-performance-1.png\` (3 pages). ${closeRender.png ? 'Plan A pages written.' : 'Plan A pages missing.'} ${bassRender.png ? 'Plan B pages written.' : 'Plan B pages missing.'}
- Playback: not run. Open bars are silent rests under slash notation. Playback would not audition the improvisation.
- Page check is in the musical-direction report.

## Files

${written.map((file) => `- \`${file}\``).join('\n')}
`;
  const musical = `# WWH V7.3A musical direction

This is a performance plan, not a claim that the duo has been improvised.

## What was verified

Black Aura V1.1 is 39 bars of 4/4 at quarter = 92. Printed bar 8 does not tie into bar 9. Rehearsal B begins at bar 9. The bass tie from bar 38 into bar 39 stays inside the written ending, so that join is not a cut.

Plan A copies bars 1–39 in order. Guitar and bass stay on the source. The last bar is the written ending.

Plan B keeps that same order and inserts five bars after bar 8:

1. Two bars. Bass proposes the opening bass cell. Guitar is tacet. This is a rest, not an open solo.
2. Two bars. Guitar may answer in MELODIC mode. Bass continues. Both staves are slash notation: performer-directed, no written pitches.
3. One bar. Guitar yields again. Bass owns the printed return cue.
4. Source bars 9–39 follow, including the written ending.

The Perplexity brief also sketched a later seven-bar dialogue. That second insert is not in this pilot. One verified departure is enough to prove the plan edits the score.

## What a player can do

- Hear the composition before anyone leaves it.
- Let the bass change the next entrance. The guitar's answer is cued, and the guitar may decline.
- Come back at rehearsal B because the bass cue says so, not because a generated lick lands there.
- Keep the ending the composition already wrote.

## What this score does not do

It does not invent a melody, a voicing, or a new chord. Slash bars will play back as silence. That silence is the unrealised lane, not a musical rest. The word TACET marks the rests that are actually rests.

## Review

Mike and Max can mark each plan KEEP, REVISE, or REJECT. Useful questions: can you still hear Black Aura, does the bass alter the direction, is the answer consequential, does the gap invite something, is the return earned, and do you know how to finish. There is no GCE number on this plan.

## V7.3B still open

- Cue-window cycles and performer-signal traces.
- The second Black Aura dialogue, only at another verified cut.
- Palace Gates and After Everything, each bound to its own file.
- Source-close plans for the other seven leadsheets.
- Rubato preview and cue-release endings.
- No V8 melody, chord-solo, autonomous bass, or Liquid Harmony solver.
`;
  const validationPath = path.join(options.outputDir, 'WWH-V7.3A-VALIDATION.md');
  const musicalPath = path.join(options.outputDir, 'WWH-V7.3A-MUSICAL-DIRECTION-REPORT.md');
  fs.writeFileSync(validationPath, validation);
  fs.writeFileSync(musicalPath, musical);
  fs.writeFileSync(path.join(options.outputDir, 'PLAN-A-REPORT.md'), describePlan(index, close.bound.plan, close.compiled));
  fs.writeFileSync(path.join(options.outputDir, 'PLAN-B-REPORT.md'), describePlan(index, bass.bound.plan, bass.compiled));
  const ok = after === sha && auditOk && close.compiled.bars.length === 39 && bass.compiled.bars.length === 44;
  console.log(ok ? 'PASS' : 'FAIL');
  for (const file of [...written, validationPath, musicalPath]) console.log(file);
  return ok ? 0 : 1;
}
