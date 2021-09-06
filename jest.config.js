module.exports = {
  transform: {
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(node-fetch|fetch-blob)/)'],
  collectCoverageFrom: ['./src/*.js'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 75,
      lines: 75,
    },
  },
};
