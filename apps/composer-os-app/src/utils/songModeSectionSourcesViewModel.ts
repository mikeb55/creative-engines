type SongModeSectionRoleUi = 'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO';

type SongModeSectionBehaviourDescriptorUi = {
  sliceId: string;
  densityBiasByRole?: Partial<Record<SongModeSectionRoleUi, number>>;
  registerBiasByRole?: Partial<Record<SongModeSectionRoleUi, number>>;
  harmonicColourBiasByRole?: Partial<Record<SongModeSectionRoleUi, number>>;
  returnVariationType?: string;
};

export type SongModeSectionSourceRow = {
  role: SongModeSectionRoleUi;
  sectionLabel: string;
  sources: string[];
  tags: string[];
};

const ROLE_ORDER: SongModeSectionRoleUi[] = ['OPENING', 'BRIDGE_LIFT', 'RETURN', 'OUTRO', 'WHOLE'];

const ROLE_LABELS: Record<SongModeSectionRoleUi, string> = {
  OPENING: 'A / Opening',
  BRIDGE_LIFT: 'B / Bridge Lift',
  RETURN: 'A Return',
  OUTRO: 'Outro',
  WHOLE: 'Whole Form',
};

export function buildSongModeSectionSourceRows(
  descriptors: SongModeSectionBehaviourDescriptorUi[] | undefined
): SongModeSectionSourceRow[] {
  const d = descriptors ?? [];
  return ROLE_ORDER.map((role) => {
    const roleDescriptors = d.filter((descriptor) => {
      const hasDensity = typeof descriptor.densityBiasByRole?.[role] === 'number';
      const hasColour = typeof descriptor.harmonicColourBiasByRole?.[role] === 'number';
      const hasRegister = typeof descriptor.registerBiasByRole?.[role] === 'number';
      const hasReturnVariation = role === 'RETURN' && typeof descriptor.returnVariationType === 'string';
      return hasDensity || hasColour || hasRegister || hasReturnVariation;
    });
    if (roleDescriptors.length === 0) return null;
    const tags = new Set<string>();
    for (const descriptor of roleDescriptors) {
      if (typeof descriptor.densityBiasByRole?.[role] === 'number') tags.add('density_bias');
      if (typeof descriptor.harmonicColourBiasByRole?.[role] === 'number') tags.add('colour_bias');
      if (typeof descriptor.registerBiasByRole?.[role] === 'number') tags.add('register_bias');
      if (role === 'RETURN' && descriptor.returnVariationType) {
        tags.add(`return_variation:${descriptor.returnVariationType}`);
      }
    }
    return {
      role,
      sectionLabel: ROLE_LABELS[role],
      sources: roleDescriptors.map((descriptor) => descriptor.sliceId),
      tags: [...tags],
    };
  }).filter((row): row is SongModeSectionSourceRow => row != null);
}
