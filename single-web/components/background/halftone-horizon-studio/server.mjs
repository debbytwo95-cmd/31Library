import { serve } from '../../../../scripts/serve.mjs';
serve({ port: Number(process.env.PORT) || 4176, entry: 'single-web/components/background/halftone-horizon-studio/index.html' });
