/**
 * Song Mode — rhythm blend sidebar: song-form arrange + dual-layer export across five rhythm engines.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { BLEND_RHYTHM_EXPORT_ENGINE, type BlendExporterBlendedPlan, type BlendExporterSongForm } from '@composer-os/core/blend';
import { lcm } from '@composer-os/core/rhythm/rhythmPulseGrid';
import { saveRhythmExportFile } from '../lib/saveRhythmExportFile';

import type {
  BarRange,
  BlendMode,
  ConflictStrategy,
  LayerBlendForm,
  RhythmBlendControlsProps,
  RhythmBlendEngineId,
  RhythmBlendStarterBundles,
  RhythmPresetRef,
  SongForm,
  SongSection,
} from './RhythmBlendControls.types';
import './RhythmBlendControls.css';
import { SaveNoticeRow, type SaveNoticePayload } from './SaveNoticeRow';

const ENGINE_OPTIONS: { id: RhythmBlendEngineId; label: string }[] = [
  { id: 'afrobeat', label: 'Fela Kuti Afrobeat' },
  { id: 'rebetiko', label: 'Greek Rebetiko' },
  { id: 'brazilian', label: 'Brazilian' },
  { id: 'second_line', label: 'Second Line' },
  { id: 'cuban', label: 'Cuban' },
];

const LCM_WARN_AFTER = 144;

function presetsForEngine(engine: RhythmBlendEngineId, b: RhythmBlendStarterBundles): RhythmPresetRef[] {
  switch (engine) {
    case 'afrobeat':
      return b.afrobeat;
    case 'rebetiko':
      return b.rebetiko;
    case 'brazilian':
      return b.brazilian;
    case 'second_line':
      return b.secondLine;
    case 'cuban':
      return b.cuban;
    default: {
      const _x: never = engine;
      return _x;
    }
  }
}

function defaultPresetForEngine(engine: RhythmBlendEngineId, b: RhythmBlendStarterBundles): RhythmPresetRef {
  const list = presetsForEngine(engine, b);
  if (!list.length) throw new Error(`RhythmBlendControls: no presets for engine ${engine}`);
  return list[0]!;
}

function presetRefOrFirst(
  engine: RhythmBlendEngineId,
  presetId: string | undefined,
  b: RhythmBlendStarterBundles
): RhythmPresetRef {
  const list = presetsForEngine(engine, b);
  if (!list.length) throw new Error(`RhythmBlendControls: no presets for engine ${engine}`);
  const hit = presetId ? list.find((p) => p.presetId === presetId) : undefined;
  return hit ?? list[0]!;
}

function songFormToExporter(form: SongForm): BlendExporterSongForm {
  return {
    title: form.title,
    sections: form.sections.map((s) => ({
      bars: s.bars,
      rhythm: { engine: s.rhythm.engine, presetId: s.rhythm.presetId },
    })),
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function newSectionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function defaultSongForm(b: RhythmBlendStarterBundles): SongForm {
  const r = defaultPresetForEngine('afrobeat', b);
  return {
    title: 'Rhythm blend',
    sections: [
      {
        id: newSectionId(),
        label: 'Section A',
        bars: { startBar: 1, endBar: 4 },
        rhythm: r,
        expanded: true,
      },
    ],
  };
}

function defaultLayerBlend(b: RhythmBlendStarterBundles): LayerBlendForm {
  const a = defaultPresetForEngine('afrobeat', b);
  const g = defaultPresetForEngine('rebetiko', b);
  return {
    engineA: 'afrobeat',
    engineAPresetId: a.presetId,
    engineB: 'rebetiko',
    engineBPresetId: g.presetId,
    blendRatio: 0.5,
    conflictStrategy: 'max',
  };
}

function BlendModeToggle(props: { mode: BlendMode; onChange: (m: BlendMode) => void }) {
  return (
    <div className="blendModeToggle" role="group" aria-label="Blend mode">
      <button
        type="button"
        className={`blendModeToggle__btn${props.mode === 'song-form' ? ' blendModeToggle__btn--active' : ''}`}
        onClick={() => props.onChange('song-form')}
      >
        Song form
      </button>
      <button
        type="button"
        className={`blendModeToggle__btn${props.mode === 'layer-blend' ? ' blendModeToggle__btn--active' : ''}`}
        onClick={() => props.onChange('layer-blend')}
      >
        Layer blend
      </button>
    </div>
  );
}

function SongFormPanel(props: {
  form: SongForm;
  onTitleChange: (t: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="songFormPanel">
      <label className="fieldLabel" htmlFor="rhythm-blend-song-title">
        Song title
      </label>
      <input
        id="rhythm-blend-song-title"
        className="songFormPanel__titleInput"
        type="text"
        value={props.form.title}
        onChange={(e) => props.onTitleChange(e.target.value)}
        autoComplete="off"
      />
      {props.children}
    </div>
  );
}

function SongSectionList(props: { children: ReactNode }) {
  return <div className="songSectionList">{props.children}</div>;
}

function SongSectionRow(props: {
  section: SongSection;
  index: number;
  count: number;
  bundles: RhythmBlendStarterBundles;
  onUpdate: (id: string, patch: Partial<SongSection>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onToggleExpand: (id: string) => void;
  onEngineChange: (id: string, engine: RhythmBlendEngineId) => void;
  onPresetSelect: (id: string, preset: RhythmPresetRef) => void;
}) {
  const { section } = props;
  const engine = section.rhythm.engine;
  const options = presetsForEngine(engine, props.bundles);

  const barPatch = (key: keyof BarRange, raw: string) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return;
    props.onUpdate(section.id, { bars: { ...section.bars, [key]: n } });
  };

  return (
    <div className="songSectionRow">
      <div className="songSectionRow__header">
        <button
          type="button"
          onClick={() => props.onToggleExpand(section.id)}
          style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 0 }}
        >
          <strong>{section.label || 'Section'}</strong>
          <span className="songSectionRow__chevron">{section.expanded !== false ? ' ▾' : ' ▸'}</span>
        </button>
        <div className="songSectionRow__headerButtons">
          <button type="button" disabled={props.index === 0} onClick={() => props.onMove(section.id, 'up')} aria-label="Move section up">
            Up
          </button>
          <button
            type="button"
            disabled={props.index >= props.count - 1}
            onClick={() => props.onMove(section.id, 'down')}
            aria-label="Move section down"
          >
            Down
          </button>
          <button type="button" onClick={() => props.onRemove(section.id)} aria-label="Remove section">
            Remove
          </button>
        </div>
      </div>

      {section.expanded !== false && (
        <>
          <label className="fieldLabel" htmlFor={`sec-label-${section.id}`}>
            Label
          </label>
          <input
            id={`sec-label-${section.id}`}
            type="text"
            value={section.label}
            onChange={(e) => props.onUpdate(section.id, { label: e.target.value })}
            style={{ marginBottom: '0.45rem' }}
          />

          <div className="fieldGrid--2" style={{ marginBottom: '0.45rem' }}>
            <div>
              <label className="fieldLabel" htmlFor={`sec-start-${section.id}`}>
                Start bar
              </label>
              <input
                id={`sec-start-${section.id}`}
                type="number"
                min={1}
                value={section.bars.startBar}
                onChange={(e) => barPatch('startBar', e.target.value)}
              />
            </div>
            <div>
              <label className="fieldLabel" htmlFor={`sec-end-${section.id}`}>
                End bar
              </label>
              <input
                id={`sec-end-${section.id}`}
                type="number"
                min={1}
                value={section.bars.endBar}
                onChange={(e) => barPatch('endBar', e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.45rem' }}>
            <label className="fieldLabel" htmlFor={`sec-engine-${section.id}`}>
              Engine
            </label>
            <select
              id={`sec-engine-${section.id}`}
              value={engine}
              onChange={(e) => props.onEngineChange(section.id, e.target.value as RhythmBlendEngineId)}
            >
              {ENGINE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '0.45rem' }}>
            <label className="fieldLabel" htmlFor={`sec-preset-${section.id}`}>
              Preset
            </label>
            <select
              id={`sec-preset-${section.id}`}
              value={section.rhythm.presetId}
              onChange={(e) => {
                const found = options.find((p) => p.presetId === e.target.value);
                if (found) props.onPresetSelect(section.id, found);
              }}
            >
              {options.map((p) => (
                <option key={p.presetId} value={p.presetId}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="fieldLabel" htmlFor={`sec-tempo-${section.id}`}>
              Tempo BPM (optional)
            </label>
            <input
              id={`sec-tempo-${section.id}`}
              type="number"
              min={20}
              max={300}
              placeholder="—"
              value={section.tempoBpm ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') props.onUpdate(section.id, { tempoBpm: undefined });
                else {
                  const t = parseInt(v, 10);
                  if (Number.isFinite(t)) props.onUpdate(section.id, { tempoBpm: t });
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ConflictStrategyRadioGroup(props: {
  value: ConflictStrategy;
  onChange: (c: ConflictStrategy) => void;
}) {
  const opts: { id: ConflictStrategy; label: string }[] = [
    { id: 'max', label: 'Max' },
    { id: 'sum-clamped', label: 'Sum clamped' },
    { id: 'priority', label: 'Priority' },
  ];
  return (
    <fieldset className="conflictStrategyRadioGroup">
      <legend className="conflictStrategyRadioGroup__legend">Conflict strategy</legend>
      <div className="conflictStrategyRadioGroup__options">
        {opts.map((o) => (
          <label key={o.id}>
            <input type="radio" name="rhythm-blend-conflict" checked={props.value === o.id} onChange={() => props.onChange(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LayerBlendPanel(props: {
  layer: LayerBlendForm;
  bundles: RhythmBlendStarterBundles;
  lcmWarning: string | null;
  onChange: (next: LayerBlendForm) => void;
}) {
  const pa = presetsForEngine(props.layer.engineA, props.bundles);
  const pb = presetsForEngine(props.layer.engineB, props.bundles);

  return (
    <div className="layerBlendPanel">
      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-engine-a">
          Engine A
        </label>
        <select
          id="layer-engine-a"
          value={props.layer.engineA}
          onChange={(e) => {
            const eng = e.target.value as RhythmBlendEngineId;
            const ref = defaultPresetForEngine(eng, props.bundles);
            props.onChange({
              ...props.layer,
              engineA: eng,
              engineAPresetId: ref.presetId,
            });
          }}
        >
          {ENGINE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-preset-a">
          Engine A preset
        </label>
        <select
          id="layer-preset-a"
          value={props.layer.engineAPresetId}
          onChange={(e) => props.onChange({ ...props.layer, engineAPresetId: e.target.value })}
        >
          {pa.map((p) => (
            <option key={p.presetId} value={p.presetId}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-engine-b">
          Engine B
        </label>
        <select
          id="layer-engine-b"
          value={props.layer.engineB}
          onChange={(e) => {
            const eng = e.target.value as RhythmBlendEngineId;
            const ref = defaultPresetForEngine(eng, props.bundles);
            props.onChange({
              ...props.layer,
              engineB: eng,
              engineBPresetId: ref.presetId,
            });
          }}
        >
          {ENGINE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-preset-b">
          Engine B preset
        </label>
        <select
          id="layer-preset-b"
          value={props.layer.engineBPresetId}
          onChange={(e) => props.onChange({ ...props.layer, engineBPresetId: e.target.value })}
        >
          {pb.map((p) => (
            <option key={p.presetId} value={p.presetId}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-blend-ratio">
          Blend ratio (A emphasis){' '}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{props.layer.blendRatio.toFixed(2)}</span>
        </label>
        <input
          id="layer-blend-ratio"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={props.layer.blendRatio}
          onChange={(e) => props.onChange({ ...props.layer, blendRatio: Number(e.target.value) })}
        />
      </div>

      {props.lcmWarning ? (
        <p className="rhythmBlendControls__lcmWarn" style={{ margin: '0 0 0.45rem', fontSize: '0.75rem', color: 'var(--warn, #c90)' }}>
          {props.lcmWarning}
        </p>
      ) : null}

      <ConflictStrategyRadioGroup value={props.layer.conflictStrategy} onChange={(c) => props.onChange({ ...props.layer, conflictStrategy: c })} />
    </div>
  );
}

function ExportBar(props: {
  busy: boolean;
  onExport: () => void | Promise<void>;
  saveNotice: SaveNoticePayload | null;
  onOpenFolder?: () => void;
  showOpenFolder?: boolean;
}) {
  return (
    <div className="exportBar">
      <button type="button" className="exportBar__btn" disabled={props.busy} onClick={() => void props.onExport()}>
        {props.busy ? 'Exporting…' : 'Export MusicXML'}
      </button>
      {props.showOpenFolder ? (
        <button type="button" className="exportBar__btn exportBar__btn--outline" onClick={props.onOpenFolder}>
          Open Folder
        </button>
      ) : null}
      {props.saveNotice ? <SaveNoticeRow {...props.saveNotice} /> : null}
    </div>
  );
}

export function RhythmBlendControls(props: RhythmBlendControlsProps) {
  const { starterBundles, exportSongFormToMusicXml, exportBlendedScoreToMusicXml, defaultFileName } = props;

  const [blendMode, setBlendMode] = useState<BlendMode>(() => props.initialBlendMode ?? 'song-form');
  const [songForm, setSongForm] = useState<SongForm>(() => props.initialSongForm ?? defaultSongForm(starterBundles));
  const [layerBlend, setLayerBlend] = useState<LayerBlendForm>(() => props.initialLayerBlend ?? defaultLayerBlend(starterBundles));
  const [exportBusy, setExportBusy] = useState(false);

  const layerLcmWarning = useMemo(() => {
    const ra = presetRefOrFirst(layerBlend.engineA, layerBlend.engineAPresetId, starterBundles);
    const rb = presetRefOrFirst(layerBlend.engineB, layerBlend.engineBPresetId, starterBundles);
    const g = lcm(ra.gridSteps, rb.gridSteps);
    if (g > LCM_WARN_AFTER) {
      return `Grid LCM for this pair is ${g} pulses/bar (> ${LCM_WARN_AFTER}). Layer merge uses this raster; export is still valid.`;
    }
    return null;
  }, [
    layerBlend.engineA,
    layerBlend.engineAPresetId,
    layerBlend.engineB,
    layerBlend.engineBPresetId,
    starterBundles,
  ]);

  const addSection = useCallback(() => {
    setSongForm((prev) => {
      const last = prev.sections[prev.sections.length - 1];
      const start = last ? last.bars.endBar + 1 : 1;
      const end = start + 3;
      const labelLetter = String.fromCharCode(65 + prev.sections.length);
      const rhythm = last?.rhythm ?? defaultPresetForEngine('afrobeat', starterBundles);
      const sec: SongSection = {
        id: newSectionId(),
        label: `Section ${labelLetter}`,
        bars: { startBar: start, endBar: end },
        rhythm,
        expanded: true,
      };
      return { ...prev, sections: [...prev.sections, sec] };
    });
  }, [starterBundles]);

  const updateSection = useCallback((id: string, patch: Partial<SongSection>) => {
    setSongForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (patch.bars) {
          next.bars = { ...s.bars, ...patch.bars };
          if (next.bars.endBar < next.bars.startBar) {
            next.bars = { ...next.bars, endBar: next.bars.startBar };
          }
        }
        return next;
      }),
    }));
  }, []);

  const updateSectionRhythm = useCallback((id: string, rhythm: RhythmPresetRef) => {
    setSongForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, rhythm } : s)),
    }));
  }, []);

  const removeSection = useCallback((id: string) => {
    setSongForm((prev) => {
      if (prev.sections.length <= 1) return prev;
      return { ...prev, sections: prev.sections.filter((s) => s.id !== id) };
    });
  }, []);

  const moveSection = useCallback((id: string, dir: 'up' | 'down') => {
    setSongForm((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const j = dir === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= prev.sections.length) return prev;
      const next = [...prev.sections];
      const tmp = next[idx]!;
      next[idx] = next[j]!;
      next[j] = tmp;
      return { ...prev, sections: next };
    });
  }, []);

  const toggleSectionExpanded = useCallback((id: string) => {
    setSongForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== id) return s;
        const open = s.expanded !== false;
        return { ...s, expanded: !open };
      }),
    }));
  }, []);

  const onEngineChange = useCallback(
    (id: string, engine: RhythmBlendEngineId) => {
      const rhythm = defaultPresetForEngine(engine, starterBundles);
      updateSectionRhythm(id, rhythm);
    },
    [starterBundles, updateSectionRhythm]
  );

  const [saveNotice, setSaveNotice] = useState<SaveNoticePayload | null>(null);
  const saveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaveNotice = useCallback((notice: string | SaveNoticePayload) => {
    const normalized: SaveNoticePayload =
      typeof notice === 'string' ? { message: notice, variant: 'success' } : notice;
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice(normalized);
    saveNoticeTimer.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimer.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    };
  }, []);

  const handleExport = useCallback(async () => {
    setExportBusy(true);
    try {
      let xml: string;
      if (blendMode === 'song-form') {
        xml = exportSongFormToMusicXml(songFormToExporter(songForm));
      } else {
        const plan: BlendExporterBlendedPlan = {
          engineA: { engine: layerBlend.engineA, presetId: layerBlend.engineAPresetId },
          engineB: { engine: layerBlend.engineB, presetId: layerBlend.engineBPresetId },
          conflictStrategy: layerBlend.conflictStrategy,
        };
        xml = exportBlendedScoreToMusicXml(plan);
      }
      const rawBase =
        defaultFileName?.replace(/\.musicxml$/i, '') ??
        (blendMode === 'song-form' ? slugify(songForm.title || 'rhythm-blend') : 'rhythm-blend-layer');
      const safeBase = rawBase.length ? rawBase : 'rhythm-blend';
      const fileName = `${safeBase}.musicxml`;
      const res = await saveRhythmExportFile(BLEND_RHYTHM_EXPORT_ENGINE, fileName, xml);
      if (!res.ok) {
        flashSaveNotice({ message: res.error, variant: 'error' });
        return;
      }
      flashSaveNotice({
        message: `Saved to ${res.displayPath}`,
        copyText: res.displayPath,
        variant: 'success',
      });
    } finally {
      setExportBusy(false);
    }
  }, [
    blendMode,
    songForm,
    layerBlend,
    exportSongFormToMusicXml,
    exportBlendedScoreToMusicXml,
    defaultFileName,
    flashSaveNotice,
  ]);

  const showOpenFolder = useMemo(
    () => typeof window !== 'undefined' && !!window.composerOsDesktop?.openExportFolder,
    []
  );

  const handleOpenExportFolder = useCallback(() => {
    void window.composerOsDesktop?.openExportFolder?.('blended');
  }, []);

  return (
    <div className="rhythmBlendControls">
      <div className="rhythmBlendControls__scroll">
        <h3 className="rhythmBlendControls__title">Rhythm blend</h3>
        <p className="rhythmBlendControls__hint">
          Arrange sections (song form) or stack two rhythm engines. Export writes GM percussion; Greek presets keep additive metre/beaming.
        </p>
        <BlendModeToggle mode={blendMode} onChange={setBlendMode} />

        {blendMode === 'song-form' ? (
          <SongFormPanel form={songForm} onTitleChange={(t) => setSongForm((s) => ({ ...s, title: t }))}>
            <SongSectionList>
              {songForm.sections.map((sec, i) => (
                <SongSectionRow
                  key={sec.id}
                  section={sec}
                  index={i}
                  count={songForm.sections.length}
                  bundles={starterBundles}
                  onUpdate={updateSection}
                  onRemove={removeSection}
                  onMove={moveSection}
                  onToggleExpand={toggleSectionExpanded}
                  onEngineChange={onEngineChange}
                  onPresetSelect={(id, preset) => updateSectionRhythm(id, preset)}
                />
              ))}
            </SongSectionList>
            <button type="button" className="blendModeToggle__btn" style={{ marginTop: '0.45rem', width: '100%' }} onClick={addSection}>
              Add section
            </button>
          </SongFormPanel>
        ) : (
          <LayerBlendPanel layer={layerBlend} bundles={starterBundles} lcmWarning={layerLcmWarning} onChange={setLayerBlend} />
        )}
      </div>
      <ExportBar
        busy={exportBusy}
        onExport={handleExport}
        saveNotice={saveNotice}
        showOpenFolder={showOpenFolder}
        onOpenFolder={handleOpenExportFolder}
      />
    </div>
  );
}
