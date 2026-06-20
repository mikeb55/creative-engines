import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { api, isDesktopIpc } from '../../services/api';
import {
  LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS,
  buildLeadSheetHarmonyOverridePayload,
  getLeadSheetComposerDescription,
  mapLeadSheetFileInputResponseToPanelState,
  pickLeadSheetFile,
  previewLeadSheetOutputFilename,
  runLeadSheetFileInputDesktop,
  type LeadSheetFileInputComposerId,
  type LeadSheetFileInputResponse,
  type LeadSheetHarmonyOverridesByBar,
  type LeadSheetHarmonyProvenanceBar,
} from '../../services/leadSheetFileInputDesktop';

const CONFIDENCE_COLORS = {
  high: 'rgba(46, 125, 50, 0.85)',
  mid: 'rgba(255, 193, 7, 0.85)',
  low: 'rgba(220, 53, 69, 0.75)',
} as const;

const MAX_COMPARE_CANDIDATES = 3;

function confidenceStripColor(confidence: number): keyof typeof CONFIDENCE_COLORS {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.5) return 'mid';
  return 'low';
}

const OVERRIDE_BAR_COLOR = 'rgba(103, 58, 183, 0.85)';

function dirnameOnly(fp: string): string {
  const p = fp.replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(0, li) : p;
}

function HarmonyConfidenceStrip(props: {
  confidences: number[];
  provenanceByBar?: LeadSheetHarmonyProvenanceBar[];
  overridesByBar: LeadSheetHarmonyOverridesByBar;
  selectedBar: number | null;
  disabled?: boolean;
  onSelectBar: (bar: number) => void;
}) {
  const { confidences, provenanceByBar, overridesByBar, selectedBar, disabled, onSelectBar } = props;
  if (confidences.length === 0) {
    return <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No harmony bars</span>;
  }
  return (
    <div
      role="group"
      aria-label="Harmony confidence by bar"
      data-testid="leadsheet-harmony-override-strip"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}
    >
      {confidences.map((confidence, i) => {
        const bar = i + 1;
        const tier = confidenceStripColor(confidence);
        const isOverridden =
          provenanceByBar?.[i] === 'user-override' || overridesByBar[bar] != null;
        const overrideSymbol = overridesByBar[bar];
        const title = isOverridden
          ? `Bar ${bar}: override ${overrideSymbol ?? 'saved'}`
          : `Bar ${bar}: confidence ${(confidence * 100).toFixed(0)}%`;
        const isSelected = selectedBar === bar;
        return (
          <button
            key={bar}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onSelectBar(bar)}
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              padding: 0,
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: isOverridden ? OVERRIDE_BAR_COLOR : CONFIDENCE_COLORS[tier],
              border: isSelected
                ? '2px solid rgba(25, 118, 210, 0.95)'
                : isOverridden
                  ? '2px solid rgba(103, 58, 183, 1)'
                  : '1px solid transparent',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

const panelStyle: CSSProperties = {
  marginBottom: '1rem',
  maxWidth: 720,
  padding: '0.75rem 0.85rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
};

const stepStyle: CSSProperties = {
  marginBottom: '1rem',
};

const stepHeadingStyle: CSSProperties = {
  margin: '0 0 0.45rem',
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'var(--text)',
};

const statusOkStyle: CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 6,
  background: 'rgba(46, 125, 50, 0.12)',
  border: '1px solid rgba(46, 125, 50, 0.45)',
  fontSize: '0.85rem',
};

const statusMutedStyle: CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 6,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
};

const statusErrorStyle: CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 6,
  background: 'rgba(220, 53, 69, 0.12)',
  border: '1px solid rgba(220, 53, 69, 0.45)',
  fontSize: '0.85rem',
};

const advisoryBannerStyle: CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 6,
  background: 'rgba(255, 193, 7, 0.12)',
  border: '1px solid rgba(255, 193, 7, 0.45)',
  fontSize: '0.85rem',
};

const resultPanelStyle: CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.75rem 0.85rem',
  borderRadius: 6,
  background: 'rgba(46, 125, 50, 0.08)',
  border: '1px solid rgba(46, 125, 50, 0.45)',
  fontSize: '0.85rem',
};

const sliderRowStyle: CSSProperties = {
  marginBottom: '0.75rem',
};

const sliderLabelStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '0.5rem',
  fontSize: '0.85rem',
  marginBottom: 4,
};

const galleryStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.5rem',
  marginTop: '0.75rem',
};

