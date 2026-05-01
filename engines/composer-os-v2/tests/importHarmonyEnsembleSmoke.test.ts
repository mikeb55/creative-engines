/**
 * Smoke — Big Band + String Quartet: `importHarmonyMode` manifest contract with ensemble lead-sheet XML.
 *
 * Uses the same Sibelius fixture as `importHarmonyModesSingleFile.test.ts`.
 * Assertions are manifest-only (no MusicXML body / note-level checks).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateResult } from '../app-api/generateComposition';
import { IMPORT_HARMONY_POLICY_VERSION } from '../core/importHarmonyPolicy';

function repoRootFromTests(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

const SAMPLE_REL = path.join('Sample MIDI 2 Musicxml tracks', 'Perplexity Test 23 April 2026.musicxml');

/**
 * When the Sibelius export at `SAMPLE_REL` is absent (optional local asset), use the same minimal
 * `<harmony>` timeline shape as `songModeMusicXml.test.ts` (`LOCK_HARMONY_TIMELINE_XML`) so
 * `importLeadSheetFromMusicXml` yields chord events — manifest assertions remain identical.
 */
const ENSEMBLE_HARMONY_FALLBACK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>G</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const SEED = 941_210;

const ENSEMBLE_PRESETS = ['big_band', 'string_quartet'] as const;

function assertFreeHarmonyManifest(
  r: GenerateResult,
  presetId: string,
  modeSource: 'not_supplied' | 'explicit'
): string | undefined {
  const rm = r.runManifest;
  if (!r.success) return `preset=${presetId}: generation failed`;
  if (!rm) return `preset=${presetId}: missing runManifest`;
  if (rm.presetId !== presetId) return `preset=${presetId}: runManifest.presetId=${rm.presetId}`;
  if (rm.importHarmonyMode !== 'free_harmony') return `preset=${presetId}: importHarmonyMode`;
  if (rm.importHarmonyModeSource !== modeSource) return `preset=${presetId}: importHarmonyModeSource`;
  if (rm.importHarmonyPolicyVersion !== IMPORT_HARMONY_POLICY_VERSION) return `preset=${presetId}: importHarmonyPolicyVersion`;
  if ((rm.importHarmonyLockApplied ?? true) !== false) return `preset=${presetId}: importHarmonyLockApplied`;
  if ((rm.importHarmonyLockedBarsCount ?? -1) !== 0) return `preset=${presetId}: importHarmonyLockedBarsCount`;
  if (rm.importHarmonyLockFallbackReason !== 'free_harmony_requested') return `preset=${presetId}: importHarmonyLockFallbackReason`;
  return undefined;
}

function assertLockLikeManifest(
  r: GenerateResult,
  presetId: string,
  mode: 'lock_harmony' | 'blend_harmony'
): string | undefined {
  const rm = r.runManifest;
  if (!r.success) return `preset=${presetId} mode=${mode}: generation failed`;
  if (!rm) return `preset=${presetId} mode=${mode}: missing runManifest`;
  if (rm.presetId !== presetId) return `preset=${presetId} mode=${mode}: runManifest.presetId`;
  if (rm.importHarmonyMode !== mode) return `preset=${presetId}: importHarmonyMode`;
  if (rm.importHarmonyModeSource !== 'explicit') return `preset=${presetId}: importHarmonyModeSource`;
  if (rm.importHarmonyPolicyVersion !== IMPORT_HARMONY_POLICY_VERSION) return `preset=${presetId}: importHarmonyPolicyVersion`;
  if ((rm.importHarmonyLockApplied ?? false) !== true) return `preset=${presetId}: importHarmonyLockApplied`;
  if ((rm.importHarmonyLockedBarsCount ?? 0) <= 0) return `preset=${presetId}: importHarmonyLockedBarsCount`;
  if (rm.importHarmonyLockFallbackReason !== undefined) return `preset=${presetId}: importHarmonyLockFallbackReason`;
  return undefined;
}

function loadEnsembleHarmonyFixtureXml(): { raw: string; sourceLabel: string } {
  const samplePath = path.join(repoRootFromTests(), SAMPLE_REL);
  if (fs.existsSync(samplePath)) {
    return { raw: fs.readFileSync(samplePath, 'utf-8'), sourceLabel: 'repo Sibelius sample' };
  }
  return { raw: ENSEMBLE_HARMONY_FALLBACK_XML, sourceLabel: 'bundled harmony timeline (fallback)' };
}

export function runImportHarmonyEnsembleSmokeTests(): { ok: boolean; name: string }[] {
  const { raw, sourceLabel } = loadEnsembleHarmonyFixtureXml();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-harmony-ensemble-smoke-'));

  try {
    console.log('[importHarmonyEnsembleSmoke] harmony fixture:', sourceLabel);
    const out: { ok: boolean; name: string }[] = [];

    for (const presetId of ENSEMBLE_PRESETS) {
      const base = {
        presetId,
        styleStack: { primary: 'barry_harris' as const, weights: { primary: 1 as const } },
        seed: SEED,
        totalBars: 32 as const,
        title: `Import harmony ensemble smoke (${presetId})`,
      };

      const omitted = runAppGeneration(base, dir);
      const omittedErr = assertFreeHarmonyManifest(omitted, presetId, 'not_supplied');
      out.push({
        ok: !omittedErr,
        name: omittedErr
          ? `Import harmony ensemble (${presetId}): omitted — ${omittedErr}`
          : `Import harmony ensemble (${presetId}): omitted (no ensembleLeadSheetMusicXml) — free_harmony, lock off`,
      });

      const freeExplicit = runAppGeneration(
        { ...base, importHarmonyMode: 'free_harmony', ensembleLeadSheetMusicXml: raw },
        dir
      );
      const freeErr = assertFreeHarmonyManifest(freeExplicit, presetId, 'explicit');
      out.push({
        ok: !freeErr,
        name: freeErr
          ? `Import harmony ensemble (${presetId}): explicit free_harmony — ${freeErr}`
          : `Import harmony ensemble (${presetId}): explicit free_harmony + XML — lock off (override suppressed)`,
      });

      const lock = runAppGeneration(
        { ...base, importHarmonyMode: 'lock_harmony', ensembleLeadSheetMusicXml: raw },
        dir
      );
      const lockErr = assertLockLikeManifest(lock, presetId, 'lock_harmony');
      out.push({
        ok: !lockErr,
        name: lockErr
          ? `Import harmony ensemble (${presetId}): lock_harmony — ${lockErr}`
          : `Import harmony ensemble (${presetId}): lock_harmony + XML — lock on, policy v${IMPORT_HARMONY_POLICY_VERSION}`,
      });

      const blend = runAppGeneration(
        { ...base, importHarmonyMode: 'blend_harmony', ensembleLeadSheetMusicXml: raw },
        dir
      );
      const blendErr = assertLockLikeManifest(blend, presetId, 'blend_harmony');
      out.push({
        ok: !blendErr,
        name: blendErr
          ? `Import harmony ensemble (${presetId}): blend_harmony — ${blendErr}`
          : `Import harmony ensemble (${presetId}): blend_harmony + XML — lock on (blend routes like lock for now)`,
      });
    }

    return out;
  } catch (e) {
    return [
      {
        ok: false,
        name: `Import harmony ensemble: ${e instanceof Error ? e.message : String(e)}`,
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
