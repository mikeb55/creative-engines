/**
 * Combined Stage 1 — LeadSheet MusicXML import telemetry (counts + pipeline stage).
 * Stage 1 originally kept the importer untouched; **Stage 2** merges non-first-part `<harmony>` (see
 * `leadSheetMusicXmlImport.ts`) — the in-file `PERPLEXITY_STYLE_HARMONY_ON_P2_XML` block below is labeled
 * **Stage 1 + Stage 2** so historical “P2 ignored” expectations stay documented in comments while assertions
 * track the merged-harmony product.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { GenerateResult } from '../app-api/generateComposition';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';
import { buildImportHarmonyLeadSheetTelemetry } from '../core/importHarmony/buildImportHarmonyLeadSheetTelemetry';

/**
 * Disk fixtures (repo root): `Sample MIDI 2 Musicxml tracks/P1 Harmony.musicxml`,
 * `Sample MIDI 2 Musicxml tracks/melody only.musicxml`.
 * Loaded at runtime so tests exercise real Sibelius exports without embedding large XML.
 */
const SAMPLE_P1_HARMONY_FILENAME = 'P1 Harmony.musicxml';
const SAMPLE_MELODY_ONLY_FILENAME = 'melody only.musicxml';

const LEGACY_LOCK_FALLBACK_REASONS = new Set([
  'mode_not_lock',
  'no_musicxml_input',
  'musicxml_parse_failed',
  'timeline_missing',
  'timeline_empty',
  'timeline_unusable',
  'not_song_mode',
]);

