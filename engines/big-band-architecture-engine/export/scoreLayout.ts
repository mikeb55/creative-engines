/**
 * Big Band Score Skeleton — Staff layout for MusicXML
 */

import type { StaffDefinition } from './scoreTypes';

export const BIG_BAND_STAFF_LAYOUT: StaffDefinition[] = [
  { id: 'P1', partId: 'P1', instrumentName: 'Alto Saxophone 1', group: 'saxes' },
  { id: 'P2', partId: 'P2', instrumentName: 'Alto Saxophone 2', group: 'saxes' },
  { id: 'P3', partId: 'P3', instrumentName: 'Tenor Saxophone 1', group: 'saxes' },
  { id: 'P4', partId: 'P4', instrumentName: 'Tenor Saxophone 2', group: 'saxes' },
  { id: 'P5', partId: 'P5', instrumentName: 'Baritone Saxophone', group: 'saxes' },
  { id: 'P6', partId: 'P6', instrumentName: 'Trumpet 1', group: 'trumpets' },
  { id: 'P7', partId: 'P7', instrumentName: 'Trumpet 2', group: 'trumpets' },
  { id: 'P8', partId: 'P8', instrumentName: 'Trumpet 3', group: 'trumpets' },
  { id: 'P9', partId: 'P9', instrumentName: 'Trumpet 4', group: 'trumpets' },
  { id: 'P10', partId: 'P10', instrumentName: 'Trombone 1', group: 'trombones' },
  { id: 'P11', partId: 'P11', instrumentName: 'Trombone 2', group: 'trombones' },
  { id: 'P12', partId: 'P12', instrumentName: 'Trombone 3', group: 'trombones' },
  { id: 'P13', partId: 'P13', instrumentName: 'Bass Trombone', group: 'trombones' },
  { id: 'P14', partId: 'P14', instrumentName: 'Piano', group: 'rhythm' },
  { id: 'P15', partId: 'P15', instrumentName: 'Guitar', group: 'rhythm' },
  { id: 'P16', partId: 'P16', instrumentName: 'Bass', group: 'rhythm' },
  { id: 'P17', partId: 'P17', instrumentName: 'Drums', group: 'rhythm' },
];

export const STAFF_COUNT = BIG_BAND_STAFF_LAYOUT.length;

export function getPartIds(): string[] {
  return BIG_BAND_STAFF_LAYOUT.map((s) => s.partId);
}

export function getGroupForSection(section: string): string {
  const s = section.toLowerCase();
  if (s.includes('sax') || s.includes('reed')) return 'saxes';
  if (s.includes('trumpet')) return 'trumpets';
  if (s.includes('trombone') || s.includes('brass')) return 'trombones';
  if (s.includes('rhythm') || s.includes('piano') || s.includes('guitar') || s.includes('bass') || s.includes('drum')) return 'rhythm';
  return 'saxes';
}
