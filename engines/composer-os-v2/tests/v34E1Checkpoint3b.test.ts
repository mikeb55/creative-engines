/**
 * V3.4 E1 checkpoint 3B — Pärt M/T notes, Debussy collection membership, Messiaen mode membership.
 * Musical evidence. Not an artistic approval.
 */

import { runGoldenPathOnce, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { createHash } from 'node:crypto';

type Row = { name: string; ok: boolean };

const BARRY_OFF = '4547be8eaedc705f0b94df8e46af275281515af47410b153b22dbfaf3c2cc2df';

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
            return 'x';
          })
          .join(','),
      )
      .join(';');
    const chordLine = part.measures.map((measure) => measure.chord ?? '').join('|');
    return `${part.instrumentIdentity}\n${chordLine}\n${notes}`;
  });
  return createHash('sha256').update(parts.join('\n---\n')).digest('hex');
}

function rhythmSig(score: ScoreModel | undefined, instrument: string): string {
  const part = score?.parts.find((item) => item.instrumentIdentity === instrument);
  return (part?.measures ?? [])
    .map((measure) =>
      measure.events
        .filter((event) => event.kind === 'note')
        .map((event) => `${event.startBeat}:${event.duration}:v${event.voice ?? 1}`)
        .join(','),
    )
    .join(';');
}

function chords(score: ScoreModel | undefined): string[] {
  const part = score?.parts.find((item) => item.instrumentIdentity === 'clean_electric_guitar');
  return (part?.measures ?? []).map((measure) => measure.chord ?? '');
}

