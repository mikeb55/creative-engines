/**
 * Riff adapter only — Zappa bluesrockFerocious solo, Am7 x8 seed 42.
 * Writes report.json before MusicXML (heavy exporter loads last).
 */
import * as fs from 'fs';
import * as path from 'path';

const SEED = 42;
const BARS = 8;
const CHORD = 'Am7';
const chords = Array(BARS).fill(CHORD);
const OUT_DIR = path.resolve(__dirname, '../../../_test_outputs/zappa_ferocity_riff_verify');
const LOG_PATH = path.join(OUT_DIR, '_run.log');
const REPORT_PATH = path.join(OUT_DIR, 'report.json');
const XML_PATH = path.join(OUT_DIR, 'frank_zappa_ferocity_am7_seed42.musicxml');

fs.mkdirSync(OUT_DIR, { recursive: true });

function log(msg: string): void {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
  process.stdout.write(line);
}

function writeReport(partial: Record<string, unknown>): void {
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(partial, null, 2)}\n`);
}

async function main(): Promise<void> {
  log('boot');

  const { getVoiceRuleBundle } = await import('../core/composer/voiceRuleBundles');
  log('loaded voiceRuleBundles');

  const { riffSoloFromZappaEngine } = await import('../core/riff-generator/riffSoloZappaAdapter');
  log('loaded riffSoloZappaAdapter');

  type RiffSoloGeneratorProfile =
    import('../core/composer/riffProfileTypes').RiffSoloGeneratorProfile;

  const soloBase = getVoiceRuleBundle('frank_zappa').riffProfile?.soloGeneratorProfile;
  if (!soloBase?.enabled) throw new Error('frank_zappa solo profile missing');

  const profile: RiffSoloGeneratorProfile = { ...soloBase, styleMode: 'bluesrockFerocious' };
  const controls = { zappaStyleMode: 'bluesrockFerocious' as const };

  const adapterNoteCountsPerBar: number[] = [];
  const soloPart: Array<{ pitch: number; startBeat: number; duration: number }[]> = [];

  for (let b = 0; b < BARS; b++) {
    const line = riffSoloFromZappaEngine(b, CHORD, profile, SEED, controls);
    adapterNoteCountsPerBar.push(line.length);
    soloPart.push(line);
    log(`bar ${b + 1}: ${line.length} notes`);
  }

  const reportBase = {
    seed: SEED,
    chord: CHORD,
    bars: BARS,
    path: 'riffSoloFromZappaEngine',
    zappaStyleMode: 'bluesrockFerocious',
    adapterNoteCountsPerBar,
    burstBarsGte12: adapterNoteCountsPerBar.filter((n) => n >= 12).length,
    restBarsLte3: adapterNoteCountsPerBar.filter((n) => n <= 3).length,
    min: Math.min(...adapterNoteCountsPerBar),
    max: Math.max(...adapterNoteCountsPerBar),
  };

  writeReport({ ...reportBase, status: 'counts_ok', xmlPath: null });
  log('wrote report.json (counts)');

  const { createMeasure, createNote, createScore } = await import('../core/score-model/scoreEventBuilder');
  const { exportScoreModelToMusicXml } = await import('../core/export/musicxmlExporter');
  log('loaded score builder + musicxmlExporter');

  const measures = chords.map((chord, i) => {
    const m = createMeasure(i + 1, chord);
    m.events = (soloPart[i] ?? []).map((n) =>
      createNote(n.pitch, n.startBeat, n.duration, 1, 'riff_solo')
    );
    return m;
  });

  const score = createScore(
    'Zappa Ferocity Riff Verify',
    [
      {
        id: 'solo',
        name: 'Electric Guitar Solo',
        instrumentIdentity: 'electric_guitar_solo',
        midiProgram: 29,
        clef: 'treble',
        measures,
      },
    ],
    { tempo: 100 }
  );

  const ex = exportScoreModelToMusicXml(score);
  if (!ex.success || !ex.xml) {
    throw new Error(`MusicXML export failed: ${JSON.stringify(ex.errors ?? [])}`);
  }

  fs.writeFileSync(XML_PATH, ex.xml);
  log(`wrote ${XML_PATH}`);

  const scoreSoloNoteCountsPerBar = measures.map(
    (m) => m.events.filter((e) => e.kind === 'note').length
  );

  const report = {
    ...reportBase,
    status: 'complete',
    xmlPath: XML_PATH,
    scoreSoloNoteCountsPerBar,
  };

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  log('done');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  log(`FATAL: ${message}`);
  try {
    writeReport({
      status: 'error',
      error: message,
      stack,
      seed: SEED,
      chord: CHORD,
      bars: BARS,
    });
  } catch {
    // ignore secondary write failure
  }
  console.error(err);
  process.exit(1);
});
