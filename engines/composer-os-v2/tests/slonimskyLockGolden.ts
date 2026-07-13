/**
 * Slonimsky manual-verify lock metrics (tests 1, 2, 6, 7) — seed 42, XML + metadata.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import { mapAppStyleStackToEngine } from '../app-api/mapStyleStack';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import { runSqToBbWorkflowApp } from '../app-api/sqToBbWorkflowApp';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { mapSlonimskyMacroStateToGenerateRequest } from '../../../apps/composer-os-app/src/types/slonimskyMacroState';
import { mapSongModeSlonimskyToGenerateRequest } from '../../../apps/composer-os-app/src/types/slonimskySongModeState';
import { mapSqBbHybridToGenerateRequest } from '../../../apps/composer-os-app/src/types/slonimskySqBbHybridState';

export const SLONIMSKY_LOCK_GOLDEN_SEED = 42;
export const SLONIMSKY_LOCK_BURST_NOTE_THRESHOLD = 12;

const STACK: GenerateRequest['styleStack'] = {
  primary: 'barry_harris',
  styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
};

export type SlonimskyLockGoldenId = 'test1' | 'test2' | 'test6' | 'test7';

export type SlonimskyLockGoldenFixture = {
  id: SlonimskyLockGoldenId;
  seed: number;
  noteCount: number;
  burstBarCount: number;
  avgNotesPerBar: number;
  feedbackProxyPresent?: boolean;
  slonimskyAllowedOutsideOverride?: number;
  partIds: string[];
  sqNoteCount?: number;
  bbNoteCount?: number;
  slonimskyEnsembleCellReceiptCount?: number;
};

export type PerBarNoteStats = { bar: number; pitched: number; rests: number };

export function parseMusicXmlNoteStats(xml: string): {
  partIds: string[];
  partNames: string[];
  perPartPerBar: Map<string, PerBarNoteStats[]>;
  totalPitched: number;
} {
  const partIds: string[] = [];
  const partNames: string[] = [];
  const nameById = new Map<string, string>();
  for (const m of xml.matchAll(/<score-part id="([^"]+)"[^>]*>[\s\S]*?<part-name>([^<]*)<\/part-name>/g)) {
    partIds.push(m[1]!);
    partNames.push(m[2]!);
    nameById.set(m[1]!, m[2]!);
  }
  const perPartPerBar = new Map<string, PerBarNoteStats[]>();
  let totalPitched = 0;
  for (const partId of partIds) {
    const block = xml.match(new RegExp(`<part id="${partId}"[^>]*>([\\s\\S]*?)</part>`))?.[1] ?? '';
    const bars: PerBarNoteStats[] = [];
    for (const m of block.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)) {
      const bar = Number(m[1]);
      const body = m[2]!;
      const notes = body.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
      let pitched = 0;
      let rests = 0;
      for (const n of notes) {
        if (/<rest/.test(n)) rests++;
        else pitched++;
      }
      bars.push({ bar, pitched, rests });
      totalPitched += pitched;
    }
    perPartPerBar.set(partId, bars);
  }
  return { partIds, partNames, perPartPerBar, totalPitched };
}

export function pickSongModeMelodyPartId(partIds: string[], partNames: string[]): string | undefined {
  const pairs = partIds.map((id, i) => ({ id, name: partNames[i] ?? id }));
  const zappaSolo = pairs.find((p) => /zappa_solo/i.test(p.id + p.name));
  if (zappaSolo) return zappaSolo.id;
  return pickLeadGuitarPartId(partIds, partNames);
}

export function pickLeadGuitarPartId(partIds: string[], partNames: string[]): string | undefined {
  const pairs = partIds.map((id, i) => ({ id, name: partNames[i] ?? id }));
  const lead = pairs.find(
    (p) =>
      /guitar|gtr|electric/i.test(p.name) &&
      !/bass|rhythm|comp|piano/i.test(p.name) &&
      !/guitar_2|gtr2|second/i.test(p.id + p.name)
  );
  if (lead) return lead.id;
  return pairs.find((p) => /guitar|gtr/i.test(p.name + p.id))?.id;
}

export function aggregatePerBar(perPartPerBar: Map<string, PerBarNoteStats[]>, partId: string): PerBarNoteStats[] {
  return perPartPerBar.get(partId) ?? [];
}

/** Lock song-mode fixtures evaluate lead-guitar density on bars 1–8 only. */
export function leadBarsFirstEight(bars: PerBarNoteStats[]): PerBarNoteStats[] {
  return bars.filter((b) => b.bar >= 1 && b.bar <= 8);
}

