/**
 * Song Mode — Frank Zappa blues-rock ferocity via {@link buildSoloPartForScore} (riff/Zappa adapter).
 * Duo / riff-generator paths unchanged; gated on `songModeHookFirstIdentity`.
 */

import type { CompositionContext } from '../compositionContext';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { getChordForBar } from '../harmony/harmonyResolution';
import { buildSoloPartForScore, type RiffSoloNote } from '../riff-generator/riffSoloBuilder';
import type { SoloEvent } from '../riff-generator/riffSoloZappaAdapter';
import { resolveEffectiveZappaSoloProfile } from '../riff-generator/riffSoloZappaAdapter';
import { zappaRiffSoloControlsFrom } from '../riff-generator/zappaRiffSoloParams';
import { generateZappaSolo } from '../solo/zappasoloEngine';
import type { SoloLine, SoloNote, SoloPhrase, ZappaSoloReceiptFlags } from '../solo/soloTypes';
import { resolveZappaStyleMode } from './frankZappaSlice';

function noteDensityRangeFromSoloDensity(density?: number): { min: number; max: number } {
  if (density == null || !Number.isFinite(density)) return { min: 12, max: 24 };
  if (density >= 0.85) return { min: 12, max: 24 };
  if (density >= 0.5) return { min: 8, max: 18 };
  return { min: 4, max: 10 };
}

function chordsForSongModeZappa(context: CompositionContext): string[] {
  const tb = context.form.totalBars;
  const eff = context.generationMetadata?.frankZappaEffectiveHarmonyBars;
  if (eff && eff.length === tb) return [...eff];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) out.push(getChordForBar(b, context));
  return out;
}

function riffSoloBarsToSoloLine(bars: RiffSoloNote[][]): SoloLine {
  const allNotes: SoloNote[] = [];
  const phrases: SoloPhrase[] = [];
  const receipt: ZappaSoloReceiptFlags = {
    hasSeptuplet: false,
    hasQuintuplet: false,
    hasDescendingMinorSixth: false,
    hasTetrachord0137: false,
  };

  for (let b = 0; b < bars.length; b++) {
    const barIndex = b + 1;
    const barEvents = bars[b] ?? [];
    const phraseNotes: SoloNote[] = [];
    for (const ev of barEvents) {
      const e = ev as SoloEvent;
      phraseNotes.push({
        midi: ev.pitch,
        startBeat: ev.startBeat,
        durationBeats: ev.duration,
        barIndex,
        tupletRole: 'plain',
        ...(e.feedbackProxy ? { marker: 'density_minimum_pad' as const } : {}),
      });
    }
    phraseNotes.sort((a, c) => a.startBeat - c.startBeat);
    allNotes.push(...phraseNotes);
    phrases.push({ barRange: [barIndex, barIndex], notes: phraseNotes });
  }

  return {
    phrases,
    allNotes,
    receipt,
    digest: 'song-mode:buildSoloPartForScore:bluesrockFerocious',
  };
}

/** Song Mode ferocity — `zappaStyleMode` + `zappaSoloOptions.density` → riff solo builder. */
export function buildSongModeZappaSoloViaRiffBuilder(context: CompositionContext): SoloLine | null {
  const md = context.generationMetadata;
  if (!md || md.songModeHookFirstIdentity !== true) return null;
  if (md.songwriterStyleId !== 'frank_zappa') return null;
  if (resolveZappaStyleMode(md) !== 'bluesrockFerocious') return null;

  const base = getVoiceRuleBundle('frank_zappa').riffProfile?.soloGeneratorProfile;
  if (!base?.enabled) return null;

  const controls = zappaRiffSoloControlsFrom(md);
  const densityNum = md.zappaSoloOptions?.density;
  const profile = resolveEffectiveZappaSoloProfile(
    {
      ...base,
      noteDensityRange: noteDensityRangeFromSoloDensity(densityNum),
    },
    controls
  );

  const chords = chordsForSongModeZappa(context);
  const tb = context.form.totalBars;
  const soloBars = buildSoloPartForScore(profile, true, tb, chords, context.seed, 'frank_zappa', controls);
  if (!soloBars?.length) return null;
  return riffSoloBarsToSoloLine(soloBars);
}

/** Frank Zappa solo — Song Mode ferocity uses riff {@link buildSoloPartForScore}; else legacy engine. */
export function resolveFrankZappaSoloLineForContext(context: CompositionContext): SoloLine {
  const riffLine = buildSongModeZappaSoloViaRiffBuilder(context);
  if (riffLine && riffLine.allNotes.length > 0) return riffLine;
  return generateZappaSolo(context, context.generationMetadata?.zappaSoloOptions);
}
