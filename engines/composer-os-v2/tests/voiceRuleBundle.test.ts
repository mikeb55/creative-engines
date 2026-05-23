/**
 * VoiceRuleBundle compiler + gil_evans golden-path wiring (additive smoke suite).
 */

import { getVoiceRuleBundle, NEUTRAL_VOICE_RULE_BUNDLE } from '../core/composer/voiceRuleBundles';
import { EDDIE_VAN_HALEN_RIFF_STUB_REGISTRY } from '../core/composer/riffVrbStubs';
import { RIFF_GENERATOR_VRB_IDS } from '../core/riff-generator/riffVrbRegistry';
import type { VoiceRuleBundle } from '../core/composer/voiceRuleBundle';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { ChordEvent, NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

function assertBundleShape(b: VoiceRuleBundle): boolean {
  if (!b.voiceId) return false;
  if (b.harmonicRhythm.minChordDurationBars < 0) return false;
  return b.voicingPolicy.clusterSizeNotes.length === 2;
}

function testSevenVoicesMinChordDurationBars(): boolean {
  const bartok = getVoiceRuleBundle('bartok');
  const ravel = getVoiceRuleBundle('ravel');
  const dutilleux = getVoiceRuleBundle('dutilleux');
  const threadgill = getVoiceRuleBundle('henry_threadgill');
  const maria = getVoiceRuleBundle('maria_schneider');
  const mingus = getVoiceRuleBundle('charles_mingus');
  const radiohead = getVoiceRuleBundle('radiohead');
  const monk = getVoiceRuleBundle('thelonious_monk');
  const billEvans = getVoiceRuleBundle('bill_evans');
  const herbie = getVoiceRuleBundle('herbie_hancock');
  return (
    bartok.voiceId === 'bartok' &&
    bartok.rhythmPolicy.antiMetric === true &&
    bartok.harmonicRhythm.minChordDurationBars === 0 &&
    (bartok.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(bartok.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BK_PITCH_01'))) &&
    Boolean(bartok.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BK_AXIS_01'))) &&
    Boolean(bartok.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BK_WORK_04'))) &&
    ravel.voiceId === 'ravel' &&
    ravel.formPolicy.narrativeArc === 'suite' &&
    ravel.rhythmPolicy.antiMetric === false &&
    (ravel.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(ravel.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RV_SCALE_01'))) &&
    Boolean(ravel.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RV_PLANING_01'))) &&
    Boolean(ravel.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RV_WORK_04'))) &&
    dutilleux.voiceId === 'dutilleux' &&
    dutilleux.rhythmPolicy.antiMetric === true &&
    dutilleux.voicingPolicy.minSpreadSemitones >= 12 &&
    (dutilleux.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
    Boolean(dutilleux.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DX_HC_01'))) &&
    Boolean(dutilleux.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DX_MEM_01'))) &&
    Boolean(dutilleux.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DX_WORK_07'))) &&
    getVoiceRuleBundle('thad_jones').harmonicRhythm.minChordDurationBars === 1 &&
    getVoiceRuleBundle('gil_evans').harmonicRhythm.minChordDurationBars === 1 &&
    (getVoiceRuleBundle('gil_evans').orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(getVoiceRuleBundle('gil_evans').orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GE_HORN_01'))) &&
    Boolean(getVoiceRuleBundle('gil_evans').orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('GE_TUBA_01'))) &&
    maria.harmonicRhythm.minChordDurationBars === 1 &&
    maria.harmonicRhythm.maxChordDurationBars >= 8 &&
    (maria.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(maria.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('MS_HARM_01'))) &&
    Boolean(maria.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('MS_FORM_05'))) &&
    getVoiceRuleBundle('john_coltrane').harmonicRhythm.minChordDurationBars === 0 &&
    getVoiceRuleBundle('wayne_shorter').harmonicRhythm.minChordDurationBars === 2 &&
    getVoiceRuleBundle('pat_metheny').harmonicRhythm.minChordDurationBars === 1 &&
    threadgill.harmonicRhythm.minChordDurationBars === 0 &&
    threadgill.bassPolicy.role === 'chromatic-first' &&
    (threadgill.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 20 &&
    mingus.harmonicRhythm.minChordDurationBars === 1 &&
    mingus.harmonicRhythm.maxChordDurationBars >= 32 &&
    mingus.harmonicRhythm.allowMidBarChange === true &&
    mingus.orchestrationPolicy.allowCollectiveImprov === true &&
    (mingus.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(mingus.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CM_FORM_01'))) &&
    Boolean(mingus.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CM_SHOUT_01'))) &&
    Boolean(mingus.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CM_WORK_04'))) &&
    radiohead.rhythmPolicy.antiMetric === true &&
    (radiohead.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(radiohead.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RH_HARM_01'))) &&
    Boolean(radiohead.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RH_RHY_01'))) &&
    Boolean(radiohead.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RH_WORK_06'))) &&
    monk.voiceId === 'thelonious_monk' &&
    monk.rhythmPolicy.antiMetric === true &&
    monk.formPolicy.narrativeArc === 'blues-backbone' &&
    (monk.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(monk.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TM_HARM_01'))) &&
    Boolean(monk.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TM_VOICING_01'))) &&
    Boolean(monk.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TM_DIFF_03'))) &&
    billEvans.voiceId === 'bill_evans' &&
    billEvans.bassPolicy.role === 'melodic-counterline' &&
    billEvans.rhythmPolicy.antiMetric === true &&
    (billEvans.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(billEvans.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BE_VOICING_01'))) &&
    Boolean(billEvans.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BE_VL_01'))) &&
    Boolean(billEvans.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BE_DIFF_03'))) &&
    herbie.voiceId === 'herbie_hancock' &&
    herbie.melodicPolicy.contour === 'pentatonic-cell' &&
    herbie.rhythmPolicy.antiMetric === true &&
    (herbie.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 25 &&
    Boolean(herbie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('HH_QUARTAL_01'))) &&
    Boolean(herbie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('HH_FUNK_01'))) &&
    Boolean(herbie.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('HH_DIFF_03'))) &&
    (() => {
      const bv = getVoiceRuleBundle('beethoven_late');
      return (
        bv.voiceId === 'beethoven_late' &&
        bv.bassPolicy.role === 'structural-bass' &&
        bv.formPolicy.narrativeArc === 'sonata-variation-fugue-attacca' &&
        bv.melodicPolicy.contour === 'motivic-cell' &&
        bv.dim7EnharmonicModulationEnabled === true &&
        bv.speciesVoiceLeadingBias === 'high' &&
        bv.rhythmPolicy.antiMetric === true &&
        (bv.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(bv.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BV_POLICY_01'))) &&
        Boolean(bv.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BV_HARM_GRAPH_01'))) &&
        Boolean(bv.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BV_WORK_03')))
      );
    })() &&
    (() => {
      const ti = getVoiceRuleBundle('turtle_island');
      return (
        ti.voiceId === 'turtle_island' &&
        ti.bassPolicy.role === 'walking-bass' &&
        ti.melodicPolicy.contour === 'chord-scale' &&
        ti.formPolicy.narrativeArc === 'head-solos-head' &&
        ti.rhythmPolicy.antiMetric === false &&
        ti.swingFeel === true &&
        ti.guideToneVoiceLeading === true &&
        ti.improvSlots === true &&
        (ti.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(ti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_POLICY_01'))) &&
        Boolean(ti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_VOICING_01'))) &&
        Boolean(ti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_GROOVE_SWING_01'))) &&
        Boolean(ti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_TECH_CHOP_01'))) &&
        Boolean(ti.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('TI_VS_CLASSICAL_01')))
      );
    })() &&
    (() => {
      const rg = getVoiceRuleBundle('reich_glass');
      return (
        rg.voiceId === 'reich_glass' &&
        rg.bassPolicy.role === 'pattern-bass' &&
        rg.melodicPolicy.contour === 'pattern-loop' &&
        rg.formPolicy.narrativeArc === 'minimalist-process' &&
        rg.rhythmPolicy.antiMetric === false &&
        rg.pulseState === 'steady' &&
        rg.phaseProcessEnabled === true &&
        rg.additiveProcessEnabled === true &&
        (rg.patternIntegrityMinRepeats ?? 0) >= 1 &&
        rg.harmonicRhythm.minChordDurationBars >= 4 &&
        rg.harmonicRhythm.maxChordDurationBars >= 32 &&
        (rg.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(rg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_POLICY_01'))) &&
        Boolean(rg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_PHASE_BLOCK_01'))) &&
        Boolean(rg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_ADDITIVE_01'))) &&
        Boolean(rg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_VS_LIGETI_01'))) &&
        Boolean(rg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('RG_WORK_REICH_01')))
      );
    })() &&
    (() => {
      const sh = getVoiceRuleBundle('shostakovich');
      return (
        sh.voiceId === 'shostakovich' &&
        sh.bassPolicy.role === 'ostinato-or-pedal' &&
        sh.melodicPolicy.contour === 'stepwise-with-leaps' &&
        sh.formPolicy.narrativeArc === 'narrative-episodic' &&
        sh.rhythmPolicy.antiMetric === false &&
        sh.dschMotifEnabled === true &&
        sh.quotationEventsEnabled === true &&
        sh.tragicSlowMovementProfile === true &&
        sh.shostakovichPeriod === 'middle' &&
        sh.harmonicRhythm.maxChordDurationBars >= 16 &&
        (sh.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(sh.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_POLICY_01'))) &&
        Boolean(sh.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_DSCH_01'))) &&
        Boolean(sh.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_WORK_SQ8_01'))) &&
        Boolean(sh.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('SH_VS_REICH_GLASS_01')))
      );
    })() &&
    (() => {
      const lc = getVoiceRuleBundle('lachenmann');
      return (
        lc.voiceId === 'lachenmann' &&
        lc.bassPolicy.role === 'noise-field' &&
        lc.melodicPolicy.contour === 'gesture-physical' &&
        lc.formPolicy.narrativeArc === 'through-composed-noise-grammar' &&
        lc.rhythmPolicy.antiMetric === true &&
        lc.soundTypeGrammarEnabled === true &&
        lc.pitchRoleDecoupled === true &&
        lc.noSemanticOverlay === true &&
        (lc.klangtypenPrimary?.length ?? 0) === 5 &&
        (lc.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(lc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_POLICY_01'))) &&
        Boolean(lc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_KLANG_FLIESS_01'))) &&
        Boolean(lc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_TECH_BOW_01'))) &&
        Boolean(lc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_FORM_GRAN_TORSO_01'))) &&
        Boolean(lc.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LC_VS_CRUMB_01')))
      );
    })() &&
    (() => {
      const lg = getVoiceRuleBundle('ligeti');
      return (
        lg.voiceId === 'ligeti' &&
        lg.sqVrbProfileId === 'ligeti' &&
        lg.bassPolicy.role === 'registral_boundary' &&
        lg.melodicPolicy.contour === 'neighbor-motion' &&
        lg.formPolicy.goldenMeanClimax === true &&
        lg.rhythmPolicy.antiMetric === true &&
        lg.micropolyphonyMode === true &&
        lg.textureAsHarmonyEnabled === true &&
        lg.contrapuntalLinePolicy?.enabled === true &&
        lg.contrapuntalLinePolicy?.independenceLevel === 'high' &&
        lg.pitchFieldGoverned === true &&
        lg.suppressFunctionalResolution === true &&
        lg.melodicPolicy.maxLeapSemitones === 3 &&
        (lg.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 35 &&
        Boolean(lg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LT_POLICY_01'))) &&
        Boolean(lg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('LT_WORK_ATMOSPHERES'))) &&
        getVoiceRuleBundle('gyorgy_ligeti').voiceId === 'ligeti' &&
        getVoiceRuleBundle('micropolyphony').voiceId === 'ligeti' &&
        getVoiceRuleBundle('sq_vrb_ligeti').voiceId === 'ligeti'
      );
    })() &&
    (() => {
      const cb = getVoiceRuleBundle('crumb_black_angels');
      return (
        cb.voiceId === 'crumb_black_angels' &&
        cb.bassPolicy.role === 'noise-or-pedal' &&
        cb.melodicPolicy.contour === 'gesture-symbolic' &&
        cb.formPolicy.narrativeArc === 'ritual-arch' &&
        cb.rhythmPolicy.antiMetric === true &&
        cb.numerologyEnabled === true &&
        cb.amplificationDecoupled === true &&
        cb.symbolicTechniqueStatesEnabled === true &&
        cb.quotationEventsEnabled === true &&
        cb.mirrorEchoEnabled === true &&
        (cb.soundTypeStates?.length ?? 0) === 3 &&
        (cb.melodicPolicy.preferredIntervalSets?.length ?? 0) === 4 &&
        (cb.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(cb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_POLICY_01'))) &&
        Boolean(cb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_HARM_SETS_01'))) &&
        Boolean(cb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_NUM_GROUP_01'))) &&
        Boolean(cb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_FORM_13_01'))) &&
        Boolean(cb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_TECH_ELECTRIC_INSECTS_01'))) &&
        Boolean(cb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('CB_WORK_BLACK_ANGELS_01'))) &&
        getVoiceRuleBundle('crumb').voiceId === 'crumb_black_angels' &&
        getVoiceRuleBundle('george_crumb').voiceId === 'crumb_black_angels' &&
        getVoiceRuleBundle('black_angels').voiceId === 'crumb_black_angels'
      );
    })() &&
    (() => {
      const jb = getVoiceRuleBundle('jobim');
      return (
        jb.voiceId === 'jobim' &&
        jb.bassPolicy.role === 'melodic-counterline' &&
        jb.melodicPolicy.contour === 'stepwise-arc' &&
        jb.formPolicy.narrativeArc === 'aaba-or-through-composed-song' &&
        jb.rhythmPolicy.antiMetric === false &&
        jb.bossaNovaFeel === true &&
        jb.lydianColourEnabled === true &&
        (jb.harmonicRhythm.minChordDurationBars ?? 0) === 2 &&
        (jb.harmonicRhythm.maxChordDurationBars ?? 0) === 8 &&
        (jb.melodicPolicy.preferredIntervalSets?.length ?? 0) === 5 &&
        Boolean(jb.melodicPolicy.preferredIntervalSets?.includes(7)) &&
        (jb.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_POLICY_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_HARM_VOCAB_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_HARM_TONAL_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_VL_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_MEL_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_RHY_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_TEX_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_FORM_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_GIROTA_IPANEMA_01'))) &&
        Boolean(jb.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('JB_WORK_WAVE_01'))) &&
        getVoiceRuleBundle('antonio_carlos_jobim').voiceId === 'jobim' &&
        getVoiceRuleBundle('tom_jobim').voiceId === 'jobim' &&
        getVoiceRuleBundle('bossa_nova').voiceId === 'jobim' &&
        getVoiceRuleBundle('garota_de_ipanema').voiceId === 'jobim' &&
        getVoiceRuleBundle('girl_from_ipanema').voiceId === 'jobim'
      );
    })() &&
    (() => {
      const ap = getVoiceRuleBundle('arvo_part');
      return (
        ap.voiceId === 'part' &&
        ap.bassPolicy.role === 'pedal-or-drone' &&
        ap.melodicPolicy.contour === 'stepwise-diatonic' &&
        ap.formPolicy.narrativeArc === 'variation-or-arch' &&
        ap.rhythmPolicy.antiMetric === false &&
        ap.tintinnabuliEnabled === true &&
        ap.sacredProfile === true &&
        ap.silenceAsStructure === true &&
        ap.tintinnabuliExtendedTechniquesLevel === 'minimal' &&
        ap.dynamicCeiling === 'mf' &&
        ap.noTeleologicalDevelopment === true &&
        ap.forbidAudibleProcessOperators === true &&
        (ap.tVoicePositionModes?.length ?? 0) === 5 &&
        Boolean(ap.tVoicePositionModes?.includes('1_above')) &&
        (ap.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(ap.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('AP_POLICY_01'))) &&
        Boolean(ap.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('AP_T_VOICE_01'))) &&
        Boolean(ap.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('AP_WORK_SPIEGEL_01'))) &&
        Boolean(ap.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('AP_DIFF_RG_01'))) &&
        getVoiceRuleBundle('part').voiceId === 'part' &&
        getVoiceRuleBundle('tintinnabuli').voiceId === 'part' &&
        getVoiceRuleBundle('spiegel_im_spiegel').voiceId === 'part' &&
        getVoiceRuleBundle('fratres').voiceId === 'part' &&
        getVoiceRuleBundle('arvo').voiceId === 'part'
      );
    })() &&
    (() => {
      const es = getVoiceRuleBundle('satie');
      return (
        es.voiceId === 'satie' &&
        es.sqVrbProfileId === 'satie' &&
        es.harmonicRhythm.minChordDurationBars >= 4 &&
        es.bassPolicy.role === 'pedal-or-static' &&
        es.melodicPolicy.contour === 'stepwise-modal' &&
        es.melodicPolicy.maxLeapSemitones <= 4 &&
        es.formPolicy.narrativeArc === 'non-teleological' &&
        es.formPolicy.stasisSurface === true &&
        es.rhythmPolicy.antiMetric === false &&
        es.parallelChordsEnabled === true &&
        es.unresolvedDominantEnabled === true &&
        es.furnitureModeEnabled === true &&
        es.suppressFunctionalResolution === true &&
        es.contrapuntalLinePolicy?.parallelMotionPolicy === 'allow' &&
        (es.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 35 &&
        Boolean(es.orchestrationPolicy.fingerprintReceipts?.some((r) => r.includes('WORK_GYMNOPEDIE'))) &&
        Boolean(es.orchestrationPolicy.fingerprintReceipts?.some((r) => r.includes('DIFF_VS_GLASS'))) &&
        getVoiceRuleBundle('erik_satie').sqVrbProfileId === 'satie' &&
        getVoiceRuleBundle('gymnopedies').voiceId === 'satie' &&
        getVoiceRuleBundle('furniture_music').voiceId === 'satie'
      );
    })() &&
    (() => {
      const cp = getVoiceRuleBundle('cole_porter');
      return (
        cp.voiceId === 'cole_porter' &&
        cp.sqVrbProfileId === 'cole_porter' &&
        cp.harmonicRhythm.minChordDurationBars >= 1 &&
        cp.bassPolicy.role === 'chromatic-descent-or-root' &&
        cp.melodicPolicy.maxLeapSemitones <= 14 &&
        cp.formPolicy.narrativeArc === 'aaba-or-extended-refrain' &&
        cp.repairPolicy.resolveParallels === true &&
        cp.suppressFunctionalResolution === false &&
        cp.swingFeel === false &&
        cp.contrapuntalLinePolicy?.parallelMotionPolicy === 'avoid' &&
        (cp.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 35 &&
        Boolean(cp.orchestrationPolicy.fingerprintReceipts?.some((r) => r.includes('WORK_NIGHT_AND_DAY'))) &&
        Boolean(cp.orchestrationPolicy.fingerprintReceipts?.some((r) => r.includes('DIFF_VS_GERSHWIN'))) &&
        getVoiceRuleBundle('porter').sqVrbProfileId === 'cole_porter' &&
        getVoiceRuleBundle('night_and_day').voiceId === 'cole_porter'
      );
    })()
  );
}

function testFallbackMatchesNeutralDefault(): boolean {
  const b = getVoiceRuleBundle('unknown_writer_xyz');
  return b.voiceId === NEUTRAL_VOICE_RULE_BUNDLE.voiceId;
}

function testHvPrefixStrips(): boolean {
  const a = getVoiceRuleBundle('hv:gil_evans');
  const b = getVoiceRuleBundle('gil_evans');
  return a.harmonicRhythm.minChordDurationBars === b.harmonicRhythm.minChordDurationBars;
}

function testResolvableBundlesSatisfyShape(): boolean {
  for (const id of [
    'bartok',
    'ravel',
    'dutilleux',
    'thad_jones',
    'gil_evans',
    'duke_ellington',
    'maria_schneider',
    'radiohead',
    'thelonious_monk',
    'bill_evans',
    'herbie_hancock',
    'john_coltrane',
    'wayne_shorter',
    'pat_metheny',
    'henry_threadgill',
    'charles_mingus',
    'beethoven_late',
    'turtle_island',
    'reich_glass',
    'shostakovich',
    'lachenmann',
    'ligeti',
    'crumb_black_angels',
    'jobim',
    'satie',
  ]) {
    if (!assertBundleShape(getVoiceRuleBundle(id))) return false;
  }
  const duke = getVoiceRuleBundle('duke_ellington');
  if (
    duke.harmonicRhythm.maxChordDurationBars < 4 ||
    duke.harmonicRhythm.allowMidBarChange !== true ||
    (duke.orchestrationPolicy.fingerprintReceipts?.length ?? 0) < 25 ||
    !duke.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DE_VOICING_01')) ||
    !duke.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DE_JUNGLE_01')) ||
    !duke.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('DE_WORK_08'))
  ) {
    return false;
  }
  const berg = getVoiceRuleBundle('berg');
  if (
    berg.bergVoiceLeading?.rowClarityLevel !== 'balanced' ||
    (berg.orchestrationPolicy.fingerprintReceipts?.length ?? 0) < 15 ||
    !berg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BG_ROW_01')) ||
    !berg.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('BG_DIFF_01'))
  ) {
    return false;
  }
  return true;
}

function maxGuitarVerticalSpreadSemitones(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    if (p.id !== 'guitar') continue;
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'chord') {
          const pitches = (e as ChordEvent).pitches;
          if (!pitches || pitches.length < 2) continue;
          max = Math.max(max, Math.max(...pitches) - Math.min(...pitches));
        }
      }
      const byStart = new Map<number, number[]>();
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        const t = n.startBeat;
        if (!byStart.has(t)) byStart.set(t, []);
        byStart.get(t)!.push(n.pitch);
      }
      for (const pitches of byStart.values()) {
        if (pitches.length < 2) continue;
        max = Math.max(max, Math.max(...pitches) - Math.min(...pitches));
      }
    }
  }
  return max;
}

function testGilEvansGoldenPathVoiceBundleAndSpread(): boolean {
  const r = runGoldenPath(120334, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom',
    totalBars: 8,
    chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt',
    harmonicVoice: 'gil_evans',
  });
  if (!r.success || !r.score) return false;
  if (r.context.voiceBundle?.voiceId !== 'gil_evans') return false;
  if (r.context.voiceBundle?.voicingPolicy.minSpreadSemitones !== 10) return false;
  if (r.context.voiceBundle?.bassPolicy.role !== 'melodic-counterline') return false;
  if (r.context.generationMetadata?.voiceBundlePolicyEcho?.bassRole !== 'melodic-counterline') return false;
  const spread = maxGuitarVerticalSpreadSemitones(r.score);
  const minSp = r.context.voiceBundle.voicingPolicy.minSpreadSemitones;
  return spread >= minSp;
}

function testRiffVrbStubsRegistry(): boolean {
  const nile = getVoiceRuleBundle('nile_rodgers');
  const iommi = getVoiceRuleBundle('iommi');
  const hendrix = getVoiceRuleBundle('hendrix');
  const jimi = getVoiceRuleBundle('jimi');
  const sabbath = getVoiceRuleBundle('black_sabbath');
  if (!nile.riffProfile || !iommi.riffProfile || !hendrix.riffProfile) return false;
  return (
    nile.voiceId === 'nile_rodgers' &&
    iommi.voiceId === 'iommi' &&
    hendrix.voiceId === 'hendrix' &&
    jimi.voiceId === 'hendrix' &&
    sabbath.voiceId === 'iommi' &&
    iommi.riffProfile.allowPitchStreak === true &&
    hendrix.riffProfile.allowPitchStreak === false &&
    nile.riffProfile.subdivisionGrid === 16 &&
    iommi.riffProfile.tritoneStable === true &&
    testLedZeppelinRiffVrbStubRegistry() &&
    testLarryCarltonRiffVrbStubRegistry() &&
    testDavidGilmourRiffVrbStubRegistry() &&
    testEddieVanHalenRiffVrbStubRegistry()
  );
}

function testDavidGilmourRiffVrbStubRegistry(): boolean {
  const dg = getVoiceRuleBundle('david_gilmour');
  const gilmour = getVoiceRuleBundle('gilmour');
  const floyd = getVoiceRuleBundle('pink_floyd');
  if (!dg.riffProfile) return false;
  const rp = dg.riffProfile;
  return (
    dg.voiceId === 'david_gilmour' &&
    dg.sigma === 26 &&
    dg.family === 'rock' &&
    gilmour.voiceId === 'david_gilmour' &&
    floyd.voiceId === 'david_gilmour' &&
    rp.allowPitchStreak === false &&
    rp.silencePolicy.styleClass === 'Sparse' &&
    rp.subdivisionGrid === 8 &&
    rp.tuningPolicy?.midiFloor === 52 &&
    rp.tuningPolicy?.midiCeiling === 82 &&
    rp.tuningPolicy?.riffMidBand[0] === 57 &&
    rp.tuningPolicy?.riffMidBand[1] === 79 &&
    rp.tuningPolicy?.riffLowBand[0] === 45 &&
    rp.tuningPolicy?.riffLowBand[1] === 64 &&
    rp.rhythmFeel?.primarySubdivision === '8th' &&
    rp.rhythmFeel?.beatPlacement === 'slightly_behind' &&
    rp.intervalWeights?.m3 === 0.18 &&
    rp.intervalWeights?.P4 === 0.15 &&
    rp.ornamentPolicy.bends === true &&
    rp.metricDisplacement === 0.4 &&
    Boolean(rp.tuningPolicy?.tuningOptions.ComfortablyNumbType) &&
    Boolean(rp.tuningPolicy?.tuningOptions.ShineOnType) &&
    (rp.variationOperators?.length ?? 0) >= 5
  );
}

function testLarryCarltonRiffVrbStubRegistry(): boolean {
  const lc = getVoiceRuleBundle('larry_carlton');
  const carlton = getVoiceRuleBundle('carlton');
  const mr335 = getVoiceRuleBundle('mr_335');
  if (!lc.riffProfile) return false;
  const rp = lc.riffProfile;
  return (
    lc.voiceId === 'larry_carlton' &&
    lc.sigma === 24 &&
    lc.family === 'funk' &&
    carlton.voiceId === 'larry_carlton' &&
    mr335.voiceId === 'larry_carlton' &&
    rp.allowPitchStreak === false &&
    rp.silencePolicy.styleClass === 'Medium' &&
    rp.subdivisionGrid === 16 &&
    rp.tuningPolicy?.midiFloor === 55 &&
    rp.tuningPolicy?.midiCeiling === 79 &&
    rp.tuningPolicy?.riffMidBand[0] === 60 &&
    rp.tuningPolicy?.riffMidBand[1] === 76 &&
    rp.tuningPolicy?.riffLowBand[0] === 48 &&
    rp.tuningPolicy?.riffLowBand[1] === 69 &&
    rp.rhythmFeel?.primarySubdivision === '16th' &&
    rp.rhythmFeel?.beatPlacement === 'slightly_behind' &&
    rp.intervalWeights?.M2 === 0.18 &&
    rp.intervalWeights?.m3 === 0.16 &&
    rp.phraseLengthBeats?.[0] === 2 &&
    rp.metricDisplacement === 0.55 &&
    Boolean(rp.tuningPolicy?.tuningOptions.KidCharlemagneType) &&
    (rp.variationOperators?.length ?? 0) >= 5
  );
}

function testEddieVanHalenRiffGeneratorRegistry(): boolean {
  return (
    RIFF_GENERATOR_VRB_IDS.length === 15 &&
    RIFF_GENERATOR_VRB_IDS[8] === 'eddie_van_halen' &&
    (RIFF_GENERATOR_VRB_IDS as readonly string[]).includes('eddie_van_halen')
  );
}

function testEddieVanHalenRiffVrbStubRegistry(): boolean {
  if (!testEddieVanHalenRiffGeneratorRegistry()) return false;
  const evh = getVoiceRuleBundle('eddie_van_halen');
  const vanHalen = getVoiceRuleBundle('van_halen');
  const alias = getVoiceRuleBundle('evh');
  if (
    !evh.riffProfile ||
    vanHalen.voiceId !== 'eddie_van_halen' ||
    alias.sigma !== 26 ||
    EDDIE_VAN_HALEN_RIFF_STUB_REGISTRY.evh.family !== 'rock'
  ) {
    return false;
  }
  const rp = evh.riffProfile;
  const tp = rp.tuningPolicy;
  return (
    evh.voiceId === 'eddie_van_halen' &&
    evh.sigma === 26 &&
    evh.family === 'rock' &&
    rp.allowPitchStreak === true &&
    rp.silencePolicy.styleClass === 'Busy' &&
    rp.subdivisionGrid === 16 &&
    tp?.midiFloor === 40 &&
    tp?.midiCeiling === 88 &&
    tp?.riffMidBand[0] === 52 &&
    tp?.riffMidBand[1] === 76 &&
    tp?.tuningOptions.gain === 0.8 &&
    tp?.tuningOptions.bridgeHumbuckerDominant === 0.95 &&
    tp?.tuningOptions.tapToPulloffRatio === 0.33 &&
    tp?.tuningOptions.whammyDiveBombProb === 0.3 &&
    rp.rhythmFeel?.primarySubdivision === '16th' &&
    rp.rhythmFeel?.beatPlacement === 'slightly_ahead' &&
    rp.textureMix?.openStringDroneProb === 0.35 &&
    rp.textureMix?.powerChordRiff === 0.4 &&
    rp.phraseLengthBeats?.[0] === 4 &&
    rp.phraseLengthBeats?.[2] === 16 &&
    rp.cadenceTypes?.sustained_sus_chord === 0.5 &&
    rp.cadenceTypes?.tail_fill === 0.3 &&
    rp.spacePolicy?.internalRestProb === 0.15 &&
    (rp.variationOperators?.length ?? 0) >= 6 &&
    (rp.whammyEvents?.length ?? 0) >= 1 &&
    (rp.groupingPatterns?.length ?? 0) >= 1
  );
}

function testLedZeppelinRiffVrbStubRegistry(): boolean {
  const zep = getVoiceRuleBundle('led_zeppelin');
  const page = getVoiceRuleBundle('jimmy_page');
  if (!zep.riffProfile) return false;
  const rp = zep.riffProfile;
  return (
    zep.voiceId === 'led_zeppelin' &&
    zep.sigma === 27 &&
    zep.family === 'rock' &&
    page.voiceId === 'led_zeppelin' &&
    getVoiceRuleBundle('zeppelin').voiceId === 'led_zeppelin' &&
    rp.allowPitchStreak === false &&
    rp.silencePolicy.styleClass === 'Medium' &&
    rp.tuningPolicy?.midiFloor === 38 &&
    rp.tuningPolicy?.midiCeiling === 88 &&
    rp.tuningPolicy?.riffLowBand[0] === 40 &&
    rp.tuningPolicy?.riffMidBand[1] === 69 &&
    rp.rhythmFeel?.primarySubdivision === '8th' &&
    rp.rhythmFeel?.beatPlacement === 'slightly_behind' &&
    rp.intervalWeights?.m3 === 1.0 &&
    rp.intervalWeights?.P5 === 1.0 &&
    rp.textureMix?.openStringDroneProb === 0.45 &&
    rp.oddMeterUsage?.isSuperimposed === false &&
    (rp.oddMeterUsage?.meters.length ?? 0) === 2 &&
    rp.phraseLengthBeats?.[0] === 4 &&
    rp.pedalPoint?.enabled === true &&
    Boolean(rp.styleModes?.epic_modal_heavy)
  );
}

function testFusionArtRockRiffVrbStubsRegistry(): boolean {
  const weather = getVoiceRuleBundle('weather_report');
  const mahavishnu = getVoiceRuleBundle('mahavishnu');
  const verlaine = getVoiceRuleBundle('verlaine');
  const morello = getVoiceRuleBundle('morello');
  const fripp = getVoiceRuleBundle('fripp');
  if (
    !weather.riffProfile ||
    !mahavishnu.riffProfile ||
    !verlaine.riffProfile ||
    !morello.riffProfile ||
    !fripp.riffProfile
  ) {
    return false;
  }
  return (
    weather.voiceId === 'weather_report' &&
    getVoiceRuleBundle('zawinul').voiceId === 'weather_report' &&
    mahavishnu.voiceId === 'mahavishnu' &&
    getVoiceRuleBundle('mclaughlin').voiceId === 'mahavishnu' &&
    verlaine.voiceId === 'verlaine' &&
    getVoiceRuleBundle('television').voiceId === 'verlaine' &&
    morello.voiceId === 'morello' &&
    getVoiceRuleBundle('ratm').voiceId === 'morello' &&
    fripp.voiceId === 'fripp' &&
    getVoiceRuleBundle('king_crimson').voiceId === 'fripp' &&
    mahavishnu.riffProfile.meterPolicy === 'odd_grouped' &&
    mahavishnu.riffProfile.polyGroupingMode === true &&
    Boolean(fripp.riffProfile.processLoopPolicy) &&
    Boolean(verlaine.riffProfile.counterpartVoicePolicy) &&
    morello.riffProfile.allowPitchStreak === true &&
    weather.riffProfile.ensembleInterlockMode === 'layeredOstinati'
  );
}

export function runVoiceRuleBundleTests(): { name: string; ok: boolean }[] {
  return [
    ['VoiceRuleBundle — riff VRB stubs (nile / iommi / hendrix / evh)', testRiffVrbStubsRegistry],
    [
      'VoiceRuleBundle — Eddie Van Halen riff VRB #15 (registry + stub aliases)',
      testEddieVanHalenRiffVrbStubRegistry,
    ],
    [
      'VoiceRuleBundle — fusion/art-rock riff stubs (weather / mahavishnu / verlaine / morello / fripp)',
      testFusionArtRockRiffVrbStubsRegistry,
    ],
    ['VoiceRuleBundle — deep voices minChordDurationBars', testSevenVoicesMinChordDurationBars],
    ['VoiceRuleBundle — unknown id falls back to neutral default', testFallbackMatchesNeutralDefault],
    ['VoiceRuleBundle — hv: prefix normalizes id', testHvPrefixStrips],
    ['VoiceRuleBundle — resolvable bundles satisfy interface shape', testResolvableBundlesSatisfyShape],
    ['VoiceRuleBundle — gil_evans golden path spread floor + bass echo', testGilEvansGoldenPathVoiceBundleAndSpread],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
