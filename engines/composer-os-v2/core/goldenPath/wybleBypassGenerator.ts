import { generateWybleEtude } from '../../../jimmy-wyble-engine/wybleGenerator';
import { scoreToMusicXML } from '../../../core/scoreToMusicXML';
import { createMeasure, pushNote } from '../../../jimmy-wyble-engine/../core/measureBuilder';
import {
  allocateBeatDurationsToDivisions,
  finalizeWybleMeasureBarMathPerVoice,
} from '../../../core/wybleBarMathFinalize';
import { applyWybleVoiceIndependence } from '../../../core/wybleVoiceIndependencePass';
import { validateScore } from '../../../../scripts/validateScore';
import type { WybleParameters } from '../../../jimmy-wyble-engine/wybleTypes';
import type { Score } from '../../../jimmy-wyble-engine/../core/timing';
import { MEASURE_DIVISIONS } from '../../../core/timing';
import type { CanonicalChord } from '../../../core/canonicalChord';
import { validateWybleCanonicalChordList } from '../../../core/canonicalChord';

export interface WybleBypassReceipt {
  barsRequested: number;
  upperEventsCount: number;
  lowerEventsCount: number;
  musicXmlVoicesPresent: boolean;
  measure1Voice1Durations: string[];
  measure1Voice2Durations: string[];
}

export interface WybleBypassResult {
  guitarXml: string;
  mode: 'etude' | 'duo';
  receipt: WybleBypassReceipt;
}

function parseMeasureVoiceDurations(xml: string, measureNum: number, voice: string): string[] {
  const mRe = new RegExp(`<measure number="${measureNum}">([\\s\\S]*?)</measure>`, 'm');
  const mm = xml.match(mRe);
  if (!mm) return [];
  const block = mm[1];
  const noteRe = /<note>[\s\S]*?<\/note>/g;
  const out: string[] = [];
  const notes = block.match(noteRe) ?? [];
  for (const n of notes) {
    if (!n.includes(`<voice>${voice}</voice>`)) continue;
    const d = n.match(/<duration>(\d+)<\/duration>/);
    const t = n.match(/<type>([^<]+)<\/type>/);
    if (d && t) out.push(`${d[1]}:${t[1]}`);
  }
  return out;
}

const EPS = 1e-9;
const BEATS_PER_BAR = 4;

type WybleEv = { pitch: number; duration: number; beat: number };

type VoiceScan = { idx: number; pendingDur: number; pendingPitch: number };

/**
 * Slice one 4/4 bar from a beat-length timeline, carrying remainder across measures (fixes lost tail when duration > beats left).
 */
function consumeVoiceForOneBar(events: WybleEv[], st: VoiceScan, beatsPerBar: number): { beatSegs: number[]; pitches: number[] } {
  const beatSegs: number[] = [];
  const pitches: number[] = [];
  let b = 0;
  while (b < beatsPerBar - EPS) {
    let durAvail: number;
    let pitch: number;
    if (st.pendingDur > EPS) {
      durAvail = st.pendingDur;
      pitch = st.pendingPitch;
    } else {
      if (st.idx >= events.length) {
        beatSegs.push(beatsPerBar - b);
        pitches.push(0);
        break;
      }
      const e = events[st.idx]!;
      durAvail = e.duration;
      pitch = e.pitch;
    }
    const take = Math.min(durAvail, beatsPerBar - b);
    beatSegs.push(take);
    pitches.push(pitch);
    const rem = durAvail - take;
    if (rem > EPS) {
      st.pendingDur = rem;
      st.pendingPitch = pitch;
    } else {
      st.pendingDur = 0;
      st.idx++;
    }
    b += take;
  }
  return { beatSegs, pitches };
}

function pushVoiceMeasureFromBeats(
  measure: ReturnType<typeof createMeasure>,
  voice: number,
  beatSegs: number[],
  pitches: number[],
  cursor: { pos: number }
): void {
  if (beatSegs.length === 0) {
    pushNote(measure, voice, 0, MEASURE_DIVISIONS, cursor);
    return;
  }
  const divs = allocateBeatDurationsToDivisions(beatSegs);
  for (let k = 0; k < divs.length; k++) {
    pushNote(measure, voice, pitches[k] ?? 0, divs[k]!, cursor);
  }
}

function assertVoiceTimelineConsumed(st: VoiceScan, events: WybleEv[], label: string): void {
  if (st.pendingDur > EPS) {
    throw new Error(`Wyble export: ${label} has ${st.pendingDur} beats pending after last bar`);
  }
  if (st.idx !== events.length) {
    throw new Error(`Wyble export: ${label} not fully consumed (index ${st.idx}, ${events.length} events)`);
  }
}

