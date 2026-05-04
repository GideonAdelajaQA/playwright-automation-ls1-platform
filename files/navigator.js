'use strict';

/**
 * navigator.js
 * Decides what to click next and actually performs the navigation.
 * Keeps a visited-URL registry to avoid loops.
 */

class ExplorationNavigator {
  constructor(page, baseUrl) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.visitedUrls = new Set();
    this.navigationQueue = []; // { label, reason, priority, sourceUrl }
  }

  isVisited(url) {
    // Normalise — strip trailing slash and query params that are just pagination
    const normalised = url.replace(/\/$/, '').replace(/[?&]page=\d+/, '');
    return this.visitedUrls.has(normalised);
  }

  markVisited(url) {
    const normalised = url.replace(/\/$/, '').replace(/[?&]page=\d+/, '');
    this.visitedUrls.add(normalised);
  }

  isInScope(url) {
    // Only follow links within the LS1 app
    return url.startsWith(this.baseUrl);
  }

  /**
   * Enqueue navigation targets from Claude's analysis.
   * High priority targets go to the front.
   */
  enqueue(targets, sourceUrl) {
    const high = targets.filter(t => t.priority === 'high');
    const rest = targets.filter(t => t.priority !== 'high');
    this.navigationQueue.unshift(...high.map(t => ({ ...t, sourceUrl })));
    this.navigationQueue.push(...rest.map(t => ({ ...t, sourceUrl })));
  }

  hasNext() {
    return this.navigationQueue.length > 0;
  }

  /**
   * Attempt to navigate to the next queued target.
   * Returns { success, url, label } or null if queue is empty.
   */
  async navigateNext() {
    while (this.navigationQueue.length > 0) {
      const target = this.navigationQueue.shift();
      const currentUrl = this.page.url();

      // Try to find and click the element
      const clicked = await this._tryClick(target.label);

      if (clicked) {
        // Wait for navigation to settle
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.page.waitForTimeout(800); // let SPA re-render

        const newUrl = this.page.url();

        if (this.isVisited(newUrl) || !this.isInScope(newUrl)) {
          // Went somewhere already seen or out of scope — go back
          await this.page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
          continue;
        }

        return { success: true, url: newUrl, label: target.label, reason: target.reason };
      }

      // Could not find/click the element — try direct URL if we have one
      const directUrl = await this._findLinkUrl(target.label);
      if (directUrl && this.isInScope(directUrl) && !this.isVisited(directUrl)) {
        await this.page.goto(directUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        const newUrl = this.page.url();
        return { success: true, url: newUrl, label: target.label, reason: target.reason };
      }
    }

    return null; // Queue exhausted
  }

  /**
   * Find all clickable navigation elements and return them for initial seeding.
   * Used on the first page after login to bootstrap the queue.
   */
  async discoverNavLinks() {
    return this.page.evaluate(() => {
      const links = [];
      document.querySelectorAll('nav a, [role="navigation"] a, .sidebar a, .menu a, aside a').forEach(el => {
        const text = el.innerText.trim();
        if (text && el.href && !el.href.startsWith('javascript:')) {
          links.push({ label: text, href: el.href, priority: 'high', reason: 'Top-level nav item' });
        }
      });
      return links;
    });
  }

  // --- Private helpers ---

  async _tryClick(label) {
    const strategies = [
      // Exact text match
      () => this.page.getByRole('button', { name: label, exact: true }).click({ timeout: 3000 }),
      () => this.page.getByRole('link', { name: label, exact: true }).click({ timeout: 3000 }),
      // Partial text match
      () => this.page.getByRole('button', { name: label }).first().click({ timeout: 3000 }),
      () => this.page.getByRole('link', { name: label }).first().click({ timeout: 3000 }),
      // Text content fallback
      () => this.page.locator(`text="${label}"`).first().click({ timeout: 3000 }),
      () => this.page.locator(`text=${label}`).first().click({ timeout: 3000 }),
    ];

    for (const strategy of strategies) {
      try {
        await strategy();
        return true;
      } catch {
        // Try next strategy
      }
    }
    return false;
  }

  async _findLinkUrl(label) {
    return this.page.evaluate((lbl) => {
      const el = [...document.querySelectorAll('a')].find(a =>
        a.innerText.trim().toLowerCase().includes(lbl.toLowerCase())
      );
      return el ? el.href : null;
    }, label);
  }
}

module.exports = { ExplorationNavigator };
