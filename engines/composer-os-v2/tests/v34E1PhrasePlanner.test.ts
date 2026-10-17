/**
 * V3.4 E1 checkpoint 1 — shared phrase planner.
 * Compares note events. Does not claim artistic quality or composer recognisability.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runGoldenPathOnce, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { applyE1SharedPhrasePlanner, e1HillDisplaceEighths } from '../core/phrase/e1SharedPhrasePlanner';
import { HILL_SLICE_PARAMETERS } from '../core/song-mode/andrewHillSlice';
import { BARTOK_BULGARIAN_AKSAK_CELL_SPECS, BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY } from '../core/rhythm/bartokBulgarianAksakRhythmEngine';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { E1Ablation } from '../core/phrase/e1SharedPhrasePlanner';

type Row = { name: string; ok: boolean };

const PILOTS = ['john_barry', 'andrew_hill', 'bartok', 'kenny_wheeler', 'jim_hall', 'wayne_shorter'] as const;
const SEEDS = [76017, 76018, 76019, 76020, 76021];

const OFF_FP: Record<string, string> = {
  john_barry: '4547be8eaedc705f0b94df8e46af275281515af47410b153b22dbfaf3c2cc2df',
  andrew_hill: 'a1b65a26989e9b149de17168f260f7c611e16d452669fefb664a311c875d0871',
  bartok: '3040be53078e4f1857b4d98fb74911591ef033b372ae04da39b439a54449856e',
  kenny_wheeler: '7b5b7bae62d6980523a94a110507759813bb4f0aff23203e3093b51d1a2ff877',
  jim_hall: '3530b1b0bdec9559b94117d8bf935d8a3736552d68268a710089c0f2989e2f93',
  wayne_shorter: '2fd54652471846643d715fb23909b86719ac22d2e1a5b087bd913fb7208cde80',
  frank_zappa: 'f81b4ed946ebf9c9f2922ec6e9853884c328a6514bcf537a272ac60e9b2b260e',
  fripp_king_crimson: 'acf11e3ad5d126405cd477cdfcb6fa4e4ae0d84a88ff7b931eb5556be22e6fd4',
};

function songOpts(primary: string, extra: Partial<RunGoldenPathOptions> = {}): RunGoldenPathOptions {
  return {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleStack: { primary: 'triad_pairs', weights: { primary: 1 } },
    creativeControlLevel: 'stable',
    chromaticStrength: 'prominent',
    endingContext: 'open_idiom',
    keySignatureMode: 'none',
    primarySongwriterStyle: primary,
    scoreTitle: primary,
    ...extra,
  };
}

function eventDigest(score: ScoreModel | undefined): string {
  const parts = (score?.parts ?? []).map((part) => {
    const notes = part.measures
      .map((measure) =>
        measure.events
          .map((event) => {
            if (event.kind === 'note') return `n${event.pitch}@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`;
            if (event.kind === 'rest') return `r@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`;
            return `c${event.pitches.join('+')}@${event.startBeat}:${event.duration}:v${event.voice}`;
          })
          .join(',')
      )
      .join(';');
    const chords = part.measures.map((measure) => measure.chord ?? '').join('|');
    return `${part.instrumentIdentity}\n${chords}\n${notes}`;
  });
  return createHash('sha256').update(parts.join('\n---\n')).digest('hex');
}

function part(score: ScoreModel | undefined, id: string) {
  return score?.parts.find((item) => item.instrumentIdentity === id);
}

function leadNotes(score: ScoreModel | undefined) {
  const guitar = part(score, 'clean_electric_guitar');
  return (guitar?.measures ?? []).map((measure) =>
    measure.events.filter((event) => event.kind === 'note'),
  );
}

function bassNotes(score: ScoreModel | undefined) {
  const bass = part(score, 'acoustic_upright_bass');
  return (bass?.measures ?? []).map((measure) =>
    measure.events.filter((event) => event.kind === 'note'),
  );
}

function chordsOf(score: ScoreModel | undefined): string {
  return part(score, 'clean_electric_guitar')?.measures.map((measure) => measure.chord ?? '').join('|') ?? '';
}

function signature(score: ScoreModel | undefined): string {
  return leadNotes(score)
    .map((notes) => notes.map((note) => `${note.startBeat}:${note.duration}`).join(','))
    .join(';');
}

function pitches(score: ScoreModel | undefined, bar: number): number[] {
  return leadNotes(score)[bar]?.map((note) => (note.kind === 'note' ? note.pitch : 0)) ?? [];
}

function intervals(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) out.push(values[i]! - values[i - 1]!);
  return out;
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function rootPc(symbol: string | undefined): number {
  const match = (symbol ?? 'C').match(/^([A-G](?:#|b)?)/);
  const name = match?.[1] ?? 'C';
  const letter = 'CDEFGAB'.indexOf(name[0]!.toUpperCase());
  const base = [0, 2, 4, 5, 7, 9, 11][letter] ?? 0;
  if (name[1] === '#') return mod12(base + 1);
  if (name[1] === 'b') return mod12(base - 1);
  return base;
}

function inRange(score: ScoreModel | undefined): boolean {
  const guitar = part(score, 'clean_electric_guitar');
  const bass = part(score, 'acoustic_upright_bass');
  const guitarOk = (guitar?.measures ?? []).every((measure) =>
    measure.events.every((event) => event.kind !== 'note' || (event.pitch >= 52 && event.pitch <= 84)),
  );
  const bassOk = (bass?.measures ?? []).every((measure) =>
    measure.events.every((event) => event.kind !== 'note' || (event.pitch >= 28 && event.pitch <= 55)),
  );
  return guitarOk && bassOk;
}

function hasTie(score: ScoreModel | undefined, bar: number): boolean {
  return (leadNotes(score)[bar] ?? []).some((note) => note.kind === 'note' && !!note.notation?.tie);
}

const LOCKED = Array.from({ length: 32 }, (_, index) =>
  ['Cmaj7', 'Bbmaj7', 'Amin7', 'Ebmaj7', 'Fmaj7', 'Dbmaj7', 'Gmin7', 'Emaj7'][index % 8]!,
);

export function runV34E1PhrasePlannerTests(): Row[] {
  const out: Row[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });
  const evidence: Record<string, unknown> = {};

  for (const id of [...PILOTS, 'frank_zappa', 'fripp_king_crimson'] as const) {
    const off = runGoldenPathOnce(76017, songOpts(id));
    t(`default-off ${id} matches pre-edit fingerprint`, off.success === true && eventDigest(off.score) === OFF_FP[id]);
  }

  const zappaOn = runGoldenPathOnce(76017, songOpts('frank_zappa', { e1PhrasePlanner: true }));
  const frippOn = runGoldenPathOnce(76017, songOpts('fripp_king_crimson', { e1PhrasePlanner: true }));
  t('Zappa stays on the legacy path when the planner flag is set', eventDigest(zappaOn.score) === OFF_FP.frank_zappa);
  t('Fripp stays on the legacy path when the planner flag is set', eventDigest(frippOn.score) === OFF_FP.fripp_king_crimson);
  t(
    'non-pilot flag records a refusal',
    zappaOn.context.generationMetadata.e1PhrasePlannerReceipt?.status === 'refused',
  );

  const openOn = new Map<string, ReturnType<typeof runGoldenPathOnce>>();
  const openOff = new Map<string, ReturnType<typeof runGoldenPathOnce>>();
  for (const id of PILOTS) {
    const off = runGoldenPathOnce(76017, songOpts(id));
    const on = runGoldenPathOnce(76017, songOpts(id, { e1PhrasePlanner: true }));
    const again = runGoldenPathOnce(76017, songOpts(id, { e1PhrasePlanner: true }));
    openOff.set(id, off);
    openOn.set(id, on);
    const math = validateStrictBarMath(on.score);
    const schema = on.xml ? validateMusicXmlSchema(on.xml) : { valid: false, errors: ['missing xml'] };
    t(`${id} planner applies`, on.context.generationMetadata.e1PhrasePlannerReceipt?.status === 'applied');
    t(`${id} same seed is deterministic`, eventDigest(on.score) === eventDigest(again.score));
    t(`${id} changes lead or bass events`, signature(on.score) !== signature(off.score) || eventDigest(on.score) !== eventDigest(off.score));
    t(`${id} keeps harmony symbols`, chordsOf(on.score) === chordsOf(off.score));
    t(`${id} bar math and ranges`, math.valid && inRange(on.score));
    t(`${id} MusicXML schema`, schema.valid === true);
    evidence[id] = {
      rule: on.context.generationMetadata.e1PhrasePlannerReceipt?.ruleId,
      offLeadBar0: pitches(off.score, 0),
      onLeadBar0: pitches(on.score, 0),
      onLeadBar1: pitches(on.score, 1),
      onRhythmBar0: leadNotes(on.score)[0]?.map((note) => `${note.startBeat}:${note.duration}`),
      onRhythmBar1: leadNotes(on.score)[1]?.map((note) => `${note.startBeat}:${note.duration}`),
    };
  }

  const rhythms = PILOTS.map((id) => signature(openOn.get(id)?.score));
  t('six pilots do not share one lead rhythm', new Set(rhythms).size === PILOTS.length);

  const barry = openOn.get('john_barry')!.score;
  const barryDurations = leadNotes(barry).flat().map((note) => note.duration);
  t('Barry uses a sustained lead note', Math.max(...barryDurations) >= 4);
  t('Barry holds a pitch across a bar', hasTie(barry, 1) && pitches(barry, 2)[0] === pitches(barry, 1)[0]);
  t(
    'Barry bass keeps a short cycle under the long note',
    (bassNotes(barry)[0]?.length ?? 0) >= 2 && (leadNotes(barry)[0]?.length ?? 9) <= 2,
  );

  const hill = openOn.get('andrew_hill')!.score;
  t('Hill displaces the repeated cell by one eighth', leadNotes(hill)[1]?.[0]?.startBeat === 0.5);
  t('Hill keeps the cell intervals', intervals(pitches(hill, 0)).join(',') === intervals(pitches(hill, 1)).join(','));
  t('Hill bass rests on the planned handoff bar', (bassNotes(hill)[2]?.length ?? 1) === 0);
  t(
    'Hill return restores downbeat alignment',
    leadNotes(hill)[16]?.[0]?.startBeat === 0 && leadNotes(hill)[17]?.[0]?.startBeat === 0,
  );
  const hillReceipt = openOn.get('andrew_hill')!.context.generationMetadata.e1PhrasePlannerReceipt;
  t(
    'Hill planner reads the slice displacement bias',
    hillReceipt?.hillRhythmicDisplacementBias === HILL_SLICE_PARAMETERS.rhythmicDisplacementBias &&
      hillReceipt?.hillDisplaceEighths === e1HillDisplaceEighths(HILL_SLICE_PARAMETERS.rhythmicDisplacementBias) &&
      e1HillDisplaceEighths(0.65) === 1,
  );
  const hillSource = openOff.get('andrew_hill')!.score;
  const hillBias0 = applyE1SharedPhrasePlanner(hillSource, {
    seed: 76017,
    songwriterId: 'andrew_hill',
    hillRhythmicDisplacementBias: 0,
  });
  const hillBias1 = applyE1SharedPhrasePlanner(hillSource, {
    seed: 76017,
    songwriterId: 'andrew_hill',
    hillRhythmicDisplacementBias: 1,
  });
  const hillOnset = (score: ScoreModel) => leadNotes(score)[1]?.[0]?.startBeat;
  const hillBias0Xml = exportScoreModelToMusicXml(hillBias0.score);
  const hillBias1Xml = exportScoreModelToMusicXml(hillBias1.score);
  t('Hill bias 0 puts the repeated cell on the beat', hillBias0.receipt.status === 'applied' && hillOnset(hillBias0.score) === 0);
  t(
    'Hill bias 1 delays the repeated cell by two eighths',
    hillBias1.receipt.status === 'applied' && hillOnset(hillBias1.score) === 1,
  );
  t(
    'Hill bias changes the onset and keeps the cell pitches',
    hillOnset(hillBias0.score) !== hillOnset(hillBias1.score) &&
      pitches(hillBias0.score, 0).join(',') === pitches(hillBias1.score, 0).join(',') &&
      pitches(hillBias0.score, 1).join(',') === pitches(hillBias1.score, 1).join(','),
  );
  t(
    'Hill bias keeps chord symbols and valid MusicXML',
    chordsOf(hillBias0.score) === chordsOf(hillSource) &&
      chordsOf(hillBias1.score) === chordsOf(hillSource) &&
      validateStrictBarMath(hillBias0.score).valid &&
      validateStrictBarMath(hillBias1.score).valid &&
      hillBias0Xml.success === true &&
      hillBias1Xml.success === true &&
      validateMusicXmlSchema(hillBias0Xml.xml ?? '').valid &&
      validateMusicXmlSchema(hillBias1Xml.xml ?? '').valid,
  );

  const bartok = openOn.get('bartok')!.score;
  const bartokDur = leadNotes(bartok)[0]?.map((note) => note.duration).join(',') ?? '';
  const bartokReturn = leadNotes(bartok)[1]?.map((note) => note.duration).join(',') ?? '';
  t('Bartók states a short-long group', bartokDur === '1,1,1.5,0.5');
  t('Bartók return reverses the group', bartokReturn === '0.5,1.5,1,1');
  t('Bartók bass enters after the lead', part(bartok, 'acoustic_upright_bass')?.measures[0]?.events[0]?.kind === 'rest');
  const aksak = BARTOK_BULGARIAN_AKSAK_CELL_SPECS.B1;
  t(
    'Bartók aksak default is nine 16th pulses',
    BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY.pulseBase === '16th' &&
      BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY.subgroupVector.join('+') === '4+2+3' &&
      aksak.totalPulses === 9 &&
      aksak.vector[0]! + aksak.vector[1]! + aksak.vector[2]! === 9,
  );
  t(
    'Bartók 4/4 planner does not adopt the nine-pulse group',
    bartokDur !== '1,0.5,0.75' && bartokDur === '1,1,1.5,0.5',
  );
  t(
    'Bartók answer is an inversion, not a copy',
    intervals(pitches(bartok, 0)).join(',') !==
      intervals(
        (bassNotes(bartok)[0] ?? []).map((note) => (note.kind === 'note' ? note.pitch : 0)),
      ).join(','),
  );

  const wheeler = openOn.get('kenny_wheeler')!.score;
  const tonic = rootPc(part(wheeler, 'clean_electric_guitar')?.measures[0]?.chord);
  const major = [0, 2, 4, 5, 7, 9, 11];
  const wheelerPcs = leadNotes(wheeler)
    .flat()
    .map((note) => mod12((note.kind === 'note' ? note.pitch : 0) - tonic));
  t('Wheeler melody stays in the reference collection', wheelerPcs.every((pc) => major.includes(pc)));
  t('Wheeler holds a collection tone across a chord bar', hasTie(wheeler, 0));
  t(
    'Wheeler bass moves under the held tone',
    (bassNotes(wheeler)[0]?.length ?? 0) >= 2 || (bassNotes(wheeler)[1]?.[0] && bassNotes(wheeler)[0]?.[0]),
  );

  const hall = openOn.get('jim_hall')!.score;
  t('Hall lead rests while the bass answers', (leadNotes(hall)[1]?.length ?? 1) === 0 && (bassNotes(hall)[1]?.length ?? 0) > 0);
  t('Hall bass rests during the lead statement', (bassNotes(hall)[0]?.length ?? 1) === 0 && (leadNotes(hall)[0]?.length ?? 0) >= 2);
  t('Hall answer is shorter than the statement', (bassNotes(hall)[1]?.length ?? 9) < (leadNotes(hall)[0]?.length ?? 0));

  const shorter = openOn.get('wayne_shorter')!.score;
  t('Shorter retains a motif pitch across the next bar', hasTie(shorter, 0) && pitches(shorter, 1)[0] === pitches(shorter, 0).at(-1));
  t(
    'Shorter bass arrives late in the second bar',
    part(shorter, 'acoustic_upright_bass')?.measures[1]?.events[0]?.kind === 'rest',
  );
  t('Shorter cell intervals recur after the transform', intervals(pitches(shorter, 0)).slice(0, 3).join(',') === '2,5,-2');

  for (const seed of SEEDS) {
    const barrySeed = runGoldenPathOnce(seed, songOpts('john_barry', { e1PhrasePlanner: true }));
    const again = runGoldenPathOnce(seed, songOpts('john_barry', { e1PhrasePlanner: true }));
    t(`Barry seed ${seed} is deterministic`, eventDigest(barrySeed.score) === eventDigest(again.score));
    const hillSeed = runGoldenPathOnce(seed, songOpts('andrew_hill', { e1PhrasePlanner: true }));
    const hillAgain = runGoldenPathOnce(seed, songOpts('andrew_hill', { e1PhrasePlanner: true }));
    t(
      `Hill seed ${seed} keeps the one-eighth displacement`,
      eventDigest(hillSeed.score) === eventDigest(hillAgain.score) &&
        leadNotes(hillSeed.score)[1]?.[0]?.startBeat === 0.5,
    );
  }
  const barryA = runGoldenPathOnce(76017, songOpts('john_barry', { e1PhrasePlanner: true }));
  const barryB = runGoldenPathOnce(76018, songOpts('john_barry', { e1PhrasePlanner: true }));
  t('Barry sequence interval changes with the seed', eventDigest(barryA.score) !== eventDigest(barryB.score));

  const lockedChords: string[] = [];
  for (const id of PILOTS) {
    const locked = runGoldenPathOnce(
      76017,
      songOpts(id, {
        e1PhrasePlanner: true,
        harmonyMode: 'custom_locked',
        lockedHarmonyBarsRaw: LOCKED,
        parsedChordBars: LOCKED,
        chordProgressionText: LOCKED.join('|'),
      }),
    );
    lockedChords.push(chordsOf(locked.score));
    t(`${id} planner keeps the harmony its slice already wrote`, chordsOf(locked.score) === chordsOf(
      runGoldenPathOnce(
        76017,
        songOpts(id, {
          harmonyMode: 'custom_locked',
          lockedHarmonyBarsRaw: LOCKED,
          parsedChordBars: LOCKED,
          chordProgressionText: LOCKED.join('|'),
        }),
      ).score,
    ));
  }
  t(
    'existing harmony slices still rewrite a shared locked list',
    new Set(lockedChords).size > 1,
  );

  const stampedBase = openOff.get('john_barry')!.score;
  const stamped: ScoreModel = {
    ...stampedBase,
    parts: stampedBase.parts.map((item) => ({
      ...item,
      measures: item.measures.map((measure, index) => ({
        ...measure,
        chord: LOCKED[index] ?? measure.chord,
        chordSymbol: LOCKED[index] ?? measure.chordSymbol,
        events: measure.events.map((event) => ({ ...event })),
      })),
    })),
  };
  const restrictedRhythms: string[] = [];
  const restrictedChordLists: string[] = [];
  for (const id of PILOTS) {
    const planned = applyE1SharedPhrasePlanner(stamped, { seed: 76017, songwriterId: id });
    const xml = exportScoreModelToMusicXml(planned.score);
    restrictedRhythms.push(signature(planned.score));
    restrictedChordLists.push(chordsOf(planned.score));
    t(
      `${id} identical-chord replan is valid`,
      planned.receipt.status === 'applied' &&
        validateStrictBarMath(planned.score).valid &&
        xml.success === true &&
        validateMusicXmlSchema(xml.xml ?? '').valid,
    );
  }
  t('identical chords still separate the six rhythms', new Set(restrictedRhythms).size === PILOTS.length);
  t('identical-chord replan keeps one harmony list', new Set(restrictedChordLists).size === 1);

  const ablations: Array<{ id: (typeof PILOTS)[number]; ablate: E1Ablation; name: string; ok: (score: ScoreModel) => boolean }> = [
    {
      id: 'john_barry',
      ablate: 'rhythm',
      name: 'Barry rhythm ablation removes the sustained note',
      ok: (score) => Math.max(...leadNotes(score).flat().map((note) => note.duration), 0) <= 1,
    },
    {
      id: 'andrew_hill',
      ablate: 'motif',
      name: 'Hill motif ablation collapses the cell to one pitch class',
      ok: (score) => new Set(pitches(score, 0).map(mod12)).size === 1,
    },
    {
      id: 'jim_hall',
      ablate: 'rests',
      name: 'Hall rest ablation fills the answer bar',
      ok: (score) => (leadNotes(score)[1]?.length ?? 0) > 0,
    },
    {
      id: 'wayne_shorter',
      ablate: 'transform',
      name: 'Shorter transform ablation matches the second half to the first',
      ok: (score) => pitches(score, 0).join(',') === pitches(score, 16).join(','),
    },
    {
      id: 'jim_hall',
      ablate: 'secondary',
      name: 'Hall secondary ablation removes the silent bass statement',
      ok: (score) => (bassNotes(score)[0]?.length ?? 0) > 0,
    },
  ];
  for (const ablation of ablations) {
    const run = runGoldenPathOnce(76017, songOpts(ablation.id, { e1PhrasePlanner: true, e1PhrasePlannerAblate: ablation.ablate }));
    const full = openOn.get(ablation.id)!;
    t(ablation.name, ablation.ok(run.score) && eventDigest(run.score) !== eventDigest(full.score));
  }
  t(
    'Shorter transform moves the cell instead of copying its placement',
    (leadNotes(shorter)[0] ?? []).map((note) => `${note.startBeat}:${note.duration}`).join(',') !==
      (leadNotes(shorter)[16] ?? []).map((note) => `${note.startBeat}:${note.duration}`).join(','),
  );

  const lockedNotes = runGoldenPathOnce(
    76017,
    songOpts('jim_hall', {
      e1PhrasePlanner: true,
      songModeLeadSheetMelodyAnchors: [{ bar: 1, midi: 60 }],
    }),
  );
  const lockedNotesOff = runGoldenPathOnce(
    76017,
    songOpts('jim_hall', { songModeLeadSheetMelodyAnchors: [{ bar: 1, midi: 60 }] }),
  );
  t(
    'source-locked melody refuses the planner',
    lockedNotes.context.generationMetadata.e1PhrasePlannerReceipt?.status === 'refused' &&
      eventDigest(lockedNotes.score) === eventDigest(lockedNotesOff.score),
  );

  const cue = runGoldenPathOnce(76017, songOpts('kenny_wheeler', { e1PhrasePlanner: true, totalBars: 40, bpm: 80 }));
  const per = cue.xml?.match(/<per-minute>([^<]+)<\/per-minute>/)?.[1];
  const cueBars = part(cue.score, 'clean_electric_guitar')?.measures.length ?? 0;
  const seconds = cueBars * 4 * (60 / Number(per ?? 0));
  t(
    '40-bar cue at 80 BPM lasts 120 seconds',
    cue.context.generationMetadata.e1PhrasePlannerReceipt?.status === 'applied' &&
      per === '80' &&
      cueBars === 40 &&
      seconds === 120,
  );

  for (const seed of [76017, 76018] as const) {
    const lockedOpts = songOpts('reich_glass', {
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: LOCKED,
      parsedChordBars: LOCKED,
      chordProgressionText: LOCKED.join('|'),
    });
    const run = runGoldenPathOnce(seed, lockedOpts);
    const again = runGoldenPathOnce(seed, lockedOpts);
    const bar1 = pitches(run.score, 0);
    const steps = intervals(bar1.slice(0, 4)).map((step) => Math.abs(step));
    const bar5 = pitches(run.score, 4);
    const bar17 = pitches(run.score, 16);
    const bar21 = pitches(run.score, 20);
    t(
      `reich_glass seed ${seed} locked generation succeeds`,
      run.success === true &&
        run.mxValidationPassed === true &&
        run.strictBarMathPassed === true &&
        chordsOf(run.score) === LOCKED.join('|') &&
        eventDigest(run.score) === eventDigest(again.score),
    );
    t(
      `reich_glass seed ${seed} bar 1 cell uses intervals 2, 3, 4, 7`,
      bar1.length >= 8 && steps.every((step) => [2, 3, 4, 7].includes(step)),
    );
    t(
      `reich_glass seed ${seed} phases that cell at bar 5 and grows it after bar 16`,
      bar5[0] === bar1[1] &&
        bar5.join(',') !== bar1.join(',') &&
        bar17.join(',') === bar1.slice(0, 3).join(',') &&
        bar21.length === bar17.length + 1,
    );
  }
  const reichOff = runGoldenPathOnce(
    76017,
    songOpts('reich_glass', {
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: LOCKED,
      parsedChordBars: LOCKED,
      chordProgressionText: LOCKED.join('|'),
    }),
  );
  t(
    'reich_glass does not turn the phrase planner on',
    reichOff.context.generationMetadata.e1PhrasePlannerReceipt?.status !== 'applied',
  );

  if (process.env.COMPOSER_OS_E1_WRITE === '1') {
    const dir = path.resolve(__dirname, '../../../docs/v3.4-e1-checkpoint1');
    fs.mkdirSync(dir, { recursive: true });
    for (const id of PILOTS) {
      const on = openOn.get(id)!;
      fs.writeFileSync(path.join(dir, `${id}-32.musicxml`), on.xml ?? '', 'utf8');
      const long = runGoldenPathOnce(76017, songOpts(id, { e1PhrasePlanner: true, totalBars: 40, bpm: 80 }));
      fs.writeFileSync(path.join(dir, `${id}-120s.musicxml`), long.xml ?? '', 'utf8');
    }
    fs.writeFileSync(path.join(dir, 'before-after.json'), JSON.stringify(evidence, null, 2), 'utf8');
  }

  return out;
}
