'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, Ref, RefObject } from 'react';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (ref == null) return;
  if (typeof ref === 'function') {
    ref(value);
  } else {
    (ref as MutableRefObject<T | null>).current = value;
  }
}

export type NoteLayer = 0 | 1 | 2 | 3;

export type FretboardNote = {
  stringIndex: number;
  fret: number;
  role:
    | 'triadRoot'
    | 'triadThird'
    | 'triadFifth'
    | 'primaryTension'
    | 'secondaryTension'
    | 'triadPairTension'
    | 'bebopPassing'
    | 'chaos';
  isActive?: boolean;
  /** When `showBeatLegality` is on, drives marker shape/fill (defaults to strong). */
  beatLegality?: 'strong' | 'weak' | 'syncopated' | 'approachOnly';
  /** Short text drawn inside the dot. Empty when omitted. */
  label?: string;
};

export type FretboardCell = {
  stringIndex: number;
  fret: number;
};

export type FretboardPanelProps = {
  tuning?: string[];
  frets?: { from: number; to: number };
  notes: FretboardNote[];
  className?: string;
  /** Which harmonic layers to show (defaults to all four). */
  activeLayers?: NoteLayer[];
  /** When true, vary marker appearance by `beatLegality` on each note. */
  showBeatLegality?: boolean;
  onNoteClick?: (note: FretboardNote) => void;
  /** Fires for any fret the board reports, including a fret with no dot. */
  onFretClick?: (cell: FretboardCell) => void;
  /** Current beat index during playback (0-based). Undefined = no playback overlay. */
  playbackBeat?: number;
  /** Notes currently sounding — always drawn on top with glow; ignores `activeLayers`. */
  playbackNotes?: FretboardNote[];
  /** Recently played notes — dimmed trail layer under active dots. */
  trailNotes?: FretboardNote[];
  /** When true, show a lock marker and disable fretboard auto-crop (stable viewport). */
  positionLock?: boolean;
  /** Attach to the outer fretboard container for PNG export (`exportFretboardToPng`). */
  exportRef?: RefObject<HTMLDivElement>;
  /** Dark fretboard chrome (#1a1a2e background; string/fret lines #8888aa). Role dot colours unchanged. */
  darkMode?: boolean;
  /** Root stays a filled circle. Other scale tones become squares. */
  scaleMarkerShapes?: boolean;
};

const DEFAULT_TUNING: string[] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const DEFAULT_FRETS = { from: 0, to: 12 } as const;
const ALL_LAYERS: NoteLayer[] = [0, 1, 2, 3];

const ROLE_COLORS: Record<FretboardNote['role'], string> = {
  triadRoot: '#22c55e',
  triadThird: '#16a34a',
  triadFifth: '#4ade80',
  primaryTension: '#f59e0b',
  secondaryTension: '#f97316',
  triadPairTension: '#ef4444',
  bebopPassing: '#8b5cf6',
  chaos: '#ec4899',
};

function toLibraryString(stringIndex: number): number {
  return 6 - stringIndex;
}

function noteKey(n: Pick<FretboardNote, 'stringIndex' | 'fret'>): string {
  return `${n.stringIndex}:${n.fret}`;
}

function inNoteRange(
  n: FretboardNote,
  tuningLen: number,
  rangeFrom: number,
  rangeTo: number
): boolean {
  return (
    n.stringIndex >= 0 && n.stringIndex < tuningLen && n.fret >= rangeFrom && n.fret <= rangeTo
  );
}

/** Same semantics as `@moonwave99/fretboard.js` getBounds (not exported from package root). */
function boundsFromPositions(positions: { string: number; fret: number }[]): {
  bottomLeft: { string: number; fret: number };
  bottomRight: { string: number; fret: number };
  topRight: { string: number; fret: number };
  topLeft: { string: number; fret: number };
} {
  const getMinMax = (what: 'string' | 'fret'): [number, number] => [
    Math.min(...positions.map((x) => x[what])),
    Math.max(...positions.map((x) => x[what])),
  ];
  const [minString, maxString] = getMinMax('string');
  const [minFret, maxFret] = getMinMax('fret');
  return {
    bottomLeft: { string: maxString, fret: minFret },
    bottomRight: { string: maxString, fret: maxFret },
    topRight: { string: minString, fret: maxFret },
    topLeft: { string: minString, fret: minFret },
  };
}

