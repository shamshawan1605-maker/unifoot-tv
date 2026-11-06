import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// URL publique du site (canoniques, sitemap, Open Graph)
const SITE_URL = process.env.SITE_URL || 'https://unifoottv.fr';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  vite: {
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url)),
        '@config': fileURLToPath(new URL('./config', import.meta.url)),
      },
    },
  },
});
