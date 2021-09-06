module.exports = {
  transform: {
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(node-fetch|fetch-blob)/)'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 80,
      lines: 85,
    },
  },
};
