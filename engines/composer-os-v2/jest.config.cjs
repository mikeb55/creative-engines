/**
 * Jest config for Composer OS V2 TypeScript tests (e.g. core/counterpoint).
 * Root `npm run test` / `test:duo` use ts-node; this config is only for Jest runs.
 */
const path = require('path');

const appRoot = path.join(__dirname, '../../apps/composer-os-app');
const appJest = require(path.join(appRoot, 'jest.config.cjs'));

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>'],
      testMatch: ['**/*.test.ts'],
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
