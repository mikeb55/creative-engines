import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import type { StyleTransferEcho } from '@composer-os/app-api/appApiTypes';
import { configureDeferredEngine, cancelAll, enqueue } from '@engine/deferredEngine.js';
import { api, isDesktopIpc } from '../../services/api';
import {
  detectMosaicImportFormat,
  useMosaicImportWorkflow,
} from '../mosaic-import/useMosaicImportWorkflow';
import styles from './ArrangerTab.module.css';
import {
  ARRANGER_DEFAULT_STYLE_TRANSFER_STRENGTH,
  ARRANGER_ERROR_MESSAGES,
  ARRANGER_PROGRESS_STAGES,
  arrangerComposerLabel,
  averageTimelineConfidence,
  buildArrangerGeneratePayload,
  chordMelodyDetailLines,
  confidenceDotCount,
  composerSubtitle,
  formatElapsed,
  formatKeyLabel,
  listArrangerPresetOptions,
  listArrangerStyleTransferComposers,
  mapArrangerError,
  midiPathFromMusicXmlPath,
  progressStageIndex,
  resolveArrangerOutputPath,
  type ArrangerErrorCode,
} from './arrangerHelpers';

const ACCEPT =
  '.mid,.midi,.musicxml,.mxl,.xml,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,audio/midi,audio/x-midi';

const DEFAULT_COMPOSER_ID = 'barry_harris';
const DEFAULT_PRESET_ID = 'song_mode';

type RunPhase = 'idle' | 'progress' | 'result' | 'error';

type ArrangerGenResult = {
  success?: boolean;
  error?: string;
  filepath?: string;
  ensembleMusicXmlFilepath?: string;
  manifestPath?: string;
  styleTransferEcho?: StyleTransferEcho;
  exportIntegrityPassed?: boolean;
  runManifest?: { exportIntegrityPassed?: boolean };
};



function normalizeArrangerOutputLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function basenameOnly(fp: string): string {
  const p = fp.replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(li + 1) : p;
}

function triggerBrowserFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function openMusicXmlFile(filepath: string): Promise<void> {
  if (isDesktopIpc() && window.composerOsDesktop?.openFileDefaultApp) {
    const r = await window.composerOsDesktop.openFileDefaultApp(filepath);
    if (!r.ok) throw new Error(r.error || 'Could not open file');
    return;
  }
  const r = await api.openOutputFolder({ path: filepath });
  if (!r.success && r.message) {
    throw new Error(r.message);
  }
}

async function downloadPathToBrowser(filepath: string): Promise<void> {
  const name = basenameOnly(filepath);
  if (isDesktopIpc() && window.composerOsDesktop?.invokeApi) {
    const res = (await window.composerOsDesktop.invokeApi('composer-os-api:read-file-binary', {
      path: filepath,
    })) as { base64: string; fileName?: string };
    const binary = atob(res.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    triggerBrowserFileDownload(new Blob([bytes]), res.fileName?.trim() || name);
    return;
  }
  const url = `/api/download-file?path=${encodeURIComponent(filepath)}`;
  let r: Response;
  try {
    r = await fetch(url);
  } catch {
    throw new Error('Composer OS is not reachable. Make sure the app is running and try again.');
  }
  if (!r.ok) {
    const text = await r.text();
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* use raw */
    }
    throw new Error(msg || `Download failed (${r.status})`);
  }
  const blob = await r.blob();
  triggerBrowserFileDownload(blob, name);
}

async function fileFromDesktopPath(filepath: string): Promise<File> {
  const bridge = window.composerOsDesktop;
  if (!bridge?.invokeApi) throw new Error('Desktop IPC bridge is not available.');
  const res = (await bridge.invokeApi('composer-os-api:read-file-binary', { path: filepath })) as {
    base64: string;
    fileName: string;
  };
  const binary = atob(res.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], res.fileName);
}

