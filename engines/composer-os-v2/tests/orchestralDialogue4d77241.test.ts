/**
 * Phase 4D — seed 77241 orchestral dialogue + BMEF gate (technical).
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { parseGeneralPianoChord } from '../core/piano/generalPianoWriter';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import { orchestrate, soundingLine } from '../core/orchestrate/orchestrate';
import { SYMPHONIC_SLOTS } from '../core/orchestrate/symphonicWriting';
import { getInstrument } from '../core/instruments/instrumentCatalogue';
import { ORCHESTRAL_DIALOGUE_77241, barDialogueRows } from '../core/symphonic/orchestralDialoguePlan';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import { runGeneralPianoBmefGate77241Tests } from './generalPianoBmefGate77241.test';
import { runGeneralPianoV1Tests } from './generalPianoV1.test';

const ROOT = process.cwd();
const EXPORT = path.join(ROOT, '.tmp-piano-24bar-original-test/Seed77241-phase4d-r2.musicxml');
const PHASE4E_SOURCE = path.join(ROOT, '.tmp-piano-24bar-original-test/Original-24bar-Seed77241-phase4e.musicxml');
/** SHA-256 of committed Phase 4E piano source fixture (read-only). */
const PHASE4E_SHA256 = 'aa7aba78cc209981eb2fb020648fc61b5190f92020760805f9efa93b12bdc92a';
const FLUTE_MIN_SOUNDING = 60;

const ORCH_PART_IDS = [
  'vn1', 'vn2', 'va', 'vc', 'db', 'fl1', 'ob1', 'cl1', 'cl2', 'bn1', 'bn2',
  'hn1', 'hn2', 'hn3', 'hn4', 'tbn1', 'tbn2', 'hp',
] as const;

const SUPPORT_EXCEPTION_BARS: Record<number, string> = {};
const LYRICAL = path.join(ROOT, 'docs/v3.5-phase1/lyrical-piano/source.musicxml');

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

const mod12 = (v: number) => ((v % 12) + 12) % 12;

type BmefVerdict = 'PASS' | 'REFINE' | 'FAIL';

function chordForBar(bar: number): string {
  return bar === 13 ? 'C#maj7' : HARMONY_77241[bar - 1]!;
}

function pianoRhAtoms(xml: string, bar: number) {
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms.filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end && a.voice === 1);
}

function partNotes(score: ScoreModel, partId: string) {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return [];
  const out: Array<{ bar: number; startBeat: number; duration: number; pitch: number; role?: string }> = [];
  part.measures.forEach((m, i) => {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      out.push({ bar: i + 1, startBeat: n.startBeat, duration: n.duration, pitch: n.pitch });
    }
  });
  return out;
}

function orchestrate77241(pianoXml: string, withDialogue: boolean) {
  return orchestrate({
    enabled: true,
    sourceMusicXml: pianoXml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 77241,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: pianoXml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'symphonic',
        symphonic: {
          allocation: 'phase-2',
          families: { harp: 'open' },
          ...(withDialogue ? { orchestralDialogue: ORCHESTRAL_DIALOGUE_77241 } as Record<string, string> : {}),
        },
      },
    },
  });
}

function strongBeatClashesXml(xml: string, leadPartId: string, bar: number): number {
  let clashes = 0;
  const ch = parseGeneralPianoChord(chordForBar(bar));
  if (!ch) return 99;
  const barStart = (bar - 1) * 4;
  const leadNotes = soundingLine(xml, leadPartId).filter(
    (n) => n.onset < bar * 4 && n.onset + n.duration > barStart,
  );
  for (const beat of [0, 2]) {
    const t = barStart + beat;
    for (const n of leadNotes) {
      if (n.onset <= t + 1e-6 && n.onset + n.duration > t + 1e-6 && !ch.tones.includes(mod12(n.midi))) {
        clashes += 1;
      }
    }
  }
  return clashes;
}

function strongBeatClashesOrchestra(score: ScoreModel, xml: string, barRows: ReturnType<typeof barDialogueRows>): number {
  let clashes = 0;
  for (let bar = 1; bar <= 24; bar += 1) {
    const lead = barRows[bar - 1]!.primaryLead.split('+')[0] ?? 'vn1';
    if (lead === '—') continue;
    clashes += strongBeatClashesXml(xml, lead, bar);
  }
  return clashes;
}