export function burstBarCountFromBars(bars: PerBarNoteStats[], threshold = SLONIMSKY_LOCK_BURST_NOTE_THRESHOLD): number {
  return bars.filter((b) => b.pitched >= threshold).length;
}

export function avgNotesPerBarFromBars(bars: PerBarNoteStats[]): number {
  if (!bars.length) return 0;
  const sum = bars.reduce((a, b) => a + b.pitched, 0);
  return sum / bars.length;
}

/** Song Mode Zappa: rest/silence contrast proxy when score events are not surfaced in XML. */
export function feedbackProxyFromLeadBars(bars: PerBarNoteStats[]): boolean {
  const hasRestBar = bars.some((b) => b.rests > 0 || b.pitched <= 2);
  const hasDenseBar = bars.some((b) => b.pitched >= SLONIMSKY_LOCK_BURST_NOTE_THRESHOLD);
  return hasRestBar && hasDenseBar;
}

export function partNoteCount(xml: string, partId: string): number {
  const block = xml.match(new RegExp(`<part id="${partId}"[^>]*>([\\s\\S]*?)</part>`))?.[1] ?? '';
  const notes = block.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
  return notes.filter((n) => !/<rest/.test(n)).length;
}

function tmpOut(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'slonimsky-lock-'));
}

const TEST1_CHORDS = [
  'Cmaj9',
  'Bm7',
  'Am9',
  'Gmaj7',
  'Cmaj9',
  'Bm7',
  'Am9',
  'Gmaj7',
] as const;

const TEST2_CHORDS = Array.from({ length: 8 }, () => 'Am7') as string[];

function songModeBase(overrides: Partial<GenerateRequest>): Partial<GenerateRequest> {
  return {
    presetId: 'song_mode',
    seed: SLONIMSKY_LOCK_GOLDEN_SEED,
    styleStack: STACK,
    harmonyMode: 'custom_locked',
    /** Song Mode motif v2 needs >8 bars on the hook path; lock metrics still read first 8 bars. */
    totalBars: 32,
    longFormEnabled: true,
    bpm: 120,
    ...overrides,
  };
}

function lockedChordFields(chords: readonly string[]): Pick<GenerateRequest, 'chordProgressionText' | 'parsedChordBars' | 'lockedHarmonyBarsRaw'> {
  const text = chords.join(' | ');
  return {
    chordProgressionText: text,
    parsedChordBars: [...chords],
    lockedHarmonyBarsRaw: [...chords],
  };
}

export function buildTest1Request(): GenerateRequest {
  const chords = [...TEST1_CHORDS, ...TEST1_CHORDS, ...TEST1_CHORDS, ...TEST1_CHORDS];
  return {
    ...songModeBase({
      primarySongwriterStyle: 'pat_metheny',
      styleProfile: 'STYLE_PAT_METHENY',
      harmonicVoice: 'pat_metheny',
      title: 'LOCK test1 Metheny',
      ...lockedChordFields(chords),
      ...mapSongModeSlonimskyToGenerateRequest(
        { sourcePreset: 'lyrical', motion: -0.3, tension: -0.5, variation: -0.2 },
        { verse: { pin: 'lyrical' } },
        ['hv:pat_metheny']
      ),
    }),
  } as GenerateRequest;
}

export function buildTest2Request(): GenerateRequest {
  const chords = [...TEST2_CHORDS, ...TEST2_CHORDS, ...TEST2_CHORDS, ...TEST2_CHORDS];
  return {
    ...songModeBase({
      primarySongwriterStyle: 'frank_zappa',
      styleProfile: 'STYLE_FRANK_ZAPPA',
      title: 'LOCK test2 Zappa',
      tonalCenter: 'A',
      ...lockedChordFields(chords),
      zappaStyleMode: 'bluesrockFerocious',
      zappaSoloDensity: 'high',
      ...mapSongModeSlonimskyToGenerateRequest(
        { sourcePreset: 'chromatic', motion: 0.9, tension: 0.8, variation: 0.8 },
        {},
        ['hv:frank_zappa']
      ),
    }),
  } as GenerateRequest;
}

