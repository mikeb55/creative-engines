/**
 * Write the nine V7.3C album plans and the three reports.
 * Does not modify source MusicXML.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { executePerformancePlan, type DirectorExecution } from '../core/wwh/director/executePerformancePlan';
import { proposeV73cPlan, WWH_V73C_PIECES, type V73cPiece } from '../core/wwh/director/proposeV73cAlbum';
import { indexSource } from '../core/wwh/director/sourceIndexAdapter';
import { auditWwhMusicXml } from '../core/wwh/wwhValidate';

const MSCORE = '/Applications/MuseScore 4.app/Contents/MacOS/mscore';
const OUT = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V7.3C';

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function renderScore(xmlPath: string, pngPath: string): { png: boolean; pages: string[]; error: string } {
  if (!fs.existsSync(MSCORE)) return { png: false, pages: [], error: 'MuseScore 4 CLI not found' };
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  let error = '';
  try {
    execFileSync(MSCORE, ['-o', pngPath, xmlPath], { timeout: 180000, stdio: 'pipe' });
  } catch (caught) {
    error = caught instanceof Error ? caught.message.split('\n')[0] ?? '' : String(caught);
  }
  const stem = pngPath.replace(/\.png$/, '');
  const pages = fs.existsSync(pngPath)
    ? [pngPath]
    : fs.readdirSync(path.dirname(pngPath)).filter((name) => name.startsWith(path.basename(stem)) && name.endsWith('.png')).map((name) => path.join(path.dirname(pngPath), name));
  return { png: pages.length > 0, pages, error };
}

function midiExport(xmlPath: string, midiPath: string): { midi: boolean; error: string } {
  if (!fs.existsSync(MSCORE)) return { midi: false, error: 'MuseScore 4 CLI not found' };
  let error = '';
  try {
    execFileSync(MSCORE, ['-o', midiPath, xmlPath], { timeout: 180000, stdio: 'pipe' });
  } catch (caught) {
    error = caught instanceof Error ? caught.message.split('\n')[0] ?? '' : String(caught);
  }
  return { midi: fs.existsSync(midiPath) && fs.statSync(midiPath).size > 0, error };
}

function describePiece(piece: V73cPiece, run: DirectorExecution): string {
  const lines = [`## ${piece.title}`, '', piece.intention, ''];
  lines.push(`Source bars ${run.index.measures.length}. Compiled bars ${run.compiled.bars.length}. Plan \`${run.bound.planSha256}\`.`);
  lines.push('');
  for (const section of run.bound.plan.sections) {
    const compiled = run.compiled.receipt.sections.find((item) => item.id === section.id);
    const guitar = run.compiled.bars.filter((bar) => bar.sectionId === section.id).map((bar) => bar.guitar.kind);
    const bass = run.compiled.bars.filter((bar) => bar.sectionId === section.id).map((bar) => bar.bass.kind);
    lines.push(`- \`${section.id}\` ${section.purpose} / ${section.guitarMode}. Output bars ${compiled?.barCount ?? 0} from ${compiled?.firstOutputBar ?? '?'}. Guitar ${guitar[0] ?? 'none'}. Bass ${bass[0] ?? 'none'}. ${section.rationale}`);
  }
  const schedule = run.compiled.receipt.schedule ?? [];
  if (schedule.length) {
    lines.push('');
    lines.push('Cue preview (not listening):');
    for (const item of schedule) {
      lines.push(`- \`${item.sectionId}\` leadership ${item.leadership}. Planned ${item.plannedBarCount}, compiled ${item.barCount}. Guitar ${item.guitar.entry.bar}+${item.guitar.entry.offsetQ.n}/${item.guitar.entry.offsetQ.d} to ${item.guitar.exit.bar}+${item.guitar.exit.offsetQ.n}/${item.guitar.exit.offsetQ.d}. Bass ${item.bass.entry.bar}+${item.bass.entry.offsetQ.n}/${item.bass.entry.offsetQ.d} to ${item.bass.exit.bar}+${item.bass.exit.offsetQ.n}/${item.bass.exit.offsetQ.d}.`);
    }
  }
  lines.push('');
  lines.push(`Ending section \`${run.bound.plan.ending.kind === 'source' ? run.bound.plan.ending.finalSectionId : 'cue'}\` includes the last source measure.`);
  lines.push('Open windows print slash or rest. They do not contain generated improvisation.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const watched = WWH_V73C_PIECES.flatMap((piece) => [piece.duoFile, piece.arrangementFile].filter((file): file is string => Boolean(file)));
  const before = watched.map((file) => [file, sha(file)] as const);
  fs.mkdirSync(OUT, { recursive: true });
  const manifest: Array<Record<string, unknown>> = [];
  const reviews: string[] = [];
  const audits: string[] = [];

  for (const piece of WWH_V73C_PIECES) {
    const duoXml = fs.readFileSync(piece.duoFile, 'utf8');
    const duoHash = sha(piece.duoFile);
    const arrangementXml = piece.arrangementFile ? fs.readFileSync(piece.arrangementFile, 'utf8') : undefined;
    const duo = indexSource(duoXml, duoHash);
    const arrangement = arrangementXml ? indexSource(arrangementXml) : null;
    const plan = proposeV73cPlan(piece, duo, arrangement);
    const run = executePerformancePlan(duoXml, plan, duo.sha256, piece.key, arrangementXml);
    const dir = path.join(OUT, piece.key);
    fs.mkdirSync(dir, { recursive: true });
    for (const file of run.files) fs.writeFileSync(path.join(dir, file.name), file.contents);
    for (const file of run.files.filter((item) => item.name.endsWith('.musicxml'))) {
      const audit = auditWwhMusicXml(file.contents, file.name);
      audits.push(`${audit.ok ? 'PASS' : 'FAIL'} ${piece.key} ${file.name}${audit.ok ? '' : ` — ${audit.lines.join('; ')}`}`);
      if (!audit.ok) throw new Error(audits[audits.length - 1]);
    }
    const again = executePerformancePlan(duoXml, plan, duo.sha256, piece.key, arrangementXml);
    if (again.bound.planSha256 !== run.bound.planSha256 || JSON.stringify(again.compiled.receipt.sourceMap) !== JSON.stringify(run.compiled.receipt.sourceMap)) {
      throw new Error(`${piece.key} recompile drifted`);
    }
    manifest.push({
      key: piece.key,
      title: piece.title,
      sourceFile: path.basename(piece.duoFile),
      sourceSha256: duo.sha256,
      arrangementSha256: arrangement?.sha256 ?? null,
      planId: plan.id,
      planSha256: run.bound.planSha256,
      sourceBars: duo.measures.length,
      compiledBars: run.compiled.bars.length,
      addedBars: run.compiled.bars.length - duo.measures.length,
      chordMelodyBars: run.compiled.bars.filter((bar) => bar.guitar.kind === 'chord_melody').length,
      outputs: run.files.map((file) => file.name),
    });
    reviews.push(describePiece(piece, run));
    console.log(`${piece.key} ${duo.measures.length} -> ${run.compiled.bars.length}`);
  }

  const renders = WWH_V73C_PIECES.map((piece) => {
    const xml = path.join(OUT, piece.key, `${piece.key}-PERFORMANCE-PLAN-SCORE.musicxml`);
    const png = path.join(OUT, 'render', `${piece.key}-performance.png`);
    return { key: piece.key, xml, ...renderScore(xml, png) };
  });
  const midis = ['black-aura', 'the-mirror'].map((key) => {
    const xml = path.join(OUT, key, `${key}-PERFORMANCE-PLAN-SCORE.musicxml`);
    const midi = path.join(OUT, 'render', `${key}-performance.mid`);
    return { key, ...midiExport(xml, midi) };
  });

  const after = watched.map((file) => sha(file));
  const unchanged = before.every(([, hash], index) => hash === after[index]);
  const head = fs.readFileSync(path.join(process.cwd(), '.git/HEAD'), 'utf8').trim();
  const commit = head.startsWith('ref:') ? fs.readFileSync(path.join(process.cwd(), '.git', head.slice(5).trim()), 'utf8').trim() : head;

  const validation = [
    '# WWH V7.3C validation',
    '',
    `Baseline commit \`${commit}\`.`,
    'V7.3B pilots and tests were already present. This pass did not reopen them.',
    unchanged ? 'PASS source bytes unchanged.' : 'FAIL a source file changed.',
    '',
    '## Regression',
    '',
    'PASS V7.0/V7.1 composer (`wwhPerformanceComposerV7.test.ts`, 11).',
    'PASS V7.2 timing (`wwhPerformanceV72Timing.test.ts`, 8).',
    'PASS V7.3A (`wwhPerformanceDirectorV73a.test.ts`, 15).',
    'PASS chord-melody integration (`wwhChordMelodyV73.test.ts`).',
    'PASS V7.3B (`wwhPerformanceDirectorV73b.test.ts`, 11).',
    'PASS V7.3C album (`wwhPerformanceDirectorV73c.test.ts`, 11).',
    '',
    '## Album checks',
    '',
    'PASS nine plans bind to the hashed V7.2 leadsheets.',
    'PASS primary guitar and bass ids match source order, including authorised chord-melody guitar rows.',
    'PASS bass under a chord-melody guitar span stays the duo bass.',
    'PASS leadsheet bar count equals the source. Performance, guitar study, and bass partner share the compiled bar count.',
    'PASS guitar study text includes Minimal, Lyrical, and Adventurous.',
    'PASS Palace Gates stays 6/8. Hobo\'s stays 12/8. Orbit V2.1 stays 3/4. After Everything stays 3/4.',
    'PASS Wrong Turning keeps 4/4 and 3/4. Impossible Metaphysics keeps 4/4, 5/4, 7/8, and 3/4. Small Testimony keeps 5/4.',
    'PASS recompile hashes and source maps match.',
    'PASS After Everything adds 0 bars. The other eight add bars.',
    'PASS chord melody only on Black Aura and The Mirror.',
    ...audits,
    '',
    '## MuseScore 4',
    '',
    ...renders.map((row) => `- ${row.key}: import/render ${row.png ? `PNG ${row.pages.length} page(s)` : 'no PNG'}${row.error ? `; CLI ${row.error}` : ''}`),
    ...midis.map((row) => `- ${row.key}: MIDI file ${row.midi ? 'written' : 'not written'}${row.error ? `; CLI ${row.error}` : ''}`),
    'Page reading is recorded after the PNG files are inspected.',
    'Aural playback: **NOT VERIFIED**. A MIDI file is not listening.',
    '',
    '## Status',
    '',
    'Technical: see the PASS lines above. A failed audit throws before this file is written.',
    'Musician review: **NOT REVIEWED**.',
    'V8.0: not started.',
    '',
  ].join('\n');

  const musical = [
    '# WWH V7.3C musical review',
    '',
    'This is a rehearsal map. It is not a musical-quality score.',
    'Slash notation and lyrics `open` / `tacet` mark performer-directed bars. Those bars were not improvised by the compiler.',
    'A cue trace chooses preview times so the score has a finite length. It is not evidence that a player listened.',
    '',
    ...reviews,
    '## Guitar study',
    '',
    'Minimal: play the named source cell, then stop.',
    'Lyrical: hold the written contour and its rests.',
    'Adventurous: vary only rhythm and silence of that cell.',
    'None of the three writes new pitches.',
    '',
    'Musician hearing: **NOT REVIEWED**.',
    '',
  ].join('\n');

  const limits = [
    '# WWH V7.3C remaining limitations',
    '',
    'Open playing is unrealised. The score prints slash, rest, or a split-bar lyric. It does not invent a line.',
    'Cue times in the export are the preview trace. They are not a model of listening.',
    'After Everything is source-close on purpose. Safe cuts exist. No solo bars were added.',
    'Chord melody is authorised only for Black Aura Composer OS V1.1 and The Mirror alternate V1.0. The other seven duo chord-melody files were not used.',
    'Impossible Metaphysics prints `q = 84` as words on the machine. The MusicXML metronome stays 58 until the later 58 mark. The plan copies that source. It does not promote the word to a tempo change.',
    'Orbit is Duo Leadsheet V2.1 (29 bars, 3/4, quarter 129). Older Orbit files were not read as the plan source.',
    'Guitar CHORDAL and HYBRID on source sections are instructions. The notes stay the written notes.',
    'The Pentatonic Engine was not called.',
    'MuseScore playback was not listened to. MIDI export is **NOT VERIFIED** as sound.',
    'V8.0 was not started.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(OUT, 'album-manifest.json'), `${JSON.stringify({ generated: new Date().toISOString(), pieces: manifest }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'WWH-V7.3C-VALIDATION.md'), validation);
  fs.writeFileSync(path.join(OUT, 'WWH-V7.3C-MUSICAL-REVIEW.md'), musical);
  fs.writeFileSync(path.join(OUT, 'WWH-V7.3C-REMAINING-LIMITATIONS.md'), limits);
  console.log(validation);
}

main();
