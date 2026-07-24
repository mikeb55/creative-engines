/**
 * Riff Generator — internal composite gate, export sanity, honest app naming.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import { normalizeChordLoop, normalizeChordLoopWithDisclosure } from '../core/riff-generator/riffChordLoop';
import {
  previewRiffChordLoopTokens,
  replaceRiffChordLoopTokenAt,
  riffChordLoopGenerateBlocked,
  riffChordTokenAckKey,
  riffChordTokenGateKind,
} from '../core/riff-generator/riffChordLoop';
import { parseChordsFromPipeDelimited } from '../core/harmony/chordProgressionParser';
import { runRiffGeneratorApp } from '../app-api/riffGeneratorApp';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';
import { runRiffQualityRulesSuite } from './riffQualityRules.test';
import { rhythmFingerprint } from '../core/riff-generator/riffRhythm';
import {
  bassRiffPitchFieldForBar,
  guitarRiffPitchFieldForBar,
  resolveStyleModeForBar,
  voicingClassForChordSymbol,
} from '../core/riff-generator/riffPitchField';
import { noteNameToPitchClass, parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { resolveRiffGeneratorProfileWithMeta } from '../core/riff-generator/resolveRiffGeneratorProfile';
import { runRiffReceiptCompilerTests } from './riffReceiptCompiler.test';
import { runRiffHornStabBuilderTests } from './riffHornStabBuilder.test';
import { runRiffCallResponseEngineTests } from './riffCallResponseEngine.test';
import { runRiffBassInterlockTests } from './riffBassInterlock.test';
import { runRiffMusicalityGateTests } from './riffMusicalityGate.test';
import { runRiffCarryForwardTests } from './riffCarryForward.test';
import { runRiffVariationApplyTests } from './riffVariationApply.test';
import { runRiffZappaSoloTests } from './riffZappaSolo.test';
import { runRiffIntervalWeightsPitchTests } from './riffIntervalWeightsPitch.test';
import { runRiffEnforceHookIntervalGateTests } from './riffEnforceHookIntervalGate.test';
import { runRiffMotifBlendLeapGateTests } from './riffMotifBlendLeapGate.test';

function countMelodicNotes(score: ScoreModel): number {
  let n = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') n++;
      }
    }
  }
  return n;
}

function barsWithNotes(score: ScoreModel): number {
  let b = 0;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  for (const m of g.measures) {
    if (m.events.some((e) => e.kind === 'note')) b++;
  }
  return b;
}

function firstAndLastGuitarPitchClass(score: ScoreModel): { firstPc: number; lastPc: number } | null {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return null;
  const notes: number[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const voice = (e as { voice?: number }).voice ?? 1;
      if (voice !== 1) continue;
      notes.push((e as { pitch: number }).pitch);
    }
  }
  if (notes.length < 2) return null;
  return {
    firstPc: ((notes[0] % 12) + 12) % 12,
    lastPc: ((notes[notes.length - 1] % 12) + 12) % 12,
  };
}

function offbeatAttackCount(perBarRhythm: { startBeat: number; rest: boolean }[][]): number {
  let n = 0;
  for (const bar of perBarRhythm) {
    for (const s of bar) {
      if (s.rest) continue;
      if (Math.abs(s.startBeat - Math.round(s.startBeat)) > 0.11) n++;
    }
  }
  return n;
}

export function runRiffGeneratorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const prog =
      'Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9';
    const parsed = parseChordsFromPipeDelimited(prog);
    const loop = normalizeChordLoop(prog, 8);
    const okParse = parsed.length === 8 && parsed.every((e) => e != null);
    const okLoop =
      loop.length === 8 &&
      loop[4]!.replace(/\s+/g, '').toLowerCase().startsWith('f#m') &&
      loop[5]!.replace(/\s+/g, '').toLowerCase().startsWith('bmaj');
    out.push({
      ok: okParse && okLoop,
      name: 'normalizeChordLoop: 8-chord external progression preserves bars 5–8 (no 4-chord cap)',
    });
  }

  {
    const { chords, disclosure } = normalizeChordLoopWithDisclosure('Cmin7 | Dmin7', 2);
    const ok =
      chords[0] === 'Cm7' &&
      chords[1] === 'Dm7' &&
      disclosure.substitutions.length === 2 &&
      disclosure.unsupported.length === 0 &&
      disclosure.substitutions.some((s) => s.originalToken === 'Cmin7' && s.usedSymbol === 'Cm7');
    out.push({
      ok,
      name: 'normalizeChordLoopWithDisclosure: spelling normalize → substitution rows',
    });
  }

  {
    const { chords, disclosure } = normalizeChordLoopWithDisclosure('Cmaj7 | NOTACHORD | Dm7', 6);
    const unsup = disclosure.unsupported.find((u) => u.originalToken === 'NOTACHORD');
    const ok =
      chords.length === 6 &&
      chords[0] === 'Cmaj7' &&
      chords[1] === 'Am7' &&
      chords[2] === 'Dm7' &&
      chords[4] === 'Am7' &&
      !!unsup &&
      unsup.usedSymbol === 'Am7' &&
      unsup.bars.includes(2) &&
      unsup.bars.includes(5) &&
      disclosure.substitutions.length === 0;
    out.push({
      ok,
      name: 'normalizeChordLoopWithDisclosure: null slot → Am7 + unsupported bars (Phase 1 trust)',
    });
  }

  {
    const { disclosure } = normalizeChordLoopWithDisclosure('Am7 | Dm7', 4);
    out.push({
      ok: disclosure.unsupported.length === 0 && disclosure.substitutions.length === 0,
      name: 'normalizeChordLoopWithDisclosure: clean loop has empty disclosure',
    });
  }

  {
    const { disclosure } = normalizeChordLoopWithDisclosure('', 4);
    out.push({
      ok: disclosure.unsupported.length === 0 && disclosure.substitutions.length === 0,
      name: 'normalizeChordLoopWithDisclosure: empty input vamp has no disclosure',
    });
  }

  {
    const prog = 'Cmaj7 | NOTACHORD | Dm7 | G7';
    const r = runRiffGenerator(91001, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'ChordTrust',
      chordProgressionText: prog,
    });
    const d = r.success ? r.chordLoopDisclosure : undefined;
    const ok =
      r.success === true &&
      !!d &&
      d.unsupported.some(
        (u) => u.originalToken === 'NOTACHORD' && u.usedSymbol === 'Am7' && u.bars.includes(2)
      );
    out.push({
      ok,
      name: 'runRiffGenerator: chordLoopDisclosure surfaces unsupported Am7 fill',
    });
  }

  {
    const empty = previewRiffChordLoopTokens('');
    const valid = previewRiffChordLoopTokens('Am7 | Dm7');
    const norm = previewRiffChordLoopTokens('Cmin7 | Dm7');
    const bad = previewRiffChordLoopTokens('Cmaj7 | NOTACHORD | Dm7');
    const softAcks = new Set<string>();
    const softKey = riffChordTokenAckKey({
      index: 0,
      token: 'Cmin7',
      usedSymbol: 'Cm7',
    });
    const okEmpty = empty.length === 0 && !riffChordLoopGenerateBlocked(empty, softAcks);
    const okValid =
      valid.every((t) => riffChordTokenGateKind(t.status) === 'none') &&
      !riffChordLoopGenerateBlocked(valid, softAcks);
    const okNormBlocked =
      norm[0]?.status === 'normalized' &&
      riffChordTokenGateKind(norm[0]!.status) === 'soft' &&
      riffChordLoopGenerateBlocked(norm, softAcks);
    softAcks.add(softKey);
    const okNormAcked = !riffChordLoopGenerateBlocked(norm, softAcks);
    const okHard =
      bad.some((t) => t.status === 'unsupported') &&
      riffChordLoopGenerateBlocked(bad, new Set());
    const replaced = replaceRiffChordLoopTokenAt('Cmaj7 | NOTACHORD | Dm7', 1, 'Am7');
    const afterPick = previewRiffChordLoopTokens(replaced);
    const okPick =
      replaced.includes('Am7') &&
      afterPick[1]?.status === 'valid' &&
      !riffChordLoopGenerateBlocked(afterPick, new Set());
    out.push({
      ok: okEmpty && okValid && okNormBlocked && okNormAcked && okHard && okPick,
      name: 'Phase 3 chord-loop gate: empty ungated / valid free / soft ack / hard pick',
    });
  }

  {
    const prog =
      'Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9';
    const r = runRiffGenerator(4242, {
      bars: 8,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'ChordProg',
      chordProgressionText: prog,
    });
    const g = r.success ? r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar') : undefined;
    const harmonies = g?.measures.map((m) => (m.chord ?? '').replace(/\s+/g, '')) ?? [];
    const ok =
      r.success === true &&
      harmonies.length === 8 &&
      harmonies[4]!.toLowerCase().includes('f#m') &&
      harmonies[5]!.toLowerCase().includes('bmaj');
    out.push({
      ok,
      name: 'runRiffGenerator: external 8-bar chord progression on score measures (not Am7 vamp)',
    });
  }

  {
    const seed = 1701;
    const neutral = runRiffGenerator(seed, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style2Neutral',
    });
    const scofield = runRiffGenerator(seed, {
      bars: 2,
      density: 'medium',
      style: 'scofield',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style2Sco',
    });
    const funk = runRiffGenerator(seed, {
      bars: 2,
      density: 'medium',
      style: 'funk',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style2Funk',
    });
    const nNeutral = neutral.success ? offbeatAttackCount(neutral.perBarRhythm) : -1;
    const nSco = scofield.success ? offbeatAttackCount(scofield.perBarRhythm) : -1;
    const nFunk = funk.success ? offbeatAttackCount(funk.perBarRhythm) : -1;
    const ok = neutral.success && scofield.success && funk.success && nSco >= nNeutral && nFunk >= nSco;
    out.push({
      ok,
      name: 'runRiffGenerator: 2-bar style profile yields neutral<=scofield<=funk offbeat attack count',
    });
  }

  {
    const seed = 1701;
    const neutral = runRiffGenerator(seed, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style4Neutral',
    });
    const scofield = runRiffGenerator(seed, {
      bars: 4,
      density: 'medium',
      style: 'scofield',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style4Sco',
    });
    const funk = runRiffGenerator(seed, {
      bars: 4,
      density: 'medium',
      style: 'funk',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style4Funk',
    });
    const nNeutral = neutral.success ? offbeatAttackCount(neutral.perBarRhythm) : -1;
    const nSco = scofield.success ? offbeatAttackCount(scofield.perBarRhythm) : -1;
    const nFunk = funk.success ? offbeatAttackCount(funk.perBarRhythm) : -1;
    const ok = neutral.success && scofield.success && funk.success && nSco >= nNeutral && nFunk >= nSco;
    out.push({
      ok,
      name: 'runRiffGenerator: 4-bar style profile yields neutral<=scofield<=funk offbeat attack count',
    });
  }

  {
    const r = runRiffGenerator(811, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 104,
      title: 'CallResponse',
    });
    const fps = r.success ? r.perBarRhythm.map((bar) => rhythmFingerprint(bar)) : [];
    const distinct = new Set(fps).size;
    const ok =
      r.success === true &&
      fps.length === 4 &&
      distinct >= 2 &&
      fps[0] !== fps[1] &&
      fps[0] === fps[2];
    out.push({
      ok,
      name: 'runRiffGenerator: 4-bar rhythm uses A/B call-response contrast with A recall',
    });
  }

  {
    const r = runRiffGenerator(1307, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 104,
      title: 'ClosureCadence',
    });
    const pcs = r.success ? firstAndLastGuitarPitchClass(r.score) : null;
    const ok = r.success === true && pcs != null && pcs.firstPc === pcs.lastPc;
    out.push({
      ok,
      name: 'runRiffGenerator: final melodic pitch class cadences to opening pitch class in 4-bar loop',
    });
  }

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'Smoke',
    });
    const notes = r.success ? countMelodicNotes(r.score) : 0;
    const barsOk = r.success ? barsWithNotes(r.score) : 0;
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      notes >= 4 &&
      barsOk >= 2 &&
      r.xml.includes('<score-partwise') &&
      r.xml.includes('Riff') &&
      r.score.title === 'Smoke' &&
      r.xml.includes('<work-title>Smoke</work-title>');
    out.push({
      ok,
      name: 'runRiffGenerator seed 0 passes internal riff composite gate and exports XML',
    });
  }

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'guitar_bass',
      bassEnabled: true,
      bpm: 100,
      title: 'Bass',
    });
    const notes = r.success ? countMelodicNotes(r.score) : 0;
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      notes >= 6 &&
      r.xml.includes('Upright Bass') &&
      r.xml.includes('midi-program') &&
      r.score.title === 'Bass' &&
      r.xml.includes('<work-title>Bass</work-title>');
    out.push({
      ok,
      name: 'runRiffGenerator guitar+bass mode exports with bass part',
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-riff-app-'));
    try {
      const baseStyle = {
        primary: 'barry_harris' as const,
        styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
      };
      const r = runRiffGeneratorApp(
        {
          presetId: 'riff_generator',
          styleStack: baseStyle,
          seed: 101,
          title: 'ManifestTrust',
          totalBars: 2,
          riffStyle: 'neutral',
          riffDensity: 'medium',
          riffGrid: 'eighth',
          riffLineMode: 'single_line',
          riffBass: false,
          bpm: 100,
        },
        tmp
      );
      let ok =
        r.success &&
        !!r.filename &&
        !r.filename.includes('GCE') &&
        r.filename.includes('seed101') &&
        r.filename.includes('neutral') &&
        r.filename.endsWith('-2b.musicxml');
      ok = ok && r.validation?.behaviourGatesPassed === false && r.validation?.readiness?.shareable === false;
      if (ok && r.filepath && fs.existsSync(r.filepath)) {
        const mp = manifestPathForMusicXml(r.filepath);
        const raw = fs.readFileSync(mp, 'utf-8');
        const mj = JSON.parse(raw) as {
          validation?: { behaviourGates?: boolean; shareable?: boolean };
          riffCompositeScore?: number;
          riffInternalGatePassed?: boolean;
          harmonicVoiceIgnoredOnRiffPreset?: boolean;
          riffQualityRules?: { aggregatePass?: boolean; rules?: unknown[] };
          seed?: number;
          gceScore?: number;
        };
        ok =
          mj.validation?.behaviourGates === false &&
          mj.validation?.shareable === false &&
          typeof mj.riffCompositeScore === 'number' &&
          mj.riffCompositeScore !== undefined &&
          mj.riffInternalGatePassed === true &&
          mj.harmonicVoiceIgnoredOnRiffPreset === true &&
          r.harmonicVoiceIgnoredOnRiffPreset === true &&
          r.runManifest?.harmonicVoiceIgnoredOnRiffPreset === true &&
          mj.seed === 101 &&
          mj.gceScore === undefined &&
          typeof mj.riffQualityRules?.aggregatePass === 'boolean' &&
          (mj.riffQualityRules?.rules?.length ?? 0) >= 8;
      } else {
        ok = false;
      }
      out.push({ ok, name: 'runRiffGeneratorApp: filenames neutral; manifest honest (no duo GCE mimicry)' });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  {
    const extPc = (sym: string, semi: number): number => {
      const parsed = parseChordSymbol(sym);
      const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
      const rootPc = rm ? (noteNameToPitchClass(rm[1]!) ?? 0) : 0;
      return (rootPc + semi) % 12;
    };
    const cases: Array<{
      sym: string;
      voicing: ReturnType<typeof voicingClassForChordSymbol>;
      extSemi?: number;
    }> = [
      { sym: 'BbMaj7#11', voicing: 'maj7_spread_upper', extSemi: 6 },
      { sym: 'Eb9sus4', voicing: 'sus_no_third' },
      { sym: 'Gsus2', voicing: 'sus_no_third' },
      { sym: 'F#m9', voicing: 'dom_close_379' },
      { sym: 'G13', voicing: 'dom_close_379', extSemi: 9 },
      { sym: 'Cadd9', voicing: 'dom_close_379', extSemi: 2 },
    ];
    const ok = cases.every((c) => {
      if (voicingClassForChordSymbol(c.sym) !== c.voicing) return false;
      const parsed = parseChordSymbol(c.sym);
      const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
      const rootPc = rm ? (noteNameToPitchClass(rm[1]!) ?? -1) : -1;
      const bass = bassRiffPitchFieldForBar(c.sym, 0);
      const hasRoot = bass.allowedPcs.some((e) => e.pc === rootPc);
      if (!hasRoot) return false;
      if (c.extSemi !== undefined) {
        return bass.allowedPcs.some((e) => e.pc === extPc(c.sym, c.extSemi!));
      }
      return true;
    });
    out.push({
      ok,
      name: 'chord symbols map to voicing class and bass root+extension (no Am7 fallback)',
    });
  }

  {
    const g = guitarRiffPitchFieldForBar('E9', 'neutral', undefined, 'blues_rock' as const);
    const led = resolveStyleModeForBar('led_zeppelin', 'BbMaj7#11', 2);
    const ok = g.allowedPcs.length >= 3 && led === 'epic_modal_heavy';
    out.push({
      ok,
      name: 'led_zeppelin resolveStyleModeForBar + guitar pitch field depth',
    });
  }

  {
    const meta = resolveRiffGeneratorProfileWithMeta({
      vrbId: 'led_zeppelin',
      style: 'neutral',
      grid: 'eighth',
      density: 'medium',
    });
    const ok =
      meta.profile.variationOperatorsByStyleMode?.blues_rock !== undefined ||
      (meta.profile.variationOperators?.length ?? 0) > 0;
    out.push({
      ok,
      name: 'led_zeppelin profile includes compiled page_variation operators',
    });
  }

  {
    const r = runRiffGenerator(90210, {
      vrbId: 'sly_stone',
      bars: 4,
      density: 'medium',
      style: 'funk',
      grid: 'sixteenth',
      lineMode: 'guitar_bass',
      bassEnabled: true,
      bpm: 100,
      title: 'SlyMulti',
    });
    const horns = r.success ? r.score.parts.find((p) => p.id === 'horns') : undefined;
    const ok =
      r.success === true &&
      !!r.generationMetadata?.multiVoiceBadges?.horns &&
      !!horns &&
      horns.measures.some((m) => m.events.some((e) => e.kind === 'note'));
    out.push({
      ok,
      name: 'runRiffGenerator sly_stone: horns part + generationMetadata badge',
    });
  }

  return [
    ...out,
    ...runRiffQualityRulesSuite(),
    ...runRiffReceiptCompilerTests(),
    ...runRiffHornStabBuilderTests(),
    ...runRiffCallResponseEngineTests(),
    ...runRiffBassInterlockTests(),
    ...runRiffMusicalityGateTests(),
    ...runRiffCarryForwardTests(),
    ...runRiffVariationApplyTests(),
    ...runRiffZappaSoloTests(),
    ...runRiffIntervalWeightsPitchTests(),
    ...runRiffEnforceHookIntervalGateTests(),
    ...runRiffMotifBlendLeapGateTests(),
  ];
}
