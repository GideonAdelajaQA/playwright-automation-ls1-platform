// playwright.config.js
const { defineConfig } = require('@playwright/test');
require('dotenv').config();

const headed = process.env.HEADLESS !== 'true';
const slowMo = Number(process.env.SLOW_MO || 0);
const bravePath = process.env.BRAVE_EXECUTABLE_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const useBrave = process.env.USE_BRAVE === 'true';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 600000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://ls1dev.web.app',
    browserName: 'chromium',
    ...(useBrave ? { executablePath: bravePath } : {}),
    headless: !headed,
    slowMo,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['html', { open: 'never' }], ['list']],
});