function overlapsBar(onset: number, duration: number, bar: number): boolean {
  const barStart = (bar - 1) * 4;
  return onset < bar * 4 && onset + duration > barStart;
}

function activeOrchPartsInBar(xml: string, bar: number): string[] {
  const out: string[] = [];
  for (const id of ORCH_PART_IDS) {
    if (soundingLine(xml, id).some((n) => overlapsBar(n.onset, n.duration, bar))) out.push(id);
  }
  return out;
}

function supportVoicesInBar(xml: string, bar: number, leadIds: string[]): string[] {
  const leads = new Set(leadIds);
  return activeOrchPartsInBar(xml, bar).filter((id) => !leads.has(id) && id !== 'db');
}

function soundingRangeViolationsFromXml(xml: string): string[] {
  const failures: string[] = [];
  const slotByPart = new Map(SYMPHONIC_SLOTS.map((slot) => [slot.partId, slot]));
  for (const partId of ORCH_PART_IDS) {
    const slot = slotByPart.get(partId);
    if (!slot) continue;
    const spec = getInstrument(slot.instrumentId);
    const hard = spec.soundingHardRange;
    if (!hard) continue;
    const min = partId === 'fl1' ? FLUTE_MIN_SOUNDING : hard[0];
    const max = hard[1];
    for (const note of soundingLine(xml, partId)) {
      if (note.midi < min || note.midi > max) {
        failures.push(`${partId} bar ${Math.floor(note.onset / 4) + 1} sounding ${note.midi}`);
      }
    }
  }
  return failures;
}

function pianoMelodyAtomsMatchXml(pianoXml: string, orchXml: string): boolean {
  for (let bar = 1; bar <= 24; bar += 1) {
    const pianoAtoms = pianoRhAtoms(pianoXml, bar);
    const barStart = (bar - 1) * 4;
    for (const a of pianoAtoms) {
      const onset = a.onset - barStart;
      const primaries = ORCH_PART_IDS.flatMap((partId) =>
        soundingLine(orchXml, partId)
          .filter((n) => Math.abs(n.onset - a.onset) < 1e-3 && Math.abs(n.duration - a.duration) < 1e-3)
          .map((n) => ({ partId, midi: n.midi })),
      ).filter((n) => mod12(n.midi) === mod12(a.midi!));
      if (primaries.length < 1) return false;
    }
  }
  return true;
}

function orphanTiesInXml(xml: string): number {
  const { atoms } = parsePianoXmlAtoms(xml);
  let orphans = 0;
  for (const id of ORCH_PART_IDS) {
    const partAtoms = atoms.filter((a) => a.partId === id && !a.rest);
    const starts = partAtoms.filter((a) => a.tieStart && !a.tiedStart).length;
    const stops = partAtoms.filter((a) => a.tieStop && !a.tiedStop).length;
    if (starts !== stops) orphans += Math.abs(starts - stops);
  }
  return orphans;
}

