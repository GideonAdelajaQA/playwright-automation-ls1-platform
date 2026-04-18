// tests/purchaseOrder.spec.js
require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { LoginPage }         = require('../Pages/LoginPage');
const { DashboardPage }     = require('../Pages/DashboardPage');
const { PurchaseOrderPage } = require('../Pages/PurchaseOrderPage');
const { SalesOrderPage }    = require('../Pages/SalesOrderPage');
const { TEST_DATA }         = require('../utils/testData');

const EMAIL = process.env.LS1_EMAIL || process.env.EMAIL;
const PASSWORD = process.env.LS1_PASSWORD || process.env.PASSWORD;
const DISTRIBUTOR_EMAIL = process.env.LS1_DISTRIBUTOR_EMAIL || process.env.DISTRIBUTOR_EMAIL;
const DISTRIBUTOR_PASSWORD = process.env.LS1_DISTRIBUTOR_PASSWORD || process.env.DISTRIBUTOR_PASSWORD;
const LOADING_STORE = process.env.LS1_LOADING_STORE || TEST_DATA.salesOrder.loadingStore;

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

test.describe.configure({ mode: 'serial' });

test.describe('LS1 Purchase Order Flow', () => {

  let context;
  let page;
  let createdPOUrl;     // store the URL of the created PO so TC-PO-03 can navigate directly
  let createdSOUrl;     // store the URL of the created SO so TC-SO-03 can navigate directly
  let poReference;
  let salesOrderNumber;
  let deliveryDate;

  test.beforeAll(async ({ browser }) => {
    if (!EMAIL || !PASSWORD) {
      throw new Error('Missing LS1 credentials. Set LS1_EMAIL and LS1_PASSWORD in your .env file.');
    }

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ── 1. Login ──────────────────────────────────────────────────────────────
  test('TC-PO-01 | User can log in as subdistributor', async () => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(EMAIL, PASSWORD);

    await expect(page.locator('a[href="/customer/dashboard"]')).toBeVisible({ timeout: 8000 });
    console.log('Login successful. Current URL:', page.url());
  });

  // ── 2. Raise a Purchase Order ─────────────────────────────────────────────
  test('TC-PO-02 | User can raise a Purchase Order', async () => {
    const dashboard = new DashboardPage(page);
    const poPage    = new PurchaseOrderPage(page);

    await dashboard.navigateToPurchaseOrders();
    await poPage.clickCreatePO();

    poReference = await poPage.fillPOForm({
      Distributor: TEST_DATA.po.Distributor,
      product:     TEST_DATA.po.product,
      quantity:    TEST_DATA.po.quantity,
    });

    await poPage.submitPO();
    console.log('PO submitted. Current URL:', page.url());

    // Give LS1 a moment to persist the new PO before refreshing the list view.
    await page.waitForTimeout(3000);

    await page.goto('/customer/operations/purchase-orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await poPage.openLatestPO();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    createdPOUrl = page.url();
    console.log('Created PO URL stored:', createdPOUrl);
    console.log('PO reference stored:', poReference);
  });

  // ── 3. Approve the Purchase Order ─────────────────────────────────────────
  test('TC-PO-03 | User can approve the newly created Purchase Order', async () => {
    const poPage = new PurchaseOrderPage(page);

    expect(createdPOUrl, 'Purchase order URL should be captured before approval').toBeTruthy();

    // Navigate directly to the PO detail page by URL
    console.log('Navigating directly to:', createdPOUrl);
    await page.goto(createdPOUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Approve
    await poPage.approvePO();

    const approvalSuccess = await page.getByText('Purchased order approved successfully').isVisible({ timeout: 5000 }).catch(() => false);
    expect(approvalSuccess).toBe(true);

    await poPage.logout();
  });

  test('TC-SO-01 | Manufacturer can log out and distributor can log in', async () => {
    const loginPage = new LoginPage(page);

    if (!DISTRIBUTOR_EMAIL || !DISTRIBUTOR_PASSWORD) {
      throw new Error('Missing distributor credentials. Set LS1_DISTRIBUTOR_EMAIL and LS1_DISTRIBUTOR_PASSWORD in your .env file.');
    }

    await loginPage.expectLoginPage();
    await loginPage.login(DISTRIBUTOR_EMAIL, DISTRIBUTOR_PASSWORD);

    await expect(page.locator('a[href="/customer/dashboard"]')).toBeVisible({ timeout: 10000 });
    console.log('Distributor login successful. Current URL:', page.url());
  });

  test('TC-SO-02 | Distributor can create a Sales Order from the approved Purchase Order', async () => {
    const salesOrderPage = new SalesOrderPage(page);

    expect(poReference, 'Purchase order reference should be available for sales order creation').toBeTruthy();

    deliveryDate = formatDate(new Date(Date.now() + TEST_DATA.salesOrder.leadDays * 24 * 60 * 60 * 1000));
    salesOrderNumber = `SO-${Date.now()}`;

    await salesOrderPage.openIncomingPurchaseOrders();
    await salesOrderPage.expectIncomingPurchaseOrdersPage();
    await salesOrderPage.openIncomingOrderByReference(poReference);
    await salesOrderPage.expectOrderReference(poReference);

    await salesOrderPage.clickSalesOrderButton();
    await salesOrderPage.expectSalesOrderForm();
    await salesOrderPage.fillSalesOrderForm({
      deliveryDate,
      salesOrderNumber,
      loadingStore: LOADING_STORE,
      paymentTerm: process.env.LS1_PAYMENT_TERM || TEST_DATA.salesOrder.paymentTerm,
      quantity: TEST_DATA.po.quantity,
    });
    await salesOrderPage.submitSalesOrder();
    await salesOrderPage.expectSalesOrderCreationSuccess(salesOrderNumber);

    // Navigate to SO list and grab the real detail URL — mirrors TC-PO-02 openLatestPO pattern
    createdSOUrl = await salesOrderPage.openLatestSOAndGetUrl();
    console.log('Sales Order created:', salesOrderNumber);
    console.log('Created SO URL stored:', createdSOUrl);
  });

  test('TC-SO-03 | Distributor can approve the SO, create Shipment, log out, and Subdistributor logs back in', async () => {
    const salesOrderPage = new SalesOrderPage(page);

    expect(salesOrderNumber, 'Sales order number should be captured before approval').toBeTruthy();

    // Navigate directly to the SO detail page by URL — mirrors TC-PO-03 pattern
    if (createdSOUrl) {
      console.log('Navigating directly to SO:', createdSOUrl);
      await page.goto(createdSOUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    } else {
      // Fallback: navigate via list and search
      await salesOrderPage.openSalesOrdersSection();
      await salesOrderPage.openSalesOrderByReference(salesOrderNumber);
    }

    await salesOrderPage.approveSalesOrder('approved');
    await salesOrderPage.expectSalesOrderApproved();
    console.log('   Sales Order approved:', salesOrderNumber);

    await salesOrderPage.createDelivery();
    await salesOrderPage.openLatestDelivery(salesOrderNumber);
    
    await salesOrderPage.createShipment();
    await salesOrderPage.fillShipmentFormAndStart();
    
    // Log out as distributor
    console.log('   Logging out distributor...');
    await salesOrderPage.logout();
    
    // Log back in as subdistributor
    console.log('   Logging back in as subdistributor...');
    const loginPage = new LoginPage(page);
    await loginPage.expectLoginPage();
    await loginPage.login(EMAIL, PASSWORD);
    
    await expect(page.locator('a[href="/customer/dashboard"]')).toBeVisible({ timeout: 10000 });
    console.log('   Subdistributor login successful. Current URL:', page.url());
  });

  test('TC-DEL-01 | Subdistributor can view In Transit deliveries', async () => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigateToDeliveries();
    
    // The page has a "Quick Summary" card at the top that also says "In Transit".
    // We use .last() to ensure we click the actual Tab in the lower half of the screen.
    const inTransitTab = page.getByRole('tab', { name: /in transit/i })
      .or(page.getByText('In Transit', { exact: true }).last());
      
    await inTransitTab.waitFor({ state: 'visible', timeout: 10000 });
    await inTransitTab.click({ force: true });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    console.log('   Navigated to In Transit tab. Current URL:', page.url());
    
    expect(salesOrderNumber, 'Sales order number must be available to find the delivery').toBeTruthy();
    
    // Locate the delivery row using the sales order number
    const row = page.locator('tr').filter({ hasText: salesOrderNumber }).first()
      .or(page.locator('.row, .list-item').filter({ hasText: salesOrderNumber }).first());
      
    await row.waitFor({ state: 'visible', timeout: 15000 });
    
    // Click the first occurrence of the SO number in that row (usually the Delivery ID cell)
    const clickableCell = row.getByText(salesOrderNumber, { exact: false }).first();
      
    const initialUrl = page.url();
    await clickableCell.click({ force: true });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // give the delivery details page time to load
    
    if (page.url() === initialUrl) {
      console.log('   Row click did not navigate, trying to click another cell with force...');
      await row.locator('td').nth(1).click({ force: true });
      await page.waitForTimeout(2000);
    }
    
    console.log(`   Opened In Transit delivery: ${salesOrderNumber}`);
    
    // Find and click the 'Complete POD' button
    const completePodBtn = page.getByRole('button', { name: /complete pod/i })
      .or(page.getByText('Complete POD', { exact: false }).first())
      .or(page.locator('button').filter({ hasText: /complete pod/i }).first());
      
    await completePodBtn.waitFor({ state: 'visible', timeout: 15000 });
    await completePodBtn.scrollIntoViewIfNeeded().catch(() => {});
    await completePodBtn.click();
    console.log('   Clicked initial Complete POD button');
    
    // Wait for the first Complete POD modal (Select Shipment) to appear
    await page.waitForTimeout(1000); // Give modal time to animate in
    
    // Click 'Proceed' in the modal
    const proceedBtn = page.locator('[role="dialog"], .modal, .ant-modal, .MuiDialog-root')
      .getByRole('button', { name: /proceed/i })
      .or(page.getByText('Proceed', { exact: true }).last())
      .or(page.getByRole('button', { name: /proceed/i }).last());
      
    await proceedBtn.waitFor({ state: 'visible', timeout: 10000 });
    await proceedBtn.click();
    console.log('   Clicked Proceed in Select Shipment modal');
    
    // Wait for the second step (Quantity confirmation) to appear
    await page.waitForTimeout(2000);

    // Fill the Quantity Received field
    // Since DOM structures can be unpredictable (labels detached from inputs, missing dialog roles),
    // we use a raw browser evaluation to definitively grab the last visible, editable input field on the page.
    const qtyReceivedInputHandle = await page.evaluateHandle(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        // Find inputs that are visible and can be typed into
        const editableInputs = inputs.filter(i => 
            i.offsetParent !== null && // visible
            !i.readOnly && 
            !i.disabled && 
            i.type !== 'hidden' &&
            i.type !== 'checkbox' &&
            i.type !== 'radio'
        );
        // The modal is on top, so its input is usually the last one in the DOM
        return editableInputs[editableInputs.length - 1];
    });

    // We can wrap the JS Handle into a Playwright Locator for standard actions
    const qtyReceivedLocator = page.locator('input').filter({ has: qtyReceivedInputHandle }).first().or(qtyReceivedInputHandle.asElement());
    
    // Use pressSequentially + Tab to ensure any React validation captures the value correctly
    await qtyReceivedInputHandle.click();
    await qtyReceivedInputHandle.fill('');
    await qtyReceivedInputHandle.type('10', { delay: 50 }); // type is supported on ElementHandle
    await page.keyboard.press('Tab');
    console.log('   Filled Quantity Received as 10');
    
    await page.waitForTimeout(1000);

    // Click the final Complete POD button inside the dialog
    const finalCompleteBtn = page.getByRole('dialog').getByRole('button', { name: /complete pod/i })
      .or(page.locator('[role="dialog"] button:has-text("Complete POD")').last())
      .or(page.getByRole('button', { name: /complete pod/i }).filter({ state: 'visible' }).last());

    await finalCompleteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await finalCompleteBtn.click();
    console.log('   Clicked final Complete POD confirmation');
    
    // --- FETCH OTP FROM YOPMAIL ---
    console.log('   Opening Yopmail to fetch OTP...');
    await page.waitForTimeout(3000); // Give backend time to send the email
    
    const mailPage = await page.context().newPage();
    await mailPage.goto('https://yopmail.com/en/');
    
    // Accept Yopmail cookies if the banner appears
    const acceptBtn = mailPage.locator('#accept');
    if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click().catch(() => {});
    }

    // Type email and enter inbox
    await mailPage.locator('#login').fill('gestid');
    await mailPage.keyboard.press('Enter');
    await mailPage.waitForLoadState('networkidle');
    
    let otpCode = null;
    // Loop to click refresh until the email arrives
    for (let i = 0; i < 6; i++) {
        await mailPage.waitForTimeout(2000);
        const iframe = mailPage.frameLocator('#ifmail');
        if (await iframe.locator('body').isVisible().catch(() => false)) {
            const emailText = await iframe.locator('body').innerText();
            // Find a 4, 5, or 6 digit code in the email text
            const match = emailText.match(/\b\d{4,6}\b/);
            if (match) {
                otpCode = match[0];
                break;
            }
        }
        console.log('   Refreshing Yopmail inbox...');
        await mailPage.locator('#refresh').click().catch(() => {});
    }
    
    expect(otpCode, 'Failed to fetch OTP from Yopmail within the time limit').toBeTruthy();
    console.log(`   Successfully fetched OTP Code: ${otpCode}`);
    await mailPage.close();
    
    // --- ENTER OTP IN LS1 ---
    // The OTP modal is now active on the main page. We grab the first available input.
    const otpInput = page.getByRole('dialog').locator('input').first()
        .or(page.locator('input[placeholder*="OTP" i], input[placeholder*="Code" i]').first());
        
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await otpInput.click();
    await otpInput.pressSequentially(otpCode, { delay: 100 });
    console.log('   Entered OTP into the input field');
    
    // Click the final verify/submit button
    const verifyBtn = page.getByRole('dialog').locator('button').filter({ hasText: /verify|submit|confirm|proceed|complete/i }).last()
        .or(page.locator('button').filter({ hasText: /verify|submit/i }).last());
        
    await verifyBtn.click();
    console.log('   Clicked Verify/Submit OTP');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

});
