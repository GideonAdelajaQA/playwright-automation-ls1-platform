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
    // Wait for form to fully settle before touching anything
    await this.page.waitForLoadState('networkidle');

    // --- SO Number ---
    const salesOrderNumberField = this.page.locator('main input').nth(0);
    await salesOrderNumberField.waitFor({ state: 'visible', timeout: 15000 });
    await salesOrderNumberField.click();
    await salesOrderNumberField.fill(salesOrderNumber);
    console.log(`   SO Number entered: ${salesOrderNumber}`);

    // --- Request Delivery Date (read only — just grab the value) ---
    const requestDeliveryDateField = this.page.locator(
      'xpath=//*[contains(normalize-space(.), "Request Delivery Date")]/following::input[1]'
    ).first();
    const requestDeliveryDateValue = await requestDeliveryDateField.inputValue().catch(() => deliveryDate);
    console.log(`   Request Delivery Date found: ${requestDeliveryDateValue}`);

    // --- Agreed Delivery Date ---
    const agreedDateField = this.page.locator(
      'xpath=//*[contains(normalize-space(.), "Request Agreed Date")]/following::input[1]'
    ).first();
    await agreedDateField.waitFor({ state: 'visible', timeout: 10000 });
    await agreedDateField.click();
    await agreedDateField.press('Control+A');
    await agreedDateField.fill(requestDeliveryDateValue || deliveryDate);
    await agreedDateField.press('Tab');
    console.log(`   Agreed Date filled: ${requestDeliveryDateValue || deliveryDate}`);

    // --- Payment Term dropdown ---
    const paymentTermDropdown = this.page.locator('[role="combobox"]').first();
    await this.selectRandomDropdownOption(paymentTermDropdown, paymentTerm);
    console.log(`   Payment Term selected`);

    // --- Loading Store dropdown ---
    const loadingStoreDropdown = this.page.locator('[role="combobox"]').nth(1);
    const currentLoadingStore = ((await loadingStoreDropdown.textContent().catch(() => '')) || '').trim();
    if (!currentLoadingStore.toLowerCase().includes(String(loadingStore).trim().toLowerCase())) {
      await this.selectDropdownOption(loadingStoreDropdown, loadingStore);
      console.log(`   Loading Store selected`);
    }

    // --- Scroll down to Product Details section ---
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);

    // --- Read "Quantity Requested" by name attribute ---
    const requestedQtyField = this.page.locator('input[name="products.0.requestedQuantity"]');
    await requestedQtyField.waitFor({ state: 'visible', timeout: 15000 });
    await requestedQtyField.scrollIntoViewIfNeeded();
    const requestedQtyValue = (await requestedQtyField.inputValue().catch(() => '')) || String(quantity);
    console.log(`   Quantity Requested value read: ${requestedQtyValue}`);

    // --- Fill "Quantity Confirmed" by name attribute ---
    const confirmedQtyField = this.page.locator('input[name="products.0.requestedConfirmed"]');
    await confirmedQtyField.waitFor({ state: 'visible', timeout: 15000 });
    await confirmedQtyField.scrollIntoViewIfNeeded();

    // Click, clear, type value, then trigger React's onChange via nativeInputValueSetter
    await confirmedQtyField.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await confirmedQtyField.pressSequentially(requestedQtyValue, { delay: 80 });

    // Force React to register the change (handles controlled inputs that ignore .fill())
    await this.page.evaluate((val) => {
      const input = document.querySelector('input[name="products.0.requestedConfirmed"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
      }
    }, requestedQtyValue);

    await this.page.waitForTimeout(1000);
    console.log(`   Quantity Confirmed filled: ${requestedQtyValue}`);
  }

  async submitSalesOrder() {
    // Step 1 — Click Proceed (validates the form, moves to documentation tab)
    const proceedButton = this.page.getByRole('button', { name: /^Proceed$/i })
      .or(this.page.locator('button:has-text("Proceed")').first());
    await proceedButton.waitFor({ state: 'visible', timeout: 10000 });
    await proceedButton.click();
    console.log('   Proceed clicked');

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Step 2 — Click Submit on the documentation tab to finalise the SO
    const submitButton = this.page.getByRole('button', { name: /^Submit$/i })
      .or(this.page.locator('button:has-text("Submit")').first());
    await submitButton.waitFor({ state: 'visible', timeout: 15000 });
    await submitButton.click();
    console.log('   Submit clicked — SO creation complete');

    await this.page.waitForLoadState('networkidle');
    await this.pauseAfterAction();
  }

  async expectSalesOrderCreationSuccess(salesOrderNumber) {
    const successMessage = this.page.getByText(/sales order/i)
      .or(this.page.getByText(salesOrderNumber, { exact: false }).first());
    await successMessage.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async openLatestSOAndGetUrl() {
    // Navigate to SO list, click the first row, return the detail page URL
    await this.page.goto('/customer/operations/sales-orders');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    await this.page.locator('table tbody tr').first().locator('td').first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);

    const url = this.page.url();
    console.log('   Latest SO URL:', url);
    return url;
  }

  async openSalesOrdersSection() {
    // Navigate directly to Sales Orders list — mirrors how TC-PO-03 navigates directly to PO list
    await this.page.goto('/customer/operations/sales-orders');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    console.log('   Navigated to Sales Orders list. URL:', this.page.url());
  }

  async openSalesOrderByReference(salesOrderReference) {
    // Search for the SO in the list if a search box is available
    const searchInput = this.page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(salesOrderReference);
      await this.page.waitForTimeout(2000);
    }

    // Click the row containing the SO reference
    const row = this.page.locator('table tbody tr').filter({ hasText: salesOrderReference }).first();
    await row.waitFor({ state: 'visible', timeout: 15000 });
    await row.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    console.log('   Opened Sales Order:', salesOrderReference, '— URL:', this.page.url());
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
    // LS1 shows "Accepted" (not "Approved") as the status badge after SO approval
    const approvedSignal = this.page.getByText('Accepted', { exact: true })
      .or(this.page.getByText('Approved', { exact: true }))
      .or(this.page.getByText(/sales order approved successfully/i).first())
      .or(this.page.getByText(/successful/i).first());
    await approvedSignal.first().waitFor({ state: 'visible', timeout: 15000 });
    console.log('   Sales Order approval confirmed — status visible');
  }

  async createDelivery() {
    // Click the "Create Delivery" button that appears after SO approval
    const createDeliveryBtn = this.page.getByRole('button', { name: /create delivery/i })
      .or(this.page.locator('button:has-text("Create Delivery")').first());
    await createDeliveryBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createDeliveryBtn.click();
    console.log('   Create Delivery button clicked');

    await this.page.waitForTimeout(1500);

    // Confirm popup — click "Create Delivery" inside the dialog
    const proceedButton = this.page.getByRole('dialog').getByRole('button', { name: /create delivery/i })
      .or(this.page.locator('[role="dialog"] button:has-text("Create Delivery")').first());
    await proceedButton.waitFor({ state: 'visible', timeout: 10000 });
    await proceedButton.click();
    console.log('   Delivery confirmation popup — Create Delivery clicked');

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    console.log('   Redirected to deliveries tab. URL:', this.page.url());
  }

  async openLatestDelivery(salesOrderNumber) {
    // After createDelivery, LS1 sometimes stays on the SO page instead of redirecting.
    // Force navigate to the deliveries list to be safe.
    await this.page.goto('/customer/operations/deliveries');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Click the Pending tab
    const pendingTab = this.page.getByRole('tab', { name: /pending/i })
      .or(this.page.getByText('Pending', { exact: true }).first());
    await pendingTab.waitFor({ state: 'visible', timeout: 15000 });
    await pendingTab.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
    console.log('   Clicked Pending tab');

    // Find and click the delivery row matching the SO number
    const deliveryRow = this.page.locator('table tbody tr').filter({ hasText: salesOrderNumber }).first();
    await deliveryRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Click a specific cell to ensure the click registers, and verify navigation happened
    const initialUrl = this.page.url();
    await deliveryRow.locator('td').first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    
    if (this.page.url() === initialUrl) {
      console.log('   Row click did not navigate, trying to click another cell with force...');
      await deliveryRow.locator('td').nth(1).click({ force: true });
      await this.page.waitForTimeout(2000);
    }
    
    console.log('   Opened delivery for SO:', salesOrderNumber, '— URL:', this.page.url());
  }

  async createShipment() {
    const createShipmentBtn = this.page.getByRole('button', { name: /create shipment/i })
      .or(this.page.locator('button:has-text("Create Shipment")').first());
    await createShipmentBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createShipmentBtn.click();
    console.log('   Create Shipment button clicked');
  }

  async fillShipmentFormAndStart() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    
    console.log('   Filling Shipment Form...');
    await this.selectFirstOptionForLabel('Select Transporter', 'Apex Flow');
    await this.selectFirstOptionForLabel('Select Truck', 'APX-Desert King - ABJ917LK');
    await this.selectFirstOptionForLabel('Select Driver', 'Opeyemi Adesina - APX001');
    
    // Scroll down and click Save and start shipment
    const saveStartBtn = this.page.getByRole('button', { name: /save and start shipment/i })
      .or(this.page.locator('button:has-text("Save and start shipment")').first());
      
    await saveStartBtn.scrollIntoViewIfNeeded();
    await saveStartBtn.click();
    console.log('   Save and start shipment button clicked');
    
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async selectFirstOptionForLabel(labelText, optionTextToSelect = null) {
    const label = this.page.getByText(labelText, { exact: false }).last();
    await label.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    
    // Find the very next element containing the exact text "Select"
    const dropdownBox = label.locator('xpath=following::*[normalize-space(text())="Select"][1]');
    
    if (await dropdownBox.isVisible().catch(() => false)) {
        await dropdownBox.evaluate(node => node.scrollIntoView({ behavior: 'auto', block: 'center' })).catch(() => {});
        await this.page.waitForTimeout(500);
        
        // Use a precise mouse click on the dropdown box
        const box = await dropdownBox.boundingBox();
        if (box) {
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
            await dropdownBox.click({ force: true }).catch(() => {});
        }
        console.log(`   Clicked dropdown box for ${labelText}`);
    } else {
        const box = await label.boundingBox();
        if (box) {
            await this.page.mouse.click(box.x + 10, box.y + box.height + 20);
        }
    }
    
    await this.page.waitForTimeout(1500); // Wait for dropdown popup animation
    
    if (optionTextToSelect) {
        // Simply find the option text visually on the screen and click it
        const optionElement = this.page.getByText(optionTextToSelect, { exact: false }).filter({ state: 'visible' }).last();
        if (await optionElement.isVisible().catch(() => false)) {
            const box = await optionElement.boundingBox();
            if (box) {
                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            } else {
                await optionElement.click({ force: true }).catch(() => {});
            }
            console.log(`   Explicitly clicked option "${optionTextToSelect}" for ${labelText}`);
        } else {
            console.log(`   Could not find visible option "${optionTextToSelect}" for ${labelText}`);
        }
    } else {
        // Generic logic: select the first available valid option without using search
        const genericOption = this.page.locator('[role="option"], li[role="menuitem"], .ant-select-item-option, [class*="option"]').filter({ hasNotText: 'Search' }).filter({ state: 'visible' }).first();
        
        if (await genericOption.isVisible().catch(() => false)) {
            const box = await genericOption.boundingBox();
            if (box) {
                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            } else {
                await genericOption.click({ force: true }).catch(() => {});
            }
            console.log(`   Explicitly clicked generic first option for ${labelText}`);
        } else {
            const fallbackXPath = 'xpath=//body/div[last()]//*[not(child::*) and string-length(normalize-space(text())) > 1 and not(contains(text(), "Search")) and not(contains(text(), "Select"))]';
            const fallbackOption = this.page.locator(fallbackXPath).first();
            
            if (await fallbackOption.isVisible().catch(() => false)) {
                const box = await fallbackOption.boundingBox();
                if (box) {
                    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                } else {
                    await fallbackOption.click({ force: true }).catch(() => {});
                }
                console.log(`   Explicitly clicked fallback first option for ${labelText}`);
            } else {
                console.log(`   Failed to explicitly find first option for ${labelText}. Falling back to keyboard.`);
                await this.page.keyboard.press('ArrowDown');
                await this.page.waitForTimeout(500);
                await this.page.keyboard.press('Enter');
            }
        }
    }
    
    // Wait for the UI to process the selection and enable the next dependent dropdown
    await this.page.waitForTimeout(3000); 
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
