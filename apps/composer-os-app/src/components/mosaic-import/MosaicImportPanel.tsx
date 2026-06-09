import {
  lazy,
  Suspense,
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from 'react';
import type { ImportHarmonyBar } from '@composer-os/core/import/mosaicImportTimeline';
import {
  confidenceStripColor,
  detectMosaicImportFormat,
  type MosaicImportMode,
  type MosaicImportWorkflow,
} from './useMosaicImportWorkflow';
import { isDesktopIpc } from '../../services/api';

const MosaicVariationConfig = lazy(() =>
  import('./MosaicVariationConfig').then((m) => ({ default: m.MosaicVariationConfig })),
);
const MosaicStyleTransferConfig = lazy(() =>
  import('./MosaicStyleTransferConfig').then((m) => ({ default: m.MosaicStyleTransferConfig })),
);

const ACCEPT =
  '.mid,.midi,.musicxml,.mxl,.xml,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,audio/midi,audio/x-midi';

const panelStyle: CSSProperties = {
  marginBottom: '1rem',
  maxWidth: 560,
  padding: '0.75rem 0.85rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
};

const dropZoneStyle: CSSProperties = {
  marginTop: '0.85rem',
  padding: '1rem',
  borderRadius: 8,
  border: '2px dashed var(--border)',
  background: 'var(--bg)',
  textAlign: 'center',
  cursor: 'pointer',
};

const errorBannerStyle: CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 6,
  background: 'rgba(220, 53, 69, 0.12)',
  border: '1px solid rgba(220, 53, 69, 0.45)',
  color: 'var(--text)',
  fontSize: '0.85rem',
};

const CONFIDENCE_COLORS: Record<ReturnType<typeof confidenceStripColor>, string> = {
  green: '#2e7d32',
  amber: '#ed6c02',
  red: '#c62828',
};

function midiPitchName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const oct = Math.floor(Math.round(midi) / 12) - 1;
  return `${names[pc]}${oct}`;
}

function melodyRangeSummary(melodyLine: { midiPitch: number }[]): string {
  if (melodyLine.length === 0) return '—';
  let lo = melodyLine[0]!.midiPitch;
  let hi = lo;
  for (const n of melodyLine) {
    lo = Math.min(lo, n.midiPitch);
    hi = Math.max(hi, n.midiPitch);
  }
  return `${midiPitchName(lo)}–${midiPitchName(hi)}`;
}

function provenanceLabel(sourceFormat: 'musicxml' | 'midi' | null): string {
  if (sourceFormat === 'musicxml') return 'MusicXML (explicit chords)';
  if (sourceFormat === 'midi') return 'MIDI (inferred chords)';
  return '—';
}

