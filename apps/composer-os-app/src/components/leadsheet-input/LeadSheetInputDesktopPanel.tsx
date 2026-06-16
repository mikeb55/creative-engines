import { useCallback, useState, type CSSProperties } from 'react';
import { isDesktopIpc } from '../../services/api';
import {
  LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS,
  pickLeadSheetFile,
  runLeadSheetFileInputDesktop,
  type LeadSheetFileInputComposerId,
  type LeadSheetFileInputResponse,
} from '../../services/leadSheetFileInputDesktop';

const CONFIDENCE_COLORS = {
  high: 'rgba(46, 125, 50, 0.85)',
  mid: 'rgba(255, 193, 7, 0.85)',
  low: 'rgba(220, 53, 69, 0.75)',
} as const;

function confidenceStripColor(confidence: number): keyof typeof CONFIDENCE_COLORS {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.5) return 'mid';
  return 'low';
}

function HarmonyConfidenceStrip({ confidences }: { confidences: number[] }) {
  if (confidences.length === 0) {
    return <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No harmony bars</span>;
  }
  return (
    <div
      role="img"
      aria-label="Harmony confidence by bar"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}
    >
      {confidences.map((confidence, i) => {
        const tier = confidenceStripColor(confidence);
        const title = `Bar ${i + 1}: confidence ${(confidence * 100).toFixed(0)}%`;
        return (
          <span
            key={i}
            title={title}
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background: CONFIDENCE_COLORS[tier],
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
  maxWidth: 560,
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

type StatusKind = 'idle' | 'running' | 'canceled' | 'success' | 'error';

function hiddenVariationSeed(): number {
  return Math.floor(Math.random() * 900_000) + 100_000;
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
  const [lastResult, setLastResult] = useState<LeadSheetFileInputResponse | null>(null);
  const [lastFilePath, setLastFilePath] = useState<string | null>(null);
  const [lastSourceFileName, setLastSourceFileName] = useState<string | null>(null);

  const runPipeline = useCallback(
    async (filePath: string, sourceFileName: string, variationSeed: number) => {
      setStatusKind('running');
      setStatusMessage(`Running leadsheet pipeline for ${sourceFileName} (${composerId})…`);
      setLastResult(null);

      const result = await runLeadSheetFileInputDesktop({
        filePath,
        composerId,
        seed: variationSeed,
        rhythmicActivity,
        guitarCompDensity,
      });

      setLastResult(result);
      if (!result.ok) {
        setStatusKind('error');
        setStatusMessage(result.error ?? 'Leadsheet pipeline failed.');
        return;
      }

      if (result.savedMusicXmlPath && isDesktopIpc() && window.composerOsDesktop?.openFileDefaultApp) {
        const openR = await window.composerOsDesktop.openFileDefaultApp(result.savedMusicXmlPath);
        if (!openR.ok) {
          setStatusKind('success');
          setStatusMessage(
            `Saved quintet (${result.partCount ?? 0} parts, ${result.barCount ?? 0} bars) for ${result.sourceFileName ?? sourceFileName}. Could not open file: ${openR.error ?? 'unknown error'}.`
          );
          return;
        }
      }

      setStatusKind('success');
      setStatusMessage(
        `Saved quintet (${result.partCount ?? 0} parts, ${result.barCount ?? 0} bars) for ${result.sourceFileName ?? sourceFileName}.`
      );
    },
    [composerId, guitarCompDensity, rhythmicActivity]
  );

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
    await runPipeline(picked.filepath, fileName, hiddenVariationSeed());
  }, [runPipeline]);

  const onAnotherVersion = useCallback(async () => {
    if (!lastFilePath || !lastSourceFileName) return;
    await runPipeline(lastFilePath, lastSourceFileName, hiddenVariationSeed());
  }, [lastFilePath, lastSourceFileName, runPipeline]);

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
        Supports Debussy, Kenny Wheeler, and Bartók.{' '}
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
          <option key={opt.id} value={opt.id}>
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

      {lastResult?.ok && lastResult.sourceFormat === 'midi' ? (
        <div style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
          <strong>MIDI — inferred harmony (advisory)</strong>
          {lastResult.midiQuantizeNote ? (
            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{lastResult.midiQuantizeNote}</div>
          ) : null}
          {lastResult.harmonyConfidenceByBar ? (
            <HarmonyConfidenceStrip confidences={lastResult.harmonyConfidenceByBar} />
          ) : null}
        </div>
      ) : null}

      {statusMessage ? (
        <div role="status" style={statusStyle}>
          {statusMessage}
          {lastResult?.ok && lastResult.savedMusicXmlPath ? (
            <div style={{ marginTop: '0.45rem', fontSize: '0.8rem', wordBreak: 'break-all' }}>
              Output: {lastResult.savedMusicXmlPath}
            </div>
          ) : null}
          {lastResult?.ok && lastResult.partIds ? (
            <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
              Parts: {lastResult.partIds.join(', ')}
              {lastResult.handoffVariationDetected ? ' · melody hand-off ✓' : ''}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
