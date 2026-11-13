import { defineConfig } from 'vitest/config';

// Plain TypeScript only. Screens are checked by running the apps.
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts', 'app-kit/**/*.test.ts'] } });
