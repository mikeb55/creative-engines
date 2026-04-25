import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import {
  adaptLeadSheetMusicXmlForSongMode,
  effectiveLeadSheetHarmonyDisplayModeAfterEnvGate,
  normalizeLeadSheetHarmonyDisplayMode,
} from '../core/song-mode/songModeLeadSheetAdapter';
import {
  enrichHarmonyWithTonalityVault,
  isTonalityVaultLeadSheetHarmonyEnrichmentEnabled,
  majorTonicPcFromKeyFifths,
  parseChordRootPcFromSymbol,
} from '../core/tonalityVault/tonalityVaultLeadSheetHarmonyEnrichment';

/** C major, ii–V–I in bars 1–3 (diatonic roots D, G, C). */
const II_V_I_C_MAJOR_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>G</root-step></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>C</root-step></root><kind text="maj7">major-seventh</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/** C major with F#7 — chromatic against parallel major. */
const CHROMATIC_DOMINANT_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony><root><root-step>F</root-step><root-alter>1</root-alter></root><kind text="7">dominant</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

export function runTonalityVaultLeadSheetHarmonyEnrichmentTests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const out: Array<{ name: string; ok: boolean; detail?: string }> = [];

  out.push({
    name: 'normalizeLeadSheetHarmonyDisplayMode trims and lowercases string values',
    ok:
      normalizeLeadSheetHarmonyDisplayMode(' ENRICHED ') === 'enriched' &&
      normalizeLeadSheetHarmonyDisplayMode('Compare') === 'compare',
  });

  const preEff = process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
  try {
    delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    out.push({
      name: 'effectiveLeadSheetHarmonyDisplayModeAfterEnvGate coerces compare to raw when env off',
      ok: effectiveLeadSheetHarmonyDisplayModeAfterEnvGate('compare') === 'raw',
    });
  } finally {
    if (preEff === undefined) delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    else process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = preEff;
  }

  out.push({
    name: 'majorTonicPcFromKeyFifths matches circle (C, G, F)',
    ok: majorTonicPcFromKeyFifths(0) === 0 && majorTonicPcFromKeyFifths(1) === 7 && majorTonicPcFromKeyFifths(-1) === 5,
  });

  out.push({
    name: 'parseChordRootPcFromSymbol handles Bb and F#',
    ok: parseChordRootPcFromSymbol('Bbmaj7') === 10 && parseChordRootPcFromSymbol('F#7') === 6,
  });

  const parsed = importLeadSheetFromMusicXml(II_V_I_C_MAJOR_XML);
  if (!parsed.ok || !parsed.leadSheet) {
    out.push({ name: 'import ii–V–I fixture', ok: false, detail: parsed.errors.join('; ') });
    return out;
  }
  const chordSnapshot = JSON.stringify(parsed.leadSheet.chordEvents);

  const preBypass = process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
  let offNoBypass: ReturnType<typeof enrichHarmonyWithTonalityVault>;
  try {
    delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    offNoBypass = enrichHarmonyWithTonalityVault({
      chordEvents: parsed.leadSheet.chordEvents,
      keySignature: parsed.leadSheet.keySignature,
      totalBars: parsed.leadSheet.totalBars,
    });
  } finally {
    if (preBypass === undefined) delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    else process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = preBypass;
  }
  out.push({
    name: 'enrichHarmonyWithTonalityVault returns applied:false when flag off and no test bypass',
    ok: offNoBypass.applied === false && offNoBypass.enrichment === undefined && offNoBypass.warnings.length === 0,
  });

  const enrich = enrichHarmonyWithTonalityVault(
    {
      chordEvents: parsed.leadSheet.chordEvents,
      keySignature: parsed.leadSheet.keySignature,
      totalBars: parsed.leadSheet.totalBars,
      importedHarmonyTimelineEventCount: parsed.leadSheet.importedHarmonyTimeline?.events.length,
    },
    { __testBypassFeatureFlag: true }
  );
  out.push({
    name: 'enrichment marks ii–V–I diatonic in C with degree/function explanations',
    ok:
      enrich.applied === true &&
      enrich.enrichment?.interpretationScope === 'parallel_major_from_fifths_degree_function_hints' &&
      enrich.enrichment?.byChordIndex.length === 3 &&
      enrich.enrichment.byChordIndex.every((a) => a.diatonicClass === 'diatonic_major_key') &&
      enrich.enrichment.byChordIndex[0]?.scaleDegreeFromMajor === 'II' &&
      enrich.enrichment.byChordIndex[1]?.functionalHint === 'dominant_family' &&
      typeof enrich.enrichment.byChordIndex[2]?.explanation === 'string' &&
      enrich.enrichment.byChordIndex[2]?.explanation.length > 5,
  });

  out.push({
    name: 'enrichment does not mutate imported chordEvents',
    ok: JSON.stringify(parsed.leadSheet.chordEvents) === chordSnapshot,
  });

  const chrom = importLeadSheetFromMusicXml(CHROMATIC_DOMINANT_XML);
  if (!chrom.ok || !chrom.leadSheet) {
    out.push({ name: 'import chromatic dominant fixture', ok: false, detail: chrom.errors.join('; ') });
  } else {
    const ec = enrichHarmonyWithTonalityVault(
      {
        chordEvents: chrom.leadSheet.chordEvents,
        keySignature: chrom.leadSheet.keySignature,
        totalBars: chrom.leadSheet.totalBars,
      },
      { __testBypassFeatureFlag: true }
    );
    const ann = ec.enrichment?.byChordIndex[0];
    out.push({
      name: 'F#7 in C major classified chromatic_or_unknown with explicit explanation',
      ok:
        ann?.diatonicClass === 'chromatic_or_unknown' &&
        ann.chordRootPc === 6 &&
        ann.scaleDegreeFromMajor === '#IV' &&
        ann.functionalHint === 'chromatic_or_unknown' &&
        (ann.explanation?.includes('chromatic color') ?? false),
    });
  }

  const prev = process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
  process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = '1';
  try {
    const adaptedRaw = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, { harmonyDisplayMode: 'raw' });
    out.push({
      name: 'env on + raw: skips Tonality Vault; no tonalityVaultHarmonyEnrichment; view effective raw',
      ok:
        adaptedRaw.ok === true &&
        adaptedRaw.tonalityVaultHarmonyEnrichment === undefined &&
        adaptedRaw.harmonyInterpretationView?.requestedMode === 'raw' &&
        adaptedRaw.harmonyInterpretationView?.effectiveMode === 'raw' &&
        adaptedRaw.harmonyInterpretationView?.viewWarnings.length === 0,
    });

    const adaptedEnriched = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, {
      harmonyDisplayMode: 'enriched',
    });
    out.push({
      name: 'env on + enriched: attaches Tonality Vault enrichment + interpretation view',
      ok:
        adaptedEnriched.ok === true &&
        adaptedEnriched.tonalityVaultHarmonyEnrichment?.applied === true &&
        (adaptedEnriched.tonalityVaultHarmonyEnrichment.enrichment?.byChordIndex.length ?? 0) === 3 &&
        adaptedEnriched.harmonyInterpretationView?.effectiveMode === 'enriched' &&
        adaptedEnriched.harmonyInterpretationView?.enrichedDisplayFellBackToRaw !== true,
    });

    const adaptedCompare = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, {
      harmonyDisplayMode: 'compare',
    });
    const cp = adaptedCompare.harmonyInterpretationView?.comparePayload;
    out.push({
      name: 'env on + compare: comparePayload has raw snapshot + tonalityVault result',
      ok:
        adaptedCompare.ok === true &&
        adaptedCompare.harmonyInterpretationView?.effectiveMode === 'compare' &&
        cp !== undefined &&
        cp.rawChordEvents.length === 3 &&
        cp.tonalityVault.applied === true,
    });

    const failCompare = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, {
      harmonyDisplayMode: 'compare',
      __testThrowTonalityVaultEnrich: true,
    });
    const fcp = failCompare.harmonyInterpretationView?.comparePayload;
    out.push({
      name: 'env on + compare + enrichment throw: comparePayload still exposes failed tonalityVault',
      ok:
        failCompare.ok === true &&
        failCompare.harmonyInterpretationView?.effectiveMode === 'compare' &&
        fcp !== undefined &&
        fcp.tonalityVault.applied === false &&
        fcp.rawChordEvents.length === 3,
    });
  } finally {
    if (prev === undefined) delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    else process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = prev;
  }

  const preOff = process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
  try {
    delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    const adaptedOff = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3);
    const gatedEnriched = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, { harmonyDisplayMode: 'enriched' });
    const gatedCompare = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, { harmonyDisplayMode: 'compare' });
    out.push({
      name: 'adaptLeadSheetMusicXmlForSongMode omits enrichment when flag off (default raw)',
      ok:
        adaptedOff.ok === true &&
        adaptedOff.tonalityVaultHarmonyEnrichment === undefined &&
        adaptedOff.harmonyInterpretationView?.effectiveMode === 'raw',
    });
    out.push({
      name: 'env flag off + enriched: coerces to raw, gate warning, no tonalityVaultHarmonyEnrichment',
      ok:
        gatedEnriched.ok === true &&
        gatedEnriched.tonalityVaultHarmonyEnrichment === undefined &&
        gatedEnriched.harmonyInterpretationView?.effectiveMode === 'raw' &&
        gatedEnriched.harmonyInterpretationView?.requestedMode === 'enriched' &&
        (gatedEnriched.harmonyInterpretationView?.viewWarnings.some((w) => w.includes('Tonality Vault is disabled')) ??
          false),
    });
    out.push({
      name: 'env flag off + compare: coerces to raw, no comparePayload',
      ok:
        gatedCompare.ok === true &&
        gatedCompare.harmonyInterpretationView?.effectiveMode === 'raw' &&
        gatedCompare.harmonyInterpretationView?.comparePayload === undefined,
    });
    out.push({
      name: 'flag off: adapted leadSheet chordEvents match import-only chordEvents',
      ok:
        adaptedOff.ok === true &&
        adaptedOff.leadSheet !== undefined &&
        JSON.stringify(adaptedOff.leadSheet.chordEvents) === JSON.stringify(parsed.leadSheet.chordEvents),
    });
  } finally {
    if (preOff === undefined) delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    else process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = preOff;
  }

  const preFlag = process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
  try {
    process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = ' YES ';
    out.push({
      name: 'isTonalityVaultLeadSheetHarmonyEnrichmentEnabled accepts spaced YES (String coercion)',
      ok: isTonalityVaultLeadSheetHarmonyEnrichmentEnabled() === true,
    });
  } finally {
    if (preFlag === undefined) delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    else process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = preFlag;
  }

  const prevThrow = process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
  process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = '1';
  try {
    const failAdapt = adaptLeadSheetMusicXmlForSongMode(II_V_I_C_MAJOR_XML, 3, {
      harmonyDisplayMode: 'enriched',
      __testThrowTonalityVaultEnrich: true,
    });
    out.push({
      name: 'adapter catch: enrichment throw does not fail adapt; enriched fallback + warning',
      ok:
        failAdapt.ok === true &&
        failAdapt.tonalityVaultHarmonyEnrichment?.applied === false &&
        failAdapt.harmonyInterpretationView?.enrichedDisplayFellBackToRaw === true &&
        (failAdapt.tonalityVaultHarmonyEnrichment?.warnings.some((w) =>
          w.includes('Tonality Vault enrichment failed')
        ) ??
          false) &&
        failAdapt.lockedChordBars !== undefined &&
        failAdapt.lockedChordBars.length === 3,
    });
  } finally {
    if (prevThrow === undefined) delete process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH;
    else process.env.COMPOSER_OS_TONALITY_VAULT_ENRICH = prevThrow;
  }

  return out;
}
