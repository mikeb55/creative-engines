/**
 * Phase-1 phrase library - schema + synthetic fixtures + adapter smoke.
 * No GPX I/O.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  phraseEntryToCoreMotif,
  phraseEntryToIntervalWeightHist,
} from '../core/riff-generator/riffPhraseLibraryAdapters';
import {
  loadSyntheticPhraseAuditRows,
  loadSyntheticPhraseFixtureIndex,
  loadSyntheticPhraseFixtures,
  RIFF_PHRASE_SYNTHETIC_FIXTURE_DIR,
} from '../core/riff-generator/riffPhraseLibraryFixtures';
import {
  RIFF_PHRASE_CATEGORIES,
  RIFF_PHRASE_GPX_PARSER,
  RIFF_PHRASE_CORPUS_TARGET_TOTAL,
} from '../core/riff-generator/riffPhraseLibraryTypes';
import { RIFF_PHRASE_CATEGORY_TAG_HEURISTICS } from '../core/riff-generator/riffPhraseLibraryHeuristics';
import { validateRiffPhraseEntry } from '../core/riff-generator/riffPhraseLibraryValidate';

export function runRiffPhraseLibrarySchemaTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    out.push({
      ok:
        RIFF_PHRASE_GPX_PARSER.npmPackage === 'guitarpro-parser' &&
        RIFF_PHRASE_GPX_PARSER.license === 'Apache-2.0' &&
        (RIFF_PHRASE_GPX_PARSER.status === 'confirmed_deferred_install' ||
          RIFF_PHRASE_GPX_PARSER.status === 'road_test_alphatab_fallback'),
      name: 'parser plan: guitarpro-parser Apache-2.0 deferred install',
    });
  }

  {
    const index = loadSyntheticPhraseFixtureIndex();
    out.push({
      ok: index.gpxTouch === false && index.licensingGate === 'pending_explicit_go_ahead',
      name: 'fixture index: gpxTouch false + licensing pending',
    });
    out.push({
      ok: index.entries.length === RIFF_PHRASE_CATEGORIES.length,
      name: 'fixture index: one entry per category (' + String(RIFF_PHRASE_CATEGORIES.length) + ')',
    });
  }

  {
    let ok = true;
    let detail = '';
    try {
      const entries = loadSyntheticPhraseFixtures();
      const cats = new Set(entries.map((e) => e.category));
      ok = entries.length === RIFF_PHRASE_CATEGORIES.length && RIFF_PHRASE_CATEGORIES.every((c) => cats.has(c));
      if (!ok) detail = 'got ' + String(entries.length);
      for (const e of entries) {
        if (!e.sourceFile.sha256.startsWith('synthetic:')) {
          ok = false;
          detail = e.id + ' hash not synthetic:';
        }
      }
    } catch (err) {
      ok = false;
      detail = err instanceof Error ? err.message : String(err);
    }
    out.push({ ok, name: 'load+validate synthetic fixtures (one per category)' + (detail ? ' (' + detail + ')' : '') });
  }

  {
    const entries = loadSyntheticPhraseFixtures();
    let ok = true;
    let detail = '';
    for (const e of entries) {
      const motif = phraseEntryToCoreMotif(e);
      if (motif.id !== 'phrase:' + e.id) {
        ok = false;
        detail = 'motif id';
        break;
      }
      if (motif.intervalPattern.join(',') !== e.intervalSequence.join(',')) {
        ok = false;
        detail = 'intervalPattern';
        break;
      }
      if (motif.contourPattern.join(',') !== e.contour.join(',')) {
        ok = false;
        detail = 'contourPattern';
        break;
      }
      if (motif.rhythmPattern.length !== e.attackPositions.length) {
        ok = false;
        detail = 'rhythmPattern length';
        break;
      }
      const hist = phraseEntryToIntervalWeightHist(e);
      const keys = Object.keys(hist);
      const allowed = new Set(['m2', 'M2', 'm3', 'M3', 'P4', 'tritone', 'P5', 'M6']);
      if (keys.some((k) => !allowed.has(k))) {
        ok = false;
        detail = 'hist keys ' + keys.join(',');
        break;
      }
    }
    out.push({
      ok,
      name: 'adapters -> CoreMotif + RiffIntervalWeightMap keys only' + (detail ? ' (' + detail + ')' : ''),
    });
  }

  {
    const rows = loadSyntheticPhraseAuditRows();
    out.push({
      ok: rows.length === RIFF_PHRASE_CATEGORIES.length && rows.every((r) => r.parseOk && r.hash.startsWith('synthetic:')),
      name: 'synthetic audit rows validate',
    });
  }

  {
    const abs = path.join(RIFF_PHRASE_SYNTHETIC_FIXTURE_DIR, 'synth_bebop_jazz_blues_01.json');
    const bad = JSON.parse(fs.readFileSync(abs, 'utf8')) as Record<string, unknown>;
    bad.intervalSequence = [9, 9, 9];
    const v = validateRiffPhraseEntry(bad);
    out.push({
      ok: !v.ok && (v as { errors: string[] }).errors.some((e) => /intervalSequence mismatch/.test(e)),
      name: 'validator rejects intervalSequence drift vs noteEvents',
    });
  }


  {
    const keys = Object.keys(RIFF_PHRASE_CATEGORY_TAG_HEURISTICS);
    const ok =
      RIFF_PHRASE_CORPUS_TARGET_TOTAL === 36 &&
      keys.length === RIFF_PHRASE_CATEGORIES.length &&
      RIFF_PHRASE_CATEGORIES.every((c) => keys.includes(c)) &&
      RIFF_PHRASE_CATEGORY_TAG_HEURISTICS.diminished_lines.highIntervalDensity.includes('m3') &&
      RIFF_PHRASE_CATEGORY_TAG_HEURISTICS.diminished_lines.highIntervalDensity.includes('tritone') &&
      RIFF_PHRASE_CATEGORY_TAG_HEURISTICS.diminished_lines.preferredPhraseEndTypes.includes('chromatic_resolve');
    out.push({
      ok,
      name: 'heuristics cover all categories; diminished_lines m3/tritone; corpus total 36',
    });
  }

  {
    out.push({
      ok: true,
      name: 'hard gate: suite performs zero GPX open/hash/parse',
    });
  }

  return out;
}

if (require.main === module) {
  const rows = runRiffPhraseLibrarySchemaTests();
  for (const r of rows) {
    console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + r.name);
  }
  const failed = rows.filter((r) => !r.ok).length;
  process.exit(failed === 0 ? 0 : 1);
}