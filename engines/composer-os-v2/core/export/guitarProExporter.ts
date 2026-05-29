import { spawnSync } from 'child_process';

const MUSESCORE_CANDIDATES = ['musescore3', 'mscore', 'MuseScore3', 'MuseScore4'];

function findMuseScoreCli(): string | null {
  for (const cmd of MUSESCORE_CANDIDATES) {
    const probe = spawnSync(cmd, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (probe.status === 0 || probe.stdout || probe.stderr) return cmd;
  }
  return null;
}

/**
 * Render MusicXML to Guitar Pro (.gp) via MuseScore CLI when available.
 * Never throws.
 */
export async function exportMusicXmlToGuitarPro(
  musicXmlPath: string,
  outputPath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const cli = findMuseScoreCli();
    if (!cli) {
      return { success: false, error: 'MuseScore not available' };
    }
    const gpOut = outputPath.replace(/\.gp$/i, '.gp');
    const result = spawnSync(cli, ['-o', gpOut, musicXmlPath], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim();
      return {
        success: false,
        error: detail || `MuseScore exited with code ${result.status ?? 'unknown'}`,
      };
    }
    return { success: true, path: gpOut };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
