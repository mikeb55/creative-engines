/**
 * V80a - mixed-preset assembly types.
 */

import type { ScoreModel, PartModel } from './scoreModelTypes';

export type MosaicPresetRole = 'duo' | 'big_band' | 'string_quartet';

export type PartDescriptor = Omit<PartModel, 'measures'>;

export interface SectionSlice {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  presetRole: MosaicPresetRole;
  activePartIds: string[];
}

export interface LatePassPermissions {
  mosaicInject?: boolean;
  bbInject?: boolean;
  sqContrapuntal?: boolean;
  melodyBassFormat?: boolean;
  leadSheetFormat?: boolean;
}

export interface SectionRealizationResult {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  presetRole: MosaicPresetRole;
  partSet: PartDescriptor[];
  scoreFragment: ScoreModel;
  harmonyBars: string[];
  activePartIds: string[];
  latePassPermissions: LatePassPermissions;
}

export interface AssembledScoreModel {
  score: ScoreModel;
  assemblyPlan: SectionSlice[];
  globalPartRegistry: PartDescriptor[];
  sectionOwnership: Record<number, string>;
}

export function defaultLatePassPermissions(role: MosaicPresetRole): LatePassPermissions {
  switch (role) {
    case 'duo':
      return { mosaicInject: true, melodyBassFormat: true, leadSheetFormat: true };
    case 'big_band':
      return { bbInject: true };
    case 'string_quartet':
      return { sqContrapuntal: true };
    default:
      return {};
  }
}

export function partToDescriptor(part: PartModel): PartDescriptor {
  const { measures: _measures, ...desc } = part;
  return desc;
}
