/**
 * Jest config for Composer OS V2 TypeScript tests (e.g. core/counterpoint).
 * Root `npm run test` / `test:duo` use ts-node; this config is only for Jest runs.
 *
 * ts-node smoke harnesses also use the *.test.ts suffix; only files that declare
 * describe/it/test are included so `npx jest` does not fail on empty suites.
 */
const fs = require('fs');
const path = require('path');

const engineRoot = __dirname;
const appRoot = path.join(engineRoot, '../../apps/composer-os-app');
const appJest = require(path.join(appRoot, 'jest.config.cjs'));

/** @type {RegExp} */
const JEST_TEST_DECL = /^\s*(describe|it|test)\(/m;

/**
 * @param {string} baseDir
 * @returns {string[]}
 */
function discoverJestTestMatchPatterns(baseDir) {
  /** @type {string[]} */
  const patterns = [];

  /** @param {string} absDir @param {string} relDir */
  function walk(absDir, relDir = '') {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      const absPath = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath, relPath);
        continue;
      }
      if (!entry.name.endsWith('.test.ts')) continue;
      const source = fs.readFileSync(absPath, 'utf8');
      if (JEST_TEST_DECL.test(source)) {
        patterns.push(`<rootDir>/${relPath.replace(/\\/g, '/')}`);
      }
    }
  }

  walk(baseDir);
  return patterns;
}

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>'],
      testMatch: discoverJestTestMatchPatterns(engineRoot),
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/tsconfig.jest.json',
          },
        ],
      },
    },
    {
      displayName: 'ui',
      rootDir: appRoot,
      ...appJest,
      testMatch: ['**/src/renderer/components/__tests__/musicContextUI.test.jsx'],
    },
  ],
};