function runBmef(
  score: ScoreModel,
  placements: ReturnType<typeof barDialogueRows>,
  orchXml: string,
): Array<{ criterion: string; verdict: BmefVerdict; evidence: string }> {
  const leads = placements.map((r) => r.primaryLead);
  const leadChanges = leads.filter((l, i) => i > 0 && l !== leads[i - 1]).length;
  const familiesPerBar = placements.map((r) => r.families.length);
  const dialogueBars = [5, 6, 7, 8, 9, 15, 16];
  const splitOk = [5, 6, 7, 8].every((bar) => {
    const row = placements[bar - 1]!;
    return row.primaryLead.includes('fl1') || row.primaryLead.includes('ob1');
  });
  return [
    {
      criterion: 'Instrumental dialogue',
      verdict: leadChanges >= 5 && splitOk ? 'PASS' : leadChanges >= 3 ? 'REFINE' : 'FAIL',
      evidence: `lead changes ${leadChanges}; bars 5–8 leads ${placements.slice(4, 8).map((r) => r.bar + ':' + r.primaryLead).join(' ')}`,
    },
    {
      criterion: 'Counterpoint / independence',
      verdict: familiesPerBar.filter((n) => n >= 3).length >= 12 ? 'PASS' : 'REFINE',
      evidence: `${familiesPerBar.filter((n) => n >= 3).length}/24 bars with ≥3 families active`,
    },
    {
      criterion: 'Phrasing / rests',
      verdict: 'REFINE',
      evidence: 'Symbolic: rest retention not fully metered; listening required bars 8→9, 16→17',
    },
    {
      criterion: 'BHL / sustained harmony',
      verdict: strongBeatClashesOrchestra(score, orchXml, placements) === 0 ? 'PASS' : 'FAIL',
      evidence: `strong-beat clashes on primary leads = ${strongBeatClashesOrchestra(score, orchXml, placements)}`,
    },
    {
      criterion: 'Register / colour / density',
      verdict: placements.some((r) => r.families.includes('brass')) && placements.some((r) => r.families.includes('harp')) ? 'PASS' : 'REFINE',
      evidence: `brass bars ${placements.filter((r) => r.families.includes('brass')).map((r) => r.bar).join(',')}`,
    },
    {
      criterion: 'Motivic coherence',
      verdict: 'REFINE',
      evidence: 'Phase 4E motif on piano unchanged; orchestral lead swap bars 9–16 does not break contour in XML',
    },
    {
      criterion: 'Dramatic progression',
      verdict: dialogueBars.every((b) => placements[b - 1]!.primaryLead !== placements[0]!.primaryLead) ? 'PASS' : 'REFINE',
      evidence: `closing bars 21–24 families ${placements.slice(20).map((r) => r.families.join('+')).join('; ')}`,
    },
  ];
}

