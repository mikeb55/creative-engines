import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { IRealVaultOutput, PhraseContourTag } from '@composer-os/core/irealpro';

function tensionNodeFill(t: number): string {
  if (t < 0.33) return 'fill-emerald-500';
  if (t <= 0.66) return 'fill-amber-400';
  return 'fill-red-500';
}

function dominantContour(
  phraseContours: PhraseContourTag[] | undefined,
  chorusIndex: number,
  barsPerChorus: number
): PhraseContourTag {
  const lo = chorusIndex * barsPerChorus;
  const tally = { rise: 0, fall: 0, stable: 0 };
  for (let b = 0; b < barsPerChorus; b++) {
    const tag = phraseContours?.[lo + b] ?? 'stable';
    tally[tag]++;
  }
  if (tally.rise >= tally.fall && tally.rise >= tally.stable) return 'rise';
  if (tally.fall >= tally.rise && tally.fall >= tally.stable) return 'fall';
  return 'stable';
}

function ContourGlyph({ contour }: { contour: PhraseContourTag }) {
  return (
    <svg
      className="mx-auto block text-zinc-400"
      width={28}
      height={14}
      viewBox="0 0 28 14"
      aria-hidden
    >
      {contour === 'rise' ? (
        <line x1={4} y1={11} x2={24} y2={3} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      ) : contour === 'fall' ? (
        <line x1={4} y1={3} x2={24} y2={11} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      ) : (
        <line x1={4} y1={7} x2={24} y2={7} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      )}
    </svg>
  );
}

export type ChorusArcStripProps = {
  chorusCount: number;
  barsPerChorus: number;
  output: IRealVaultOutput | null;
  locked: boolean[];
  onToggleLock: (chorusIndex: number) => void;
  /** Optional; not used — drag is local preview only (no regeneration). */
  onRegenerateChorus?: (chorusIndex: number) => void;
};

export function ChorusArcStrip({
  chorusCount,
  barsPerChorus,
  output,
  locked,
  onToggleLock,
}: ChorusArcStripProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(320);
  const [dragging, setDragging] = useState<number | null>(null);
  /** Local-only tension edits (0–1); cleared when vault output or chorus count changes. */
  const [editedTension, setEditedTension] = useState<Partial<Record<number, number>>>({});

  useEffect(() => {
    setEditedTension({});
  }, [output, chorusCount]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(Math.max(120, el.offsetWidth));
    });
    ro.observe(el);
    setWidth(Math.max(120, el.offsetWidth));
    return () => ro.disconnect();
  }, []);

  const tensions = useMemo(() => {
    const src = output?.tensionProgression?.perChorus;
    return Array.from({ length: chorusCount }, (_, i) =>
      Math.min(1, Math.max(0, src?.[i] ?? 0))
    );
  }, [output, chorusCount]);

  const displayTensions = useMemo(() => {
    return tensions.map((t, i) =>
      editedTension[i] !== undefined ? editedTension[i]! : t
    );
  }, [tensions, editedTension]);

  const yFromClient = useCallback((clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0.5;
    const rect = svg.getBoundingClientRect();
    const y = (clientY - rect.top) / rect.height;
    return Math.min(1, Math.max(0, 1 - y));
  }, []);

  useEffect(() => {
    if (dragging === null) return;
    const move = (ev: PointerEvent) => {
      const t = yFromClient(ev.clientY);
      setEditedTension((prev) => ({ ...prev, [dragging]: t }));
    };
    const up = () => {
      setDragging(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, yFromClient]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, chorusIndex: number) => {
      if (locked[chorusIndex] || !output) return;
      e.preventDefault();
      setDragging(chorusIndex);
      setEditedTension((prev) => ({
        ...prev,
        [chorusIndex]: yFromClient(e.clientY),
      }));
    },
    [locked, output, yFromClient]
  );

  if (!output || chorusCount < 1) return null;

  const h = 72;
  const pad = 10;
  const innerW = Math.max(1, width - pad * 2);
  const step = chorusCount > 1 ? innerW / (chorusCount - 1) : 0;
  const pts = displayTensions.map((t, i) => {
    const x = pad + (chorusCount === 1 ? innerW / 2 : i * step);
    const y = pad + (1 - t) * (h - pad * 2);
    return { x, y, t, i };
  });
  const lineD = pts.map((p) => `${p.x},${p.y}`).join(' ');

  const hook = output.hookIdentity;

  return (
    <div ref={wrapRef} className="mt-3 w-full max-w-3xl space-y-2">
      <svg
        ref={svgRef}
        className="block w-full touch-none select-none text-zinc-500"
        width={width}
        height={h}
        viewBox={`0 0 ${width} ${h}`}
        role="img"
        aria-label="Chorus tension arc"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          points={lineD}
        />
        {pts.map((p) => (
          <circle
            key={`t-node-${p.i}`}
            cx={p.x}
            cy={p.y}
            r={8}
            className={`${tensionNodeFill(p.t)} ${locked[p.i] ? 'cursor-not-allowed opacity-40' : 'cursor-ns-resize'}`}
            stroke="rgb(24 24 27)"
            strokeWidth={1}
            onPointerDown={(e) => handlePointerDown(e, p.i)}
          />
        ))}
      </svg>

      <div className="flex w-full gap-1">
        {Array.from({ length: chorusCount }, (_, chorusIndex) => {
          const rec = hook?.recurrences.find((r) => r.chorusIndex === chorusIndex);
          const dot =
            chorusIndex === 0 ? (
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                title="Hook source"
                aria-label="Hook source"
              />
            ) : rec?.matchKind === 'exact' ? (
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                title="Exact hook return"
                aria-label="Exact hook return"
              />
            ) : rec?.matchKind === 'transposed' ? (
              <span
                className="inline-block h-2 w-2 rounded-full border-2 border-emerald-500 bg-transparent"
                title="Transposed hook return"
                aria-label="Transposed hook return"
              />
            ) : (
              <span className="inline-block h-2 w-2" aria-hidden />
            );
          return (
            <div
              key={`hook-${chorusIndex}`}
              className="flex flex-1 flex-col items-center justify-center"
            >
              {dot}
            </div>
          );
        })}
      </div>

      <div className="flex w-full gap-1">
        {Array.from({ length: chorusCount }, (_, chorusIndex) => (
          <div
            key={`blk-${chorusIndex}`}
            className="relative flex min-h-[3rem] flex-1 flex-col rounded border border-zinc-600 bg-zinc-900/60 px-1 py-2 text-center"
          >
            <button
              type="button"
              className="absolute right-1 top-1 rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              title={
                locked[chorusIndex]
                  ? 'Unlock chorus'
                  : 'Lock chorus (disable tension drag for this chorus)'
              }
              aria-label={locked[chorusIndex] ? 'Unlock chorus' : 'Lock chorus'}
              aria-pressed={locked[chorusIndex]}
              onClick={() => onToggleLock(chorusIndex)}
            >
              {locked[chorusIndex] ? (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              ) : (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
              )}
            </button>
            <span className="mt-4 text-xs font-semibold text-zinc-200">C{chorusIndex + 1}</span>
          </div>
        ))}
      </div>

      <div className="flex w-full gap-1">
        {Array.from({ length: chorusCount }, (_, chorusIndex) => (
          <div key={`glyph-${chorusIndex}`} className="flex-1">
            <ContourGlyph
              contour={dominantContour(output.phraseContours, chorusIndex, barsPerChorus)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
