module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '10.4.0',
          // browsers: ['> 1%', 'last 2 versions'],
        },
      },
    ],
  ],
};
