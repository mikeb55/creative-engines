import { importLeadSheetFromMusicXml } from '../lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import {
  extractScoreMusicXmlFromString,
  extractScoreMusicXmlFromUint8Array,
} from '../lead-sheet/musicXmlScoreInput';
import { applyLeadSheetPerformanceRendering } from '../lead-sheet/leadSheetPerformanceRendering';

export interface SongModeLeadSheetMelodyAnchor {
  bar: number;
  midi: number;
  /** Mean imported MIDI velocity for voice-1 notes in this bar (after performance shaping). */
  velocityHint?: number;
}

export interface SongModeLeadSheetAdaptedInput {
  leadSheet: LeadSheet;
  totalBars: number;
}

export interface SongModeLeadSheetAdaptedResult {
  ok: boolean;
  lockedChordBars?: string[];
  melodyAnchors?: SongModeLeadSheetMelodyAnchor[];
  warnings: string[];
  errors: string[];
}

function normalizeChordEventsByBar(leadSheet: LeadSheet, totalBars: number): string[] {
  const ordered = [...leadSheet.chordEvents].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  const chordByBar = new Map<number, string>();
  for (const ev of ordered) {
    if (ev.bar < 1 || ev.bar > totalBars) continue;
    if (!chordByBar.has(ev.bar)) chordByBar.set(ev.bar, ev.symbol.trim());
  }
  const out: string[] = [];
  let carry = '';
  for (let bar = 1; bar <= totalBars; bar++) {
    const c = chordByBar.get(bar);
    if (c && c.length > 0) {
      carry = c;
      out.push(c);
    } else if (carry.length > 0) {
      out.push(carry);
    } else {
      out.push('Cmaj7');
    }
  }
  return out;
}

function melodyAnchorsByBar(leadSheet: LeadSheet, totalBars: number): SongModeLeadSheetMelodyAnchor[] {
  const ordered = [...leadSheet.melodyEvents].sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  const firstMidiByBar = new Map<number, number>();
  const velocitiesByBar = new Map<number, number[]>();
  for (const ev of ordered) {
    if (ev.bar < 1 || ev.bar > totalBars) continue;
    if (!firstMidiByBar.has(ev.bar)) firstMidiByBar.set(ev.bar, ev.midi);
    if (ev.velocityMidi !== undefined) {
      const arr = velocitiesByBar.get(ev.bar) ?? [];
      arr.push(ev.velocityMidi);
      velocitiesByBar.set(ev.bar, arr);
    }
  }
  const out: SongModeLeadSheetMelodyAnchor[] = [];
  for (const [bar, midi] of firstMidiByBar.entries()) {
    const vels = velocitiesByBar.get(bar);
    const velocityHint =
      vels && vels.length > 0 ? Math.round(vels.reduce((a, c) => a + c, 0) / vels.length) : undefined;
    out.push({
      bar,
      midi,
      ...(velocityHint !== undefined ? { velocityHint } : {}),
    });
  }
  out.sort((a, b) => a.bar - b.bar);
  return out;
}

export function adaptLeadSheetForSongMode(input: SongModeLeadSheetAdaptedInput): SongModeLeadSheetAdaptedResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const { leadSheet, totalBars } = input;

  if (totalBars < 1) {
    return { ok: false, warnings, errors: ['Song Mode LeadSheet adapter: totalBars must be >= 1'] };
  }
  if (!leadSheet.chordEvents.length) {
    return { ok: false, warnings, errors: ['Song Mode LeadSheet adapter: no chord events available'] };
  }
  if (!leadSheet.melodyEvents.length) {
    warnings.push('LeadSheet melody empty: harmony will be used, melody anchors omitted.');
  }
  if (leadSheet.totalBars > totalBars) {
    warnings.push('LeadSheet is longer than target Song Mode bars; truncating to requested bar count.');
  } else if (leadSheet.totalBars < totalBars) {
    warnings.push('LeadSheet is shorter than target Song Mode bars; carrying forward final harmony.');
  }

  const lockedChordBars = normalizeChordEventsByBar(leadSheet, totalBars);
  const melodyAnchors = melodyAnchorsByBar(leadSheet, totalBars);
  return { ok: true, lockedChordBars, melodyAnchors, warnings, errors };
}

export interface SongModeLeadSheetXmlAdaptResult extends SongModeLeadSheetAdaptedResult {
  leadSheet?: LeadSheet;
}

export function adaptLeadSheetMusicXmlForSongMode(
  xmlOrPacked: string | Uint8Array,
  totalBars: number,
  opts?: { leadSheetPerformanceBlend?: number }
): SongModeLeadSheetXmlAdaptResult {
  const extracted =
    xmlOrPacked instanceof Uint8Array
      ? extractScoreMusicXmlFromUint8Array(xmlOrPacked)
      : extractScoreMusicXmlFromString(xmlOrPacked);
  if (!extracted.ok || !extracted.xml) {
    return {
      ok: false,
      warnings: [],
      errors:
        extracted.errors.length > 0
          ? extracted.errors
          : ['Song Mode LeadSheet: MusicXML could not be unpacked or validated'],
    };
  }
  const parsed = importLeadSheetFromMusicXml(extracted.xml);
  if (!parsed.ok || !parsed.leadSheet) {
    return {
      ok: false,
      warnings: parsed.warnings ?? [],
      errors: parsed.errors ?? ['Song Mode LeadSheet adapter: MusicXML parse failed'],
    };
  }
  const shaped = applyLeadSheetPerformanceRendering(parsed.leadSheet, {
    blendTowardImported: opts?.leadSheetPerformanceBlend,
  });
  const adapted = adaptLeadSheetForSongMode({ leadSheet: shaped, totalBars });
  return {
    ...adapted,
    leadSheet: shaped,
    warnings: [...(parsed.warnings ?? []), ...adapted.warnings],
  };
}

