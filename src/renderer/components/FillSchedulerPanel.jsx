import React, { useMemo } from 'react';
import { useFillScheduler } from '../context/FillSchedulerContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

function FillBarStrip({ sectionBars, fillPositions }) {
  const total = Math.max(1, sectionBars);
  const fillSet = new Set(fillPositions ?? []);
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>Fill positions (by bar)</div>
      <div
        style={{
          display: 'flex',
          height: 28,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border-subtle, #333)',
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const bar = i + 1;
          const isFill = fillSet.has(bar);
          return (
            <div
              key={bar}
              title={`Bar ${bar}${isFill ? ' — fill' : ''}`}
              style={{
                flex: 1,
                minWidth: 4,
                background: isFill ? 'rgba(232, 120, 80, 0.85)' : 'rgba(100, 140, 255, 0.15)',
                borderRight: '1px solid rgba(0,0,0,0.15)',
              }}
            />
          );
        })}
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
        Orange = fill bar · {fillPositions?.length ?? 0} fills across {total} bars
      </p>
    </div>
  );
}

export function FillSchedulerPanel() {
  const {
    fillTypes,
    fillDensity,
    setFillDensity,
    fillTypeId,
    setFillTypeId,
    lockFills,
    setLockFills,
    schedule,
    sectionBars,
  } = useFillScheduler();

  const fillPositions = useMemo(() => schedule?.fillPositions ?? [], [schedule]);

  return (
    <section style={panelStyle} aria-label="Fill scheduler">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Fill scheduler</h3>

      <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.5rem' }}>
        Fill density {fillDensity.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={fillDensity}
          onChange={(e) => setFillDensity(Number(e.target.value))}
          style={{ width: '100%', display: 'block', marginTop: 4 }}
        />
      </label>

      <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '0.5rem' }}>
        Fill type
        <select
          value={fillTypeId}
          onChange={(e) => setFillTypeId(e.target.value)}
          style={{ width: '100%', marginTop: 4 }}
        >
          {fillTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
        {fillTypes.find((t) => t.id === fillTypeId)?.description}
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', marginBottom: '0.35rem' }}>
        <input type="checkbox" checked={lockFills} onChange={(e) => setLockFills(e.target.checked)} />
        Lock fill positions
      </label>

      <FillBarStrip sectionBars={sectionBars} fillPositions={fillPositions} />
    </section>
  );
}
