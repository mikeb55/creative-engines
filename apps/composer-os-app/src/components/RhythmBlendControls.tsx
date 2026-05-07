/**
 * Song Mode — rhythm blend sidebar (Afrobeat × Rebetiko): song-form arrange + dual-layer export.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { BLEND_RHYTHM_EXPORT_ENGINE } from '@composer-os/core/blend';
import { saveRhythmExportFile } from '../lib/saveRhythmExportFile';

import type {
  AfrobeatPresetRef,
  BarRange,
  BlendMode,
  BlendedScorePlan,
  ConflictStrategy,
  LayerBlendForm,
  RebetikoPresetRef,
  RhythmBlendControlsProps,
  RhythmEngineId,
  RhythmPresetRef,
  SongForm,
  SongSection,
} from './RhythmBlendControls.types';
import './RhythmBlendControls.css';

function getDefaultAfrobeatPreset(p: AfrobeatPresetRef[]): AfrobeatPresetRef {
  if (!p.length) throw new Error('No afrobeat presets');
  return p[0];
}
function getDefaultRebetikoPreset(p: RebetikoPresetRef[]): RebetikoPresetRef {
  if (!p.length) throw new Error('No rebetiko presets');
  return p[0];
}
function getDefaultPresetForEngine(
  engine: RhythmEngineId,
  a: AfrobeatPresetRef[],
  r: RebetikoPresetRef[]
): RhythmPresetRef {
  return engine === 'afrobeat' ? getDefaultAfrobeatPreset(a) : getDefaultRebetikoPreset(r);
}
function getPresetOptionsForEngine(
  engine: RhythmEngineId,
  a: AfrobeatPresetRef[],
  r: RebetikoPresetRef[]
): RhythmPresetRef[] {
  return engine === 'afrobeat' ? a : r;
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

function defaultSongForm(afro: AfrobeatPresetRef[], reb: RebetikoPresetRef[]): SongForm {
  return {
    title: 'Rhythm blend',
    sections: [
      {
        id: newSectionId(),
        label: 'Section A',
        bars: { startBar: 1, endBar: 4 },
        rhythm: getDefaultAfrobeatPreset(afro),
        expanded: true,
      },
    ],
  };
}

function defaultLayerBlend(afro: AfrobeatPresetRef[], reb: RebetikoPresetRef[]): LayerBlendForm {
  return {
    afrobeatPresetId: getDefaultAfrobeatPreset(afro).presetId,
    rebetikoPresetId: getDefaultRebetikoPreset(reb).presetId,
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
  afroPresets: AfrobeatPresetRef[];
  rebPresets: RebetikoPresetRef[];
  onUpdate: (id: string, patch: Partial<SongSection>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onToggleExpand: (id: string) => void;
  onEngineChange: (id: string, engine: RhythmEngineId) => void;
  onPresetSelect: (id: string, preset: RhythmPresetRef) => void;
}) {
  const { section } = props;
  const engine = section.rhythm.engine;
  const options = getPresetOptionsForEngine(engine, props.afroPresets, props.rebPresets);

  const barPatch = (key: keyof BarRange, raw: string) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return;
    props.onUpdate(section.id, { bars: { ...section.bars, [key]: n } });
  };

  return (
    <div className="songSectionRow">
      <div className="songSectionRow__header">
        <button type="button" onClick={() => props.onToggleExpand(section.id)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 0 }}>
          <strong>{section.label || 'Section'}</strong>
          <span className="songSectionRow__chevron">{section.expanded !== false ? ' ▾' : ' ▸'}</span>
        </button>
        <div className="songSectionRow__headerButtons">
          <button type="button" disabled={props.index === 0} onClick={() => props.onMove(section.id, 'up')} aria-label="Move section up">
            Up
          </button>
          <button type="button" disabled={props.index >= props.count - 1} onClick={() => props.onMove(section.id, 'down')} aria-label="Move section down">
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
              onChange={(e) => props.onEngineChange(section.id, e.target.value as RhythmEngineId)}
            >
              <option value="afrobeat">Afrobeat</option>
              <option value="rebetiko">Rebetiko</option>
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
  afroPresets: AfrobeatPresetRef[];
  rebPresets: RebetikoPresetRef[];
  onChange: (next: LayerBlendForm) => void;
}) {
  return (
    <div className="layerBlendPanel">
      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-afro-preset">
          Afrobeat preset
        </label>
        <select
          id="layer-afro-preset"
          value={props.layer.afrobeatPresetId}
          onChange={(e) => props.onChange({ ...props.layer, afrobeatPresetId: e.target.value })}
        >
          {props.afroPresets.map((p) => (
            <option key={p.presetId} value={p.presetId}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '0.45rem' }}>
        <label className="fieldLabel" htmlFor="layer-reb-preset">
          Rebetiko preset
        </label>
        <select
          id="layer-reb-preset"
          value={props.layer.rebetikoPresetId}
          onChange={(e) => props.onChange({ ...props.layer, rebetikoPresetId: e.target.value })}
        >
          {props.rebPresets.map((p) => (
            <option key={p.presetId} value={p.presetId}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <ConflictStrategyRadioGroup value={props.layer.conflictStrategy} onChange={(c) => props.onChange({ ...props.layer, conflictStrategy: c })} />
    </div>
  );
}

function ExportBar(props: {
  busy: boolean;
  onExport: () => void | Promise<void>;
  saveNotice: string | null;
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
      {props.saveNotice ? (
        <p className="exportBar__notice" role="status">
          {props.saveNotice}
        </p>
      ) : null}
    </div>
  );
}

export function RhythmBlendControls(props: RhythmBlendControlsProps) {
  const {
    afrobeatPresets,
    rebetikoPresets,
    exportSongFormToMusicXml,
    exportBlendedScoreToMusicXml,
    defaultFileName,
  } = props;

  const [blendMode, setBlendMode] = useState<BlendMode>(() => props.initialBlendMode ?? 'song-form');
  const [songForm, setSongForm] = useState<SongForm>(() => props.initialSongForm ?? defaultSongForm(afrobeatPresets, rebetikoPresets));
  const [layerBlend, setLayerBlend] = useState<LayerBlendForm>(() =>
    props.initialLayerBlend ?? defaultLayerBlend(afrobeatPresets, rebetikoPresets)
  );
  const [exportBusy, setExportBusy] = useState(false);

  const addSection = useCallback(() => {
    setSongForm((prev) => {
      const last = prev.sections[prev.sections.length - 1];
      const start = last ? last.bars.endBar + 1 : 1;
      const end = start + 3;
      const labelLetter = String.fromCharCode(65 + prev.sections.length);
      const sec: SongSection = {
        id: newSectionId(),
        label: `Section ${labelLetter}`,
        bars: { startBar: start, endBar: end },
        rhythm: getDefaultAfrobeatPreset(afrobeatPresets),
        expanded: true,
      };
      return { ...prev, sections: [...prev.sections, sec] };
    });
  }, [afrobeatPresets]);

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
    (id: string, engine: RhythmEngineId) => {
      const rhythm = getDefaultPresetForEngine(engine, afrobeatPresets, rebetikoPresets);
      updateSectionRhythm(id, rhythm);
    },
    [afrobeatPresets, rebetikoPresets, updateSectionRhythm]
  );

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const saveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaveNotice = useCallback((text: string) => {
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice(text);
    saveNoticeTimer.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimer.current = null;
    }, 3000);
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
        xml = exportSongFormToMusicXml(songForm);
      } else {
        const afro =
          afrobeatPresets.find((p) => p.presetId === layerBlend.afrobeatPresetId) ?? getDefaultAfrobeatPreset(afrobeatPresets);
        const reb =
          rebetikoPresets.find((p) => p.presetId === layerBlend.rebetikoPresetId) ?? getDefaultRebetikoPreset(rebetikoPresets);
        const plan: BlendedScorePlan = {
          afrobeatPreset: afro,
          rebetikoPreset: reb,
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
        flashSaveNotice(res.error);
        return;
      }
      flashSaveNotice(`Saved to ${res.displayPath}`);
    } finally {
      setExportBusy(false);
    }
  }, [
    blendMode,
    songForm,
    layerBlend,
    afrobeatPresets,
    rebetikoPresets,
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
          Arrange sections (song form) or stack Afrobeat + Rebetiko layers. Export writes a Sibelius-safe GM percussion staff.
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
                  afroPresets={afrobeatPresets}
                  rebPresets={rebetikoPresets}
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
          <LayerBlendPanel layer={layerBlend} afroPresets={afrobeatPresets} rebPresets={rebetikoPresets} onChange={setLayerBlend} />
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
