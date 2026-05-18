/**
 * VRB stylistic families for same-family boundary swing ramps.
 */

import { parseBlendedVrbComponentIds } from './blendedVrb';
import { dominantVrb, type SectionVrbContext } from './vrbContextMap';

export type VrbFamily =
  | 'tintinnabuli'
  | 'impressionist'
  | 'jazz'
  | 'cinematic'
  | 'modernist'
  | 'minimal';

export const VRB_FAMILIES: Record<VrbFamily, readonly string[]> = {
  tintinnabuli: ['arvo_part'],
  impressionist: ['debussy', 'ravel', 'satie', 'rota'],
  jazz: ['gershwin', 'cole_porter', 'joni_mitchell'],
  cinematic: [
    'badalamenti',
    'morricone',
    'goldsmith',
    'williams',
    'zimmer',
    'herrmann',
  ],
  modernist: ['shostakovich', 'bartok', 'ligeti', 'webern'],
  minimal: ['glass'],
};

const VRB_ID_TO_FAMILY = new Map<string, VrbFamily>();
for (const [family, ids] of Object.entries(VRB_FAMILIES) as [VrbFamily, readonly string[]][]) {
  for (const id of ids) {
    VRB_ID_TO_FAMILY.set(id.trim().toLowerCase(), family);
  }
}

export function blendedComponentIds(vrbId: string): string[] {
  const parsed = parseBlendedVrbComponentIds(vrbId.trim().toLowerCase());
  if (parsed && parsed.length > 0) return parsed;
  return [vrbId.trim().toLowerCase()];
}

export function dominantComponentId(vrbId: string, sectionCtx?: SectionVrbContext): string {
  const trimmed = vrbId.trim().toLowerCase();
  if (sectionCtx && sectionCtx.vrbs.length > 0) {
    return dominantVrb(sectionCtx);
  }
  const comps = blendedComponentIds(trimmed);
  return comps[0] ?? trimmed;
}

export function getVrbFamily(vrbId: string): VrbFamily | null {
  const id = dominantComponentId(vrbId);
  return VRB_ID_TO_FAMILY.get(id) ?? null;
}

export function isSameFamily(a: string, b: string): boolean {
  const fa = getVrbFamily(a);
  const fb = getVrbFamily(b);
  return fa !== null && fa === fb;
}
