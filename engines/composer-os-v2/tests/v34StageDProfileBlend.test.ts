/**
 * V3.4 Stage D — composer-profile blend, tempo, Duo honesty, Metheny bass cell.
 * Compares MusicXML note events and chord symbols. No artistic score.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateComposition } from '../app-api/generateComposition';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { rhythmFingerprint } from '../core/goldenPath/bassLineFingerprints';
import { validateBassIdentity } from '../core/score-integrity/bassIdentityValidation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

type Row = { name: string; ok: boolean };

const PRIMARY_FP: Record<string, string> = {
  wayne_shorter: '7c135ed77691a2908f43c1e9279ca8dc4a10fbdb79f874978b8447456f0f0543',
  bacharach: '6a25fd95c232043b90311ada229eb70c092957dedd9a9604029265890a95c271',
  debussy: 'af8cea94da3c50e517f4f04e68ab44a9503cf41c7fee2e01a6061b67a4150192',
  gil_evans: '073a8e48b88c527c4e7a9a7ff79c5a87ef0e7cf2ba133e8ff2cd3c125ac1fde6',
  pat_metheny: 'b093a2f825d5b42df59fe80d0796bd4f6f8cfccf1bac5c40c7e8500a9141b3cb',
  joni_mitchell: '182ba810bde9c36592ff86a6689371f5e234c7d9c88dd0f6e2267e936f8995df',
};

function songOpts(primary: string, extra: Record<string, unknown> = {}) {
  return {
    presetId: 'guitar_bass_duo' as const,
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleStack: { primary: 'triad_pairs' as const, weights: { primary: 1 } },
    creativeControlLevel: 'stable' as const,
    chromaticStrength: 'prominent' as const,
    endingContext: 'open_idiom' as const,
    keySignatureMode: 'none' as const,
    primarySongwriterStyle: primary,
    scoreTitle: primary,
    ...extra,
  };
}

function eventDigest(score: ScoreModel | undefined): string {
  const guitar = score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score?.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const chords = guitar?.measures.map((m) => m.chord ?? '').join('|') ?? '';
  const notes = (part?: typeof guitar) =>
    (part?.measures ?? [])
      .map((m) =>
        m.events
          .filter((e) => e.kind === 'note')
          .map((e) => `${'pitch' in e ? e.pitch : '' }@${e.startBeat}:${e.duration}`)
          .join(',')
      )
      .join(';');
  return createHash('sha256').update(`${chords}\n${notes(guitar)}\n${notes(bass)}`).digest('hex');
}

function chordsOf(score: ScoreModel | undefined): string {
  const guitar = score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  return guitar?.measures.map((m) => m.chord ?? '').join('|') ?? '';
}

function guitarNotes(score: ScoreModel | undefined): string {
  const guitar = score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  return (guitar?.measures ?? [])
    .map((m) =>
      m.events
        .filter((e) => e.kind === 'note')
        .map((e) => `${'pitch' in e ? e.pitch : ''}:${e.duration}`)
        .join(',')
    )
    .join(';');
}

export function runV34StageDProfileBlendTests(): Row[] {
  const out: Row[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });

  const primaryScore = new Map<string, ReturnType<typeof runGoldenPathOnce>>();
  for (const id of Object.keys(PRIMARY_FP)) {
    const r = runGoldenPathOnce(76017, songOpts(id));
    primaryScore.set(id, r);
    const per = r.xml?.match(/<per-minute>([^<]+)<\/per-minute>/)?.[1];
    t(
      `primary-only ${id} fingerprint and 120 BPM`,
      r.success === true && eventDigest(r.score) === PRIMARY_FP[id] && per === '120',
    );
  }

  const shorter76 = runGoldenPathOnce(76017, songOpts('wayne_shorter', { bpm: 76 }));
  const per76 = shorter76.xml?.match(/<per-minute>([^<]+)<\/per-minute>/)?.[1];
  const sound76 = shorter76.xml?.match(/<sound tempo="([^"]+)"/)?.[1];
  t('Song Mode bpm 76 prints in MusicXML', per76 === '76' && sound76 === '76');

  const duo76 = runGoldenPathOnce(76017, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    styleStack: { primary: 'triad_pairs', weights: { primary: 1 } },
    bpm: 76,
    scoreTitle: 'duo-76',
  });
  t(
    'Duo bpm 76 prints in MusicXML',
    duo76.xml?.includes('<per-minute>76</per-minute>') === true && duo76.xml?.includes('<sound tempo="76"/>') === true,
  );

  const pairs: Array<[string, string, 'blend' | 'unsupported']> = [
    ['wayne_shorter', 'bacharach', 'blend'],
    ['wayne_shorter', 'debussy', 'blend'],
    ['debussy', 'ravel', 'unsupported'],
    ['gil_evans', 'wayne_shorter', 'blend'],
    ['pat_metheny', 'joni_mitchell', 'blend'],
  ];

  for (const [primary, secondary, kind] of pairs) {
    const a = primaryScore.get(primary)!;
    const b = kind === 'blend' ? primaryScore.get(secondary)! : undefined;
    const mid = runGoldenPathOnce(
      76017,
      songOpts(primary, { secondarySongwriterStyle: secondary, songwriterBlendWeight: 0.35, scoreTitle: `${primary}+${secondary}` }),
    );
    const zero = runGoldenPathOnce(
      76017,
      songOpts(primary, { secondarySongwriterStyle: secondary, songwriterBlendWeight: 0, scoreTitle: primary }),
    );
    const again = runGoldenPathOnce(
      76017,
      songOpts(primary, { secondarySongwriterStyle: secondary, songwriterBlendWeight: 0.35, scoreTitle: `${primary}+${secondary}` }),
    );
    const status = mid.context?.generationMetadata?.composerProfileBlend?.status;
    t(`${primary}+${secondary} deterministic`, eventDigest(mid.score) === eventDigest(again.score) && chordsOf(mid.score) === chordsOf(again.score));
    t(`${primary}+${secondary} weight 0 matches primary-only`, eventDigest(zero.score) === eventDigest(a.score));
    if (kind === 'unsupported') {
      t(
        `${primary}+${secondary} unsupported and matches primary`,
        status === 'unsupported_secondary' &&
          eventDigest(mid.score) === eventDigest(a.score) &&
          (mid.context?.generationMetadata?.composerProfileBlend?.reason ?? '').includes('UNSUPPORTED'),
      );
      continue;
    }
    const one = runGoldenPathOnce(
      76017,
      songOpts(primary, { secondarySongwriterStyle: secondary, songwriterBlendWeight: 1, scoreTitle: secondary }),
    );
    const midChords = chordsOf(mid.score);
    const guitarDiffers = guitarNotes(mid.score) !== guitarNotes(a.score) && guitarNotes(mid.score) !== guitarNotes(b!.score);
    const chordDiffers = midChords !== chordsOf(a.score) && midChords !== chordsOf(b!.score);
    const pitchesDiffer =
      guitarNotes(mid.score) !== guitarNotes(a.score) && guitarNotes(mid.score) !== guitarNotes(b!.score);
    t(
      `${primary}+${secondary} weight 0.35 differs from both`,
      status === 'phrase_block' && (chordDiffers || pitchesDiffer) && (chordDiffers || guitarDiffers),
    );
    t(
      `${primary}+${secondary} weight 1 matches secondary-only`,
      eventDigest(one.score) === eventDigest(b!.score) &&
        one.context?.generationMetadata?.composerProfileBlend?.status === 'secondary_authoritative',
    );
    const block = mid.context?.generationMetadata?.composerProfileBlend?.secondaryBars ?? [];
    const contiguous =
      block.length >= 4 && block.every((bar, i) => i === 0 || bar === block[i - 1]! + 1);
    t(`${primary}+${secondary} secondary region is one phrase`, contiguous);
  }

  const metheny = runGoldenPathOnce(76017, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    styleStack: { primary: 'metheny', weights: { primary: 1 } },
    harmonicVoice: 'pat_metheny',
    creativeControlLevel: 'stable',
    chromaticStrength: 'prominent',
    endingContext: 'open_idiom',
    keySignatureMode: 'none',
    scoreTitle: 'duo-metheny',
  });
  const bass = metheny.score?.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const fps = bass?.measures.map((m) => rhythmFingerprint(m)) ?? [];
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < fps.length; i++) {
    if (fps[i] && fps[i] === fps[i - 1] && fps[i]!.length > 0) run += 1;
    else run = 1;
    maxRun = Math.max(maxRun, run);
  }
  const gate = metheny.score ? validateBassIdentity(metheny.score) : { valid: false, errors: ['no score'] };
  const rhythmError = gate.errors.some((e) => e.includes('rhythmic cell repeated'));
  const chordField = chordsOf(metheny.score);
  t(
    'Duo Metheny harmonic voice breaks the frozen bass cell and keeps the colour field',
    maxRun < 4 &&
      !rhythmError &&
      chordField.startsWith('Dmin9|Dmin9|Cmaj9|Cmaj9') &&
      !chordField.startsWith('Dmin9|G13|Cmaj9|A7alt'),
  );

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v34-stage-d-'));
  const rejected = generateComposition(
    {
      seed: 76017,
      presetId: 'guitar_bass_duo',
      totalBars: 8,
      primarySongwriterStyle: 'wayne_shorter',
      secondarySongwriterStyle: 'bacharach',
      title: 'duo-reject',
    },
    tmp,
  );
  const wroteXml = fs.readdirSync(tmp).some((name) => name.endsWith('.musicxml'));
  t(
    'Duo rejects songwriter profiles and writes no MusicXML',
    rejected.success === false &&
      (rejected.error ?? '').includes('not applied') &&
      (rejected.error ?? '').includes('Song Mode') &&
      !wroteXml,
  );
  fs.rmSync(tmp, { recursive: true, force: true });

  return out;
}

if (require.main === module) {
  const rows = runV34StageDProfileBlendTests();
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
  const failed = rows.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}
