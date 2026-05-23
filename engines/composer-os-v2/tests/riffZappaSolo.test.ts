import * as fs from 'fs';
import * as path from 'path';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import {
  compileReceiptsToRiffProfilePatch,
  FRANK_ZAPPA_RESEARCH_RECEIPT_IDS,
} from '../core/riff-generator/riffReceiptCompiler';
import {
  isOnZappaCellBoundary,
  pitchUsesSlonimskyOutsideChordTones,
  resolveEffectiveZappaSoloProfile,
  riffSoloFromZappaEngine,
  zappa78CellBoundariesIn4_4,
} from '../core/riff-generator/riffSoloZappaAdapter';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import { isRiffGeneratorVrbId, resolveRiffFamilyTag } from '../core/riff-generator/riffVrbRegistry';
import type { RiffSoloGeneratorProfile } from '../core/composer/riffProfileTypes';
import { confirmRiffPartInstrumentAssignment, resolveRiffAppSoloEnabled } from '../app-api/riffGeneratorApp';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import {
  RIFF_GUITAR_PART_INSTRUMENT_TAG,
  RIFF_SOLO_PART_INSTRUMENT_TAG,
  riffPartInstrumentTagsFromScore,
  scorePartInstrumentTag,
} from '../core/riff-generator/riffMultiVoiceTypes';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import {
  hasSoloGeneratorProfile,
  riffSoloToggleVisible,
} from '../ui/riffGeneratorUi';

function testFrankZappaRiffRegistry(): boolean {
  if (!isRiffGeneratorVrbId('frank_zappa')) return false;
  const b = getVoiceRuleBundle('frank_zappa');
  if (b.family !== 'rock' || b.sigma !== 29) return false;
  if (!b.riffProfile?.soloGeneratorProfile?.enabled) return false;
  return resolveRiffFamilyTag('zappa') === 'rock' && resolveRiffFamilyTag('mothers') === 'rock';
}

function testZappaResearchReceiptCompile(): boolean {
  const patch = compileReceiptsToRiffProfilePatch('frank_zappa');
  if (!patch.soloGeneratorProfile?.enabled) return false;
  for (const id of FRANK_ZAPPA_RESEARCH_RECEIPT_IDS) {
    const receipts = getVoiceRuleBundle('frank_zappa').orchestrationPolicy?.fingerprintReceipts ?? [];
    if (!receipts.some((line) => line.includes(id))) return false;
  }
  return true;
}

function testSoloPartWhenEnabled(): boolean {
  const profile = resolveRiffGeneratorProfile({
    vrbId: 'frank_zappa',
    style: 'neutral',
    grid: 'eighth',
    density: 'medium',
  });
  const off = buildRiffScoreModel({
    seed: 424242,
    bars: 4,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: false,
    vrbId: 'frank_zappa',
    chordSymbols: ['E7', 'A7', 'D7', 'G7'],
    riffProfile: profile,
  });
  const on = buildRiffScoreModel({
    seed: 424242,
    bars: 4,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: true,
    vrbId: 'frank_zappa',
    chordSymbols: ['E7', 'A7', 'D7', 'G7'],
    riffProfile: profile,
  });
  const soloOff = off.score.parts.find((p) => p.id === 'solo');
  const soloOn = on.score.parts.find((p) => p.id === 'solo');
  if (soloOff) return false;
  if (!soloOn) return false;
  const notes = soloOn.measures.flatMap((m) => m.events.filter((e) => e.kind === 'note'));
  return notes.length >= 4 && on.generationMetadata.multiVoiceBadges?.solo === true;
}

function zappaSoloProfile(): RiffSoloGeneratorProfile {
  const p = getVoiceRuleBundle('frank_zappa').riffProfile?.soloGeneratorProfile;
  if (!p?.enabled) throw new Error('frank_zappa soloGeneratorProfile missing');
  return p;
}

function testZappaAdapterNonEmptyEightBars(): boolean {
  const profile = zappaSoloProfile();
  const seed = 42;
  const chord = 'Am7';
  let total = 0;
  for (let b = 0; b < 8; b++) {
    const line = riffSoloFromZappaEngine(b, chord, profile, seed);
    if (line.length === 0) return false;
    total += line.length;
  }
  return total >= 8;
}

function testZappaAdapterCellSnapPerBar(): boolean {
  const profile = zappaSoloProfile();
  const seed = 42;
  const chord = 'Am7';
  for (let b = 0; b < 8; b++) {
    const line = riffSoloFromZappaEngine(b, chord, profile, seed);
    const bounds = zappa78CellBoundariesIn4_4(profile, b, seed);
    const snapped = line.some((e) => isOnZappaCellBoundary(e.startBeat, bounds));
    if (!snapped) return false;
  }
  return true;
}

function ferocityProfile(): RiffSoloGeneratorProfile {
  return { ...zappaSoloProfile(), styleMode: 'bluesrockFerocious' };
}

