const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  retries: 0,
  workers: 1,
  reporter: [['line']],
  use: { baseURL: 'http://127.0.0.1:3000', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  outputDir: '../.artifacts/ui/test-results'
});
