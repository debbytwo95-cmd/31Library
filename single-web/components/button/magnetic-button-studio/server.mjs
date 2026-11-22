import { serve } from '../../../../scripts/serve.mjs';
serve({ port: Number(process.env.PORT) || 4173, entry: 'single-web/components/button/magnetic-button-studio/index.html' });
