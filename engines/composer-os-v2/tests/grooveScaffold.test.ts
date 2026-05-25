import assert from 'assert';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import type { Song } from '../core/section-architecture/sectionArchitectureTypes';

function fiveSectionSonicYouthSong(): Song {
  return {
    schemaVersion: 1,
    id: 'v65_p4_sy_groove',
    title: 'V65 P4 Sonic Youth Groove Scaffold',
    totalBars: 40,
    globalDefaults: {
      tempo: 132,
      meter: '4/4',
      defaultDensity: 'moderate',
      defaultRhythmProfile: { subdivision: 'triplet' },
      grooveScaffold: { enabled: true, feel: 'swing' },
    },
    sections: [
      { id: 'intro', label: 'Intro', type: 'intro', barRange: { startBar: 1, endBar: 8 }, energy: 0.45 },
      { id: 'verse', label: 'Verse', type: 'verse', barRange: { startBar: 9, endBar: 16 }, energy: 0.55 },
      { id: 'chorus', label: 'Chorus', type: 'chorus', barRange: { startBar: 17, endBar: 24 }, energy: 0.85 },
      { id: 'bridge', label: 'Bridge', type: 'bridge', barRange: { startBar: 25, endBar: 32 }, energy: 0.5 },
      { id: 'outro', label: 'Outro', type: 'outro', barRange: { startBar: 33, endBar: 40 }, energy: 0.72 },
    ],
    localOverrides: [],
  };
}

function rockOddMeterSong(): Song {
  return {
    schemaVersion: 1,
    id: 'v65_p4_rock_odd_groove',
    title: 'V65 P4 Rock Odd Groove Scaffold',
    totalBars: 16,
    globalDefaults: {
      tempo: 118,
      meter: '4/4',
      defaultDensity: 'moderate',
      defaultRhythmProfile: { subdivision: '8th' },
      grooveScaffold: { enabled: true, feel: 'rock' },
    },
    sections: [
      { id: 'verse', label: 'Verse', type: 'verse', barRange: { startBar: 1, endBar: 8 }, energy: 0.58 },
      {
        id: 'chorus_7',
        label: 'Chorus 7',
        type: 'chorus',
        barRange: { startBar: 9, endBar: 16 },
        meterMap: [{ bar: 9, meter: '7/8' }],
        energy: 0.8,
      },
    ],
    localOverrides: [],
  };
}

export function runGrooveScaffoldGoldenTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  try {
    const result = runGoldenPath(83001, {
      presetId: 'song_mode',
      totalBars: 40,
      longFormEnabled: true,
      primarySongwriterStyle: 'sonic_youth',
      songModeHookFirstIdentity: true,
      styleProfile: 'STYLE_SONIC_YOUTH',
      song: fiveSectionSonicYouthSong(),
    });
    assert.ok(result.score, result.errors.join('; '));
    assert.ok(result.xml, 'MusicXML missing');
    assert.ok(result.score.parts.some((p) => p.id === 'groove_drums'), 'groove_drums part missing');
    assert.equal(validateStrictBarMath(result.score).valid, true, 'strict bar math failed');
    assert.ok(result.xml?.includes('<part-name>Groove Drums</part-name>'), 'MusicXML groove part missing');
    assert.ok(result.xml?.includes('<sign>percussion</sign>'), 'MusicXML percussion clef missing');
    const fillCounts = result.context.generationMetadata.grooveScaffoldDiagnostics?.fillCountBySection ?? {};
    for (const section of ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro']) {
      const n = fillCounts[section] ?? 0;
      assert.ok(n >= 1 && n <= 3, `section ${section} fill count ${n} outside 1-3`);
    }
    out.push({ name: 'V65 P4 groove scaffold 83001: SY swing song has sparse fills, bar math, percussion XML', ok: true });
  } catch (e) {
    out.push({ name: `V65 P4 groove scaffold 83001 failed: ${(e as Error).message}`, ok: false });
  }

  try {
    const song = rockOddMeterSong();
    const result = runGoldenPath(83002, {
      presetId: 'song_mode',
      totalBars: 16,
      longFormEnabled: true,
      primarySongwriterStyle: 'sonic_youth',
      songModeHookFirstIdentity: true,
      styleProfile: 'STYLE_SONIC_YOUTH',
      song,
      barMeterMap: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [String(i + 9), { numerator: 7, denominator: 8 }])),
    });
    assert.ok(result.score, result.errors.join('; '));
    assert.ok(result.xml, 'MusicXML missing');
    assert.equal(validateStrictBarMath(result.score).valid, true, 'strict bar math failed');
    const diag = result.context.generationMetadata.grooveScaffoldDiagnostics;
    assert.ok(diag?.oddMeterBars.some((b) => b >= 9 && b <= 16), 'odd_meter did not activate in 7/8 section');
    assert.ok(result.context.generationMetadata.grooveScaffoldReceipts?.includes('GROOVE_ODD_METER'));
    out.push({ name: 'V65 P4 groove scaffold 83002: rock feel routes 7/8 section to odd_meter', ok: true });
  } catch (e) {
    out.push({ name: `V65 P4 groove scaffold 83002 failed: ${(e as Error).message}`, ok: false });
  }

  return out;
}

if (require.main === module) {
  const rows = runGrooveScaffoldGoldenTests();
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
  if (rows.some((r) => !r.ok)) process.exit(1);
}
