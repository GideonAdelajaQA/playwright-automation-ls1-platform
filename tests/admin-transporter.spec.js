require('dotenv').config({ path: 'transporte.env' });
require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../Pages/LoginPage');
const { AdminLogisticsPage } = require('../Pages/AdminLogisticsPage');
const { TEST_DATA } = require('../utils/testData');

const ADMIN_EMAIL = process.env.LS1_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.LS1_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

test.describe('LS1 Admin Transporter Flow', () => {
  test('TC-ADMIN-TR-01 | Admin can create a transporter', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('Missing admin credentials. Set LS1_ADMIN_EMAIL and LS1_ADMIN_PASSWORD in your .env file.');
    }

    const loginPage = new LoginPage(page);
    const logisticsPage = new AdminLogisticsPage(page);
    const transporter = {
      ...TEST_DATA.transporter,
      code: `${process.env.LS1_TRANSPORTER_CODE_PREFIX || TEST_DATA.transporter.codePrefix}-${Date.now()}`,
      name: `${process.env.LS1_TRANSPORTER_NAME_PREFIX || TEST_DATA.transporter.namePrefix}-${Date.now()}`,
      email: process.env.LS1_TRANSPORTER_EMAIL || TEST_DATA.transporter.email,
      phone: process.env.LS1_TRANSPORTER_PHONE || TEST_DATA.transporter.phone,
      country: process.env.LS1_TRANSPORTER_COUNTRY || TEST_DATA.transporter.country,
      state: process.env.LS1_TRANSPORTER_STATE || TEST_DATA.transporter.state,
      localGovernment: process.env.LS1_TRANSPORTER_LOCAL_GOVERNMENT || TEST_DATA.transporter.localGovernment,
      city: process.env.LS1_TRANSPORTER_CITY || TEST_DATA.transporter.city,
      street: process.env.LS1_TRANSPORTER_STREET || TEST_DATA.transporter.street,
      zipCode: process.env.LS1_TRANSPORTER_ZIP_CODE || TEST_DATA.transporter.zipCode,
      documentPath: process.env.LS1_TRANSPORTER_DOCUMENT_PATH || TEST_DATA.transporter.documentPath,
      documentName: process.env.LS1_TRANSPORTER_DOCUMENT_NAME || TEST_DATA.transporter.documentName,
      issueDate: process.env.LS1_TRANSPORTER_ISSUE_DATE || TEST_DATA.transporter.issueDate,
      expiryDate: process.env.LS1_TRANSPORTER_EXPIRY_DATE || TEST_DATA.transporter.expiryDate,
      documentNumber: process.env.LS1_TRANSPORTER_DOCUMENT_NUMBER || TEST_DATA.transporter.documentNumber,
      issuingAuthority: process.env.LS1_TRANSPORTER_ISSUING_AUTHORITY || TEST_DATA.transporter.issuingAuthority,
      contactFirstName: process.env.LS1_TRANSPORTER_CONTACT_FIRST_NAME || TEST_DATA.transporter.contactFirstName,
      contactLastName: process.env.LS1_TRANSPORTER_CONTACT_LAST_NAME || TEST_DATA.transporter.contactLastName,
      contactEmail: process.env.LS1_TRANSPORTER_CONTACT_EMAIL || TEST_DATA.transporter.contactEmail,
      contactPhone: process.env.LS1_TRANSPORTER_CONTACT_PHONE || TEST_DATA.transporter.contactPhone,
      relationship: process.env.LS1_TRANSPORTER_RELATIONSHIP || TEST_DATA.transporter.relationship,
      photoPath: process.env.LS1_TRANSPORTER_PHOTO_PATH || TEST_DATA.transporter.photoPath,
    };

    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page.locator('body')).toContainText(/dashboard|admin|logistics/i, { timeout: 15000 });

    await logisticsPage.openTransporters();
    await expect(page.locator('body')).toContainText(/transporters/i, { timeout: 15000 });

    await logisticsPage.clickCreateTransporter();
    await logisticsPage.fillTransporterForm(transporter);
    await logisticsPage.submitTransporterForm();
    await logisticsPage.expectTransporterCreated(transporter.name);
  });
});
