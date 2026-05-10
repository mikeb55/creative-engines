/**
 * Composer OS V2 — smoke tier (~fast allowlist).
 * Runs a short fixed list of existing `run*Tests` entrypoints (no duplicate assertions).
 *
 * When you add/remove suites or change row counts: run `npm run test:composer-smoke` from repo root, read
 * `Passed: N` in the smoke summary, then sync **N** + suite count into `CLAUDE.md` and `docs/COMPOSER_OS_ROADMAP.md`
 * Current (see roadmap § **Smoke tier — maintenance checklist**): aggregate **240** PASS rows, **56** suites (2026-05-10).
 */

import { runReadinessTests } from './readiness.test';
import { runConductorTests } from './conductor.test';
import { runAppApiBoundaryTests } from './appApiBoundary.test';
import { runChordSymbolMusicXmlHarmonyTests } from './chordSymbolMusicXmlHarmony.test';
import { runIndieGuitar2SongModeChordEventQualityTests } from './indieGuitar2SongModeChordEventQuality.test';
import { runBrianWilsonPetSoundsSliceSmokeTests } from './brianWilsonPetSoundsSliceSmoke.test';
import { runStevieWonderSliceSmokeTests } from './stevieWonderSliceSmoke.test';
import { runRadioheadSliceSmokeTests } from './radioheadSliceSmoke.test';
import { runJamesBrownSliceSmokeTests } from './jamesBrownSliceSmoke.test';
import { runJoniMitchellSliceSmokeTests } from './joniMitchellSliceSmoke.test';
import { runSonicYouthSliceSmokeTests } from './sonicYouthSliceSmoke.test';
import { runPatMethenySliceSmokeTests } from './patMethenySliceSmoke.test';
import { runWayneShorterSliceSmokeTests } from './wayneShorterSliceSmoke.test';
import { runJimHallSliceSmokeTests } from './jimHallSliceSmoke.test';
import { runSteveReichSliceSmokeTests } from './steveReichSliceSmoke.test';
import { runFrankZappaSliceSmokeTests } from './frankZappaSliceSmoke.test';
import { runOddMeterInfrastructureSmokeTests } from './oddMeterInfrastructureSmoke.test';
import { runAsymmetricRhythmIntegrationTests } from './asymmetricRhythmIntegration.test';
import { runZappaSoloSmokeTests } from './zappasoloSmoke.test';
import { runBarryHarrisSliceSmokeTests } from './barryHarrisSliceSmoke.test';
import { runBillEvansSliceSmokeTests } from './billEvansSliceSmoke.test';
import { runBacharachSliceSmokeTests } from './bacharachSliceSmoke.test';
import { runDonaldFagenSliceSmokeTests } from './donaldFagenSliceSmoke.test';
import { runEcmChamberSliceSmokeTests } from './ecmChamberSliceSmoke.test';
import { runJobimSliceSmokeTests } from './jobimSliceSmoke.test';
import { runHerbieHancockSliceSmokeTests } from './herbieHancockSliceSmoke.test';
import { runSondheimSliceSmokeTests } from './sondheimSliceSmoke.test';
import { runKateBushSliceSmokeTests } from './kateBushSliceSmoke.test';
import { runTheloniousMonkSliceSmokeTests } from './theloniousMonkSliceSmoke.test';
import { runJohnColtraneSliceSmokeTests } from './johnColtraneSliceSmoke.test';
import { runAndrewHillSliceSmokeTests } from './andrewHillSliceSmoke.test';
import { runCharlieParkerSliceSmokeTests } from './charlieParkerSliceSmoke.test';
import { runThadJonesSliceSmokeTests } from './thadJonesSliceSmoke.test';
import { runEcmChamberVariantSweepTests } from './ecmChamberVariantSweep.test';
import { runAlternateGuitarTuningsTests } from './alternateGuitarTunings.test';
import { runImportHarmonyEnsembleSmokeTests } from './importHarmonyEnsembleSmoke.test';
import { runZappaStringQuartetSmokeTests } from './zappaStringQuartetSmoke.test';
import { runDrumGuideExportSmokeTests } from './drumGuideExportSmoke.test';
import { runZappaBigBandSmokeTests } from './zappaBigBandSmoke.test';
import { runUniversalLeadSheetRepeatSmokeTests } from './universalLeadSheetBuilder.test';
import { runVocalMelodySmokeTests } from './vocalMelodySmoke.test';
import { runRealBookStressTests } from './realBookStressTest.test';
import { runSonicYouthTextureTests } from '../core/score-model/__tests__/sonicYouthTexture.test';
import { runEvaluationSmokeTests } from '../core/evaluation/evaluation.smoke.test';
import { runPhraseEngineV2SmokeTests } from './phraseEngineV2Smoke.test';
import { runPhraseEngineV2IntegrationTests } from './phraseEngineV2Integration.test';
import { runVaultQualitySmokeTests } from '../smoke/vaultQuality.smoke.test';
import { runVoiceRuleBundleTests } from './voiceRuleBundle.test';
import { runMusicXmlValidatorGateTests } from '../../../src/utils/musicXmlValidator.test';
import { runPhase67EnsembleGuitarEtudeTests } from './phase67EnsembleGuitarEtude.test';
import { runPhase67InstrumentGroupMusicXmlTests } from './phase67InstrumentGroupMusicXml.test';
import { runPhase8ImprovReharmStochasticCollisionTests } from './phase8ImprovReharmStochasticCollision.test';
import { runHarmonicSceneMotifShoutSmokeTests } from './harmonicSceneMotifShoutSmoke.test';
import { runFollowup4MingusSchneiderThreadgillSmokeTests } from './followup4MingusSchneiderThreadgillSmoke.test';
import { runFollowup5ShoutBrassInPlaceSmokeTests } from './followup5ShoutBrassInPlaceSmoke.test';
import { runHarmonySpineLockSmokeTests } from './harmonySpineLock.smoke.test';

