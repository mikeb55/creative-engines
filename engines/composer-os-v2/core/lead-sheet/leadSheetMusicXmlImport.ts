/**
 * Bounded MusicXML -> LeadSheet import (Phase 1).
 * Supports partwise, first-part lead melody, and harmony annotations.
 */

import { musicXmlKindContentFromKindText } from '../../../core/chordSymbolMusicXmlCore';
import {
  parseImportedHarmonyEvent,
  sortImportedHarmonyTimeline,
  type ImportedHarmonyTimeline,
} from './importedHarmonyTimeline';
import type {
  LeadSheet,
  LeadSheetArticulationKind,
  LeadSheetChordEvent,
  LeadSheetDynamicSpan,
  LeadSheetImportResult,
  LeadSheetRepeatMarker,
  LeadSheetTempoDirectionEvent,
} from './leadSheetTypes';

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchToMidi(step: string, octave: number, alter: number): number {
  const pc = STEP_TO_PC[step.toUpperCase()] ?? 0;
  return (octave + 1) * 12 + pc + alter;
}

function firstTagValue(xml: string, tagName: string): string | undefined {
  const m = xml.match(new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'i'));
  return m?.[1]?.trim();
}

function readTextCredit(xml: string, creditType: string): string | undefined {
  const re = new RegExp(
    `<credit[^>]*>[\\s\\S]*?<credit-type>\\s*${creditType}\\s*</credit-type>[\\s\\S]*?<credit-words[^>]*>([^<]+)</credit-words>[\\s\\S]*?</credit>`,
    'i'
  );
  const m = xml.match(re);
  return m?.[1]?.trim();
}

/** True when the opening `<measure>` tag has `implicit="yes"` (pickup / anacrusis). */
function measureHasImplicitPickup(measureXml: string): boolean {
  const open = measureXml.match(/^<measure\b[^>]*/i)?.[0] ?? '';
  return /\bimplicit\s*=\s*"yes"/i.test(open);
}

function computeMeasureBarMapping(measures: string[]): {
  barPerMeasure: number[];
  totalFullBars: number;
} {
  const barPerMeasure: number[] = [];
  let logicalBar = 0;
  for (let i = 0; i < measures.length; i++) {
    if (measureHasImplicitPickup(measures[i]!)) {
      barPerMeasure.push(0);
    } else {
      logicalBar += 1;
      barPerMeasure.push(logicalBar);
    }
  }
  return { barPerMeasure, totalFullBars: logicalBar };
}

/** Strip inner XML tags from `<words>` body for chord detection. */
function stripInnerXmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Best-effort chord symbol from `<words>` (Sibelius-style lead sheet).
 * Root A–G, optional #/b/♯/♭, optional suffix, optional slash bass.
 */
