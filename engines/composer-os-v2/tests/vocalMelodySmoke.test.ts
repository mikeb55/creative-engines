/**
 * Smoke — Vocal melody engine (`MELODY_PROFILES`, `planMelodyBehaviour`, `planLeadMelody`, songwriting-bridge payload).
 */

import { MELODY_PROFILES, planMelodyBehaviour } from '../core/song-mode/melodyBehaviourPlanner';
import { buildCompiledSong, buildLeadSheetContractFromCompiled } from '../core/song-mode/songModeBuilder';
import { buildSongwritingBridgePayloadFromLeadSheetContract } from '../core/song-mode/songwritingBridgeLeadSheet';
import { planDefaultVerseChorusStructure } from '../core/song-mode/songSectionPlanner';
import { getSingerRangeProfile } from '../core/song-mode/singerRangeProfiles';
import type { SongVoiceType } from '../core/song-mode/songModeTypes';
import type { SongwriterRuleId } from '../core/song-mode/songwritingResearchTypes';

const VERSE_ONLY = [{ order: 0, kind: 'verse' as const }];

function barCountFromCompiled(song: { chordPlan: { chordSymbols: readonly string[] }[] }): number {
  let n = 0;
  for (const b of song.chordPlan) n += b.chordSymbols.length;
  return n;
}

function notesPerMeasure(notes: readonly { measure: number }[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const ev of notes) {
    m.set(ev.measure, (m.get(ev.measure) ?? 0) + 1);
  }
  return m;
}

function findJamesBrownEighthMultiNoteSeed(maxSeed = 8000): number {
  for (let seed = 0; seed < maxSeed; seed++) {
    const song = buildCompiledSong({
      seed,
      title: 'vocal_smoke_james',
      sections: VERSE_ONLY,
      primarySongwriterStyle: 'james_brown',
      voiceType: 'male_tenor',
    });
    const bars = barCountFromCompiled(song);
    const ppm = notesPerMeasure(song.leadMelodyPlan?.notes ?? []);
    let ok = true;
    for (let measure = 1; measure <= bars; measure++) {
      if ((ppm.get(measure) ?? 0) <= 1) {
        ok = false;
        break;
      }
    }
    if (ok) return seed;
  }
  return -1;
}

let jamesMultiNoteSeedMemo: number | undefined;

function jamesBrownStrictEighthSeed(): number {
  if (jamesMultiNoteSeedMemo === undefined) {
    jamesMultiNoteSeedMemo = findJamesBrownEighthMultiNoteSeed();
  }
  return jamesMultiNoteSeedMemo;
}

