// pages/PurchaseOrderPage.js

class PurchaseOrderPage {
  constructor(page) {
    this.page = page;

    this.createPOButton = page.locator('button:has-text("Create Purchase Order")').first();
    this.poNumberInput  = page.locator('input[placeholder="Enter Number"]').first();

    // Top right Approve button — NOT inside a dialog
    this.approvePOButton = page.locator('button:has-text("Approve")').first();

    // Modal confirm button — says "Approve" inside the dialog
    this.confirmModalProceed = page.locator('[role="dialog"] button:has-text("Approve")').first();

    this.statusBadge = page.locator('text=Created, text=Approved, text=Pending, text=Completed').first();
  }

  async clickCreatePO() {
    await this.createPOButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async fillPOForm({ Distributor, product, quantity }) {
    // 1. PO Number
    const poNumber = 'PO-' + Date.now();
    await this.poNumberInput.fill(poNumber);
    console.log('   PO Number:', poNumber);

    // 2. Distributors Name dropdown
    const distributorDropdown = this.page.locator('div').filter({ hasText: /^Select$/ }).nth(1);
    await distributorDropdown.click();
    await this.page.waitForTimeout(800);
    await this.page.getByText(Distributor, { exact: true }).click();
    await this.page.waitForTimeout(500);
    console.log('   Distributor selected:', Distributor);

    // 3. Product dropdown
    const productDropdown = this.page.locator('div').filter({ hasText: /^Select$/ }).first();
    await productDropdown.click();
    await this.page.waitForTimeout(800);
    await this.page.getByText(product, { exact: true }).click();
    await this.page.waitForTimeout(500);
    console.log('   Product selected:', product);

    // 4. Quantity
    const qtyInput = this.page.locator('input[type="number"], spinbutton').first();
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.fill(String(quantity));
    console.log('   Quantity set:', quantity);

    return poNumber;
  }

  async submitPO() {
    // Step 1 — Proceed to Documentation tab
    await this.page.locator('button:has-text("Proceed")').first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(800);

    // Step 2 — Create Order
    await this.page.locator('button:has-text("Create Order")').first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('   Create Order clicked — PO creation complete');
  }

  async openLatestPO() {
    // Click the PO number cell in the first row
    await this.page.locator('table tbody tr').first().locator('td').first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('   Opened latest PO');
  }

  async approvePO() {
    const approveBtn = this.page.locator('main button:has-text("Approve")').first();
    await approveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await approveBtn.click();
    console.log('   Approve button clicked');

    const approvalDialog = this.page.getByRole('dialog', { name: 'Approve' });
    await approvalDialog.waitFor({ state: 'visible', timeout: 5000 });

    const modalApprove = approvalDialog.getByRole('button', { name: 'Approve' });
    await modalApprove.click();
    console.log('   Initial approval confirmed in modal');

    const commentInput = this.page.getByRole('textbox', { name: 'Comment' })
      .or(this.page.locator('[role="dialog"] textarea, [role="dialog"] input[placeholder*="comment" i]').first());
    await commentInput.waitFor({ state: 'visible', timeout: 10000 });
    await commentInput.fill('approved');
    console.log('   Approval comment entered');

    const finalApproveButton = this.page.getByRole('button', { name: 'Approve' })
      .or(this.page.locator('[role="dialog"] button:has-text("Approve")').last());
    await finalApproveButton.waitFor({ state: 'visible', timeout: 10000 });
    await finalApproveButton.click();
    console.log('   Final approval clicked');

    await this.page.waitForLoadState('networkidle');
    await this.page.getByText('Purchased order approved successfully').waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  async getStatusText() {
    return this.statusBadge.textContent();
  }

  async logout() {
    const logoutButton = this.page.getByRole('button', { name: /logout/i })
      .or(this.page.getByText('Logout', { exact: true }).first());
    await logoutButton.waitFor({ state: 'visible', timeout: 10000 });
    await logoutButton.click();

    const confirmLogout = this.page.getByRole('button', { name: /yes|logout|confirm/i }).first();
    if (await confirmLogout.isVisible().catch(() => false)) {
      await confirmLogout.click();
    }

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('   Logged out successfully');
  }
}

module.exports = { PurchaseOrderPage };
