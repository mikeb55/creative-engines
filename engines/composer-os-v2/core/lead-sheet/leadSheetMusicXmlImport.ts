/**
 * Bounded MusicXML -> LeadSheet import (Phase 1).
 * Supports partwise, first-part lead melody, and harmony annotations.
 */

import { musicXmlKindContentFromKindText } from '../../../core/chordSymbolMusicXmlCore';
import type {
  LeadSheet,
  LeadSheetArticulationKind,
  LeadSheetImportResult,
  LeadSheetRepeatMarker,
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

function parseMeasureNumber(measureXml: string, fallback: number): number {
  const m = measureXml.match(/<measure[^>]*number="([^"]+)"/i);
  if (!m) return fallback;
  const parsed = parseInt(m[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

  // Prefer explicit display text when present; fall back to compact mapping.
  let suffix = '';
  if (kindText && kindText.length > 0) {
    suffix = kindText;
  } else if (kindBody.length > 0 && kindBody !== 'major') {
    if (kindBody === 'minor') suffix = 'm';
    else if (kindBody === 'dominant') suffix = '7';
    else if (kindBody === 'major-seventh') suffix = 'maj7';
    else if (kindBody === 'minor-seventh') suffix = 'm7';
    else if (kindBody === 'dominant-ninth') suffix = '9';
    else if (kindBody === 'half-diminished') suffix = 'm7b5';
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

  const leadSheet: LeadSheet = {
    sourceFormat: 'musicxml',
    title: firstTagValue(trimmed, 'work-title') ?? readTextCredit(trimmed, 'title'),
    composer: firstTagValue(trimmed, 'creator'),
    totalBars: measures.length,
    sections: [],
    chordEvents: [],
    melodyEvents: [],
    repeatMarkers: [],
  };

  let divisions = 1;
  let activeBeatsPerBar = 4;
  let activeBeatType = 4;
  let sawMultiVoice = false;
  let sawMultiPart = (trimmed.match(/<part\s+id="/gi) ?? []).length > 1;
  let sawMultiNoteChords = false;
  let sawLyrics = false;

  for (let idx = 0; idx < measures.length; idx++) {
    const measureXml = measures[idx];
    const bar = parseMeasureNumber(measureXml, idx + 1);

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

    const keyM = measureXml.match(/<key>[\s\S]*?<fifths>(-?\d+)<\/fifths>(?:[\s\S]*?<mode>([^<]+)<\/mode>)?[\s\S]*?<\/key>/i);
    if (keyM && !leadSheet.keySignature) {
      leadSheet.keySignature = {
        fifths: parseInt(keyM[1], 10),
        mode: keyM[2]?.trim(),
      };
    }

    if (leadSheet.tempoBpm === undefined) {
      const tempoM = measureXml.match(/<sound[^>]*tempo="([\d.]+)"/i);
      if (tempoM) {
        const bpm = Number(tempoM[1]);
        if (Number.isFinite(bpm) && bpm > 0) leadSheet.tempoBpm = bpm;
      }
    }

    const rehearsalM = measureXml.match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
    if (rehearsalM) {
      leadSheet.sections.push({ label: rehearsalM[1].trim(), startBar: bar });
    }

    const harmonyBlocks = measureXml.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/gi) ?? [];
    for (const hb of harmonyBlocks) {
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
    for (const noteXml of noteBlocks) {
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
      const velocityMidi = noteVel ?? measureDynVel;
      leadSheet.melodyEvents.push({
        bar,
        beat: 0,
        durationBeats: durBeats,
        midi: pitchToMidi(stepM[1], octave, alter),
        step: stepM[1].toUpperCase(),
        alter,
        octave,
        ...(velocityMidi !== undefined ? { velocityMidi } : {}),
        ...(articulationKind ? { articulationKind } : {}),
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
  if (leadSheet.chordEvents.length === 0) warnings.push('No harmony annotations found; imported melody-only LeadSheet.');

  // Stable deterministic ordering.
  leadSheet.chordEvents.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat) || a.symbol.localeCompare(b.symbol));
  leadSheet.melodyEvents.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat) || (a.midi - b.midi));
  leadSheet.repeatMarkers.sort((a, b) => a.bar - b.bar || a.kind.localeCompare(b.kind));

  return {
    ok: true,
    leadSheet,
    errors: [],
    warnings,
  };
}

