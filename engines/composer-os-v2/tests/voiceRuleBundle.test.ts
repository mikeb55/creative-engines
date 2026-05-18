/**
 * VoiceRuleBundle compiler + gil_evans golden-path wiring (additive smoke suite).
 */

import { getVoiceRuleBundle, NEUTRAL_VOICE_RULE_BUNDLE } from '../core/composer/voiceRuleBundles';
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
        lg.contrapuntalLinePolicy?.independenceLevel === 'maximum' &&
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
        es.bassPolicy.role === 'pedal-or-static' &&
        es.melodicPolicy.contour === 'stepwise-modal' &&
        es.formPolicy.narrativeArc === 'non-teleological' &&
        es.rhythmPolicy.antiMetric === false &&
        es.parallelChordsEnabled === true &&
        es.unresolvedDominantEnabled === true &&
        es.furnitureModeEnabled === true &&
        es.ironicStyleSwitchEnabled === true &&
        es.tintinnabuliEnabled === false &&
        es.sacredProfile === false &&
        (es.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 30 &&
        Boolean(es.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_POLICY_01'))) &&
        Boolean(es.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_HARM_PAL_01'))) &&
        Boolean(es.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_RHY_FURN_01'))) &&
        Boolean(es.orchestrationPolicy.fingerprintReceipts?.some((r) => r.startsWith('ES_DIFF_DEB_01'))) &&
        getVoiceRuleBundle('erik_satie').voiceId === 'satie' &&
        getVoiceRuleBundle('gymnopedies').voiceId === 'satie' &&
        getVoiceRuleBundle('furniture_music').voiceId === 'satie'
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

export function runVoiceRuleBundleTests(): { name: string; ok: boolean }[] {
  return [
    ['VoiceRuleBundle — deep voices minChordDurationBars', testSevenVoicesMinChordDurationBars],
    ['VoiceRuleBundle — unknown id falls back to neutral default', testFallbackMatchesNeutralDefault],
    ['VoiceRuleBundle — hv: prefix normalizes id', testHvPrefixStrips],
    ['VoiceRuleBundle — resolvable bundles satisfy interface shape', testResolvableBundlesSatisfyShape],
    ['VoiceRuleBundle — gil_evans golden path spread floor + bass echo', testGilEvansGoldenPathVoiceBundleAndSpread],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
