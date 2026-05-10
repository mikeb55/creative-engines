/**
 * Orbit Big Band V5.0 — 64-bar GCE-oriented orchestration overlay.
 * Output: projects/Orbit/V5.0 orbit - BB.musicxml
 */

import fs from 'fs';
import path from 'path';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheetMelodyNoteEvent } from '../core/lead-sheet/leadSheetTypes';

const repoRoot = path.resolve(__dirname, '../../..');
const leadPath = path.join(repoRoot, 'projects/Orbit/Orbit_lead_V5.1.musicxml');
const outPath = path.join(repoRoot, 'projects/Orbit/V5.0 orbit - BB.musicxml');

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

/** Heuristic density bucket (% of 64 bars by raw note-tag load). */
function densityAudit(bbXml: string): { full: number; medium: number; sparse: number } {
  const barNoteCounts: number[] = Array.from({ length: 64 }, () => 0);
  const partBlocks = bbXml.match(/<part\s+id="[^"]+"[^>]*>[\s\S]*?<\/part>/gi) ?? [];
  for (const pb of partBlocks) {
    const measures = pb.match(/<measure[^>]*>[\s\S]*?<\/measure>/gi) ?? [];
    for (let i = 0; i < Math.min(64, measures.length); i++) {
      barNoteCounts[i] += (measures[i]!.match(/<note[\s>]/g) ?? []).length;
    }
  }
  let full = 0;
  let medium = 0;
  let sparse = 0;
  for (let i = 0; i < 64; i++) {
    const c = barNoteCounts[i] ?? 0;
    if (c >= 28) full++;
    else if (c >= 12) medium++;
    else sparse++;
  }
  return {
    full: Math.round((full / 64) * 1000) / 10,
    medium: Math.round((medium / 64) * 1000) / 10,
    sparse: Math.round((sparse / 64) * 1000) / 10,
  };
}

/** Bars where ≤2 parts have any pitched (non-rest-only) activity — target ≥10 for Orbit V5 sparse gate. */
function sparseBarsActiveParts(bbXml: string): { sparseBarCount: number; bars: boolean[] } {
  const activePerBar: number[] = Array.from({ length: 64 }, () => 0);
  const partRegex = /<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = partRegex.exec(bbXml)) !== null) {
    const pid = pm[1];
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
  const bars = activePerBar.map((n) => n <= 2);
  const sparseBarCount = bars.filter(Boolean).length;
  return { sparseBarCount, bars };
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
    bigBandArrangementProfile: 'orbit_v5_64',
  });

  console.log('--- PRE-GENERATION ---');
  console.log(
    '1. Bar count / barMeterMap: 64 entries (3/4 each):',
    Object.keys(barMeterMap).length >= 64 ? 'CONFIRMED' : 'FAIL'
  );
  console.log(
    '2. Pipeline accepted 64 bars:',
    realised.planning.formPlan.totalBars === 64 && realised.planning.validation.ok ? 'YES' : 'NO'
  );
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
  console.log('\nWrote', outPath);

  const wrapped = wrapAltoPartAsLead(outXml);
  let melOk = false;
  let melDetail = '';
  if (wrapped) {
    const altImp = importLeadSheetFromMusicXml(wrapped);
    if (altImp.ok && altImp.leadSheet) {
      const a = melodyFingerprint(eventsHeadBody(sourceLead.melodyEvents));
      const b = melodyFingerprint(eventsHeadBody(altImp.leadSheet.melodyEvents));
      melOk = a === b;
      melDetail = melOk ? 'Bars 5–32 alto matches lead exactly.' : 'Mismatch — inspect exporter vs overlay.';
    }
  }

  const ticks = validateAltoTicks(outXml);
  const dens = densityAudit(outXml);
  const sparseGate = sparseBarsActiveParts(outXml);

  console.log('\n--- VALIDATION REPORT ---');
  console.log('3. Sparse bars (≤2 active parts):', sparseGate.sparseBarCount, sparseGate.sparseBarCount >= 10 ? 'PASS' : 'FAIL');
  console.log('4. Density audit (% of 64 bars by heuristic note-load):');
  console.log(`   full≈${dens.full}% | medium≈${dens.medium}% | sparse≈${dens.sparse}%`);
  console.log('5. Events (overlay targets):');
  console.log('   - Vacuum + cymbal drums / piano bar 35: bars 33–36');
  console.log('   - Soli brass schedule: bars 37–44');
  console.log('   - Signature vacuum bass motif + brush build / Fill bar 48: bars 45–48');
  console.log('   - Shout antiphony / unison / shock / brass escalation: bars 49–60');
  console.log('   - Coda sax chorale (no rhythm): bars 61–64');
  console.log('   - Motif callbacks: bass 45–48 rhythm; unison 55–56; alto fragment bar 63');
  console.log('6. Melody preservation (head bars 5–32 vs Orbit_lead_V5.1):', melOk ? 'PASS' : 'FAIL', melDetail);
  console.log('7. Alto bar math (tick sums):', ticks.ok ? 'PASS' : 'FAIL', ticks.detail);
  console.log('8. Sibelius safety (duration integrity):', ticks.ok ? 'PASS' : 'FAIL');

  if (!ticks.ok || !melOk || sparseGate.sparseBarCount < 10) process.exitCode = 1;
}

main();
