/**
 * Composer OS V2 — MusicXML validation shell
 */

import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';
import type { SchemaValidationResult, ReParseResult } from './exportTypes';

/**
 * MusicXML 3.1 partwise DTD / Sibelius: &lt;offset&gt; is not valid inside &lt;harmony&gt;.
 * Mid-measure chord changes must use document-order placement (rests/notes before the harmony block).
 */
export function findHarmonyChildOffsetViolations(xml: string): string[] {
  const violations: string[] = [];
  const re = /<harmony[^>]*>([\s\S]*?)<\/harmony>/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(xml)) !== null) {
    index++;
    if (/<offset[\s>]/.test(match[1] ?? '')) {
      violations.push(
        `harmony[${index}]: <offset> inside <harmony> is out of scope for MusicXML 3.1 partwise export`
      );
    }
  }
  return violations;
}

/** Structural schema checks for exported MusicXML (root + Sibelius-safe harmony + parse gate). */
export function validateMusicXmlSchema(xml: string): SchemaValidationResult {
  const errors: string[] = [];
  if (!xml.includes('<score-partwise')) {
    errors.push('Missing score-partwise root');
  }
  errors.push(...findHarmonyChildOffsetViolations(xml));
  const parsed = validateMusicXml(xml);
  if (!parsed.valid) {
    errors.push(...parsed.errors);
  }
  return { valid: errors.length === 0, errors };
}

/** Stub: re-parse validation. */
export function reParseMusicXml(xml: string): ReParseResult {
  const hasMeasure = xml.includes('<measure');
  return {
    valid: hasScorePartwise(xml),
    measureCount: hasMeasure ? 1 : 0,
    errors: hasScorePartwise(xml) ? [] : ['Parse failed'],
  };
}

function hasScorePartwise(x: string): boolean {
  return x.includes('<score-partwise');
}
