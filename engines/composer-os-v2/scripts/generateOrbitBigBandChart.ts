/**
 * Orbit big band chart — BB_VERSION selects output name / arrangement profile.
 * Run from repo root: npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/generateOrbitBigBandChart.ts
 */

import fs from 'fs';
import path from 'path';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheet, LeadSheetMelodyNoteEvent } from '../core/lead-sheet/leadSheetTypes';

/** Set to 3 for Orbit_BB_V3_melody_authority.musicxml */
const BB_VERSION = 3;

const repoRoot = path.resolve(__dirname, '../../..');
const leadPath = path.join(repoRoot, 'projects/Orbit/Orbit_lead_V5.1.musicxml');
const structurePath = path.join(repoRoot, 'projects/Orbit/orbit-structure.json');

const outFilename =
  BB_VERSION >= 3 ? 'Orbit_BB_V3_melody_authority.musicxml' : `Orbit_BB_V${BB_VERSION}.musicxml`;
const outPath = path.join(repoRoot, 'projects/Orbit', outFilename);
const v1Path = path.join(repoRoot, 'projects/Orbit/Orbit_BB_V1.musicxml');

function countXmlNotes(xml: string): number {
  return (xml.match(/<note[\s>]/g) || []).length;
}

function countXmlRests(xml: string): number {
  return (xml.match(/<rest[\s/>]/g) || []).length;
}