function testZappaFerocityChromaticBudget(): boolean {
  const resolved = resolveEffectiveZappaSoloProfile(ferocityProfile());
  return Math.abs(resolved.chromaticBudget - 0.3) < 1e-6;
}

function testZappaFerocityBurstBarDensity(): boolean {
  const profile = ferocityProfile();
  const seed = 42;
  const chord = 'Am7';
  for (let b = 0; b < 8; b++) {
    const line = riffSoloFromZappaEngine(b, chord, profile, seed);
    if (line.length >= 12) return true;
  }
  return false;
}

function testZappaFerocityFeedbackProxyOnPhraseEnd(): boolean {
  const profile = ferocityProfile();
  const seed = 42;
  const chord = 'Am7';
  const phraseBars = profile.phraseBars ?? 4;
  const endBar = phraseBars - 1;
  const line = riffSoloFromZappaEngine(endBar, chord, profile, seed);
  if (line.length === 0) return false;
  return line.some((e) => e.feedbackProxy === true);
}

function testFrankzappaFerocityGoldenFixture(): boolean {
  const goldenPath = path.join(__dirname, 'riffGolden', 'frankzappa.golden.json');
  const defaultPath = path.join(__dirname, 'riffGolden', 'frankzappa-default.golden.json');
  if (!fs.existsSync(goldenPath) || !fs.existsSync(defaultPath)) return false;
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8')) as {
    seed: number;
    bars: number;
    chord: string;
    styleMode: string;
    chromaticBudget: number;
    minBurstBarNotes: number;
    minFeedbackProxyPhraseEnds: number;
  };
  if (golden.seed !== 42 || golden.bars !== 8 || golden.chord !== 'Am7') return false;
  if (golden.styleMode !== 'bluesrockFerocious') return false;
  const profile = ferocityProfile();
  const seed = golden.seed;
  const chord = golden.chord;
  let burstOk = false;
  let feedbackEnds = 0;
  for (let b = 0; b < golden.bars; b++) {
    const line = riffSoloFromZappaEngine(b, chord, profile, seed);
    if (line.length >= golden.minBurstBarNotes) burstOk = true;
    if (line.some((e) => e.feedbackProxy)) feedbackEnds++;
    for (const e of line) {
      if (e.isRest === true) return false;
    }
  }
  return (
    Math.abs(resolveEffectiveZappaSoloProfile(profile).chromaticBudget - golden.chromaticBudget) <
      1e-6 &&
    burstOk &&
    feedbackEnds >= golden.minFeedbackProxyPhraseEnds
  );
}

function testZappaFerocityNoRestFlags(): boolean {
  const profile = ferocityProfile();
  const seed = 42;
  const chord = 'Am7';
  for (let b = 0; b < 8; b++) {
    for (const e of riffSoloFromZappaEngine(b, chord, profile, seed)) {
      if (e.isRest === true) return false;
    }
  }
  return true;
}

function testZappaAdapterSlonimskyPitchPool(): boolean {
  const profile = zappaSoloProfile();
  const seed = 42;
  const chord = 'Am7';
  let outside = 0;
  let total = 0;
  for (let b = 0; b < 8; b++) {
    for (const e of riffSoloFromZappaEngine(b, chord, profile, seed)) {
      total++;
      if (pitchUsesSlonimskyOutsideChordTones(chord, e.pitch)) outside++;
    }
  }
  return total > 0 && outside > 0;
}

function testFrankZappaSoloAlwaysEnabledInApp(): boolean {
  if (!resolveRiffAppSoloEnabled('frank_zappa', false)) return false;
  if (!resolveRiffAppSoloEnabled('frank_zappa', undefined)) return false;
  if (resolveRiffAppSoloEnabled('iommi', false)) return false;
  if (!resolveRiffAppSoloEnabled('iommi', true)) return false;
  return true;
}

function testFrankZappaSoloToggleHidden(): boolean {
  return hasSoloGeneratorProfile('frank_zappa') && !riffSoloToggleVisible('frank_zappa');
}

function testVrbsWithoutSoloProfileHideToggle(): boolean {
  for (const id of ['iommi', 'hendrix', 'sly_stone'] as const) {
    if (hasSoloGeneratorProfile(id)) return false;
    if (riffSoloToggleVisible(id)) return false;
  }
  return true;
}

function testZappaRiffPartInstrumentTags(): boolean {
  const profile = resolveRiffGeneratorProfile({
    vrbId: 'frank_zappa',
    style: 'neutral',
    grid: 'eighth',
    density: 'medium',
  });
  const built = buildRiffScoreModel({
    seed: 42,
    bars: 4,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: true,
    vrbId: 'frank_zappa',
    chordSymbols: ['Am7'],
    riffProfile: profile,
    bpm: 100,
  });
  const tags = riffPartInstrumentTagsFromScore(built.score);
  if (!tags || tags.guitar !== RIFF_GUITAR_PART_INSTRUMENT_TAG) return false;
  if (tags.solo !== RIFF_SOLO_PART_INSTRUMENT_TAG) return false;
  const g = built.score.parts.find((p) => p.id === 'guitar');
  const s = built.score.parts.find((p) => p.id === 'solo');
  if (!g || !s) return false;
  if (scorePartInstrumentTag(g) !== RIFF_GUITAR_PART_INSTRUMENT_TAG) return false;
  if (scorePartInstrumentTag(s) !== RIFF_SOLO_PART_INSTRUMENT_TAG) return false;
  for (const p of built.score.parts) {
    if (p.id === 'horns' || p.id === 'bass') {
      if (scorePartInstrumentTag(p) != null) return false;
    }
  }
  const confirm = confirmRiffPartInstrumentAssignment(built.score);
  return confirm.ok && confirm.soloTag === RIFF_SOLO_PART_INSTRUMENT_TAG;
}

