/**
 * Relative paths under the user Documents folder for rhythm MusicXML exports.
 * New rhythm engines (Turkish usul, flamenco, etc.) need a new key in `OUTPUT_DIRS`
 * and a new value in `RhythmOutputEngine`.
 */
export const COMPOSER_OUTPUT_ROOT = 'Composer OS Exports';

/** Documents-relative folder name for the root export directory only. */
export function getOutputRootPath(): string {
  return COMPOSER_OUTPUT_ROOT;
}

export const OUTPUT_DIRS = {
  felaKuti: `${COMPOSER_OUTPUT_ROOT}/Fela Kuti Rhythms`,
  greek: `${COMPOSER_OUTPUT_ROOT}/Greek Rhythms`,
  blended: `${COMPOSER_OUTPUT_ROOT}/Blended Rhythms`,
  brazilian: `${COMPOSER_OUTPUT_ROOT}/Brazilian Rhythms`,
} as const;

export type RhythmOutputEngine = 'fela-kuti' | 'greek' | 'blended' | 'brazilian';

const ENGINE_TO_DIR_KEY: Record<RhythmOutputEngine, keyof typeof OUTPUT_DIRS> = {
  'fela-kuti': 'felaKuti',
  greek: 'greek',
  blended: 'blended',
  brazilian: 'brazilian',
};

export function getOutputDir(engine: RhythmOutputEngine): string {
  return OUTPUT_DIRS[ENGINE_TO_DIR_KEY[engine]];
}

/** Documents-relative path using `/` separators (Windows save joins against Documents). */
export function getOutputPath(engine: RhythmOutputEngine, filename: string): string {
  const dir = getOutputDir(engine);
  const base = filename.replace(/^[/\\]+/, '');
  return `${dir}/${base}`;
}
