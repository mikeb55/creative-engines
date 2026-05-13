/**
 * Phase 2+3a additive harness checks (full tier only — keeps smoke allowlist unchanged).
 * Does not duplicate `voiceRuleBundle.test.ts` smoke suite.
 */

import { buildHarmonicSceneStubs } from '../core/composer/harmonicScene';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';

export function runVoiceRuleBundleHarnessAdditiveTests(): { name: string; ok: boolean }[] {
  const scenes = buildHarmonicSceneStubs({
    sections: [{ label: 'A', startBar: 1, length: 8 }],
    totalBars: 8,
  });
  const okScene =
    scenes.length === 1 && scenes[0]!.barRange[0] === 1 && scenes[0]!.barRange[1] === 8 && scenes[0]!.tensionLevel >= 0;

  const okNeutral = getVoiceRuleBundle('unknown_writer_phase23a').voiceId === 'neutral';

  const bartok = getVoiceRuleBundle('bartok');
  const okBartok =
    bartok.voiceId === 'bartok' &&
    bartok.rhythmPolicy.antiMetric === true &&
    bartok.harmonicRhythm.minChordDurationBars === 0 &&
    (bartok.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(bartok.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BK_PITCH_01'))) &&
    Boolean(bartok.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BK_AXIS_01'))) &&
    Boolean(bartok.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BK_WORK_04')));

  const ravel = getVoiceRuleBundle('ravel');
  const okRavel =
    ravel.voiceId === 'ravel' &&
    ravel.formPolicy.narrativeArc === 'suite' &&
    ravel.rhythmPolicy.antiMetric === false &&
    (ravel.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(ravel.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RV_SCALE_01'))) &&
    Boolean(ravel.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RV_PLANING_01'))) &&
    Boolean(ravel.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RV_WORK_04')));

  const dutilleux = getVoiceRuleBundle('dutilleux');
  const okDutilleux =
    dutilleux.voiceId === 'dutilleux' &&
    dutilleux.rhythmPolicy.antiMetric === true &&
    dutilleux.voicingPolicy.minSpreadSemitones >= 12 &&
    (dutilleux.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(dutilleux.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DX_HC_01'))) &&
    Boolean(dutilleux.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DX_MEM_01'))) &&
    Boolean(dutilleux.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DX_WORK_07')));

  const ge = getVoiceRuleBundle('gil_evans');
  const okGil =
    ge.voiceId === 'gil_evans' &&
    ge.repairPolicy.resolveParallels === true &&
    ge.repairPolicy.maxVoiceOverlap >= 0 &&
    (ge.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(ge.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GE_HORN_01'))) &&
    Boolean(ge.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GE_TUBA_01'))) &&
    Boolean(ge.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GE_REED_02')));

  const duke = getVoiceRuleBundle('duke_ellington');
  const okDuke =
    duke.voiceId === 'duke_ellington' &&
    duke.harmonicRhythm.maxChordDurationBars >= 4 &&
    duke.harmonicRhythm.allowMidBarChange === true &&
    (duke.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(duke.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DE_VOICING_01'))) &&
    Boolean(duke.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DE_JUNGLE_01'))) &&
    Boolean(duke.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DE_WORK_08')));

  const ws = getVoiceRuleBundle('wayne_shorter');
  const okWsFp =
    ws.voiceId === 'wayne_shorter' && (ws.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const ms = getVoiceRuleBundle('maria_schneider');
  const okMsFp =
    ms.voiceId === 'maria_schneider' &&
    ms.harmonicRhythm.maxChordDurationBars >= 8 &&
    ms.voicingPolicy.clusterSizeNotes[0] >= 4 &&
    ms.voicingPolicy.clusterSizeNotes[1] >= 7 &&
    (ms.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(ms.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('MS_HARM_01'))) &&
    Boolean(ms.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('MS_FORM_05'))) &&
    Boolean(ms.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('MS_DIFF_03')));

  const radiohead = getVoiceRuleBundle('radiohead');
  const okRadiohead =
    radiohead.voiceId === 'radiohead' &&
    radiohead.rhythmPolicy.antiMetric === true &&
    (radiohead.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(radiohead.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RH_HARM_01'))) &&
    Boolean(radiohead.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RH_RHY_01'))) &&
    Boolean(radiohead.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RH_WORK_06')));

  const monk = getVoiceRuleBundle('thelonious_monk');
  const okMonk =
    monk.voiceId === 'thelonious_monk' &&
    monk.rhythmPolicy.antiMetric === true &&
    monk.formPolicy.narrativeArc === 'blues-backbone' &&
    (monk.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(monk.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TM_HARM_01'))) &&
    Boolean(monk.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TM_VOICING_01'))) &&
    Boolean(monk.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TM_DIFF_03')));

  const billEvans = getVoiceRuleBundle('bill_evans');
  const okBillEvans =
    billEvans.voiceId === 'bill_evans' &&
    billEvans.bassPolicy.role === 'melodic-counterline' &&
    billEvans.rhythmPolicy.antiMetric === true &&
    (billEvans.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(billEvans.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BE_VOICING_01'))) &&
    Boolean(billEvans.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BE_VL_01'))) &&
    Boolean(billEvans.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BE_DIFF_03')));

  const herbie = getVoiceRuleBundle('herbie_hancock');
  const okHerbie =
    herbie.voiceId === 'herbie_hancock' &&
    herbie.melodicPolicy.contour === 'pentatonic-cell' &&
    herbie.rhythmPolicy.antiMetric === true &&
    (herbie.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(herbie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('HH_QUARTAL_01'))) &&
    Boolean(herbie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('HH_FUNK_01'))) &&
    Boolean(herbie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('HH_DIFF_03')));

  const berg = getVoiceRuleBundle('berg');
  const okBerg =
    berg.voiceId === 'berg' &&
    berg.bergVoiceLeading?.rowClarityLevel === 'balanced' &&
    (berg.bergVoiceLeading?.contrapuntalStrandTarget ?? 0) >= 4 &&
    (berg.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 15 &&
    Boolean(berg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BG_ROW_01'))) &&
    Boolean(berg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BG_DIFF_01')));

  const threadgill = getVoiceRuleBundle('henry_threadgill');
  const okThreadgill =
    threadgill.voiceId === 'henry_threadgill' &&
    threadgill.bassPolicy.role === 'chromatic-first' &&
    threadgill.rhythmPolicy.antiMetric === true &&
    (threadgill.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 20;

  const nestico = getVoiceRuleBundle('sammy_nestico');
  const okNestico =
    nestico.voiceId === 'sammy_nestico' &&
    (nestico.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const brook = getVoiceRuleBundle('bob_brookmeyer');
  const okBrook =
    brook.voiceId === 'bob_brookmeyer' &&
    brook.lineFirstHierarchy === true &&
    brook.harmonicRhythm.minChordDurationBars >= 2 &&
    (brook.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 12;

  const fischer = getVoiceRuleBundle('clare_fischer');
  const okFischer =
    fischer.voiceId === 'clare_fischer' && (fischer.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const mingus = getVoiceRuleBundle('charles_mingus');
  const okMingus =
    mingus.voiceId === 'charles_mingus' &&
    mingus.harmonicRhythm.maxChordDurationBars >= 32 &&
    mingus.harmonicRhythm.allowMidBarChange === true &&
    mingus.orchestrationPolicy.allowCollectiveImprov === true &&
    (mingus.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(mingus.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CM_FORM_01'))) &&
    Boolean(mingus.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CM_SHOUT_01'))) &&
    Boolean(mingus.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CM_WORK_04')));

  const nelson = getVoiceRuleBundle('oliver_nelson');
  const okNelson =
    nelson.voiceId === 'oliver_nelson' &&
    nelson.harmonicRhythm.minChordDurationBars >= 2 &&
    (nelson.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 12;

  const quincy = getVoiceRuleBundle('quincy_jones');
  const okQuincy =
    quincy.voiceId === 'quincy_jones' && (quincy.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 11;

  const basie = getVoiceRuleBundle('count_basie');
  const okBasie =
    basie.voiceId === 'count_basie' && (basie.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 8;

  const messiaen = getVoiceRuleBundle('messiaen');
  const okMessiaenFp =
    messiaen.voiceId === 'messiaen' &&
    messiaen.harmonicRhythm.minChordDurationBars >= 2 &&
    (messiaen.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 12;

  const debussy = getVoiceRuleBundle('debussy');
  const okDebussyVl =
    debussy.voiceId === 'debussy' &&
    debussy.voicingPolicy.minSpreadSemitones >= 12 &&
    debussy.repairPolicy.resolveParallels === false &&
    (debussy.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 19;

  const beethovenLate = getVoiceRuleBundle('beethoven_late');
  const okBeethovenLate =
    beethovenLate.voiceId === 'beethoven_late' &&
    beethovenLate.bassPolicy.role === 'structural-bass' &&
    beethovenLate.formPolicy.narrativeArc === 'sonata-variation-fugue-attacca' &&
    beethovenLate.dim7EnharmonicModulationEnabled === true &&
    beethovenLate.speciesVoiceLeadingBias === 'high' &&
    (beethovenLate.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(beethovenLate.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BV_POLICY_01'))) &&
    Boolean(beethovenLate.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BV_TEXTURE_01'))) &&
    Boolean(beethovenLate.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BV_VS_BARTOK_01')));

  const turtleIsland = getVoiceRuleBundle('turtle_island');
  const okTurtleIsland =
    turtleIsland.voiceId === 'turtle_island' &&
    turtleIsland.bassPolicy.role === 'walking-bass' &&
    turtleIsland.melodicPolicy.contour === 'chord-scale' &&
    turtleIsland.formPolicy.narrativeArc === 'head-solos-head' &&
    turtleIsland.rhythmPolicy.antiMetric === false &&
    turtleIsland.swingFeel === true &&
    turtleIsland.guideToneVoiceLeading === true &&
    turtleIsland.improvSlots === true &&
    (turtleIsland.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_POLICY_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_VOICING_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_CHORDSCALE_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_IIVI_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_GROOVE_SWING_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_TECH_CHOP_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_FORM_01'))) &&
    Boolean(turtleIsland.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_VS_CLASSICAL_01')));

  const okTurtleIslandAliases =
    getVoiceRuleBundle('turtle_island_quartet').voiceId === 'turtle_island' &&
    getVoiceRuleBundle('david_balakrishnan').voiceId === 'turtle_island';

  const reichGlass = getVoiceRuleBundle('reich_glass');
  const okReichGlass =
    reichGlass.voiceId === 'reich_glass' &&
    reichGlass.bassPolicy.role === 'pattern-bass' &&
    reichGlass.melodicPolicy.contour === 'pattern-loop' &&
    reichGlass.formPolicy.narrativeArc === 'minimalist-process' &&
    reichGlass.rhythmPolicy.antiMetric === false &&
    reichGlass.pulseState === 'steady' &&
    reichGlass.phaseProcessEnabled === true &&
    reichGlass.additiveProcessEnabled === true &&
    (reichGlass.patternIntegrityMinRepeats ?? 0) >= 1 &&
    reichGlass.harmonicRhythm.minChordDurationBars >= 4 &&
    reichGlass.harmonicRhythm.maxChordDurationBars >= 32 &&
    (reichGlass.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_POLICY_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_PITCH_REICH_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_PITCH_GLASS_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_PHASE_BLOCK_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_CROSSFADE_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_ADDITIVE_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_PULSE_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_TEX_LAYERED_OSTINATO_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_FORM_REICH_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_FORM_GLASS_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_VS_LIGETI_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_VS_BARTOK_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_VS_BEETHOVEN_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_WORK_REICH_01'))) &&
    Boolean(reichGlass.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_WORK_GLASS_01')));

  const okReichGlassAliases =
    getVoiceRuleBundle('steve_reich').voiceId === 'reich_glass' &&
    getVoiceRuleBundle('philip_glass').voiceId === 'reich_glass' &&
    getVoiceRuleBundle('minimalist_sq').voiceId === 'reich_glass';

  const shostakovich = getVoiceRuleBundle('shostakovich');
  const okShostakovich =
    shostakovich.voiceId === 'shostakovich' &&
    shostakovich.bassPolicy.role === 'ostinato-or-pedal' &&
    shostakovich.melodicPolicy.contour === 'stepwise-with-leaps' &&
    shostakovich.formPolicy.narrativeArc === 'narrative-episodic' &&
    shostakovich.rhythmPolicy.antiMetric === false &&
    shostakovich.dschMotifEnabled === true &&
    shostakovich.quotationEventsEnabled === true &&
    shostakovich.tragicSlowMovementProfile === true &&
    shostakovich.shostakovichPeriod === 'middle' &&
    shostakovich.harmonicRhythm.maxChordDurationBars >= 16 &&
    (shostakovich.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_POLICY_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_PITCH_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_DSCH_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_DSCH_07'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_MOTIVE_04'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_RHY_OSTINATO_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_RHY_PAUSE_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_TEX_PASSACAGLIA_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_MEL_LAMENT_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_FORM_OPEN_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_WORK_SQ8_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_PERIOD_MIDDLE_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_VS_BEETHOVEN_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_VS_BARTOK_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_VS_REICH_GLASS_01'))) &&
    Boolean(shostakovich.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_VS_RAVEL_01')));

  const okShostakovichAliases =
    getVoiceRuleBundle('dmitri_shostakovich').voiceId === 'shostakovich' &&
    getVoiceRuleBundle('dsch').voiceId === 'shostakovich' &&
    getVoiceRuleBundle('shosti').voiceId === 'shostakovich';

  const lachenmann = getVoiceRuleBundle('lachenmann');
  const okLachenmann =
    lachenmann.voiceId === 'lachenmann' &&
    lachenmann.bassPolicy.role === 'noise-field' &&
    lachenmann.melodicPolicy.contour === 'gesture-physical' &&
    lachenmann.formPolicy.narrativeArc === 'through-composed-noise-grammar' &&
    lachenmann.rhythmPolicy.antiMetric === true &&
    lachenmann.soundTypeGrammarEnabled === true &&
    lachenmann.pitchRoleDecoupled === true &&
    lachenmann.noSemanticOverlay === true &&
    (lachenmann.klangtypenPrimary?.length ?? 0) === 5 &&
    Boolean(lachenmann.klangtypenPrimary?.includes('fließklang')) &&
    Boolean(lachenmann.klangtypenPrimary?.includes('druckklang')) &&
    Boolean(lachenmann.klangtypenPrimary?.includes('impulsklang')) &&
    (lachenmann.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_POLICY_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_PARAM_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_KLANG_FLIESS_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_KLANG_GERAUSCH_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_KLANG_DRUCK_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_KLANG_TON_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_KLANG_IMPULS_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_TECH_BOW_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_TECH_STROKE_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_TECH_COMBO_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_NOISE_VL_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_ENSEMBLE_REL_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_SILENCE_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_FORM_GRAN_TORSO_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_FORM_REIGEN_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_FORM_GRIDO_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_VS_CRUMB_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_VS_LIGETI_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_VS_BARTOK_01'))) &&
    Boolean(lachenmann.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_VS_SONIC_YOUTH_01')));

  const okLachenmannAliases =
    getVoiceRuleBundle('helmut_lachenmann').voiceId === 'lachenmann' &&
    getVoiceRuleBundle('musique_concrete_instrumentale').voiceId === 'lachenmann' &&
    getVoiceRuleBundle('gran_torso').voiceId === 'lachenmann' &&
    getVoiceRuleBundle('grido').voiceId === 'lachenmann';

  return [
    { name: 'Phase 2+3a harness additive: HarmonicScene stub barRange', ok: okScene },
    { name: 'Phase 2+3a harness additive: unknown voice → neutral bundle id', ok: okNeutral },
    { name: 'Phase 2+3a harness additive: bartok >=30 SQ fingerprints', ok: okBartok },
    { name: 'Phase 2+3a harness additive: ravel >=30 SQ fingerprints', ok: okRavel },
    { name: 'Phase 2+3a harness additive: dutilleux >=30 SQ fingerprints', ok: okDutilleux },
    { name: 'Phase 2+3a harness additive: gil_evans repairPolicy + >=25 fingerprints', ok: okGil },
    { name: 'Phase 2+3a harness additive: duke_ellington >=25 fingerprints', ok: okDuke },
    { name: 'Phase 2+3a harness additive: wayne_shorter ≥10 fingerprints', ok: okWsFp },
    { name: 'Phase 2+3a harness additive: maria_schneider >=25 fingerprints', ok: okMsFp },
    { name: 'Phase 2+3a harness additive: radiohead >=25 fingerprints', ok: okRadiohead },
    { name: 'Phase 2+3a harness additive: thelonious_monk >=25 fingerprints', ok: okMonk },
    { name: 'Phase 2+3a harness additive: bill_evans >=25 fingerprints', ok: okBillEvans },
    { name: 'Phase 2+3a harness additive: herbie_hancock >=25 fingerprints', ok: okHerbie },
    { name: 'Phase 2+3a harness additive: berg >=15 fingerprints + row clarity', ok: okBerg },
    { name: 'Phase 2+3a harness additive: henry_threadgill >=20 interval-cell fingerprints', ok: okThreadgill },
    { name: 'Phase 2+3a harness additive: sammy_nestico ≥10 fingerprints', ok: okNestico },
    { name: 'Phase 2+3a harness additive: bob_brookmeyer ≥12 fingerprints + line-first', ok: okBrook },
    { name: 'Phase 2+3a harness additive: clare_fischer >=10 fingerprints', ok: okFischer },
    { name: 'Phase 2+3a harness additive: charles_mingus >=25 fingerprints', ok: okMingus },
    { name: 'Phase 2+3a harness additive: oliver_nelson ≥12 fingerprints + pedal rhythm', ok: okNelson },
    { name: 'Phase 2+3a harness additive: quincy_jones ≥11 fingerprints', ok: okQuincy },
    { name: 'Phase 2+3a harness additive: count_basie fingerprints', ok: okBasie },
    { name: 'Phase 2+3a harness additive: messiaen ≥12 fingerprints + slow rhythm', ok: okMessiaenFp },
    { name: 'Phase 2+3a harness additive: debussy DB_VL bundle + wide spread', ok: okDebussyVl },
    { name: 'Phase 2+3a harness additive: beethoven_late >=30 BV_* fingerprints', ok: okBeethovenLate },
    { name: 'Phase 2+3a harness additive: turtle_island >=30 TI_* SQ-jazz fingerprints', ok: okTurtleIsland },
    { name: 'Phase 2+3a harness additive: turtle_island aliases resolve', ok: okTurtleIslandAliases },
    { name: 'Phase 2+3a harness additive: reich_glass >=30 RG_* SQ-minimalist fingerprints', ok: okReichGlass },
    { name: 'Phase 2+3a harness additive: reich_glass aliases resolve', ok: okReichGlassAliases },
    { name: 'Phase 2+3a harness additive: shostakovich >=30 SH_* SQ-narrative fingerprints', ok: okShostakovich },
    { name: 'Phase 2+3a harness additive: shostakovich aliases resolve', ok: okShostakovichAliases },
    { name: 'Phase 2+3a harness additive: lachenmann >=30 LC_* SQ-noise-grammar fingerprints', ok: okLachenmann },
    { name: 'Phase 2+3a harness additive: lachenmann aliases resolve', ok: okLachenmannAliases },
  ];
}
