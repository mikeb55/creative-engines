/**
 * Orbit Big Band V6.0 — micro-orchestration pass (after V5 overlay).
 * Output: projects/Orbit/V6.0 orbit - BB.musicxml
 */

import fs from 'fs';
import path from 'path';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheetMelodyNoteEvent } from '../core/lead-sheet/leadSheetTypes';

const repoRoot = path.resolve(__dirname, '../../..');
const leadPath = path.join(repoRoot, 'projects/Orbit/Orbit_lead_V5.1.musicxml');
const outPath = path.join(repoRoot, 'projects/Orbit/V6.0 orbit - BB.musicxml');

function buildBarMeterMap64(): BarMeterMap {
  const m: BarMeterMap = {};
  for (let i = 1; i <= 64; i++) {
    m[i] = { numerator: 3, denominator: 4 };
  }
  return m;
}

function wrapAltoPartAsLead(bbXml: string): string | null {
  const match = bbXml.match(/<part\s+id="bb_alto_sax">([\s\S]*?)<\/part>/i);
  if (!match) return null;
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Alto</part-name></score-part></part-list><part id="P1">${match[1]}</part></score-partwise>`;
}

function melodyFingerprint(events: LeadSheetMelodyNoteEvent[]): string {
  const sorted = [...events].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  return sorted.map((e) => `${e.bar}|${e.beat.toFixed(4)}|${e.midi}|${e.durationBeats.toFixed(4)}`).join(';');
}

function eventsHeadBody(events: LeadSheetMelodyNoteEvent[]): LeadSheetMelodyNoteEvent[] {
  return events.filter((e) => e.bar >= 5 && e.bar <= 32);
}

function validateAltoTicks(bbXml: string): { ok: boolean; detail: string } {
  const divisions = 480;
  const expected = 3 * divisions;
  const part = bbXml.match(/<part\s+id="bb_alto_sax">([\s\S]*?)<\/part>/i)?.[1];
  if (!part) return { ok: false, detail: 'No alto part' };
  const measures = part.match(/<measure[^>]*>[\s\S]*?<\/measure>/gi) ?? [];
  if (measures.length !== 64) return { ok: false, detail: `Alto measures ${measures.length}` };
  for (let i = 0; i < measures.length; i++) {
    const notes = measures[i]!.match(/<note[\s\S]*?<\/note>/gi) ?? [];
    let sum = 0;
    for (const n of notes) {
      if (/<note[^>]*>\s*<chord\s*\/>/i.test(n)) continue;
      const dm = n.match(/<duration>(\d+)<\/duration>/i);
      if (dm) sum += parseInt(dm[1], 10);
    }
    if (sum !== expected) return { ok: false, detail: `Bar ${i + 1} alto sum ${sum}` };
  }
  return { ok: true, detail: 'All 64 alto bars duration sums OK (chord followers excluded)' };
}

function sparseBarsActiveParts(bbXml: string): number {
  const activePerBar: number[] = Array.from({ length: 64 }, () => 0);
  const partRegex = /<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = partRegex.exec(bbXml)) !== null) {
    const body = pm[2] ?? '';
    const measures = body.match(/<measure[^>]*>[\s\S]*?<\/measure>/gi) ?? [];
    for (let i = 0; i < Math.min(64, measures.length); i++) {
      const noteChunks = measures[i]!.match(/<note[\s\S]*?<\/note>/gi) ?? [];
      let pitched = false;
      for (const n of noteChunks) {
        if (!/<rest[\s/>]/.test(n)) {
          pitched = true;
          break;
        }
      }
      if (pitched) activePerBar[i] = (activePerBar[i] ?? 0) + 1;
    }
  }
  return activePerBar.filter((n) => n <= 2).length;
}

function drumStickOverrides(): Partial<Record<number, 'sticks'>> {
  const o: Partial<Record<number, 'sticks'>> = {};
  for (let b = 49; b <= 60; b++) {
    o[b] = 'sticks';
  }
  return o;
}

function main(): void {
  const xml = fs.readFileSync(leadPath, 'utf8');
  const barMeterMap = buildBarMeterMap64();

  const imp = importLeadSheetFromMusicXml(xml);
  if (!imp.ok || !imp.leadSheet) {
    console.error('Lead import failed:', imp.errors);
    process.exit(1);
  }
  const sourceLead = imp.leadSheet;

  const realised = runBigBandRealisation({
    seed: 1740079201,
    title: 'Orbit',
    totalBars: 64,
    formId: 'orbit_bb_64',
    bpm: 129,
    era: 'cool_jazz',
    ensembleLeadSheetMusicXml: xml,
    leadSheet: imp.leadSheet,
    barMeterMap,
    feelMode: 'in2',
    drumArticulation: 'brushes',
    drumArticulationBarOverrides: drumStickOverrides(),
    figureResponse: 'medium',
    sectionIntensityOverrides: {
      intro: 'sparse',
      melody_head: 'standard',
      solo_section: 'standard',
      shout_chorus: 'driving',
      ending: 'sparse',
    },
    barDrumIntensityOverrides: {
      18: 'driving',
      19: 'driving',
      20: 'driving',
      33: 'sparse',
      34: 'sparse',
      35: 'sparse',
      36: 'sparse',
    },
    suppressDesignatedSaxSoli: true,
    songwriterStyleId: 'bill_evans',
    bigBandArrangementProfile: 'orbit_v6_64',
  });

  if (!realised.planning.validation.ok) {
    console.error('Planning errors:', realised.planning.validation.errors);
    process.exit(1);
  }

  if (!realised.exportPipeline.ok || !realised.exportPipeline.xml?.trim()) {
    console.error('Export failed:', realised.exportPipeline.errors);
    process.exit(1);
  }

  const outXml = realised.exportPipeline.xml;
  fs.writeFileSync(outPath, outXml, 'utf8');
  console.log('Wrote', outPath);

  const wrapped = wrapAltoPartAsLead(outXml);
  let melOk = false;
  let melDetail = '';
  if (wrapped) {
    const altImp = importLeadSheetFromMusicXml(wrapped);
    if (altImp.ok && altImp.leadSheet) {
      const a = melodyFingerprint(eventsHeadBody(sourceLead.melodyEvents));
      const b = melodyFingerprint(eventsHeadBody(altImp.leadSheet.melodyEvents));
      melOk = a === b;
      melDetail = melOk ? 'PASS' : 'FAIL';
    }
  }

  const ticks = validateAltoTicks(outXml);
  const sparseN = sparseBarsActiveParts(outXml);

  console.log('\n--- V6 VALIDATION ---');
  console.log('Melody lock 5–32:', melDetail);
  console.log('Alto bar math:', ticks.ok ? 'PASS' : 'FAIL', ticks.detail);
  console.log('Sparse bars (≤2 active parts):', sparseN, sparseN >= 10 ? 'PASS' : 'FAIL');

  if (!ticks.ok || !melOk || sparseN < 10) process.exitCode = 1;
}

main();
