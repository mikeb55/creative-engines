/**
 * V4.0 — 48-bar varied orchestral reprise (4E × 2 piano + pass-2 dialogue).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import {
  exportJoinedGeneralPianoScore,
  joinGeneralPianoVariedReprise,
} from '../core/piano/pianoSectionJoin';
import { parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import { orchestrate, soundingLine } from '../core/orchestrate/orchestrate';
import { getInstrument } from '../core/instruments/instrumentCatalogue';
import { SYMPHONIC_SLOTS } from '../core/orchestrate/symphonicWriting';
import {
  ORCHESTRAL_DIALOGUE_VARIED_REPEAT_48,
  barDialogueRows,
} from '../core/symphonic/orchestralDialoguePlan';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  auditExportedXmlLhCoverage,
  auditExportedXmlTiePairs,
} from './orchestralDialogue4d77241.test';

const ROOT = process.cwd();
const EXPORT = path.join(ROOT, '.tmp-piano-24bar-original-test/Seed77241-48bar-varied-repeat.musicxml');
const FLUTE_MIN_SOUNDING = 60;

const ORCH_PART_IDS = [
  'vn1', 'vn2', 'va', 'vc', 'db', 'fl1', 'ob1', 'cl1', 'cl2', 'bn1', 'bn2',
  'hn1', 'hn2', 'hn3', 'hn4', 'tp1', 'tbn1', 'tbn2', 'hp',
] as const;

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
];

const mod12 = (v: number) => ((v % 12) + 12) % 12;
const BASS_PART_IDS = new Set(['vc', 'db']);

function pitchClassDistance(a: number, b: number): number {
  const d = Math.abs(mod12(a) - mod12(b));
  return Math.min(d, 12 - d);
}

function soundsAtBeat(notes: ReturnType<typeof soundingLine>, globalBeat: number): number[] {
  const midis: number[] = [];
  for (const n of notes) {
    if (n.onset <= globalBeat + 1e-6 && n.onset + n.duration > globalBeat + 1e-6) midis.push(n.midi);
  }
  return midis;
}

function auditMelodyDissonance48(pianoXml: string, orchXml: string): string[] {
  const failures: string[] = [];
  for (let bar = 1; bar <= 48; bar += 1) {
    const barStart = (bar - 1) * 4;
    const melodyAtoms = pianoRhAtoms(pianoXml, bar);
    const onsetBeats = melodyAtoms
      .map((a) => a.onset - barStart)
      .filter((beat) => Math.abs(beat - 0) < 1e-3 || Math.abs(beat - 2) < 1e-3);
    for (const beat of onsetBeats) {
      const t = barStart + beat;
      const melodyMidis = melodyAtoms
        .filter((a) => Math.abs(a.onset - barStart - beat) < 1e-3)
        .map((a) => a.midi!);
      for (const partId of ORCH_PART_IDS) {
        if (BASS_PART_IDS.has(partId)) continue;
        for (const midi of soundsAtBeat(soundingLine(orchXml, partId), t)) {
          for (const mm of melodyMidis) {
            const ic = pitchClassDistance(mm, midi);
            if (ic === 1 || ic === 11) failures.push(`bar ${bar} ${partId}`);
          }
        }
      }
    }
  }
  return failures;
}

function measureEventSig(score: ScoreModel, bar: number): string {
  const measure = score.parts[0]?.measures[bar - 1];
  const notes = (measure?.events ?? []).filter((e) => e.kind === 'note') as NoteEvent[];
  return notes
    .map((n) => `${n.voice ?? 1}:${n.startBeat}:${n.duration}:${n.pitch}`)
    .sort()
    .join(',');
}

function pianoRhAtoms(xml: string, bar: number) {
  const { atoms } = parsePianoXmlAtoms(xml);
  const start = (bar - 1) * 4;
  const end = bar * 4;
  return atoms.filter((a) => !a.rest && a.midi !== null && a.onset >= start && a.onset < end && a.voice === 1);
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

function soundingRangeViolations(xml: string): string[] {
  const failures: string[] = [];
  const slotByPart = new Map(SYMPHONIC_SLOTS.map((slot) => [slot.partId, slot]));
  for (const partId of ORCH_PART_IDS) {
    const slot = slotByPart.get(partId);
    if (!slot) continue;
    const hard = getInstrument(slot.instrumentId).soundingHardRange;
    if (!hard) continue;
    const min = partId === 'fl1' ? FLUTE_MIN_SOUNDING : hard[0];
    for (const note of soundingLine(xml, partId)) {
      if (note.midi < min || note.midi > hard[1]) {
        failures.push(`${partId} bar ${Math.floor(note.onset / 4) + 1} midi ${note.midi}`);
      }
    }
  }
  return failures;
}

function melodySurvivalHalf(pianoXml: string, orchXml: string, barFrom: number, barThrough: number): boolean {
  for (let bar = barFrom; bar <= barThrough; bar += 1) {
    for (const a of pianoRhAtoms(pianoXml, bar)) {
      const hit = ORCH_PART_IDS.some((partId) =>
        soundingLine(orchXml, partId).some(
          (n) => Math.abs(n.onset - a.onset) < 1e-3
            && Math.abs(n.duration - a.duration) < 1e-3
            && mod12(n.midi) === mod12(a.midi!),
        ),
      );
      if (!hit) return false;
    }
  }
  return true;
}

function partBlock(xml: string, partId: string): string {
  return xml.match(new RegExp(`<part id="${partId}"[\\s\\S]*?</part>`))?.[0] ?? '';
}

function measureBlock(partXml: string, bar: number): string {
  return (partXml.match(/<measure\b[\s\S]*?<\/measure>/g) ?? [])[bar - 1] ?? '';
}

function dynamicsTokens(measureXml: string): string[] {
  const out: string[] = [];
  const re = /<dynamics><([a-z]+)\/><\/dynamics>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(measureXml))) out.push(m[1]!.toLowerCase());
  return out;
}

function orchestrate48(pianoXml: string) {
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
          orchestralDialogue: ORCHESTRAL_DIALOGUE_VARIED_REPEAT_48,
        },
      },
    },
  });
}

export function runOrchestralVariedRepeat48Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  const fourE = apiComposePianoV1({
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed: 77241,
    bars: 24,
    tempo: 72,
    tonalCentre: 'C',
    harmony: HARMONY_77241,
    metre: '4/4',
  });
  rows.push({ name: '4E composes', ok: fourE.ok, detail: fourE.ok ? '' : fourE.error });
  if (!fourE.ok || !fourE.score) return rows;

  const joined = joinGeneralPianoVariedReprise(fourE.score);
  const exportedPiano = exportJoinedGeneralPianoScore(joined);
  rows.push({ name: '48-bar piano export', ok: exportedPiano.ok, detail: exportedPiano.ok ? '' : exportedPiano.error });
  if (!exportedPiano.ok) return rows;
  const pianoXml = exportedPiano.xml;

  let halfMatch = true;
  for (let bar = 1; bar <= 24; bar += 1) {
    if (measureEventSig(fourE.score, bar) !== measureEventSig(joined, bar)) halfMatch = false;
    if (measureEventSig(fourE.score, bar) !== measureEventSig(joined, bar + 24)) halfMatch = false;
  }
  rows.push({ name: 'both halves note-identical to 4E', ok: halfMatch });

  const orch = orchestrate48(pianoXml);
  rows.push({ name: 'orchestrate varied repeat', ok: orch.ok, detail: orch.ok ? '' : orch.error });
  if (!orch.ok || !('musicXml' in orch) || !orch.musicXml) return rows;
  const orchXml = orch.musicXml;

  const vn1Measures = (partBlock(orchXml, 'vn1').match(/<measure\b/g) ?? []).length;
  rows.push({ name: '48 orchestral bars', ok: vn1Measures === 48, detail: String(vn1Measures) });

  rows.push({ name: 'melody survival bars 1–24', ok: melodySurvivalHalf(pianoXml, orchXml, 1, 24) });
  rows.push({ name: 'melody survival bars 25–48', ok: melodySurvivalHalf(pianoXml, orchXml, 25, 48) });

  const rangeFails = soundingRangeViolations(orchXml);
  rows.push({ name: 'sounding ranges', ok: rangeFails.length === 0, detail: rangeFails.slice(0, 3).join('; ') });

  const tieFails = auditExportedXmlTiePairs(orchXml);
  rows.push({ name: 'orphan ties', ok: tieFails.length === 0, detail: String(tieFails.length) });

  const lhFails = auditExportedXmlLhCoverage(pianoXml, orchXml);
  rows.push({ name: 'LH survival', ok: lhFails.length === 0, detail: String(lhFails.length) });

  const disFails = auditMelodyDissonance48(pianoXml, orchXml);
  rows.push({ name: 'melody m2/M7 clashes', ok: disFails.length === 0, detail: String(disFails.length) });

  let vcBeat1 = 0;
  let dbBeat1 = 0;
  for (let bar = 1; bar <= 48; bar += 1) {
    const barStart = (bar - 1) * 4;
    if (soundingLine(orchXml, 'vc').some((n) => Math.abs(n.onset - barStart) < 1e-3 && n.duration > 0)) vcBeat1 += 1;
    if (soundingLine(orchXml, 'db').some((n) => Math.abs(n.onset - barStart) < 1e-3 && n.duration > 0)) dbBeat1 += 1;
  }
  let bassBeat1Ok = true;
  for (let bar = 1; bar <= 48; bar += 1) {
    const barStart = (bar - 1) * 4;
    const vc = soundingLine(orchXml, 'vc').some((n) => Math.abs(n.onset - barStart) < 1e-3 && n.duration > 0);
    const db = soundingLine(orchXml, 'db').some((n) => Math.abs(n.onset - barStart) < 1e-3 && n.duration > 0);
    if (!vc && !db) bassBeat1Ok = false;
  }
  rows.push({
    name: 'Vc/Cb bass beat 1 all bars',
    ok: bassBeat1Ok,
    detail: `vc=${vcBeat1} db=${dbBeat1}`,
  });

  const dist = orch.fidelity?.symphonic?.distribution?.events ?? [];
  const placements = dist.map((ev, i) => ({
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
  }));
  const barRows = barDialogueRows(placements, 48);
  let leadDiff = 0;
  for (let bar = 1; bar <= 24; bar += 1) {
    const a = barRows[bar - 1]!.primaryLead;
    const b = barRows[bar + 23]!.primaryLead;
    if (a !== b && a !== '—' && b !== '—') leadDiff += 1;
  }
  rows.push({ name: 'pass-2 lead differs >=75%', ok: leadDiff >= 18, detail: `${leadDiff}/24` });

  let maxClimaxParts = 0;
  let climaxFf = false;
  for (let bar = 45; bar <= 47; bar += 1) {
    maxClimaxParts = Math.max(maxClimaxParts, activeOrchPartsInBar(orchXml, bar).length);
    const marks = ORCH_PART_IDS.flatMap((id) => dynamicsTokens(measureBlock(partBlock(orchXml, id), bar)));
    if (marks.includes('ff')) climaxFf = true;
  }
  rows.push({ name: 'climax ff bars 45–47', ok: climaxFf, detail: `maxParts=${maxClimaxParts}` });

  let globalPeak = -1;
  let peakBar = 0;
  for (const partId of ORCH_PART_IDS) {
    for (const n of soundingLine(orchXml, partId)) {
      if (n.midi > globalPeak) {
        globalPeak = n.midi;
        peakBar = Math.floor(n.onset / 4) + 1;
      }
    }
  }
  rows.push({
    name: 'register peak bars 41–44',
    ok: peakBar >= 41 && peakBar <= 44,
    detail: `peak midi ${globalPeak} bar ${peakBar}`,
  });

  const bar48Parts = activeOrchPartsInBar(orchXml, 48).length;
  rows.push({ name: 'bar 48 <=8 parts', ok: bar48Parts <= 8, detail: String(bar48Parts) });

  const failed = rows.filter((r) => !r.ok);
  if (failed.length === 0) {
    fs.mkdirSync(path.dirname(EXPORT), { recursive: true });
    fs.writeFileSync(EXPORT, orchXml, 'utf8');
    const measuresInFile = (orchXml.match(/<measure\b/g) ?? []).length / ORCH_PART_IDS.length;
    rows.push({ name: 'export written', ok: fs.existsSync(EXPORT) && measuresInFile >= 48, detail: EXPORT });
  }

  return rows;
}

if (process.argv[1]?.includes('orchestralVariedRepeat48.test')) {
  const rows = runOrchestralVariedRepeat48Tests();
  for (const item of rows) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = rows.filter((i) => !i.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
