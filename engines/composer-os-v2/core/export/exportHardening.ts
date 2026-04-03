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
    // MusicXML allows any positive divisions/quarter; we use 480 (Sibelius-safe tick grid).
    if (div < 1 || div > 65536) errors.push('Invalid divisions value');
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
  /** One harmony per measure on lead part only — expect chordCount ≈ measureCount / partCount (duo: half the raw measure tags). */
  const measuresPerPart = partCountForChords > 0 ? measureCount / partCountForChords : 0;
  if (partCountForChords > 0 && measuresPerPart >= 8 && chordCount < measuresPerPart) {
    errors.push('Chord symbols missing for measures (expected at least one harmony per measure on lead part)');
  }

  /** V3.4e — Sibelius: each part must have <measure number="1">..<measure number="N"> with no gaps or duplicates. */
  const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
  for (const block of partBlocks) {
    const idMatch = block.match(/^<part id="([^"]+)"/);
    const partId = idMatch?.[1] ?? '?';
    const nums = [...block.matchAll(/<measure[^>]*\snumber="(\d+)"/g)].map((m) => parseInt(m[1], 10));
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] !== i + 1) {
        errors.push(
          `Part ${partId}: measure slot ${i + 1} has number="${nums[i]}" (expected sequential ${i + 1})`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
