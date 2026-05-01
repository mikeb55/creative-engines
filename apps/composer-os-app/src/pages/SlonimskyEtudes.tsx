import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { mapCoreUiToGenerationFields } from '../utils/buildGenerateRequestBody';
import { parseChordProgressionInputFlexible } from '../utils/chordProgressionClient';
import {
  THESAURUS_REGISTRY,
  THESAURUS_SECTIONS,
  type ThesaurusSectionKey,
} from '@composer-os/core/slonimsky/thesaurusRegistry';

/** Must stay aligned with `HomeGenerate` non-score presets — Slonimsky etude is not a “score preset”. */
const MINIMAL_STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

const CHORD_PARSE_ERROR =
  'Could not parse chord progression. Use standard jazz notation e.g. Dm9, G13, Cmaj9, A7alt — separated by spaces or commas.';

const KEY_OPTIONS: { label: string; keyPc: number }[] = [
  { label: 'C', keyPc: 0 },
  { label: 'C#', keyPc: 1 },
  { label: 'D', keyPc: 2 },
  { label: 'D#', keyPc: 3 },
  { label: 'E', keyPc: 4 },
  { label: 'F', keyPc: 5 },
  { label: 'F#', keyPc: 6 },
  { label: 'G', keyPc: 7 },
  { label: 'G#', keyPc: 8 },
  { label: 'A', keyPc: 9 },
  { label: 'A#', keyPc: 10 },
  { label: 'B', keyPc: 11 },
];

const CHROMATIC_STRENGTH_OPTIONS = [
  { value: 'off' as const, label: 'Off' },
  { value: 'subtle' as const, label: 'Subtle' },
  { value: 'prominent' as const, label: 'Prominent' },
];

type GenResult = {
  success?: boolean;
  error?: string;
  filename?: string;
  filepath?: string;
  validation?: { errors?: string[] };
};

function notifyGenPhase(phase: 'running' | 'succeeded' | 'failed' | 'idle'): void {
  window.composerOsDesktop?.notifyGenerationPhase(phase);
}

function dirnameOnly(fp: string): string {
  const p = fp.replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(0, li) : p;
}

function basenameOnly(fp: string): string {
  const p = fp.replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(li + 1) : p;
}

function enginePatternsForSection(section: ThesaurusSectionKey) {
  return THESAURUS_REGISTRY.filter((p) => p.section === section && p.inEngine);
}

