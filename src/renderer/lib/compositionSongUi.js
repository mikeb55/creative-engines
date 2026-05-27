/**
 * UI helpers — read/write {@link Song} section fields + ui.* localOverrides.
 */

const UI_PREFIX = 'ui.';

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').Song} song */
export function getUiOverride(song, sectionId, path) {
  const section = song.sections.find((s) => s.id === sectionId);
  if (!section) return undefined;
  const key = `${UI_PREFIX}${path}`;
  const hit = song.localOverrides.find(
    (lo) =>
      lo.target === 'section' &&
      lo.parameterPath === key &&
      lo.barRange.startBar === section.barRange.startBar &&
      lo.barRange.endBar === section.barRange.endBar
  );
  return hit?.value;
}

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').Song} song */
export function setUiOverride(song, sectionId, path, value) {
  const section = song.sections.find((s) => s.id === sectionId);
  if (!section) return song;
  const key = `${UI_PREFIX}${path}`;
  const rest = song.localOverrides.filter(
    (lo) =>
      !(
        lo.target === 'section' &&
        lo.parameterPath === key &&
        lo.barRange.startBar === section.barRange.startBar &&
        lo.barRange.endBar === section.barRange.endBar
      )
  );
  const next =
    value === undefined || value === null || value === ''
      ? rest
      : [
          ...rest,
          {
            barRange: { ...section.barRange },
            target: 'section',
            parameterPath: key,
            value,
          },
        ];
  return { ...song, localOverrides: next };
}

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').SectionPreset} section */
export function sectionBarLength(section) {
  return section.barRange.endBar - section.barRange.startBar + 1;
}

/** @param {readonly import('@composer-os/core/section-architecture/sectionArchitectureTypes').SectionPreset[]} sections */
export function repartitionSectionBars(sections, totalBars) {
  let cursor = 1;
  return sections.map((s) => {
    const len = Math.max(1, sectionBarLength(s));
    const startBar = cursor;
    const endBar = Math.min(totalBars, cursor + len - 1);
    cursor = endBar + 1;
    return { ...s, barRange: { startBar, endBar } };
  });
}

export function createDefaultCompositionSong(totalBars = 32) {
  const half = Math.floor(totalBars / 2);
  const aLen = Math.max(4, half);
  const bLen = Math.max(4, totalBars - aLen);
  const tb = aLen + bLen;
  return {
    schemaVersion: 1,
    id: 'composition-ui',
    title: 'Composition',
    totalBars: tb,
    globalDefaults: { meter: '4/4', tempo: 120 },
    sections: [
      {
        id: 'section_a',
        label: 'A',
        type: 'verse',
        barRange: { startBar: 1, endBar: aLen },
        meterMap: [{ bar: 1, meter: '4/4' }],
      },
      {
        id: 'section_b',
        label: 'B',
        type: 'chorus',
        barRange: { startBar: aLen + 1, endBar: tb },
        meterMap: [{ bar: aLen + 1, meter: '4/4' }],
      },
    ],
    localOverrides: [],
  };
}

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').SectionPreset} section @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').Song} song */
export function readSectionMeter(section, song) {
  const span = section.meterMap?.[0];
  if (span?.meter) return span.meter;
  return song.globalDefaults.meter ?? '4/4';
}

/** @param {string} meter */
export function parseMeterParts(meter) {
  const parts = String(meter || '4/4')
    .trim()
    .split('/');
  const numerator = Math.max(1, Math.min(32, Math.round(Number(parts[0]) || 4)));
  const denominator = [2, 4, 8, 16].includes(Number(parts[1])) ? Number(parts[1]) : 4;
  return { numerator, denominator };
}

/** @param {string} raw e.g. "3+3+2" */
export function parseAdditiveBeatGroups(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return [];
  const groups = trimmed
    .split('+')
    .map((s) => Math.max(1, Math.floor(Number(s.trim()) || 0)))
    .filter((n) => n > 0);
  return groups;
}

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').SectionPreset} section @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').Song} song */
export function readSectionRowSummary(section, song) {
  const meter = readSectionMeter(section, song);
  const tempo =
    song.localOverrides.find(
      (lo) =>
        lo.parameterPath === 'tempo' &&
        lo.barRange.startBar === section.barRange.startBar &&
        lo.barRange.endBar === section.barRange.endBar
    )?.value ?? song.globalDefaults.tempo ?? 120;
  const feel =
    getUiOverride(song, section.id, 'feel') ??
    section.rhythmProfile?.subdivision ??
    'straight';
  const key = getUiOverride(song, section.id, 'key') ?? 'C';
  return { meter, tempo, feel, key };
}

/** @param {import('@composer-os/core/section-architecture/sectionArchitectureTypes').Song} song @param {string} sectionId @param {{ meter?: string, tempo?: number, feel?: string, key?: string, slonimskyPatternId?: string, tuningSystemId?: string, userCents?: number[] }} patch */
export function patchSectionUi(song, sectionId, patch) {
  let next = song;
  const section = song.sections.find((s) => s.id === sectionId);
  if (!section) return next;

  if (patch.meter != null) {
    const sections = song.sections.map((s) =>
      s.id === sectionId
        ? { ...s, meterMap: [{ bar: s.barRange.startBar, meter: patch.meter }] }
        : s
    );
    next = { ...next, sections };
  }

  if (patch.tempo != null) {
    const rest = next.localOverrides.filter(
      (lo) =>
        !(
          lo.parameterPath === 'tempo' &&
          lo.barRange.startBar === section.barRange.startBar &&
          lo.barRange.endBar === section.barRange.endBar
        )
    );
    next = {
      ...next,
      localOverrides: [
        ...rest,
        {
          barRange: { ...section.barRange },
          target: 'section',
          parameterPath: 'tempo',
          value: patch.tempo,
        },
      ],
    };
  }

  if (patch.feel != null) next = setUiOverride(next, sectionId, 'feel', patch.feel);
  if (patch.key != null) next = setUiOverride(next, sectionId, 'key', patch.key);
  if (patch.slonimskyPatternId != null) {
    next = setUiOverride(next, sectionId, 'slonimskyPatternId', patch.slonimskyPatternId);
  }
  if (patch.tuningSystemId != null) {
    next = setUiOverride(next, sectionId, 'tuningSystemId', patch.tuningSystemId);
  }
  if (patch.userCents != null) {
    next = setUiOverride(next, sectionId, 'userCents', patch.userCents);
  }
  if (patch.beatGrouping != null) {
    next = setUiOverride(next, sectionId, 'beatGrouping', patch.beatGrouping);
  }
  if (patch.compoundMeter != null) {
    next = setUiOverride(next, sectionId, 'compoundMeter', patch.compoundMeter);
  }
  if (patch.metricModulation != null) {
    next = setUiOverride(next, sectionId, 'metricModulation', patch.metricModulation);
  }
  if (patch.additiveMeter != null) {
    next = setUiOverride(next, sectionId, 'additiveMeter', patch.additiveMeter);
  }
  if (patch.compoundMeter != null) {
    next = setUiOverride(next, sectionId, 'compoundMeter', patch.compoundMeter);
  }

  return next;
}

const PC_BY_KEY = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/** @param {string} keyLabel */
export function keyLabelToPc(keyLabel) {
  return PC_BY_KEY[keyLabel] ?? 0;
}
