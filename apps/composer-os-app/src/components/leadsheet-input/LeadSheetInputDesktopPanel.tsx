import { useCallback, useState, type CSSProperties } from 'react';
import { isDesktopIpc } from '../../services/api';
import {
  LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS,
  buildLeadSheetHarmonyOverridePayload,
  mapLeadSheetFileInputResponseToPanelState,
  pickLeadSheetFile,
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

const MAX_CANDIDATES = 3;

function leadSheetComposerRosterText(): string {
  const labels = LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS.map((o) => o.label);
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function confidenceStripColor(confidence: number): keyof typeof CONFIDENCE_COLORS {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.5) return 'mid';
  return 'low';
}

const OVERRIDE_BAR_COLOR = 'rgba(103, 58, 183, 0.85)';

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
  const [rhythmicActivity, setRhythmicActivity] = useState(0.35);
  const [guitarCompDensity, setGuitarCompDensity] = useState(0.5);
  const [statusKind, setStatusKind] = useState<StatusKind>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<LeadSheetFileInputResponse[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [lastFilePath, setLastFilePath] = useState<string | null>(null);
  const [lastSourceFileName, setLastSourceFileName] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [harmonyConfidenceByBar, setHarmonyConfidenceByBar] = useState<number[]>([]);
  const [harmonyProvenanceByBar, setHarmonyProvenanceByBar] = useState<LeadSheetHarmonyProvenanceBar[]>([]);
  const [harmonyOverridesByBar, setHarmonyOverridesByBar] = useState<LeadSheetHarmonyOverridesByBar>({});
  const [selectedOverrideBar, setSelectedOverrideBar] = useState<number | null>(null);
  const [overrideDraft, setOverrideDraft] = useState('');

  const runPipeline = useCallback(
    async (filePath: string, sourceFileName: string, overrides: LeadSheetHarmonyOverridesByBar) => {
      setStatusKind('running');
      setCandidates([]);
      setSelectedCandidateIndex(null);
      setAdvisory(null);
      setHarmonyConfidenceByBar([]);
      setHarmonyProvenanceByBar([]);

      const overridePayload = buildLeadSheetHarmonyOverridePayload(overrides);
      const batchResults: LeadSheetFileInputResponse[] = [];

      for (let i = 0; i < MAX_CANDIDATES; i++) {
        setStatusMessage(
          `Running leadsheet pipeline for ${sourceFileName} (${composerId})… ${i + 1}/${MAX_CANDIDATES}`
        );

        const result = await runLeadSheetFileInputDesktop({
          filePath,
          composerId,
          seed: hiddenVariationSeed(),
          rhythmicActivity,
          guitarCompDensity,
          harmonyOverridesByBar: overridePayload,
        });

        if (!result.ok) {
          setStatusKind('error');
          setStatusMessage(result.error ?? `Leadsheet pipeline failed on version ${i + 1}/${MAX_CANDIDATES}.`);
          return;
        }

        batchResults.push(result);
      }

      const panelState = mapLeadSheetFileInputResponseToPanelState(batchResults[0]!);
      setAdvisory(panelState.advisory ?? null);
      setHarmonyConfidenceByBar(panelState.harmonyConfidenceByBar ?? []);
      setHarmonyProvenanceByBar(panelState.harmonyProvenanceByBar ?? []);
      setCandidates(batchResults);
      setSelectedCandidateIndex(null);
      setStatusKind('success');
      setStatusMessage(`3 versions ready for ${sourceFileName}. Pick one below.`);
    },
    [composerId, guitarCompDensity, rhythmicActivity]
  );

  const onUseCandidate = useCallback(async (index: number) => {
    const candidate = candidates[index];
    if (!candidate?.savedMusicXmlPath) return;

    setSelectedCandidateIndex(index);

    if (isDesktopIpc() && window.composerOsDesktop?.openFileDefaultApp) {
      const openR = await window.composerOsDesktop.openFileDefaultApp(candidate.savedMusicXmlPath);
      if (!openR.ok) {
        setStatusMessage(`Could not open file: ${openR.error ?? 'unknown error'}.`);
      }
    }
  }, [candidates]);

  const onOpenLeadSheetFile = useCallback(async () => {
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
    await runPipeline(picked.filepath, fileName, {});
  }, [runPipeline]);

  const onAnotherVersion = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName) return;
    setCandidates([]);
    setSelectedCandidateIndex(null);
    await runPipeline(lastFilePath, lastSourceFileName, harmonyOverridesByBar);
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
    await runPipeline(lastFilePath, lastSourceFileName, nextOverrides);
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
    await runPipeline(lastFilePath, lastSourceFileName, nextOverrides);
  }, [harmonyOverridesByBar, lastFilePath, lastSourceFileName, runPipeline, selectedOverrideBar]);

  const statusStyle =
    statusKind === 'success'
      ? statusOkStyle
      : statusKind === 'error'
        ? statusErrorStyle
        : statusMutedStyle;

  const canAnotherVersion = lastFilePath != null && statusKind !== 'running';

  return (
    <section style={panelStyle} aria-labelledby="leadsheet-input-desktop-heading">
      <h2 id="leadsheet-input-desktop-heading" style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>
        Lead Sheet Input (File→Open)
      </h2>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Desktop-only path: MusicXML or MIDI leadsheet → quintet + melody hand-off (parallel to Generate).
        Composer picker: {leadSheetComposerRosterText()}.{' '}
        <strong>MIDI input v1 supports single-track melody MIDI.</strong> Multi-track exports (Sibelius/DAW
        with separate lead / harmony / drums) will mislabel melody and harmony. For multi-track scores, use
        MusicXML export. Multi-track MIDI support will come in v2. MIDI import quantizes melody to eighth notes.
      </p>

      <label htmlFor="leadsheet-input-composer" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
        Composer
      </label>
      <select
        id="leadsheet-input-composer"
        value={composerId}
        onChange={(e) => setComposerId(e.target.value as LeadSheetFileInputComposerId)}
        disabled={statusKind === 'running'}
        style={{ width: '100%', maxWidth: 280, marginBottom: '0.75rem' }}
      >
        {LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id} title={opt.title}>
            {opt.label}
          </option>
        ))}
      </select>

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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => void onOpenLeadSheetFile()}
          disabled={statusKind === 'running'}
          style={{ fontSize: '0.9rem' }}
        >
          {statusKind === 'running' ? 'Running…' : 'Open MusicXML or MIDI leadsheet…'}
        </button>
        {canAnotherVersion ? (
          <button
            type="button"
            className="secondary"
            onClick={() => void onAnotherVersion()}
            disabled={statusKind === 'running'}
            style={{ fontSize: '0.9rem' }}
          >
            Another version
          </button>
        ) : null}
      </div>

      {statusMessage ? (
        <div role="status" style={statusStyle}>
          {statusMessage}
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

      {candidates.length > 0 ? (
        <div style={galleryStyle} aria-label="Generated version gallery">
          {candidates.map((candidate, i) => {
            const selected = selectedCandidateIndex === i;
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
                  onClick={() => void onUseCandidate(i)}
                  disabled={statusKind === 'running'}
                  style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}
                >
                  Use this
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