function testZappaRiffMusicXmlInstrumentNames(): boolean {
  const gen = runRiffGenerator(42, {
    vrbId: 'frank_zappa',
    bars: 4,
    density: 'medium',
    style: 'neutral',
    grid: 'eighth',
    lineMode: 'single_line',
    bassEnabled: false,
    soloEnabled: true,
    bpm: 100,
    chordSymbols: ['Am7', 'D7', 'G7', 'C7'],
  });
  if (!gen.success || !gen.xml) return false;
  const xml = gen.xml;
  const guitarBlock = xml.match(/<score-part id="guitar">[\s\S]*?<\/score-part>/)?.[0] ?? '';
  const soloBlock = xml.match(/<score-part id="solo">[\s\S]*?<\/score-part>/)?.[0] ?? '';
  if (!guitarBlock || !soloBlock) return false;
  if (!xml.includes('<part-name>Clean Electric Guitar</part-name>')) return false;
  if (!xml.includes('<part-name>Electric Guitar Solo</part-name>')) return false;
  if (!guitarBlock.includes('<midi-program>28</midi-program>')) return false;
  if (!soloBlock.includes('<midi-program>31</midi-program>')) return false;
  if (!guitarBlock.includes('<instrument-name>Electric Guitar</instrument-name>')) return false;
  if (!soloBlock.includes('<instrument-name>Electric Guitar</instrument-name>')) return false;
  if (guitarBlock.includes('<sound id=')) return false;
  if (soloBlock.includes('<sound id=')) return false;
  if (!guitarBlock.includes('strings.guitar.electric')) return false;
  if (!soloBlock.includes('strings.guitar.electric.distortion')) return false;
  if (!guitarBlock.includes('<score-instrument id="P1-I1">')) return false;
  if (!soloBlock.includes('<score-instrument id="P2-I1">')) return false;
  if (!guitarBlock.includes('<midi-channel>1</midi-channel>')) return false;
  if (!soloBlock.includes('<midi-channel>2</midi-channel>')) return false;
  const exp = exportScoreModelToMusicXml(gen.score);
  return exp.success === true && !!exp.xml;
}

export function runRiffZappaSoloTests(): { name: string; ok: boolean }[] {
  return [
    ['Riff Zappa — frank_zappa VRB registry + solo profile', testFrankZappaRiffRegistry],
    ['Riff Zappa — research receipts compile to soloGeneratorProfile', testZappaResearchReceiptCompile],
    ['Riff Zappa — solo MIDI part when riffSolo enabled', testSoloPartWhenEnabled],
    ['Riff Zappa — adapter non-empty SoloEvent[] seed 42 / 8 bars / Am7', testZappaAdapterNonEmptyEightBars],
    ['Riff Zappa — ≥1 event per bar on 7/8 cell boundary', testZappaAdapterCellSnapPerBar],
    ['Riff Zappa — pitch pool uses Slonimsky outside chord tones', testZappaAdapterSlonimskyPitchPool],
    ['Riff Zappa — bluesrockFerocious chromaticBudget 0.30', testZappaFerocityChromaticBudget],
    ['Riff Zappa — bluesrockFerocious burst bar ≥12 notes seed 42 Am7', testZappaFerocityBurstBarDensity],
    ['Riff Zappa — bluesrockFerocious phrase-end feedbackProxy', testZappaFerocityFeedbackProxyOnPhraseEnd],
    ['Riff Zappa — bluesrockFerocious no isRest events', testZappaFerocityNoRestFlags],
    ['Riff Zappa — frankzappa.golden.json seed 42 / 8 bars / Am7 ferocity', testFrankzappaFerocityGoldenFixture],
    ['Riff Zappa — app forces soloEnabled for frank_zappa', testFrankZappaSoloAlwaysEnabledInApp],
    ['Riff Zappa — frank_zappa: solo toggle hidden (always on)', testFrankZappaSoloToggleHidden],
    ['Riff Zappa — iommi/hendrix/sly_stone: no solo profile, toggle hidden', testVrbsWithoutSoloProfileHideToggle],
    ['Riff Zappa — solo part instrument = overdrivenGuitar', testZappaRiffPartInstrumentTags],
    ['Riff Zappa — guitar cleanGuitar + solo in MusicXML', testZappaRiffMusicXmlInstrumentNames],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
