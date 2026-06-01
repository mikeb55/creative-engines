/**
 * Solo lead-sheet export from MusicContext + note timeline (Orbit batch / producer handoff).
 */

import { validateExportIntegrity } from '../export/exportHardening';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import type { MeasureModel, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import type { MusicContext } from '../music-context/musicContextTypes';

export type SoloExportNote = {
  /** 1-based bar index */
  barIndex: number;
  /** 0-based beat within bar */
  startBeat: number;
  durationBeats: number;
  pitch: number;
};

export type SoloMusicContextExportResult = {
  xml: string;
  exportIntegrityPassed: boolean;
  exportIntegrityErrors: string[];
  measureCount: number;
  noteCount: number;
};

/** MusicXML-safe root: single A–G letter + optional alter. */
export function parseMusicXmlRootStep(raw: string): { step: string; alter?: number } {
  const text = (raw || 'C').trim();
  const step = text[0]?.toUpperCase() ?? 'C';
  if (!'ABCDEFG'.includes(step)) return { step: 'C' };
  let alter: number | undefined;
  if (text.length > 1) {
    const acc = text[1]!;
    if (acc === 'b' || acc === '♭') alter = -1;
    else if (acc === '#' || acc === '♯') alter = 1;
  }
  return alter != null ? { step, alter } : { step };
}

/** Fix invalid multi-character `<root-step>` values (e.g. Db → D + alter -1). */
export function sanitizeMusicXmlHarmonyRoots(xml: string): string {
  return xml.replace(/<root>([\s\S]*?)<\/root>/g, (rootBlock) => {
    const stepMatch = rootBlock.match(/<root-step>([^<]*)<\/root-step>/);
    if (!stepMatch) return rootBlock;
    const parsed = parseMusicXmlRootStep(stepMatch[1]!);
    const raw = stepMatch[1]!.trim();
    if (raw.length === 1 && raw.toUpperCase() === parsed.step && parsed.alter == null) return rootBlock;

    let out = rootBlock.replace(/<root-step>[^<]*<\/root-step>/, `<root-step>${parsed.step}</root-step>`);
    if (parsed.alter != null && parsed.alter !== 0) {
      if (/<root-alter>/.test(out)) {
        out = out.replace(/<root-alter>-?\d+<\/root-alter>/, `<root-alter>${parsed.alter}</root-alter>`);
      } else {
        out = out.replace(
          /<root-step>[^<]*<\/root-step>/,
          `<root-step>${parsed.step}</root-step>\n          <root-alter>${parsed.alter}</root-alter>`,
        );
      }
    }
    return out;
  });
}

/** Validate harmony root-step tags against MusicXML letter-only rule. */
export function validateMusicXmlHarmonyRoots(xml: string): string[] {
  const issues: string[] = [];
  for (const m of xml.matchAll(/<root-step>([^<]*)<\/root-step>/g)) {
    const t = m[1]!.trim();
    if (t.length !== 1 || !'ABCDEFG'.includes(t.toUpperCase())) {
      issues.push(`harmony root-step invalid: ${JSON.stringify(t)} (must be single A–G letter)`);
    }
  }
  return issues;
}

export function sanitizeAndValidateMusicXmlHarmony(xml: string): { xml: string; errors: string[] } {
  const sanitized = sanitizeMusicXmlHarmonyRoots(xml);
  return { xml: sanitized, errors: validateMusicXmlHarmonyRoots(sanitized) };
}

/** Loop harmony bars to exact length (deterministic). */
export function loopHarmonyBarsToLength(bars: readonly string[], totalBars: number): string[] {
  if (totalBars <= 0) return [];
  if (bars.length === 0) {
    return Array.from({ length: totalBars }, () => 'NC');
  }
  if (bars.length >= totalBars) return [...bars.slice(0, totalBars)];
  const out: string[] = [];
  while (out.length < totalBars) {
    out.push(...bars);
  }
  return out.slice(0, totalBars);
}

function groupNotesByBar(notes: readonly SoloExportNote[]): Map<number, SoloExportNote[]> {
  const byBar = new Map<number, SoloExportNote[]>();
  for (const n of notes) {
    const list = byBar.get(n.barIndex) ?? [];
    list.push(n);
    byBar.set(n.barIndex, list);
  }
  for (const list of byBar.values()) {
    list.sort((a, b) => a.startBeat - b.startBeat);
  }
  return byBar;
}

/** Build single-part lead sheet — harmony on measure.chord; no mid-form rest padding. */
export function buildSoloLeadSheetScoreModel(
  ctx: MusicContext,
  notes: readonly SoloExportNote[],
  options?: { partName?: string; title?: string },
): ScoreModel {
  const totalBars = ctx.totalBars;
  const byBar = groupNotesByBar(notes);
  const measures: MeasureModel[] = [];

  for (let b = 1; b <= totalBars; b++) {
    const barNotes = byBar.get(b) ?? [];
    const rawChord = ctx.harmony.bars[b - 1];
    const chord = rawChord
      ? /^NC$/i.test(rawChord)
        ? 'N.C.'
        : rawChord
      : undefined;
    let events: ScoreEvent[] = barNotes.map((n) => ({
      kind: 'note' as const,
      pitch: n.pitch,
      startBeat: n.startBeat,
      duration: n.durationBeats,
      voice: 1,
    }));
    if (events.length === 0) {
      events = [{ kind: 'rest', startBeat: 0, duration: ctx.meter.beats, voice: 1 }];
    }
    measures.push({ index: b, events, ...(chord ? { chord } : {}) });
  }

  const part: PartModel = {
    id: 'solo',
    name: options?.partName ?? 'Solo',
    scoreInstrumentName: options?.partName ?? 'Solo',
    instrumentIdentity: 'solo_lead',
    midiProgram: 25,
    clef: 'treble',
    measures,
  };

  return {
    title: options?.title ?? 'Solo',
    tempo: ctx.bpm,
    timeSignature: { beats: ctx.meter.beats, beatType: ctx.meter.beatType },
    parts: [part],
  };
}

export function exportSoloMusicContextToMusicXml(
  ctx: MusicContext,
  notes: readonly SoloExportNote[],
  options?: { title?: string; partName?: string },
): SoloMusicContextExportResult {
  const score = buildSoloLeadSheetScoreModel(ctx, notes, options);
  const exportResult = exportScoreModelToMusicXml(score, { bpm: ctx.bpm });
  if (!exportResult.success || !exportResult.xml) {
    return {
      xml: '',
      exportIntegrityPassed: false,
      exportIntegrityErrors: exportResult.errors ?? ['exportScoreModelToMusicXml failed'],
      measureCount: ctx.totalBars,
      noteCount: notes.length,
    };
  }

  const harmonyCheck = sanitizeAndValidateMusicXmlHarmony(exportResult.xml);
  const integrity = validateExportIntegrity(harmonyCheck.xml);
  const harmonyErrors = harmonyCheck.errors;
  return {
    xml: harmonyCheck.xml,
    exportIntegrityPassed: integrity.valid && harmonyErrors.length === 0,
    exportIntegrityErrors: [...integrity.errors, ...harmonyErrors],
    measureCount: ctx.totalBars,
    noteCount: notes.filter((n) => n.pitch > 0).length,
  };
}
