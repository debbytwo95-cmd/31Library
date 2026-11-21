import { serve } from '../../../scripts/serve.mjs';
serve({ port: Number(process.env.PORT) || 4176, entry: 'single-web/components/halftone-horizon-studio/index.html' });