export function ArrangerTab() {
  const workflow = useMosaicImportWorkflow();
  const { state, actions } = workflow;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [runPhase, setRunPhase] = useState<RunPhase>('idle');
  const [errorCode, setErrorCode] = useState<ArrangerErrorCode>('E0');
  const [result, setResult] = useState<ArrangerGenResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [revealOpened, setRevealOpened] = useState(false);
  const [outputLabel, setOutputLabel] = useState('');
  const runTokenRef = useRef(0);
  const loadedFileRef = useRef<string | null>(null);

  const composers = useMemo(() => listArrangerStyleTransferComposers(), []);
  const presetOptions = useMemo(() => listArrangerPresetOptions(), []);

  useEffect(() => {
    configureDeferredEngine({
      generate: (payload) => api.generate(payload as Parameters<typeof api.generate>[0]),
    });
  }, []);

  useEffect(() => {
    actions.setMode('styleTransfer');
    actions.setStyleTransferConfig({
      targetComposer: DEFAULT_COMPOSER_ID,
      strength: ARRANGER_DEFAULT_STYLE_TRANSFER_STRENGTH,
      preserveMelody: true,
      reorchestrate: false,
    });
  }, [actions]);
  useEffect(() => {
    if (!state.importTimeline || state.parseError || !state.fileName) return;
    if (loadedFileRef.current === state.fileName) return;
    loadedFileRef.current = state.fileName;
    actions.setMode('styleTransfer');
    actions.setStyleTransferConfig({
      targetComposer: DEFAULT_COMPOSER_ID,
      strength: ARRANGER_DEFAULT_STYLE_TRANSFER_STRENGTH,
      preserveMelody: true,
      reorchestrate: false,
    });
  }, [actions, state.fileName, state.importTimeline, state.parseError]);

  useEffect(() => {
    if (runPhase !== 'progress') return;
    const t0 = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [runPhase]);

  const cfg = state.styleTransferConfig;
  const timeline = state.importTimeline;
  const hasFile = Boolean(timeline && !state.parseError);
  const dots = timeline ? confidenceDotCount(averageTimelineConfidence(timeline)) : 0;
  const noteCount = timeline?.melodyLine.length ?? 0;
  const stageIdx = progressStageIndex(elapsed);

  const outputPath = result ? resolveArrangerOutputPath(result) : undefined;
  const midiPath = outputPath ? midiPathFromMusicXmlPath(outputPath) : undefined;

  const ingestFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || !detectMosaicImportFormat(file.name)) return;
      setRunPhase('idle');
      setResult(null);
      setErrorCode('E0');
      void actions.loadFile(file);
    },
    [actions],
  );

  const onBrowse = useCallback(async () => {
    if (isDesktopIpc() && window.composerOsDesktop?.invokeApi) {
      try {
        const picked = (await window.composerOsDesktop.invokeApi('composer-os-api:pick-mosaic-import-file', {})) as {
          ok?: boolean;
          canceled?: boolean;
          filepath?: string;
        };
        if (!picked?.ok || !picked.filepath) return;
        if (!detectMosaicImportFormat(picked.filepath)) return;
        const file = await fileFromDesktopPath(picked.filepath);
        ingestFile(file);
      } catch {
        inputRef.current?.click();
      }
      return;
    }
    inputRef.current?.click();
  }, [ingestFile]);

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

  const clearAll = useCallback(() => {
    loadedFileRef.current = null;
    actions.clearImport();
    setRunPhase('idle');
    setResult(null);
    setErrorCode('E0');
    setComposerMenuOpen(false);
  }, [actions]);

  const runArrangement = useCallback(async () => {
    if (!timeline) {
      setErrorCode('E1');
      setRunPhase('error');
      return;
    }
    if (state.parseError) {
      setErrorCode('E1');
      setRunPhase('error');
      return;
    }
    const token = ++runTokenRef.current;
    setRunPhase('progress');
    setResult(null);
    setFolderError(null);
    setRevealOpened(false);
    setErrorCode('E0');
    try {
      const builtPayload = buildArrangerGeneratePayload({
        timeline,
        presetId,
        seed,
        targetComposer: cfg.targetComposer || DEFAULT_COMPOSER_ID,
        strength: cfg.strength ?? ARRANGER_DEFAULT_STYLE_TRANSFER_STRENGTH,
        preserveMelody: cfg.preserveMelody,
        reorchestrate: cfg.reorchestrate,
        bpm: state.tempoBpm,
      });
      const labelSlug = normalizeArrangerOutputLabel(outputLabel);
      const payload = labelSlug ? { ...builtPayload, outputLabel: labelSlug } : builtPayload;
      const r = (await enqueue(payload)) as ArrangerGenResult;
      if (token !== runTokenRef.current) return;
      if (!r?.success) {
        const apiError =
          typeof r?.error === 'string' ? r.error : JSON.stringify(r?.error ?? r ?? 'failed');
        console.error('[ArrangerTab] /api/generate failed:', apiError, { payload });
        setErrorCode(mapArrangerError(r?.error ?? apiError, state.parseError));
        setRunPhase('error');
        return;
      }
      setResult(r);
      setRunPhase('result');
      window.dispatchEvent(new CustomEvent('composer-os:outputs-changed'));
    } catch (err) {
      if (token !== runTokenRef.current) return;
      setErrorCode(mapArrangerError(err));
      setRunPhase('error');
    }
  }, [cfg, outputLabel, presetId, seed, state.parseError, state.tempoBpm, timeline]);

  const onCancel = useCallback(() => {
    runTokenRef.current += 1;
    cancelAll();
    setRunPhase('idle');
  }, []);

  const onRevealInFolder = useCallback(async (filepath: string) => {
    setFolderError(null);
    setRevealOpened(false);
    console.log('[UI][open-folder] click=open-file-folder', { filepath });
    try {
      const payload = { path: filepath };
      console.log('[UI][open-folder] request open-file-folder', payload);
      const r = await api.openOutputFolder(payload);
      console.log('[UI][open-folder] response open-file-folder', r);
      if (r.success) {
        setRevealOpened(true);
        return;
      }
      if (r.message) setFolderError(r.message);
    } catch (e) {
      console.log('[UI][open-folder] exception open-file-folder', e);
      setFolderError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const progressStages = useMemo(() => {
    const composerLabel = arrangerComposerLabel(cfg.targetComposer || DEFAULT_COMPOSER_ID);
    return ARRANGER_PROGRESS_STAGES.map((label, i) => {
      if (i === 1) return `Applying ${composerLabel} harmony...`;
      return label;
    });
  }, [cfg.targetComposer]);

  const detailLines = useMemo(() => {
    if (!result) return [];
    const integrity =
      result.exportIntegrityPassed ?? result.runManifest?.exportIntegrityPassed ?? undefined;
    return chordMelodyDetailLines(result.styleTransferEcho, integrity, timeline?.bars);
  }, [result, timeline?.bars]);

  const showChangeFileLink = errorCode === 'E1' || errorCode === 'E2' || errorCode === 'E3';

  const presetLabel =
    presetOptions.find((p) => p.id === presetId)?.name ?? presetId.replace(/_/g, ' ');

  return (
    <div className={styles.page} data-testid="arranger-tab">
      <header className={styles.pageHeader}>
        <h1>Arranger</h1>
        <p>Turn a melody into a chord-melody arrangement with style-transfer.</p>
      </header>

      <div className={styles.flow}>
        <section aria-labelledby="arranger-step-upload">
          <div className={styles.stepLabel} id="arranger-step-upload">
            Step 1 - Upload melody
          </div>
          {!hasFile ? (
            <div
              className={`${styles.dropzone} ${dragOver ? styles.dropzoneDragOver : ''}`}
              data-testid="arranger-dropzone"
              role="button"
              tabIndex={0}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => void onBrowse()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') void onBrowse();
              }}
            >
              <svg className={styles.dropzoneIcon} viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path
                  d="M24 32V16M24 16L18 22M24 16L30 22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M8 32V36C8 38.2 9.8 40 12 40H36C38.2 40 40 38.2 40 36V32"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p className={styles.dropzoneText}>Drop your MIDI or MusicXML file here</p>
              <button type="button" className={styles.btnBrowse} onClick={(e) => { e.stopPropagation(); void onBrowse(); }}>
                Browse...
              </button>
              <p className={styles.dropzoneFormats}>Accepted formats: .mid .midi .musicxml .mxl .xml</p>
            </div>
          ) : (
            <div className={styles.fileLoaded} data-testid="arranger-file-loaded">
              <div className={styles.fileLoadedHeader}>
                <div className={styles.fileName}>{state.fileName}</div>
                <button type="button" className={styles.btnClear} onClick={clearAll}>
                  Clear
                </button>
              </div>
              <div className={styles.fileMeta}>
                <span>
                  <strong>{timeline!.bars}</strong> bars
                </span>
                <span>
                  Key: <strong>{formatKeyLabel(timeline)}</strong>
                </span>
                <span>
                  <strong>{noteCount}</strong> notes
                </span>
              </div>
              <div className={styles.confidenceRow}>
                <span className={styles.confidenceLabel}>Parse confidence</span>
                <div className={styles.confidenceDots} aria-label="Parse confidence">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`${styles.dot} ${i < dots ? styles.dotOn : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {state.parseError ? <div className={styles.parseErrorBanner}>{state.parseError}</div> : null}
          <input
            ref={inputRef}
            className={styles.hiddenInput}
            type="file"
            accept={ACCEPT}
            onChange={onInputChange}
          />
        </section>

        {hasFile ? (
          <>
            <section aria-labelledby="arranger-step-arranger">
              <div className={styles.stepLabel} id="arranger-step-arranger">
                Step 2 - Arranger
              </div>
              <div className={styles.arrangerCard}>
                <div className={styles.arrangerFixedLabel}>
                  Arranger: <span>{arrangerComposerLabel(cfg.targetComposer || DEFAULT_COMPOSER_ID)}</span>
                </div>
                <div className={styles.arrangerSubtitle}>
                  {composerSubtitle(cfg.targetComposer || DEFAULT_COMPOSER_ID)}
                </div>
                <div className={styles.arrangerChangeWrap}>
                  <button
                    type="button"
                    className={styles.linkChange}
                    onClick={() => setComposerMenuOpen((o) => !o)}
                  >
                    Change arranger
                  </button>
                  <div
                    className={`${styles.arrangerDropdown} ${composerMenuOpen ? styles.arrangerDropdownOpen : ''}`}
                    role="menu"
                  >
                    {composers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitem"
                        className={cfg.targetComposer === c.id ? styles.dropdownOptionSelected : undefined}
                        onClick={() => {
                          actions.setStyleTransferConfig({ targetComposer: c.id });
                          setComposerMenuOpen(false);
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="arranger-step-settings">
              <div className={styles.stepLabel} id="arranger-step-settings">
                Step 3 - Settings
              </div>
              <div className={styles.settingsCard}>
                <h3>This arrangement will...</h3>
                <div className={styles.settingLine}>
                  <span className={styles.checkIcon} aria-hidden="true" />
                  <div>
                    <div className={styles.settingMain}>
                      {cfg.preserveMelody
                        ? 'Keep your melody exactly as played'
                        : 'Melody may be altered for harmony'}
                    </div>
                    <div className={styles.settingHint}>(Preserve melody: {cfg.preserveMelody ? 'on' : 'off'})</div>
                  </div>
                </div>
                <div className={styles.settingLine}>
                  <span className={styles.checkIcon} aria-hidden="true" />
                  <div>
                    <div className={styles.settingMain}>
                      Apply {arrangerComposerLabel(cfg.targetComposer || DEFAULT_COMPOSER_ID)} harmony
                    </div>
                    <div className={styles.settingHint}>(Strength: {cfg.strength.toFixed(1)})</div>
                  </div>
                </div>
                <div className={styles.settingLine}>
                  <span className={styles.checkIcon} aria-hidden="true" />
                  <div>
                    <div className={styles.settingMain}>{presetLabel}</div>
                    <div className={styles.settingHint}>(Preset: {presetId})</div>
                  </div>
                </div>
                <div className={styles.disclosure}>
                  <button
                    type="button"
                    className={`${styles.disclosureToggle} ${advancedOpen ? styles.disclosureToggleOpen : ''}`}
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((o) => !o)}
                  >
                    <span className={`${styles.triangle} ${styles.trianglePlay}`} aria-hidden="true" />{' '}
                    Advanced settings
                  </button>
                  <div className={`${styles.disclosurePanel} ${advancedOpen ? styles.disclosurePanelOpen : ''}`}>
                    <div className={styles.fieldRow}>
                      <label htmlFor="arranger-strength">
                        Strength <span>{cfg.strength.toFixed(1)}</span>
                      </label>
                      <input
                        id="arranger-strength"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={cfg.strength}
                        onChange={(e) => actions.setStyleTransferConfig({ strength: Number(e.target.value) })}
                      />
                    </div>
                    <div className={styles.fieldRow}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={cfg.preserveMelody}
                          onChange={(e) => actions.setStyleTransferConfig({ preserveMelody: e.target.checked })}
                        />
                        Preserve melody
                      </label>
                    </div>
                    <div className={`${styles.fieldRow} ${styles.toggleRow}`}>
                      <span>Reorchestrate</span>
                      <button
                        type="button"
                        className={`${styles.toggle} ${cfg.reorchestrate ? styles.toggleOn : ''}`}
                        role="switch"
                        aria-checked={cfg.reorchestrate}
                        onClick={() => actions.setStyleTransferConfig({ reorchestrate: !cfg.reorchestrate })}
                      />
                    </div>
                    <div className={styles.fieldRow}>
                      <label htmlFor="arranger-preset">Preset</label>
                      <select
                        id="arranger-preset"
                        value={presetId}
                        onChange={(e) => setPresetId(e.target.value)}
                      >
                        {presetOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className={styles.outputNameBlock}>
              <label className={styles.outputNameLabel} htmlFor="arranger-output-label">
                Output name (optional)
              </label>
              <input
                id="arranger-output-label"
                type="text"
                className={styles.outputNameInput}
                value={outputLabel}
                onChange={(e) => setOutputLabel(e.target.value)}
                placeholder="e.g. my-jazz-study"
                disabled={runPhase === 'progress'}
                data-testid="arranger-output-label"
              />
            </div>

            <section aria-labelledby="arranger-step-run">
              <div className={styles.stepLabel} id="arranger-step-run">
                Step 4 - Run
              </div>

              {runPhase === 'idle' ? (
                <button
                  type="button"
                  data-testid="arranger-run-button"
                  className={`${styles.btnRun} ${hasFile ? styles.btnRunActive : styles.btnRunDisabled}`}
                  disabled={!hasFile}
                  onClick={() => void runArrangement()}
                >
                  {hasFile ? 'Run Arrangement' : 'Upload a melody to continue'}
                </button>
              ) : null}

              {runPhase === 'progress' ? (
                <div className={styles.progressPanel} data-testid="arranger-progress">
                  <ol className={styles.progressStages}>
                    {progressStages.map((label, i) => {
                      const done = i < stageIdx;
                      const active = i === stageIdx;
                      const liClass = done
                        ? styles.progressStageDone
                        : active
                          ? styles.progressStageActive
                          : undefined;
                      return (
                        <li key={label} className={liClass}>
                          <span className={styles.stageMarker} aria-hidden="true">{done ? <span className={styles.stageMarkerCheck} /> : active ? <span className={styles.stageMarkerDots}>...</span> : null}</span>
                          {label}
                        </li>
                      );
                    })}
                  </ol>
                  <div className={styles.progressBarWrap} aria-hidden="true">
                    <div className={styles.progressBarIndeterminate} />
                  </div>
                  <div className={styles.progressMeta}>
                    Elapsed: <strong>{formatElapsed(elapsed)}</strong>
                  </div>
                  <p className={styles.progressHint}>Usually takes 30-90 seconds. Stay on this page.</p>
                  <button type="button" className={styles.btnCancel} onClick={onCancel}>
                    Cancel
                  </button>
                </div>
              ) : null}

              {runPhase === 'result' && outputPath ? (
                <div className={styles.resultPanel} data-testid="arranger-result">
                  <div className={styles.resultHeader}>
                    <span className={styles.resultHeaderIcon} aria-hidden="true" />
                    <h2>Your arrangement is ready.</h2>
                  </div>
                  <p className={styles.resultFilename}>{basenameOnly(outputPath)}</p>
                  <div className={styles.badges}>
                    <span className={styles.badge}>.musicxml</span>
                    <span className={styles.badge}>.mid</span>
                  </div>
                  <div className={styles.resultActions}>
                    <button
                      type="button"
                      className={styles.btnDownloadPrimary}
                      onClick={() => {
                        setFolderError(null);
                        void openMusicXmlFile(outputPath).catch((e) =>
                          setFolderError(e instanceof Error ? e.message : String(e)),
                        );
                      }}
                    >
                      Open MusicXML
                    </button>
                    {midiPath ? (
                      <button
                        type="button"
                        className={styles.btnDownloadSecondary}
                        onClick={() => {
                          setFolderError(null);
                          void downloadPathToBrowser(midiPath).catch((e) =>
                            setFolderError(e instanceof Error ? e.message : String(e)),
                          );
                        }}
                      >
                        Download MIDI
                      </button>
                    ) : null}
                  </div>
                  <div className={styles.resultLinks}>
                    <button
                      type="button"
                      className={styles.resultLink}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void onRevealInFolder(outputPath);
                      }}
                    >
                      Reveal in folder
                    </button>
                    {revealOpened ? (
                      <p className={styles.revealSuccess} role="status">
                        Opened in File Explorer
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className={styles.resultLink}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRunPhase('idle');
                        setResult(null);
                        setRevealOpened(false);
                        setOutputLabel('');
                      }}
                    >
                      Run again with this melody
                    </button>
                  </div>
                  {folderError ? (
                    <p className={styles.folderError} role="alert">
                      {folderError}
                    </p>
                  ) : null}
                  <div className={styles.detailsAccordion}>
                    <button
                      type="button"
                      className={`${styles.detailsToggle} ${detailsOpen ? styles.detailsToggleOpen : ''}`}
                      aria-expanded={detailsOpen}
                      onClick={() => setDetailsOpen((o) => !o)}
                    >
                      <span className={`${styles.triangle} ${styles.trianglePlay}`} aria-hidden="true" />{' '}
                      Arrangement details
                    </button>
                    <div className={`${styles.detailsBody} ${detailsOpen ? styles.detailsBodyOpen : ''}`}>
                      {detailLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {runPhase === 'error' ? (
                <div data-testid="arranger-error">
                  <div className={styles.errorBanner} role="alert">
                    <div className={styles.errorBannerHeader}>
                      <span className={styles.errorIcon} aria-hidden="true">!</span>
                      <p className={styles.errorMessage}>{ARRANGER_ERROR_MESSAGES[errorCode]}</p>
                    </div>
                  </div>
                  <div className={styles.errorActions}>
                    <button
                      type="button"
                      className={`${styles.btnRun} ${styles.btnRunActive}`}
                      onClick={() => void runArrangement()}
                    >
                      Retry
                    </button>
                    {showChangeFileLink ? (
                      <button type="button" className={styles.linkChangeFile} onClick={clearAll}>
                        Change file
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}