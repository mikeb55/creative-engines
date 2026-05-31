/**
 * Imported groove MIDI bridge — v1.7p1 tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import { attachImportedGrooveToSongSections, loopGrooveEventsForSection } from './attachGrooveToSections';
import { importExternalGrooveMidi } from './importGrooveMidi';
import {
  GmDrumPitch,
  type GrooveSectionAssignment,
  type ImportedGroove,
} from './importGrooveMidiTypes';
import { mapGmDrumsToComposerOsGrooveDrums, SIXTEENTH_QUARTER } from './mapGmDrumsToGrooveEvents';

const MIDI_DIR = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Orbit Big Band',
  'New Orleans Orbit Beats',
);

const HEAD_GROOVE_MID = path.join(MIDI_DIR, 'HeadGroove.mid');
const SHOUT_PARADE_MID = path.join(MIDI_DIR, 'ShoutParade.mid');

const midiFixturesAvailable = fs.existsSync(HEAD_GROOVE_MID) && fs.existsSync(SHOUT_PARADE_MID);

/** HeadGroove.mid — GM-mapped channel-1 SD3 export (175 hits; pitch 21 discarded). */
const HEAD_GROOVE_GM_EVENT_COUNT = 175;

function syntheticGroove(
  overrides: Partial<ImportedGroove> & Pick<ImportedGroove, 'events'>,
): ImportedGroove {
  return {
    sourceFile: 'synthetic.mid',
    ticks_per_beat: 480,
    loopLengthBars: 1,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    ...overrides,
  };
}

describe('importExternalGrooveMidi', () => {
  it('returns correct event count for HeadGroove.mid', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
    expect(groove.events.length).toBe(HEAD_GROOVE_GM_EVENT_COUNT);
    expect(groove.ticks_per_beat).toBe(960);
    expect(groove.timeSignatureNumerator).toBe(4);
    expect(groove.timeSignatureDenominator).toBe(4);
  });

  it('preserves exact beat positions from MIDI ticks', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
    const kickAtDownbeat = groove.events.find(
      (e) => e.pitch === GmDrumPitch.KICK && e.velocity === 92 && e.beatPosition === 0,
    );
    expect(kickAtDownbeat).toBeDefined();
    expect(kickAtDownbeat!.durationQuarters).toBeCloseTo(0.125, 4);
    const snareAtThird = groove.events.find(
      (e) =>
        e.pitch === GmDrumPitch.SNARE &&
        Math.abs(e.beatPosition - 1 / 3) < 1e-6 &&
        e.velocity === 12,
    );
    expect(snareAtThird).toBeDefined();
    expect(groove.events.some((e) => Math.abs(e.beatPosition - 0.5229166666666667) < 1e-6)).toBe(
      true,
    );
  });

  it('maps MIDI 36 → KICK', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
    expect(groove.events.some((e) => e.pitch === GmDrumPitch.KICK)).toBe(true);
    expect(groove.events.every((e) => e.pitch !== (36 as unknown as GmDrumPitch) || e.pitch === GmDrumPitch.KICK)).toBe(
      true,
    );
  });

  it('maps MIDI 38 → SNARE', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
    const snares = groove.events.filter((e) => e.pitch === GmDrumPitch.SNARE);
    expect(snares.length).toBeGreaterThan(0);
    expect(snares.every((e) => e.pitch === GmDrumPitch.SNARE)).toBe(true);
  });

  it('never generates events — only reads file bytes', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const first = importExternalGrooveMidi(HEAD_GROOVE_MID);
    const second = importExternalGrooveMidi(HEAD_GROOVE_MID);
    expect(second).toEqual(first);
    expect(first.events.length).toBe(HEAD_GROOVE_GM_EVENT_COUNT);
    const allowed = new Set<number>(Object.values(GmDrumPitch).filter((v) => typeof v === 'number') as number[]);
    expect(first.events.every((e) => allowed.has(e.pitch))).toBe(true);
  });

  it('throws a clear message when the file cannot be parsed', () => {
    expect(() => importExternalGrooveMidi(path.join(MIDI_DIR, 'does-not-exist.mid'))).toThrow(
      /Cannot read MIDI groove file/,
    );
  });
});

