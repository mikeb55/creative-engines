/**
 * V31 — Clave grid overlay: thin slice types + stub preset registry (validated `presetRef`).
 */

import type { BarMeterMap } from './barMeterTypes';

export type ClaveGridFamily = 'son' | 'rumba' | 'afro_6_8';

/** Son/rumba use clave directions; afro 6/8 uses grid marker `6-8` from Cuban preset catalogue. */
export type ClaveGridDirection = '3-2' | '2-3' | '6-8';

export interface ClaveGridStubEntry {
  cubanPresetId: string;
  claveFamily: ClaveGridFamily;
  claveDirection: ClaveGridDirection;
}

/** Stub registry — `presetRef` must be one of these keys (not a free string). */
export const CLAVE_GRID_STUB_REGISTRY = {
  son_basic: {
    cubanPresetId: 'son-clave-3-2',
    claveFamily: 'son',
    claveDirection: '3-2',
  },
  rumba_basic: {
    cubanPresetId: 'rumba-clave-3-2',
    claveFamily: 'rumba',
    claveDirection: '3-2',
  },
  afro_6_8_basic: {
    cubanPresetId: 'afro-6-8',
    claveFamily: 'afro_6_8',
    claveDirection: '6-8',
  },
} as const satisfies Record<string, ClaveGridStubEntry>;

export type ClaveGridPresetRef = keyof typeof CLAVE_GRID_STUB_REGISTRY;

export interface ClaveGridSpec {
  presetRef: ClaveGridPresetRef;
  claveFamily: ClaveGridFamily;
  claveDirection: ClaveGridDirection;
  /** Structural hint only (default 4); echoed in receipts. */
  claveCycleBars?: number;
  /** 0–1 groove phase hint → phrase displacement. */
  phase?: number;
  /** 0–1 prefer sustained harmonic rhythm vs chop (sustain vs attack density). */
  harmonicRhythmBias?: number;
  /** 0–1 syncopation influence on offbeats / displacement. */
  syncopationWeight?: number;
  /** Optional diagnostic echo only — overlay does not merge into score context in v1. */
  barMeterMap?: BarMeterMap;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function isPresetRefKey(s: string): s is ClaveGridPresetRef {
  return Object.prototype.hasOwnProperty.call(CLAVE_GRID_STUB_REGISTRY, s);
}

export function validateClaveGridSpec(
  raw: unknown
): { ok: true; spec: ClaveGridSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: ['claveGridOverlay must be an object'] };
  }
  const o = raw as Record<string, unknown>;
  const presetRef = o.presetRef;
  if (typeof presetRef !== 'string' || !isPresetRefKey(presetRef)) {
    errors.push(`presetRef must be one of: ${Object.keys(CLAVE_GRID_STUB_REGISTRY).join(', ')}`);
  }
  const stub = typeof presetRef === 'string' && isPresetRefKey(presetRef) ? CLAVE_GRID_STUB_REGISTRY[presetRef] : undefined;

  const fam = o.claveFamily;
  if (fam !== 'son' && fam !== 'rumba' && fam !== 'afro_6_8') {
    errors.push('claveFamily must be son | rumba | afro_6_8');
  }
  const dir = o.claveDirection;
  if (dir !== '3-2' && dir !== '2-3' && dir !== '6-8') {
    errors.push('claveDirection must be 3-2 | 2-3 | 6-8');
  }

  if (stub) {
    if (fam !== stub.claveFamily) {
      errors.push(`claveFamily must match presetRef "${presetRef}" (${stub.claveFamily})`);
    }
    if (dir !== stub.claveDirection) {
      errors.push(`claveDirection must match presetRef "${presetRef}" (${stub.claveDirection})`);
    }
  }

  let claveCycleBars: number | undefined;
  if (o.claveCycleBars !== undefined) {
    if (typeof o.claveCycleBars !== 'number' || !Number.isFinite(o.claveCycleBars) || o.claveCycleBars < 1) {
      errors.push('claveCycleBars must be a positive finite number when set');
    } else {
      claveCycleBars = Math.floor(o.claveCycleBars);
    }
  }

  let phase: number | undefined;
  if (o.phase !== undefined) {
    const p = Number(o.phase);
    if (!Number.isFinite(p)) {
      errors.push('phase must be finite when set');
    } else {
      phase = clamp01(p);
    }
  }

  let harmonicRhythmBias: number | undefined;
  if (o.harmonicRhythmBias !== undefined) {
    const h = Number(o.harmonicRhythmBias);
    if (!Number.isFinite(h)) {
      errors.push('harmonicRhythmBias must be finite when set');
    } else {
      harmonicRhythmBias = clamp01(h);
    }
  }

  let syncopationWeight: number | undefined;
  if (o.syncopationWeight !== undefined) {
    const s = Number(o.syncopationWeight);
    if (!Number.isFinite(s)) {
      errors.push('syncopationWeight must be finite when set');
    } else {
      syncopationWeight = clamp01(s);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const spec: ClaveGridSpec = {
    presetRef: presetRef as ClaveGridPresetRef,
    claveFamily: fam as ClaveGridFamily,
    claveDirection: dir as ClaveGridDirection,
    ...(claveCycleBars !== undefined ? { claveCycleBars } : {}),
    ...(phase !== undefined ? { phase } : {}),
    ...(harmonicRhythmBias !== undefined ? { harmonicRhythmBias } : {}),
    ...(syncopationWeight !== undefined ? { syncopationWeight } : {}),
    ...(o.barMeterMap !== undefined && o.barMeterMap !== null && typeof o.barMeterMap === 'object'
      ? { barMeterMap: o.barMeterMap as BarMeterMap }
      : {}),
  };

  return { ok: true, spec };
}
