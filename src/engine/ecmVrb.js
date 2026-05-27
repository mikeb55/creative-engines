/**
 * ECM Records–inspired reverb profile presets (V66 P3).
 */

/** @typedef {object} EcmVrbPreset
 * @property {string} id
 * @property {string} name
 * @property {number} roomSize
 * @property {number} decay
 * @property {number} predelay
 * @property {number} damping
 * @property {number} diffusion
 * @property {string} character
 */

/** @type {readonly EcmVrbPreset[]} */
export const ECM_VRB_PRESETS = [
  {
    id: 'nordic_studio',
    name: 'Nordic Studio',
    roomSize: 0.42,
    decay: 1.8,
    predelay: 12,
    damping: 0.55,
    diffusion: 0.62,
    character: 'Manfred Eicher signature — dry focus, long tail, restrained early reflections',
  },
  {
    id: 'stone_church_oslo',
    name: 'Stone Church Oslo',
    roomSize: 0.78,
    decay: 4.2,
    predelay: 28,
    damping: 0.38,
    diffusion: 0.71,
    character: 'Stone church — diffuse stone bloom, slow build, ECM chamber jazz',
  },
  {
    id: 'infinite_hall',
    name: 'Infinite Hall',
    roomSize: 0.95,
    decay: 7.5,
    predelay: 45,
    damping: 0.22,
    diffusion: 0.88,
    character: 'Infinite hall — endless tail, low damping, halo around sustained lines',
  },
  {
    id: 'close_dry',
    name: 'Close Dry',
    roomSize: 0.08,
    decay: 0.55,
    predelay: 0,
    damping: 0.92,
    diffusion: 0.15,
    character: 'Near-zero reverb, ECM close-mic intimacy',
  },
  {
    id: 'distant_bloom',
    name: 'Distant Bloom',
    roomSize: 0.68,
    decay: 3.1,
    predelay: 18,
    damping: 0.48,
    diffusion: 0.8,
    character: 'Distant bloom — player set back in hall, soft attack, blooming sustain',
  },
  {
    id: 'cathedral_fade',
    name: 'Cathedral Fade',
    roomSize: 0.88,
    decay: 6.2,
    predelay: 55,
    damping: 0.3,
    diffusion: 0.85,
    character: 'Cathedral fade — long predelay, decay swells after note release',
  },
];

/** @param {string} id */
export function getEcmVrbPresetById(id) {
  return ECM_VRB_PRESETS.find((p) => p.id === id);
}

/** @param {EcmVrbPreset} preset */
export function presetToVrbProfile(preset) {
  return {
    presetId: preset.id,
    name: preset.name,
    roomSize: preset.roomSize,
    decay: preset.decay,
    predelay: preset.predelay,
    damping: preset.damping,
    diffusion: preset.diffusion,
    character: preset.character,
  };
}
