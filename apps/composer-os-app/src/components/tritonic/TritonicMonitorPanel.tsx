/**
 * V1.5p9 — Tritonic Harmonic Float + Melodic Trace (right-hand monitor).
 */

import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { TritonicBehaviourBiases } from '../../../../../engines/composer-os-v2/core/tritonic/tritonicBehaviourBiases';
import { NEUTRAL_TRITONIC_BEHAVIOUR_BIAS } from '../../../../../engines/composer-os-v2/core/tritonic/tritonicBehaviourBiases';
import type { TritonicMonitorView } from '../../../../../engines/composer-os-v2/core/music-context/tritonicMonitorPanels';
import type {
  TritonicColumnColour,
  TritonicMonitorColumn,
  TritonicMonitorSnapshot,
  TritonicResolutionBadge,
} from '../../../../../engines/composer-os-v2/core/tritonic/tritonicMonitorSnapshot';

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const BIAS_FIELDS: { key: keyof TritonicBehaviourBiases; label: string }[] = [
  { key: 'tension', label: 'Tension' },
  { key: 'resolutionDelay', label: 'Resolution delay' },
  { key: 'density', label: 'Density' },
  { key: 'registralSpread', label: 'Registral spread' },
  { key: 'contourBias', label: 'Contour' },
  { key: 'cadenceAvoidance', label: 'Cadence avoid' },
  { key: 'rhythmicDisplacement', label: 'Rhythmic disp.' },
  { key: 'anchorAdhesion', label: 'Anchor adhesion' },
  { key: 'motifSingability', label: 'Singability' },
];

const COLOUR_STYLES: Record<TritonicColumnColour, { bg: string; border: string; glow?: string }> = {
  stable: { bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.4)' },
  colouristic: { bg: 'rgba(251,146,60,0.18)', border: 'rgba(251,146,60,0.55)' },
  unresolved: { bg: 'rgba(244,63,94,0.22)', border: 'rgba(244,63,94,0.65)' },
  'cadence-eligible': {
    bg: 'rgba(129,140,248,0.16)',
    border: 'rgba(129,140,248,0.55)',
    glow: '0 0 8px rgba(129,140,248,0.55)',
  },
};