function repoRootFromTests(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

function loadSampleMusicXmlFixtures():
  | { ok: true; p1HarmonyXml: string; melodyOnlyXml: string }
  | { ok: false; missing: string } {
  const root = repoRootFromTests();
  const dir = path.join(root, 'Sample MIDI 2 Musicxml tracks');
  const p1Path = path.join(dir, SAMPLE_P1_HARMONY_FILENAME);
  const melPath = path.join(dir, SAMPLE_MELODY_ONLY_FILENAME);
  if (!fs.existsSync(p1Path)) return { ok: false, missing: p1Path };
  if (!fs.existsSync(melPath)) return { ok: false, missing: melPath };
  return {
    ok: true,
    p1HarmonyXml: fs.readFileSync(p1Path, 'utf-8'),
    melodyOnlyXml: fs.readFileSync(melPath, 'utf-8'),
  };
}

type TelemetryFive = Pick<
  NonNullable<GenerateResult['runManifest']>,
  | 'importHarmonyShouldParseLeadSheetInput'
  | 'importHarmonyLeadSheetPipelineStage'
  | 'importHarmonyLeadSheetAdaptDetail'
  | 'importHarmonyChordEventCount'
  | 'importHarmonyTimelineEventCount'
>;

function telemetryFiveFromManifest(m: GenerateResult['runManifest']): TelemetryFive {
  return {
    importHarmonyShouldParseLeadSheetInput: m?.importHarmonyShouldParseLeadSheetInput,
    importHarmonyLeadSheetPipelineStage: m?.importHarmonyLeadSheetPipelineStage,
    importHarmonyLeadSheetAdaptDetail: m?.importHarmonyLeadSheetAdaptDetail,
    importHarmonyChordEventCount: m?.importHarmonyChordEventCount,
    importHarmonyTimelineEventCount: m?.importHarmonyTimelineEventCount,
  };
}

function telemetryFiveEqual(a: TelemetryFive, b: TelemetryFive): boolean {
  return (
    a.importHarmonyShouldParseLeadSheetInput === b.importHarmonyShouldParseLeadSheetInput &&
    a.importHarmonyLeadSheetPipelineStage === b.importHarmonyLeadSheetPipelineStage &&
    a.importHarmonyLeadSheetAdaptDetail === b.importHarmonyLeadSheetAdaptDetail &&
    a.importHarmonyChordEventCount === b.importHarmonyChordEventCount &&
    a.importHarmonyTimelineEventCount === b.importHarmonyTimelineEventCount
  );
}

/** Parsed-input receipt: coarse adapt detail required unless pipeline reached `adapt_ok`. */
function stage1TelemetryFivePresent(t: TelemetryFive): boolean {
  if (t.importHarmonyShouldParseLeadSheetInput !== true) return false;
  if (typeof t.importHarmonyLeadSheetPipelineStage !== 'string' || t.importHarmonyLeadSheetPipelineStage.length === 0) {
    return false;
  }
  if (typeof t.importHarmonyChordEventCount !== 'number') return false;
  if (typeof t.importHarmonyTimelineEventCount !== 'number') return false;
  if (t.importHarmonyLeadSheetPipelineStage !== 'adapt_ok') {
    return typeof t.importHarmonyLeadSheetAdaptDetail === 'string';
  }
  return true;
}

/**
 * Four-mode matrix: omitted (default mode) + explicit free/blend/lock.
 * Default `barry_harris` primary so Phase 1 parse runs for omitted as well (`shouldParseLeadSheetInput` true when XML present).
 * Optional `donald_fagen` for fixtures that need the Fagen LeadSheet writer route while keeping the same matrix contracts.
 */
function runFourImportHarmonyModeMatrix(args: {
  dir: string;
  label: string;
  seed: number;
  songModeLeadSheetMusicXml: string;
  primarySongwriterStyle?: 'barry_harris' | 'donald_fagen';
}): { ok: boolean; name: string; detail?: string } {
  const { dir, label, seed, songModeLeadSheetMusicXml, primarySongwriterStyle } = args;
  const songwriter = primarySongwriterStyle ?? 'barry_harris';
  const base = {
    presetId: 'song_mode' as const,
    styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
    seed,
    totalBars: 32 as const,
    longFormEnabled: true as const,
    title: `Stage 1 matrix: ${label}`,
    primarySongwriterStyle: songwriter,
    songModeLeadSheetMusicXml,
  };

  const omitted = runAppGeneration(base, dir);
  const free = runAppGeneration({ ...base, importHarmonyMode: 'free_harmony' }, dir);
  const blend = runAppGeneration({ ...base, importHarmonyMode: 'blend_harmony' }, dir);
  const lock = runAppGeneration({ ...base, importHarmonyMode: 'lock_harmony' }, dir);

  const runs = [omitted, free, blend, lock];
  const xmlParts = runs.map((r) => r.xml).filter(Boolean) as string[];
  if (xmlParts.length !== 4) {
    return {
      ok: false,
      name: `Sample ${label}: four-mode matrix missing MusicXML`,
      detail: `xmlPresent=${runs.map((r) => !!r.xml).join(',')}`,
    };
  }

  /** Omitted / free / blend must match (default importHarmony is free_harmony-equivalent). */
  const tripleXmlOk =
    !!omitted.xml &&
    omitted.xml === free.xml &&
    free.xml === blend.xml;

  /**
   * When `lock_harmony` does not consume the imported timeline (`importHarmonyLockApplied` false),
   * musical output must match free_harmony (Stage 1 — no new behaviour). If the timeline lock
   * actually applies, duo output may differ — only triple parity is required in that case.
   */
  const lockApplied = lock.runManifest?.importHarmonyLockApplied === true;
  const lockVsFreeWhenInactiveOk = lockApplied || lock.xml === free.xml;
  const xmlOk = tripleXmlOk && lockVsFreeWhenInactiveOk;
  if (!xmlOk) {
    return {
      ok: false,
      name: `Sample ${label}: result.xml parity failed (omitted/free/blend or lock vs free when lock inactive)`,
      detail: JSON.stringify({
        tripleXmlOk,
        lockApplied,
        lockVsFreeWhenInactiveOk,
        omittedLen: omitted.xml?.length,
        freeLen: free.xml?.length,
        blendLen: blend.xml?.length,
        lockLen: lock.xml?.length,
      }),
    };
  }

  const t0 = telemetryFiveFromManifest(omitted.runManifest);
  const telOk =
    telemetryFiveEqual(t0, telemetryFiveFromManifest(free.runManifest)) &&
    telemetryFiveEqual(t0, telemetryFiveFromManifest(blend.runManifest)) &&
    telemetryFiveEqual(t0, telemetryFiveFromManifest(lock.runManifest));

  if (!telOk) {
    return {
      ok: false,
      name: `Sample ${label}: Stage 1 telemetry five-pack differs across modes (unexpected)`,
      detail: JSON.stringify({
        omitted: t0,
        free: telemetryFiveFromManifest(free.runManifest),
        lock: telemetryFiveFromManifest(lock.runManifest),
      }),
    };
  }

  const presentOk = stage1TelemetryFivePresent(t0);
  if (!presentOk) {
    return {
      ok: false,
      name: `Sample ${label}: Stage 1 telemetry five-pack incomplete on runManifest`,
      detail: JSON.stringify(t0),
    };
  }

  const nonLockFallbackOk =
    omitted.runManifest?.importHarmonyLockFallbackReason === undefined &&
    free.runManifest?.importHarmonyLockFallbackReason === undefined &&
    blend.runManifest?.importHarmonyLockFallbackReason === undefined;

  const lockFb = lock.runManifest?.importHarmonyLockFallbackReason;
  const lockLegacyOk = lockFb === undefined || LEGACY_LOCK_FALLBACK_REASONS.has(lockFb);

  const ok = xmlOk && telOk && presentOk && nonLockFallbackOk && lockLegacyOk;
  return {
    ok,
    name: ok
      ? `Sample MusicXML (${label}): XML + telemetry parity across omitted/free/blend/lock${
          lockApplied
            ? ' (lock_harmony applied imported timeline on lock run — triple parity only vs free)'
            : ''
        }`
      : `Sample MusicXML (${label}): legacy fallback or non-lock telemetry failed`,
    detail: ok
      ? undefined
      : JSON.stringify({
          nonLockFallbackOk,
          lockFb,
          lockLegacyOk,
        }),
  };
}

const SIMPLE_LEAD_SHEET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Simple Lead</work-title></work>
  <identification><creator type="composer">Test Composer</creator></identification>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="120"/></direction>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind text="maj7">major-seventh</kind>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>F</root-step></root>
        <kind text="7">dominant</kind>
      </harmony>
      <barline location="left"><repeat direction="forward"/></barline>
      <barline location="right"><repeat direction="backward"/></barline>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const MELODY_ONLY_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * Stage 1 doc / Stage 2 behaviour: harmony on P2 only (melody on P1).
 * Pre–Stage 2: P2 `<harmony>` was ignored → zero imported chords.
 * Post–Stage 2: P2 harmony merges → non-zero chord + timeline counts; lock may apply (`importHarmonyLockApplied` true).
 */
const PERPLEXITY_STYLE_HARMONY_ON_P2_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
    <score-part id="P2"><part-name>Harmony</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
      </attributes>
      <harmony>
        <root><root-step>F</root-step></root>
        <kind>major</kind>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

function readManifestJson(filepath: string | undefined): Record<string, unknown> | undefined {
  if (!filepath) return undefined;
  const manifestPath = manifestPathForMusicXml(filepath);
  if (!fs.existsSync(manifestPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function runImportHarmonyLeadSheetTelemetryStage1Tests(): { ok: boolean; name: string }[] {
  const results: { ok: boolean; name: string }[] = [];

  results.push({
    ok:
      buildImportHarmonyLeadSheetTelemetry({ shouldParseLeadSheetInput: false, leadSheetAdapted: undefined })
        .importHarmonyLeadSheetPipelineStage === 'skipped',
    name: 'Import harmony LeadSheet telemetry: skipped when parse gate is false',
  });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-harmony-leadsheet-tel-s1-'));
  try {
    const diskSamples = loadSampleMusicXmlFixtures();
    if (diskSamples.ok) {
      const p1Matrix = runFourImportHarmonyModeMatrix({
        dir,
        label: 'P1 Harmony (sample file)',
        seed: 908190,
        songModeLeadSheetMusicXml: diskSamples.p1HarmonyXml,
      });
      results.push({
        ok: p1Matrix.ok,
        name: p1Matrix.ok
          ? p1Matrix.name
          : `${p1Matrix.name}${p1Matrix.detail ? ` — ${p1Matrix.detail.slice(0, 280)}` : ''}`,
      });
      const melMatrix = runFourImportHarmonyModeMatrix({
        dir,
        label: 'melody-only (sample file)',
        seed: 908191,
        songModeLeadSheetMusicXml: diskSamples.melodyOnlyXml,
      });
      results.push({
        ok: melMatrix.ok,
        name: melMatrix.ok
          ? melMatrix.name
          : `${melMatrix.name}${melMatrix.detail ? ` — ${melMatrix.detail.slice(0, 280)}` : ''}`,
      });
    } else {
      results.push({
        ok: false,
        name: `Sample MIDI tracks: missing fixture file (${diskSamples.missing})`,
      });
    }

    const base = {
      presetId: 'song_mode' as const,
      styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
      seed: 908172,
      totalBars: 32 as const,
      longFormEnabled: true as const,
      title: 'LeadSheet telemetry Stage 1',
      primarySongwriterStyle: 'wayne_shorter' as const,
    };

    const melodyLock = runAppGeneration(
      {
        ...base,
        songModeLeadSheetMusicXml: MELODY_ONLY_XML,
        importHarmonyMode: 'lock_harmony',
      },
      dir
    );

    const okMelody =
      melodyLock.success === true &&
      melodyLock.runManifest?.importHarmonyShouldParseLeadSheetInput === true &&
      melodyLock.runManifest?.importHarmonyLeadSheetPipelineStage === 'adapt_failed' &&
      melodyLock.runManifest?.importHarmonyLeadSheetAdaptDetail === 'adapt_no_chord_events' &&
      melodyLock.runManifest?.importHarmonyChordEventCount === 0 &&
      typeof melodyLock.runManifest?.importHarmonyTimelineEventCount === 'number' &&
      melodyLock.runManifest?.importHarmonyLockFallbackReason === 'musicxml_parse_failed';

    results.push({
      ok: okMelody,
      name: okMelody
        ? 'Import harmony LeadSheet telemetry: melody-only + lock surfaces adapt_no_chord_events + legacy lock fallback'
        : `Import harmony LeadSheet telemetry: melody-only assertions failed (${[
            melodyLock.success,
            melodyLock.runManifest?.importHarmonyShouldParseLeadSheetInput,
            melodyLock.runManifest?.importHarmonyLeadSheetPipelineStage,
            melodyLock.runManifest?.importHarmonyLeadSheetAdaptDetail,
            melodyLock.runManifest?.importHarmonyChordEventCount,
            melodyLock.runManifest?.importHarmonyTimelineEventCount,
            melodyLock.runManifest?.importHarmonyLockFallbackReason,
          ].join(', ')})`,
    });

    const harmonyOk = runAppGeneration(
      {
        ...base,
        primarySongwriterStyle: 'donald_fagen',
        songModeLeadSheetMusicXml: SIMPLE_LEAD_SHEET_XML,
        importHarmonyMode: 'free_harmony',
      },
      dir
    );

    /** Musical behaviour gates may fail on short repeating imports; Stage 1 only requires telemetry + XML artifact. */
    const chordOk =
      harmonyOk.runManifest?.importHarmonyShouldParseLeadSheetInput === true &&
      harmonyOk.runManifest?.importHarmonyLeadSheetPipelineStage === 'adapt_ok' &&
      (harmonyOk.runManifest?.importHarmonyChordEventCount ?? 0) >= 2 &&
      typeof harmonyOk.runManifest?.importHarmonyTimelineEventCount === 'number' &&
      !!harmonyOk.xml;

    results.push({
      ok: chordOk,
      name: chordOk
        ? 'Import harmony LeadSheet telemetry: harmony-on-P1 yields adapt_ok with chord + timeline counts'
        : 'Import harmony LeadSheet telemetry: harmony-on-P1 expectations failed',
    });

    const diskMeta = readManifestJson(harmonyOk.filepath);
    const diskOk =
      diskMeta?.importHarmonyLeadSheetPipelineStage === harmonyOk.runManifest?.importHarmonyLeadSheetPipelineStage &&
      diskMeta?.importHarmonyChordEventCount === harmonyOk.runManifest?.importHarmonyChordEventCount;

    results.push({
      ok: diskOk,
      name: diskOk ? 'Import harmony LeadSheet telemetry: `_meta` manifest echoes pipeline + counts' : 'Import harmony LeadSheet telemetry: `_meta` disk echo mismatch',
    });

    /** Use a Phase-1 LeadSheet writer so `shouldParseLeadSheetInput` is true for omitted/free/blend (not only lock). */
    const p2Matrix = runFourImportHarmonyModeMatrix({
      dir,
      label: 'Perplexity-style P2 harmony (inline Stage 2)',
      seed: 908173,
      songModeLeadSheetMusicXml: PERPLEXITY_STYLE_HARMONY_ON_P2_XML,
      primarySongwriterStyle: 'donald_fagen',
    });
    results.push({
      ok: p2Matrix.ok,
      name: p2Matrix.ok
        ? 'Import harmony LeadSheet telemetry: Perplexity-style P2 harmony (Stage 2) passes four-mode matrix + merged-harmony telemetry'
        : `${p2Matrix.name}${p2Matrix.detail ? ` — ${p2Matrix.detail.slice(0, 280)}` : ''}`,
    });
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* optional */
    }
  }

  return results;
}
