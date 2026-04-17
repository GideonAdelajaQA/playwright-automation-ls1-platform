// pages/DashboardPageV2.js

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.dashboardLink = page.locator('a[href="/customer/dashboard"]').first();
    this.purchaseOrdersLink = page.locator('a[href="/customer/operations/purchase-orders"]').first();
  }

  async navigateToPurchaseOrders() {
    if (await this.purchaseOrdersLink.isVisible().catch(() => false)) {
      await this.purchaseOrdersLink.click();
    } else {
      await this.page.goto('/customer/operations/purchase-orders');
    }

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async isVisible() {
    return this.dashboardLink.isVisible();
  }
}

module.exports = { DashboardPage };