function wrapAltoPartAsLead(bbXml: string): string | null {
  const m = bbXml.match(/<part\s+id="bb_alto_sax">([\s\S]*?)<\/part>/i);
  if (!m) return null;
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Alto</part-name></score-part></part-list><part id="P1">${m[1]}</part></score-partwise>`;
}

function melodyFingerprint(events: LeadSheetMelodyNoteEvent[]): string {
  const sorted = [...events].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  return sorted.map((e) => `${e.bar}|${e.beat.toFixed(4)}|${e.midi}|${e.durationBeats.toFixed(4)}`).join(';');
}

function validateMelodyLock(sourceLead: LeadSheet, bbXml: string): {
  ok: boolean;
  detail: string;
  changedNotes: number;
} {
  const wrapped = wrapAltoPartAsLead(bbXml);
  if (!wrapped) return { ok: false, detail: 'Could not extract bb_alto_sax part', changedNotes: -1 };
  const imp = importLeadSheetFromMusicXml(wrapped);
  if (!imp.ok || !imp.leadSheet) {
    return { ok: false, detail: `Alto import failed: ${imp.errors.join(';')}`, changedNotes: -1 };
  }
  const a = melodyFingerprint(sourceLead.melodyEvents);
  const b = melodyFingerprint(imp.leadSheet.melodyEvents);
  const ok = a === b;
  let changed = 0;
  if (!ok) {
    const as = sourceLead.melodyEvents.length;
    const bs = imp.leadSheet.melodyEvents.length;
    changed = Math.abs(as - bs) + (as === bs ? 1 : 0);
  }
  return {
    ok,
    detail: ok ? 'Alto written pitch+duration grid matches source lead.' : 'Mismatch — see exporter decomposition.',
    changedNotes: changed,
  };
}

function validateMeasureTicks(bbXml: string): { ok: boolean; detail: string } {
  const divisions = 480;
  const barMeter = 3;
  const expected = barMeter * divisions;
  const part = bbXml.match(/<part\s+id="bb_alto_sax">([\s\S]*?)<\/part>/i)?.[1];
  if (!part) return { ok: false, detail: 'No alto part' };
  const measures = part.match(/<measure[^>]*>[\s\S]*?<\/measure>/gi) ?? [];
  if (measures.length !== 32) return { ok: false, detail: `Expected 32 alto measures, got ${measures.length}` };
  for (let i = 0; i < measures.length; i++) {
    const notes = measures[i]!.match(/<note[\s\S]*?<\/note>/gi) ?? [];
    let sum = 0;
    for (const n of notes) {
      const dm = n.match(/<duration>(\d+)<\/duration>/i);
      if (!dm) continue;
      sum += parseInt(dm[1], 10);
    }
    if (sum !== expected) {
      return { ok: false, detail: `Measure ${i + 1} alto duration sum ${sum} !== ${expected}` };
    }
  }
  return { ok: true, detail: '32 × alto measures sum to 3 quarter-note ticks each.' };
}

function runSevenPointValidation(xml: string, v1Xml: string | null, sourceLead: LeadSheet): void {
  const lines: string[] = [];
  const check = (name: string, pass: boolean, detail?: string) => {
    lines.push(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  };

  const scoreParts = (xml.match(/<score-part id="/g) || []).length;
  check('Part count (expected 7 combined staves)', scoreParts === 7, `got ${scoreParts}`);

  const firstPartBody = xml.split('<part id=')[1]?.split('</part>')[0] ?? '';
  const measures = (firstPartBody.match(/<measure/g) || []).length;
  check('Bar count (32 × structure)', measures === 32, `got ${measures}`);

  check('Meter 3/4', /<time>\s*<beats>3<\/beats>\s*<beat-type>4<\/beat-type>/.test(xml));

  check('Tempo 129', /<per-minute>129<\/per-minute>/.test(xml));

  const dynBlocks = (xml.match(/<dynamics>/g) || []).length;
  check('Explicit written dynamics (≥6 directions)', dynBlocks >= 6, `${dynBlocks} blocks`);

  const notes = countXmlNotes(xml);
  check(
    'Fewer total note elements than V1 (attack budget)',
    v1Xml === null ? notes > 0 : notes < countXmlNotes(v1Xml),
    `n=${notes}`
  );

  const v1Notes = v1Xml ? countXmlNotes(v1Xml) : notes + 1;
  const rests = countXmlRests(xml);
  const silenceBudget = v1Notes - notes + (rests - (v1Xml ? countXmlRests(v1Xml) : 0));
  check(
    'Net silence budget vs V1 (fewer attacks + rest delta)',
    v1Xml === null ? true : silenceBudget > 0,
    `Δattacks ${v1Notes - notes}, Δrests ${rests - countXmlRests(v1Xml!)}`
  );

  if (BB_VERSION >= 3) {
    const mel = validateMelodyLock(sourceLead, xml);
    check('Melody lock (alto matches imported lead)', mel.ok, mel.detail);
    const ticks = validateMeasureTicks(xml);
    check('Alto measure duration integrity (Sibelius-safe)', ticks.ok, ticks.detail);
  }

  console.log('\n--- Validation ---');
  for (const L of lines) console.log(L);
  const anyFail = lines.some((L) => L.startsWith('FAIL'));
  if (anyFail) {
    console.error('\nValidation reported FAIL.');
    process.exitCode = 1;
  }
}

function main(): void {
  const xml = fs.readFileSync(leadPath, 'utf8');
  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8')) as {
    barMeterMap: Record<string, { numerator: number; denominator: number }>;
    totalBars: number;
  };

  const imp = importLeadSheetFromMusicXml(xml);
  if (!imp.ok || !imp.leadSheet) {
    console.error('Lead sheet import failed:', imp.errors ?? imp.warnings);
    process.exit(1);
  }
  const sourceLead = imp.leadSheet;

  let v1Xml: string | null = null;
  try {
    v1Xml = fs.readFileSync(v1Path, 'utf8');
  } catch {
    v1Xml = null;
  }

  const arrangementProfile =
    BB_VERSION >= 3 ? 'orbit_v3_melody_authority' : BB_VERSION >= 2 ? 'orbit_v2' : 'default';

  const realised = runBigBandRealisation({
    seed: 1740079201,
    title: 'Orbit',
    totalBars: 32,
    formId: 'orbit_bb',
    bpm: 129,
    era: 'cool_jazz',
    ensembleLeadSheetMusicXml: xml,
    leadSheet: imp.leadSheet,
    barMeterMap: structure.barMeterMap,
    feelMode: 'in2',
    drumArticulation: 'brushes',
    figureResponse: 'medium',
    sectionIntensityOverrides: {
      intro: 'sparse',
      melody_head: 'standard',
      background_figures: 'standard',
      solo_section: 'driving',
      ending: 'sparse',
    },
    barDrumIntensityOverrides: {
      18: 'driving',
      19: 'driving',
      20: 'driving',
    },
    suppressDesignatedSaxSoli: true,
    songwriterStyleId: 'bill_evans',
    bigBandArrangementProfile: arrangementProfile,
  });

  if (!realised.planning.validation.ok) {
    console.error('Planning validation:', realised.planning.validation.errors);
    process.exit(1);
  }

  if (!realised.exportPipeline.ok || !realised.exportPipeline.xml?.trim()) {
    console.error('Export failed:', realised.exportPipeline.errors);
    process.exit(1);
  }

  const outXml = realised.exportPipeline.xml;
  fs.writeFileSync(outPath, outXml, 'utf8');
  console.log('Wrote', outPath);

  runSevenPointValidation(outXml, v1Xml, sourceLead);

  if (BB_VERSION >= 3 && process.exitCode !== 1) {
    const mel = validateMelodyLock(sourceLead, outXml);
    console.log('\n--- Melody authority report ---');
    console.log(mel.detail);
    console.log('Fingerprint match:', mel.ok ? 'YES' : 'NO');
    if (!mel.ok) {
      console.log('Run diff: source vs generated alto import may differ if exporter splits ties.');
    }
  }
}

main();
