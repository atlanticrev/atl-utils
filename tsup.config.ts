import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['esm'],
  bundle: false,
  dts: true,
  outDir: 'dist',
  target: 'es2022',
  platform: 'neutral',
  sourcemap: true,
  clean: true,
  outExtension() {
    return {
      js: '.js',
    }
  },
})
