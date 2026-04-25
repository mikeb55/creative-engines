import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import {
  buildIndieDualGuitarTuningFixtureScore,
  expectedPitchTableForTuning,
  INDIE_TUNING_FIXTURE_FRETS,
  INDIE_TUNING_FIXTURE_GUITAR_1,
  INDIE_TUNING_FIXTURE_GUITAR_2,
  standardGuitarMidiSet,
} from '../core/song-mode/indieDualGuitarTuningFixture';

const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function xmlPitchToMidi(step: string, alter: number, octave: number): number {
  return (octave + 1) * 12 + STEP_TO_SEMITONE[step]! + alter;
}

function extractMeasurePitchesForPart(xml: string, partId: string, measureNumber: number): number[] {
  const partMatch = xml.match(new RegExp(`<part id="${partId}">([\\s\\S]*?)<\\/part>`));
  if (!partMatch) return [];
  const measureMatch = partMatch[1].match(
    new RegExp(`<measure number="${measureNumber}">([\\s\\S]*?)<\\/measure>`)
  );
  if (!measureMatch) return [];
  const noteBlocks = measureMatch[1].match(/<note>[\s\S]*?<\/note>/g) ?? [];
  const pitches: number[] = [];
  for (const block of noteBlocks) {
    if (block.includes('<rest/>')) continue;
    const step = block.match(/<step>([A-G])<\/step>/)?.[1];
    const alter = Number(block.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? '0');
    const octave = Number(block.match(/<octave>(-?\d+)<\/octave>/)?.[1] ?? '0');
    if (!step || !Number.isFinite(octave)) continue;
    pitches.push(xmlPitchToMidi(step, alter, octave));
  }
  return pitches;
}

function sortNumeric(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function runIndieDualGuitarTuningFixtureTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const score = buildIndieDualGuitarTuningFixtureScore();
  const expectedG1 = expectedPitchTableForTuning(INDIE_TUNING_FIXTURE_GUITAR_1);
  const expectedG2 = expectedPitchTableForTuning(INDIE_TUNING_FIXTURE_GUITAR_2);
  const standard = standardGuitarMidiSet();

  out.push({
    ok:
      score.parts.length === 2 &&
      score.parts[0]?.id === 'guitar' &&
      score.parts[1]?.id === 'guitar_2' &&
      score.parts.every((p) => p.instrumentIdentity === 'clean_electric_guitar') &&
      score.parts.every((p) => p.clef === 'treble'),
    name: 'fixture score contains exactly two electric guitar parts (no bass, no piano)',
  });

  out.push({
    ok:
      JSON.stringify(expectedG1[0]) !== JSON.stringify(standard) &&
      JSON.stringify(expectedG2[0]) !== JSON.stringify(standard),
    name: 'open-string pitches are non-standard for both guitars',
  });

  out.push({
    ok:
      INDIE_TUNING_FIXTURE_FRETS.every((fret, idx) => {
        const m1 = score.parts[0]!.measures[idx]!;
        const m2 = score.parts[1]!.measures[idx]!;
        const g1Notes = m1.events.filter((e) => e.kind === 'note');
        const g2Notes = m2.events.filter((e) => e.kind === 'note');
        return (
          g1Notes.length === 6 &&
          g2Notes.length === 6 &&
          g1Notes.every((n) => n.startBeat === 0 && n.duration === 4) &&
          g2Notes.every((n) => n.startBeat === 0 && n.duration === 4) &&
          JSON.stringify(sortNumeric(g1Notes.map((n) => n.pitch))) === JSON.stringify(sortNumeric(expectedG1[fret])) &&
          JSON.stringify(sortNumeric(g2Notes.map((n) => n.pitch))) === JSON.stringify(sortNumeric(expectedG2[fret]))
        );
      }),
    name: 'each fret bar is a true six-note simultaneous whole-note chord for both guitars',
  });

  out.push({
    ok:
      [3, 5, 7, 12].every((fret) =>
        expectedG1[fret as 3 | 5 | 7 | 12].every((p, i) => p === expectedG1[0][i]! + fret)
      ) &&
      [3, 5, 7, 12].every((fret) =>
        expectedG2[fret as 3 | 5 | 7 | 12].every((p, i) => p === expectedG2[0][i]! + fret)
      ),
    name: 'pitch math holds: fretted chords equal open strings transposed by fret count',
  });

  const exported = exportScoreModelToMusicXml(score, { preserveChordKindLiterals: true });
  const xml = exported.xml ?? '';
  out.push({
    ok: exported.success === true && xml.length > 0,
    name: 'fixture exports successfully through production MusicXML exporter path',
  });

  out.push({
    ok:
      xml.includes('<score-part id="guitar">') &&
      xml.includes('<score-part id="guitar_2">') &&
      xml.includes('<part-name>Clean Electric Guitar</part-name>') &&
      xml.includes('<part-name>Electric Guitar 2</part-name>') &&
      (xml.match(/<midi-program>28<\/midi-program>/g) ?? []).length >= 2 &&
      !/Upright Bass|Piano/i.test(xml),
    name: 'export metadata stays dual-electric and rejects bass/piano identity fallback',
  });

  out.push({
    ok: !xml.includes('<staff-tuning>') && !xml.includes('<scordatura>'),
    name: 'MusicXML export does not emit explicit tuning metadata; verification must use note pitches',
  });

  out.push({
    ok:
      INDIE_TUNING_FIXTURE_FRETS.every((fret, idx) => {
        const g1Pitches = extractMeasurePitchesForPart(xml, 'guitar', idx + 1);
        const g2Pitches = extractMeasurePitchesForPart(xml, 'guitar_2', idx + 1);
        return (
          g1Pitches.length === 6 &&
          g2Pitches.length === 6 &&
          JSON.stringify(sortNumeric(g1Pitches)) === JSON.stringify(sortNumeric(expectedG1[fret])) &&
          JSON.stringify(sortNumeric(g2Pitches)) === JSON.stringify(sortNumeric(expectedG2[fret]))
        );
      }),
    name: 'exported measure pitches match expected open/3rd/5th/7th/12th barred-chord tables',
  });

  return out;
}
