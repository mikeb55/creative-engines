/**
 * Page / Led Zeppelin FX + bow markers (metadata only — no MIDI).
 */

import type { RiffProfile } from '../composer/riffProfileTypes';
import type { FxMarker, FxMarkerRole, FxMarkerTrack, FxMarkerType } from './riffMultiVoiceTypes';

function roleFromReceiptId(id: string): FxMarkerRole {
  if (/cadential|reset|exit/.test(id)) return 'cadentialReset';
  if (/bridge|transition|jam/.test(id)) return 'textureBridge';
  return 'sectionBoundary';
}

function typeFromReceiptId(id: string): FxMarkerType {
  if (id.startsWith('page_bow_')) return 'bow';
  if (/reverse_echo|reverse/.test(id)) return 'reverseEcho';
  return 'theremin';
}

/**
 * Build FX marker track from compiled bow / fx policies (Led Zeppelin research receipts).
 */
export function buildFxMarkerTrack(profile: RiffProfile | undefined): FxMarkerTrack | undefined {
  const markers: FxMarker[] = [];
  for (const ev of profile?.bowEventPolicy?.events ?? []) {
    markers.push({
      bar: 0,
      type: 'bow',
      role: roleFromReceiptId(ev.receiptId),
      receiptId: ev.receiptId,
      metadataOnly: true,
    });
  }
  for (const m of profile?.fxMarkerPolicy?.markers ?? []) {
    markers.push({
      bar: 0,
      type: typeFromReceiptId(m.receiptId),
      role: roleFromReceiptId(m.receiptId),
      receiptId: m.receiptId,
      metadataOnly: true,
    });
  }
  if (!markers.length) return undefined;
  markers.forEach((m, i) => {
    m.bar = Math.min(i, 3);
  });
  return markers;
}
