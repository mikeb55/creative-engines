import { generateWybleEtude } from '../../../jimmy-wyble-engine/wybleGenerator';
import { scoreToMusicXML } from '../../../core/scoreToMusicXML';
import { createMeasure, pushNote } from '../../../jimmy-wyble-engine/../core/measureBuilder';
import { validateScore } from '../../../../scripts/validateScore';
import type { WybleParameters } from '../../../jimmy-wyble-engine/wybleTypes';
import type { Score } from '../../../jimmy-wyble-engine/../core/timing';

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

function wybleOutputToScore(
  upperEvents: Array<{ pitch: number; duration: number; beat: number }>,
  lowerEvents: Array<{ pitch: number; duration: number; beat: number }>,
  bars: number
): Score {
  const measures: Score['measures'] = [];
  const beatsPerBar = 4;
  let uIdx = 0;
  let lIdx = 0;

  for (let i = 0; i < bars; i++) {
    const measure = createMeasure(i, [1, 2]);
    const v1 = { pos: 0 };
    const v2 = { pos: 0 };

    let uTotal = 0;
    while (uIdx < upperEvents.length && uTotal < beatsPerBar) {
      const e = upperEvents[uIdx++];
      const dur = Math.min(e.duration, beatsPerBar - uTotal);
      if (dur > 0) { pushNote(measure, 1, e.pitch, Math.round(dur * 4), v1); uTotal += dur; }
    }
    if (uTotal < beatsPerBar) pushNote(measure, 1, 60, Math.round((beatsPerBar - uTotal) * 4), v1);

    let lTotal = 0;
    while (lIdx < lowerEvents.length && lTotal < beatsPerBar) {
      const e = lowerEvents[lIdx++];
      const dur = Math.min(e.duration, beatsPerBar - lTotal);
      if (dur > 0) { pushNote(measure, 2, e.pitch, Math.round(dur * 4), v2); lTotal += dur; }
    }
    if (lTotal < beatsPerBar) pushNote(measure, 2, 48, Math.round((beatsPerBar - lTotal) * 4), v2);

    measures.push(measure);
  }
  return { measures };
}

export function generateWybleEtudeXml(
  chords: string[],
  seed?: number,
  title?: string
): WybleBypassResult {
  const params: WybleParameters = {
    harmonicContext: {
      chords: chords.map(c => ({ root: c.replace(/maj.*|m.*|7.*|9.*/, ''), quality: 'maj7', bars: 1 })),
      key: chords[0]?.replace(/maj.*|m.*|7.*|9.*/, '') ?? 'C',
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
    chords.length
  );
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
