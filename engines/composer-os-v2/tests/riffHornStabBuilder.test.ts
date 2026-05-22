import { buildHornStabTrack } from '../core/riff-generator/riffHornStabBuilder';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';

export function runRiffHornStabBuilderTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'sly_stone',
      style: 'funk',
      grid: 'sixteenth',
      density: 'medium',
    });
    const track = buildHornStabTrack(profile, 4, ['E9', 'E9', 'E9', 'E9'], 'sly_stone');
    const answer = track?.filter((e) => e.function === 'answer') ?? [];
    const ok =
      !!track &&
      answer.some((e) => e.beat16th === 3 && e.duration16ths === 2) &&
      answer.some((e) => e.beat16th === 7 && e.duration16ths === 2);
    out.push({
      ok,
      name: 'sly_stone horn stabs: 16th indices 3+7, duration 2, function answer',
    });
  }

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'nile_rodgers',
      style: 'funk',
      grid: 'eighth',
      density: 'medium',
    });
    const track = buildHornStabTrack(profile, 2, ['E7', 'E7'], 'nile_rodgers');
    out.push({
      ok: track === undefined,
      name: 'no hornStabTopology VRB returns undefined horn track',
    });
  }

  return out;
}
