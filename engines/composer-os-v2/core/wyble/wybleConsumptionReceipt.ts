/**
 * Portable Wyble — non-musical receipt for which layout hooks fired on a run (debug / manifests).
 * Does not alter pitches; builders only describe inputs vs static maps.
 */

import type { EnsembleWybleRoleMap } from './wybleVoiceLayoutTypes';
import {
  WYBLE_ROLE_MAP_BIG_BAND,
  WYBLE_ROLE_MAP_DUO_FAMILY,
  WYBLE_ROLE_MAP_STRING_QUARTET,
} from './ensembleWybleRoleMaps';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

export type WybleConsumptionMode =
  | 'none'
  | 'quartet_inner_swap'
  | 'big_band_sax_split'
  | 'duo_bass_anchor_nudge';

export interface WybleConsumptionReceipt {
  wybleLayoutPresent: boolean;
  wybleLayoutConsumed: boolean;
  wybleConsumptionMode: WybleConsumptionMode;
  /** One-line human summary for logs / manifests. */
  wybleConsumptionSummary: string;
}

function mapsMatchStringQuartet(layout: EnsembleWybleRoleMap): boolean {
  const m = WYBLE_ROLE_MAP_STRING_QUARTET;
  return (
    layout.lead_line.partId === m.lead_line.partId &&
    layout.inner_counter.partId === m.inner_counter.partId &&
    layout.bass_anchor.partId === m.bass_anchor.partId
  );
}

function mapsMatchBigBand(layout: EnsembleWybleRoleMap): boolean {
  const m = WYBLE_ROLE_MAP_BIG_BAND;
  return (
    layout.lead_line.partId === m.lead_line.partId &&
    layout.inner_counter.partId === m.inner_counter.partId &&
    layout.bass_anchor.partId === m.bass_anchor.partId
  );
}

function mapsMatchDuoFamily(layout: EnsembleWybleRoleMap): boolean {
  const m = WYBLE_ROLE_MAP_DUO_FAMILY;
  return (
    layout.lead_line.partId === m.lead_line.partId &&
    (layout.lead_line.voice ?? 1) === (m.lead_line.voice ?? 1) &&
    layout.inner_counter.partId === m.inner_counter.partId &&
    (layout.inner_counter.voice ?? 2) === (m.inner_counter.voice ?? 2) &&
    layout.bass_anchor.partId === m.bass_anchor.partId
  );
}

export function wybleConsumptionReceiptForQuartet(layout: EnsembleWybleRoleMap | undefined): WybleConsumptionReceipt {
  const present = layout !== undefined;
  const consumed = present && mapsMatchStringQuartet(layout!);
  return {
    wybleLayoutPresent: present,
    wybleLayoutConsumed: consumed,
    wybleConsumptionMode: consumed ? 'quartet_inner_swap' : 'none',
    wybleConsumptionSummary: consumed
      ? 'String quartet: Wyble SQ map consumed (violin II / viola chord-tone swap).'
      : present
      ? 'String quartet: wybleVoiceLayout present but not the static SQ map (no swap).'
      : 'String quartet: wybleVoiceLayout not passed into score build.',
  };
}

export function wybleConsumptionReceiptForBigBand(layout: EnsembleWybleRoleMap | undefined): WybleConsumptionReceipt {
  const present = layout !== undefined;
  const consumed = present && mapsMatchBigBand(layout!);
  return {
    wybleLayoutPresent: present,
    wybleLayoutConsumed: consumed,
    wybleConsumptionMode: consumed ? 'big_band_sax_split' : 'none',
    wybleConsumptionSummary: consumed
      ? 'Big band: Wyble BB map consumed (alto lead vs tenor inner sax separation).'
      : present
      ? 'Big band: wybleVoiceLayout present but not the static BB map (no sax split).'
      : 'Big band: wybleVoiceLayout not passed into score build.',
  };
}

export function wybleConsumptionReceiptForDuoFamily(
  presetId: string | undefined,
  layout: EnsembleWybleRoleMap | undefined
): WybleConsumptionReceipt {
  const present = layout !== undefined;
  const consumed = isGuitarBassDuoFamily(presetId) && present && mapsMatchDuoFamily(layout!);
  return {
    wybleLayoutPresent: present,
    wybleLayoutConsumed: consumed,
    wybleConsumptionMode: consumed ? 'duo_bass_anchor_nudge' : 'none',
    wybleConsumptionSummary: consumed
      ? 'Duo family: Wyble duo map consumed (bar 1 bass anchor chromatic nudge).'
      : present && isGuitarBassDuoFamily(presetId)
      ? 'Duo family: wybleVoiceLayout present but not the static duo-family map (no nudge).'
      : present
      ? 'Duo family: wybleVoiceLayout present on a non-duo-family preset (ignored).'
      : 'Duo family: wybleVoiceLayout not on generation metadata.',
  };
}