function wybleOutputToScore(
  upperEvents: WybleEv[],
  lowerEvents: WybleEv[],
  bars: number,
  canonicalChords: CanonicalChord[]
): Score {
  if (canonicalChords.length !== bars) {
    throw new Error(`Wyble export: canonicalChords length ${canonicalChords.length} must equal bars ${bars}.`);
  }
  const measures: Score['measures'] = [];
  const upperSt: VoiceScan = { idx: 0, pendingDur: 0, pendingPitch: 0 };
  const lowerSt: VoiceScan = { idx: 0, pendingDur: 0, pendingPitch: 0 };

  for (let i = 0; i < bars; i++) {
    const measure = createMeasure(i, [1, 2]);
    const cc = canonicalChords[i]!;
    measure.chordSymbol = cc.text;
    measure.canonicalChord = cc;
    const v1 = { pos: 0 };
    const v2 = { pos: 0 };

    const u = consumeVoiceForOneBar(upperEvents, upperSt, BEATS_PER_BAR);
    pushVoiceMeasureFromBeats(measure, 1, u.beatSegs, u.pitches, v1);

    const l = consumeVoiceForOneBar(lowerEvents, lowerSt, BEATS_PER_BAR);
    pushVoiceMeasureFromBeats(measure, 2, l.beatSegs, l.pitches, v2);

    measures.push(measure);
  }
  assertVoiceTimelineConsumed(upperSt, upperEvents, 'upper');
  assertVoiceTimelineConsumed(lowerSt, lowerEvents, 'lower');
  return { measures };
}

function sealWybleBarMath(score: Score): void {
  for (const m of score.measures) finalizeWybleMeasureBarMathPerVoice(m);
}

export function generateWybleEtudeXml(
  chords: string[],
  canonicalChords: CanonicalChord[],
  seed?: number,
  title?: string,
  harmonyOpts?: { chordSource?: 'parsedChordBars' | 'chordProgressionText' }
): WybleBypassResult {
  validateWybleCanonicalChordList(canonicalChords, chords.length);
  console.log(
    '[wyble-harmony]',
    JSON.stringify({
      stage: 'wybleBypassGenerator',
      chordSource: harmonyOpts?.chordSource ?? 'unknown',
      parsedChordBarsLength: chords.length,
      chordPerMeasure: chords.map((c, i) => ({ measure: i + 1, chord: c })),
    })
  );
  const params: WybleParameters = {
    harmonicContext: {
      chords: canonicalChords.map((c) => ({ root: c.root, quality: c.quality, bars: 1 })),
      canonicalChords,
      key: canonicalChords[0]?.root ?? 'C',
    },
    phraseLength: chords.length,
    contraryMotionBias: 0.7,
    dyadDensity: 0.5,
    voiceRatioMode: 'mixed',
    practiceMode: 'etude',
  };
  const output = generateWybleEtude(params);
  const score = wybleOutputToScore(
    output.upper_line.events,
    output.lower_line.events,
    chords.length,
    canonicalChords
  );
  sealWybleBarMath(score);
  applyWybleVoiceIndependence(score, seed ?? 0);
  sealWybleBarMath(score);
  const lowerDiag = {
    rawLowerCount: output.lower_line.events.length,
    convertedLowerCount: score.measures.reduce((n, m) => n + (m.voices[2]?.length ?? 0), 0),
    perBar: score.measures.map((m, i) => ({ bar: i + 1, lowerNotes: m.voices[2]?.length ?? 0 })),
    barsWithZeroLower: score.measures.filter(m => (m.voices[2]?.length ?? 0) === 0).length,
  };
  console.log('[wyble-lower-diag]', JSON.stringify(lowerDiag));
  validateScore(score);
  const xml = scoreToMusicXML(score, {
    title: title ?? 'Wyble Etude',
    partName: 'Guitar',
    staves: 1,
    midiProgram: 24,
  });
  const receipt: WybleBypassReceipt = {
    barsRequested: chords.length,
    upperEventsCount: output.upper_line.events.length,
    lowerEventsCount: output.lower_line.events.length,
    musicXmlVoicesPresent: xml.includes('<voice>1</voice>') && xml.includes('<voice>2</voice>'),
    measure1Voice1Durations: parseMeasureVoiceDurations(xml, 1, '1'),
    measure1Voice2Durations: parseMeasureVoiceDurations(xml, 1, '2'),
  };
  console.log('[wyble-bypass]', JSON.stringify(receipt));
  return { guitarXml: xml, mode: 'etude', receipt };
}
