/**
 * Composer OS V2 — Export hardening validation
 */

export interface ExportIntegrityResult {
  valid: boolean;
  errors: string[];
}

/** Validate hardened MusicXML structure. */
export function validateExportIntegrity(xml: string): ExportIntegrityResult {
  const errors: string[] = [];

  if (!xml.includes('<score-partwise')) errors.push('Missing score-partwise root');
  if (!xml.includes('<part-list>')) errors.push('Missing part-list');
  if (!xml.includes('<part id=')) errors.push('Missing part structure');

  const measureCount = (xml.match(/<measure number=/g) || []).length;
  if (measureCount === 0) errors.push('No measures');

  const divisionsMatch = xml.match(/<divisions>(\d+)<\/divisions>/);
  if (!divisionsMatch) errors.push('Missing divisions in first measure');
  else {
    const div = parseInt(divisionsMatch[1], 10);
    if (div < 1 || div > 64) errors.push('Invalid divisions value');
  }

  const timeSigCount = (xml.match(/<time>/g) || []).length;
  const partCountForTime = (xml.match(/<part id=/g) || []).length;
  if (partCountForTime > 0 && timeSigCount > partCountForTime * 2) errors.push('Excessive time signatures');

  if (!xml.includes('<clef')) errors.push('Missing clef in attributes');
  if (!xml.includes('<part-name')) errors.push('Missing instrument names');

  const emptyMeasure = xml.match(/<measure[^>]*>\s*<\/measure>/);
  if (emptyMeasure) errors.push('Empty measure without rest');

  const chordCount = (xml.match(/<harmony>/g) || []).length;
  const partCountForChords = partCountForTime;
  if (partCountForChords > 0 && measureCount >= 8 && chordCount < 8) errors.push('Chord symbols missing for measures');

  return { valid: errors.length === 0, errors };
}
