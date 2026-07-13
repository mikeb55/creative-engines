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
    getVoiceRuleBundle('reich_and_glass').voiceId === 'reich_glass' &&
    getVoiceRuleBundle('minimalist_sq').voiceId === 'reich_glass' &&
    getVoiceRuleBundle('sq_vrb_reich_glass').voiceId === 'reich_glass' &&
    // Song Mode steve_reich / soft reich resolve to Song-Reich stub, not REICH_GLASS.
    getVoiceRuleBundle('steve_reich').voiceId === 'steve_reich' &&
    getVoiceRuleBundle('reich').voiceId === 'steve_reich' &&
    // Film Song Mode / SQ→BB glass ids resolve to film stub, not REICH_GLASS.
    getVoiceRuleBundle('philip_glass').voiceId === 'philip_glass_screen' &&
    getVoiceRuleBundle('glass').voiceId === 'philip_glass_screen' &&
    getVoiceRuleBundle('philip_glass_screen').voiceId === 'philip_glass_screen';

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

  const ligeti = getVoiceRuleBundle('ligeti');
  const okLigeti =
    ligeti.voiceId === 'ligeti' &&
    ligeti.sqVrbProfileId === 'ligeti' &&
    ligeti.bassPolicy.role === 'registral_boundary' &&
    ligeti.melodicPolicy.contour === 'neighbor-motion' &&
    ligeti.formPolicy.goldenMeanClimax === true &&
    ligeti.formPolicy.noCadentialRelease === true &&
    ligeti.rhythmPolicy.antiMetric === true &&
    ligeti.rhythmPolicy.phaseDisplacement === true &&
    ligeti.micropolyphonyMode === true &&
    ligeti.textureAsHarmonyEnabled === true &&
    ligeti.contrapuntalLinePolicy?.independenceLevel === 'maximum' &&
    ligeti.bestBbStyle === 'schneider' &&
    (ligeti.melodicPolicy.preferredIntervalSets?.length ?? 0) >= 2 &&
    Boolean(ligeti.melodicPolicy.preferredIntervalSets?.includes(1)) &&
    (ligeti.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 35 &&
    Boolean(ligeti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LT_POLICY_01'))) &&
    Boolean(ligeti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LT_WORK_ATMOSPHERES'))) &&
    Boolean(ligeti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LT_WORK_LUX_AETERNA'))) &&
    Boolean(ligeti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LT_DIFF_VS_WEBERN')));

  const okLigetiAliases =
    getVoiceRuleBundle('gyorgy_ligeti').voiceId === 'ligeti' &&
    getVoiceRuleBundle('micropolyphony').voiceId === 'ligeti' &&
    getVoiceRuleBundle('metamorphoses_nocturnes').voiceId === 'ligeti' &&
    getVoiceRuleBundle('sq_vrb_ligeti').voiceId === 'ligeti';

  const crumb = getVoiceRuleBundle('crumb_black_angels');
  const okCrumb =
    crumb.voiceId === 'crumb_black_angels' &&
    crumb.bassPolicy.role === 'noise-or-pedal' &&
    crumb.melodicPolicy.contour === 'gesture-symbolic' &&
    crumb.formPolicy.narrativeArc === 'ritual-arch' &&
    crumb.rhythmPolicy.antiMetric === true &&
    crumb.numerologyEnabled === true &&
    crumb.amplificationDecoupled === true &&
    crumb.symbolicTechniqueStatesEnabled === true &&
    crumb.quotationEventsEnabled === true &&
    crumb.mirrorEchoEnabled === true &&
    (crumb.soundTypeStates?.length ?? 0) === 3 &&
    Boolean(crumb.soundTypeStates?.includes('pitched')) &&
    Boolean(crumb.soundTypeStates?.includes('noise')) &&
    Boolean(crumb.soundTypeStates?.includes('hybrid')) &&
    (crumb.melodicPolicy.preferredIntervalSets?.length ?? 0) === 4 &&
    Boolean(crumb.melodicPolicy.preferredIntervalSets?.includes(1)) &&
    Boolean(crumb.melodicPolicy.preferredIntervalSets?.includes(6)) &&
    Boolean(crumb.melodicPolicy.preferredIntervalSets?.includes(7)) &&
    Boolean(crumb.melodicPolicy.preferredIntervalSets?.includes(5)) &&
    (crumb.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_POLICY_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_HARM_SETS_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_ISLAND_GOD_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_CHORD_CLUSTER_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_NUM_GROUP_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_NUM_SPEECH_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_FORM_13_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_FORM_MIRROR_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_TECH_ELECTRIC_INSECTS_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_TECH_GOD_MUSIC_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_PHONEME_GLASS_HALO_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_AMP_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_VL_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_RHY_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_MOTIF_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_DIFF_LACHENMANN_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_DIFF_LIGETI_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_DIFF_SHOSTAKOVICH_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_DIFF_DUTILLEUX_01'))) &&
    Boolean(crumb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_WORK_BLACK_ANGELS_01')));

  const okCrumbAliases =
    getVoiceRuleBundle('crumb').voiceId === 'crumb_black_angels' &&
    getVoiceRuleBundle('george_crumb').voiceId === 'crumb_black_angels' &&
    getVoiceRuleBundle('black_angels').voiceId === 'crumb_black_angels' &&
    getVoiceRuleBundle('thirteen_images').voiceId === 'crumb_black_angels' &&
    getVoiceRuleBundle('sq_vrb_crumb').voiceId === 'crumb_black_angels';

  const jobim = getVoiceRuleBundle('jobim');
  const okJobim =
    jobim.voiceId === 'jobim' &&
    jobim.bassPolicy.role === 'melodic-counterline' &&
    jobim.melodicPolicy.contour === 'stepwise-arc' &&
    jobim.formPolicy.narrativeArc === 'aaba-or-through-composed-song' &&
    jobim.rhythmPolicy.antiMetric === false &&
    jobim.bossaNovaFeel === true &&
    jobim.lydianColourEnabled === true &&
    (jobim.harmonicRhythm.minChordDurationBars ?? 0) === 2 &&
    (jobim.harmonicRhythm.maxChordDurationBars ?? 0) === 8 &&
    (jobim.melodicPolicy.preferredIntervalSets?.length ?? 0) === 5 &&
    Boolean(jobim.melodicPolicy.preferredIntervalSets?.includes(1)) &&
    Boolean(jobim.melodicPolicy.preferredIntervalSets?.includes(2)) &&
    Boolean(jobim.melodicPolicy.preferredIntervalSets?.includes(4)) &&
    Boolean(jobim.melodicPolicy.preferredIntervalSets?.includes(5)) &&
    Boolean(jobim.melodicPolicy.preferredIntervalSets?.includes(7)) &&
    (jobim.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_POLICY_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_HARM_VOCAB_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_HARM_TONAL_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_VL_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_MEL_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_MEL_03'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_RHY_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_TEX_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_FORM_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_FORM_02'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_GIROTA_IPANEMA_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_CORCOVADO_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_WAVE_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_DESAFINADO_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_AGUAS_DE_MARCO_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_ONE_NOTE_SAMBA_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_TRISTE_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_DIFF_BILL_EVANS_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_DIFF_BACHARACH_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_DIFF_DEBUSSY_01'))) &&
    Boolean(jobim.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_DIFF_WAYNE_SHORTER_01')));

  const okJobimAliases =
    getVoiceRuleBundle('antonio_carlos_jobim').voiceId === 'jobim' &&
    getVoiceRuleBundle('tom_jobim').voiceId === 'jobim' &&
    getVoiceRuleBundle('bossa_nova').voiceId === 'jobim' &&
    getVoiceRuleBundle('garota_de_ipanema').voiceId === 'jobim' &&
    getVoiceRuleBundle('girl_from_ipanema').voiceId === 'jobim';

  const satie = getVoiceRuleBundle('satie');
  const okSatie =
    satie.voiceId === 'satie' &&
    satie.bassPolicy.role === 'pedal-or-static' &&
    satie.melodicPolicy.contour === 'stepwise-modal' &&
    satie.formPolicy.narrativeArc === 'non-teleological' &&
    satie.rhythmPolicy.antiMetric === false &&
    satie.parallelChordsEnabled === true &&
    satie.unresolvedDominantEnabled === true &&
    satie.furnitureModeEnabled === true &&
    satie.ironicStyleSwitchEnabled === true &&
    satie.tintinnabuliEnabled === false &&
    satie.sacredProfile === false &&
    (satie.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(satie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_POLICY_01'))) &&
    Boolean(satie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_HARM_PAL_01'))) &&
    Boolean(satie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_TEX_GYM_01'))) &&
    Boolean(satie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_DIFF_PART_01')));

  const okSatieAliases =
    getVoiceRuleBundle('erik_satie').voiceId === 'satie' &&
    getVoiceRuleBundle('gymnopedies').voiceId === 'satie' &&
    getVoiceRuleBundle('furniture_music').voiceId === 'satie' &&
    getVoiceRuleBundle('socrate').voiceId === 'satie' &&
    getVoiceRuleBundle('parade').voiceId === 'satie';

  const oc = getVoiceRuleBundle('ornette_coleman');
  const okOrnette =
    oc.voiceId === 'ornette_coleman' &&
    oc.bassPolicy.role === 'melodic-floating' &&
    oc.melodicPolicy.contour === 'blues-field-free' &&
    oc.formPolicy.narrativeArc === 'head-solos-head' &&
    oc.formPolicy.sectionRecallEnforced === false &&
    oc.rhythmPolicy.antiMetric === false &&
    oc.orchestrationPolicy.allowCollectiveImprov === true &&
    oc.harmolodicsEnabled === true &&
    oc.pitchFieldGoverned === true &&
    oc.democraticEnsemble === true &&
    oc.collectiveImprovEnabled === true &&
    oc.bluesInflectionRequired === true &&
    oc.forbidAudibleProcessOperators === true &&
    (oc.harmonicRhythm.minChordDurationBars ?? -1) === 0 &&
    (oc.harmonicRhythm.maxChordDurationBars ?? 0) === 64 &&
    (oc.melodicPolicy.preferredIntervalSets?.length ?? 0) === 5 &&
    Boolean(oc.melodicPolicy.preferredIntervalSets?.every((n) => [1, 2, 3, 4, 5].includes(n))) &&
    (oc.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(oc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('OC_POLICY_01'))) &&
    Boolean(oc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('OC_HARM_01'))) &&
    Boolean(oc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('OC_LINE_01'))) &&
    Boolean(oc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('OC_DIFF_COLTRANE_01'))) &&
    Boolean(oc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('OC_FORM_02')));

  const okOrnetteAliases =
    getVoiceRuleBundle('ornette').voiceId === 'ornette_coleman' &&
    getVoiceRuleBundle('harmolodics').voiceId === 'ornette_coleman' &&
    getVoiceRuleBundle('free_jazz').voiceId === 'ornette_coleman' &&
    getVoiceRuleBundle('lonely_woman').voiceId === 'ornette_coleman' &&
    getVoiceRuleBundle('prime_time').voiceId === 'ornette_coleman';

  const gg = getVoiceRuleBundle('gershwin');
  const okGershwin =
    gg.voiceId === 'gershwin' &&
    gg.bassPolicy.role === 'walking-or-symphonic' &&
    gg.melodicPolicy.contour === 'blues-diatonic' &&
    gg.formPolicy.narrativeArc === 'aaba-or-rhapsody' &&
    gg.formPolicy.sectionRecallEnforced === true &&
    gg.rhythmPolicy.antiMetric === false &&
    gg.swingFeel === false &&
    gg.guideToneVoiceLeading === true &&
    gg.blueNoteEnabled === true &&
    gg.jazzExtensionEnabled === true &&
    gg.bluesColourEnabled === true &&
    gg.rhythmChangesEnabled === true &&
    gg.concertModeEnabled === true &&
    gg.songModeEnabled === true &&
    gg.repairPolicy.resolveParallels === true &&
    gg.sqVrbProfileId === 'gershwin' &&
    gg.harmonicRhythm.allowMidBarChange === true &&
    (gg.harmonicRhythm.minChordDurationBars ?? 0) >= 1 &&
    (gg.harmonicRhythm.maxChordDurationBars ?? 0) >= 2 &&
    (gg.melodicPolicy.preferredIntervalSets?.length ?? 0) >= 5 &&
    (gg.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 35 &&
    Boolean(gg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GW_POLICY_01'))) &&
    Boolean(gg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GW_HARM_01'))) &&
    Boolean(gg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GW_DIFF_VS_WILLIAMS_01'))) &&
    Boolean(gg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GW_WORK_RHAPSODY_IN_BLUE_01')));

  const okGershwinAliases =
    getVoiceRuleBundle('george_gershwin').voiceId === 'gershwin' &&
    getVoiceRuleBundle('rhapsody_in_blue').voiceId === 'gershwin' &&
    getVoiceRuleBundle('i_got_rhythm').voiceId === 'gershwin' &&
    getVoiceRuleBundle('summertime').voiceId === 'gershwin' &&
    getVoiceRuleBundle('concerto_in_f').voiceId === 'gershwin';

  const cp = getVoiceRuleBundle('cole_porter');
  const okColePorter =
    cp.voiceId === 'cole_porter' &&
    cp.bassPolicy.role === 'chromatic-descent-or-root' &&
    cp.melodicPolicy.contour === 'speech-elegant' &&
    cp.formPolicy.narrativeArc === 'aaba-or-extended-refrain' &&
    cp.formPolicy.sectionRecallEnforced === true &&
    cp.rhythmPolicy.antiMetric === false &&
    cp.swingFeel === false &&
    cp.guideToneVoiceLeading === true &&
    cp.chromaticBassEnabled === true &&
    cp.majorMinorMixtureEnabled === true &&
    cp.repeatedNoteOpeningEnabled === true &&
    cp.textCoupledHarmonyEnabled === true &&
    cp.witStyleProfile === true &&
    (cp.harmonicRhythm.minChordDurationBars ?? 0) === 1 &&
    (cp.harmonicRhythm.maxChordDurationBars ?? 0) === 8 &&
    (cp.melodicPolicy.preferredIntervalSets?.length ?? 0) === 5 &&
    Boolean(cp.melodicPolicy.preferredIntervalSets?.every((n) => [1, 2, 3, 6, 8].includes(n))) &&
    (cp.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(cp.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CP_POLICY_01'))) &&
    Boolean(cp.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CP_HARM_01'))) &&
    Boolean(cp.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CP_DIFF_GERSHWIN_01'))) &&
    Boolean(cp.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CP_WORK_NIGHT_DAY_01')));

  const okColePorterAliases =
    getVoiceRuleBundle('porter').voiceId === 'cole_porter' &&
    getVoiceRuleBundle('night_and_day').voiceId === 'cole_porter' &&
    getVoiceRuleBundle('begin_the_beguine').voiceId === 'cole_porter' &&
    getVoiceRuleBundle('love_for_sale').voiceId === 'cole_porter' &&
    getVoiceRuleBundle('anything_goes').voiceId === 'cole_porter';

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
    { name: 'Phase 2+3a harness additive: ligeti >=30 LG_* SQ-micropolyphony fingerprints', ok: okLigeti },
    { name: 'Phase 2+3a harness additive: ligeti aliases resolve', ok: okLigetiAliases },
    { name: 'Phase 2+3a harness additive: crumb_black_angels >=30 CB_* SQ-ritual fingerprints', ok: okCrumb },
    { name: 'Phase 2+3a harness additive: crumb_black_angels aliases resolve', ok: okCrumbAliases },
    { name: 'Phase 2+3a harness additive: jobim >=30 JB_* bossa-nova fingerprints', ok: okJobim },
    { name: 'Phase 2+3a harness additive: jobim aliases resolve', ok: okJobimAliases },
    { name: 'Phase 2+3a harness additive: satie >=30 ES_* modal-salon fingerprints', ok: okSatie },
    { name: 'Phase 2+3a harness additive: satie aliases resolve', ok: okSatieAliases },
    { name: 'Phase 2+3a harness additive: ornette_coleman >=30 OC_* harmolodic fingerprints', ok: okOrnette },
    { name: 'Phase 2+3a harness additive: ornette_coleman aliases resolve', ok: okOrnetteAliases },
    { name: 'Phase 2+3a harness additive: gershwin >=35 GW_* jazz-concert fingerprints', ok: okGershwin },
    { name: 'Phase 2+3a harness additive: gershwin aliases resolve', ok: okGershwinAliases },
    { name: 'Phase 2+3a harness additive: cole_porter >=30 CP_* songbook fingerprints', ok: okColePorter },
    { name: 'Phase 2+3a harness additive: cole_porter aliases resolve', ok: okColePorterAliases },
  ];
}