function HarmonyConfidenceStrip({ bars }: { bars: ImportHarmonyBar[] }) {
  if (bars.length === 0) {
    return <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No harmony bars</span>;
  }

  return (
    <div
      role="img"
      aria-label="Harmony confidence by bar"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}
    >
      {bars.map((bar) => {
        const tier = confidenceStripColor(bar.confidence);
        const title = `Bar ${bar.bar}: ${bar.chordSymbol} — confidence ${(bar.confidence * 100).toFixed(0)}% (${bar.fieldOrigin})`;
        return (
          <span
            key={bar.bar}
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

const MODE_BUTTONS: { id: MosaicImportMode; label: string }[] = [
  { id: 'lock', label: 'Lock & Generate' },
  { id: 'variations', label: 'Generate Variations' },
  { id: 'styleTransfer', label: 'Style-Transfer' },
];

async function fileFromDesktopPath(filepath: string): Promise<File> {
  const bridge = window.composerOsDesktop;
  if (!bridge?.invokeApi) {
    throw new Error('Desktop IPC bridge is not available.');
  }
  const res = (await bridge.invokeApi('composer-os-api:read-file-binary', { path: filepath })) as {
    base64: string;
    fileName: string;
  };
  const binary = atob(res.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], res.fileName);
}

export interface MosaicImportPanelProps {
  workflow: MosaicImportWorkflow;
  /** When true, `<details>` starts expanded (tests). */
  defaultOpen?: boolean;
  generateBusy?: boolean;
  onImportModeGenerate?: (mode: MosaicImportMode) => void;
  /** Primary songwriter id — default style-transfer target. */
  defaultTargetComposer?: string;
  composerOptions?: readonly { id: string; label: string }[];
  /** Composer OS library root (same as HomeGenerate "Library folder:"). */
  libraryFolderPath?: string;
  /** Desktop IPC only — opens library folder in Explorer. */
  onOpenLibraryFolder?: () => void;
}

export function MosaicImportPanel({
  workflow,
  defaultOpen = false,
  generateBusy = false,
  onImportModeGenerate,
  defaultTargetComposer,
  composerOptions = [],
  libraryFolderPath,
  onOpenLibraryFolder,
}: MosaicImportPanelProps) {
  const { state, actions } = workflow;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onBrowse = useCallback(async () => {
    if (isDesktopIpc() && window.composerOsDesktop?.invokeApi) {
      try {
        const picked = (await window.composerOsDesktop.invokeApi('composer-os-api:pick-mosaic-import-file', {
          defaultPath: libraryFolderPath,
        })) as { ok?: boolean; canceled?: boolean; filepath?: string };
        if (!picked?.ok || !picked.filepath) return;
        if (!detectMosaicImportFormat(picked.filepath)) return;
        const file = await fileFromDesktopPath(picked.filepath);
        void actions.loadFile(file);
      } catch {
        /* fall back to hidden file input */
        inputRef.current?.click();
      }
      return;
    }
    inputRef.current?.click();
  }, [actions, libraryFolderPath]);

  const ingestFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!detectMosaicImportFormat(file.name)) return;
      void actions.loadFile(file);
    },
    [actions],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      ingestFile(e.target.files?.[0]);
      e.target.value = '';
    },
    [ingestFile],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      ingestFile(e.dataTransfer.files?.[0]);
    },
    [ingestFile],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const ir = state.importTimeline;
  const tempoLabel =
    state.tempoBpm != null ? `${state.tempoBpm} BPM` : ir?.sourceFormat === 'musicxml' ? '—' : '120 BPM (default)';

  return (
    <details style={panelStyle} open={defaultOpen}>
      <summary
        style={{
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--text)',
          listStylePosition: 'outside',
        }}
      >
        뿯▽ Import (MIDI / MusicXML)
      </summary>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={onInputChange}
        data-testid="mosaic-import-file-input"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={onBrowse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onBrowse();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          ...dropZoneStyle,
          borderColor: dragOver ? 'var(--accent, #5b8def)' : 'var(--border)',
        }}
        data-testid="mosaic-import-dropzone"
      >
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)' }}>
          Drop .mid / .midi / .musicxml / .mxl / .xml here
        </p>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: '0.65rem' }}
          data-testid="mosaic-import-browse"
          onClick={(e) => {
            e.stopPropagation();
            void onBrowse();
          }}
        >
          Browse
        </button>
        {libraryFolderPath ? (
          <p style={{ margin: '0.55rem 0 0', fontSize: '0.8rem' }}>
            {onOpenLibraryFolder ? (
              <button
                type="button"
                className="secondary"
                data-testid="mosaic-import-open-library"
                onClick={onOpenLibraryFolder}
                style={{ fontSize: '0.8rem', padding: '0.2rem 0.45rem' }}
              >
                Open library folder
              </button>
            ) : (
              <>
                <span style={{ color: 'var(--text-muted)' }}>Library folder: </span>
                <code
                  data-testid="mosaic-import-library-path"
                  style={{ userSelect: 'all', fontSize: '0.78rem', wordBreak: 'break-all' }}
                >
                  {libraryFolderPath}
                </code>
              </>
            )}
          </p>
        ) : null}
        {state.fileName ? (
          <p style={{ margin: '0.65rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Loaded: <strong style={{ color: 'var(--text)' }}>{state.fileName}</strong>
            {' 뿯½ '}
            <button type="button" className="secondary" onClick={actions.clearImport}>
              Clear
            </button>
          </p>
        ) : null}
      </div>

      {state.parseError ? (
        <div style={errorBannerStyle} role="alert" data-testid="mosaic-import-error">
          <strong>Parse error:</strong> {state.parseError}
          {state.parseDiagnostics.length > 0 ? (
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
              {state.parseDiagnostics.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {ir ? (
        <div style={{ marginTop: '0.85rem' }} data-testid="mosaic-import-summary">
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.45rem',
              borderRadius: 4,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              marginBottom: '0.5rem',
            }}
            data-testid="mosaic-import-provenance"
          >
            {provenanceLabel(ir.sourceFormat)}
          </span>

          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '0.35rem 0.75rem',
              margin: 0,
              fontSize: '0.85rem',
            }}
          >
            <dt style={{ color: 'var(--text-muted)' }}>Bars</dt>
            <dd style={{ margin: 0 }}>{ir.bars}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Time sig</dt>
            <dd style={{ margin: 0 }}>
              {ir.timeSig.num}/{ir.timeSig.den}
            </dd>
            <dt style={{ color: 'var(--text-muted)' }}>Key</dt>
            <dd style={{ margin: 0 }}>
              {ir.keyEstimate.tonic} {ir.keyEstimate.mode} (
              {(ir.keyEstimate.confidence * 100).toFixed(0)}%)
            </dd>
            <dt style={{ color: 'var(--text-muted)' }}>Tempo</dt>
            <dd style={{ margin: 0 }}>{tempoLabel}</dd>
          </dl>

          <p style={{ margin: '0.65rem 0 0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Harmony confidence
          </p>
          <HarmonyConfidenceStrip bars={ir.harmonyByBar} />

          <p style={{ margin: '0.65rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Melody: {ir.melodyLine.length} notes — range {melodyRangeSummary(ir.melodyLine)}
          </p>

          <div
            role="group"
            aria-label="Import generation mode"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: '0.75rem' }}
          >
            {MODE_BUTTONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={state.importMode === id ? undefined : 'secondary'}
                aria-pressed={state.importMode === id}
                data-testid={`mosaic-import-mode-${id}`}
                disabled={generateBusy || !ir}
                onClick={() => {
                  actions.setMode(id);
                  onImportModeGenerate?.(id);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {state.importMode === 'variations' ? (
            <Suspense fallback={null}>
              <MosaicVariationConfig workflow={workflow} />
            </Suspense>
          ) : null}

          {state.importMode === 'styleTransfer' ? (
            <Suspense fallback={null}>
              <MosaicStyleTransferConfig
                workflow={workflow}
                composerOptions={composerOptions}
                defaultTargetComposer={defaultTargetComposer}
              />
              {state.styleTransferConfig.targetComposer === 'barry_harris' ? (
                <p
                  style={{ margin: '0.55rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  data-testid="mosaic-bh-input-guidance"
                >
                  Import a MIDI/MusicXML melody, or type chord symbols below. Barry Harris works
                  best with jazz standards and chromatic melodies.
                </p>
              ) : null}
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
