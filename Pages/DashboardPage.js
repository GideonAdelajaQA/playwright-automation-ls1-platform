// pages/DashboardPage.js

class DashboardPage {
  constructor(page) {
    this.page = page;

    // Based on actual app snapshot — Operations group contains Purchase Orders
    this.purchaseOrdersLink = page.locator('text=Operations').first();

    this.sidebar = page.locator('link[href="/customer/dashboard"]').first();
  }

 async navigateToPurchaseOrders() {
  await this.page.goto('/customer/operations/purchase-orders');
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(500);
}

  async navigateToDeliveries() {
    await this.page.goto('/customer/operations/deliveries');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async isVisible() {
    // Use the Dashboard link which is confirmed in the snapshot
    return this.page.locator('a[href="/customer/dashboard"]').isVisible();
  }
}

module.exports = { DashboardPage };