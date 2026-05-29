module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/src/renderer/components/__tests__/**/*.test.jsx',
    '**/src/lib/__tests__/**/*.test.js',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '^@engine/(.*)$': '<rootDir>/../../src/engine/$1',
  },
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
