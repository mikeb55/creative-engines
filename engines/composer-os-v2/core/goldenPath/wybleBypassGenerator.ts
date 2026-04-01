import { generateWybleScore } from '../../../jimmy-wyble-engine/wybleMeasureGenerator';
import { exportScoreToMusicXML } from '../../../jimmy-wyble-engine/wybleMusicXMLExporter';
import type { ChordProgressionSegment } from '../../../jimmy-wyble-engine/wybleEtudeGenerator';

export interface WybleBypassResult {
  guitarXml: string;
  mode: 'etude' | 'duo';
}

export function generateWybleEtudeXml(
  chords: string[],
  seed?: number,
  title?: string
): WybleBypassResult {
  const progression: ChordProgressionSegment[] = chords.map(c => ({ chord: c, bars: 1 }));
  const score = generateWybleScore(progression, { seed, title: title ?? 'Wyble Etude' });
  const xml = exportScoreToMusicXML(score, { title: title ?? 'Wyble Etude' });
  return { guitarXml: xml, mode: 'etude' };
}
