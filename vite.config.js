import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SmartLoad frontend dev server config
// /api/* requests are proxied to Spring Boot backend on port 8080.
//
// SCSS deprecation warnings:
// Bootstrap 5.3 uses legacy Sass syntax internally (@import, if(), red()/green()/blue(),
// global mix(), unit(), etc.). Latest Dart Sass (1.80+) emits deprecation warnings for
// every internal use. We silence them here — they originate from Bootstrap's own code,
// not ours, and will be fixed when Bootstrap 6 ships. See:
//   troubleshooting/sass-bootstrap-variable-naming.md
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: [
          'legacy-js-api',
          'import',
          'global-builtin',
          'color-functions',
          'if-function',
          'slash-div',
        ],
      },
    },
  },
});
