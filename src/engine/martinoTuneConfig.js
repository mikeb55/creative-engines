/**
 * Build Martino Python engine tune_config from Composer OS section + martinoConfig.
 */

/**
 * @param {string | undefined} meter e.g. "4/4", "3/4"
 */
function parseMeter(meter) {
  const raw = String(meter || '4/4').trim();
  const m = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return { beats: 4, beat_type: 4 };
  return { beats: Number(m[1]), beat_type: Number(m[2]) };
}

/**
 * @param {string | undefined} keyLabel e.g. "F major", "Dm", "F"
 */
function parseKey(keyLabel) {
  const raw = String(keyLabel || 'F').trim();
  const minor = /minor|m\b/i.test(raw);
  const rootMatch = raw.match(/^([A-G](?:#|b)?)/i);
  const root = rootMatch ? rootMatch[1][0].toUpperCase() + rootMatch[1].slice(1) : 'F';
  const fifthsMap = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'Gb': -6, 'Db': -5, Ab: -4, Eb: -3, Bb: -2, F: -1 };
  const norm = root.replace('Db', 'Db').replace('Gb', 'Gb');
  const fifths = fifthsMap[norm] ?? fifthsMap[root[0]] ?? -1;
  return { fifths, mode: minor ? 'minor' : 'major' };
}

/**
 * @param {Record<string, unknown>} section
 * @param {Record<string, unknown>} martinoConfig
 */
export function buildTuneConfig(section, martinoConfig = {}) {
  const progression = Array.isArray(martinoConfig.progression)
    ? martinoConfig.progression.map(String)
    : [];
  const lfvRaw = martinoConfig.lfv && typeof martinoConfig.lfv === 'object'
    ? /** @type {{ min_fret?: number; max_fret?: number }} */ (martinoConfig.lfv)
    : {};

  const userTune =
    typeof martinoConfig.tune === 'string' ? martinoConfig.tune.trim() : '';
  const tuneLabel =
    userTune || String(section?.name || section?.title || 'Untitled');
  return {
    tune: tuneLabel,
    tune_name: tuneLabel,
    choruses: Number(martinoConfig.choruses ?? 1),
    measures_per_chorus: Number(section?.barCount ?? progression.length ?? 16),
    time_signature: parseMeter(section?.meter),
    key: parseKey(section?.key ?? section?.tonalCenter),
    chords: progression,
    rehearsal_marks: { 0: 'A' },
    asterisk_measures: Array.isArray(martinoConfig.asteriskMeasures)
      ? martinoConfig.asteriskMeasures.map(Number)
      : [],
    primary_activity: String(martinoConfig.activeActivity || 'A1_LINEAR_CORE'),
    secondary_activities: Array.isArray(martinoConfig.secondaryActivities)
      ? martinoConfig.secondaryActivities.map(String)
      : [],
    melody: 'auto',
    lfv: {
      min_fret: Number(lfvRaw.min_fret ?? 5),
      max_fret: Number(lfvRaw.max_fret ?? 9),
    },
  };
}