export function buildTest6Request(): GenerateRequest {
  return {
    presetId: 'guitar_bass_duo',
    seed: SLONIMSKY_LOCK_GOLDEN_SEED,
    styleStack: STACK,
    harmonyMode: 'custom_locked',
    chordProgressionText: 'E9 | A9 | B9 | E9 | E9 | A9 | B9 | E9',
    totalBars: 8,
    longFormEnabled: false,
    bpm: 120,
    title: 'LOCK test6 Nile GBD',
    harmonicVoice: 'nile_rodgers',
    chromaticStrength: 'off',
  } as GenerateRequest;
}

export function buildTest7SketchRequest(): GenerateRequest {
  const hybrid = mapSqBbHybridToGenerateRequest({
    ensembleRelationship: 'conversation',
    foregroundOwner: 'alternating',
    densitySplit: 0,
    registerCarve: 0,
  });
  const chords = 'Cmaj7 | Am7 | Fmaj7 | G7 | Cmaj7 | Am7 | Fmaj7 | G7 | Cmaj7 | Am7 | Fmaj7 | G7 | Cmaj7 | Am7 | Fmaj7 | G7';
  return {
    presetId: 'sq_to_bb',
    seed: SLONIMSKY_LOCK_GOLDEN_SEED,
    styleStack: { primary: 'bob_brookmeyer', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
    totalBars: 16,
    lengthBars: 16,
    bpm: 120,
    sqToBbStyleProfile: 'brookmeyer',
    sqToBbSqComposer: 'sq_vrb_bartok',
    sqToBbChordSourceMode: 'use_user_chords',
    userChordInput: chords,
    sqToBbAction: 'sketch',
    ...hybrid,
  } as GenerateRequest;
}

export function buildTest7ExportRequest(lineSet: unknown): GenerateRequest {
  const base = buildTest7SketchRequest();
  return {
    ...base,
    sqToBbAction: 'export',
    sqToBbLineSet: lineSet as GenerateRequest['sqToBbLineSet'],
  } as GenerateRequest;
}

function readXml(r: { xml?: string; filepath?: string; ensembleMusicXmlFilepath?: string }): string {
  if (r.xml?.trim()) return r.xml;
  if (r.filepath?.endsWith('.musicxml')) return fs.readFileSync(r.filepath, 'utf8');
  if (r.ensembleMusicXmlFilepath) return fs.readFileSync(r.ensembleMusicXmlFilepath, 'utf8');
  return '';
}

export function runTest1(outDir = tmpOut()): { fixture: SlonimskyLockGoldenFixture; error?: string } {
  const r = runAppGeneration(buildTest1Request(), outDir);
  const xml = readXml(r);
  if (!r.success || !xml) return { fixture: emptyFixture('test1'), error: r.error ?? 'generation failed' };
  const stats = parseMusicXmlNoteStats(xml);
  const leadId = pickSongModeMelodyPartId(stats.partIds, stats.partNames);
  const leadBars = leadId ? leadBarsFirstEight(aggregatePerBar(stats.perPartPerBar, leadId)) : [];
  return {
    fixture: {
      id: 'test1',
      seed: SLONIMSKY_LOCK_GOLDEN_SEED,
      noteCount: stats.totalPitched,
      burstBarCount: burstBarCountFromBars(leadBars),
      avgNotesPerBar: avgNotesPerBarFromBars(leadBars),
      partIds: stats.partIds,
    },
  };
}

export function runTest2(outDir = tmpOut()): { fixture: SlonimskyLockGoldenFixture; error?: string } {
  const r = runAppGeneration(buildTest2Request(), outDir);
  const xml = readXml(r);
  if (!r.success || !xml) return { fixture: emptyFixture('test2'), error: r.error ?? 'generation failed' };
  const stats = parseMusicXmlNoteStats(xml);
  const leadId = pickSongModeMelodyPartId(stats.partIds, stats.partNames);
  const leadBars = leadId ? leadBarsFirstEight(aggregatePerBar(stats.perPartPerBar, leadId)) : [];
  return {
    fixture: {
      id: 'test2',
      seed: SLONIMSKY_LOCK_GOLDEN_SEED,
      noteCount: stats.totalPitched,
      burstBarCount: burstBarCountFromBars(leadBars),
      avgNotesPerBar: avgNotesPerBarFromBars(leadBars),
      feedbackProxyPresent: feedbackProxyFromLeadBars(leadBars),
      partIds: stats.partIds,
    },
  };
}

export function runTest6(outDir = tmpOut()): { fixture: SlonimskyLockGoldenFixture; error?: string } {
  const req = buildTest6Request();
  const gp = runGoldenPath(SLONIMSKY_LOCK_GOLDEN_SEED, {
    styleStack: mapAppStyleStackToEngine(req.styleStack!),
    presetId: req.presetId,
    scoreTitle: req.title,
    harmonyMode: req.harmonyMode,
    chordProgressionText: req.chordProgressionText,
    totalBars: req.totalBars,
    longFormEnabled: req.longFormEnabled,
    chromaticStrength: req.chromaticStrength,
    harmonicVoice: req.harmonicVoice,
  });
  const ov = gp.context.generationMetadata?.slonimskyAllowedOutsideOverride;
  const r = generateComposition(req, outDir);
  const xml = readXml(r);
  if (!r.success || !xml) return { fixture: emptyFixture('test6'), error: r.error ?? 'generation failed' };
  const stats = parseMusicXmlNoteStats(xml);
  const bassId = stats.partIds.find((id, i) => /bass/i.test(stats.partNames[i] ?? id));
  const guitarId = pickLeadGuitarPartId(stats.partIds, stats.partNames);
  const gCount = guitarId ? partNoteCount(xml, guitarId) : 0;
  const bCount = bassId ? partNoteCount(xml, bassId) : 0;
  return {
    fixture: {
      id: 'test6',
      seed: SLONIMSKY_LOCK_GOLDEN_SEED,
      noteCount: gCount + bCount,
      burstBarCount: 0,
      avgNotesPerBar: avgNotesPerBarFromBars(
        guitarId ? aggregatePerBar(stats.perPartPerBar, guitarId) : []
      ),
      slonimskyAllowedOutsideOverride: ov,
      partIds: stats.partIds.filter((id) => id === guitarId || id === bassId),
    },
  };
}

export function runTest7(outDir = tmpOut()): { fixture: SlonimskyLockGoldenFixture; error?: string } {
  const req = buildTest7SketchRequest();
  const sketch = runSqToBbWorkflowApp(req, outDir);
  if (!sketch.success || !sketch.sqToBbWorkflow?.contrapuntalLineSet) {
    return { fixture: emptyFixture('test7'), error: sketch.error ?? 'sketch failed' };
  }
  const exp = runSqToBbWorkflowApp(
    buildTest7ExportRequest(sketch.sqToBbWorkflow.contrapuntalLineSet),
    outDir
  );
  const sqXml = exp.sqToBbWorkflow?.sqMusicXml ?? '';
  const bbXml = exp.sqToBbWorkflow?.bbMusicXml ?? '';
  if (!exp.success || !sqXml || !bbXml) {
    return { fixture: emptyFixture('test7'), error: exp.error ?? 'export failed' };
  }
  const sqStats = parseMusicXmlNoteStats(sqXml);
  const bbStats = parseMusicXmlNoteStats(bbXml);
  const hybridKeys =
    req.styleGenerationContextKeys?.filter((k) => k.startsWith('slonimsky:sq_bb:')) ?? [];
  const receipts = hybridKeys.length;
  return {
    fixture: {
      id: 'test7',
      seed: SLONIMSKY_LOCK_GOLDEN_SEED,
      noteCount: sqStats.totalPitched + bbStats.totalPitched,
      burstBarCount: 0,
      avgNotesPerBar: 0,
      partIds: [...sqStats.partIds, ...bbStats.partIds],
      sqNoteCount: sqStats.totalPitched,
      bbNoteCount: bbStats.totalPitched,
      slonimskyEnsembleCellReceiptCount: receipts,
    },
  };
}

function emptyFixture(id: SlonimskyLockGoldenId): SlonimskyLockGoldenFixture {
  return {
    id,
    seed: SLONIMSKY_LOCK_GOLDEN_SEED,
    noteCount: 0,
    burstBarCount: 0,
    avgNotesPerBar: 0,
    partIds: [],
  };
}

export function evaluateLockCriteria(id: SlonimskyLockGoldenId, f: SlonimskyLockGoldenFixture): string[] {
  const fails: string[] = [];
  if (f.noteCount <= 0) fails.push('noteCount <= 0');
  if (id === 'test1') {
    if (f.burstBarCount !== 0) fails.push(`burstBarCount=${f.burstBarCount} expected 0`);
    if (f.avgNotesPerBar >= 6) fails.push(`avgNotesPerBar=${f.avgNotesPerBar.toFixed(2)} expected < 6`);
  }
  if (id === 'test2') {
    if (f.burstBarCount < 1) fails.push(`burstBarCount=${f.burstBarCount} expected >= 1`);
    if (!f.feedbackProxyPresent) fails.push('feedbackProxy absent');
    if (f.avgNotesPerBar <= 8) fails.push(`avgNotesPerBar=${f.avgNotesPerBar.toFixed(2)} expected > 8`);
  }
  if (id === 'test6') {
    const hasGuitar = f.partIds.some((p) => /guitar|gtr/i.test(p));
    const hasBass = f.partIds.some((p) => /bass/i.test(p));
    if (!hasGuitar || !hasBass) fails.push(`expected guitar+bass parts got ${f.partIds.join(',')}`);
    if (f.slonimskyAllowedOutsideOverride !== 0) {
      fails.push(`slonimskyAllowedOutsideOverride=${f.slonimskyAllowedOutsideOverride} expected 0`);
    }
  }
  if (id === 'test7') {
    const sqOk = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'].every((p) => f.partIds.includes(p));
    const bbOk = f.partIds.some((p) => /bb_trumpets?|trumpet/i.test(p));
    const bbTbn = f.partIds.some((p) => /bb_trombones?|trombone/i.test(p));
    const bbSax = f.partIds.some((p) => /bb_alto|bb_tenor|sax/i.test(p));
    if (!sqOk) fails.push(`SQ parts missing in ${f.partIds.join(',')}`);
    if (!bbOk || !bbTbn || !bbSax) fails.push(`BB parts missing in ${f.partIds.join(',')}`);
    if ((f.sqNoteCount ?? 0) <= 0) fails.push('sqNoteCount <= 0');
    if ((f.bbNoteCount ?? 0) <= 0) fails.push('bbNoteCount <= 0');
    if ((f.slonimskyEnsembleCellReceiptCount ?? 0) < 2) {
      fails.push('slonimskyEnsembleCellReceipts missing (expected >=2 hybrid sq_bb context keys)');
    }
  }
  return fails;
}

export const SLONIMSKY_LOCK_GOLDEN_DIR = path.join(__dirname, 'slonimskyLockGoldens');

export function goldenPath(id: SlonimskyLockGoldenId): string {
  return path.join(SLONIMSKY_LOCK_GOLDEN_DIR, `${id}.json`);
}

export function loadSlonimskyLockGolden(id: SlonimskyLockGoldenId): SlonimskyLockGoldenFixture {
  return JSON.parse(fs.readFileSync(goldenPath(id), 'utf8')) as SlonimskyLockGoldenFixture;
}

export function writeSlonimskyLockGolden(fixture: SlonimskyLockGoldenFixture): void {
  fs.mkdirSync(SLONIMSKY_LOCK_GOLDEN_DIR, { recursive: true });
  fs.writeFileSync(goldenPath(fixture.id), `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
}

export function compareToGolden(
  live: SlonimskyLockGoldenFixture,
  golden: SlonimskyLockGoldenFixture
): string[] {
  const diffs: string[] = [];
  if (live.noteCount !== golden.noteCount) {
    diffs.push(`noteCount live=${live.noteCount} golden=${golden.noteCount}`);
  }
  if (live.burstBarCount !== golden.burstBarCount) {
    diffs.push(`burstBarCount live=${live.burstBarCount} golden=${golden.burstBarCount}`);
  }
  if (Math.abs(live.avgNotesPerBar - golden.avgNotesPerBar) > 0.75) {
    diffs.push(`avgNotesPerBar live=${live.avgNotesPerBar} golden=${golden.avgNotesPerBar}`);
  }
  if (live.feedbackProxyPresent !== golden.feedbackProxyPresent) {
    diffs.push(`feedbackProxy live=${live.feedbackProxyPresent} golden=${golden.feedbackProxyPresent}`);
  }
  if (live.slonimskyAllowedOutsideOverride !== golden.slonimskyAllowedOutsideOverride) {
    diffs.push(
      `slonimskyAllowedOutsideOverride live=${live.slonimskyAllowedOutsideOverride} golden=${golden.slonimskyAllowedOutsideOverride}`
    );
  }
  if (live.sqNoteCount !== golden.sqNoteCount || live.bbNoteCount !== golden.bbNoteCount) {
    diffs.push(`sq/bb notes live=${live.sqNoteCount}/${live.bbNoteCount} golden=${golden.sqNoteCount}/${golden.bbNoteCount}`);
  }
  if (live.slonimskyEnsembleCellReceiptCount !== golden.slonimskyEnsembleCellReceiptCount) {
    diffs.push(
      `receipts live=${live.slonimskyEnsembleCellReceiptCount} golden=${golden.slonimskyEnsembleCellReceiptCount}`
    );
  }
  return diffs;
}
