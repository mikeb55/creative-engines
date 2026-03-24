/**
 * Composer OS V2 — Section role types
 */

export type SectionRole = 'statement' | 'development' | 'contrast' | 'return';

export interface SectionRoleMetadata {
  role: SectionRole;
  densityTendency: 'sparse' | 'medium' | 'dense';
  registerTendency: 'low' | 'centre' | 'lift' | 'high';
  rhythmActivity: 'low' | 'medium' | 'high';
  textureTendency: 'melodic' | 'mixed' | 'chordal';
}

export interface SectionWithRole {
  label: string;
  startBar: number;
  length: number;
  role: SectionRole;
  metadata: SectionRoleMetadata;
}
