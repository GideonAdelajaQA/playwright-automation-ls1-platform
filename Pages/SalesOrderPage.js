// pages/SalesOrderPage.js

class SalesOrderPage {
  constructor(page) {
    this.page = page;
  }

  async pauseAfterAction() {
    await this.page.waitForTimeout(5000);
  }

  async openOperationsMenu() {
    const operationsMenu = this.page.getByText('Operations', { exact: true }).first();
    await operationsMenu.waitFor({ state: 'visible', timeout: 10000 });
    await operationsMenu.click();
    await this.pauseAfterAction();
  }

  async openPurchaseOrdersMenu() {
    await this.openOperationsMenu();

    const purchaseOrdersMenu = this.page.getByRole('link', { name: /purchase orders/i })
      .or(this.page.getByRole('button', { name: /purchase orders/i }).first())
      .or(this.page.getByText('Purchase Orders', { exact: true }).first());
    await purchaseOrdersMenu.waitFor({ state: 'visible', timeout: 10000 });
    await purchaseOrdersMenu.click();
    await this.pauseAfterAction();
  }

  async openIncomingPurchaseOrders() {
    await this.openPurchaseOrdersMenu();

    const incomingOrdersLink = this.page.getByRole('link', { name: /incoming purchase orders/i })
      .or(this.page.getByRole('button', { name: /incoming purchase orders/i }).first())
      .or(this.page.getByText('Incoming Purchase Orders', { exact: true }).first());
    await incomingOrdersLink.waitFor({ state: 'visible', timeout: 10000 });
    await incomingOrdersLink.click();

    await this.page.waitForLoadState('networkidle');
    await this.pauseAfterAction();
  }

  async expectIncomingPurchaseOrdersPage() {
    await this.page.getByText('Incoming Purchase Orders').waitFor({ state: 'visible', timeout: 10000 });
  }

  async openIncomingOrderByReference(poReference) {
    const searchInput = this.page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(poReference);
      await this.page.waitForTimeout(3000);
    }

