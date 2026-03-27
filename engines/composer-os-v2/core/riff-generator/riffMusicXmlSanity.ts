/**
 * Post-export MusicXML spot-check (export hardening already validates structure).
 */

export function validateRiffMusicXmlStructure(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!xml.includes('<score-partwise')) errors.push('Missing score-partwise');
  return { valid: errors.length === 0, errors };
}