export function roleToLayer(role: FretboardNote['role']): NoteLayer {
  switch (role) {
    case 'triadRoot':
    case 'triadThird':
    case 'triadFifth':
      return 0;
    case 'primaryTension':
      return 1;
    case 'secondaryTension':
    case 'triadPairTension':
      return 2;
    case 'bebopPassing':
    case 'chaos':
      return 3;
    default:
      return 0;
  }
}

type DotDatum = {
  string: number;
  fret: number;
  role: FretboardNote['role'];
  disabled?: boolean;
  beatLegality?: 'strong' | 'weak' | 'syncopated' | 'approachOnly';
  trail?: boolean;
  playback?: boolean;
  label?: string;
};

type FretboardApi = import('@moonwave99/fretboard.js').Fretboard;

const DARK_BG = '#1a1a2e';
const DARK_LINE = '#8888aa';

export function FretboardPanel({
  tuning = DEFAULT_TUNING,
  frets,
  notes,
  className,
  activeLayers = ALL_LAYERS,
  showBeatLegality = false,
  onNoteClick,
  onFretClick,
  playbackBeat,
  playbackNotes,
  trailNotes,
  positionLock = false,
  exportRef,
  darkMode = false,
  scaleMarkerShapes = false,
}: FretboardPanelProps) {
  const boardMountRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<{ removeEventListeners: () => unknown } | null>(null);
  const fretboardApiRef = useRef<FretboardApi | null>(null);

  const setExportContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      assignRef(exportRef, node);
    },
    [exportRef]
  );

  const rangeFrom = frets?.from ?? DEFAULT_FRETS.from;
  const rangeTo = frets?.to ?? DEFAULT_FRETS.to;

  const visibleNotes = useMemo(() => {
    const layerSet = new Set(activeLayers);
    return notes.filter((n) => {
      if (!layerSet.has(roleToLayer(n.role))) return false;
      return inNoteRange(n, tuning.length, rangeFrom, rangeTo);
    });
  }, [notes, activeLayers, tuning.length, rangeFrom, rangeTo]);

  const mergedDots = useMemo(() => {
    const pb = playbackNotes ?? [];
    const tr = trailNotes ?? [];
    const pbKeys = new Set(pb.map(noteKey));
    const out: DotDatum[] = [];

    for (const n of tr) {
      if (!inNoteRange(n, tuning.length, rangeFrom, rangeTo)) continue;
      out.push({
        string: toLibraryString(n.stringIndex),
        fret: n.fret,
        role: n.role,
        trail: true,
      });
    }
    for (const n of visibleNotes) {
      if (pbKeys.has(noteKey(n))) continue;
      out.push({
        string: toLibraryString(n.stringIndex),
        fret: n.fret,
        role: n.role,
        disabled: n.isActive === false,
        ...(n.label ? { label: n.label } : {}),
        ...(showBeatLegality ? { beatLegality: n.beatLegality ?? 'strong' } : {}),
      });
    }
    for (const n of pb) {
      if (!inNoteRange(n, tuning.length, rangeFrom, rangeTo)) continue;
      out.push({
        string: toLibraryString(n.stringIndex),
        fret: n.fret,
        role: n.role,
        playback: true,
      });
    }
    return out;
  }, [visibleNotes, playbackNotes, trailNotes, tuning.length, rangeFrom, rangeTo, showBeatLegality]);

  useEffect(() => {
    const el = boardMountRef.current;
    if (!el) return;

    let cancelled = false;
    el.innerHTML = '';
    boardRef.current = null;
    fretboardApiRef.current = null;

    void (async () => {
      const { Fretboard } = await import('@moonwave99/fretboard.js');
      if (cancelled || !boardMountRef.current) return;

      const board = new Fretboard({
        el: boardMountRef.current,
        tuning,
        stringCount: tuning.length,
        fretCount: rangeTo,
        width: 960,
        height: 320,
        ...(positionLock ? { crop: false } : {}),
        ...(darkMode
          ? {
              stringColor: DARK_LINE,
              fretColor: DARK_LINE,
              nutColor: DARK_LINE,
              middleFretColor: DARK_LINE,
              fretNumbersColor: DARK_LINE,
              dotStrokeColor: DARK_LINE,
            }
          : {}),
      });
      if (cancelled) return;
      boardRef.current = board;
      fretboardApiRef.current = board;

      const dots: DotDatum[] = mergedDots.map((d) => ({ ...d }));

      board.setDots(dots as import('@moonwave99/fretboard.js').Position[]).render();

      const svgResponsive = boardMountRef.current?.querySelector('.fretboard-html-wrapper svg');
      if (svgResponsive instanceof SVGSVGElement) {
        svgResponsive.style.width = '100%';
        svgResponsive.style.height = 'auto';
        svgResponsive.style.maxHeight = '100%';
        svgResponsive.style.display = 'block';
      }

      (Object.keys(ROLE_COLORS) as FretboardNote['role'][]).forEach((role) => {
        board.style({ filter: { role }, fill: ROLE_COLORS[role] });
      });

      if (dots.some((dot) => dot.label)) {
        board.style({
          filter: (datum: DotDatum) => Boolean(datum.label),
          text: (datum: DotDatum) => datum.label ?? '',
          fontSize: 11,
          fontFill: '#111111',
        });
      }

      board.style({
        filter: (d: DotDatum) => d.trail === true,
        opacity: 0.3,
      });

      board.style({
        filter: (d: DotDatum) => d.playback === true,
        opacity: 1,
        stroke: '#fef9c3',
        'stroke-width': 5,
      });

      if (showBeatLegality) {
        board.style({
          filter: (d: DotDatum) =>
            !d.playback && !d.trail && d.beatLegality === 'weak',
          opacity: 0.5,
        });
        board.style({
          filter: (d: DotDatum) =>
            !d.playback && !d.trail && d.beatLegality === 'syncopated',
          'stroke-dasharray': '5 4',
          stroke: (d: DotDatum) => ROLE_COLORS[d.role],
        });
        board.style({
          filter: (d: DotDatum) =>
            !d.playback && !d.trail && d.beatLegality === 'approachOnly',
          fill: 'none',
          stroke: (d: DotDatum) => ROLE_COLORS[d.role],
        });
      }

      if (scaleMarkerShapes && boardMountRef.current) {
        const ns = 'http://www.w3.org/2000/svg';
        boardMountRef.current.querySelectorAll('.dot-role-primaryTension').forEach((node) => {
          const circle = node.querySelector('circle');
          if (!(circle instanceof SVGCircleElement)) return;
          const radius = Number(circle.getAttribute('r')) || 8;
          const rect = document.createElementNS(ns, 'rect');
          rect.setAttribute('class', 'dot-square');
          rect.setAttribute('x', circle.getAttribute('cx') ?? '0');
          rect.setAttribute('y', circle.getAttribute('cy') ?? '0');
          rect.setAttribute('width', String(radius * 2));
          rect.setAttribute('height', String(radius * 2));
          rect.setAttribute('transform', `translate(${-radius}, ${-radius})`);
          rect.setAttribute('fill', circle.getAttribute('fill') || ROLE_COLORS.primaryTension);
          rect.setAttribute('stroke', circle.getAttribute('stroke') || '#111');
          rect.setAttribute('stroke-width', circle.getAttribute('stroke-width') || '1');
          circle.replaceWith(rect);
          if (node instanceof SVGElement) node.setAttribute('aria-label', 'Scale tone');
        });
        boardMountRef.current.querySelectorAll('.dot-role-triadRoot').forEach((node) => {
          if (node instanceof SVGElement) node.setAttribute('aria-label', 'Root');
        });
      }

      if (onNoteClick || onFretClick) {
        const svgWrap = boardMountRef.current.querySelector('.fretboard-html-wrapper');
        if (svgWrap instanceof HTMLElement) {
          svgWrap.style.cursor = 'pointer';
        }
        const clickPool = [...visibleNotes, ...(playbackNotes ?? [])];
        const poolKeys = new Map<string, FretboardNote>();
        for (const n of clickPool) {
          const k = noteKey(n);
          if (!poolKeys.has(k)) poolKeys.set(k, n);
        }
        board.on('click', (pos) => {
          const libString = pos.string;
          const fret = pos.fret;
          if (libString == null || fret == null) return;
          const stringIndex = 6 - libString;
          if (
            onFretClick &&
            stringIndex >= 0 &&
            stringIndex < tuning.length &&
            fret >= rangeFrom &&
            fret <= rangeTo
          ) {
            onFretClick({ stringIndex, fret });
          }
          if (!onNoteClick) return;
          const hit = poolKeys.get(`${stringIndex}:${fret}`);
          if (hit) onNoteClick(hit);
        });
      }
    })();

    return () => {
      cancelled = true;
      boardRef.current?.removeEventListeners();
      boardRef.current = null;
      fretboardApiRef.current = null;
      if (boardMountRef.current) {
        boardMountRef.current.innerHTML = '';
      }
    };
  }, [
    tuning,
    rangeFrom,
    rangeTo,
    mergedDots,
    showBeatLegality,
    onNoteClick,
    onFretClick,
    playbackNotes,
    visibleNotes,
    positionLock,
    darkMode,
    scaleMarkerShapes,
  ]);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    let tries = 0;

    const paintBand = () => {
      if (cancelled) return;
      tries += 1;
      if (tries > 240) return;

      const board = fretboardApiRef.current;
      const mount = boardMountRef.current;
      if (!board || !mount) {
        raf = requestAnimationFrame(paintBand);
        return;
      }

      const wrapper = mount.querySelector('.fretboard-wrapper');
      if (!wrapper) {
        raf = requestAnimationFrame(paintBand);
        return;
      }

      wrapper.querySelector('.co-playback-position-band')?.remove();

      if (playbackBeat === undefined || !(playbackNotes?.length ?? 0)) {
        return;
      }

      const pbIn = (playbackNotes ?? []).filter((n) =>
        inNoteRange(n, tuning.length, rangeFrom, rangeTo)
      );
      if (!pbIn.length) return;

      const libPositions = pbIn.map((n) => ({
        string: toLibraryString(n.stringIndex),
        fret: n.fret,
      }));

      const bounds = boundsFromPositions(libPositions);
      const dotOffset = (board as unknown as { getDotOffset(): number }).getDotOffset();
      const positions = board.positions as { x: number; y: number }[][];
      const opts = board.options as {
        width: number;
        dotSize: number;
        highlightPadding: number;
        highlightRadius: number;
      };
      const boardWidth = opts.width ?? 960;
      const dotSize = opts.dotSize ?? 15;
      const highlightPadding = opts.highlightPadding ?? 7.5;
      const highlightRadius = opts.highlightRadius ?? 7.5;

      const dotPercentSize = (dotSize / boardWidth) * 100;
      const highlightPaddingPercentSize = (highlightPadding / boardWidth) * 100;

      const { topLeft, topRight, bottomLeft } = bounds;
      const fi = (fret: number) => Math.max(0, fret - dotOffset);

      const cxLeft = positions[topLeft.string - 1][fi(topLeft.fret)].x;
      const cxRight = positions[topRight.string - 1][fi(topRight.fret)].x;
      const xAttr = `${cxLeft - dotPercentSize / 2 - highlightPaddingPercentSize}%`;
      const widthAttr = `${cxRight - cxLeft + dotPercentSize + 2 * highlightPaddingPercentSize}%`;

      const yTop = positions[topLeft.string - 1][fi(topLeft.fret)].y;
      const yBot = positions[bottomLeft.string - 1][fi(bottomLeft.fret)].y;
      const heightPx = yBot - yTop + dotSize + 2 * highlightPadding;

      const ns = 'http://www.w3.org/2000/svg';
      const group = document.createElementNS(ns, 'g');
      group.setAttribute('class', 'co-playback-position-band');
      group.setAttribute(
        'style',
        'pointer-events: none; transition: opacity 0.35s ease; mix-blend-mode: multiply;'
      );

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('class', 'co-playback-band-rect');
      rect.setAttribute('x', xAttr);
      rect.setAttribute('width', widthAttr);
      rect.setAttribute('y', String(yTop - dotSize * 0.5 - highlightPadding));
      rect.setAttribute('height', String(heightPx));
      rect.setAttribute('rx', String(highlightRadius));
      rect.setAttribute('fill', 'rgba(59, 130, 246, 0.14)');
      rect.setAttribute('stroke', 'rgba(59, 130, 246, 0.35)');
      rect.setAttribute('stroke-width', '1');
      rect.style.opacity = '0';
      group.appendChild(rect);
      wrapper.appendChild(group);

      requestAnimationFrame(() => {
        if (cancelled) return;
        rect.style.transition = 'opacity 0.35s ease';
        rect.style.opacity = '1';
      });
    };

    raf = requestAnimationFrame(paintBand);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      boardMountRef.current?.querySelector('.co-playback-position-band')?.remove();
    };
  }, [
    playbackBeat,
    playbackNotes,
    tuning.length,
    rangeFrom,
    rangeTo,
    mergedDots,
    positionLock,
  ]);

  return (
    <div
      ref={setExportContainerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        minHeight: 120,
        backgroundColor: darkMode ? DARK_BG : undefined,
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={boardMountRef}
        style={{ width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}
      />
      {positionLock ? (
        <div
          role="status"
          aria-label="Position locked"
          title="Position locked — viewport does not auto-shift"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: '1.1rem',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.45))',
          }}
        >
          🔒
        </div>
      ) : null}
    </div>
  );
}
