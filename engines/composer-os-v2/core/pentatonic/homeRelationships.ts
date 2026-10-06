/**
 * HOME relationship model.
 * Offsets transpose the HOME archetype. They are labels, not registry entries.
 * Negative offsets use modulo-12.
 */

export interface HomeRelationship {
  id: string;
  label: string;
  offset: number;
}

export const HOME_RELATIONSHIPS: readonly HomeRelationship[] = [
  { id: 'home', label: 'HOME', offset: 0 },
  { id: 'major', label: 'MAJOR', offset: -3 },
  { id: 'six_nine_suspended', label: '6/9 SUSPENDED', offset: 2 },
  { id: 'major_7_colour', label: 'MAJOR 7 COLOUR', offset: 4 },
  { id: 'suspended', label: 'SUSPENDED', offset: 7 },
];

export function homeRelationshipById(id: string): HomeRelationship | undefined {
  return HOME_RELATIONSHIPS.find((relationship) => relationship.id === id);
}