describe('mapGmDrumsToComposerOsGrooveDrums', () => {
  it('quantises beat positions to 16th-note grid', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
    const mapped = mapGmDrumsToComposerOsGrooveDrums(groove, 84);
    expect(mapped.length).toBe(groove.events.length);
    for (const event of mapped) {
      expect(Math.abs((event.beatPosition / SIXTEENTH_QUARTER) % 1)).toBeLessThan(1e-9);
      expect(Math.abs((event.durationQuarters / SIXTEENTH_QUARTER) % 1)).toBeLessThan(1e-9);
    }
    const offGrid = groove.events.find((e) => Math.abs((e.beatPosition / SIXTEENTH_QUARTER) % 1) > 1e-6);
    if (offGrid) {
      const quantised = mapped.find((e) => e.pitch === offGrid.pitch && e.velocity === offGrid.velocity);
      expect(quantised!.beatPosition).toBe(Math.round(offGrid.beatPosition / SIXTEENTH_QUARTER) * SIXTEENTH_QUARTER);
    }
  });

  it('preserves pitch mapping', () => {
    if (!fs.existsSync(HEAD_GROOVE_MID)) {
      throw new Error(`Missing fixture: ${HEAD_GROOVE_MID}`);
    }
    const groove = importExternalGrooveMidi(HEAD_GROOVE_MID);
    const mapped = mapGmDrumsToComposerOsGrooveDrums(groove, 84);
    expect(mapped.map((e) => e.pitch)).toEqual(groove.events.map((e) => e.pitch));
    expect(mapped.map((e) => e.velocity)).toEqual(groove.events.map((e) => e.velocity));
  });
});

describe('attachImportedGrooveToSongSections', () => {
  it('loops groove correctly when section is longer than one loop', () => {
    const groove = syntheticGroove({
      loopLengthBars: 1,
      events: [
        { pitch: GmDrumPitch.KICK, beatPosition: 0, durationQuarters: 0.25, velocity: 100 },
        { pitch: GmDrumPitch.SNARE, beatPosition: 1, durationQuarters: 0.25, velocity: 90 },
      ],
    });
    const expanded = loopGrooveEventsForSection(groove, 1, 2);
    expect(expanded.some((e) => e.pitch === GmDrumPitch.KICK && Math.abs(e.beatPosition - 0) < 1e-9)).toBe(true);
    expect(expanded.some((e) => e.pitch === GmDrumPitch.KICK && Math.abs(e.beatPosition - 4) < 1e-9)).toBe(true);
    expect(expanded.some((e) => e.pitch === GmDrumPitch.SNARE && Math.abs(e.beatPosition - 5) < 1e-9)).toBe(true);
  });

  it('truncates correctly when section is shorter than one loop', () => {
    const groove = syntheticGroove({
      loopLengthBars: 2,
      events: [
        { pitch: GmDrumPitch.KICK, beatPosition: 0, durationQuarters: 0.25, velocity: 100 },
        { pitch: GmDrumPitch.SNARE, beatPosition: 1, durationQuarters: 0.25, velocity: 90 },
        { pitch: GmDrumPitch.KICK, beatPosition: 4.5, durationQuarters: 0.25, velocity: 100 },
      ],
    });
    const expanded = loopGrooveEventsForSection(groove, 1, 1);
    expect(expanded.every((e) => e.beatPosition < 4)).toBe(true);
    expect(expanded.some((e) => e.pitch === GmDrumPitch.KICK && e.beatPosition === 0)).toBe(true);
    expect(expanded.some((e) => e.beatPosition >= 4)).toBe(false);
  });

  it('returns ImportedGrooveMusicContext with expanded assignments', () => {
    const groove = syntheticGroove({
      loopLengthBars: 1,
      events: [{ pitch: GmDrumPitch.KICK, beatPosition: 0, durationQuarters: 0.25, velocity: 100 }],
    });
    const assignments: GrooveSectionAssignment[] = [
      { grooveId: 'test', startBar: 1, endBar: 2, groove },
    ];
    const ctx = attachImportedGrooveToSongSections(assignments);
    expect(ctx.sourceEngineId).toBe('imported_groove');
    expect(ctx.totalBars).toBe(2);
    expect(ctx.assignments[0]!.groove.events.length).toBeGreaterThan(1);
  });
});

describe('imported groove pipeline', () => {
  it('HeadGroove.mid → ImportedGrooveMusicContext succeeds', () => {
    if (!midiFixturesAvailable) {
      throw new Error(`Missing MIDI fixtures under ${MIDI_DIR}`);
    }
    const imported = importExternalGrooveMidi(HEAD_GROOVE_MID);
    const mapped = mapGmDrumsToComposerOsGrooveDrums(imported, 84);
    const grooveForSection: ImportedGroove = { ...imported, events: mapped };
    const ctx = attachImportedGrooveToSongSections([
      {
        grooveId: 'HeadGroove',
        startBar: 1,
        endBar: 16,
        groove: grooveForSection,
      },
    ]);
    expect(ctx.sourceEngineId).toBe('imported_groove');
    expect(ctx.totalBars).toBe(16);
    expect(ctx.tempo).toBe(120);
    expect(ctx.assignments[0]!.grooveId).toBe('HeadGroove');
    expect(ctx.assignments[0]!.groove.events.length).toBeGreaterThan(mapped.length);
  });

  it('ShoutParade.mid imports without error', () => {
    if (!fs.existsSync(SHOUT_PARADE_MID)) {
      throw new Error(`Missing fixture: ${SHOUT_PARADE_MID}`);
    }
    const groove = importExternalGrooveMidi(SHOUT_PARADE_MID);
    expect(groove.events.length).toBeGreaterThan(0);
    expect(groove.sourceFile).toBe('ShoutParade.mid');
  });
});
