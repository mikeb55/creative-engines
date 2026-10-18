import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apiComposePianoV1 } from '@composer-os/app-api/pianoCompositionApp';
import { integralTicks, qAdd, qToNumber, PIANO_V11_EXPORT_PPQ } from '@composer-os/core/piano/pianoExactTiming';
import { pianoMidiNotes, writePianoScoreMidi } from '@composer-os/core/piano/pianoMidi';
import { absoluteTicks } from '@composer-os/core/piano/pianoV11Diagnostics';
import { buildPianoTimeline, cyclePlan } from '@composer-os/core/piano/pianoMeterPlan';
import { requestFingerprint, stableRequestText } from '@composer-os/core/piano/pianoV11Windows';
import type { NoteEvent } from '@composer-os/core/score-model/scoreModelTypes';
import {
  applyFullV11Demonstration,
  buildSoloPianoComposeBody,
  canonicalDemonstrationRequest,
  defaultV11Fields,
  formRequestIdentity,
  parseSoloPianoConfig,
  serializeSoloPianoConfig,
  type SoloPianoFormState,
} from '../src/pages/soloPianoV11Editor';

const repo = join(__dirname, '../../..');
const evidenceDir = join(repo, '.tmp-piano-v1.1-stage-c', 'gui-acceptance');