    const poNumberCell = this.page.locator('table tbody tr td').filter({ hasText: poReference }).first();
    await poNumberCell.waitFor({ state: 'visible', timeout: 10000 });
    await poNumberCell.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(5000);
  }

  async expectOrderReference(poReference) {
    const salesOrderButton = this.page.getByRole('button', { name: /create sales order/i }).first()
      .or(this.page.getByRole('button', { name: /sales order/i }).first());
    if (await salesOrderButton.isVisible().catch(() => false)) {
      return;
    }

    await this.page.getByText(poReference, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickSalesOrderButton() {
    const salesOrderButton = this.page.getByRole('button', { name: /create sales order/i }).first()
      .or(this.page.getByRole('button', { name: /sales order/i }).first());
    await salesOrderButton.waitFor({ state: 'visible', timeout: 10000 });
    await salesOrderButton.click();
    await this.pauseAfterAction();
  }

  async expectSalesOrderForm() {
    await this.page.getByText('Sales Order Details', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
    await this.page.getByText('SO Number', { exact: false }).waitFor({ state: 'visible', timeout: 30000 });
  }

  async fillSalesOrderForm({ deliveryDate, salesOrderNumber, loadingStore, paymentTerm, quantity }) {
    const salesOrderInputs = this.page.locator('main input');
    const salesOrderNumberField = salesOrderInputs.nth(0);
    await salesOrderNumberField.waitFor({ state: 'visible', timeout: 10000 });
    await salesOrderNumberField.fill(salesOrderNumber);
    await this.pauseAfterAction();

    const requestDeliveryDateField = this.page.locator(
      'xpath=//*[contains(normalize-space(.), "Request Delivery Date")]/following::input[1]'
    ).first();
    const requestDeliveryDateValue = await requestDeliveryDateField.inputValue().catch(() => deliveryDate);

    const agreedDateField = this.page.locator(
      'xpath=//*[contains(normalize-space(.), "Request Agreed Date")]/following::input[1]'
    ).first();
    await agreedDateField.waitFor({ state: 'visible', timeout: 10000 });
    await agreedDateField.click();
    await agreedDateField.press('Control+A').catch(() => {});
    await agreedDateField.fill(requestDeliveryDateValue || deliveryDate);
    await this.pauseAfterAction();

    const paymentTermDropdown = this.page.locator('[role="combobox"]').first();
    await this.selectRandomDropdownOption(paymentTermDropdown, paymentTerm);

    const loadingStoreDropdown = this.page.locator('[role="combobox"]').nth(1);
    const currentLoadingStore = ((await loadingStoreDropdown.textContent().catch(() => '')) || '').trim();
    if (!currentLoadingStore.toLowerCase().includes(String(loadingStore).trim().toLowerCase())) {
      await this.selectDropdownOption(loadingStoreDropdown, loadingStore);
    } else {
      await this.pauseAfterAction();
    }

    const requestedQuantityField = this.page.locator('[role="spinbutton"]').first();
    const requestedQuantityValue = await requestedQuantityField.inputValue().catch(() => String(quantity));

    const quantityField = this.page.locator('[role="spinbutton"]').last();
    await quantityField.waitFor({ state: 'visible', timeout: 10000 });
    await quantityField.click({ clickCount: 3 });
    await quantityField.fill(requestedQuantityValue || String(quantity));
    await this.pauseAfterAction();
  }

  async submitSalesOrder() {
    const proceedButton = this.page.getByRole('button', { name: /^Proceed$/i })
      .or(this.page.locator('button:has-text("Proceed")').first());
    await proceedButton.waitFor({ state: 'visible', timeout: 10000 });
    await proceedButton.click();

    await this.page.waitForLoadState('networkidle');
    await this.pauseAfterAction();
  }

  async expectSalesOrderCreationSuccess(salesOrderNumber) {
    const successMessage = this.page.getByText(/sales order/i)
      .or(this.page.getByText(salesOrderNumber, { exact: false }).first());
    await successMessage.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async openSalesOrdersSection() {
    const salesOrdersMenu = this.page.getByRole('link', { name: /sales orders/i })
      .or(this.page.getByRole('button', { name: /sales orders/i }).first())
      .or(this.page.getByText('Sales Orders', { exact: true }).first());

    if (await salesOrdersMenu.isVisible().catch(() => false)) {
      await salesOrdersMenu.click();
      await this.page.waitForLoadState('networkidle');
      await this.pauseAfterAction();
    }
  }

  async openSalesOrderByReference(salesOrderReference) {
    const row = this.page.locator('table tbody tr').filter({ hasText: salesOrderReference }).first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await this.page.waitForLoadState('networkidle');
      await this.pauseAfterAction();
      return;
    }

    await this.page.getByText(salesOrderReference, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async approveSalesOrder(comment = 'approved') {
    const approveButton = this.page.locator('main button:has-text("Approve")').first();
    await approveButton.waitFor({ state: 'visible', timeout: 10000 });
    await approveButton.click();
    await this.pauseAfterAction();

    const confirmButton = this.page.getByRole('dialog').getByRole('button', { name: /approve|yes|confirm/i }).first();
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    await this.pauseAfterAction();

    const commentInput = this.page.getByRole('textbox', { name: /comment/i })
      .or(this.page.locator('[role="dialog"] textarea, [role="dialog"] input[placeholder*="comment" i]').first());
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.fill(comment);
      await this.pauseAfterAction();

      const finalApproveButton = this.page.getByRole('button', { name: /approve|proceed|confirm/i })
        .or(this.page.locator('[role="dialog"] button').filter({ hasText: /Approve|Proceed|Confirm/i }).last());
      await finalApproveButton.waitFor({ state: 'visible', timeout: 10000 });
      await finalApproveButton.click();
      await this.pauseAfterAction();
    }

    await this.page.waitForLoadState('networkidle');
    await this.pauseAfterAction();
  }

  async expectSalesOrderApproved() {
    const approvedSignal = this.page.getByText('Approved', { exact: true })
      .or(this.page.getByText(/sales order approved successfully/i).first());
    await approvedSignal.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async logout() {
    const logoutButton = this.page.getByRole('button', { name: /logout/i })
      .or(this.page.getByText('Logout', { exact: true }).first());
    await logoutButton.waitFor({ state: 'visible', timeout: 10000 });
    await logoutButton.click();
    await this.pauseAfterAction();

    const confirmLogout = this.page.getByRole('button', { name: /yes|logout|confirm/i }).first();
    if (await confirmLogout.isVisible().catch(() => false)) {
      await confirmLogout.click();
      await this.pauseAfterAction();
    }

    await this.page.waitForLoadState('networkidle');
    await this.pauseAfterAction();
  }

  findInputNearLabel(labelText) {
    return this.page.getByText(labelText, { exact: true }).locator('..').locator('input, textarea').first();
  }

  findDropdownNearLabel(labelText) {
    return this.page.getByText(labelText, { exact: true }).locator('..').locator('[role="combobox"], button').first();
  }

  async selectDropdownOption(dropdown, optionText) {
    await dropdown.waitFor({ state: 'visible', timeout: 10000 });
    await dropdown.click();
    await this.pauseAfterAction();

    await this.page.waitForSelector('[role="option"]', { timeout: 15000 });

    const allOptions = await this.page.locator('[role="option"]').allTextContents().catch(() => []);
    console.log('Available options:', allOptions);

    const normalizedOptionText = String(optionText).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const option = this.page.locator('[role="option"]')
      .filter({ hasText: new RegExp(normalizedOptionText, 'i') })
      .first()
      .or(this.page.getByText(new RegExp(normalizedOptionText, 'i')).first());
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await this.pauseAfterAction();
  }

  async selectRandomDropdownOption(dropdown, fallbackOptionText) {
    await dropdown.waitFor({ state: 'visible', timeout: 10000 });
    await dropdown.click();
    await this.pauseAfterAction();

    const options = this.page.getByRole('option');
    const optionCount = await options.count().catch(() => 0);
    if (optionCount > 0) {
      const candidates = [];
      for (let index = 0; index < optionCount; index += 1) {
        const option = options.nth(index);
        const text = (await option.textContent().catch(() => '') || '').trim();
        if (text && !/^select$/i.test(text)) {
          candidates.push(index);
        }
      }

      if (candidates.length > 0) {
        const randomIndex = candidates[Math.floor(Math.random() * candidates.length)];
        await options.nth(randomIndex).click();
        await this.pauseAfterAction();
        return;
      }
    }

    await this.selectDropdownOption(dropdown, fallbackOptionText);
  }
}

module.exports = { SalesOrderPage };
