/**
 * Composer OS V2 — MusicXML validation shell
 */

import type { SchemaValidationResult, ReParseResult } from './exportTypes';

/** Stub: schema validation. */
export function validateMusicXmlSchema(xml: string): SchemaValidationResult {
  const hasScorePartwise = xml.includes('<score-partwise');
  return {
    valid: hasScorePartwise,
    errors: hasScorePartwise ? [] : ['Missing score-partwise root'],
  };
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
