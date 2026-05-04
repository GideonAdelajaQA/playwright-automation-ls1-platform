'use strict';

/**
 * login.js
 * Handles authentication into LS1 before the exploration agent takes over.
 * Saves session storage so we don't re-login on every page.
 */

async function loginToLS1(page, { baseUrl, username, password }) {
  console.log('  → Navigating to login page...');
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 });

  // Try common login field selectors (adjust if LS1 uses different names)
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
    '#email', '#username',
  ];

  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    '#password',
  ];

  let emailFilled = false;
  for (const sel of emailSelectors) {
    try {
      await page.fill(sel, username, { timeout: 2000 });
      emailFilled = true;
      console.log(`  → Filled username with selector: ${sel}`);
      break;
    } catch { /* try next */ }
  }

  if (!emailFilled) {
    throw new Error('Could not find email/username field. Check your LS1 login page selectors.');
  }

  let passFilled = false;
  for (const sel of passwordSelectors) {
    try {
      await page.fill(sel, password, { timeout: 2000 });
      passFilled = true;
      console.log(`  → Filled password with selector: ${sel}`);
      break;
    } catch { /* try next */ }
  }

  if (!passFilled) {
    throw new Error('Could not find password field. Check your LS1 login page selectors.');
  }

  // Submit
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
  ];

  let submitted = false;
  for (const sel of submitSelectors) {
    try {
      await page.click(sel, { timeout: 3000 });
      submitted = true;
      console.log(`  → Submitted with selector: ${sel}`);
      break;
    } catch { /* try next */ }
  }

  if (!submitted) {
    throw new Error('Could not find submit button. Check your LS1 login page.');
  }

  // Wait for redirect away from login page
  await page.waitForURL(url => !url.pathname.includes('login'), { timeout: 15000 })
    .catch(() => {
      // Not a hard failure — might be a SPA that doesn't change URL
      console.warn('  ⚠ URL did not change after login — might be SPA. Continuing...');
    });

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('signin')) {
    throw new Error(`Login appears to have failed. Still on: ${currentUrl}`);
  }

  console.log(`  ✓ Logged in. Now at: ${currentUrl}`);
  return currentUrl;
}

module.exports = { loginToLS1 };
