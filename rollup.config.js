import { terser } from 'rollup-plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';
import size from 'rollup-plugin-bundle-size';

export default {
  input: 'src/index.js',
  output: [
    {
      sourcemap: true,
      file: 'build/bundle.min.js',
      format: 'iife',
      name: 'jsonSchemaRulesEngine',
      plugins: [terser()],
    },
  ],
  plugins: [sourcemaps(), size()],
};
