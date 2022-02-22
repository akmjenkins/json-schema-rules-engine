module.exports = {
  transform: {
    '^.+\\.js?$': require.resolve('babel-jest'),
  },
  collectCoverageFrom: ['./src/*.js'],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
    },
  },
};
