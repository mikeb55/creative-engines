/**
 * Big Band MusicXML verification — piano + drums + ensemble parts (no UI).
 */

import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';

const SEED = 312853305;

type Check = { name: string; pass: boolean; reason: string };

function extractScoreParts(xml: string): Array<{ id: string; partName: string }> {
  const out: Array<{ id: string; partName: string }> = [];
  const re = /<score-part id="([^"]+)">[\s\S]*?<part-name>([^<]*)<\/part-name>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push({ id: m[1], partName: m[2].trim() });
  }
  return out;
}

function partBlockById(xml: string, partId: string): string | undefined {
  const re = new RegExp(`<part id="${partId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?<\\/part>`);
  const m = xml.match(re);
  return m?.[0];
}

function measureCountInPart(partXml: string): number {
  const matches = partXml.match(/<measure[^>]*number="/g);
  return matches?.length ?? 0;
}

/** True if the part contains at least one non-rest note (pitch or unpitched, e.g. drums). */
function partHasSoundingNote(partXml: string): boolean {
  const noteBlocks = partXml.match(/<note[\s\S]*?<\/note>/g) ?? [];
  for (const nb of noteBlocks) {
    if (/<rest[\s/>]/.test(nb)) continue;
    if (/<pitch\b/.test(nb) || /<unpitched\b/.test(nb)) return true;
  }
  return false;
}

function runChecks(xml: string): Check[] {
  const parts = extractScoreParts(xml);
  const nameSet = new Set(parts.map((p) => p.partName));

  const checks: Check[] = [];

  checks.push({
    name: 'Part named "Piano" exists',
    pass: nameSet.has('Piano'),
    reason: nameSet.has('Piano') ? 'Found part-name Piano' : `Got: ${[...nameSet].join(', ')}`,
  });

  const drumName =
    [...nameSet].find((n) => n === 'Jazz Drums' || n === 'Drum Set') ?? null;
  checks.push({
    name: 'Part named "Drum Set" or "Jazz Drums" exists',
    pass: drumName !== null,
    reason: drumName !== null ? `Found part-name "${drumName}"` : `Got: ${[...nameSet].join(', ')}`,
  });

  let percussionOk = false;
  let percussionReason = 'No drum part id';
  if (drumName) {
    const drumEntry = parts.find((p) => p.partName === drumName);
    if (drumEntry) {
      const block = partBlockById(xml, drumEntry.id);
      if (block) {
        /** Clef may appear after initial attributes; scan whole part for percussion staff. */
        percussionOk = /<sign>\s*percussion\s*<\/sign>/i.test(block);
        percussionReason = percussionOk
          ? 'Found <sign>percussion</sign> in drum part'
          : 'No percussion clef in drum part XML';
      } else {
        percussionReason = `No <part> block for id ${drumEntry.id}`;
      }
    }
  }
  checks.push({
    name: 'Drums part uses percussion clef (sign="percussion")',
    pass: percussionOk,
    reason: percussionReason,
  });

  const expect = [
    ['Alto Saxophone', 'Alto Saxophone part exists'],
    ['Tenor Saxophone', 'Tenor Saxophone part exists'],
    ['Trumpet', 'Trumpet part exists'],
    ['Trombone', 'Trombone part exists'],
    ['Double Bass', 'Double Bass part exists'],
  ] as const;
  for (const [exact, label] of expect) {
    const pass = nameSet.has(exact);
    checks.push({
      name: label,
      pass,
      reason: pass ? `Found part-name "${exact}"` : `Missing "${exact}"; got: ${[...nameSet].join(', ')}`,
    });
  }

  const firstPartId = parts[0]?.id;
  let expectedMeasures = 0;
  let barReason = 'No parts';
  if (firstPartId) {
    const block0 = partBlockById(xml, firstPartId);
    if (block0) {
      expectedMeasures = measureCountInPart(block0);
      barReason = `First part (${firstPartId}) has ${expectedMeasures} measures`;
    }
  }

  const mismatch: string[] = [];
  if (expectedMeasures <= 0) {
    mismatch.push('could not read measure count from first part');
  } else {
    for (const p of parts) {
      const b = partBlockById(xml, p.id);
      const n = b ? measureCountInPart(b) : 0;
      if (n !== expectedMeasures) mismatch.push(`${p.partName} (${p.id}): ${n} vs ${expectedMeasures}`);
    }
  }
  checks.push({
    name: 'All score parts share the same measure count',
    pass: mismatch.length === 0,
    reason: mismatch.length === 0 ? barReason : mismatch.join('; '),
  });

  const missingSound: string[] = [];
  for (const p of parts) {
    if (p.partName === 'Piano') continue;
    const block = partBlockById(xml, p.id);
    if (!block) {
      missingSound.push(`${p.partName} (no <part> block)`);
      continue;
    }
    if (!partHasSoundingNote(block)) missingSound.push(p.partName);
  }
  checks.push({
    name: 'Non-piano parts have at least one non-rest note',
    pass: missingSound.length === 0,
    reason: missingSound.length === 0 ? 'ok' : `All-rest or empty: ${missingSound.join(', ')}`,
  });

  const harmonyOk = /<harmony\b/i.test(xml);
  checks.push({
    name: 'Chord symbols: at least one <harmony> element',
    pass: harmonyOk,
    reason: harmonyOk ? 'ok' : 'No <harmony> in MusicXML',
  });

  const rehearsalOk = /<rehearsal\b/i.test(xml);
  checks.push({
    name: 'Rehearsal marks: at least one <rehearsal> element',
    pass: rehearsalOk,
    reason: rehearsalOk ? 'ok' : 'No <rehearsal> in MusicXML',
  });

  return checks;
}

function main(): void {
  const result = runBigBandRealisation({ seed: SEED, totalBars: 32 });

  const checks: Check[] = [];

  checks.push({
    name: 'Planning validation OK',
    pass: result.planning.validation.ok,
    reason: result.planning.validation.ok
      ? 'ok'
      : result.planning.validation.errors.join('; ') || 'validation failed',
  });

  const xml = result.exportPipeline.xml;
  checks.push({
    name: 'Export pipeline produced MusicXML',
    pass: Boolean(result.exportPipeline.ok && xml && xml.length > 0),
    reason:
      result.exportPipeline.ok && xml
        ? `ok (${xml.length} chars)`
        : result.exportPipeline.errors?.length
          ? result.exportPipeline.errors.join('; ')
          : 'No XML',
  });

  if (result.planning.validation.ok && xml) {
    checks.push(...runChecks(xml));
  }

  for (const c of checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'} — ${c.name}: ${c.reason}`);
  }

  const passed = checks.filter((c) => c.pass).length;
  console.log(`\nSummary: ${passed} / ${checks.length} checks passed.`);

  if (passed !== checks.length) {
    process.exit(1);
  }
}

main();
