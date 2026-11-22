import { serve } from '../../../../scripts/serve.mjs';
serve({ port: Number(process.env.PORT) || 4174, entry: 'single-web/components/button/icon-button-studio/index.html' });