function tryExtractChordSymbolFromWordsText(raw: string): string | null {
  const cleaned = stripInnerXmlTags(raw);
  if (!cleaned) return null;
  if (/^(rit|rall|accel|a\s*tempo|metronome|mf\b|mp\b|ff\b|pp\b|fff|ppp)/i.test(cleaned)) return null;
  const first = (cleaned.split(/\s+/)[0] ?? '').trim();
  if (!first) return null;
  const m = first.match(/^([A-G])([#♯b♭]?)([^/\s]*)(\/[A-G][#♯b♭]?)?$/i);
  if (!m) return null;
  const root = m[1]!.toUpperCase();
  let acc = (m[2] ?? '').replace(/♯/g, '#').replace(/♭/g, 'b');
  const suf = m[3] ?? '';
  let slash = m[4] ?? '';
  if (slash) slash = slash.replace(/♯/g, '#').replace(/♭/g, 'b');
  return `${root}${acc}${suf}${slash}`;
}

function extractChordEventsFromWordsDirections(input: {
  measures: string[];
  barPerMeasure: number[];
  leadSheet: LeadSheet;
  warnings: string[];
}): boolean {
  let divisions = 1;
  let any = false;
  for (let idx = 0; idx < input.measures.length; idx++) {
    const measureXml = input.measures[idx]!;
    const bar = input.barPerMeasure[idx]!;
    const divM = measureXml.match(/<divisions>(\d+)<\/divisions>/i);
    if (divM) {
      const d = parseInt(divM[1], 10);
      if (Number.isFinite(d) && d > 0) divisions = d;
    }
    const directionBlocks = measureXml.match(/<direction[^>]*>[\s\S]*?<\/direction>/gi) ?? [];
    for (const dir of directionBlocks) {
      if (parseTempoWordKind(dir)) continue;
      const wordsMatch = dir.match(/<words[^>]*>([\s\S]*?)<\/words>/i);
      if (!wordsMatch) continue;
      const sym = tryExtractChordSymbolFromWordsText(wordsMatch[1] ?? '');
      if (!sym) continue;
      const atBeat = Math.max(0, parseDirectionOffsetBeats(dir, divisions));
      input.leadSheet.chordEvents.push({ bar, beat: atBeat, symbol: sym });
      any = true;
    }
  }
  if (any) {
    input.warnings.push(
      'No <harmony> elements found; chord symbols extracted from <words> text (Sibelius export mode).'
    );
  }
  return any;
}

function dedupeChordEvents(events: LeadSheetChordEvent[]): LeadSheetChordEvent[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort(
    (a, b) => a.bar - b.bar || a.beat - b.beat || a.symbol.localeCompare(b.symbol)
  );
  const tailByBar = new Map<number, LeadSheetChordEvent>();
  for (const e of sorted) {
    const t = tailByBar.get(e.bar);
    if (!t || e.beat >= t.beat) tailByBar.set(e.bar, e);
  }
  const out: LeadSheetChordEvent[] = [];
  for (const cur of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.bar === cur.bar && prev.beat === cur.beat && prev.symbol === cur.symbol) {
      continue;
    }
    if (cur.beat === 0 && cur.bar > 0) {
      const tailPrev = tailByBar.get(cur.bar - 1);
      if (tailPrev && tailPrev.symbol === cur.symbol) {
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}

/** Reconstruct display suffix for MusicXML `kind` body `other` using `<degree>` elements. */
function reconstructOtherKindSuffixFromDegrees(harmonyXml: string): string {
  const blocks = harmonyXml.match(/<degree[^>]*>[\s\S]*?<\/degree>/gi) ?? [];
  const parts: string[] = [];
  for (const b of blocks) {
    const type = (firstTagValue(b, 'degree-type') ?? '').trim().toLowerCase();
    const valueRaw = firstTagValue(b, 'degree-value');
    const alterRaw = firstTagValue(b, 'degree-alter');
    const value = valueRaw ? parseInt(valueRaw, 10) : NaN;
    const alter =
      alterRaw !== undefined && alterRaw !== '' && Number.isFinite(parseInt(alterRaw, 10))
        ? parseInt(alterRaw, 10)
        : 0;
    if (type === 'subtract') continue;
    if (!Number.isFinite(value)) continue;
    if (type === 'add' && value === 9 && alter === 0) parts.push('add9');
    else if (type === 'alter' && value === 11 && alter === 1) parts.push('#11');
    else if (type === 'alter' && value === 5 && alter === -1) parts.push('b5');
    else if (type === 'add') parts.push(`add${value}`);
    else if (type === 'alter') {
      if (alter === 1) parts.push(`#${value}`);
      else if (alter === -1) parts.push(`b${value}`);
      else if (alter !== 0) parts.push(`${alter > 0 ? '#' : 'b'}${value}`);
      else parts.push(String(value));
    }
  }
  return parts.join('');
}

function parseHarmonySymbol(harmonyXml: string): string | null {
  const rootStep = firstTagValue(harmonyXml, 'root-step');
  if (!rootStep) return null;
  const rootAlterRaw = firstTagValue(harmonyXml, 'root-alter');
  const rootAlter = rootAlterRaw ? parseInt(rootAlterRaw, 10) : 0;
  const acc = rootAlter === 1 ? '#' : rootAlter === -1 ? 'b' : '';
  const root = `${rootStep.toUpperCase()}${acc}`;

  const kindTextM = harmonyXml.match(/<kind[^>]*text="([^"]+)"/i);
  const kindBody = firstTagValue(harmonyXml, 'kind') ?? '';
  const kindText = kindTextM?.[1]?.trim();
  const kindBodyNorm = kindBody.trim().toLowerCase();

  let suffix = '';
  if (kindBodyNorm === 'other') {
    const degSuffix = reconstructOtherKindSuffixFromDegrees(harmonyXml);
    suffix = `${kindText && kindText.length > 0 ? kindText : ''}${degSuffix}`;
    if (!suffix) suffix = musicXmlKindContentFromKindText(kindBody);
  } else if (kindText && kindText.length > 0) {
    suffix = kindText;
  } else if (kindBody.length > 0 && kindBodyNorm !== 'major') {
    if (kindBodyNorm === 'minor') suffix = 'm';
    else if (kindBodyNorm === 'dominant') suffix = '7';
    else if (kindBodyNorm === 'major-seventh') suffix = 'maj7';
    else if (kindBodyNorm === 'minor-seventh') suffix = 'm7';
    else if (kindBodyNorm === 'dominant-ninth') suffix = '9';
    else if (kindBodyNorm === 'half-diminished') suffix = 'm7b5';
    else suffix = musicXmlKindContentFromKindText(kindBody);
  }

  const bassStep = firstTagValue(harmonyXml, 'bass-step');
  let slash = '';
  if (bassStep) {
    const bassAlterRaw = firstTagValue(harmonyXml, 'bass-alter');
    const bassAlter = bassAlterRaw ? parseInt(bassAlterRaw, 10) : 0;
    const bassAcc = bassAlter === 1 ? '#' : bassAlter === -1 ? 'b' : '';
    slash = `/${bassStep.toUpperCase()}${bassAcc}`;
  }

  return `${root}${suffix}${slash}`;
}

function clampMidiVel(n: number): number {
  return Math.min(127, Math.max(1, Math.round(n)));
}

/** Map engraved `<dynamics>` children to MIDI velocity tiers (approximate playback levels). */
function dynamicsInnerToMidi(inner: string): number | undefined {
  if (/<ppp\b/i.test(inner)) return 38;
  if (/<pp\b/i.test(inner)) return 46;
  if (/<mp\b/i.test(inner)) return 62;
  if (/<mf\b/i.test(inner)) return 72;
  if (/<sfz\b/i.test(inner)) return 88;
  if (/<fp\b/i.test(inner)) return 70;
  if (/<fff\b/i.test(inner)) return 106;
  if (/<ff\b/i.test(inner)) return 94;
  if (/<p\b/i.test(inner)) return 54;
  if (/<f\b/i.test(inner)) return 82;
  return undefined;
}

/** Last explicit `<direction><dynamics>` in measure order (MuseScore / Sibelius engraving path). */
function parseLastDynamicsMidiFromMeasure(measureXml: string): number | undefined {
  const dirs = measureXml.match(/<direction[^>]*>[\s\S]*?<\/direction>/gi) ?? [];
  let last: number | undefined;
  for (const dir of dirs) {
    const dm = dir.match(/<dynamics[^>]*>([\s\S]*?)<\/dynamics>/i);
    if (!dm) continue;
    const v = dynamicsInnerToMidi(dm[1]);
    if (v !== undefined) last = v;
  }
  return last;
}

function parseArticulationKind(noteXml: string): LeadSheetArticulationKind | undefined {
  if (!/<notations\b/i.test(noteXml)) return undefined;
  if (/<strong-accent\b/i.test(noteXml)) return 'marcato';
  if (/<staccato\b/i.test(noteXml)) return 'staccato';
  if (/<tenuto\b/i.test(noteXml)) return 'tenuto';
  if (/<accent\b/i.test(noteXml)) return 'accent';
  return undefined;
}

function parseTieFlags(noteXml: string): { tieStart?: boolean; tieStop?: boolean } {
  const tieStart = /<tie[^>]*type="start"/i.test(noteXml) || /<tied[^>]*type="start"/i.test(noteXml);
  const tieStop = /<tie[^>]*type="stop"/i.test(noteXml) || /<tied[^>]*type="stop"/i.test(noteXml);
  return {
    ...(tieStart ? { tieStart: true } : {}),
    ...(tieStop ? { tieStop: true } : {}),
  };
}

function parseSlurFlags(noteXml: string): { slurStart?: boolean; slurStop?: boolean } {
  const slurStart = /<slur[^>]*type="start"/i.test(noteXml);
  const slurStop = /<slur[^>]*type="stop"/i.test(noteXml);
  return {
    ...(slurStart ? { slurStart: true } : {}),
    ...(slurStop ? { slurStop: true } : {}),
  };
}

function parseFermata(noteXml: string): boolean {
  return /<fermata\b/i.test(noteXml);
}

function parseDirectionOffsetBeats(directionXml: string, divisions: number): number {
  const offM = directionXml.match(/<offset>(-?\d+)<\/offset>/i);
  const offDivs = offM ? parseInt(offM[1], 10) : 0;
  return offDivs / Math.max(1, divisions);
}

function parseDirectionTempoBpm(directionXml: string): number | undefined {
  const soundTempoM = directionXml.match(/<sound[^>]*tempo="([\d.]+)"/i);
  if (soundTempoM) {
    const bpm = Number(soundTempoM[1]);
    if (Number.isFinite(bpm) && bpm > 0) return bpm;
  }
  const perMinuteM = directionXml.match(/<per-minute>([\d.]+)<\/per-minute>/i);
  if (perMinuteM) {
    const bpm = Number(perMinuteM[1]);
    if (Number.isFinite(bpm) && bpm > 0) return bpm;
  }
  return undefined;
}

function parseTempoWordKind(directionXml: string): 'ritardando' | 'accelerando' | undefined {
  const words = (directionXml.match(/<words[^>]*>([\s\S]*?)<\/words>/i)?.[1] ?? '').toLowerCase();
  if (!words) return undefined;
  if (/(^|[^a-z])(rit|rit\.|ritard|rall|rall\.)([^a-z]|$)/i.test(words)) return 'ritardando';
  if (/(^|[^a-z])(accel|accel\.|accelerando)([^a-z]|$)/i.test(words)) return 'accelerando';
  return undefined;
}

function mergeTiedMelodyEvents(leadSheet: LeadSheet): void {
  const sorted = [...leadSheet.melodyEvents].sort((a, b) => a.bar - b.bar || a.beat - b.beat || a.midi - b.midi);
  const out = [...sorted];
  const consumed = new Set<number>();

  for (let i = 0; i < out.length; i++) {
    if (consumed.has(i)) continue;
    const cur = out[i]!;
    if (!cur.tieStart) continue;
    let scan = i + 1;
    while (scan < out.length) {
      if (consumed.has(scan)) {
        scan++;
        continue;
      }
      const nxt = out[scan]!;
      if (nxt.midi !== cur.midi) break;
      cur.durationBeats += nxt.durationBeats;
      cur.tieStart = nxt.tieStart;
      cur.tieStop = nxt.tieStop;
      cur.slurStop = nxt.slurStop || cur.slurStop;
      cur.fermata = cur.fermata || nxt.fermata;
      consumed.add(scan);
      if (!nxt.tieStart) break;
      scan++;
    }
  }

  leadSheet.melodyEvents = out.filter((_, idx) => !consumed.has(idx));
}

function parseNoteVelocityMidi(noteXml: string): number | undefined {
  const m = noteXml.match(/<velocity>(\d+)<\/velocity>/i);
  if (!m) return undefined;
  const v = parseInt(m[1], 10);
  return Number.isFinite(v) ? clampMidiVel(v) : undefined;
}

function parseRepeatMarkers(measureXml: string, bar: number): LeadSheetRepeatMarker[] {
  const out: LeadSheetRepeatMarker[] = [];
  if (/<barline[^>]*location="left"[\s\S]*?<repeat[^>]*direction="forward"/i.test(measureXml)) {
    out.push({ bar, kind: 'repeat_start' });
  }
  if (/<barline[^>]*location="right"[\s\S]*?<repeat[^>]*direction="backward"/i.test(measureXml)) {
    out.push({ bar, kind: 'repeat_end' });
  }
  const endingM = measureXml.match(/<ending[^>]*number="([^"]+)"[^>]*type="(start|stop|discontinue)"/i);
  if (endingM) {
    const kind = endingM[2] === 'start' ? 'ending_start' : 'ending_stop';
    out.push({ bar, kind, endingNumber: endingM[1].trim() });
  }
  return out;
}

export function importLeadSheetFromMusicXml(xml: string): LeadSheetImportResult {
  const warnings: string[] = [];
  const trimmed = xml.trim();
  if (/<score-timewise\b/i.test(trimmed)) {
    return {
      ok: false,
      errors: [
        'LeadSheet MusicXML import supports score-partwise only; this document appears to use <score-timewise>. Re-export as partwise MusicXML or convert externally.',
      ],
      warnings,
    };
  }
  if (!trimmed.includes('<score-partwise')) {
    return {
      ok: false,
      errors: [
        'LeadSheet MusicXML import expects a <score-partwise> score root (plain XML or unpacked from an .mxl ZIP).',
      ],
      warnings,
    };
  }

  const partM = trimmed.match(/<part\s+id="[^"]*"[^>]*>([\s\S]*?)<\/part>/i);
  if (!partM) {
    return { ok: false, errors: ['No <part> block found for lead melody import.'], warnings };
  }
  const partInner = partM[1];
  const measures = partInner.match(/<measure[^>]*>[\s\S]*?<\/measure>/gi) ?? [];
  if (measures.length === 0) {
    return { ok: false, errors: ['No measures found in first part.'], warnings };
  }

  const { barPerMeasure, totalFullBars } = computeMeasureBarMapping(measures);

  const leadSheet: LeadSheet = {
    sourceFormat: 'musicxml',
    title: firstTagValue(trimmed, 'work-title') ?? readTextCredit(trimmed, 'title'),
    composer: firstTagValue(trimmed, 'creator'),
    totalBars: 0,
    keyChanges: [],
    sections: [],
    chordEvents: [],
    melodyEvents: [],
    repeatMarkers: [],
    dynamicSpans: [],
    tempoDirections: [],
    importedHarmonyTimeline: { events: [] },
  };

  let divisions = 1;
  let activeBeatsPerBar = 4;
  let activeBeatType = 4;
  let sawMultiVoice = false;
  let sawMultiPart = (trimmed.match(/<part\s+id="/gi) ?? []).length > 1;
  let sawMultiNoteChords = false;
  let sawLyrics = false;
  const openDynamicStack: Array<{ kind: 'crescendo' | 'decrescendo'; startBar: number; startBeat: number }> = [];

  for (let idx = 0; idx < measures.length; idx++) {
    const measureXml = measures[idx]!;
    const bar = barPerMeasure[idx]!;

    const divM = measureXml.match(/<divisions>(\d+)<\/divisions>/i);
    if (divM) {
      const d = parseInt(divM[1], 10);
      if (Number.isFinite(d) && d > 0) divisions = d;
    }

    const beatsM = measureXml.match(/<time>[\s\S]*?<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>[\s\S]*?<\/time>/i);
    if (beatsM) {
      activeBeatsPerBar = parseInt(beatsM[1], 10);
      activeBeatType = parseInt(beatsM[2], 10);
      if (!leadSheet.timeSignature) {
        leadSheet.timeSignature = { beats: activeBeatsPerBar, beatType: activeBeatType };
      }
    }

    const keyBlocksInMeasure = measureXml.match(/<key>[\s\S]*?<\/key>/gi) ?? [];
    for (const kb of keyBlocksInMeasure) {
      const fifthsM = kb.match(/<fifths>(-?\d+)<\/fifths>/i);
      if (!fifthsM) continue;
      const modeM = kb.match(/<mode>([^<]+)<\/mode>/i);
      const fifths = parseInt(fifthsM[1], 10);
      const mode = modeM?.[1]?.trim();
      leadSheet.keyChanges!.push({ bar, fifths, ...(mode ? { mode } : {}) });
      if (!leadSheet.keySignature) {
        leadSheet.keySignature = { fifths, ...(mode ? { mode } : {}) };
      }
    }

    if (leadSheet.tempoBpm === undefined) {
      const tempoM = measureXml.match(/<sound[^>]*tempo="([\d.]+)"/i);
      if (tempoM) {
        const bpm = Number(tempoM[1]);
        if (Number.isFinite(bpm) && bpm > 0) leadSheet.tempoBpm = bpm;
      }
    }
    const directionBlocks = measureXml.match(/<direction[^>]*>[\s\S]*?<\/direction>/gi) ?? [];
    for (const dir of directionBlocks) {
      const atBeat = Math.max(0, parseDirectionOffsetBeats(dir, divisions));
      const tempoWordKind = parseTempoWordKind(dir);
      const tempoBpm = parseDirectionTempoBpm(dir);
      if (tempoWordKind) {
        (leadSheet.tempoDirections as LeadSheetTempoDirectionEvent[]).push({
          kind: tempoWordKind,
          bar,
          beat: atBeat,
        });
      }
      if (tempoBpm !== undefined) {
        (leadSheet.tempoDirections as LeadSheetTempoDirectionEvent[]).push({
          kind: 'tempo_mark',
          bar,
          beat: atBeat,
          bpm: tempoBpm,
        });
      }

      if (/<wedge[^>]*type="crescendo"/i.test(dir)) {
        openDynamicStack.push({ kind: 'crescendo', startBar: bar, startBeat: atBeat });
      } else if (/<wedge[^>]*type="diminuendo"/i.test(dir)) {
        openDynamicStack.push({ kind: 'decrescendo', startBar: bar, startBeat: atBeat });
      } else if (/<wedge[^>]*type="stop"/i.test(dir)) {
        const open = openDynamicStack.pop();
        if (open) {
          (leadSheet.dynamicSpans as LeadSheetDynamicSpan[]).push({
            kind: open.kind,
            startBar: open.startBar,
            startBeat: open.startBeat,
            endBar: bar,
            endBeat: atBeat,
          });
        }
      }
    }

    const rehearsalM = measureXml.match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
    if (rehearsalM) {
      leadSheet.sections.push({ label: rehearsalM[1].trim(), startBar: bar });
    }

    const harmonyBlocks = measureXml.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/gi) ?? [];
    for (let harmonyIdx = 0; harmonyIdx < harmonyBlocks.length; harmonyIdx++) {
      const hb = harmonyBlocks[harmonyIdx]!;
      const timelineParsed = parseImportedHarmonyEvent({
        harmonyXml: hb,
        bar,
        divisions,
        beatsPerBar: activeBeatsPerBar,
        eventIndexInBar: harmonyIdx,
      });
      if (timelineParsed.warnings.length > 0) {
        warnings.push(...timelineParsed.warnings);
      }
      if (timelineParsed.event) {
        (leadSheet.importedHarmonyTimeline as ImportedHarmonyTimeline).events.push(timelineParsed.event);
      }
      const symbol = parseHarmonySymbol(hb);
      if (!symbol) continue;
      const offM = hb.match(/<offset>(-?\d+)<\/offset>/i);
      const offsetDivs = offM ? parseInt(offM[1], 10) : 0;
      const beat = Math.max(0, offsetDivs / divisions);
      leadSheet.chordEvents.push({ bar, beat, symbol });
    }

    leadSheet.repeatMarkers.push(...parseRepeatMarkers(measureXml, bar));

    const measureDynVel = parseLastDynamicsMidiFromMeasure(measureXml);

    const noteBlocks = measureXml.match(/<note[^>]*>[\s\S]*?<\/note>/gi) ?? [];
    let cursorDivs = 0;
    for (const noteXml of noteBlocks) {
      const backupM = noteXml.match(/<backup>[\s\S]*?<duration>(\d+)<\/duration>[\s\S]*?<\/backup>/i);
      if (backupM) {
        cursorDivs = Math.max(0, cursorDivs - parseInt(backupM[1], 10));
        continue;
      }
      const forwardM = noteXml.match(/<forward>[\s\S]*?<duration>(\d+)<\/duration>[\s\S]*?<\/forward>/i);
      if (forwardM) {
        cursorDivs += parseInt(forwardM[1], 10);
        continue;
      }
      if (/<rest\b/i.test(noteXml)) continue;
      if (/<chord\s*\/>/i.test(noteXml)) {
        sawMultiNoteChords = true;
        continue;
      }
      if (/<lyric\b/i.test(noteXml)) sawLyrics = true;

      const voiceM = noteXml.match(/<voice>(\d+)<\/voice>/i);
      const voice = voiceM ? parseInt(voiceM[1], 10) : 1;
      if (voice !== 1) {
        sawMultiVoice = true;
        continue;
      }

      const stepM = noteXml.match(/<step>([A-G])<\/step>/i);
      const octM = noteXml.match(/<octave>(\d+)<\/octave>/i);
      if (!stepM || !octM) continue;
      const alterM = noteXml.match(/<alter>(-?\d+)<\/alter>/i);
      const durM = noteXml.match(/<duration>(\d+)<\/duration>/i);
      const staffM = noteXml.match(/<staff>(\d+)<\/staff>/i);
      if (staffM && staffM[1] !== '1') {
        sawMultiPart = true;
        continue;
      }
      const alter = alterM ? parseInt(alterM[1], 10) : 0;
      const octave = parseInt(octM[1], 10);
      const durationDivs = durM ? parseInt(durM[1], 10) : divisions;
      const durBeats = durationDivs / divisions;
      const noteVel = parseNoteVelocityMidi(noteXml);
      const articulationKind = parseArticulationKind(noteXml);
      const tieFlags = parseTieFlags(noteXml);
      const slurFlags = parseSlurFlags(noteXml);
      const fermata = parseFermata(noteXml);
      const velocityMidi = noteVel ?? measureDynVel;
      leadSheet.melodyEvents.push({
        bar,
        beat: cursorDivs / Math.max(1, divisions),
        durationBeats: durBeats,
        midi: pitchToMidi(stepM[1], octave, alter),
        step: stepM[1].toUpperCase(),
        alter,
        octave,
        ...(velocityMidi !== undefined ? { velocityMidi } : {}),
        ...(articulationKind ? { articulationKind } : {}),
        ...tieFlags,
        ...slurFlags,
        ...(fermata ? { fermata: true } : {}),
      });
      cursorDivs += durationDivs;
    }
  }

  leadSheet.totalBars = totalFullBars > 0 ? totalFullBars : measures.length > 0 ? 1 : 0;

  if (openDynamicStack.length > 0) {
    for (const open of openDynamicStack) {
      (leadSheet.dynamicSpans as LeadSheetDynamicSpan[]).push({
        kind: open.kind,
        startBar: open.startBar,
        startBeat: open.startBeat,
        endBar: leadSheet.totalBars,
        endBeat: activeBeatsPerBar,
      });
    }
  }

  if (leadSheet.sections.length === 0) {
    leadSheet.sections = [{ label: 'A', startBar: 1 }];
  }
  if (sawMultiPart) warnings.push('Ignored extra parts/staves; imported first-part lead line only.');
  if (sawMultiVoice) warnings.push('Ignored non-voice-1 notes; Phase 1 supports single melody voice.');
  if (sawMultiNoteChords) warnings.push('Ignored stacked chord notes in melody; kept top-level note events only.');
  if (sawLyrics) warnings.push('Lyrics are currently ignored in LeadSheet import Phase 1.');
  if (leadSheet.chordEvents.length === 0) {
    extractChordEventsFromWordsDirections({ measures, barPerMeasure, leadSheet, warnings });
  }
  leadSheet.chordEvents = dedupeChordEvents(leadSheet.chordEvents);
  if (leadSheet.chordEvents.length === 0) {
    warnings.push('No harmony annotations found; imported melody-only LeadSheet.');
  }

  // Stable deterministic ordering.
  leadSheet.chordEvents.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat) || a.symbol.localeCompare(b.symbol));
  leadSheet.melodyEvents.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat) || (a.midi - b.midi));
  leadSheet.repeatMarkers.sort((a, b) => a.bar - b.bar || a.kind.localeCompare(b.kind));
  (leadSheet.dynamicSpans as LeadSheetDynamicSpan[]).sort(
    (a, b) => a.startBar - b.startBar || a.startBeat - b.startBeat || a.endBar - b.endBar || a.endBeat - b.endBeat
  );
  (leadSheet.tempoDirections as LeadSheetTempoDirectionEvent[]).sort(
    (a, b) => a.bar - b.bar || a.beat - b.beat || a.kind.localeCompare(b.kind)
  );
  leadSheet.importedHarmonyTimeline = sortImportedHarmonyTimeline(
    leadSheet.importedHarmonyTimeline as ImportedHarmonyTimeline
  );
  mergeTiedMelodyEvents(leadSheet);

  return {
    ok: true,
    leadSheet,
    errors: [],
    warnings,
  };
}

