module.exports = {
  plugins: ['add-module-exports'],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current', browsers: '>1%' } }],
  ],
};