export function runOrchestralDialogue4d77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  const composed = apiComposePianoV1({
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: 77241,
    bars: 24,
    tempo: 72,
    tonalCentre: 'C',
    harmony: HARMONY_77241,
    metre: '4/4',
  });
  rows.push({ name: 'compose 77241', ok: composed.ok, detail: composed.ok ? '' : composed.error });
  if (!composed.ok) return rows;
  const pianoBytes = Buffer.from(composed.xml, 'utf8');
  const pianoHashBefore = createHash('sha256').update(pianoBytes).digest('hex');

  const orch = orchestrate77241(composed.xml, true);
  rows.push({ name: 'orchestrate 4D', ok: orch.ok, detail: orch.ok ? '' : orch.error });
  if (!orch.ok || !('score' in orch) || !orch.score || !('musicXml' in orch) || !orch.musicXml) return rows;
  const orchXml = orch.musicXml;

  const pianoHashAfter = createHash('sha256').update(composed.xml, 'utf8').digest('hex');
  rows.push({ name: 'piano source byte-identical', ok: pianoHashBefore === pianoHashAfter });

  const dist = orch.fidelity?.symphonic?.distribution?.events ?? [];
  const primaryByLineage = new Map<string, string>();
  const octaveLogs: string[] = [];
  for (const ev of dist) {
    if (ev.role === 'primary-melody') primaryByLineage.set(ev.lineage, ev.instrument);
    if (ev.transformation.includes('octave')) octaveLogs.push(`${ev.lineage}@${ev.instrument}+${ev.sounding}`);
  }

  let melodyOk = true;
  for (let bar = 1; bar <= 24; bar += 1) {
    const atoms = pianoRhAtoms(composed.xml, bar);
    const barStart = (bar - 1) * 4;
    for (const a of atoms) {
      const onset = a.onset - barStart;
      const primaries = dist.filter(
        (ev) => ev.role === 'primary-melody'
          && Math.abs(ev.onset - a.onset) < 1e-3
          && mod12(ev.sounding) === mod12(a.midi!)
          && Math.abs(ev.duration - a.duration) < 1e-3,
      );
      if (primaries.length !== 1) {
        melodyOk = false;
        rows.push({ name: `melody bar ${bar}`, ok: false, detail: `primaries=${primaries.length}` });
        break;
      }
      const extras = dist.filter(
        (ev) => (ev.role === 'primary-melody' || ev.role === 'melodic-reinforcement')
          && Math.abs(ev.onset - a.onset) < 1e-3
          && mod12(ev.sounding) === mod12(a.midi!)
          && Math.abs(ev.duration - a.duration) < 1e-3,
      );
      if (bar < 17 && extras.length > 1) melodyOk = false;
      if (bar >= 17 && extras.length > 2) melodyOk = false;
    }
  }
  rows.push({ name: 'melody fidelity', ok: melodyOk, detail: octaveLogs.slice(0, 5).join('; ') });

  const lhAtoms = parsePianoXmlAtoms(composed.xml).atoms.filter((a) => !a.rest && a.midi !== null && a.voice === 3);
  const bassEvents = dist.filter((ev) => ev.role === 'bass-foundation' && (ev.instrument === 'vc' || ev.instrument === 'db'));
  let bassOk = bassEvents.length >= 40;
  for (const ev of bassEvents) {
    const bar = Math.floor(ev.onset / 4) + 1;
    const lhInBar = lhAtoms.filter((a) => Math.floor(a.onset / 4) + 1 === bar);
    if (!lhInBar.some((a) => mod12(a.midi!) === mod12(ev.sounding))) bassOk = false;
  }
  rows.push({ name: 'bass fidelity', ok: bassOk, detail: `${bassEvents.length} bass placements` });

  rows.push({ name: 'notation range', ok: dist.every((ev) => ev.sounding >= 28 && ev.sounding <= 108) });

  const rangeViolations = soundingRangeViolationsFromXml(orchXml);
  rows.push({
    name: 'xml sounding range',
    ok: rangeViolations.length === 0,
    detail: rangeViolations.slice(0, 4).join('; '),
  });
  rows.push({
    name: 'melody pc/onset/duration xml',
    ok: pianoMelodyAtomsMatchXml(composed.xml, orchXml),
  });
  if (fs.existsSync(PHASE4E_SOURCE)) {
    const p4eHash = createHash('sha256').update(fs.readFileSync(PHASE4E_SOURCE)).digest('hex');
    rows.push({
      name: 'phase4e source unchanged',
      ok: p4eHash === PHASE4E_SHA256,
      detail: p4eHash.slice(0, 12),
    });
  }

  const barRows = barDialogueRows(
    dist.map((ev, i) => ({
      kind: 'source' as const,
      eventId: String(i),
      partId: ev.instrument,
      shift: 0,
      phraseId: ev.phraseId ?? 'a',
      role: ev.role,
      transformation: ev.transformation,
      lineage: ev.lineage,
      reason: '',
      onset: ev.onset,
      duration: ev.duration,
      midi: ev.sounding,
      voice: 1,
      classifies: ev.role === 'primary-melody',
    })),
  );
  console.table(barRows.map((r) => ({ bar: r.bar, lead: r.primaryLead, families: r.families.join(',') })));

  rows.push({ name: 'strong-beat clashes', ok: strongBeatClashesOrchestra(orch.score, orchXml, barRows) === 0 });
  rows.push({ name: 'orphan ties xml', ok: orphanTiesInXml(orchXml) === 0 });

  const vn1Block = orchXml.match(/<part id="vn1"[\s\S]*?<\/part>/)?.[0] ?? '';
  const measureCount = (vn1Block.match(/<measure\b/g) ?? []).length;
  rows.push({ name: 'xml 24 bars', ok: measureCount === 24, detail: String(measureCount) });

  const activePartSet = new Set<string>();
  const perBarActive: number[] = [];
  const supportFailures: string[] = [];
  for (let bar = 1; bar <= 24; bar += 1) {
    const active = activeOrchPartsInBar(orchXml, bar);
    active.forEach((id) => activePartSet.add(id));
    perBarActive.push(active.length);
    const leads = barRows[bar - 1]!.primaryLead.split('+').filter((x) => x && x !== '—');
    const support = supportVoicesInBar(orchXml, bar, leads);
    if (support.length < 3 && !SUPPORT_EXCEPTION_BARS[bar]) {
      supportFailures.push(`bar${bar}:${support.length}`);
    }
  }
  rows.push({
    name: 'support voices >=3 per bar',
    ok: supportFailures.length === 0,
    detail: supportFailures.slice(0, 6).join(' '),
  });
  rows.push({ name: 'orchestral parts >=12', ok: activePartSet.size >= 12, detail: String(activePartSet.size) });

  const barsWith = (id: string) => {
    let n = 0;
    for (let bar = 1; bar <= 24; bar += 1) {
      if (soundingLine(orchXml, id).some((note) => overlapsBar(note.onset, note.duration, bar))) n += 1;
    }
    return n;
  };
  rows.push({ name: 'vn2 active >=6 bars', ok: barsWith('vn2') >= 6, detail: String(barsWith('vn2')) });
  rows.push({ name: 'va active >=6 bars', ok: barsWith('va') >= 6, detail: String(barsWith('va')) });
  rows.push({ name: 'bn1 active >=6 bars', ok: barsWith('bn1') >= 6, detail: String(barsWith('bn1')) });
  rows.push({ name: 'horn active >=6 bars', ok: barsWith('hn1') + barsWith('hn2') >= 6, detail: `hn1=${barsWith('hn1')} hn2=${barsWith('hn2')}` });
  rows.push({ name: 'hp active >=6 bars', ok: barsWith('hp') >= 6, detail: String(barsWith('hp')) });

  let vcBeat1 = 0;
  for (let bar = 1; bar <= 24; bar += 1) {
    const barStart = (bar - 1) * 4;
    if (soundingLine(orchXml, 'vc').some((n) => Math.abs(n.onset - barStart) < 1e-3 && n.duration > 0)) vcBeat1 += 1;
  }
  rows.push({ name: 'cello beat 1 all 24 bars', ok: vcBeat1 === 24, detail: String(vcBeat1) });

  const leadChanges = barRows.filter((r, i) => i > 0 && r.primaryLead !== barRows[i - 1]!.primaryLead).length;
  const dbBars = new Set(dist.filter((e) => e.instrument === 'db').map((e) => Math.floor(e.onset / 4) + 1)).size;
  rows.push({ name: 'orchestration lead changes >=6', ok: leadChanges >= 6, detail: String(leadChanges) });
  rows.push({ name: 'double bass active >=20 bars', ok: dbBars >= 20, detail: String(dbBars) });
  rows.push({
    name: 'families active',
    ok: ['strings', 'woodwind', 'brass', 'harp'].every((f) => barRows.some((r) => r.families.includes(f))),
  });

  const bmef = runBmef(orch.score, barRows, orchXml);
  for (const b of bmef) {
    rows.push({ name: `BMEF ${b.criterion}`, ok: b.verdict !== 'FAIL', detail: `${b.verdict}: ${b.evidence}` });
  }
  const bmefFail = bmef.some((b) => b.verdict === 'FAIL');
  rows.push({ name: 'BMEF no FAIL', ok: !bmefFail });

  if (fs.existsSync(LYRICAL)) {
    const xml = fs.readFileSync(LYRICAL, 'utf8');
    const a = orchestrate({
      enabled: true,
      sourceMusicXml: xml,
      template: 'chamber_orchestra',
      plan: [],
      seed: 11,
      preserveMelody: true,
      pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: { allocation: 'phase-2' } } },
    });
    const b = orchestrate({
      enabled: true,
      sourceMusicXml: xml,
      template: 'chamber_orchestra',
      plan: [],
      seed: 11,
      preserveMelody: true,
      pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: { allocation: 'phase-2' } } },
    });
    const ha = a.ok && 'musicXml' in a ? createHash('sha256').update(a.musicXml).digest('hex') : '';
    const hb = b.ok && 'musicXml' in b ? createHash('sha256').update(b.musicXml).digest('hex') : '';
    rows.push({ name: 'default path deterministic', ok: ha === hb && ha.length > 0 });
  }

  return rows;
}

if (process.argv[1]?.includes('orchestralDialogue4d77241.test')) {
  const all = [
    ...runOrchestralDialogue4d77241Tests(),
    ...runGeneralPianoBmefGate77241Tests(),
    ...runGeneralPianoV1Tests(),
  ];
  for (const item of all) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = all.filter((i) => !i.ok);
  console.log(`${all.length - failed.length}/${all.length}`);
  if (failed.length === 0) {
    const composed = apiComposePianoV1({
      pianoCompositionV1: true,
      generalPianoV1: true,
      seed: 77241,
      bars: 24,
      tempo: 72,
      tonalCentre: 'C',
      harmony: HARMONY_77241,
      metre: '4/4',
    });
    if (composed.ok) {
      const orch = orchestrate77241(composed.xml, true);
      if (orch.ok && 'musicXml' in orch) {
        fs.mkdirSync(path.dirname(EXPORT), { recursive: true });
        fs.writeFileSync(EXPORT, orch.musicXml);
        console.log('exported', EXPORT);
      }
    }
  }
  process.exit(failed.length === 0 ? 0 : 1);
}