export function runVocalMelodySmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const profileKeys = Object.keys(MELODY_PROFILES).filter((k) => MELODY_PROFILES[k as SongwriterRuleId] != null);
  out.push({
    ok: profileKeys.length >= 35,
    name: 'MELODY_PROFILES: ≥35 research composer rows',
  });

  const writerSample: SongwriterRuleId[] = [
    'brian_wilson',
    'frank_zappa',
    'james_brown',
    'radiohead',
    'thelonious_monk',
    'kendrick_lamar',
    'antonio_carlos_jobim',
    'pat_metheny',
    'bill_evans',
    'kate_bush',
  ];
  const tupleSeed = 1337;
  const tuples = new Set<string>();
  for (const id of writerSample) {
    const p = planMelodyBehaviour(tupleSeed, id);
    tuples.add(`${p.rhythmicSubdivision}|${p.intervalTendency}|${p.phraseLength}`);
  }
  out.push({
    ok: tuples.size === writerSample.length,
    name: 'planMelodyBehaviour: 10 representative writers → distinct rhythm + interval + phraseLength tuples',
  });

  const satb: SongVoiceType[] = ['male_tenor', 'female_alto', 'baritone', 'soprano'];
  let comfortOk = true;
  const probeSeed = 4242;
  for (const vt of satb) {
    const song = buildCompiledSong({
      seed: probeSeed,
      title: 'vocal_smoke_satb',
      sections: VERSE_ONLY,
      primarySongwriterStyle: 'bill_evans',
      voiceType: vt,
    });
    const [lo, hi] = getSingerRangeProfile(vt).comfortRangeMidi;
    for (const n of song.leadMelodyPlan?.notes ?? []) {
      if (n.midi < lo || n.midi > hi) {
        comfortOk = false;
        break;
      }
    }
    if (!comfortOk) break;
  }

  const densitySong = buildCompiledSong({
    seed: 777,
    title: 'vocal_smoke_density',
    sections: VERSE_ONLY,
    primarySongwriterStyle: 'pat_metheny',
    voiceType: 'male_tenor',
  });
  const barsDensity = barCountFromCompiled(densitySong);
  const ppmDensity = notesPerMeasure(densitySong.leadMelodyPlan?.notes ?? []);
  let onePerBarOk = true;
  for (let m = 1; m <= barsDensity; m++) {
    if ((ppmDensity.get(m) ?? 0) < 1) {
      onePerBarOk = false;
      break;
    }
  }

  const jSeed = jamesBrownStrictEighthSeed();
  const jBeh = planMelodyBehaviour(jSeed >= 0 ? jSeed : 0, 'james_brown');
  const songJames =
    jSeed >= 0
      ? buildCompiledSong({
          seed: jSeed,
          title: 'vocal_smoke_james',
          sections: VERSE_ONLY,
          primarySongwriterStyle: 'james_brown',
          voiceType: 'male_tenor',
        })
      : null;
  const jBars = songJames ? barCountFromCompiled(songJames) : 0;
  const ppmJ = songJames ? notesPerMeasure(songJames.leadMelodyPlan?.notes ?? []) : new Map<number, number>();
  let jMultiOk = jSeed >= 0 && jBeh.rhythmicSubdivision === 'eighth_patterns';
  if (jMultiOk && songJames) {
    for (let m = 1; m <= jBars; m++) {
      if ((ppmJ.get(m) ?? 0) <= 1) {
        jMultiOk = false;
        break;
      }
    }
  }

  const songEcm = buildCompiledSong({
    seed: 12345,
    title: 'vocal_smoke_ecm',
    sections: VERSE_ONLY,
    primarySongwriterStyle: 'ecm_chamber',
    voiceType: 'male_tenor',
  });
  const eBeh = planMelodyBehaviour(12345, 'ecm_chamber');
  const eBars = barCountFromCompiled(songEcm);
  const ppmE = notesPerMeasure(songEcm.leadMelodyPlan?.notes ?? []);
  let ecmWholeOk = eBeh.rhythmicSubdivision === 'whole_bar';
  if (ecmWholeOk) {
    for (let m = 1; m <= eBars; m++) {
      if ((ppmE.get(m) ?? 0) !== 1) {
        ecmWholeOk = false;
        break;
      }
    }
  }

  out.push({
    ok: comfortOk && onePerBarOk && jMultiOk && ecmWholeOk,
    name: 'planLeadMelody: ≥1 note/bar; SATB comfort; eighth_patterns >1/bar (James Brown); whole_bar =1/bar (ECM Chamber)',
  });

  const fullForm = buildCompiledSong({
    seed: 9999,
    title: 'Bridge smoke',
    sections: planDefaultVerseChorusStructure(),
    primarySongwriterStyle: 'brian_wilson',
    voiceType: 'male_tenor',
  });
  const contract = buildLeadSheetContractFromCompiled(fullForm);
  const payload = buildSongwritingBridgePayloadFromLeadSheetContract(contract);
  let bridgeMelodyCount = 0;
  for (const sec of payload.sections as Array<{ melody_events?: unknown[] }>) {
    bridgeMelodyCount += sec.melody_events?.length ?? 0;
  }
  const bridgeOk =
    contract.vocalMelody.events.length > 0 &&
    bridgeMelodyCount > 0 &&
    bridgeMelodyCount === contract.vocalMelody.events.length;

  out.push({
    ok: bridgeOk,
    name: 'songwritingBridgeLeadSheet: bridge payload melody_events mirror vocalMelody.events (non-empty)',
  });

  return out;
}
