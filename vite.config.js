import { defineConfig, loadEnv } from 'vite';
import { aiMiddleware } from './server/ai.js';

export default defineConfig(({ mode }) => {
  // Only passed to server middleware. Never included in import.meta.env or the client bundle.
  const env = loadEnv(mode, process.cwd(), '');
  const options = { apiKey: env.OPENAI_API_KEY || '', model: env.OPENAI_MODEL || 'gpt-5-mini' };
  return {
    plugins: [{
      name: 'alem-ai-server',
      configureServer(server) { server.middlewares.use(aiMiddleware(options)); },
      configurePreviewServer(server) { server.middlewares.use(aiMiddleware(options)); },
    }],
  };
});
