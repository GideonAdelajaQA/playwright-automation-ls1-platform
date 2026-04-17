// pages/LoginPage.js

class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // --- Selectors ---
    this.emailInput    = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.loginButton   = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    this.errorMessage  = page.locator('[class*="error"], [class*="alert"], [role="alert"]').first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async clearCredentials() {
    await this.emailInput.fill('');
    await this.passwordInput.fill('');
  }

  async login(email, password) {
    await this.clearCredentials();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Wait for navigation away from login page
    await this.page.waitForURL(url => !url.toString().includes('/login') && !url.toString().endsWith('/'), { timeout: 15000 })
      .catch(() => {
        // If URL doesn't change, we're still on login — test will catch the failure
      });
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoginPage() {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getErrorText() {
    return this.errorMessage.textContent();
  }
}

module.exports = { LoginPage };
