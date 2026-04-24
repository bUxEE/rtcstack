import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  plugins: [basicSsl()],
  server: {
    port: 5173,
    proxy: {
      '/v1': 'http://localhost:3240',
    },
  },
}
