// pages/PurchaseOrderPageV2.js

class PurchaseOrderPage {
  constructor(page) {
    this.page = page;
    this.createPOButton = page.locator('button:has-text("Create Purchase Order")').first();
    this.poNumberInput = page.locator('input[placeholder="Enter Number"]').first();
    this.proceedButton = page.locator('button:has-text("Proceed")').first();
    this.createOrderButton = page.locator('button:has-text("Create Order")').first();
    this.poTableFirstCell = page.locator('table tbody tr').first().locator('td').first();
    this.statusBadge = page.locator('text=Created, text=Approved, text=Pending, text=Completed').first();
  }

  async clickCreatePO() {
    await this.createPOButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async fillPOForm({ Distributor, product, quantity }) {
    const poNumber = `PO-${Date.now()}`;
    await this.poNumberInput.fill(poNumber);
    console.log('   PO Number:', poNumber);

    const distributorDropdown = this.page.locator('[role="combobox"]').nth(1);
    await this.selectDropdownOption(distributorDropdown, Distributor, 1);
    console.log('   Distributor selected:', Distributor);

    const productDropdown = this.page.locator('[role="combobox"]').first();
    await this.selectDropdownOption(productDropdown, product, 0);
    console.log('   Product selected:', product);

    const qtyInput = this.page.locator('input[type="number"], [role="spinbutton"]').first();
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.fill(String(quantity));
    console.log('   Quantity set:', quantity);
  }

  async submitPO() {
    await this.proceedButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(800);

    await this.createOrderButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('   Create Order clicked - PO creation complete');
  }

  async openLatestPO() {
    await this.page.goto('/customer/operations/purchase-orders');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);

    await this.poTableFirstCell.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('   Opened latest PO');
  }

  async openLatestPOAndGetUrl() {
    await this.openLatestPO();
    return this.page.url();
  }

  async approvePO() {
    const approveBtn = this.page.locator('main button:has-text("Approve")').first();
    await approveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await approveBtn.click();
    console.log('   Approve button clicked');
    await this.page.waitForTimeout(800);

    const modalApprove = this.page.locator('[role="dialog"] button:has-text("Approve")').first();
    await modalApprove.waitFor({ state: 'visible', timeout: 5000 });
    await modalApprove.click();
    console.log('   Approval confirmed in modal');

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async hasStatus(status) {
    return this.page.getByText(status, { exact: true }).isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getStatusText() {
    return this.statusBadge.textContent();
  }

  async selectDropdownOption(dropdown, optionText, fallbackIndex = 0) {
    const fallbackDropdown = this.page.locator('div').filter({ hasText: /^Select$/ }).nth(fallbackIndex);
    const targetDropdown = await dropdown.count().then(count => count > 0 ? dropdown.first() : fallbackDropdown);

    await targetDropdown.click();
    await this.page.waitForTimeout(800);
    await this.page.getByRole('option', { name: optionText, exact: true })
      .or(this.page.getByText(optionText, { exact: true }))
      .first()
      .click();
    await this.page.waitForTimeout(500);
  }
}

module.exports = { PurchaseOrderPage };