export function SlonimskyEtudes() {
  const [sectionKey, setSectionKey] = useState<ThesaurusSectionKey>(THESAURUS_SECTIONS[0]!.key);
  const [patternId, setPatternId] = useState<string>('');
  const [chordProgressionText, setChordProgressionText] = useState('');
  const [keyPc, setKeyPc] = useState(0);
  const [slonimskyCycleKeys, setSlonimskyCycleKeys] = useState(false);
  const [chromaticStrength, setChromaticStrength] = useState<'off' | 'subtle' | 'prominent'>('off');
  const [bpm, setBpm] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const patternsInSection = useMemo(() => enginePatternsForSection(sectionKey), [sectionKey]);

  useEffect(() => {
    const rows = enginePatternsForSection(sectionKey);
    setPatternId((prev) => (rows.some((p) => p.id === prev) ? prev : rows[0]?.id ?? ''));
  }, [sectionKey]);

  const displayFilename = outputPath ? basenameOnly(outputPath) : '';

  const openThisFolder = useCallback(async () => {
    if (!outputPath) return;
    setError(null);
    try {
      const r = await api.openOutputFolder({ path: dirnameOnly(outputPath) });
      if (!r.success && r.message) setError(r.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [outputPath]);

  const generate = useCallback(async () => {
    const chordTrim = chordProgressionText.trim();
    if (!chordTrim) {
      setError('Slonimsky etude requires a chord progression. Enter chords in the field below.');
      return;
    }
    if (!patternId) {
      setError('No engine pattern is available for this family. Choose another pattern family.');
      return;
    }
    const wybleParsed = parseChordProgressionInputFlexible(chordTrim);
    if (!wybleParsed.ok) {
      setError(CHORD_PARSE_ERROR);
      return;
    }

    const seed = Math.floor(Math.random() * 1e9);
    setLoading(true);
    setError(null);
    setOutputPath(null);
    notifyGenPhase('running');
    try {
      const coreFields = mapCoreUiToGenerationFields({
        presetId: 'slonimsky_etude',
        seed,
        tonalCenter: '',
        bpm,
        totalBars: 32,
        variationId: 'v-1',
        creativeControlLevel: 'stable',
      });
      const payload = {
        ...coreFields,
        variationEnabled: false,
        styleStack: MINIMAL_STYLE_STACK,
        chordProgressionText: chordTrim,
        slonimskyPatternId: patternId,
        slonimskyKeyPc: keyPc,
        slonimskyCycleKeys,
        chromaticStrength,
      };
      const r = (await api.generate(payload)) as GenResult;
      const ok = !!r.success;
      if (ok && r.filepath) {
        setOutputPath(r.filepath);
      } else {
        setOutputPath(null);
        const errMsg =
          r.error ??
          (r.validation?.errors?.length ? r.validation.errors.join(' ') : undefined) ??
          (!ok ? 'Generation failed.' : 'Generation finished but no file path was returned.');
        setError(errMsg);
      }
      notifyGenPhase(ok ? 'succeeded' : 'failed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setOutputPath(null);
      notifyGenPhase('failed');
    } finally {
      setLoading(false);
    }
  }, [
    bpm,
    chordProgressionText,
    chromaticStrength,
    keyPc,
    patternId,
    slonimskyCycleKeys,
  ]);

  const inputStyle = {
    padding: '0.45rem 0.6rem',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-input, var(--bg))',
    color: 'var(--text)',
  } as const;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ margin: '0 0 0.35rem' }}>Slonimsky Etudes</h2>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.45 }}>
        Generate a Slonimsky pattern etude over your chord progression. Output is MusicXML in your Composer OS
        library folder.
      </p>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pattern family
          </label>
          <select
            value={sectionKey}
            onChange={(e) => setSectionKey(e.target.value as ThesaurusSectionKey)}
            disabled={loading}
            style={{ ...inputStyle, width: '100%', maxWidth: 480 }}
          >
            {THESAURUS_SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pattern (engine pool)
          </label>
          <select
            value={patternId}
            onChange={(e) => setPatternId(e.target.value)}
            disabled={loading || patternsInSection.length === 0}
            style={{ ...inputStyle, width: '100%', maxWidth: 480 }}
          >
            {patternsInSection.length === 0 ? (
              <option value="">No patterns in engine pool for this family</option>
            ) : (
              patternsInSection.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Chord progression (required)
          </label>
          <textarea
            value={chordProgressionText}
            onChange={(e) => setChordProgressionText(e.target.value)}
            disabled={loading}
            placeholder="Cmaj7 | Dm7 | G7 | Cmaj7"
            rows={4}
            style={{
              ...inputStyle,
              width: '100%',
              maxWidth: 600,
              fontFamily: 'inherit',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Key
            </label>
            <select
              value={keyPc}
              onChange={(e) => setKeyPc(Number(e.target.value))}
              disabled={loading}
              style={{ ...inputStyle, width: 140 }}
            >
              {KEY_OPTIONS.map((k) => (
                <option key={k.keyPc} value={k.keyPc}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Tempo (BPM)
            </label>
            <input
              type="number"
              min={20}
              max={400}
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10) || 0)}
              disabled={loading}
              style={{ ...inputStyle, width: 120 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Chromatic strength
            </label>
            <select
              value={chromaticStrength}
              onChange={(e) =>
                setChromaticStrength(e.target.value as 'off' | 'subtle' | 'prominent')
              }
              disabled={loading}
              style={{ ...inputStyle, width: 160 }}
            >
              {CHROMATIC_STRENGTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={slonimskyCycleKeys}
            onChange={(e) => setSlonimskyCycleKeys(e.target.checked)}
            disabled={loading}
          />
          Cycle through 12 keys
        </label>

        {error && (
          <div
            role="alert"
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'rgba(180, 60, 60, 0.12)',
              color: 'var(--text)',
              fontSize: '0.88rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            disabled={loading || !patternId}
            onClick={() => void generate()}
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
          {outputPath && (
            <>
              <button type="button" className="secondary" onClick={() => void openThisFolder()}>
                Open in folder
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {displayFilename}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
