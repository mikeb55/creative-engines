function runSongStructure(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || songModeDefaultTitleFromSongwriter(req);
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const musicXmlSourceRaw =
    typeof req.musicXmlSource === 'string' ? req.musicXmlSource.trim() : '';
  let musicXmlHarmonyPiped: string | undefined;
  let musicXmlParsedLeadSheet: LeadSheet | undefined;
  if (musicXmlSourceRaw.length > 0) {
    const mxChart = parseMusicXml(musicXmlSourceRaw);
    musicXmlParsedLeadSheet = parsedChartToLeadSheet(mxChart);
    musicXmlHarmonyPiped = mxChart.harmonies.join('|');
  }
  const secondarySw =
    typeof req.secondarySongwriterStyle === 'string' && req.secondarySongwriterStyle.trim() !== ''
      ? req.secondarySongwriterStyle.trim()
      : undefined;
  const authorOv =
    typeof req.authorOverlay === 'string' && req.authorOverlay.trim() !== '' ? req.authorOverlay.trim() : undefined;
  const classicalOv =
    typeof req.classicalOverlay === 'string' && req.classicalOverlay.trim() !== ''
      ? req.classicalOverlay.trim()
      : undefined;
  const barTarget = clampSongFormBarCount(req.totalBars, 32);
  const primarySongwriterNormalized =
    typeof req.primarySongwriterStyle === 'string' ? req.primarySongwriterStyle.trim().toLowerCase() : '';
  const leadSheetXmlInput = typeof req.songModeLeadSheetMusicXml === 'string' ? req.songModeLeadSheetMusicXml.trim() : '';
  const deepImportXmlInput = leadSheetXmlInput.length > 0 ? leadSheetXmlInput : musicXmlSourceRaw;
  const importedSongResult =
    !req.song && deepImportXmlInput.length > 0
      ? importMusicXmlToImportedSong(deepImportXmlInput, {
          id: `musicxml_import_${effectiveSeed}`,
          title,
          targetTotalBars: req.totalBars,
        })
      : undefined;
  const importedSongHasExplicitSections =
    importedSongResult?.deepImport.sectionStarts.some((s) => s.bar !== 1 || s.label !== 'A') ?? false;
  const effectiveSong =
    req.song ?? (req.importHarmonyMode !== 'free_harmony' && importedSongHasExplicitSections ? importedSongResult?.song : undefined);
  const normalizedGrooveScaffold = normalizeGrooveScaffoldRequest(req);
  const effectiveSongModeBarTarget = importedSongResult?.song.totalBars ?? barTarget;
  const isLeadSheetPhase1WriterRoute = isLeadSheetSongModeWriter(primarySongwriterNormalized);
  const perfBlendRaw =
    typeof req.leadSheetPerformanceBlend === 'number' && Number.isFinite(req.leadSheetPerformanceBlend)
      ? Math.min(1, Math.max(0, req.leadSheetPerformanceBlend))
      : undefined;
  const modeExplicitlyProvided = req.importHarmonyMode !== undefined;
  const normalizedImportHarmonyMode = normalizeImportHarmonyMode(req.importHarmonyMode);
  const importHarmonyModeSource: 'defaulted' | 'explicit' = modeExplicitlyProvided ? 'explicit' : 'defaulted';
  const harmonyBlendRaw = normalizeHarmonyBlendRaw(req.harmonyBlend);
  const alternateGuitarTuningNormalized = normalizeAlternateGuitarTuningRequest(req.alternateGuitarTuning);
  /** Fixture path must populate metadata `alternateGuitarTuning.mode === 'separate'` so MusicXML validation uses dual-guitar checks (no bass part). */
  const alternateGuitarTuningForGoldenPath: AlternateGuitarTuningResolved | undefined =
    indieDualGuitarTuningProofFixtureRequested(req)
      ? normalizeAlternateGuitarTuningRequest({
          mode: 'separate',
          guitar1: { presetId: 'drop_d' },
          guitar2: { presetId: 'dadgad' },
        }) ?? undefined
      : alternateGuitarTuningNormalized ?? undefined;
  const genCorr = req.__generateCorrelationId;
  if (typeof genCorr === 'string' && genCorr.length > 0) {
    console.log('[GEN-CORR] runSongStructure:post-normalize', {
      corr: genCorr,
      alternateGuitarTuningNormalized,
      indieDualElectric:
        req.styleProfile === 'STYLE_INDIE_ART_POP' &&
        indieArtPopAlternateTuningWantsDualElectricGuitars(alternateGuitarTuningNormalized ?? undefined),
    });
  }
  const lockHarmonyRequested = normalizedImportHarmonyMode === 'lock_harmony';
  const blendHarmonyRequested = normalizedImportHarmonyMode === 'blend_harmony';
  let importHarmonyLockApplied = false;
  let importHarmonyLockFallbackReason:
    | 'mode_not_lock'
    | 'no_musicxml_input'
    | 'musicxml_parse_failed'
    | 'timeline_missing'
    | 'timeline_empty'
    | 'timeline_unusable'
    | 'not_song_mode'
    | undefined;
  let importHarmonyLockedBarsCount: number | undefined;
  const shouldParseLeadSheetInput =
    leadSheetXmlInput.length > 0 &&
    (isLeadSheetPhase1WriterRoute || lockHarmonyRequested || blendHarmonyRequested);
  const leadSheetAdapted =
    shouldParseLeadSheetInput
      ? adaptLeadSheetMusicXmlForSongMode(leadSheetXmlInput, effectiveSongModeBarTarget, {
          leadSheetPerformanceBlend: perfBlendRaw,
        })
      : undefined;
  const leadSheetAnchorsOnly =
    isLeadSheetPhase1WriterRoute && leadSheetXmlInput.length > 0
      ? extractLeadSheetMelodyAnchorsFromMusicXml(leadSheetXmlInput, effectiveSongModeBarTarget, {
          leadSheetPerformanceBlend: perfBlendRaw,
        })
      : undefined;
  const leadSheetMelodyAnchors = leadSheetAdapted?.melodyAnchors?.length
    ? leadSheetAdapted.melodyAnchors
    : leadSheetAnchorsOnly?.melodyAnchors;
  const useLeadSheetHarmony =
    isLeadSheetPhase1WriterRoute && leadSheetAdapted?.ok === true && !!leadSheetAdapted.lockedChordBars?.length;
  const timelineLock =
    (lockHarmonyRequested || blendHarmonyRequested) && leadSheetAdapted?.ok && leadSheetAdapted.leadSheet
      ? extractLockedHarmonyBarsFromImportedTimeline(leadSheetAdapted.leadSheet, effectiveSongModeBarTarget)
      : undefined;
  if (lockHarmonyRequested) {
    if (leadSheetXmlInput.length === 0) {
      importHarmonyLockFallbackReason = 'no_musicxml_input';
    } else if (!leadSheetAdapted?.ok) {
      importHarmonyLockFallbackReason = 'musicxml_parse_failed';
    } else if (timelineLock?.ok) {
      importHarmonyLockApplied = true;
      importHarmonyLockedBarsCount = timelineLock.lockedChordBars?.length;
      importHarmonyLockFallbackReason = undefined;
    } else {
      importHarmonyLockFallbackReason = timelineLock?.fallbackReason ?? 'timeline_unusable';
    }
  }
  if (blendHarmonyRequested) {
    if (leadSheetXmlInput.length === 0) {
      importHarmonyLockFallbackReason = 'no_musicxml_input';
    } else if (!leadSheetAdapted?.ok) {
      importHarmonyLockFallbackReason = 'musicxml_parse_failed';
    } else if (!timelineLock?.ok) {
      importHarmonyLockFallbackReason = timelineLock?.fallbackReason ?? 'timeline_unusable';
    }
  }
  if (leadSheetAdapted && !leadSheetAdapted.ok && leadSheetAdapted.errors.length > 0) {
    console.warn('[Song Mode LeadSheet] Phase 1 writer input ignored:', leadSheetAdapted.errors.join(' | '));
  }
  if (timelineLock?.warnings?.length) {
    const tag = lockHarmonyRequested ? 'lock_harmony' : blendHarmonyRequested ? 'blend_harmony' : 'import_harmony';
    console.warn(`[Song Mode ${tag}] Imported timeline warnings:`, timelineLock.warnings.join(' | '));
  }
  const importedLeadSheetForSongMode =
    leadSheetAdapted?.ok === true && leadSheetAdapted.leadSheet ? leadSheetAdapted.leadSheet : undefined;
  const musicXmlLeadSheetForSongMode =
    isLeadSheetPhase1WriterRoute &&
    leadSheetXmlInput.length === 0 &&
    musicXmlSourceRaw.length > 0 &&
    musicXmlParsedLeadSheet
      ? musicXmlParsedLeadSheet
      : undefined;
  const sm = runSongMode({
    seed: effectiveSeed,
    title,
    totalBars: effectiveSongModeBarTarget,
    leadSheet: importedLeadSheetForSongMode,
    musicXmlLeadSheet: musicXmlLeadSheetForSongMode,
    primarySongwriterStyle: req.primarySongwriterStyle,
    secondarySongwriterStyle: secondarySw,
    authorOverlay: authorOv as AuthorRuleId | undefined,
    beatlesFormTemplate: req.beatlesFormTemplate,
    beatlesMelodicLens: req.beatlesMelodicLens,
    radioheadMelodicContext: req.radioheadMelodicContext,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
  });
  const songModeCompiledSectionForm =
    sm.compiledSong.chordPlan?.map((p) => ({
      kind: p.sectionKind,
      barLength: p.chordSymbols.length,
    })) ?? [];
  let expectedSongFormBars: number = effectiveSongModeBarTarget;
  if (req.formId != null) {
    const formBarSum = resolveFormSections(req.formId as FormId).reduce((sum, s) => sum + s.length, 0);
    if (formBarSum > 0) {
      expectedSongFormBars = formBarSum;
    }
  }

  const songwriterChordText = sm.compiledSong.chordPlan?.length
    ? chordPlanToProgressionText(sm.compiledSong.chordPlan)
    : undefined;

  const primarySongwriterSet =
    typeof req.primarySongwriterStyle === 'string' && req.primarySongwriterStyle.trim().length > 0;

  const rawCustomHarmony =
    musicXmlHarmonyPiped && musicXmlHarmonyPiped.length > 0
      ? musicXmlHarmonyPiped
      : typeof req.chordProgressionText === 'string'
        ? req.chordProgressionText.trim()
        : importedSongResult?.lockedHarmonyBars.length && req.importHarmonyMode !== 'free_harmony'
          ? importedSongResult.lockedHarmonyBars.join('|')
          : '';
  const useLockedCustomHarmony = rawCustomHarmony.length > 0 && !useLeadSheetHarmony;
  let lockedHarmonyBarsAuthoritative: string[] | undefined;
  if (useLockedCustomHarmony) {
    if (process.env.COMPOSER_OS_SONG_MODE_CHORD_DEBUG === '1') {
      const norm = normalizeChordProgressionSeparators(rawCustomHarmony);
      const rawBars = norm.split('|').map((s) => s.trim()).filter(Boolean);
      console.log('[Song Mode chord debug]', {
        rawLength: rawCustomHarmony.length,
        rawHead: rawCustomHarmony.slice(0, 240),
        normalizedHead: norm.slice(0, 240),
        normalizedBarCount: rawBars.length,
      });
    }
    const altCounts =
      req.totalBars && req.totalBars !== barTarget ? [req.totalBars] : undefined;
    const parsedHarmony = parseChordProgressionInputWithBarCount(
      rawCustomHarmony,
      expectedSongFormBars,
      altCounts
    );
    if (!parsedHarmony.ok) {
      return {
        success: false,
        error: parsedHarmony.error,
        productKind: 'musicxml',
        composerOsVersion: COMPOSER_OS_VERSION,
        chordProgressionParseFailed: true,
        validation: validationForStructural(false, [parsedHarmony.error]),
        runManifest: {
          seed: effectiveSeed,
          presetId: 'song_mode',
          activeModules: ['song_mode_compile'],
          timestamp: ts,
          scoreTitle: title,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
        },
        scoreTitle: title,
        requestEcho: requestEchoFromReq(req),
      };
    }
    lockedHarmonyBarsAuthoritative = [...parsedHarmony.bars];
  }

  let songwriterLockedBars: string[] | undefined;
  if (
    primarySongwriterSet &&
    !useLockedCustomHarmony &&
    songwriterChordText &&
    songwriterChordText.trim().length > 0 &&
    !indieDualGuitarTuningProofFixtureRequested(req)
  ) {
    const altCountsSong =
      req.totalBars && req.totalBars !== barTarget ? [req.totalBars] : undefined;
    const tokens = songwriterChordText.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const padded = tokens.slice(0, expectedSongFormBars);
      while (padded.length < expectedSongFormBars) {
        padded.push(tokens[padded.length % tokens.length]!);
      }
      const piped = padded.join('|');
      const chk = parseChordProgressionInputWithBarCount(
        piped,
        expectedSongFormBars,
        altCountsSong
      );
      if (chk.ok) {
        songwriterLockedBars = [...chk.bars];
      }
    }
  }

  /**
   * Without user paste, do not feed the 8-bar song scaffold (verse: Cmaj7â†’Am7â†’Fmaj7â†’G7) into duo32 as
   * `custom` â€” runGoldenPath would tile it Ã—4 and bar 2 becomes Am7 instead of any real progression.
   * Use builtin long-form harmony instead until the user supplies 32 pasted bars.
   */
  const lf = resolveLongFormRoute('guitar_bass_duo', {
    totalBars: clampSongFormBarCount(req.totalBars, 32),
    longFormEnabled: req.longFormEnabled ?? true,
  });
  const useBuiltinLongFormWithoutUserPaste =
    !useLockedCustomHarmony && (lf.kind === 'duo32' || lf.kind === 'duo16');
  const duoBuiltFallbackText = buildChordProgressionTextForDuoFromCompiledSong(sm.compiledSong);
  let chordProgressionText = useLockedCustomHarmony
    ? rawCustomHarmony
    : useBuiltinLongFormWithoutUserPaste
      ? undefined
      : duoBuiltFallbackText;
  let harmonyModeForRun: 'builtin' | 'custom' | 'custom_locked' = useLockedCustomHarmony
    ? 'custom_locked'
    : useBuiltinLongFormWithoutUserPaste
      ? 'builtin'
      : 'custom';

  const blendHarmonyEffective = harmonyBlendRaw ?? 0;
  const importedTimelineBars =
    timelineLock?.ok && timelineLock.lockedChordBars?.length ? timelineLock.lockedChordBars : undefined;
  const applyImportedTimelineFully =
    !useLockedCustomHarmony &&
    !!importedTimelineBars &&
    (importHarmonyLockApplied || (blendHarmonyRequested && blendHarmonyEffective >= 1));

  if (applyImportedTimelineFully) {
    lockedHarmonyBarsAuthoritative = [...importedTimelineBars];
    chordProgressionText = lockedHarmonyBarsAuthoritative.join('|');
    harmonyModeForRun = 'custom_locked';
  } else if (!useLockedCustomHarmony && useLeadSheetHarmony) {
    lockedHarmonyBarsAuthoritative = [...(leadSheetAdapted?.lockedChordBars ?? [])];
    chordProgressionText = lockedHarmonyBarsAuthoritative.join('|');
    harmonyModeForRun = 'custom_locked';
  } else if (!useLockedCustomHarmony && songwriterLockedBars && songwriterLockedBars.length > 0) {
    chordProgressionText = songwriterLockedBars.join('|');
    harmonyModeForRun = 'custom_locked';
    lockedHarmonyBarsAuthoritative = songwriterLockedBars;
  }

  const blendMergeActive =
    !useLockedCustomHarmony &&
    blendHarmonyRequested &&
    !!importedTimelineBars &&
    blendHarmonyEffective > 0 &&
    blendHarmonyEffective < 1;

  if (blendMergeActive) {
    const altCountsSong =
      req.totalBars && req.totalBars !== barTarget ? [req.totalBars] : undefined;
    const genBars = flattenSongModeHarmonySelectionToBars({
      expectedSongFormBars,
      harmonyModeForRun,
      chordProgressionText,
      lockedHarmonyBarsAuthoritative,
      duoBuiltProgressionFallback: duoBuiltFallbackText,
      altChordBarCounts: altCountsSong,
    });
    const impBars = importedTimelineBars.slice(0, expectedSongFormBars);
    if (
      genBars &&
      genBars.length === expectedSongFormBars &&
      impBars.length === expectedSongFormBars
    ) {
      const merged = mergeSongModeImportedAndGeneratedHarmonyBars(genBars, impBars, blendHarmonyEffective);
      lockedHarmonyBarsAuthoritative = merged;
      chordProgressionText = merged.join('|');
      harmonyModeForRun = 'custom_locked';
    }
  }
  logSongModeHarmonyDebug({
    layer: 'composerOsAppGeneration:runSongStructure',
    uiChordProgressionChars: rawCustomHarmony.length,
    useLockedCustomHarmony,
    harmonyMode: harmonyModeForRun,
    songModeLeadSheetApplied: useLeadSheetHarmony,
    totalBars: clampSongFormBarCount(req.totalBars, 32),
    longFormEnabled: req.longFormEnabled ?? true,
  });
  const universalRepeatTruthBars =
    sm.universalLeadSheet.source === 'imported_musicxml' &&
    typeof sm.universalLeadSheet.totalBars === 'number' &&
    Number.isFinite(sm.universalLeadSheet.totalBars) &&
    sm.universalLeadSheet.totalBars >= 1
      ? Math.floor(sm.universalLeadSheet.totalBars)
      : undefined;
  const resolvedSongModeTotalBars = universalRepeatTruthBars ?? effectiveSongModeBarTarget;
  const songForGoldenPath = normalizedGrooveScaffold
    ? effectiveSong
      ? withGrooveScaffoldSettings(effectiveSong, normalizedGrooveScaffold)
      : normalizedGrooveScaffold.enabled
        ? buildGrooveScaffoldSongFromChordPlan({
            title,
            totalBars: resolvedSongModeTotalBars,
            bpm: req.bpm,
            chordPlan: sm.compiledSong.chordPlan ?? [],
            grooveScaffold: normalizedGrooveScaffold,
          })
        : undefined
    : effectiveSong;
  const songModeGoldenPathOptions: RunGoldenPathOptions = {
    styleStack: mapAppStyleStackToEngine(req.styleStack),
    presetId: 'guitar_bass_duo',
    scoreTitle: title,
    songModeHookFirstIdentity: true,
    /** Explicit default matches UI default when `styleProfile` omitted (legacy clients). */
    styleProfile:
      req.styleProfile ??
      defaultStyleProfileForPrimarySongwriter(req.primarySongwriterStyle) ??
      'STYLE_ECM',
    ...(req.ecmChamberMode === 'angel_song' ||
    req.ecmChamberMode === 'balanced' ||
    req.ecmChamberMode === 'metheny_scofield'
      ? { ecmChamberMode: req.ecmChamberMode }
      : {}),
    harmonyMode: harmonyModeForRun,
    chordProgressionText,
    ...(lockedHarmonyBarsAuthoritative
      ? {
          lockedHarmonyBarsRaw: lockedHarmonyBarsAuthoritative,
          parsedChordBars: lockedHarmonyBarsAuthoritative,
        }
      : {}),
    totalBars: resolvedSongModeTotalBars,
    longFormEnabled: req.longFormEnabled ?? true,
    keySignatureMode: req.keySignatureMode,
    tonalCenterOverride: req.tonalCenterOverride,
    tonalCenter: req.tonalCenter,
    variationEnabled: req.variationEnabled === true ? true : undefined,
    creativeControlLevel: req.creativeControlLevel,
    intent: req.intent,
    c4Strength: req.c4Strength,
    songModeJamesBrownFunkOverlay: req.songModeJamesBrownFunkOverlay === true ? true : undefined,
    blendStrength: req.blendStrength ?? 'medium',
    ...(req.duoIntent === 'conversational' || req.duoIntent === 'supportive'
      ? { duoIntent: req.duoIntent }
      : {}),
    ...(req.chromaticStrength === 'off' ||
    req.chromaticStrength === 'subtle' ||
    req.chromaticStrength === 'prominent'
      ? { chromaticStrength: req.chromaticStrength }
      : {}),
    primarySongwriterStyle: req.primarySongwriterStyle,
    songModeLeadSheetMelodyAnchors: leadSheetMelodyAnchors,
    leadSheetPerformanceBlend: perfBlendRaw,
    importHarmonyMode: normalizedImportHarmonyMode,
    harmonyBlend: harmonyBlendRaw,
    secondarySongwriterStyle: secondarySw,
    authorOverlay: authorOv,
    classicalOverlay: classicalOv,
    alternateGuitarTuning: alternateGuitarTuningForGoldenPath,
    era: req.stylePairing?.era ?? undefined,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
    ...(indieDualGuitarTuningProofFixtureRequested(req)
      ? { debugFixtureMode: 'indie_dual_guitar_tuning_proof' as const }
      : {}),
    ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
    ...(songForGoldenPath ? { song: songForGoldenPath } : {}),
    ...(req.zappaGceAutoBarMeterMapEnabled === true ? { zappaGceAutoBarMeterMapEnabled: true } : {}),
    ...(req.zappaGceMeterMode === 'disrupt' ||
    req.zappaGceMeterMode === 'respect' ||
    req.zappaGceMeterMode === 'own'
      ? { zappaGceMeterMode: req.zappaGceMeterMode }
      : {}),
    ...(req.primarySongwriterStyle?.trim().toLowerCase() === 'frank_zappa'
      ? {
          zappaSoloMidiLow: req.zappaSoloMidiLow,
          zappaSoloMidiHigh: req.zappaSoloMidiHigh,
          zappaSoloDensity: req.zappaSoloDensity,
          zappaSoloDissonance: req.zappaSoloDissonance,
          frankZappaContext: req.frankZappaContext,
          ...(req.zappaStyleMode === 'compositional' || req.zappaStyleMode === 'bluesrockFerocious'
            ? { zappaStyleMode: req.zappaStyleMode }
            : {}),
        }
      : {}),
    ...(req.primarySongwriterStyle?.trim().toLowerCase() === 'miles_davis'
      ? { milesDavisContext: req.milesDavisContext }
      : {}),
    ...(req.primarySongwriterStyle?.trim().toLowerCase() === 'bartok'
      ? { bartokContext: req.bartokContext }
      : {}),
    ...(req.primarySongwriterStyle?.trim().toLowerCase() === 'gershwin'
      ? { gershwinContext: req.gershwinContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'arvo_part'
      ? {
          arvoPartContext: req.arvoPartContext,
          ...(req.arvoPartTintinnabuli ? { arvoPartTintinnabuli: req.arvoPartTintinnabuli } : {}),
        }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'prince'
      ? { princeContext: req.princeContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'beatles'
      ? {
          beatlesContext: req.beatlesContext,
          beatlesMelodicLens: req.beatlesMelodicLens,
          ...(req.beatlesFormTemplate === 'vv_br_v' ||
          req.beatlesFormTemplate === 'verse_chorus' ||
          req.beatlesFormTemplate === 'legacy_vc'
            ? { beatlesFormTemplate: req.beatlesFormTemplate }
            : {}),
        }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'radiohead' &&
    (req.radioheadMelodicContext === 'acoustic' || req.radioheadMelodicContext === 'electronic')
      ? { radioheadMelodicContext: req.radioheadMelodicContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'fela_kuti'
      ? {
          felaKutiContext: req.felaKutiContext,
          ...(req.felaPercussionFeelOverride === 'straight' ||
          req.felaPercussionFeelOverride === 'swing' ||
          req.felaPercussionFeelOverride === 'afrobeat'
            ? { felaPercussionFeelOverride: req.felaPercussionFeelOverride }
            : {}),
        }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'bernard_herrmann'
      ? { bernardHerrmannContext: req.bernardHerrmannContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'john_williams'
      ? { johnWilliamsContext: req.johnWilliamsContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'ennio_morricone'
      ? { ennioMorriconeContext: req.ennioMorriconeContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'nino_rota'
      ? { ninoRotaContext: req.ninoRotaContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'jerry_goldsmith'
      ? { jerryGoldsmithContext: req.jerryGoldsmithContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'philip_glass'
      ? { philipGlassContext: req.philipGlassContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'steve_reich'
      ? { reichProcess: req.reichProcess }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'messiaen' &&
    (req.messiaenPeriodMode === 'early_messiaen' ||
      req.messiaenPeriodMode === 'middle_messiaen' ||
      req.messiaenPeriodMode === 'late_messiaen')
      ? { messiaenPeriodMode: req.messiaenPeriodMode }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'bob_brookmeyer' &&
    (req.brookmeyerPeriodMode === 'early_brookmeyer' || req.brookmeyerPeriodMode === 'late_brookmeyer')
      ? { brookmeyerPeriodMode: req.brookmeyerPeriodMode }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'oliver_nelson' &&
    (req.nelsonPeriodMode === 'early_nelson' ||
      req.nelsonPeriodMode === 'middle_nelson' ||
      req.nelsonPeriodMode === 'late_nelson')
      ? { nelsonPeriodMode: req.nelsonPeriodMode }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'oliver_nelson' &&
    (req.nelsonBluesFormVariant === 'twelve_bar' || req.nelsonBluesFormVariant === 'sixteen_bar')
      ? { nelsonBluesFormVariant: req.nelsonBluesFormVariant }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'fripp_king_crimson'
      ? {
          ...(req.asymmetricRhythm ? { asymmetricRhythm: req.asymmetricRhythm } : {}),
          ...(typeof req.frippPolymeterSecondaryPresetId === 'string' && req.frippPolymeterSecondaryPresetId.trim()
            ? { frippPolymeterSecondaryPreset: req.frippPolymeterSecondaryPresetId.trim() }
            : {}),
        }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'hans_zimmer'
      ? { hansZimmerContext: req.hansZimmerContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'angelo_badalamenti'
      ? { angeloBadalamentiContext: req.angeloBadalamentiContext }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'thad_jones'
      ? { thadPhase: req.thadPhase }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'count_basie'
      ? {
          ...(req.basieTestamentMode === 'old_testament' || req.basieTestamentMode === 'new_testament'
            ? { basieTestamentMode: req.basieTestamentMode }
            : {}),
        }
      : {}),
    ...(normalizeSongwriterStyleKey(req.primarySongwriterStyle ?? '') === 'joni_mitchell'
      ? { joniPhase: req.joniPhase }
      : {}),
    ...(typeof req.formId === 'string' && req.formId.trim() ? { formId: req.formId.trim() as FormId } : {}),
    ...(songModeCompiledSectionForm.length > 0 ? { songModeCompiledSectionForm } : {}),
    ...(isClaveGridOverlayEnvEnabled() && req.claveGridOverlay ? { claveGridOverlay: req.claveGridOverlay } : {}),
  };

  const wantsSongModeSectionRegen =
    typeof req.sectionRegeneration?.baseMusicXml === 'string' &&
    req.sectionRegeneration.baseMusicXml.trim().length > 0 &&
    Array.isArray(lockedHarmonyBarsAuthoritative) &&
    lockedHarmonyBarsAuthoritative.length === resolvedSongModeTotalBars;

  if (
    req.sectionRegeneration?.baseMusicXml &&
    req.sectionRegeneration.baseMusicXml.trim().length > 0 &&
    !wantsSongModeSectionRegen
  ) {
    return {
      success: false,
      error:
        'Song Mode section regeneration requires lockedHarmonyBarsAuthoritative matching resolvedSongModeTotalBars (paste/custom_locked harmony).',
      productKind: 'musicxml',
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: validationForStructural(false, [
        'sectionRegeneration: full harmony lock bars required for splice validation',
      ]),
      runManifest: {
        seed: effectiveSeed,
        presetId: 'song_mode',
        activeModules: ['song_mode_compile'],
        timestamp: ts,
        scoreTitle: title,
        variationId: req.variationId,
        creativeControlLevel: req.creativeControlLevel,
      },
      scoreTitle: title,
      requestEcho: requestEchoFromReq(req),
    };
  }

  let gp: GoldenPathResult;
  let songModeSectionRegenApplied = false;

  if (wantsSongModeSectionRegen) {
    const regen = runSongModeSectionRegeneration(
      req,
      effectiveSeed,
      resolvedSongModeTotalBars,
      lockedHarmonyBarsAuthoritative!,
      songModeGoldenPathOptions
    );
    if (!regen.ok) {
      return {
        success: false,
        error: regen.error,
        productKind: 'musicxml',
        composerOsVersion: COMPOSER_OS_VERSION,
        validation: validationForStructural(false, [regen.error]),
        runManifest: {
          seed: effectiveSeed,
          presetId: 'song_mode',
          activeModules: ['song_mode_compile'],
          timestamp: ts,
          scoreTitle: title,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
        },
        scoreTitle: title,
        requestEcho: requestEchoFromReq(req),
      };
    }
    gp = regen.result;
    songModeSectionRegenApplied = true;
  } else {
    gp = runGoldenPath(effectiveSeed, songModeGoldenPathOptions);
  }

  gp.context.generationMetadata.importHarmonyMode = normalizedImportHarmonyMode;
  gp.context.generationMetadata.importHarmonyModeSource = importHarmonyModeSource;
  gp.context.generationMetadata.harmonyBlendRaw = harmonyBlendRaw;
  // Stage 4: free_harmony is documented default; policy version set in GenerationMetadata.
  gp.context.generationMetadata.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  gp.context.generationMetadata.importHarmonyLockApplied = importHarmonyLockApplied;
  gp.context.generationMetadata.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
  gp.context.generationMetadata.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
  gp.runManifest.importHarmonyMode = normalizedImportHarmonyMode;
  gp.runManifest.importHarmonyModeSource = importHarmonyModeSource;
  gp.runManifest.harmonyBlendRaw = harmonyBlendRaw;
  gp.runManifest.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  gp.runManifest.importHarmonyLockApplied = importHarmonyLockApplied;
  gp.runManifest.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
  gp.runManifest.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
  const resolvedSongModeStyle = sm.compiledSong.songwriting?.resolvedStyle;
  if (resolvedSongModeStyle) {
    gp.context.generationMetadata.songModeProfileRuleDiagnostics = {
      styleProfile: req.styleProfile ?? 'STYLE_ECM',
      primarySongwriterStyleId: resolvedSongModeStyle.primaryId,
      secondarySongwriterStyleId: resolvedSongModeStyle.secondaryId,
      authorOverlayId: resolvedSongModeStyle.authorOverlayId,
      classicalOverlayId: resolvedSongModeStyle.classicalOverlayId,
      styleFingerprint: resolvedSongModeStyle.styleFingerprint,
      resolvedRuleIds: resolvedSongModeStyle.resolvedRuleIds,
      songwriterCompProfileId: gp.context.generationMetadata.songModeSongwriterCompProfileId,
      bacharachSongModeRuleBundleId: gp.context.generationMetadata.bacharachSongModeRuleBundleId,
      behaviourSourceIds:
        gp.context.generationMetadata.songModeSectionBehaviourDescriptors?.map((d) => d.sliceId) ?? [],
    };
    gp.runManifest.songModeProfileRuleDiagnostics = gp.context.generationMetadata.songModeProfileRuleDiagnostics;
  }

  /** GCE ship gate â€” retry with deterministic seed offsets when below threshold (see `core/gce/gceGate.ts`). */
  const GCE_GATE_MAX_RETRIES = 3;
  const GCE_RETRY_SEED_OFFSETS = [77777, 88883, 99991] as const;

  let bestGceScore = -1;
  if (!songModeSectionRegenApplied && gp.xml && gp.score) {
    const gceResult = scoreGoldenPathResultForGce(gp.score, gp.context);
    bestGceScore = gceResult.overallScore;

    if (!gceResult.passed) {
      for (let i = 0; i < GCE_GATE_MAX_RETRIES; i++) {
        const retrySeed = effectiveSeed + GCE_RETRY_SEED_OFFSETS[i]!;
        const retryGp = runGoldenPath(retrySeed, songModeGoldenPathOptions);
        retryGp.context.generationMetadata.importHarmonyMode = normalizedImportHarmonyMode;
        retryGp.context.generationMetadata.importHarmonyModeSource = importHarmonyModeSource;
        retryGp.context.generationMetadata.harmonyBlendRaw = harmonyBlendRaw;
        retryGp.context.generationMetadata.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
        retryGp.context.generationMetadata.importHarmonyLockApplied = importHarmonyLockApplied;
        retryGp.context.generationMetadata.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
        retryGp.context.generationMetadata.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
        retryGp.runManifest.importHarmonyMode = normalizedImportHarmonyMode;
        retryGp.runManifest.importHarmonyModeSource = importHarmonyModeSource;
        retryGp.runManifest.harmonyBlendRaw = harmonyBlendRaw;
        retryGp.runManifest.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
        retryGp.runManifest.importHarmonyLockApplied = importHarmonyLockApplied;
        retryGp.runManifest.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
        retryGp.runManifest.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
        if (retryGp.xml && retryGp.score) {
          const retryGce = scoreGoldenPathResultForGce(retryGp.score, retryGp.context);
          if (retryGce.overallScore > bestGceScore) {
            bestGceScore = retryGce.overallScore;
            gp = retryGp;
          }
          if (retryGce.passed) break;
        }
      }
    }
  }
  if (!songModeSectionRegenApplied && gp.score) {
    const adjusted = applyRepeatTruthToScoreModel(gp.score, sm.universalLeadSheet);
    gp.score = adjusted;
    const mb = adjusted.parts[0]?.measures.length;
    if (mb !== undefined && gp.context.form) {
      gp.context.form.totalBars = mb;
    }
  }
  const runIdForTruth = `${tsSafe}_${effectiveSeed}`;
  if (isDesktopTruthDumpEnabled()) {
    logSongModeTruthDumpConsole({
      runId: runIdForTruth,
      songModeOutputDir: outputDir,
      req,
      harmonyModeForRun,
      rawCustomHarmony: rawCustomHarmony,
      lockedHarmonyBarsAuthoritative,
      gp,
    });
    writeSongModeDesktopTruthDump({
      runId: runIdForTruth,
      songModeOutputDir: outputDir,
      req,
      harmonyModeForRun,
      rawCustomHarmony: rawCustomHarmony,
      lockedHarmonyBarsAuthoritative,
      gp,
    });
  }
  const mdLockedTruth = gp.context.generationMetadata;
  const tbLockedTruth = gp.context.form.totalBars;
  const harmonyBarsForLockedAssertions =
    resolveEffectiveHarmonyTruth(mdLockedTruth, {
      totalBars: tbLockedTruth,
      expectedLength: lockedHarmonyBarsAuthoritative?.length,
      harmonyContext: gp.context.harmonyContext,
    }) ?? lockedHarmonyBarsAuthoritative;

  /** Compare score/XML only when Song Mode actually ran `custom_locked` (engine metadata), not when local parse arrays exist without lock wiring. */
  const songModeHarmonyLockAssertionsActive =
    mdLockedTruth.customHarmonyLocked === true &&
    gp.context.generationMetadata.sectionRegenerationPartialScore !== true &&
    lockedHarmonyBarsAuthoritative &&
    lockedHarmonyBarsAuthoritative.length >= 8 &&
    lockedHarmonyBarsAuthoritative.length === tbLockedTruth &&
    gp.context.lockedHarmonyBarsRaw &&
    gp.context.lockedHarmonyBarsRaw.length === tbLockedTruth &&
    !indieDualGuitarTuningProofFixtureRequested(req);

  if (songModeHarmonyLockAssertionsActive) {
    try {
      if (process.env.COMPOSER_OS_HARMONY_LOCK_COMPARE_DEBUG === '1') {
        console.log(
          '[SONG_MODE_HARMONY_LOCK_UPSTREAM]',
          JSON.stringify(
            {
              songwriterStyleId: mdLockedTruth.songwriterStyleId,
              lockedHarmonyBarsAuthoritative_from_runSongStructure:
                lockedHarmonyBarsAuthoritative ?? null,
              context_lockedHarmonyBarsRaw_same_as_options_wire:
                gp.context.lockedHarmonyBarsRaw ?? null,
              frankZappaEffectiveHarmonyBars_slice_post_compute:
                mdLockedTruth?.frankZappaEffectiveHarmonyBars ?? null,
              harmonyBarsForLockedAssertions_used_for_expected_side:
                harmonyBarsForLockedAssertions ?? null,
              note:
                'Expected side uses the generic effective-harmony truth registry; Frank Zappa still prefers harmonyContext bars when present.',
            },
            null,
            0
          )
        );
      }
      if (process.env.COMPOSER_OS_DESKTOP_IPC === '1') {
        for (let b = 1; b <= 4; b++) {
          const got = getChordForBar(b, gp.context);
          const exp = harmonyBarsForLockedAssertions![b - 1]!;
          if (!lockedHarmonyChordSymbolsEquivalent(got, exp)) {
            throw new Error(
              `DESKTOP SONG MODE HARMONY: bar ${b} resolved "${got}" !== pasted "${exp}" (authority check bars 1â€“4)`
            );
          }
        }
      }
      assertExportTruth({
        scoreModel: gp.score,
        exportedXml: gp.xml,
        effectiveBars: harmonyBarsForLockedAssertions,
        lockedBars: lockedHarmonyBarsAuthoritative,
        spineSymbols: buildSpineSymbolsForExportTruth(gp.context, tbLockedTruth),
        runMode: 'song',
        context: gp.context,
        routingWire: {
          harmonyMode: harmonyModeForRun,
          lockedHarmonyBarsRaw: lockedHarmonyBarsAuthoritative,
          parsedChordBars: lockedHarmonyBarsAuthoritative,
          chordProgressionText: chordProgressionText,
        },
        spineLayer: 'composerOsAppGeneration:song_mode_locked',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        error: msg,
        productKind: 'musicxml',
        composerOsVersion: COMPOSER_OS_VERSION,
        validation: validationForStructural(false, [msg]),
        runManifest: {
          seed: effectiveSeed,
          presetId: 'song_mode',
          activeModules: ['song_mode_compile'],
          timestamp: ts,
          scoreTitle: title,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
        },
        scoreTitle: title,
        requestEcho: requestEchoFromReq(req),
      };
    }
  }
  const songLayerOk = sm.validation.valid;
  let diskHarmonyTruthErrors: string[] = [];
  let filename: string | undefined;
  let filepath: string | undefined;
  let vocalLeadSheetFilepath: string | undefined;
  let midiFilepath: string | undefined;
  if (gp.xml) {
    filename = `composer_os_song_mode_${tsSafe}_${effectiveSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, gp.xml, 'utf-8');
    const skipMidiDrumFromPartialRegen = gp.context.generationMetadata.sectionRegenerationPartialScore === true;
    if (!req.skipDrumGuide && !skipMidiDrumFromPartialRegen) {
      try {
        const barMeterForDrums =
          gp.context.barMeterMap ?? gp.context.generationMetadata?.barMeterMap ?? req.barMeterMap;
        const baseName = path.basename(filepath, path.extname(filepath));
        writeDrumGuide(gp.score, outputDir, baseName, barMeterForDrums, req.bpm);
      } catch (e) {
        console.warn('Drum guide export failed:', (e as Error)?.message ?? e);
      }
    }
    if (!skipMidiDrumFromPartialRegen) {
      try {
        const barMeterForScore =
          gp.context.barMeterMap ?? gp.context.generationMetadata?.barMeterMap ?? req.barMeterMap;
        const baseName = path.basename(filepath, path.extname(filepath));
        midiFilepath = writeScoreMidi(gp.score, outputDir, baseName, barMeterForScore, req.bpm);
      } catch (e) {
        console.warn('Score MIDI export failed:', (e as Error)?.message ?? e);
      }
    }
    if (req.includeVocalLeadSheet && !skipMidiDrumFromPartialRegen) {
      const bridgeScriptPath = resolveSongwritingBridgeExportScriptPath();
      const vocalXml = exportVocalLeadSheetMusicXmlViaPython(sm.compiledSong, gp.score, {
        bridgeScriptPath,
        voiceType: sm.compiledSong.voiceType,
      });
      if (vocalXml && filepath.toLowerCase().endsWith('.musicxml')) {
        const vocalPath = filepath.replace(/\.musicxml$/i, '_vocal_lead_sheet.musicxml');
        fs.writeFileSync(vocalPath, vocalXml, 'utf-8');
        vocalLeadSheetFilepath = vocalPath;
      }
    }
    const locked = gp.context.lockedHarmonyBarsRaw;
    const barsForDiskHarmonyTruth =
      resolveEffectiveHarmonyTruth(gp.context.generationMetadata, {
        totalBars: gp.context.form.totalBars,
        expectedLength: locked?.length,
        harmonyContext: gp.context.harmonyContext,
      }) ?? locked;
    if (
      barsForDiskHarmonyTruth &&
      barsForDiskHarmonyTruth.length === gp.context.form.totalBars &&
      !indieDualGuitarTuningProofFixtureRequested(req)
    ) {
      try {
        // TODO: assertExportTruth â€” partial context (disk re-read only; in-memory truth already ran above).
        const disk = validateLockedHarmonyMusicXmlTruthFromFile(filepath, barsForDiskHarmonyTruth);
        if (!disk.ok) diskHarmonyTruthErrors = disk.errors;
      } catch (e) {
        console.warn('VALIDATION BYPASSED:', (e as Error)?.message);
      }
    }
    writeOutputManifest(filepath, {
      presetId: 'song_mode',
      styleStack: gp.runManifest?.activeModules ?? [],
      seed: effectiveSeed,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      timestamp: ts,
      scoreTitle: gp.runManifest?.scoreTitle,
      ecmMode: gp.runManifest?.ecmMode,
      harmonySource: gp.context.generationMetadata.harmonySource,
      customChordProgressionSummary: gp.context.generationMetadata.customChordProgressionSummary,
      progressionMode: gp.context.generationMetadata.progressionMode,
      chordProgressionInputRaw: gp.context.generationMetadata.chordProgressionInputRaw,
      parsedCustomProgressionBars: gp.context.generationMetadata.parsedCustomProgressionBars,
      chordProgressionParseFailed: gp.context.generationMetadata.chordProgressionParseFailed,
      builtInHarmonyFallbackOccurred: gp.context.generationMetadata.builtInHarmonyFallbackOccurred,
      harmonySourceUsed: gp.context.generationMetadata.harmonySourceUsed,
      styleGrammarLabel: gp.context.generationMetadata.styleGrammarLabel,
      styleStackPrimaryModuleId: gp.context.generationMetadata.styleStackPrimaryModuleId,
      styleStackPrimaryDisplayName: gp.context.generationMetadata.styleStackPrimaryDisplayName,
      userSelectedStyleDisplayNames: gp.context.generationMetadata.userSelectedStyleDisplayNames,
      userExplicitPrimaryStyle: gp.context.generationMetadata.userExplicitPrimaryStyle,
      styleProfile: req.styleProfile ?? 'STYLE_ECM',
      chordProgressionSubmittedRaw: gp.runManifest.chordProgressionSubmittedRaw,
      parsedChordBarsSnapshot: gp.runManifest.parsedChordBarsSnapshot,
      pipelineTruthInputStage: gp.runManifest.pipelineTruthInputStage,
      pipelineTruthScoreStage: gp.runManifest.pipelineTruthScoreStage,
      pipelineTruthExportStage: gp.runManifest.pipelineTruthExportStage,
      keySignatureInferredTonic: gp.context.generationMetadata.keySignatureReceipt?.inferredTonicName,
      keySignatureConfidence: gp.context.generationMetadata.keySignatureReceipt?.confidence,
      keySignatureOverrideUsed: gp.context.generationMetadata.keySignatureReceipt?.overrideUsed,
      keySignatureNoneMode: gp.context.generationMetadata.keySignatureReceipt?.noneMode,
      keySignatureHide: gp.context.generationMetadata.keySignatureReceipt?.hideKeySignature,
      keySignatureFifths: gp.context.generationMetadata.keySignatureReceipt?.exportFifths,
      keySignatureExportMode: gp.context.generationMetadata.keySignatureReceipt?.exportMode,
      keySignatureInferredKey: gp.context.generationMetadata.keySignatureReceipt?.inferredKey,
      keySignatureInferredMode: gp.context.generationMetadata.keySignatureReceipt?.inferredMode,
      keySignatureInferredFifths: gp.context.generationMetadata.keySignatureReceipt?.inferredFifths,
      keySignatureModeApplied: gp.context.generationMetadata.keySignatureReceipt?.keySignatureModeApplied,
      keySignatureExportKeyWritten: gp.context.generationMetadata.keySignatureReceipt?.exportKeyWritten,
      c4_hook_rhythm_applied: gp.context.generationMetadata.c4HookRhythmApplied,
      c4_bars_used: gp.context.generationMetadata.c4BarsUsed,
      songModeStyleSurfaceNotes: gp.context.generationMetadata.songModeStyleSurfaceNotes,
      songModeDonaldFagenC1Receipt: gp.context.generationMetadata.songModeDonaldFagenC1Receipt,
      grooveScaffoldReceipt: gp.context.generationMetadata.grooveScaffoldReceipt,
      grooveScaffoldReceipts: gp.context.generationMetadata.grooveScaffoldReceipts,
      grooveScaffoldDiagnostics: gp.context.generationMetadata.grooveScaffoldDiagnostics,
      songwriterStyleId: gp.context.generationMetadata.songwriterStyleId,
      brianWilsonPetSoundsDiagnostics: gp.context.generationMetadata.brianWilsonPetSoundsDiagnostics,
      brianWilsonPetSoundsDeviceReceipts: gp.context.generationMetadata.brianWilsonPetSoundsDeviceReceipts,
      brianWilsonPetSoundsSliceReceipt: gp.context.generationMetadata.brianWilsonPetSoundsSliceReceipt,
      brianWilsonEffectiveHarmonyBars: gp.context.generationMetadata.brianWilsonEffectiveHarmonyBars,
      stevieWonderDiagnostics: gp.context.generationMetadata.stevieWonderDiagnostics,
      stevieWonderDeviceReceipts: gp.context.generationMetadata.stevieWonderDeviceReceipts,
      stevieWonderSliceReceipt: gp.context.generationMetadata.stevieWonderSliceReceipt,
      stevieWonderEffectiveHarmonyBars: gp.context.generationMetadata.stevieWonderEffectiveHarmonyBars,
      radioheadDiagnostics: gp.context.generationMetadata.radioheadDiagnostics,
      radioheadDeviceReceipts: gp.context.generationMetadata.radioheadDeviceReceipts,
      radioheadSliceReceipt: gp.context.generationMetadata.radioheadSliceReceipt,
      radioheadEffectiveHarmonyBars: gp.context.generationMetadata.radioheadEffectiveHarmonyBars,
      radioheadVoiceLeadingGrammarReceipts: gp.context.generationMetadata.radioheadVoiceLeadingGrammarReceipts,
      radioheadMelodicGrammarReceipts: gp.context.generationMetadata.radioheadMelodicGrammarReceipts,
      radioheadMelodicContext: gp.context.generationMetadata.radioheadMelodicContext,
      radioheadRhythmGrammarReceipts: gp.context.generationMetadata.radioheadRhythmGrammarReceipts,
      radioheadRhythmEarlyPeriodBackbeat: gp.context.generationMetadata.radioheadRhythmEarlyPeriodBackbeat,
      radioheadRhythmAsymmetricFeaturesEligible: gp.context.generationMetadata.radioheadRhythmAsymmetricFeaturesEligible,
      radioheadOrchestrationGrammarReceipts: gp.context.generationMetadata.radioheadOrchestrationGrammarReceipts,
      radioheadOrchestrationPalette: gp.context.generationMetadata.radioheadOrchestrationPalette,
      radioheadMicrotonalGuitarEligible: gp.context.generationMetadata.radioheadMicrotonalGuitarEligible,
      radioheadFingerprintReceipts: gp.context.generationMetadata.radioheadFingerprintReceipts,
      jamesBrownDiagnostics: gp.context.generationMetadata.jamesBrownDiagnostics,
      jamesBrownDeviceReceipts: gp.context.generationMetadata.jamesBrownDeviceReceipts,
      jamesBrownSliceReceipt: gp.context.generationMetadata.jamesBrownSliceReceipt,
      jamesBrownEffectiveHarmonyBars: gp.context.generationMetadata.jamesBrownEffectiveHarmonyBars,
      jamesBrownAntiElaborationGuards: gp.context.generationMetadata.jamesBrownAntiElaborationGuards,
      joniMitchellDiagnostics: gp.context.generationMetadata.joniMitchellDiagnostics,
      joniMitchellDeviceReceipts: gp.context.generationMetadata.joniMitchellDeviceReceipts,
      joniMitchellSliceReceipt: gp.context.generationMetadata.joniMitchellSliceReceipt,
      joniMitchellEffectiveHarmonyBars: gp.context.generationMetadata.joniMitchellEffectiveHarmonyBars,
      joniMitchellAntiElaborationGuards: gp.context.generationMetadata.joniMitchellAntiElaborationGuards,
      joniMitchellTuningPatternByBar: gp.context.generationMetadata.joniMitchellTuningPatternByBar,
      joniMitchellModalFieldLockLengthBars: gp.context.generationMetadata.joniMitchellModalFieldLockLengthBars,
      joniMitchellSliceMeta: gp.context.generationMetadata.joniMitchellSliceMeta,
      joniPhase: gp.context.generationMetadata.joniPhase,
      joniResolvedPhase: gp.context.generationMetadata.joniResolvedPhase,
      thadPhase: gp.context.generationMetadata.thadPhase,
      thadResolvedPhase: gp.context.generationMetadata.thadResolvedPhase,
      thadJonesDiagnostics: gp.context.generationMetadata.thadJonesDiagnostics,
      thadJonesDeviceReceipts: gp.context.generationMetadata.thadJonesDeviceReceipts,
      thadJonesSliceReceipt: gp.context.generationMetadata.thadJonesSliceReceipt,
      thadJonesEffectiveHarmonyBars: gp.context.generationMetadata.thadJonesEffectiveHarmonyBars,
      thadJonesShoutBars: gp.context.generationMetadata.thadJonesShoutBars,
      basieTestamentMode: gp.context.generationMetadata.basieTestamentMode,
      basieResolvedTestament: gp.context.generationMetadata.basieResolvedTestament,
      basieDiagnostics: gp.context.generationMetadata.basieDiagnostics,
      basieDeviceReceipts: gp.context.generationMetadata.basieDeviceReceipts,
      basieSliceReceipt: gp.context.generationMetadata.basieSliceReceipt,
      basieEffectiveHarmonyBars: gp.context.generationMetadata.basieEffectiveHarmonyBars,
      basieShoutBars: gp.context.generationMetadata.basieShoutBars,
      basieEpisodePlan: gp.context.generationMetadata.basieEpisodePlan,
      brookmeyerPeriodMode: gp.context.generationMetadata.brookmeyerPeriodMode,
      brookmeyerPeriodModeResolved: gp.context.generationMetadata.brookmeyerPeriodModeResolved,
      activePitchModule: gp.context.generationMetadata.activePitchModule,
      brookmeyerSoloPermitted: gp.context.generationMetadata.brookmeyerSoloPermitted,
      brookmeyerEpisodePlanSummary: gp.context.generationMetadata.brookmeyerEpisodePlanSummary,
      bobBrookmeyerDiagnostics: gp.context.generationMetadata.bobBrookmeyerDiagnostics,
      bobBrookmeyerDeviceReceipts: gp.context.generationMetadata.bobBrookmeyerDeviceReceipts,
      bobBrookmeyerSliceReceipt: gp.context.generationMetadata.bobBrookmeyerSliceReceipt,
      bobBrookmeyerEffectiveHarmonyBars: gp.context.generationMetadata.bobBrookmeyerEffectiveHarmonyBars,
      lineFirstHierarchy: gp.context.generationMetadata.lineFirstHierarchy,
      contrapuntalLineCount: gp.context.generationMetadata.contrapuntalLineCount,
      nelsonPeriodMode: gp.context.generationMetadata.nelsonPeriodMode,
      nelsonPeriodModeResolved: gp.context.generationMetadata.nelsonPeriodModeResolved,
      nelsonBluesFormVariant: gp.context.generationMetadata.nelsonBluesFormVariant,
      nelsonBluesFormVariantResolved: gp.context.generationMetadata.nelsonBluesFormVariantResolved,
      activePedal: gp.context.generationMetadata.activePedal,
      upperModalChords: gp.context.generationMetadata.upperModalChords,
      nelsonTwoLayerForm: gp.context.generationMetadata.nelsonTwoLayerForm,
      oliverNelsonEpisodePlanSummary: gp.context.generationMetadata.oliverNelsonEpisodePlanSummary,
      sonicYouthDiagnostics: gp.context.generationMetadata.sonicYouthDiagnostics,
      sonicYouthDeviceReceipts: gp.context.generationMetadata.sonicYouthDeviceReceipts,
      sonicYouthSliceReceipt: gp.context.generationMetadata.sonicYouthSliceReceipt,
      sonicYouthEffectiveHarmonyBars: gp.context.generationMetadata.sonicYouthEffectiveHarmonyBars,
      patMethenyDiagnostics: gp.context.generationMetadata.patMethenyDiagnostics,
      patMethenyDeviceReceipts: gp.context.generationMetadata.patMethenyDeviceReceipts,
      patMethenySliceReceipt: gp.context.generationMetadata.patMethenySliceReceipt,
      patMethenyEffectiveHarmonyBars: gp.context.generationMetadata.patMethenyEffectiveHarmonyBars,
      patMethenyAntiElaborationGuards: gp.context.generationMetadata.patMethenyAntiElaborationGuards,
      patMethenyPedalHoldMaxBars: gp.context.generationMetadata.patMethenyPedalHoldMaxBars,
      patMethenyEligibilityStats: gp.context.generationMetadata.patMethenyEligibilityStats,
      wayneShorterDiagnostics: gp.context.generationMetadata.wayneShorterDiagnostics,
      wayneShorterDeviceReceipts: gp.context.generationMetadata.wayneShorterDeviceReceipts,
      wayneShorterSliceReceipt: gp.context.generationMetadata.wayneShorterSliceReceipt,
      wayneShorterEffectiveHarmonyBars: gp.context.generationMetadata.wayneShorterEffectiveHarmonyBars,
      wayneShorterAntiElaborationGuards: gp.context.generationMetadata.wayneShorterAntiElaborationGuards,
      wayneShorterEligibilityStats: gp.context.generationMetadata.wayneShorterEligibilityStats,
      wayneShorterHarmFingerprintReceipts: gp.context.generationMetadata.wayneShorterHarmFingerprintReceipts,
      wayneShorterMelFingerprintReceipts: gp.context.generationMetadata.wayneShorterMelFingerprintReceipts,
      wayneShorterRhythmFingerprintReceipts: gp.context.generationMetadata.wayneShorterRhythmFingerprintReceipts,
      wayneShorterFormFingerprintReceipts: gp.context.generationMetadata.wayneShorterFormFingerprintReceipts,
      wayneShorterFpFingerprintReceipts: gp.context.generationMetadata.wayneShorterFpFingerprintReceipts,
      wayneShorterHarmonicGrammarReceipts: gp.context.generationMetadata.wayneShorterHarmonicGrammarReceipts,
      wayneShorterMelodicGrammarReceipts: gp.context.generationMetadata.wayneShorterMelodicGrammarReceipts,
      wayneShorterRhythmGrammarReceipts: gp.context.generationMetadata.wayneShorterRhythmGrammarReceipts,
      wayneShorterFormGrammarReceipts: gp.context.generationMetadata.wayneShorterFormGrammarReceipts,
      wayneShorterFingerprintReceipts: gp.context.generationMetadata.wayneShorterFingerprintReceipts,
      barryHarrisDiagnostics: gp.context.generationMetadata.barryHarrisDiagnostics,
      barryHarrisDeviceReceipts: gp.context.generationMetadata.barryHarrisDeviceReceipts,
      barryHarrisSliceReceipt: gp.context.generationMetadata.barryHarrisSliceReceipt,
      barryHarrisEffectiveHarmonyBars: gp.context.generationMetadata.barryHarrisEffectiveHarmonyBars,
      barryHarrisAntiElaborationGuards: gp.context.generationMetadata.barryHarrisAntiElaborationGuards,
      billEvansDiagnostics: gp.context.generationMetadata.billEvansDiagnostics,
      billEvansDeviceReceipts: gp.context.generationMetadata.billEvansDeviceReceipts,
      billEvansSliceReceipt: gp.context.generationMetadata.billEvansSliceReceipt,
      billEvansEffectiveHarmonyBars: gp.context.generationMetadata.billEvansEffectiveHarmonyBars,
      billEvansAntiElaborationGuards: gp.context.generationMetadata.billEvansAntiElaborationGuards,
      debussyDiagnostics: gp.context.generationMetadata.debussyDiagnostics,
      debussyDeviceReceipts: gp.context.generationMetadata.debussyDeviceReceipts,
      debussySliceReceipt: gp.context.generationMetadata.debussySliceReceipt,
      debussyEffectiveHarmonyBars: gp.context.generationMetadata.debussyEffectiveHarmonyBars,
      debussyAntiElaborationGuards: gp.context.generationMetadata.debussyAntiElaborationGuards,
      debussyArabesqueBars: gp.context.generationMetadata.debussyArabesqueBars,
      debussyArabesqueMotifByBar: gp.context.generationMetadata.debussyArabesqueMotifByBar,
      debussyProgramPeriod: gp.context.generationMetadata.debussyProgramPeriod,
      debussyFormReceipts: gp.context.generationMetadata.debussyFormReceipts,
      debussyOrchestrationReceipts: gp.context.generationMetadata.debussyOrchestrationReceipts,
      debussyVocalColourOrchestral: gp.context.generationMetadata.debussyVocalColourOrchestral,
      debussyFingerprintReceipts: gp.context.generationMetadata.debussyFingerprintReceipts,
      bernardHerrmannContext: gp.context.generationMetadata.bernardHerrmannContext,
      bernardHerrmannDiagnostics: gp.context.generationMetadata.bernardHerrmannDiagnostics,
      bernardHerrmannDeviceReceipts: gp.context.generationMetadata.bernardHerrmannDeviceReceipts,
      bernardHerrmannSliceReceipt: gp.context.generationMetadata.bernardHerrmannSliceReceipt,
      bernardHerrmannEffectiveHarmonyBars: gp.context.generationMetadata.bernardHerrmannEffectiveHarmonyBars,
      johnWilliamsContext: gp.context.generationMetadata.johnWilliamsContext,
      johnWilliamsDiagnostics: gp.context.generationMetadata.johnWilliamsDiagnostics,
      johnWilliamsDeviceReceipts: gp.context.generationMetadata.johnWilliamsDeviceReceipts,
      johnWilliamsSliceReceipt: gp.context.generationMetadata.johnWilliamsSliceReceipt,
      johnWilliamsEffectiveHarmonyBars: gp.context.generationMetadata.johnWilliamsEffectiveHarmonyBars,
      ennioMorriconeContext: gp.context.generationMetadata.ennioMorriconeContext,
      ennioMorriconeDiagnostics: gp.context.generationMetadata.ennioMorriconeDiagnostics,
      ennioMorriconeDeviceReceipts: gp.context.generationMetadata.ennioMorriconeDeviceReceipts,
      ennioMorriconeSliceReceipt: gp.context.generationMetadata.ennioMorriconeSliceReceipt,
      ennioMorriconeEffectiveHarmonyBars: gp.context.generationMetadata.ennioMorriconeEffectiveHarmonyBars,
      ninoRotaContext: gp.context.generationMetadata.ninoRotaContext,
      ninoRotaDiagnostics: gp.context.generationMetadata.ninoRotaDiagnostics,
      ninoRotaDeviceReceipts: gp.context.generationMetadata.ninoRotaDeviceReceipts,
      ninoRotaSliceReceipt: gp.context.generationMetadata.ninoRotaSliceReceipt,
      ninoRotaEffectiveHarmonyBars: gp.context.generationMetadata.ninoRotaEffectiveHarmonyBars,
      jerryGoldsmithContext: gp.context.generationMetadata.jerryGoldsmithContext,
      jerryGoldsmithDiagnostics: gp.context.generationMetadata.jerryGoldsmithDiagnostics,
      jerryGoldsmithDeviceReceipts: gp.context.generationMetadata.jerryGoldsmithDeviceReceipts,
      jerryGoldsmithSliceReceipt: gp.context.generationMetadata.jerryGoldsmithSliceReceipt,
      jerryGoldsmithEffectiveHarmonyBars: gp.context.generationMetadata.jerryGoldsmithEffectiveHarmonyBars,
      philipGlassContext: gp.context.generationMetadata.philipGlassContext,
      philipGlassDiagnostics: gp.context.generationMetadata.philipGlassDiagnostics,
      philipGlassDeviceReceipts: gp.context.generationMetadata.philipGlassDeviceReceipts,
      philipGlassSliceReceipt: gp.context.generationMetadata.philipGlassSliceReceipt,
      philipGlassEffectiveHarmonyBars: gp.context.generationMetadata.philipGlassEffectiveHarmonyBars,
      reichProcess: gp.context.generationMetadata.reichProcess,
      reichResolvedProcess: gp.context.generationMetadata.reichResolvedProcess,
      steveReichDiagnostics: gp.context.generationMetadata.steveReichDiagnostics,
      steveReichDeviceReceipts: gp.context.generationMetadata.steveReichDeviceReceipts,
      steveReichSliceReceipt: gp.context.generationMetadata.steveReichSliceReceipt,
      steveReichEffectiveHarmonyBars: gp.context.generationMetadata.steveReichEffectiveHarmonyBars,
      steveReichHarmonicRhythmBars: gp.context.generationMetadata.steveReichHarmonicRhythmBars,
      steveReichPulseGridDensity: gp.context.generationMetadata.steveReichPulseGridDensity,
      messiaenPeriodMode: gp.context.generationMetadata.messiaenPeriodMode,
      messiaenPeriodModeResolved: gp.context.generationMetadata.messiaenPeriodModeResolved,
      periodMode: gp.context.generationMetadata.periodMode,
      activeMode: gp.context.generationMetadata.activeMode,
      colourTag: gp.context.generationMetadata.colourTag,
      birdsongSpecies: gp.context.generationMetadata.birdsongSpecies,
      messiaenHarmonicRhythmMinBars: gp.context.generationMetadata.messiaenHarmonicRhythmMinBars,
      messiaenDiagnostics: gp.context.generationMetadata.messiaenDiagnostics,
      messiaenDeviceReceipts: gp.context.generationMetadata.messiaenDeviceReceipts,
      messiaenSliceReceipt: gp.context.generationMetadata.messiaenSliceReceipt,
      messiaenEffectiveHarmonyBars: gp.context.generationMetadata.messiaenEffectiveHarmonyBars,
      hansZimmerContext: gp.context.generationMetadata.hansZimmerContext,
      hansZimmerDiagnostics: gp.context.generationMetadata.hansZimmerDiagnostics,
      hansZimmerDeviceReceipts: gp.context.generationMetadata.hansZimmerDeviceReceipts,
      hansZimmerSliceReceipt: gp.context.generationMetadata.hansZimmerSliceReceipt,
      hansZimmerEffectiveHarmonyBars: gp.context.generationMetadata.hansZimmerEffectiveHarmonyBars,
      angeloBadalamentiContext: gp.context.generationMetadata.angeloBadalamentiContext,
      angeloBadalamentiDiagnostics: gp.context.generationMetadata.angeloBadalamentiDiagnostics,
      angeloBadalamentiDeviceReceipts: gp.context.generationMetadata.angeloBadalamentiDeviceReceipts,
      angeloBadalamentiSliceReceipt: gp.context.generationMetadata.angeloBadalamentiSliceReceipt,
      angeloBadalamentiEffectiveHarmonyBars: gp.context.generationMetadata.angeloBadalamentiEffectiveHarmonyBars,
      bacharachDiagnostics: gp.context.generationMetadata.bacharachDiagnostics,
      bacharachDeviceReceipts: gp.context.generationMetadata.bacharachDeviceReceipts,
      bacharachSliceReceipt: gp.context.generationMetadata.bacharachSliceReceipt,
      bacharachEffectiveHarmonyBars: gp.context.generationMetadata.bacharachEffectiveHarmonyBars,
      bacharachAntiElaborationGuards: gp.context.generationMetadata.bacharachAntiElaborationGuards,
      donaldFagenDiagnostics: gp.context.generationMetadata.donaldFagenDiagnostics,
      donaldFagenDeviceReceipts: gp.context.generationMetadata.donaldFagenDeviceReceipts,
      donaldFagenSliceReceipt: gp.context.generationMetadata.donaldFagenSliceReceipt,
      donaldFagenEffectiveHarmonyBars: gp.context.generationMetadata.donaldFagenEffectiveHarmonyBars,
      donaldFagenAntiElaborationGuards: gp.context.generationMetadata.donaldFagenAntiElaborationGuards,
      ecmChamberDiagnostics: gp.context.generationMetadata.ecmChamberDiagnostics,
      ecmChamberDeviceReceipts: gp.context.generationMetadata.ecmChamberDeviceReceipts,
      ecmChamberSliceReceipt: gp.context.generationMetadata.ecmChamberSliceReceipt,
      ecmChamberEffectiveHarmonyBars: gp.context.generationMetadata.ecmChamberEffectiveHarmonyBars,
      ecmChamberAntiElaborationGuards: gp.context.generationMetadata.ecmChamberAntiElaborationGuards,
      jobimDiagnostics: gp.context.generationMetadata.jobimDiagnostics,
      jobimDeviceReceipts: gp.context.generationMetadata.jobimDeviceReceipts,
      jobimSliceReceipt: gp.context.generationMetadata.jobimSliceReceipt,
      jobimEffectiveHarmonyBars: gp.context.generationMetadata.jobimEffectiveHarmonyBars,
      jobimAntiElaborationGuards: gp.context.generationMetadata.jobimAntiElaborationGuards,
      herbieHancockDiagnostics: gp.context.generationMetadata.herbieHancockDiagnostics,
      herbieHancockDeviceReceipts: gp.context.generationMetadata.herbieHancockDeviceReceipts,
      herbieHancockSliceReceipt: gp.context.generationMetadata.herbieHancockSliceReceipt,
      herbieHancockEffectiveHarmonyBars: gp.context.generationMetadata.herbieHancockEffectiveHarmonyBars,
      herbieHancockAntiElaborationGuards: gp.context.generationMetadata.herbieHancockAntiElaborationGuards,
      hancockPhase: gp.context.generationMetadata.hancockPhase,
      hancockResolvedPhase: gp.context.generationMetadata.hancockResolvedPhase,
      sondheimDiagnostics: gp.context.generationMetadata.sondheimDiagnostics,
      sondheimDeviceReceipts: gp.context.generationMetadata.sondheimDeviceReceipts,
      sondheimSliceReceipt: gp.context.generationMetadata.sondheimSliceReceipt,
      sondheimEffectiveHarmonyBars: gp.context.generationMetadata.sondheimEffectiveHarmonyBars,
      sondheimAntiElaborationGuards: gp.context.generationMetadata.sondheimAntiElaborationGuards,
      kateBushDiagnostics: gp.context.generationMetadata.kateBushDiagnostics,
      kateBushDeviceReceipts: gp.context.generationMetadata.kateBushDeviceReceipts,
      kateBushSliceReceipt: gp.context.generationMetadata.kateBushSliceReceipt,
      kateBushEffectiveHarmonyBars: gp.context.generationMetadata.kateBushEffectiveHarmonyBars,
      kateBushAntiElaborationGuards: gp.context.generationMetadata.kateBushAntiElaborationGuards,
      theloniousMonkDiagnostics: gp.context.generationMetadata.theloniousMonkDiagnostics,
      theloniousMonkDeviceReceipts: gp.context.generationMetadata.theloniousMonkDeviceReceipts,
      theloniousMonkSliceReceipt: gp.context.generationMetadata.theloniousMonkSliceReceipt,
      theloniousMonkEffectiveHarmonyBars: gp.context.generationMetadata.theloniousMonkEffectiveHarmonyBars,
      theloniousMonkAntiElaborationGuards: gp.context.generationMetadata.theloniousMonkAntiElaborationGuards,
      johnColtraneDiagnostics: gp.context.generationMetadata.johnColtraneDiagnostics,
      johnColtraneDeviceReceipts: gp.context.generationMetadata.johnColtraneDeviceReceipts,
      johnColtraneSliceReceipt: gp.context.generationMetadata.johnColtraneSliceReceipt,
      johnColtraneEffectiveHarmonyBars: gp.context.generationMetadata.johnColtraneEffectiveHarmonyBars,
      mccoyTynerDiagnostics: gp.context.generationMetadata.mccoyTynerDiagnostics,
      mccoyTynerDeviceReceipts: gp.context.generationMetadata.mccoyTynerDeviceReceipts,
      mccoyTynerSliceReceipt: gp.context.generationMetadata.mccoyTynerSliceReceipt,
      mccoyTynerEffectiveHarmonyBars: gp.context.generationMetadata.mccoyTynerEffectiveHarmonyBars,
      coltranePhase: gp.context.generationMetadata.coltranePhase,
      coltraneHarmonicDensity: gp.context.generationMetadata.coltraneHarmonicDensity,
      andrewHillDiagnostics: gp.context.generationMetadata.andrewHillDiagnostics,
      andrewHillDeviceReceipts: gp.context.generationMetadata.andrewHillDeviceReceipts,
      andrewHillSliceReceipt: gp.context.generationMetadata.andrewHillSliceReceipt,
      andrewHillEffectiveHarmonyBars: gp.context.generationMetadata.andrewHillEffectiveHarmonyBars,
      andrewHillAntiElaborationGuards: gp.context.generationMetadata.andrewHillAntiElaborationGuards,
      frankZappaDiagnostics: gp.context.generationMetadata.frankZappaDiagnostics,
      frankZappaDeviceReceipts: gp.context.generationMetadata.frankZappaDeviceReceipts,
      frankZappaDiffReceipts: gp.context.generationMetadata.frankZappaDiffReceipts,
      zappaSectionBehaviorBySection: gp.context.generationMetadata.zappaSectionBehaviorBySection,
      frankZappaSliceReceipt: gp.context.generationMetadata.frankZappaSliceReceipt,
      frankZappaEffectiveHarmonyBars: gp.context.generationMetadata.frankZappaEffectiveHarmonyBars,
      frankZappaAntiElaborationGuards: gp.context.generationMetadata.frankZappaAntiElaborationGuards,
      frankZappaEligibilityStats: gp.context.generationMetadata.frankZappaEligibilityStats,
      songModeFagenKeysCompV15Applied: gp.context.generationMetadata.songModeFagenKeysCompV15Applied,
      fagenKeysCompMusicalDiagnostics: gp.context.generationMetadata.fagenKeysCompMusicalDiagnostics,
      sophisticatedPopHarmonyDiagnostics: gp.context.generationMetadata.sophisticatedPopHarmonyDiagnostics,
      bacharachHarmonyDiagnostics: gp.context.generationMetadata.bacharachHarmonyDiagnostics,
      bacharachSongModeRuleBundleId: gp.context.generationMetadata.bacharachSongModeRuleBundleId,
      songwriterSyncopationBias: gp.context.generationMetadata.songwriterSyncopationBias,
      songwriterDensityBias: gp.context.generationMetadata.songwriterDensityBias,
      songModeSectionShapingDiagnostics: gp.context.generationMetadata.songModeSectionShapingDiagnostics,
      songModeSectionBehaviourDescriptors: gp.context.generationMetadata.songModeSectionBehaviourDescriptors,
      songModeProfileRuleDiagnostics: gp.context.generationMetadata.songModeProfileRuleDiagnostics,
      motifAuthorityLevel: gp.context.generationMetadata.motifAuthorityLevel,
      motifDevelopmentSummary: gp.context.generationMetadata.motifDevelopmentSummary,
      importHarmonyPolicyVersion: gp.context.generationMetadata.importHarmonyPolicyVersion,
      gceScore: bestGceScore >= 0 ? bestGceScore : undefined,
      gceGatePassed: bestGceScore >= GCE_GATE_MIN,
      validation: {
        scoreIntegrity: gp.integrityPassed,
        exportIntegrity: gp.exportIntegrityPassed,
        behaviourGates: gp.behaviourGatesPassed,
        mxValid: gp.mxValidationPassed,
        strictBarMath: gp.strictBarMathPassed,
        exportRoundTrip: gp.exportRoundTripPassed,
        instrumentMetadata: gp.instrumentMetadataPassed,
        sibeliusSafe: gp.sibeliusSafe,
        readinessRelease: gp.readiness.release,
        readinessMx: gp.readiness.mx,
        shareable: gp.readiness.shareable,
        errors: [...gp.errors, ...diskHarmonyTruthErrors],
        warnings: gp.songModePhraseWarnings?.length ? gp.songModePhraseWarnings : undefined,
      },
    });
  }
  const mergedErrors = [...gp.errors, ...diskHarmonyTruthErrors];
  if (!songLayerOk) {
    mergedErrors.push(...sm.validation.errors);
  }
  const validation = {
    integrityPassed: songLayerOk && gp.integrityPassed,
    behaviourGatesPassed: songLayerOk && gp.behaviourGatesPassed,
    mxValidationPassed: songLayerOk && gp.mxValidationPassed,
    strictBarMathPassed: songLayerOk && gp.strictBarMathPassed,
    exportRoundTripPassed: songLayerOk && gp.exportRoundTripPassed,
    exportIntegrityPassed: songLayerOk && gp.exportIntegrityPassed,
    instrumentMetadataPassed: songLayerOk && gp.instrumentMetadataPassed,
    sibeliusSafe: songLayerOk && gp.sibeliusSafe,
    readiness: gp.readiness,
    errors: mergedErrors,
    warnings: gp.songModePhraseWarnings?.length ? gp.songModePhraseWarnings : undefined,
  };
  const success = gp.success && songLayerOk && !!gp.xml && diskHarmonyTruthErrors.length === 0;
  const scoreTitleResolved = gp.runManifest?.scoreTitle ?? title;
  const universalLeadSheet =
    success && gp.context
      ? buildUniversalLeadSheetFromCompositionContext(gp.context, scoreTitleResolved)
      : undefined;
  let songModeMusicContext: MusicContext | undefined;
  if (success && gp.score) {
    try {
      songModeMusicContext = duoLockedMusicContextFromGoldenPath(gp, effectiveSeed, req.bpm);
    } catch {
      songModeMusicContext = undefined;
    }
  }
  return {
    success,
    error: success ? undefined : mergedErrors[0] ?? 'Generation failed',
    musicContext: songModeMusicContext,
    productKind: 'musicxml',
    xml: gp.xml,
    filename,
    filepath,
    manifestPath: filepath ? manifestPathForMusicXml(filepath) : undefined,
    harmonySource: gp.context.generationMetadata.harmonySource,
    customChordProgressionSummary: gp.context.generationMetadata.customChordProgressionSummary,
    progressionMode: gp.context.generationMetadata.progressionMode,
    chordProgressionInputRaw: gp.context.generationMetadata.chordProgressionInputRaw,
    parsedCustomProgressionBars: gp.context.generationMetadata.parsedCustomProgressionBars,
    chordProgressionParseFailed: gp.context.generationMetadata.chordProgressionParseFailed,
    builtInHarmonyFallbackOccurred: gp.context.generationMetadata.builtInHarmonyFallbackOccurred,
    customHarmonyMusicXmlTruthPassed: gp.context.generationMetadata.customHarmonyMusicXmlTruthPassed,
    harmonySourceUsed: gp.context.generationMetadata.harmonySourceUsed,
    styleGrammarLabel: gp.context.generationMetadata.styleGrammarLabel,
    styleStackPrimaryModuleId: gp.context.generationMetadata.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: gp.context.generationMetadata.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: gp.context.generationMetadata.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: gp.context.generationMetadata.userExplicitPrimaryStyle,
    motifAuthorityLevel: gp.context.generationMetadata.motifAuthorityLevel,
    motifDevelopmentSummary: gp.context.generationMetadata.motifDevelopmentSummary,
    validation,
    runManifest: gp.runManifest
      ? {
          seed: gp.runManifest.seed,
          presetId: 'song_mode',
          activeModules: Array.from(
            new Set([
              'song_mode_compile',
              'songwriting_research_rules',
              ...(gp.runManifest.activeModules ?? []),
            ])
          ),
          timestamp: gp.runManifest.timestamp,
          scoreTitle: gp.runManifest.scoreTitle,
          ecmMode: gp.runManifest.ecmMode,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
          experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
          harmonySourceUsed: gp.runManifest.harmonySourceUsed,
          styleGrammarLabel: gp.runManifest.styleGrammarLabel,
          styleStackPrimaryModuleId: gp.runManifest.styleStackPrimaryModuleId,
          styleStackPrimaryDisplayName: gp.runManifest.styleStackPrimaryDisplayName,
          userSelectedStyleDisplayNames: gp.runManifest.userSelectedStyleDisplayNames,
          userExplicitPrimaryStyle: gp.runManifest.userExplicitPrimaryStyle,
          motifAuthorityLevel: gp.runManifest.motifAuthorityLevel,
          keySignatureInferredTonic: gp.runManifest.keySignatureInferredTonic,
          keySignatureConfidence: gp.runManifest.keySignatureConfidence,
          keySignatureOverrideUsed: gp.runManifest.keySignatureOverrideUsed,
          keySignatureNoneMode: gp.runManifest.keySignatureNoneMode,
          keySignatureHide: gp.runManifest.keySignatureHide,
          keySignatureFifths: gp.runManifest.keySignatureFifths,
          keySignatureExportMode: gp.runManifest.keySignatureExportMode,
          keySignatureInferredKey: gp.runManifest.keySignatureInferredKey,
          keySignatureInferredMode: gp.runManifest.keySignatureInferredMode,
          keySignatureInferredFifths: gp.runManifest.keySignatureInferredFifths,
          keySignatureModeApplied: gp.runManifest.keySignatureModeApplied,
          keySignatureExportKeyWritten: gp.runManifest.keySignatureExportKeyWritten,
          wybleConsumptionReceipt: gp.runManifest.wybleConsumptionReceipt,
          songModeStyleSurfaceNotes: gp.runManifest.songModeStyleSurfaceNotes,
          songModeDonaldFagenC1Receipt: gp.runManifest.songModeDonaldFagenC1Receipt,
          songModeSectionShapingDiagnostics: gp.runManifest.songModeSectionShapingDiagnostics,
          songModeSectionBehaviourDescriptors: gp.runManifest.songModeSectionBehaviourDescriptors,
          songModeProfileRuleDiagnostics: gp.runManifest.songModeProfileRuleDiagnostics,
          songModeLeadSheetInputApplied: gp.runManifest.songModeLeadSheetInputApplied,
          songModeLeadSheetAnchorStartApplied: gp.runManifest.songModeLeadSheetAnchorStartApplied,
          songModeLeadSheetExpressionStrength: gp.runManifest.songModeLeadSheetExpressionStrength,
          importHarmonyMode: gp.runManifest.importHarmonyMode,
          importHarmonyModeSource: gp.runManifest.importHarmonyModeSource,
          harmonyBlendRaw: gp.runManifest.harmonyBlendRaw,
          importHarmonyPolicyVersion: gp.runManifest.importHarmonyPolicyVersion,
          importHarmonyLockApplied: gp.runManifest.importHarmonyLockApplied,
          importHarmonyLockFallbackReason: gp.runManifest.importHarmonyLockFallbackReason,
          importHarmonyLockedBarsCount: gp.runManifest.importHarmonyLockedBarsCount,
          motifDevelopmentSummary: gp.runManifest.motifDevelopmentSummary,
        }
      : undefined,
    scoreTitle: scoreTitleResolved,
    universalLeadSheet,
    requestEcho: requestEchoFromReq(req),
    vocalLeadSheetFilepath,
    ...(midiFilepath ? { midiFilepath } : {}),
    gceScore: bestGceScore >= 0 ? bestGceScore : undefined,
    gceGatePassed: bestGceScore >= GCE_GATE_MIN,
  };
}
