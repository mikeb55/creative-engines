/**
 * Single-file Song Mode regression: four `importHarmonyMode` variants on a fixed Sibelius-export lead sheet
 * (`Sample MIDI 2 Musicxml tracks/Perplexity Test 23 April 2026.musicxml`).
 *
 * Observed fixture facts (document the matrix, not brittle product claims):
 * - The score **does** contain `<harmony>` tags, but the lock pipeline can still fail to build a usable timeline
 *   (e.g. `importHarmonyLockFallbackReason` such as `musicxml_parse_failed`); then `importHarmonyLockApplied` is false.
 * - In that case `lock_harmony` **does not** apply locks; manifest records fallback telemetry while **musical
 *   MusicXML output matches** the `free_harmony` baseline (same seed + stack + input).
 * - `blend_harmony` is **metadata-only** today; output matches baseline (same as Stage 4 contract).
 *
 * Comparison: full `result.xml` string equality vs baseline (same approach as `pipelineTruth.test.ts` /
 * `songModeMusicXml.test.ts`). Optional bar-map check when XML strings match.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateResult } from '../app-api/generateComposition';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';
import { normalizeChordToken } from '../core/harmony/chordProgressionParser';

function repoRootFromTests(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

const SAMPLE_REL = path.join('Sample MIDI 2 Musicxml tracks', 'Perplexity Test 23 April 2026.musicxml');

const SEED = 941_100;

type Row = {
  label: string;
  sameXmlAsBaseline: boolean;
  lockApplied: boolean | undefined;
  fallback: string | undefined;
  lockedBars: number | undefined;
};

function assertImportHarmonyReceipt(
  r: GenerateResult,
  expected: {
    mode: 'free_harmony' | 'lock_harmony' | 'blend_harmony';
    source: 'defaulted' | 'explicit';
    lockApplied: boolean;
    fallbackReason?: string;
    lockedBarsCount?: number;
  }
): string | undefined {
  const rm = r.runManifest;
  if (!rm) return 'missing runManifest';
  if (rm.importHarmonyMode !== expected.mode) return `importHarmonyMode want ${expected.mode} got ${rm.importHarmonyMode}`;
  if (rm.importHarmonyModeSource !== expected.source)
    return `importHarmonyModeSource want ${expected.source} got ${rm.importHarmonyModeSource}`;
  if (rm.importHarmonyPolicyVersion !== 3) return `importHarmonyPolicyVersion want 3 got ${rm.importHarmonyPolicyVersion}`;
  if ((rm.importHarmonyLockApplied ?? false) !== expected.lockApplied)
    return `importHarmonyLockApplied want ${expected.lockApplied} got ${rm.importHarmonyLockApplied}`;
  if (expected.fallbackReason !== undefined && rm.importHarmonyLockFallbackReason !== expected.fallbackReason) {
    return `importHarmonyLockFallbackReason want ${expected.fallbackReason} got ${rm.importHarmonyLockFallbackReason}`;
  }
  if (expected.lockedBarsCount !== undefined && rm.importHarmonyLockedBarsCount !== expected.lockedBarsCount) {
    return `importHarmonyLockedBarsCount want ${expected.lockedBarsCount} got ${rm.importHarmonyLockedBarsCount}`;
  }
  return undefined;
}

function harmonyMapsEqual(xmlA: string, xmlB: string, maxBar: number): boolean {
  const ha = extractHarmoniesFromFirstPartXml(xmlA);
  const hb = extractHarmoniesFromFirstPartXml(xmlB);
  for (let b = 1; b <= maxBar; b++) {
    const ca = normalizeChordToken(ha.get(b) ?? '');
    const cb = normalizeChordToken(hb.get(b) ?? '');
    if (ca !== cb) return false;
  }
  return true;
}

export function runImportHarmonyModesSingleFileTests(): { ok: boolean; name: string }[] {
  const samplePath = path.join(repoRootFromTests(), SAMPLE_REL);
  if (!fs.existsSync(samplePath)) {
    return [
      {
        ok: false,
        name: `Import harmony modes (single file): missing sample ${samplePath}`,
      },
    ];
  }

  const raw = fs.readFileSync(samplePath, 'utf-8');
  const hasHarmonyElement = /<harmony[\s>]/i.test(raw);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-harmony-modes-1file-'));

  try {
    const base = {
      presetId: 'song_mode' as const,
      styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
      seed: SEED,
      totalBars: 32 as const,
      longFormEnabled: true as const,
      title: 'Import harmony modes matrix (Perplexity sample)',
      primarySongwriterStyle: 'wayne_shorter' as const,
      songModeLeadSheetMusicXml: raw,
    };

    const omitted = runAppGeneration(base, dir);
    const free = runAppGeneration({ ...base, importHarmonyMode: 'free_harmony' }, dir);
    const lock = runAppGeneration({ ...base, importHarmonyMode: 'lock_harmony' }, dir);
    const blend = runAppGeneration({ ...base, importHarmonyMode: 'blend_harmony' }, dir);

    const baselineXml = omitted.xml;
    if (!baselineXml || !omitted.success || !free.success || !lock.success || !blend.success) {
      return [
        {
          ok: false,
          name: `Import harmony modes (single file): generation failed (omitted ok=${omitted.success} free=${free.success} lock=${lock.success} blend=${blend.success})`,
        },
      ];
    }

    const errors: string[] = [];

    if (omitted.xml !== free.xml) errors.push('omitted vs explicit free_harmony: MusicXML mismatch');
    if (free.xml !== blend.xml) errors.push('free_harmony vs blend_harmony: expected identical MusicXML (blend inactive)');
    if (lock.xml !== baselineXml) errors.push('lock_harmony: expected MusicXML identical to baseline when lock does not apply');

    // Receipt checks (explicit expectations per mode).
    errors.push(assertImportHarmonyReceipt(omitted, { mode: 'free_harmony', source: 'defaulted', lockApplied: false }) ?? '');
    errors.push(assertImportHarmonyReceipt(free, { mode: 'free_harmony', source: 'explicit', lockApplied: false }) ?? '');
    errors.push(
      assertImportHarmonyReceipt(lock, {
        mode: 'lock_harmony',
        source: 'explicit',
        lockApplied: false,
      }) ?? ''
    );
    if (lock.runManifest?.importHarmonyLockFallbackReason == null || lock.runManifest.importHarmonyLockFallbackReason === '') {
      errors.push('lock_harmony: expected non-empty importHarmonyLockFallbackReason when lock not applied');
    }
    errors.push(assertImportHarmonyReceipt(blend, { mode: 'blend_harmony', source: 'explicit', lockApplied: false }) ?? '');

    // When XML matches, first-part harmony symbols should match bar-for-bar (canonical tokens).
    if (!errors.some(Boolean) && baselineXml) {
      if (!harmonyMapsEqual(baselineXml, free.xml, 32)) errors.push('harmony map: omitted vs free mismatch despite identical XML');
      if (!harmonyMapsEqual(baselineXml, blend.xml, 32)) errors.push('harmony map: baseline vs blend mismatch despite identical XML');
    }

    const rows: Row[] = [
      {
        label: 'omitted (default)',
        sameXmlAsBaseline: true,
        lockApplied: omitted.runManifest?.importHarmonyLockApplied,
        fallback: omitted.runManifest?.importHarmonyLockFallbackReason,
        lockedBars: omitted.runManifest?.importHarmonyLockedBarsCount,
      },
      {
        label: "explicit 'free_harmony'",
        sameXmlAsBaseline: free.xml === baselineXml,
        lockApplied: free.runManifest?.importHarmonyLockApplied,
        fallback: free.runManifest?.importHarmonyLockFallbackReason,
        lockedBars: free.runManifest?.importHarmonyLockedBarsCount,
      },
      {
        label: "explicit 'lock_harmony'",
        sameXmlAsBaseline: lock.xml === baselineXml,
        lockApplied: lock.runManifest?.importHarmonyLockApplied,
        fallback: lock.runManifest?.importHarmonyLockFallbackReason,
        lockedBars: lock.runManifest?.importHarmonyLockedBarsCount,
      },
      {
        label: "explicit 'blend_harmony'",
        sameXmlAsBaseline: blend.xml === baselineXml,
        lockApplied: blend.runManifest?.importHarmonyLockApplied,
        fallback: blend.runManifest?.importHarmonyLockFallbackReason,
        lockedBars: blend.runManifest?.importHarmonyLockedBarsCount,
      },
    ];

    const table =
      '\n' +
      [
        'mode | sameXmlAsBaseline | lockApplied | fallbackReason | lockedBarsCount',
        '-----|-------------------|---------------|----------------|----------------',
        ...rows.map(
          (r) =>
            `${r.label} | ${r.sameXmlAsBaseline} | ${r.lockApplied ?? '-'} | ${r.fallback ?? '-'} | ${r.lockedBars ?? '-'}`
        ),
      ].join('\n');
    console.log('[importHarmonyModesSingleFile] fixture: sample has <harmony> elements =', hasHarmonyElement);
    console.log('[importHarmonyModesSingleFile] comparison table:', table);

    const filtered = errors.filter(Boolean);
    const ok = filtered.length === 0;
    return [
      {
        ok,
        name: ok
          ? 'Import harmony modes (single file): omitted/free identical; lock fallback telemetry; blend matches free'
          : `Import harmony modes (single file): ${filtered.join(' | ')}`,
      },
    ];
  } catch (e) {
    return [
      {
        ok: false,
        name: `Import harmony modes (single file): ${e instanceof Error ? e.message : String(e)}`,
      },
    ];
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
