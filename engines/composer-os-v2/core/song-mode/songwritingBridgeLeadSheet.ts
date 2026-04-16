/**
 * Song Mode — optional vocal lead sheet via Python `songwriting_bridge` CLI.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { CompiledSong } from './songCompilationTypes';
import { buildLeadSheetContractFromCompiled } from './songModeBuilder';
import type { LeadSheetContract } from './leadSheetContract';

const ROOT_TO_PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export function mapSongVoiceTypeToPythonVoice(
  voiceType: CompiledSong['voiceType']
): string {
  const m: Record<CompiledSong['voiceType'], string> = {
    male_tenor: 'male_tenor',
    female_alto: 'female_alto',
    baritone: 'male_baritone',
    soprano: 'female_lead',
  };
  return m[voiceType] ?? 'male_tenor';
}

/** Parse chord symbol root (first letter name + optional #/b) to pitch class; default major. */
export function chordSymbolToRootAndQuality(symbol: string): { root: number; quality: 'major' | 'minor' } {
  const s = symbol.trim();
  const m = s.match(/^([A-Ga-g])([#b♯♭]?)/);
  if (!m || !m[1]) {
    return { root: 0, quality: 'major' };
  }
  const letter = m[1].toUpperCase();
  const acc = m[2] === '#' || m[2] === '♯' ? '#' : m[2] === 'b' || m[2] === '♭' ? 'b' : '';
  const key = acc ? `${letter}${acc === '#' ? '#' : 'b'}` : letter;
  const root = ROOT_TO_PC[key] ?? ROOT_TO_PC[letter] ?? 0;
  const rest = s.slice(m[0].length);
  const minor =
    /^m(?!aj)/i.test(rest) ||
    /^min/i.test(rest) ||
    (rest.startsWith('-') && !rest.startsWith('--'));
  return { root, quality: minor ? 'minor' : 'major' };
}

function mapSectionRoleForBridge(sectionKind: string): string {
  if (sectionKind === 'chorus') return 'contrast';
  if (sectionKind === 'verse' || sectionKind === 'pre_chorus') return 'primary';
  return sectionKind;
}

export interface VocalLeadSheetPythonOpts {
  /** When set, used as the Python binary (overrides platform default). */
  pythonExecutable?: string;
  bridgeScriptPath: string;
  voiceType?: CompiledSong['voiceType'];
}

function resolvePythonSpawn(): { command: string; prefixArgs: string[] } {
  const fromEnv = process.env.COMPOSER_OS_PYTHON?.trim();
  if (fromEnv) {
    return { command: fromEnv, prefixArgs: [] };
  }
  if (process.platform === 'win32') {
    return { command: 'py', prefixArgs: ['-3'] };
  }
  return { command: 'python', prefixArgs: [] };
}

export function buildSongwritingBridgePayloadFromLeadSheetContract(
  contract: LeadSheetContract
): { title: string; sections: unknown[] } {
  const sections: unknown[] = [];

  for (const sec of contract.formSummary.sections) {
    const barStart1 = sec.barStart;
    const barEnd1 = sec.barEnd;
    const bar_start = barStart1 - 1;
    const bar_end = barEnd1 - 1;
    const role = mapSectionRoleForBridge(sec.role);

    const melody_events = contract.vocalMelody.events
      .filter((e) => e.measure >= barStart1 && e.measure <= barEnd1)
      .map((e) => ({
        measure: e.measure - 1,
        beat_position: e.beat,
        duration: e.duration,
        pitch: e.pitch ?? 60,
      }));

    const harmony = contract.chordSymbols
      .filter((c) => c.measure >= barStart1 && c.measure <= barEnd1)
      .map((c) => {
        const { root, quality } = chordSymbolToRootAndQuality(c.chord);
        return {
          root,
          quality,
          chord: c.chord,
          measure: c.measure - 1,
          bar_position: c.beat,
        };
      });

    sections.push({
      role,
      bar_start,
      bar_end,
      melody_events,
      harmony,
    });
  }

  return { title: contract.title, sections };
}

/**
 * Runs Python CLI; on failure logs a warning and returns null (does not throw).
 */
export function exportVocalLeadSheetMusicXmlViaPython(
  compiled: CompiledSong,
  realisedScore: ScoreModel,
  opts: VocalLeadSheetPythonOpts
): string | null {
  const contract = buildLeadSheetContractFromCompiled(compiled);
  const guitar = realisedScore.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const melodyByMeasure = new Map<number, Array<{ beat_position: number; duration: number; pitch: number }>>();
  const harmonyByMeasure = new Map<number, Array<{ root: number; quality: 'major' | 'minor'; bar_position: number }>>();

  if (guitar) {
    for (const m of guitar.measures) {
      const evs = m.events
        .filter((e) => e.kind === 'note' && (e.voice === undefined || e.voice === 1))
        .map((e) => ({
          beat_position: e.startBeat,
          duration: e.duration,
          pitch: e.pitch,
        }));
      if (evs.length > 0) {
        melodyByMeasure.set(m.index, evs);
      }
      if (m.chord) {
        const { root, quality } = chordSymbolToRootAndQuality(m.chord);
        harmonyByMeasure.set(m.index, [{ root, quality, bar_position: 0 }]);
      }
    }
  }

  const sections = contract.formSummary.sections.map((sec) => {
    const melody_events: Array<{ measure: number; beat_position: number; duration: number; pitch: number }> = [];
    const harmony: Array<{ root: number; quality: 'major' | 'minor'; measure: number; bar_position: number }> = [];
    for (let bar = sec.barStart; bar <= sec.barEnd; bar++) {
      const barMelody = melodyByMeasure.get(bar) ?? [];
      for (const e of barMelody) {
        melody_events.push({
          measure: bar - 1,
          beat_position: e.beat_position,
          duration: e.duration,
          pitch: e.pitch,
        });
      }
      const barHarmony = harmonyByMeasure.get(bar) ?? [];
      for (const h of barHarmony) {
        harmony.push({
          root: h.root,
          quality: h.quality,
          measure: bar - 1,
          bar_position: h.bar_position,
        });
      }
    }
    return {
      role: mapSectionRoleForBridge(sec.role),
      bar_start: sec.barStart - 1,
      bar_end: sec.barEnd - 1,
      melody_events,
      harmony,
    };
  });
  const payload = { title: contract.title, sections };
  const tmp = path.join(os.tmpdir(), `ce_vocal_ls_${process.pid}_${Date.now()}.json`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf-8');
    const voice = mapSongVoiceTypeToPythonVoice(opts.voiceType ?? compiled.voiceType);
    const py = opts.pythonExecutable
      ? { command: opts.pythonExecutable, prefixArgs: [] as string[] }
      : resolvePythonSpawn();
    const r = spawnSync(
      py.command,
      [...py.prefixArgs, opts.bridgeScriptPath, '--input', tmp, '--voice', voice],
      { encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 }
    );
    if (r.error) {
      console.warn('[vocal-lead-sheet] spawn failed:', r.error.message);
      return null;
    }
    if (r.status !== 0) {
      console.warn(
        '[vocal-lead-sheet] Python exited',
        r.status,
        r.stderr?.slice(0, 500) ?? ''
      );
      return null;
    }
    const out = (r.stdout ?? '').trim();
    if (!out.includes('<?xml') && !out.includes('<score-partwise')) {
      console.warn('[vocal-lead-sheet] unexpected stdout from Python bridge');
      return null;
    }
    return out;
  } catch (e) {
    console.warn('[vocal-lead-sheet]', e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}
