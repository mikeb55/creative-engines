import React, { useEffect, useState } from 'react';
import {
  HARMONY_LAB_PRESETS,
  HARMONY_LAB_VERSION,
  defaultHarmonyLabSettings,
  harmonyLabClientIssue,
  harmonyLabLockLabel,
  harmonyLabPreset,
  type ChordSpec,
  type DyadSpec,
  type HarmonyLabKind,
  type HarmonyLabSettings,
} from '@composer-os/core/orchestrate/harmonyLabSettings';
import type { E2EnsembleId } from '@composer-os/core/orchestrate/ensembleTemplates';
import type { TriadQuality } from '@composer-os/core/wwh/wwhTriadPair';
import { api } from '../services/api';
import { ScoreAudition } from '../score/ScoreAudition';
import { ScorePreview } from '../score/ScorePreview';

const STORAGE_KEY = 'harmony-lab-settings-v1';

const QUALITIES: TriadQuality[] = ['major', 'minor', 'augmented', 'diminished'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTALS = [
  { id: '', label: 'natural' },
  { id: '#', label: 'sharp' },
  { id: 'b', label: 'flat' },
];

type LabResult = {
  musicXml: string;
  midiBase64: string;
  partIds: string[];
  noteCount: number;
  summary: string;
  lockStatus: string;
  intervalText: string;
};

function splitRoot(root: string): { letter: string; accidental: string } {
  const match = /^([A-G])([b#]*)$/.exec(root.trim());
  return { letter: match?.[1] ?? 'C', accidental: match?.[2] ?? '' };
}

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: '0.82rem' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ChordFields({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: ChordSpec;
  onChange: (next: ChordSpec) => void;
}) {
  const root = splitRoot(value.root);
  return (
    <fieldset style={{ border: '1px solid var(--border-subtle, #333)', borderRadius: 6, padding: '0.5rem' }}>
      <legend>{legend}</legend>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Field label="Root">
          <select
            aria-label={`${legend} root`}
            value={root.letter}
            onChange={(event) => onChange({ ...value, root: `${event.target.value}${root.accidental}` })}
          >
            {LETTERS.map((letter) => <option key={letter} value={letter}>{letter}</option>)}
          </select>
        </Field>
        <Field label="Accidental">
          <select
            aria-label={`${legend} accidental`}
            value={root.accidental}
            onChange={(event) => onChange({ ...value, root: `${root.letter}${event.target.value}` })}
          >
            {ACCIDENTALS.map((item) => <option key={item.label} value={item.id}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="Quality">
          <select
            aria-label={`${legend} quality`}
            value={value.quality}
            onChange={(event) => onChange({ ...value, quality: event.target.value as TriadQuality })}
          >
            {QUALITIES.map((quality) => <option key={quality} value={quality}>{quality}</option>)}
          </select>
        </Field>
        <Field label="Octave">
          <input
            aria-label={`${legend} octave`}
            type="number"
            min={2}
            max={6}
            value={value.octave}
            onChange={(event) => onChange({ ...value, octave: Number(event.target.value) })}
          />
        </Field>
      </div>
    </fieldset>
  );
}

function DyadFields({ legend, value, onChange, disabled }: { legend: string; value: DyadSpec; onChange: (next: DyadSpec) => void; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} style={{ border: '1px solid var(--border-subtle, #333)', borderRadius: 6, padding: '0.5rem' }}>
      <legend>{legend}</legend>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Field label="Low">
          <input aria-label={`${legend} low`} value={value.low} onChange={(event) => onChange({ ...value, low: event.target.value })} />
        </Field>
        <Field label="High">
          <input aria-label={`${legend} high`} value={value.high} onChange={(event) => onChange({ ...value, high: event.target.value })} />
        </Field>
      </div>
    </fieldset>
  );
}

export function HarmonyLabPanel() {
  const [settings, setSettings] = useState<HarmonyLabSettings>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultHarmonyLabSettings();
      const parsed = JSON.parse(saved) as HarmonyLabSettings;
      if (parsed.version !== HARMONY_LAB_VERSION) return defaultHarmonyLabSettings();
      return { ...defaultHarmonyLabSettings(), ...parsed };
    } catch {
      return defaultHarmonyLabSettings();
    }
  });
  const [result, setResult] = useState<LabResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clientIssue = harmonyLabClientIssue(settings);
  const consonant = settings.triadB.quality === 'major' || settings.triadB.quality === 'minor';

  useEffect(() => {
    setResult(null);
  }, [settings]);

  const patch = (next: Partial<HarmonyLabSettings>) => {
    setSettings((current) => ({ ...current, ...next, presetId: next.presetId === undefined ? null : next.presetId }));
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await api.harmonyLab(settings as unknown as Record<string, unknown>);
      if (!response.ok || !response.musicXml || !response.midiBase64) {
        setError(response.error || 'Harmony Lab could not write this score.');
        setResult(null);
        return;
      }
      setResult({
        musicXml: response.musicXml,
        midiBase64: response.midiBase64,
        partIds: response.partIds ?? [],
        noteCount: response.noteCount ?? 0,
        summary: response.summary ?? '',
        lockStatus: response.lockStatus ?? '',
        intervalText: response.intervalText ?? '',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="harmony-lab" style={{ display: 'grid', gap: '0.6rem' }}>
      <p style={{ margin: 0, fontSize: '0.85rem' }}>
        Build a polychord, a triad pair, or a dyad pair, then write it for big band, string quartet, or guitar and upright bass.
      </p>
      <div role="tablist" aria-label="Harmonic material" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {([
          ['polychord', 'Polychords'],
          ['triad-pair', 'Triad pairs'],
          ['dyad-pair', 'Dyad pairs'],
        ] as const).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={settings.kind === kind}
            data-testid={`harmony-lab-tab-${kind}`}
            onClick={() => patch({ kind: kind as HarmonyLabKind, simultaneous: kind === 'polychord' ? settings.simultaneous : false, parentTransform: kind === 'triad-pair' ? settings.parentTransform : 'none' })}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Preset">
        <select
          data-testid="harmony-lab-preset"
          value={settings.presetId ?? ''}
          onChange={(event) => {
            const preset = harmonyLabPreset(event.target.value);
            if (preset) setSettings(preset);
          }}
        >
          <option value="">Custom</option>
          {HARMONY_LAB_PRESETS.map((preset) => (
            <option key={preset.presetId} value={preset.presetId ?? ''}>{preset.title}</option>
          ))}
        </select>
      </Field>

      {settings.kind === 'polychord' && (
        <div data-testid="harmony-lab-polychord-controls" style={{ display: 'grid', gap: '0.5rem' }}>
          <ChordFields legend="Upper chord" value={settings.upper} onChange={(upper) => patch({ upper })} />
          <ChordFields legend="Lower chord" value={settings.lower} onChange={(lower) => patch({ lower })} />
          <label>
            <input
              data-testid="harmony-lab-simultaneous"
              type="checkbox"
              checked={settings.simultaneous}
              disabled={settings.ensemble === 'string-quartet'}
              onChange={(event) => patch({ simultaneous: event.target.checked, density: event.target.checked ? 'dense' : settings.density })}
            />
            {' '}Sound every chord tone at once
          </label>
          {settings.ensemble === 'string-quartet' ? <p style={{ margin: 0, fontSize: '0.8rem' }}>String quartet keeps one note on each string, so six chord tones cannot sound together.</p> : null}
          <Field label="Common-tone behaviour">
            <select data-testid="harmony-lab-common-tone" value={settings.commonTone} onChange={(event) => patch({ commonTone: event.target.value as HarmonyLabSettings['commonTone'] })}>
              <option value="restrike">Restrike</option>
              <option value="sustain">Hold the shared pitch</option>
            </select>
          </Field>
        </div>
      )}

      {settings.kind === 'triad-pair' && (
        <div data-testid="harmony-lab-triad-controls" style={{ display: 'grid', gap: '0.5rem' }}>
          <ChordFields legend="Triad A" value={settings.triadA} onChange={(triadA) => patch({ triadA })} />
          <ChordFields legend="Triad B" value={settings.triadB} onChange={(triadB) => patch({ triadB, parentTransform: triadB.quality === 'major' || triadB.quality === 'minor' ? settings.parentTransform : 'none' })} />
          <Field label="Relationship">
            <select data-testid="harmony-lab-use" value={settings.use} onChange={(event) => patch({ use: event.target.value as HarmonyLabSettings['use'] })}>
              <option value="alternate">Alternate</option>
              <option value="interlock">Interlock</option>
              <option value="superpose">Superpose</option>
            </select>
          </Field>
          {consonant ? (
            <Field label="Parent transformation">
              <select data-testid="harmony-lab-transform" value={settings.parentTransform} onChange={(event) => patch({ parentTransform: event.target.value as HarmonyLabSettings['parentTransform'] })}>
                {['none', 'P', 'L', 'R', 'H', 'N', 'S'].map((operation) => <option key={operation} value={operation}>{operation}</option>)}
              </select>
            </Field>
          ) : <p style={{ margin: 0, fontSize: '0.8rem' }}>Augmented and diminished triads have no P, L, R, H, N or S transform.</p>}
          <label>
            <input data-testid="harmony-lab-phrase-return" type="checkbox" checked={settings.phraseReturn} onChange={(event) => patch({ phraseReturn: event.target.checked, motifDevelopment: event.target.checked ? settings.motifDevelopment : false })} />
            {' '}Bring the phrase back in bar 3
          </label>
          <label>
            <input data-testid="harmony-lab-motif" type="checkbox" checked={settings.motifDevelopment} disabled={!settings.phraseReturn} onChange={(event) => patch({ motifDevelopment: event.target.checked })} />
            {' '}Reverse the returning phrase
          </label>
        </div>
      )}

      {settings.kind === 'dyad-pair' && (
        <div data-testid="harmony-lab-dyad-controls" style={{ display: 'grid', gap: '0.5rem' }}>
          <DyadFields legend="Dyad A" value={settings.dyadA} onChange={(dyadA) => patch({ dyadA })} />
          <Field label="Movement">
            <select data-testid="harmony-lab-motion" value={settings.motion} onChange={(event) => patch({ motion: event.target.value as HarmonyLabSettings['motion'] })}>
              <option value="parallel">Parallel</option>
              <option value="contrary">Contrary</option>
              <option value="oblique">Oblique</option>
            </select>
          </Field>
          {settings.motion === 'parallel'
            ? <DyadFields legend="Dyad B" value={settings.dyadB} onChange={(dyadB) => patch({ dyadB })} />
            : <p data-testid="harmony-lab-dyad-derived" style={{ margin: 0, fontSize: '0.82rem' }}>Dyad B is derived from Dyad A.</p>}
          <label>
            <input data-testid="harmony-lab-silence" type="checkbox" checked={settings.silence} onChange={(event) => patch({ silence: event.target.checked })} />
            {' '}Leave a rest before the last bar
          </label>
          <Field label="Common-tone behaviour">
            <select value={settings.commonTone} onChange={(event) => patch({ commonTone: event.target.value as HarmonyLabSettings['commonTone'] })}>
              <option value="restrike">Restrike</option>
              <option value="sustain">Hold the shared pitch</option>
            </select>
          </Field>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Field label="Density">
          <select data-testid="harmony-lab-density" value={settings.density} onChange={(event) => patch({ density: event.target.value as HarmonyLabSettings['density'], simultaneous: event.target.value === 'dense' ? settings.simultaneous : false })}>
            <option value="sparse">Sparse</option>
            <option value="medium">Medium</option>
            <option value="dense">Dense</option>
          </select>
        </Field>
        <Field label="Note length and spacing">
          <select data-testid="harmony-lab-duration" value={settings.duration} onChange={(event) => patch({ duration: event.target.value as HarmonyLabSettings['duration'] })}>
            <option value="eighth">Eighth</option>
            <option value="quarter">Quarter</option>
            <option value="half">Half</option>
          </select>
        </Field>
        <Field label="Tempo">
          <input data-testid="harmony-lab-tempo" type="number" min={40} max={200} value={settings.tempo} onChange={(event) => patch({ tempo: Number(event.target.value) })} />
        </Field>
        <Field label="Ensemble">
          <select
            data-testid="harmony-lab-ensemble"
            value={settings.ensemble}
            onChange={(event) => {
              const ensemble = event.target.value as E2EnsembleId;
              patch({ ensemble, simultaneous: ensemble === 'string-quartet' ? false : settings.simultaneous });
            }}
          >
            <option value="big-band">Big band — 16 parts</option>
            <option value="string-quartet">String quartet — 4 parts</option>
            <option value="ecm-duo">ECM guitar and upright bass — 2 parts</option>
          </select>
        </Field>
      </div>

      <fieldset data-testid="harmony-lab-source" style={{ border: '1px solid var(--border-subtle, #333)', borderRadius: 6 }}>
        <legend>Source locks</legend>
        <Field label="MusicXML source">
          <input
            data-testid="harmony-lab-source-file"
            type="file"
            accept=".xml,.musicxml,application/xml,text/xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((xml) => patch({ sourceXml: xml }));
            }}
          />
        </Field>
        <label><input data-testid="harmony-lab-lock-melody" type="checkbox" checked={settings.preserveMelody} onChange={(event) => patch({ preserveMelody: event.target.checked })} /> Keep the melody</label>
        <label><input data-testid="harmony-lab-lock-bass" type="checkbox" checked={settings.preserveBass} onChange={(event) => patch({ preserveBass: event.target.checked })} /> Keep the bass</label>
        <label><input data-testid="harmony-lab-lock-rhythm" type="checkbox" checked={settings.preserveRhythm} onChange={(event) => patch({ preserveRhythm: event.target.checked })} /> Keep the rhythm</label>
        <label><input data-testid="harmony-lab-lock-form" type="checkbox" checked={settings.preserveForm} onChange={(event) => patch({ preserveForm: event.target.checked })} /> Keep the form and metre</label>
        <label><input data-testid="harmony-lab-lock-tempo" type="checkbox" checked={settings.preserveTempo} onChange={(event) => patch({ preserveTempo: event.target.checked })} /> Keep the tempo</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Field label="Region from bar">
            <input data-testid="harmony-lab-region-start" type="number" min={1} value={settings.regionStartBar} onChange={(event) => patch({ regionStartBar: Number(event.target.value) })} />
          </Field>
          <Field label="through bar">
            <input data-testid="harmony-lab-region-end" type="number" min={1} value={settings.regionEndBar} onChange={(event) => patch({ regionEndBar: Number(event.target.value) })} />
          </Field>
        </div>
        <p data-testid="harmony-lab-lock-status" style={{ marginBottom: 0, fontSize: '0.82rem' }}>
          {harmonyLabLockLabel(settings)}
        </p>
      </fieldset>

      <details data-testid="harmony-lab-advanced">
        <summary>Advanced</summary>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
          <Field label="Seed">
            <input data-testid="harmony-lab-seed" type="number" value={settings.seed} onChange={(event) => patch({ seed: Number(event.target.value) })} />
          </Field>
          <Field label="Lowest MIDI">
            <input type="number" min={24} max={96} value={settings.registerLow} onChange={(event) => patch({ registerLow: Number(event.target.value) })} />
          </Field>
          <Field label="Highest MIDI">
            <input type="number" min={24} max={108} value={settings.registerHigh} onChange={(event) => patch({ registerHigh: Number(event.target.value) })} />
          </Field>
          {settings.kind === 'dyad-pair' && settings.motion !== 'parallel' ? (
            <Field label="Contrary or oblique semitones">
              <input data-testid="harmony-lab-semitones" type="number" min={1} max={7} value={settings.contrarySemitones} onChange={(event) => patch({ contrarySemitones: Number(event.target.value) })} />
            </Field>
          ) : null}
        </div>
      </details>

      <p data-testid="harmony-lab-summary" style={{ margin: 0, fontSize: '0.82rem' }}>
        {clientIssue ?? `${settings.title}. ${settings.ensemble}. ${settings.kind}.`}
      </p>
      {error ? <p role="alert" data-testid="harmony-lab-error">{error}</p> : null}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="harmony-lab-generate" disabled={busy || !!clientIssue} onClick={() => void generate()}>
          {busy ? 'Writing…' : result ? 'Regenerate' : 'Generate'}
        </button>
        <button
          type="button"
          data-testid="harmony-lab-save"
          onClick={() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))}
        >
          Save settings
        </button>
        <button
          type="button"
          data-testid="harmony-lab-restore"
          onClick={() => {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (!saved) return;
            const parsed = JSON.parse(saved) as HarmonyLabSettings;
            if (parsed.version === HARMONY_LAB_VERSION) setSettings({ ...defaultHarmonyLabSettings(), ...parsed });
          }}
        >
          Reopen saved settings
        </button>
      </div>

      {result ? (
        <div data-testid="harmony-lab-result" style={{ display: 'grid', gap: '0.45rem' }}>
          <p style={{ margin: 0 }}>{result.noteCount} notes. Parts: {result.partIds.join(', ')}.</p>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              data-testid="harmony-lab-export-xml"
              onClick={() => download(`${settings.title || 'harmony-lab'}.musicxml`, new Blob([result.musicXml], { type: 'application/vnd.recordare.musicxml+xml' }))}
            >
              Export MusicXML
            </button>
            <button
              type="button"
              data-testid="harmony-lab-export-midi"
              onClick={() => {
                const binary = Uint8Array.from(atob(result.midiBase64), (char) => char.charCodeAt(0));
                download(`${settings.title || 'harmony-lab'}.mid`, new Blob([binary], { type: 'audio/midi' }));
              }}
            >
              Export MIDI
            </button>
          </div>
          <ScorePreview musicXml={result.musicXml} />
          <ScoreAudition musicXml={result.musicXml} label={result.intervalText || settings.title} />
        </div>
      ) : null}
    </section>
  );
}
