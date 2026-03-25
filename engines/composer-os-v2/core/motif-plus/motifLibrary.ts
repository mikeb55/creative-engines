/**
 * In-memory motif asset store (local session use).
 */

import type { MotifAsset } from './motifAssetTypes';

const store = new Map<string, MotifAsset>();

export function motifLibraryPut(asset: MotifAsset): void {
  store.set(asset.id, asset);
}

export function motifLibraryGet(id: string): MotifAsset | undefined {
  return store.get(id);
}

export function motifLibraryList(): MotifAsset[] {
  return [...store.values()];
}

export function motifLibraryClear(): void {
  store.clear();
}
