import { importLeadSheetFromMusicXml } from '../lead-sheet/leadSheetMusicXmlImport';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';

export interface SongModeLeadSheetMelodyAnchor {
  bar: number;
  midi: number;
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
  const firstByBar = new Map<number, number>();
  for (const ev of ordered) {
    if (ev.bar < 1 || ev.bar > totalBars) continue;
    if (!firstByBar.has(ev.bar)) firstByBar.set(ev.bar, ev.midi);
  }
  const out: SongModeLeadSheetMelodyAnchor[] = [];
  for (const [bar, midi] of firstByBar.entries()) {
    out.push({ bar, midi });
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
  xml: string,
  totalBars: number
): SongModeLeadSheetXmlAdaptResult {
  const parsed = importLeadSheetFromMusicXml(xml);
  if (!parsed.ok || !parsed.leadSheet) {
    return {
      ok: false,
      warnings: parsed.warnings ?? [],
      errors: parsed.errors ?? ['Song Mode LeadSheet adapter: MusicXML parse failed'],
    };
  }
  const adapted = adaptLeadSheetForSongMode({ leadSheet: parsed.leadSheet, totalBars });
  return {
    ...adapted,
    leadSheet: parsed.leadSheet,
    warnings: [...(parsed.warnings ?? []), ...adapted.warnings],
  };
}