const BADGE_STYLES: Record<TritonicResolutionBadge, CSSProperties> = {
  locked: { background: 'rgba(100,116,139,0.25)', color: '#94a3b8' },
  near: { background: 'rgba(234,179,8,0.2)', color: '#fde047' },
  eligible: { background: 'rgba(34,197,94,0.2)', color: '#86efac' },
  resolving: { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' },
};

function midiToName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PC_NAMES[pc]}${octave}`;
}

function intervalLabel(prev: number | undefined, midi: number): string {
  if (prev === undefined) return '—';
  const iv = midi - prev;
  const dir = iv > 0 ? '+' : '';
  return `${dir}${iv}`;
}

function rhythmicOffsetLabel(beat: number): string {
  if (beat === 1) return 'downbeat';
  if (beat === 3) return 'weak';
  return 'offbeat';
}

function biasInfluence(biases: TritonicBehaviourBiases): keyof TritonicBehaviourBiases {
  let best: keyof TritonicBehaviourBiases = 'tension';
  let max = 0;
  for (const { key } of BIAS_FIELDS) {
    const d = Math.abs(biases[key] - NEUTRAL_TRITONIC_BEHAVIOUR_BIAS);
    if (d > max) {
      max = d;
      best = key;
    }
  }
  return best;
}

export type TritonicMonitorPanelProps = {
  monitorView: TritonicMonitorView | null;
  behaviourBiases: TritonicBehaviourBiases;
  onBehaviourBiasChange: (key: keyof TritonicBehaviourBiases, value: number) => void;
  recentlyChangedBias?: keyof TritonicBehaviourBiases | null;
  loading?: boolean;
  hasGenerated?: boolean;
  className?: string;
};

function HarmonicFloatStrip(props: {
  columns: readonly TritonicMonitorColumn[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const { columns, selectedIndex, onSelect } = props;
  const minCentroid = Math.min(...columns.map((c) => c.registralCentroid), 48);
  const maxCentroid = Math.max(...columns.map((c) => c.registralCentroid), 84);
  const span = Math.max(12, maxCentroid - minCentroid);

  return (
    <div
      role="list"
      aria-label="Harmonic float anchor columns"
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        padding: '0.5rem 0.35rem 0.65rem',
        minHeight: 120,
        alignItems: 'flex-end',
      }}
    >
      {columns.map((col) => {
        const palette = COLOUR_STYLES[col.colourState];
        const yPct = 1 - (col.registralCentroid - minCentroid) / span;
        const selected = col.columnIndex === selectedIndex;
        return (
          <button
            key={col.columnIndex}
            type="button"
            role="listitem"
            aria-pressed={selected}
            onClick={() => onSelect(col.columnIndex)}
            style={{
              flex: '0 0 auto',
              minWidth: 52,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '0.35rem 0.3rem',
              borderRadius: 8,
              border: selected ? '2px solid var(--accent, #6366f1)' : `1px solid ${palette.border}`,
              background: palette.bg,
              boxShadow: col.colourState === 'cadence-eligible' ? palette.glow : undefined,
              cursor: 'pointer',
              transform: `translateY(${yPct * 18}px)`,
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.1,
                textAlign: 'center',
              }}
            >
              {col.cellGlyph}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              {col.anchorSymbol || '—'}
            </span>
            {col.unresolvedCount > 0 ? (
              <span style={{ fontSize: '0.62rem', color: '#fb7185' }}>{col.unresolvedCount}∆</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function MelodicTraceChart(props: {
  snapshot: TritonicMonitorSnapshot;
  selectedIndex: number;
  onHover: (index: number | null) => void;
}) {
  const { snapshot, selectedIndex, onHover } = props;
  const width = 280;
  const height = 88;
  const padding = { l: 8, r: 8, t: 8, b: 8 };
  const cols = snapshot.columns;
  if (cols.length === 0) {
    return (
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
        Generate to see melodic trace.
      </p>
    );
  }

  const midis = cols.flatMap((c) => [c.voicingTopMidi, c.projectedStrandMidi, c.singerSafeMidi]);
  const minM = Math.min(...midis) - 2;
  const maxM = Math.max(...midis) + 2;
  const range = Math.max(8, maxM - minM);
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;

  const xAt = (i: number) => padding.l + (i / Math.max(1, cols.length - 1)) * innerW;
  const yAt = (midi: number) => padding.t + innerH - ((midi - minM) / range) * innerH;

  const singerPts = cols.map((c, i) => `${xAt(i)},${yAt(c.singerSafeMidi)}`).join(' ');
  const ghostPts = cols.map((c, i) => `${xAt(i)},${yAt(c.projectedStrandMidi)}`).join(' ');

  const hoverCol = selectedIndex >= 0 ? cols[selectedIndex] : null;
  const prevMidi =
    selectedIndex > 0 ? cols[selectedIndex - 1]?.singerSafeMidi : undefined;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Melodic trace contour"
        style={{ display: 'block', maxWidth: '100%' }}
        onMouseLeave={() => onHover(null)}
      >
        <polyline
          points={ghostPts}
          fill="none"
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <polyline
          points={singerPts}
          fill="none"
          stroke="var(--text)"
          strokeWidth={2.75}
        />
        {cols.map((c, i) => (
          <circle
            key={`vt-${i}`}
            cx={xAt(i)}
            cy={yAt(c.voicingTopMidi)}
            r={3}
            fill="rgba(148,163,184,0.35)"
            stroke="none"
            onMouseEnter={() => onHover(i)}
          />
        ))}
        {cols.map((c, i) => (
          <rect
            key={`hit-${i}`}
            x={xAt(i) - 10}
            y={padding.t}
            width={20}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => onHover(i)}
          />
        ))}
      </svg>
      {hoverCol ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: 4,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            lineHeight: 1.35,
            pointerEvents: 'none',
          }}
        >
          <div>{midiToName(hoverCol.singerSafeMidi)}</div>
          <div>{intervalLabel(prevMidi, hoverCol.singerSafeMidi)} st</div>
          <div>{rhythmicOffsetLabel(hoverCol.beat)}</div>
        </div>
      ) : null}
    </div>
  );
}

function ActiveCellCard(props: { column: TritonicMonitorColumn | null; snapshot: TritonicMonitorSnapshot }) {
  const { column, snapshot } = props;
  if (!column) {
    return (
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Select a column</p>
    );
  }

  const spark = snapshot.tensionSeries;
  const spans = snapshot.phraseSpans;
  const sparkW = 200;
  const sparkH = 28;
  const lastTwo = spans.length ? spans : [{ start: 0, end: spark.length }];
  const start = lastTwo[0]?.start ?? 0;
  const end = lastTwo[lastTwo.length - 1]?.end ?? spark.length;
  const slice = spark.slice(start, end);
  const maxT = Math.max(...slice, 0.01);

  const points = slice
    .map((t, i) => {
      const x = (i / Math.max(1, slice.length - 1)) * (sparkW - 4) + 2;
      const y = sparkH - 4 - (t / maxT) * (sparkH - 8);
      return `${x},${y}`;
    })
    .join(' ');

  const highlightLocal = column.columnIndex - start;

  return (
    <div
      style={{
        padding: '0.55rem 0.65rem',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-input, var(--bg))',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{column.cellFamily}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          tension {(column.tension * 100).toFixed(0)}%
        </span>
        <span
          style={{
            ...BADGE_STYLES[column.resolutionBadge],
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '0.15rem 0.45rem',
            borderRadius: 999,
            textTransform: 'capitalize',
          }}
        >
          {column.resolutionBadge}
        </span>
      </div>
      <svg width={sparkW} height={sparkH} aria-label="Tension arc sparkline">
        <polyline
          points={points}
          fill="none"
          stroke="rgba(99,102,241,0.5)"
          strokeWidth={1.5}
        />
        {highlightLocal >= 0 && highlightLocal < slice.length ? (
          <circle
            cx={(highlightLocal / Math.max(1, slice.length - 1)) * (sparkW - 4) + 2}
            cy={sparkH - 4 - (slice[highlightLocal]! / maxT) * (sparkH - 8)}
            r={4}
            fill="var(--accent, #6366f1)"
          />
        ) : null}
      </svg>
    </div>
  );
}

function BiasSideRail(props: {
  biases: TritonicBehaviourBiases;
  onChange: (key: keyof TritonicBehaviourBiases, value: number) => void;
  compact: boolean;
  influential: keyof TritonicBehaviourBiases;
  recentlyChanged: keyof TritonicBehaviourBiases | null;
  disabled?: boolean;
}) {
  const { biases, onChange, compact, influential, recentlyChanged, disabled } = props;

  return (
    <aside
      style={{
        flex: '0 0 auto',
        width: compact ? 52 : 148,
        borderLeft: '1px solid var(--border)',
        paddingLeft: compact ? 6 : 10,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 4 : 6,
      }}
      aria-label="Tritonic behaviour biases"
    >
      {!compact ? (
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Biases</div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: '0.62rem',
            padding: '0.2rem 0.35rem',
            borderRadius: 4,
            background: 'rgba(99,102,241,0.15)',
            color: '#a5b4fc',
            textAlign: 'center',
          }}
          title="Most influential bias"
        >
          ↑ {BIAS_FIELDS.find((f) => f.key === influential)?.label ?? influential}
        </span>
        {recentlyChanged ? (
          <span
            style={{
              fontSize: '0.62rem',
              padding: '0.2rem 0.35rem',
              borderRadius: 4,
              background: 'rgba(34,197,94,0.12)',
              color: '#86efac',
              textAlign: 'center',
            }}
          >
            Δ {BIAS_FIELDS.find((f) => f.key === recentlyChanged)?.label ?? recentlyChanged}
          </span>
        ) : null}
      </div>
      {BIAS_FIELDS.map(({ key, label }) =>
        compact ? (
          <input
            key={key}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={biases[key]}
            disabled={disabled}
            onChange={(e) => onChange(key, parseFloat(e.target.value))}
            title={`${label}: ${biases[key].toFixed(2)}`}
            aria-label={label}
            style={{ width: '100%', writingMode: 'vertical-lr', height: 48, margin: 0 }}
          />
        ) : (
          <label key={key} style={{ display: 'block', fontSize: '0.68rem' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>{label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{biases[key].toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={biases[key]}
              disabled={disabled}
              onChange={(e) => onChange(key, parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        ),
      )}
    </aside>
  );
}

export function TritonicMonitorPanel({
  monitorView,
  behaviourBiases,
  onBehaviourBiasChange,
  recentlyChangedBias = null,
  loading = false,
  hasGenerated = false,
  className,
}: TritonicMonitorPanelProps) {
  const snapshot = monitorView?.snapshot ?? null;
  const columns = snapshot?.columns ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);

  const activeIndex = hoverIndex ?? selectedIndex;
  const activeColumn = columns[activeIndex] ?? columns[columns.length - 1] ?? null;

  const influential = useMemo(() => biasInfluence(behaviourBiases), [behaviourBiases]);
  const compactBias = loading || hasGenerated;

  const handleBias = useCallback(
    (key: keyof TritonicBehaviourBiases, value: number) => {
      onBehaviourBiasChange(key, value);
    },
    [onBehaviourBiasChange],
  );

  return (
    <div
      className={className}
      style={{
        flex: '0 0 auto',
        width: 'min(100%, 380px)',
        display: 'flex',
        flexDirection: 'row',
        gap: 0,
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, padding: '0.65rem 0.75rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem' }}>Tritonic monitor</h3>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {monitorView?.engineId ?? 'tritonic'}
          {monitorView?.hasReceipt ? ' · receipt' : ''}
        </p>

        <section aria-label="Harmonic float">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Harmonic float</div>
          {columns.length > 0 ? (
            <HarmonicFloatStrip
              columns={columns}
              selectedIndex={activeIndex}
              onSelect={setSelectedIndex}
            />
          ) : (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Anchor columns appear after generate.
            </p>
          )}
        </section>

        <section aria-label="Active cell" style={{ margin: '0.5rem 0' }}>
          <ActiveCellCard column={activeColumn} snapshot={snapshot ?? emptySnapshot()} />
        </section>

        <section aria-label="Melodic trace">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Melodic trace</div>
          {snapshot ? (
            <MelodicTraceChart
              snapshot={snapshot}
              selectedIndex={activeIndex}
              onHover={setHoverIndex}
            />
          ) : null}
        </section>

        <details
          style={{ marginTop: '0.65rem' }}
          open={diagOpen}
          onToggle={(e) => setDiagOpen(e.currentTarget.open)}
        >
          <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Diagnostics</summary>
          {snapshot ? (
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem', fontSize: '0.72rem', lineHeight: 1.5 }}>
              <li>unresolvedToneCount: {snapshot.diagnostics.unresolvedToneCount}</li>
              <li>contourVariety: {snapshot.diagnostics.contourVariety.toFixed(2)}</li>
              <li>cadenceStrength: {snapshot.diagnostics.cadenceStrength.toFixed(2)}</li>
              <li>
                rhythmicOffset: down {snapshot.diagnostics.rhythmicOffsetDistribution.downbeat} · weak{' '}
                {snapshot.diagnostics.rhythmicOffsetDistribution.weak} · off{' '}
                {snapshot.diagnostics.rhythmicOffsetDistribution.offbeat}
              </li>
            </ul>
          ) : (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</p>
          )}
        </details>
      </div>

      <BiasSideRail
        biases={behaviourBiases}
        onChange={handleBias}
        compact={compactBias}
        influential={influential}
        recentlyChanged={recentlyChangedBias}
        disabled={loading}
      />
    </div>
  );
}

function emptySnapshot(): TritonicMonitorSnapshot {
  return {
    columns: [],
    tensionSeries: [],
    phraseSpans: [],
    phraseState: {
      previousCell: null,
      unresolvedTones: [],
      registralCentroid: 0,
      lastContourType: 'static',
      tensionArc: { mean: 0, peak: 0 },
      resolutionEligibility: 1,
    },
    diagnostics: {
      unresolvedToneCount: 0,
      contourVariety: 0,
      cadenceStrength: 0,
      rhythmicOffsetDistribution: { downbeat: 0, weak: 0, offbeat: 0 },
    },
  };
}
