import { serve } from '../../../scripts/serve.mjs';
serve({ port: Number(process.env.PORT) || 4175, entry: 'single-web/components/curve-fill-button-studio/index.html' });
