module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/src/renderer/components/__tests__/**/*.test.jsx'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
