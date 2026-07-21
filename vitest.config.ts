import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  plugins: [
    {
      name: 'fix-parentheses-glob',
      configResolved(config) {
        if (config.test && config.test.include) {
          config.test.include = config.test.include.map(pattern => {
            return pattern.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
          });
        }
      }
    }
  ]
});