function sha(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function archivedHashes(): Record<string, string> {
  const roots = [
    '.tmp-piano-v1.1-stage-a',
    '.tmp-piano-v1.1-stage-b',
    '.tmp-piano-v1.1-musical-acceptance',
  ];
  const out: Record<string, string> = {};
  for (const root of roots) {
    const walk = (dir: string) => {
      for (const name of readdirSync(join(repo, dir))) {
        const rel = join(dir, name);
        const full = join(repo, rel);
        if (statSync(full).isDirectory()) walk(rel);
        else out[rel] = sha(readFileSync(full));
      }
    };
    walk(root);
  }
  return out;
}

function baseForm(): SoloPianoFormState {
  return {
    piece: 'fixture',
    seed: 76018,
    innerVoice: true,
    bars: 8,
    tempo: 64,
    tonalCentre: 'C',
    harmony: ['Cmaj7'],
    advanced: false,
    ...defaultV11Fields(8),
  };
}

function eventKey(bar: number, event: { kind: string; voice?: number; startBeat: number; duration: number; tie?: string; pianoExact?: NoteEvent['pianoExact']; pitch?: number; pitches?: number[] }): string {
  const exact = event.pianoExact;
  const onset = exact ? `${exact.onsetQ.n}/${exact.onsetQ.d}` : `f${event.startBeat}`;
  const duration = exact ? `${exact.durationQ.n}/${exact.durationQ.d}` : `f${event.duration}`;
  const pitch = event.kind === 'note' ? String(event.pitch) : 'rest';
  const extra = event.kind === 'note' ? (event.pitches ?? []).join('.') : '';
  return `${bar}|${event.kind}|v${event.voice ?? 1}|${pitch}|${extra}|${onset}|${duration}|${event.tie ?? ''}`;
}

describe('Piano V1.1 GUI request', () => {
  it('loads the demonstration into the editable request', () => {
    const form = applyFullV11Demonstration(baseForm());
    const built = buildSoloPianoComposeBody(form);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const canonical = canonicalDemonstrationRequest();
    expect(stableRequestText(built.body)).toBe(stableRequestText(canonical));
    expect(formRequestIdentity(form)).toBe(requestFingerprint(canonical));
    expect(built.body.pianoV11).toMatchObject({
      phraseDevelopment: true,
      polyrhythm: 'off',
    });
    const windows = (built.body.pianoV11 as { rhythmicWindows: unknown[] }).rhythmicWindows;
    expect(windows).toHaveLength(8);
    expect((built.body.harmony as string[])[20]).toBe('Fmaj7');
    expect(built.body.pianoV11).not.toHaveProperty('musicalRefinement');
    expect(form.musicalRefinement).toBe('off');
  });

  it('saves and reloads Stage D without changing the demonstration preset', () => {
    const form = applyFullV11Demonstration(baseForm());
    expect(form.musicalRefinement).toBe('off');
    const saved = parseSoloPianoConfig(serializeSoloPianoConfig({ ...form, musicalRefinement: 'on' }));
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.form.musicalRefinement).toBe('on');
    const built = buildSoloPianoComposeBody(saved.form);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect((built.body.pianoV11 as { musicalRefinement?: boolean }).musicalRefinement).toBe(true);
    const file = JSON.parse(serializeSoloPianoConfig(form)) as { form: { musicalRefinement?: string } };
    delete file.form.musicalRefinement;
    const legacy = parseSoloPianoConfig(JSON.stringify(file));
    expect(legacy.ok).toBe(true);
    if (!legacy.ok) return;
    expect(legacy.form.musicalRefinement).toBe('off');
  });

  it('names the invalid field', () => {
    const form = applyFullV11Demonstration(baseForm());
    const cases: { name: string; mutate: (next: SoloPianoFormState) => void; field: string; text: string }[] = [
      {
        name: 'malformed metre',
        mutate: (next) => { next.meterRows[0]!.numerator = '0'; },
        field: 'pianoV11.meterPlan',
        text: 'numerator',
      },
      {
        name: 'bad grouping',
        mutate: (next) => { next.meterRows[0]!.groups = '1,1'; },
        field: 'pianoV11.meterPlan',
        text: 'groups',
      },
      {
        name: 'duplicate bar',
        mutate: (next) => { next.meterRows[1]!.bar = '1'; },
        field: 'pianoV11.meterPlan',
        text: 'duplicated',
      },
      {
        name: 'missing bar',
        mutate: (next) => { next.meterRows.splice(4, 1); },
        field: 'pianoV11.meterPlan',
        text: 'no meter plan',
      },
      {
        name: 'conflicting windows',
        mutate: (next) => { next.windows[1]!.bar = '1'; next.windows[1]!.offsetN = '0'; next.windows[1]!.offsetD = '1'; },
        field: 'pianoV11.rhythmicWindows[0]',
        text: 'overlaps',
      },
      {
        name: 'invalid fraction',
        mutate: (next) => { next.windows[0]!.offsetD = '0'; },
        field: 'pianoV11.rhythmicWindows[0].offset',
        text: 'denominator',
      },
      {
        name: 'unsupported extent',
        mutate: (next) => { next.windows[0]!.extentN = '3'; next.windows[0]!.extentD = '1'; },
        field: 'pianoV11.rhythmicWindows[0].extent',
        text: 'not a supported notation length',
      },
      {
        name: 'invalid polychord',
        mutate: (next) => { next.polychordRegions[0]!.startBar = '0'; },
        field: 'pianoV11.polychords',
        text: 'outside',
      },
    ];
    for (const item of cases) {
      const next = applyFullV11Demonstration(baseForm());
      item.mutate(next);
      const built = buildSoloPianoComposeBody(next);
      expect(built.ok, item.name).toBe(false);
      if (built.ok) continue;
      expect(built.fieldErrors.some((error) => error.field === item.field), `${item.name} ${built.error}`).toBe(true);
      expect(built.error, item.name).toContain(item.text);
      expect(formRequestIdentity(next).startsWith('invalid:'), item.name).toBe(true);
    }
  });

  it('reloads the same request identity and leaves legacy pieces alone', () => {
    const form = applyFullV11Demonstration(baseForm());
    const text = serializeSoloPianoConfig(form);
    const parsed = parseSoloPianoConfig(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(formRequestIdentity(parsed.form)).toBe(formRequestIdentity(form));
    const legacy = buildSoloPianoComposeBody({ ...parsed.form, piece: 'fixture', advanced: false });
    expect(legacy.ok).toBe(true);
    if (!legacy.ok) return;
    expect(legacy.body.pianoV11).toBeUndefined();
    expect(legacy.body.generalPianoV1).toBeUndefined();
    expect(legacy.body.filmCue).toBeUndefined();
    const broken = parseSoloPianoConfig('{');
    expect(broken.ok).toBe(false);
    if (broken.ok) return;
    expect(broken.error).toContain('soloPianoConfig');
  });

  it('composes the GUI demonstration through the piano API', () => {
    const before = archivedHashes();
    const form = applyFullV11Demonstration(baseForm());
    const built = buildSoloPianoComposeBody(form);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const direct = apiComposePianoV1(canonicalDemonstrationRequest());
    const gui = apiComposePianoV1(built.body);
    expect(gui.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (!gui.ok || !direct.ok) return;
    expect(gui.xml).toBe(direct.xml);
    expect(gui.elapsedSeconds).toBe(103.75);
    expect(gui.soundingAttacks).toBe(223);
    expect(gui.score.parts[0]?.measures).toHaveLength(24);
    expect(gui.score.parts[0]?.measures[20]?.chordSymbol).toBe('Fmaj7');

    const guiEvents = gui.score.parts[0]!.measures.flatMap((measure) => measure.events.map((event) => eventKey(measure.index, event))).sort();
    const directEvents = direct.score.parts[0]!.measures.flatMap((measure) => measure.events.map((event) => eventKey(measure.index, event))).sort();
    expect(guiEvents).toEqual(directEvents);

    const scratch = join(tmpdir(), `piano-v11-gui-${process.pid}`);
    mkdirSync(evidenceDir, { recursive: true });
    mkdirSync(scratch, { recursive: true });
    const guiMidi = join(evidenceDir, 'gui-demonstration.mid');
    const directMidi = join(scratch, 'direct.mid');
    writeFileSync(join(evidenceDir, 'gui-demonstration.musicxml'), gui.xml);
    writeFileSync(join(evidenceDir, 'gui-request.json'), `${JSON.stringify(built.body, null, 2)}\n`);
    writePianoScoreMidi(gui.score, guiMidi);
    writePianoScoreMidi(direct.score, directMidi);
    const produced = pianoMidiNotes(guiMidi);
    const directNotes = pianoMidiNotes(directMidi);
    const archived = pianoMidiNotes(join(repo, '.tmp-piano-v1.1-stage-b/acceptance/piano-v11-stage-b-combined-seed76018-24bars.mid'));
    const key = (note: { midi: number; ticks: number; durationTicks: number }) => `${note.midi}@${note.ticks}+${note.durationTicks}`;
    expect(produced.notes.map(key).sort()).toEqual(directNotes.notes.map(key).sort());
    expect(produced.notes.map(key).sort()).toEqual(archived.notes.map(key).sort());
    expect(produced.notes).toHaveLength(223);
    expect(produced.ppq).toBe(480);

    const timeline = buildPianoTimeline(cyclePlan(4));
    let diagnosticMismatches = 0;
    let rationalExportMismatches = 0;
    const samples: string[] = [];
    let cursor = 0;
    for (const bar of timeline) {
      const floatTicks = Math.round(qToNumber(bar.span) * PIANO_V11_EXPORT_PPQ);
      const exactTicks = integralTicks(bar.span, PIANO_V11_EXPORT_PPQ);
      if (floatTicks !== exactTicks) rationalExportMismatches += 1;
      cursor += exactTicks ?? 0;
    }
    expect(cursor).toBe(39840);
    for (const measure of gui.score.parts[0]!.measures) {
      const bar = timeline[measure.index - 1]!;
      const barStartTicks = integralTicks(bar.start, PIANO_V11_EXPORT_PPQ)!;
      for (const event of measure.events) {
        if (event.kind !== 'note' || !event.pianoExact) continue;
        const rational = integralTicks(qAdd(bar.start, event.pianoExact.onsetQ), PIANO_V11_EXPORT_PPQ);
        const diagnostic = absoluteTicks(event, qToNumber(bar.start));
        const floatOnset = diagnostic ? diagnostic.onset : null;
        if (rational !== floatOnset) {
          diagnosticMismatches += 1;
          if (samples.length < 8) {
            samples.push(`bar ${measure.index} pitch ${event.pitch} rational ${rational} absoluteTicks ${floatOnset}`);
          }
        }
        const midiStart = barStartTicks + (integralTicks(event.pianoExact.onsetQ, PIANO_V11_EXPORT_PPQ) ?? -1);
        if (midiStart !== rational) rationalExportMismatches += 1;
      }
    }
    const after = archivedHashes();
    expect(after).toEqual(before);
    const report = {
      bars: 24,
      soundingAttacks: gui.soundingAttacks,
      elapsedSeconds: gui.elapsedSeconds,
      windows: 8,
      bar21: gui.score.parts[0]?.measures[20]?.chordSymbol,
      requestFingerprint: requestFingerprint(built.body),
      xmlEqual: true,
      midiEqualToStageB: true,
      eventCount: guiEvents.length,
      diagnosticMismatches,
      rationalExportMismatches,
      diagnosticSamples: samples,
      archivedFileCount: Object.keys(before).length,
      archivedUnchanged: true,
    };
    writeFileSync(join(evidenceDir, 'acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
    expect(rationalExportMismatches).toBe(0);
    expect(report.archivedUnchanged).toBe(true);
  });
});
