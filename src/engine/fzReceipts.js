/**
 * Frank Zappa GCE fingerprint receipts (V66 P3 UI catalogue).
 * Distinct from riff-path FZ_HARM_* / FZ_DIFF_* compiler ids in the engine.
 */

/** @type {readonly { id: string, name: string, description: string, params: Record<string, unknown> }[]} */
export const FZ_RECEIPTS = [
  {
    id: 'FZ_XENOCHRONY',
    name: 'Xenochrony',
    description: 'Tape-splice collage: foreign meter and tempo layers drift against the host grid.',
    params: { xenochronyBlend: 0.65, tempoDriftCents: 18, collageDensity: 'high' },
  },
  {
    id: 'FZ_POLYRHYTHM',
    name: 'Polyrhythm',
    description: 'Superimposed tuplets and ride layers imply 3:2 and 4:3 without changing the written bar.',
    params: { polyrhythmRatio: '3:2', rideDensity: 0.8, kickIndependence: 0.7 },
  },
  {
    id: 'FZ_WRONG_NOTES',
    name: 'Wrong Notes',
    description: 'Deliberate pitch outliers and grace clusters treated as compositional color, not mistakes.',
    params: { wrongNoteProbability: 0.22, graceClusterMax: 4, resolvePolicy: 'sustain' },
  },
  {
    id: 'FZ_ORCHESTRAL_DENSITY',
    name: 'Orchestral Density',
    description: 'Thick midrange voicings and doubled lines mimic small-orchestra saturation on electric duo.',
    params: { layerCount: 4, midrangeSpreadSemitones: 14, unisonCollapse: false },
  },
  {
    id: 'FZ_SYNCLAVIER_GRID',
    name: 'Synclavier Grid',
    description: 'Quantized digital attack grid with sterile attacks and sample-splice articulation.',
    params: { gridResolution: '16th', attackMs: 2, digitalBrightness: 0.85 },
  },
  {
    id: 'FZ_MODAL_VAMP',
    name: 'Modal Vamp',
    description: 'Static pedal with Mixolydian / Dorian color; harmonic rhythm nearly frozen.',
    params: { pedalDegree: 1, mode: 'mixolydian', harmonicRhythmBars: 8 },
  },
  {
    id: 'FZ_SATIRICAL_QUOTE',
    name: 'Satirical Quote',
    description: 'Brief stylistic quotes collaged for humor; metadata-only collage flag in GCE.',
    params: { quoteCollage: true, quoteLengthBars: 2, juxtapositionWeight: 0.75 },
  },
  {
    id: 'FZ_METRIC_MOD',
    name: 'Metric Modulation',
    description: 'Sudden meter splice at section seams (7/8, 5/4, 4/4) per Zappa GCE fingerprint.',
    params: { metricDisruption: true, meterSplice: ['7/8', '5/4', '4/4'], zappaGceMeterMode: 'disrupt' },
  },
  {
    id: 'FZ_JAZZ_PROBE',
    name: 'Jazz Probe',
    description: 'Bebop enclosure probes and outside upper structures over functional harmony.',
    params: { outsideLevel: 2, enclosureDensity: 0.55, iiVLanguage: true },
  },
  {
    id: 'FZ_ROCK_ANCHOR',
    name: 'Rock Anchor',
    description: 'Pentatonic and power-interval anchors ground anarchic upper material.',
    params: { pentatonicAnchorRatio: 0.6, powerFifthBias: 0.7, backbeatWeight: 0.5 },
  },
  {
    id: 'FZ_CHROMATIC_CELL',
    name: 'Chromatic Cell',
    description: 'Semitone-driven cells cycle with Slonimsky-style transposition intervals.',
    params: { cellIntervals: [1, 1, 1], transpositionInterval: 1, chromaticBudget: 0.8 },
  },
  {
    id: 'FZ_TIMBRE_CONTRAST',
    name: 'Timbre Contrast',
    description: 'Hard switch between clean, fuzz, and wah-filtered guitar personas within phrases.',
    params: { timbreSlots: ['clean', 'fuzz', 'wah'], switchProbability: 0.35 },
  },
  {
    id: 'FZ_TAPE_SPLICE',
    name: 'Tape Splice',
    description: 'Hard cuts and non-sequitur joins between incompatible grooves.',
    params: { hardCutAtSectionBoundary: true, spliceJuxtaposition: 0.8 },
  },
  {
    id: 'FZ_HUMOR_TAG',
    name: 'Humor Tag',
    description: 'Absurdist juxtaposition of march, ballad, and surf textures at section edges.',
    params: { absurdistJuxtaposition: true, styleCollisionWeight: 0.85, humorTag: true },
  },
  {
    id: 'FZ_DENSE_COUNTERPOINT',
    name: 'Dense Counterpoint',
    description: 'Independent guitar–bass lines with high simultaneous attack density.',
    params: { counterpointDensity: 0.9, registerShiftProbability: 0.65, phraseFragmentation: 'high' },
  },
];

/** @param {string} id */
export function getFzReceiptById(id) {
  return FZ_RECEIPTS.find((r) => r.id === id);
}
