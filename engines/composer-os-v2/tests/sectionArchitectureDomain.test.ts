/**
 * P4 golden — section architecture domain model (off smoke until P8).
 */

import {
  activeSectionLayers,
  findCompositionSectionForBar,
  sectionArchitectureFromForm,
  toCompositionSection,
  validateSectionPartition,
} from '../core/section-architecture/sectionArchitectureDomain';

const SEED = 78001;

function testPartitionValidAaba8(): boolean {
  const sections = [
    toCompositionSection('A', 1, 4),
    toCompositionSection('B', 5, 4),
  ];
  const v = validateSectionPartition(sections, 8);
  return v.ok === true;
}

function testPartitionDetectsGap(): boolean {
  const sections = [toCompositionSection('A', 1, 3), toCompositionSection('B', 5, 4)];
  const v = validateSectionPartition(sections, 8);
  return v.ok === false && v.issues.some((i) => i.kind === 'gap');
}

function testFindSectionForBar(): boolean {
  const sections = [toCompositionSection('A', 1, 4), toCompositionSection('B', 5, 4)];
  return (
    findCompositionSectionForBar(sections, 2)?.label === 'A' &&
    findCompositionSectionForBar(sections, 6)?.label === 'B'
  );
}

function testArchitectureDocumentLayers(): boolean {
  const doc = sectionArchitectureFromForm(
    [
      { label: 'A', startBar: 1, length: 4 },
      { label: 'B', startBar: 5, length: 4 },
    ],
    8,
    {
      markers: [
        {
          id: 'm_b',
          label: 'B',
          startBar: 5,
          endBar: 8,
          vrbOverrides: { riffProfile: { chromaticBudget: 0.5 } },
        },
      ],
      preset: {
        presetId: 'demo',
        displayName: 'Demo',
        totalBars: 8,
        sections: [
          {
            ...toCompositionSection('B', 5, 4),
            meterMap: [{ bar: 5, meter: '7/8' }],
          },
        ],
      },
    }
  );
  const layers = activeSectionLayers(doc);
  void SEED;
  return layers.includes('form') && layers.includes('marker') && layers.includes('meter');
}

export function runSectionArchitectureDomainTests(): { name: string; ok: boolean }[] {
  return [
    ['Section architecture — valid A/B partition (8 bars)', testPartitionValidAaba8],
    ['Section architecture — gap detection', testPartitionDetectsGap],
    ['Section architecture — findCompositionSectionForBar', testFindSectionForBar],
    ['Section architecture — active layers form+marker+meter', testArchitectureDocumentLayers],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
