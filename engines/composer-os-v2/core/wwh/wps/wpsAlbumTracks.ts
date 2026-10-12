/**
 * Album-track folders for WWH performance editions.
 * Track position is the final nine-track album order. It is not the two-digit
 * prefix on a leadsheet or a MusicXML filename.
 */

import path from 'node:path';

export const WPS_PERFORMANCE_EDITIONS_ROOT =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS';

export interface WpsAlbumTrack {
  /** 1–9 on the album. */
  position: number;
  folder: string;
  /**
   * Spec id or title, compared after trim and lower case.
   * Leadsheet numbers that differ from the album position are listed here on purpose.
   */
  identities: readonly string[];
}

export const WPS_ALBUM_TRACKS: readonly WpsAlbumTrack[] = [
  { position: 1, folder: '01-Black-Aura', identities: ['01-black-aura', 'black-aura', 'black aura'] },
  {
    position: 2,
    folder: '02-Palace-Gates',
    identities: [
      '02-palace-gates',
      'palace-gates',
      'palace gates',
      'palace-gates-solo',
      'palace gates solo',
      'palace gates (solo guitar)',
    ],
  },
  { position: 3, folder: '03-The-Mirror', identities: ['03-the-mirror', 'the-mirror', 'the mirror'] },
  {
    position: 4,
    folder: '04-Meet-Me-at-Hobos',
    identities: [
      '04-meet-me-at-hobos',
      'meet-me-at-hobos',
      "meet me at hobo's",
      'meet me at hobos',
    ],
  },
  {
    position: 5,
    folder: '05-Orbit',
    identities: ['05-orbit', 'orbit', 'orbit v2.1'],
  },
  {
    position: 6,
    folder: '06-Wrong-Turning',
    identities: ['06-wrong-turning', 'wrong-turning', 'wrong turning'],
  },
  {
    position: 7,
    folder: '07-Impossible-Metaphysics',
    identities: ['07-impossible-metaphysics', 'impossible-metaphysics', 'impossible metaphysics'],
  },
  {
    position: 8,
    folder: '08-Small-Testimony',
    identities: ['08-small-testimony', '04-small-testimony', 'small-testimony', 'small testimony'],
  },
  {
    position: 9,
    folder: '09-After-Everything',
    identities: ['09-after-everything', 'after-everything', 'after everything'],
  },
];

export function resolveWpsAlbumTrack(song: { id: string; title: string }): WpsAlbumTrack | null {
  const keys = [song.id, song.title].map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0);
  const hits: WpsAlbumTrack[] = [];
  for (const track of WPS_ALBUM_TRACKS) {
    if (keys.some((key) => track.identities.includes(key))) hits.push(track);
  }
  const unique = [...new Set(hits)];
  return unique.length === 1 ? unique[0]! : null;
}

/** Directory for future performance editions of this song. Null when the identity is ambiguous. */
export function wpsPerformanceOutputDir(song: { id: string; title: string }): string | null {
  const track = resolveWpsAlbumTrack(song);
  if (!track) return null;
  return path.join(WPS_PERFORMANCE_EDITIONS_ROOT, track.folder);
}
