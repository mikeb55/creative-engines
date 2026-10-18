/**
 * Stage C chamber templates.
 * A part is included only when the instrument catalogue has a numeric hard range.
 */

import type { InstrumentSpec } from '../instruments/instrumentTypes';
import { INSTRUMENT_CATALOGUE } from '../instruments/instrumentCatalogue';
import type { EnsembleTemplateId } from './types';

export interface TemplatePart {
  partId: string;
  instrumentId: string;
  name: string;
  hint: 'melody' | 'doubling' | 'counterline' | 'harmony' | 'bass';
}

export interface ResolvedPart extends TemplatePart {
  spec: InstrumentSpec;
}

const TEMPLATES: Record<EnsembleTemplateId, readonly TemplatePart[]> = {
  string_quartet: [
    { partId: 'vn1', instrumentId: 'violin', name: 'Violin I', hint: 'melody' },
    { partId: 'vn2', instrumentId: 'violin', name: 'Violin II', hint: 'doubling' },
    { partId: 'va', instrumentId: 'viola', name: 'Viola', hint: 'counterline' },
    { partId: 'vc', instrumentId: 'cello', name: 'Cello', hint: 'bass' },
  ],
  pierrot: [
    { partId: 'fl', instrumentId: 'flute', name: 'Concert Flute', hint: 'melody' },
    { partId: 'cl', instrumentId: 'clarinet_bb', name: 'Clarinet in B-flat', hint: 'counterline' },
    { partId: 'vn', instrumentId: 'violin', name: 'Violin', hint: 'harmony' },
    { partId: 'vc', instrumentId: 'cello', name: 'Cello', hint: 'bass' },
    { partId: 'pn', instrumentId: 'piano', name: 'Piano', hint: 'harmony' },
  ],
  wind_quintet: [
    { partId: 'fl', instrumentId: 'flute', name: 'Concert Flute', hint: 'melody' },
    { partId: 'ob', instrumentId: 'oboe', name: 'Oboe', hint: 'harmony' },
    { partId: 'cl', instrumentId: 'clarinet_bb', name: 'Clarinet in B-flat', hint: 'counterline' },
    { partId: 'hn', instrumentId: 'horn_f', name: 'Horn in F', hint: 'harmony' },
    { partId: 'bn', instrumentId: 'bassoon', name: 'Bassoon', hint: 'bass' },
  ],
  chamber_orchestra: [
    { partId: 'fl', instrumentId: 'flute', name: 'Concert Flute', hint: 'melody' },
    { partId: 'ob', instrumentId: 'oboe', name: 'Oboe', hint: 'harmony' },
    { partId: 'cl', instrumentId: 'clarinet_bb', name: 'Clarinet in B-flat', hint: 'harmony' },
    { partId: 'hn', instrumentId: 'horn_f', name: 'Horn in F', hint: 'harmony' },
    { partId: 'bn', instrumentId: 'bassoon', name: 'Bassoon', hint: 'harmony' },
    { partId: 'vn1', instrumentId: 'violin', name: 'Violin I', hint: 'doubling' },
    { partId: 'vn2', instrumentId: 'violin', name: 'Violin II', hint: 'counterline' },
    { partId: 'va', instrumentId: 'viola', name: 'Viola', hint: 'harmony' },
    { partId: 'vc', instrumentId: 'cello', name: 'Cello', hint: 'harmony' },
    { partId: 'db', instrumentId: 'double_bass', name: 'Double Bass', hint: 'bass' },
  ],
};

export function templateParts(id: EnsembleTemplateId): readonly TemplatePart[] {
  return TEMPLATES[id];
}

export function resolveCatalogueInstrument(id: string): { spec: InstrumentSpec | null; omission: string | null } {
  const spec = INSTRUMENT_CATALOGUE.find((item) => item.id === id) ?? null;
  if (!spec) {
    return { spec: null, omission: `${id} has no V3.4 catalogue entry. No range was invented.` };
  }
  if (!spec.soundingHardRange || !spec.soundingComfortRange) {
    return {
      spec,
      omission: `${spec.displayName} has no documented numeric range in the V3.4 catalogue. No range was invented.`,
    };
  }
  return { spec, omission: null };
}

export function resolveTemplate(id: EnsembleTemplateId): {
  parts: ResolvedPart[];
  omissions: Array<{ partId: string; instrumentId: string; detail: string }>;
} {
  const parts: ResolvedPart[] = [];
  const omissions: Array<{ partId: string; instrumentId: string; detail: string }> = [];
  for (const part of TEMPLATES[id]) {
    const resolved = resolveCatalogueInstrument(part.instrumentId);
    if (!resolved.spec || resolved.omission || !resolved.spec.soundingHardRange) {
      omissions.push({
        partId: part.partId,
        instrumentId: part.instrumentId,
        detail: resolved.omission ?? `${part.instrumentId} was not given a range.`,
      });
      continue;
    }
    parts.push({ ...part, name: part.name || resolved.spec.displayName, spec: resolved.spec });
  }
  return { parts, omissions };
}

export type E2EnsembleId = 'big-band' | 'string-quartet' | 'ecm-duo';

export interface E2RosterSlot {
  partId: string;
  instrumentId: string;
  name: string;
  drums?: boolean;
}

/** Individual players. Big-band drums stay outside the pitched catalogue. */
export function e2Roster(ensemble: E2EnsembleId): readonly E2RosterSlot[] {
  if (ensemble === 'string-quartet') {
    return [
      { partId: 'vn1', instrumentId: 'violin', name: 'Violin I' },
      { partId: 'vn2', instrumentId: 'violin', name: 'Violin II' },
      { partId: 'va', instrumentId: 'viola', name: 'Viola' },
      { partId: 'vc', instrumentId: 'cello', name: 'Cello' },
    ];
  }
  if (ensemble === 'ecm-duo') {
    return [
      { partId: 'guitar', instrumentId: 'clean_electric_guitar', name: 'Guitar' },
      { partId: 'bass', instrumentId: 'double_bass', name: 'Upright Bass' },
    ];
  }
  const saxes = [
    ['as1', 'alto_sax', 'Alto Sax 1'],
    ['as2', 'alto_sax', 'Alto Sax 2'],
    ['ts1', 'tenor_sax', 'Tenor Sax 1'],
    ['ts2', 'tenor_sax', 'Tenor Sax 2'],
    ['bs', 'baritone_sax', 'Baritone Sax'],
  ] as const;
  const trumpets = [1, 2, 3, 4].map((index) => [`tp${index}`, 'trumpet_bb', `Trumpet ${index}`] as const);
  const trombones = [1, 2, 3, 4].map((index) => [`tbn${index}`, 'trombone', `Trombone ${index}`] as const);
  return [
    ...saxes.map(([partId, instrumentId, name]) => ({ partId, instrumentId, name })),
    ...trumpets.map(([partId, instrumentId, name]) => ({ partId, instrumentId, name })),
    ...trombones.map(([partId, instrumentId, name]) => ({ partId, instrumentId, name })),
    { partId: 'pn', instrumentId: 'piano', name: 'Piano' },
    { partId: 'bass', instrumentId: 'double_bass', name: 'Upright Bass' },
    { partId: 'drums', instrumentId: 'big_band_jazz_drums', name: 'Drum Kit', drums: true },
  ];
}
