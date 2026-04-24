import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        mock: 'src/mock.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['livekit-client'],
    },
    sourcemap: true,
  },
  plugins: [dts({ rollupTypes: true })],
})
