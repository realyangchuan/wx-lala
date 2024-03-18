import terser from '@rollup/plugin-terser'

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
  input: './src/index.js',
  output: [
    {
      file: 'miniprogram_dist/index.js',
      format: 'cjs',
      plugins: [terser()]
    }
  ]
}
