'use client';

import { useEffect, useMemo, useRef } from 'react';

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
};

export function FretboardPanel({
  tuning = DEFAULT_TUNING,
  frets,
  notes,
  className,
  activeLayers = ALL_LAYERS,
  showBeatLegality = false,
  onNoteClick,
}: FretboardPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<{ removeEventListeners: () => unknown } | null>(null);
  const rangeFrom = frets?.from ?? DEFAULT_FRETS.from;
  const rangeTo = frets?.to ?? DEFAULT_FRETS.to;

  const visibleNotes = useMemo(() => {
    const layerSet = new Set(activeLayers);
    return notes.filter((n) => {
      if (!layerSet.has(roleToLayer(n.role))) return false;
      return (
        n.stringIndex >= 0 &&
        n.stringIndex < tuning.length &&
        n.fret >= rangeFrom &&
        n.fret <= rangeTo
      );
    });
  }, [notes, activeLayers, tuning.length, rangeFrom, rangeTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    el.innerHTML = '';
    boardRef.current = null;

    void (async () => {
      const { Fretboard } = await import('@moonwave99/fretboard.js');
      if (cancelled || !containerRef.current) return;

      const board = new Fretboard({
        el: containerRef.current,
        tuning,
        stringCount: tuning.length,
        fretCount: rangeTo,
        width: 960,
        height: 320,
      });
      if (cancelled) return;
      boardRef.current = board;

      const dots: DotDatum[] = visibleNotes.map((n) => ({
        string: toLibraryString(n.stringIndex),
        fret: n.fret,
        role: n.role,
        disabled: n.isActive === false,
        ...(showBeatLegality ? { beatLegality: n.beatLegality ?? 'strong' } : {}),
      }));

      board.setDots(dots as import('@moonwave99/fretboard.js').Position[]).render();

      (Object.keys(ROLE_COLORS) as FretboardNote['role'][]).forEach((role) => {
        board.style({ filter: { role }, fill: ROLE_COLORS[role] });
      });

      if (showBeatLegality) {
        board.style({
          filter: (d: DotDatum) => d.beatLegality === 'weak',
          opacity: 0.5,
        });
        board.style({
          filter: (d: DotDatum) => d.beatLegality === 'syncopated',
          'stroke-dasharray': '5 4',
          stroke: (d: DotDatum) => ROLE_COLORS[d.role],
        });
        board.style({
          filter: (d: DotDatum) => d.beatLegality === 'approachOnly',
          fill: 'none',
          stroke: (d: DotDatum) => ROLE_COLORS[d.role],
        });
      }

      if (onNoteClick) {
        const svgWrap = containerRef.current.querySelector('.fretboard-html-wrapper');
        if (svgWrap instanceof HTMLElement) {
          svgWrap.style.cursor = 'pointer';
        }
        board.on('click', (pos) => {
          const libString = pos.string;
          const fret = pos.fret;
          if (libString == null || fret == null) return;
          const stringIndex = 6 - libString;
          const hit = visibleNotes.find((n) => n.stringIndex === stringIndex && n.fret === fret);
          if (hit) onNoteClick(hit);
        });
      }
    })();

    return () => {
      cancelled = true;
      boardRef.current?.removeEventListeners();
      boardRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tuning, rangeFrom, rangeTo, visibleNotes, showBeatLegality, onNoteClick]);

  return <div ref={containerRef} className={className} />;
}
