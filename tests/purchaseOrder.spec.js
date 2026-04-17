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
  let createdPOUrl; // store the URL of the created PO so TC-PO-03 can navigate directly
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

    console.log('Sales Order created:', salesOrderNumber);
  });

  test('TC-SO-03 | Distributor can approve the newly created Sales Order and log out', async () => {
    const salesOrderPage = new SalesOrderPage(page);

    expect(salesOrderNumber, 'Sales order number should be captured before approval').toBeTruthy();

    await salesOrderPage.openSalesOrdersSection();
    await salesOrderPage.openSalesOrderByReference(salesOrderNumber);
    await salesOrderPage.approveSalesOrder('approved');
    await salesOrderPage.expectSalesOrderApproved();
    await salesOrderPage.logout();
  });

});