type Row = { name: string; ok: boolean };

const smokeSuites: { label: string; run: () => Row[] }[] = [
  { label: 'Readiness', run: runReadinessTests },
  { label: 'Evaluation — Basie style profile structure', run: runEvaluationSmokeTests },
  { label: 'Phrase engine V2 — motif pool hook', run: runPhraseEngineV2SmokeTests },
  { label: 'Phrase engine V2 — integration (duo mock)', run: runPhraseEngineV2IntegrationTests },
  { label: 'Conductor', run: runConductorTests },
  { label: 'App API boundary', run: runAppApiBoundaryTests },
  { label: 'MusicXML harmony (kind/@text + degrees)', run: runChordSymbolMusicXmlHarmonyTests },
  { label: 'Universal lead sheet — repeatMarkers (import → parity)', run: runUniversalLeadSheetRepeatSmokeTests },
  { label: 'Vocal melody engine — composer profiles + lead sheet', run: runVocalMelodySmokeTests },
  { label: 'Real Book MusicXML stress (import timeline + universal + export)', run: runRealBookStressTests },
  { label: 'Alternate guitar tunings (zones + texture)', run: runAlternateGuitarTuningsTests },
  { label: 'Indie guitar_2 Song Mode comp (ChordEvent quality)', run: runIndieGuitar2SongModeChordEventQualityTests },
  { label: 'Brian Wilson Pet Sounds songwriter slice', run: runBrianWilsonPetSoundsSliceSmokeTests },
  { label: 'Stevie Wonder (1972–76) songwriter slice', run: runStevieWonderSliceSmokeTests },
  { label: 'Radiohead (OK Computer–era) songwriter slice', run: runRadioheadSliceSmokeTests },
  { label: 'James Brown songwriter slice', run: runJamesBrownSliceSmokeTests },
  { label: 'Joni Mitchell songwriter slice', run: runJoniMitchellSliceSmokeTests },
  { label: 'Sonic Youth songwriter slice', run: runSonicYouthSliceSmokeTests },
  { label: 'Sonic Youth texture + MusicXML augmentation', run: runSonicYouthTextureTests },
  { label: 'Pat Metheny songwriter slice', run: runPatMethenySliceSmokeTests },
  { label: 'Wayne Shorter songwriter slice', run: runWayneShorterSliceSmokeTests },
  { label: 'Jim Hall songwriter slice', run: runJimHallSliceSmokeTests },
  { label: 'Steve Reich songwriter slice', run: runSteveReichSliceSmokeTests },
  { label: 'Odd meter infrastructure (Phase A)', run: runOddMeterInfrastructureSmokeTests },
  { label: 'Asymmetric rhythm engine (preset → NoteEvent)', run: runAsymmetricRhythmIntegrationTests },
  { label: 'Zappa solo engine (Phase B)', run: runZappaSoloSmokeTests },
  { label: 'Frank Zappa songwriter slice', run: runFrankZappaSliceSmokeTests },
  { label: 'Barry Harris songwriter slice', run: runBarryHarrisSliceSmokeTests },
  { label: 'Bill Evans songwriter slice', run: runBillEvansSliceSmokeTests },
  { label: 'Bacharach songwriter slice', run: runBacharachSliceSmokeTests },
  { label: 'Donald Fagen songwriter slice', run: runDonaldFagenSliceSmokeTests },
  { label: 'ECM Chamber songwriter slice', run: runEcmChamberSliceSmokeTests },
  { label: 'Antônio Carlos Jobim songwriter slice', run: runJobimSliceSmokeTests },
  { label: 'Herbie Hancock songwriter slice', run: runHerbieHancockSliceSmokeTests },
  { label: 'Stephen Sondheim songwriter slice', run: runSondheimSliceSmokeTests },
  { label: 'Kate Bush songwriter slice', run: runKateBushSliceSmokeTests },
  { label: 'Thelonious Monk songwriter slice', run: runTheloniousMonkSliceSmokeTests },
  { label: 'John Coltrane songwriter slice', run: runJohnColtraneSliceSmokeTests },
  { label: 'Andrew Hill songwriter slice', run: runAndrewHillSliceSmokeTests },
  { label: 'Charlie Parker songwriter slice', run: runCharlieParkerSliceSmokeTests },
  { label: 'Thad Jones songwriter slice', run: runThadJonesSliceSmokeTests },
  { label: 'ECM chamber variant sweep (OOM guard)', run: runEcmChamberVariantSweepTests },
  { label: 'Import harmony ensemble (Big Band / String Quartet)', run: runImportHarmonyEnsembleSmokeTests },
  { label: 'Zappa String Quartet (SQ slice + odd meter)', run: runZappaStringQuartetSmokeTests },
  { label: 'SD3 drum guide export (MIDI + JSON sidecar)', run: runDrumGuideExportSmokeTests },
  { label: 'Zappa Big Band (FZ harmony + Zappa Classic meter)', run: runZappaBigBandSmokeTests },
  { label: 'Tonality Vault quality (inspector, riff modes, LSM, reharm, BB routing, rule sets)', run: runVaultQualitySmokeTests },
  { label: 'VoiceRuleBundle compiler + gil_evans wiring', run: runVoiceRuleBundleTests },
  { label: 'MusicXML stringsync gate (order + displayOctave)', run: runMusicXmlValidatorGateTests },
  { label: 'Phase 6+7 — ensemble / guitar / étude helpers', run: runPhase67EnsembleGuitarEtudeTests },
  { label: 'Phase 6+7 — instrumentGroup MusicXML (quartet + guitar TAB)', run: runPhase67InstrumentGroupMusicXmlTests },
  { label: 'Phase 8 — improv + reharm + stochastic + collision', run: runPhase8ImprovReharmStochasticCollisionTests },
  { label: 'Harmony spine LOCK harness (mismatch throws)', run: runHarmonySpineLockSmokeTests },
  { label: 'HarmonicScene motif filter + shout/outro energy', run: runHarmonicSceneMotifShoutSmokeTests },
  { label: 'Follow-up 4 — Mingus overlay + activeMotifIds + shout export', run: runFollowup4MingusSchneiderThreadgillSmokeTests },
  { label: 'Follow-up 5 — shout-chorus in-place brass merge', run: runFollowup5ShoutBrassInPlaceSmokeTests },
];

function toRows(results: { name: string; ok: boolean }[] | { ok: boolean; name: string }[]): Row[] {
  return results.map((r) => ({ name: r.name, ok: r.ok }));
}

function main(): void {
  console.log('[smoke] Composer OS v2 — tier=smoke (fixed allowlist)\n');

  let passed = 0;
  let failed = 0;

  for (const suite of smokeSuites) {
    const t0 = Date.now();
    const rows = toRows(suite.run());
    console.log(`=== ${suite.label} (${Date.now() - t0}ms) ===`);
    for (const r of rows) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        passed++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        failed++;
      }
    }
  }

  console.log('\n=== Smoke summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
  console.log('\nCOMPOSER OS V2 SMOKE: PASS');
}

main();
