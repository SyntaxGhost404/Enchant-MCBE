import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fake = (name: string) => fileURLToPath(new URL(`./tests/fake/${name}.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    // The game provides these modules; tests run the add-on code against small stand-ins.
    alias: {
      '@minecraft/server-ui': fake('server-ui'),
      '@minecraft/server': fake('server')
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
