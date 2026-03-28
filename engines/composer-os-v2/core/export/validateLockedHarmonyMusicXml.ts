/**
 * Post-write validation: first-part MusicXML harmony text must match locked pasted progression bar-for-bar.
 */

import * as fs from 'fs';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { normalizeChordToken } from '../harmony/chordProgressionParser';
import { extractHarmoniesFromFirstPartXml } from './chordSymbolMusicXml';

/**
 * Live Song Mode / custom_locked: score measures and exported XML must match pasted bars exactly (first mismatch throws).
 */
export function assertLockedHarmonyScoreAndXmlMatchBars(
  score: ScoreModel,
  xml: string | undefined,
  expectedBars: string[]
): void {
  const n = expectedBars.length;
  if (n === 0) return;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) {
    throw new Error('SONG MODE HARMONY LOCK: no guitar part in score');
  }
  for (let b = 1; b <= n; b++) {
    const m = g.measures.find((x) => x.index === b);
    const got = m?.chord ?? '';
    const exp = expectedBars[b - 1] ?? '';
    if (normalizeChordToken(got) !== normalizeChordToken(exp)) {
      throw new Error(`SONG MODE HARMONY LOCK: bar ${b} score chord "${got}" !== pasted "${exp}"`);
    }
  }
  if (xml) {
    const v = validateLockedHarmonyMusicXmlTruth(xml, expectedBars);
    if (!v.ok) {
      throw new Error(v.errors[0] ?? 'SONG MODE HARMONY LOCK: MusicXML harmony mismatch');
    }
  }
}

export function validateLockedHarmonyMusicXmlTruth(
  xml: string,
  expectedBars: string[]
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const map = extractHarmoniesFromFirstPartXml(xml);
  for (let b = 1; b <= expectedBars.length; b++) {
    const exp = expectedBars[b - 1] ?? '';
    const written = map.get(b);
    if (!written) {
      errors.push(`CUSTOM HARMONY TRUTH FAILURE: bar ${b} expected ${exp} but wrote (missing <harmony>)`);
      continue;
    }
    if (normalizeChordToken(written) !== normalizeChordToken(exp)) {
      errors.push(`CUSTOM HARMONY TRUTH FAILURE: bar ${b} expected ${exp} but wrote ${written}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Re-read written file (end-to-end disk truth). */
export function validateLockedHarmonyMusicXmlTruthFromFile(
  filepath: string,
  expectedBars: string[]
): { ok: boolean; errors: string[] } {
  const xml = fs.readFileSync(filepath, 'utf-8');
  return validateLockedHarmonyMusicXmlTruth(xml, expectedBars);
}
