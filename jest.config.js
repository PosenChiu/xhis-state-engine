module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  coveragePathIgnorePatterns: ['/node_modules/', '/test'],
  clearMocks: true,
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
