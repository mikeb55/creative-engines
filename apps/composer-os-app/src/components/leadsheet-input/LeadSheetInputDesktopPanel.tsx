import { useCallback, useState, type CSSProperties } from 'react';
import {
  LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS,
  pickLeadSheetMusicXmlFile,
  runLeadSheetFileInputDesktop,
  type LeadSheetFileInputComposerId,
  type LeadSheetFileInputResponse,
} from '../../services/leadSheetFileInputDesktop';

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

type StatusKind = 'idle' | 'running' | 'canceled' | 'success' | 'error';

export function LeadSheetInputDesktopPanel(): JSX.Element {
  const [composerId, setComposerId] = useState<LeadSheetFileInputComposerId>('debussy');
  const [statusKind, setStatusKind] = useState<StatusKind>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LeadSheetFileInputResponse | null>(null);

  const onOpenLeadSheetFile = useCallback(async () => {
    setStatusKind('running');
    setStatusMessage('Choosing MusicXML file…');
    setLastResult(null);

    const picked = await pickLeadSheetMusicXmlFile();
    if (picked.canceled || !picked.ok || !picked.filepath) {
      setStatusKind('canceled');
      setStatusMessage('No file selected.');
      return;
    }

    const fileName = picked.filepath.replace(/^.*[/\\]/, '');
    setStatusMessage(`Running leadsheet pipeline for ${fileName} (${composerId})…`);

    const result = await runLeadSheetFileInputDesktop({
      filePath: picked.filepath,
      composerId,
    });

    setLastResult(result);
    if (!result.ok) {
      setStatusKind('error');
      setStatusMessage(result.error ?? 'Leadsheet pipeline failed.');
      return;
    }

    setStatusKind('success');
    setStatusMessage(
      `Saved quintet (${result.partCount ?? 0} parts, ${result.barCount ?? 0} bars) for ${result.sourceFileName ?? fileName}.`
    );
  }, [composerId]);

  const statusStyle =
    statusKind === 'success'
      ? statusOkStyle
      : statusKind === 'error'
        ? statusErrorStyle
        : statusMutedStyle;

  return (
    <section style={panelStyle} aria-labelledby="leadsheet-input-desktop-heading">
      <h2 id="leadsheet-input-desktop-heading" style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>
        Lead Sheet Input (File→Open)
      </h2>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Desktop-only path: MusicXML file → quintet + melody hand-off (parallel to Generate). Supports Debussy
        and Kenny Wheeler.
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

      <button
        type="button"
        onClick={() => void onOpenLeadSheetFile()}
        disabled={statusKind === 'running'}
        style={{ fontSize: '0.9rem' }}
      >
        {statusKind === 'running' ? 'Running…' : 'Open MusicXML leadsheet…'}
      </button>

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