function pc(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function rootPc(symbol: string): number {
  const match = symbol.match(/^([A-G](?:#|b)?)/);
  const name = match?.[1] ?? 'C';
  const letter = 'CDEFGAB'.indexOf(name[0]!.toUpperCase());
  const base = [0, 2, 4, 5, 7, 9, 11][letter] ?? 0;
  if (name[1] === '#') return (base + 1) % 12;
  if (name[1] === 'b') return (base + 11) % 12;
  return base;
}

export function runV34E1Checkpoint3bTests(): Row[] {
  const out: Row[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });

  const barry = runGoldenPathOnce(76017, songOpts('john_barry'));
  t('checkpoint 1 Barry fingerprint still holds', barry.success === true && eventDigest(barry.score) === BARRY_OFF);

  for (const seed of [76017, 76018]) {
    const run = runGoldenPathOnce(seed, songOpts('arvo_part'));
    const again = runGoldenPathOnce(seed, songOpts('arvo_part'));
    t(
      `Pärt seed ${seed} stays deterministic and is blocked by Song Mode motif and bass-identity gates`,
      run.success === false &&
        eventDigest(run.score) === eventDigest(again.score) &&
        run.errors.some((error) => error.includes('motif-mapped notes')) &&
        run.errors.some((error) => error.includes('Bass identity')),
    );
  }

  for (const id of ['debussy', 'messiaen'] as const) {
    const off = runGoldenPathOnce(76017, songOpts(id));
    const offAgain = runGoldenPathOnce(76017, songOpts(id));
    const on = runGoldenPathOnce(76017, songOpts(id, { e1VoiceRelations: true }));
    const onB = runGoldenPathOnce(76018, songOpts(id, { e1VoiceRelations: true }));
    t(`${id} flag off is deterministic and does not record a receipt`, off.success === true && eventDigest(off.score) === eventDigest(offAgain.score) && off.context.generationMetadata.e1VoiceRelationsReceipt == null);
    t(
      `${id} flag on succeeds, keeps rhythm and symbols, and changes pitches`,
      on.success === true &&
        onB.success === true &&
        on.strictBarMathPassed === true &&
        !!on.xml &&
        validateMusicXmlSchema(on.xml).valid &&
        rhythmSig(off.score, 'clean_electric_guitar') === rhythmSig(on.score, 'clean_electric_guitar') &&
        chords(off.score).join('|') === chords(on.score).join('|') &&
        eventDigest(on.score) !== eventDigest(off.score) &&
        eventDigest(on.score) !== eventDigest(onB.score),
    );
  }

  const debussyOn = runGoldenPathOnce(76017, songOpts('debussy', { e1VoiceRelations: true }));
  const debussyReceipts = debussyOn.context.generationMetadata.debussyDeviceReceipts ?? [];
  const debussyBars = debussyOn.context.generationMetadata.debussyEffectiveHarmonyBars ?? [];
  const debussyGuitar = debussyOn.score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  let debussyMember = true;
  let debussyChecked = 0;
  for (const measure of debussyGuitar?.measures ?? []) {
    if (measure.index === 1 || measure.index === 25) continue;
    const whole = debussyReceipts.includes(`db:whole_tone@bar${measure.index}`);
    const pent = debussyReceipts.includes(`db:pentatonic@bar${measure.index}`);
    if (!whole && !pent) continue;
    const root = rootPc(debussyBars[measure.index - 1] ?? measure.chord ?? 'C');
    const set = pent
      ? [0, 2, 4, 7, 9].map((step) => (root + step) % 12)
      : root % 2 === 0
        ? [0, 2, 4, 6, 8, 10]
        : [1, 3, 5, 7, 9, 11];
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      debussyChecked += 1;
      if (!set.includes(pc(event.pitch))) debussyMember = false;
    }
  }
  t(
    'Debussy whole-tone and pentatonic bars keep guitar notes inside the collection',
    debussyOn.context.generationMetadata.e1VoiceRelationsReceipt?.status === 'applied' &&
      debussyChecked > 0 &&
      debussyMember,
  );

  const blendOff = runGoldenPathOnce(76017, songOpts('debussy', {
    secondarySongwriterStyle: 'wayne_shorter',
    songwriterBlendWeight: 0.35,
  }));
  const blendOn = runGoldenPathOnce(76017, songOpts('debussy', {
    secondarySongwriterStyle: 'wayne_shorter',
    songwriterBlendWeight: 0.35,
    e1VoiceRelations: true,
  }));
  t(
    'Debussy Stage D blend is unchanged when voice relations are requested',
    blendOff.success === true &&
      blendOn.success === true &&
      eventDigest(blendOff.score) === eventDigest(blendOn.score) &&
      blendOn.context.generationMetadata.e1VoiceRelationsReceipt?.status === 'refused_blend',
  );

  const messiaen = runGoldenPathOnce(76017, songOpts('messiaen', { e1VoiceRelations: true }));
  const modeKey = String(messiaen.context.generationMetadata.activeMode ?? '');
  const modePcs = messiaen.context.generationMetadata.e1VoiceRelationsReceipt?.pitchClasses ?? [];
  let messiaenMember = modePcs.length > 0 && modeKey.startsWith('mode');
  let messiaenChecked = 0;
  for (const instrument of ['clean_electric_guitar', 'acoustic_upright_bass']) {
    const part = messiaen.score.parts.find((item) => item.instrumentIdentity === instrument);
    for (const measure of part?.measures ?? []) {
      if (measure.index === 1 || measure.index === 25) continue;
      for (const event of measure.events) {
        if (event.kind !== 'note') continue;
        messiaenChecked += 1;
        if (!modePcs.includes(pc(event.pitch))) messiaenMember = false;
      }
    }
  }
  const messiaenB = runGoldenPathOnce(76018, songOpts('messiaen', { e1VoiceRelations: true }));
  t(
    'Messiaen instrumental notes stay in the selected transposition',
    messiaen.success === true &&
      messiaenMember &&
      messiaenChecked > 0 &&
      modeKey !== String(messiaenB.context.generationMetadata.activeMode ?? '') &&
      (messiaenB.context.generationMetadata.e1VoiceRelationsReceipt?.pitchClasses ?? []).join(',') !== modePcs.join(','),
  );

  for (const id of ['frank_zappa', 'fripp_king_crimson', 'reich_glass', 'bartok', 'billy_strayhorn'] as const) {
    const off = runGoldenPathOnce(76017, songOpts(id));
    const on = runGoldenPathOnce(76017, songOpts(id, { e1VoiceRelations: true }));
    t(`${id} voice-relations flag does not change notes`, off.success === true && on.success === true && eventDigest(off.score) === eventDigest(on.score));
  }

  return out;
}
