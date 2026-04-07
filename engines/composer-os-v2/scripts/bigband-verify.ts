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

function firstMeasureClefSign(partXml: string): string | undefined {
  const m = partXml.match(/<measure[^>]*number="1"[^>]*>([\s\S]*?)<\/measure>/);
  if (!m) return undefined;
  const inner = m[1];
  const sign = inner.match(/<clef>[\s\S]*?<sign>([^<]+)<\/sign>/);
  return sign?.[1];
}

function measureCountInPart(partXml: string): number {
  const matches = partXml.match(/<measure[^>]*number="/g);
  return matches?.length ?? 0;
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
        const sign = firstMeasureClefSign(block);
        percussionOk = sign === 'percussion';
        percussionReason =
          sign !== undefined ? `First measure clef sign="${sign}"` : 'No clef in measure 1';
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
  let barReason = 'No parts';
  let barOk = false;
  if (firstPartId) {
    const block = partBlockById(xml, firstPartId);
    if (block) {
      const n = measureCountInPart(block);
      barOk = n === 32;
      barReason = `First part (${firstPartId}) has ${n} measures`;
    }
  }
  checks.push({
    name: 'Total bars === 32 (first part measure count)',
    pass: barOk,
    reason: barReason,
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
