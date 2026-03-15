/**
 * MusicXML Import — V1 validation
 * Rejects unsupported content with clear errors.
 */

import type { MusicXMLParseError } from './musicxmlTypes';

export function validateMusicXMLContent(xml: string): MusicXMLParseError | null {
  if (!xml || xml.trim().length === 0) {
    return { success: false, error: 'Empty or invalid XML', code: 'INVALID_XML' };
  }

  if (/<repeat\s|direction-type.*coda|D\.S\.|D\.C\.|dal segno|da capo/i.test(xml)) {
    return { success: false, error: 'Repeats, coda, D.S., or D.C. are not supported in V1. Use linear form only.', code: 'CODA_DETECTED' };
  }

  if (/<ending\s|first-ending|second-ending/i.test(xml)) {
    return { success: false, error: 'First/second ending logic is not supported in V1.', code: 'UNSUPPORTED_STRUCTURE' };
  }

  const timeMatch = xml.match(/<time>[\s\S]*?<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/i);
  if (timeMatch) {
    const beats = parseInt(timeMatch[1], 10);
    const beatType = parseInt(timeMatch[2], 10);
    if (beats !== 4 || beatType !== 4) {
      return {
        success: false,
        error: `Unsupported time signature ${beats}/${beatType}. V1 requires 4/4 only.`,
        code: 'UNSUPPORTED_METER',
      };
    }
  }

  return null;
}