type StatusKind = 'idle' | 'running' | 'canceled' | 'success' | 'error';

function hiddenVariationSeed(): number {
  return Math.floor(Math.random() * 900_000) + 100_000;
}

function outputFileName(savedMusicXmlPath: string | undefined): string {
  if (!savedMusicXmlPath) return '—';
  return savedMusicXmlPath.replace(/^.*[/\\]/, '');
}

function candidateCardStyle(selected: boolean): CSSProperties {
  return {
    padding: '0.65rem 0.75rem',
    borderRadius: 6,
    border: selected ? '2px solid rgba(46, 125, 50, 0.85)' : '1px solid var(--border)',
    background: selected ? 'rgba(46, 125, 50, 0.08)' : 'var(--bg)',
    fontSize: '0.82rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  };
}

function VariationSlider(props: {
  id: string;
  label: string;
  leftHint: string;
  rightHint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const pct = Math.round(props.value * 100);
  return (
    <div style={sliderRowStyle}>
      <div style={sliderLabelStyle}>
        <label htmlFor={props.id}>{props.label}</label>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} aria-hidden="true">
          {props.leftHint} ↔ {props.rightHint}
        </span>
      </div>
      <input
        id={props.id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => props.onChange(Number.parseInt(e.target.value, 10) / 100)}
        disabled={props.disabled}
        aria-valuetext={`${pct}% toward ${props.rightHint}`}
        style={{ width: '100%', maxWidth: 360 }}
      />
    </div>
  );
}

export function LeadSheetInputDesktopPanel(): JSX.Element {
  const [composerId, setComposerId] = useState<LeadSheetFileInputComposerId>('debussy');
  const [outputLabel, setOutputLabel] = useState('');
  const [rhythmicActivity, setRhythmicActivity] = useState(0.35);
  const [guitarCompDensity, setGuitarCompDensity] = useState(0.5);
  const [statusKind, setStatusKind] = useState<StatusKind>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [result, setResult] = useState<LeadSheetFileInputResponse | null>(null);
  const [compareCandidates, setCompareCandidates] = useState<LeadSheetFileInputResponse[]>([]);
  const [selectedCompareIndex, setSelectedCompareIndex] = useState<number | null>(null);
  const [lastFilePath, setLastFilePath] = useState<string | null>(null);
  const [lastSourceFileName, setLastSourceFileName] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [harmonyConfidenceByBar, setHarmonyConfidenceByBar] = useState<number[]>([]);
  const [harmonyProvenanceByBar, setHarmonyProvenanceByBar] = useState<LeadSheetHarmonyProvenanceBar[]>([]);
  const [harmonyOverridesByBar, setHarmonyOverridesByBar] = useState<LeadSheetHarmonyOverridesByBar>({});
  const [selectedOverrideBar, setSelectedOverrideBar] = useState<number | null>(null);
  const [overrideDraft, setOverrideDraft] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);

  const composerDescription = getLeadSheetComposerDescription(composerId);
  const filenamePreview = useMemo(
    () => previewLeadSheetOutputFilename(outputLabel, composerId, lastSourceFileName),
    [composerId, lastSourceFileName, outputLabel]
  );

  const applyPanelStateFromResult = useCallback((response: LeadSheetFileInputResponse) => {
    const panelState = mapLeadSheetFileInputResponseToPanelState(response);
    setAdvisory(panelState.advisory ?? null);
    setHarmonyConfidenceByBar(panelState.harmonyConfidenceByBar ?? []);
    setHarmonyProvenanceByBar(panelState.harmonyProvenanceByBar ?? []);
  }, []);

  const runOnce = useCallback(
    async (
      filePath: string,
      _sourceFileName: string,
      overrides: LeadSheetHarmonyOverridesByBar
    ): Promise<LeadSheetFileInputResponse | null> => {
      const overridePayload = buildLeadSheetHarmonyOverridePayload(overrides);
      const trimmedLabel = outputLabel.trim();
      return runLeadSheetFileInputDesktop({
        filePath,
        composerId,
        seed: hiddenVariationSeed(),
        rhythmicActivity,
        guitarCompDensity,
        harmonyOverridesByBar: overridePayload,
        ...(trimmedLabel ? { outputLabel: trimmedLabel } : {}),
      });
    },
    [composerId, guitarCompDensity, outputLabel, rhythmicActivity]
  );

  const runPipeline = useCallback(
    async (
      filePath: string,
      sourceFileName: string,
      overrides: LeadSheetHarmonyOverridesByBar,
      candidateCount: number
    ) => {
      setStatusKind('running');
      setCompareCandidates([]);
      setSelectedCompareIndex(null);
      setFolderError(null);

      const batchResults: LeadSheetFileInputResponse[] = [];

      for (let i = 0; i < candidateCount; i++) {
        setStatusMessage(
          candidateCount === 1
            ? `Generating quintet for ${sourceFileName} (${composerId})…`
            : `Generating version ${i + 1}/${candidateCount} for ${sourceFileName}…`
        );

        const pipelineResult = await runOnce(filePath, sourceFileName, overrides);

        if (!pipelineResult?.ok) {
          setResult(null);
          setStatusKind('error');
          setStatusMessage(
            pipelineResult?.error ??
              `Leadsheet pipeline failed${candidateCount > 1 ? ` on version ${i + 1}/${candidateCount}` : ''}.`
          );
          return;
        }

        batchResults.push(pipelineResult);
      }

      const primary = batchResults[0]!;
      applyPanelStateFromResult(primary);
      setResult(primary);

      if (candidateCount > 1) {
        setCompareCandidates(batchResults);
        setSelectedCompareIndex(null);
        setStatusKind('success');
        setStatusMessage(`${candidateCount} versions ready. Compare below in More options.`);
      } else {
        setStatusKind('success');
        setStatusMessage(`Quintet ready for ${sourceFileName}.`);
      }
    },
    [applyPanelStateFromResult, composerId, runOnce]
  );

  const onGenerate = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName) {
      setStatusKind('error');
      setStatusMessage('Choose a MusicXML or MIDI leadsheet file first.');
      return;
    }
    await runPipeline(lastFilePath, lastSourceFileName, harmonyOverridesByBar, 1);
  }, [harmonyOverridesByBar, lastFilePath, lastSourceFileName, runPipeline]);

  const onGenerateCompareBatch = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName) return;
    await runPipeline(lastFilePath, lastSourceFileName, harmonyOverridesByBar, MAX_COMPARE_CANDIDATES);
  }, [harmonyOverridesByBar, lastFilePath, lastSourceFileName, runPipeline]);

  const onOpenFolder = useCallback(async (folderPath: string) => {
    setFolderError(null);
    try {
      const r = await api.openOutputFolder({ path: folderPath });
      if (!r.success && r.message) {
        setFolderError(r.message);
      }
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const onOpenFile = useCallback(async (filePath: string) => {
    setFolderError(null);
    if (!isDesktopIpc() || !window.composerOsDesktop?.openFileDefaultApp) {
      setFolderError('Open file is only available in the desktop app.');
      return;
    }
    const openR = await window.composerOsDesktop.openFileDefaultApp(filePath);
    if (!openR.ok) {
      setFolderError(openR.error ?? 'Could not open file.');
    }
  }, []);

  const onChooseLeadSheetFile = useCallback(async () => {
    setStatusMessage('Choosing leadsheet file…');
    const picked = await pickLeadSheetFile();
    if (picked.canceled || !picked.ok || !picked.filepath) {
      setStatusKind('canceled');
      setStatusMessage('No file selected.');
      return;
    }

    const fileName = picked.filepath.replace(/^.*[/\\]/, '');
    setLastFilePath(picked.filepath);
    setLastSourceFileName(fileName);
    setHarmonyOverridesByBar({});
    setSelectedOverrideBar(null);
    setOverrideDraft('');
    setResult(null);
    setCompareCandidates([]);
    setSelectedCompareIndex(null);
    setAdvisory(null);
    setHarmonyConfidenceByBar([]);
    setHarmonyProvenanceByBar([]);
    setStatusKind('idle');
    setStatusMessage(`Loaded ${fileName}. Pick a style and click Generate.`);
  }, []);

  const onAnotherVersion = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName) return;
    await runPipeline(lastFilePath, lastSourceFileName, harmonyOverridesByBar, 1);
  }, [harmonyOverridesByBar, lastFilePath, lastSourceFileName, runPipeline]);

  const onSelectOverrideBar = useCallback(
    (bar: number) => {
      setSelectedOverrideBar(bar);
      setOverrideDraft(harmonyOverridesByBar[bar] ?? '');
    },
    [harmonyOverridesByBar]
  );

  const onSaveOverride = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName || selectedOverrideBar == null) return;
    const symbol = overrideDraft.trim();
    if (!symbol) return;
    const nextOverrides = { ...harmonyOverridesByBar, [selectedOverrideBar]: symbol };
    setHarmonyOverridesByBar(nextOverrides);
    await runPipeline(lastFilePath, lastSourceFileName, nextOverrides, 1);
  }, [
    harmonyOverridesByBar,
    lastFilePath,
    lastSourceFileName,
    overrideDraft,
    runPipeline,
    selectedOverrideBar,
  ]);

  const onClearOverride = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName || selectedOverrideBar == null) return;
    const nextOverrides = { ...harmonyOverridesByBar };
    delete nextOverrides[selectedOverrideBar];
    setHarmonyOverridesByBar(nextOverrides);
    setOverrideDraft('');
    await runPipeline(lastFilePath, lastSourceFileName, nextOverrides, 1);
  }, [harmonyOverridesByBar, lastFilePath, lastSourceFileName, runPipeline, selectedOverrideBar]);

  const statusStyle =
    statusKind === 'success'
      ? statusOkStyle
      : statusKind === 'error'
        ? statusErrorStyle
        : statusMutedStyle;

  const canGenerate = lastFilePath != null && statusKind !== 'running';
  const savedPath = result?.savedMusicXmlPath;

  return (
    <section style={panelStyle} aria-labelledby="leadsheet-input-desktop-heading" data-testid="leadsheet-guided-panel">
      <h2 id="leadsheet-input-desktop-heading" style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
        Lead Sheet Input
      </h2>

      <div style={stepStyle}>
        <h3 style={stepHeadingStyle}>1. Load MusicXML or MIDI</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => void onChooseLeadSheetFile()}
            disabled={statusKind === 'running'}
            style={{ fontSize: '0.9rem' }}
          >
            Choose file…
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {lastSourceFileName ? `Loaded: ${lastSourceFileName}` : 'No file selected'}
          </span>
        </div>
      </div>

      <div style={stepStyle}>
        <h3 style={stepHeadingStyle}>2. Style</h3>
        <label htmlFor="leadsheet-input-composer" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
          Composer
        </label>
        <select
          id="leadsheet-input-composer"
          value={composerId}
          onChange={(e) => setComposerId(e.target.value as LeadSheetFileInputComposerId)}
          disabled={statusKind === 'running'}
          style={{ width: '100%', maxWidth: 280, marginBottom: '0.45rem' }}
        >
          {LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} title={opt.title}>
              {opt.label}
            </option>
          ))}
        </select>
        {composerDescription ? (
          <p
            data-testid="leadsheet-composer-description"
            style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}
          >
            <strong>{LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS.find((o) => o.id === composerId)?.label}:</strong>{' '}
            {composerDescription}
          </p>
        ) : null}
      </div>

      <div style={stepStyle}>
        <h3 style={stepHeadingStyle}>3. Output name (optional)</h3>
        <label htmlFor="leadsheet-output-label" className="visually-hidden">
          Output name
        </label>
        <input
          id="leadsheet-output-label"
          type="text"
          value={outputLabel}
          onChange={(e) => setOutputLabel(e.target.value)}
          placeholder="e.g. my-bridge-take"
          disabled={statusKind === 'running'}
          data-testid="leadsheet-output-label"
          style={{
            width: '100%',
            maxWidth: 360,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        />
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Saves as <code style={{ fontSize: '0.76rem' }}>{filenamePreview}</code>
        </p>
      </div>

      <div style={stepStyle}>
        <h3 style={stepHeadingStyle}>4. Generate</h3>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!canGenerate}
          data-testid="leadsheet-generate-primary"
          style={{ fontSize: '0.95rem' }}
        >
          {statusKind === 'running' ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {statusMessage && statusKind !== 'success' ? (
        <div role="status" style={statusStyle}>
          {statusMessage}
        </div>
      ) : null}

      {savedPath && statusKind === 'success' ? (
        <div style={stepStyle} data-testid="leadsheet-result-panel">
          <h3 style={stepHeadingStyle}>5. Output</h3>
          <div style={resultPanelStyle} role="status">
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{statusMessage ?? 'Quintet ready.'}</p>
            <p
              data-testid="leadsheet-output-path"
              style={{ margin: '0 0 0.5rem', wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}
            >
              {savedPath}
            </p>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {result?.partCount ?? 0} parts · {result?.barCount ?? 0} bars
              {result?.handoffVariationDetected ? ' · melody hand-off ✓' : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => void onOpenFolder(dirnameOnly(savedPath))}
                data-testid="leadsheet-open-folder"
              >
                Open folder
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void onOpenFile(savedPath)}
                data-testid="leadsheet-open-file"
              >
                Open file
              </button>
            </div>
            {folderError ? (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--error)' }}>
                {folderError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <details style={{ marginTop: '0.5rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
          More options
        </summary>
        <div style={{ marginTop: '0.75rem' }}>
          <VariationSlider
            id="leadsheet-rhythmic-activity"
            label="Rhythmic activity"
            leftHint="calmer"
            rightHint="more active"
            value={rhythmicActivity}
            onChange={setRhythmicActivity}
            disabled={statusKind === 'running'}
          />

          <VariationSlider
            id="leadsheet-guitar-comp"
            label="Guitar comp"
            leftHint="lighter"
            rightHint="busier"
            value={guitarCompDensity}
            onChange={setGuitarCompDensity}
            disabled={statusKind === 'running'}
          />

          <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            <strong>MIDI input v1 supports single-track melody MIDI.</strong> Multi-track exports (Sibelius/DAW with
            separate lead / harmony / drums) will mislabel melody and harmony. For multi-track scores, use MusicXML
            export. Multi-track MIDI support will come in v2. MIDI import quantizes melody to eighth notes.
          </p>

          {canGenerate ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => void onAnotherVersion()}
                disabled={statusKind === 'running'}
              >
                Another version
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void onGenerateCompareBatch()}
                disabled={statusKind === 'running'}
              >
                Generate 3 versions to compare
              </button>
            </div>
          ) : null}

          {advisory ? (
            <div
              role="status"
              aria-label="Harmony inferred advisory"
              data-testid="leadsheet-harmony-advisory"
              style={advisoryBannerStyle}
            >
              <strong>Harmony inferred (advisory)</strong>
              <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{advisory}</div>
              {harmonyConfidenceByBar.length > 0 ? (
                <HarmonyConfidenceStrip
                  confidences={harmonyConfidenceByBar}
                  provenanceByBar={harmonyProvenanceByBar}
                  overridesByBar={harmonyOverridesByBar}
                  selectedBar={selectedOverrideBar}
                  disabled={statusKind === 'running'}
                  onSelectBar={onSelectOverrideBar}
                />
              ) : null}
              {selectedOverrideBar != null && advisory ? (
                <div
                  data-testid="leadsheet-harmony-override-editor"
                  style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}
                >
                  <label htmlFor="leadsheet-harmony-override-input" style={{ fontSize: '0.82rem' }}>
                    Bar {selectedOverrideBar} chord
                  </label>
                  <input
                    id="leadsheet-harmony-override-input"
                    type="text"
                    value={overrideDraft}
                    onChange={(e) => setOverrideDraft(e.target.value)}
                    disabled={statusKind === 'running'}
                    placeholder="e.g. Dm7"
                    style={{ flex: '1 1 120px', maxWidth: 160, fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void onSaveOverride()}
                    disabled={statusKind === 'running' || !overrideDraft.trim()}
                    style={{ fontSize: '0.82rem' }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void onClearOverride()}
                    disabled={
                      statusKind === 'running' ||
                      (harmonyOverridesByBar[selectedOverrideBar] == null && !overrideDraft.trim())
                    }
                    style={{ fontSize: '0.82rem' }}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {compareCandidates.length > 0 ? (
            <div style={galleryStyle} aria-label="Generated version gallery">
              {compareCandidates.map((candidate, i) => {
                const selected = selectedCompareIndex === i;
                return (
                  <article
                    key={candidate.savedMusicXmlPath ?? i}
                    style={candidateCardStyle(selected)}
                    aria-current={selected ? 'true' : undefined}
                  >
                    <div style={{ fontWeight: 600 }}>Version {i + 1}</div>
                    <div
                      style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--text-muted)' }}
                      title={candidate.savedMusicXmlPath}
                    >
                      {outputFileName(candidate.savedMusicXmlPath)}
                    </div>
                    <div>
                      {candidate.partCount ?? 0} parts · {candidate.barCount ?? 0} bars
                    </div>
                    {candidate.handoffVariationDetected ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>melody hand-off ✓</div>
                    ) : null}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setSelectedCompareIndex(i);
                        setResult(candidate);
                        applyPanelStateFromResult(candidate);
                      }}
                      disabled={statusKind === 'running'}
                      style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}
                    >
                      Use in result
                    </button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
