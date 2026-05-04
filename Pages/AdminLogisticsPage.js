// pages/AdminLogisticsPage.js
const fs = require('fs');
const path = require('path');

class AdminLogisticsPage {
  constructor(page) {
    this.page = page;
    this.createTransporterButton = page.getByRole('button', { name: /create transporter|add transporter|new transporter/i })
      .or(page.getByRole('link', { name: /create transporter|add transporter|new transporter/i }))
      .first();
  }

  async pauseAfterAction(ms = 1000) {
    await this.page.waitForTimeout(ms);
  }

  async openTransporters() {
    const logisticsMenu = this.page.getByRole('button', { name: /logistics/i })
      .or(this.page.getByRole('link', { name: /logistics/i }))
      .or(this.page.getByText('Logistics', { exact: true }))
      .first();

    if (await logisticsMenu.isVisible().catch(() => false)) {
      await logisticsMenu.click();
      await this.pauseAfterAction();
    }

    const transportersLink = this.page.getByRole('link', { name: /transporters/i })
      .or(this.page.getByRole('button', { name: /transporters/i }))
      .or(this.page.getByText('Transporters', { exact: true }))
      .first();

    if (await transportersLink.isVisible().catch(() => false)) {
      await transportersLink.click();
    } else {
      await this.gotoTransportersDirectly();
    }

    await this.page.waitForLoadState('networkidle');
    await this.pauseAfterAction();
  }

  async gotoTransportersDirectly() {
    const candidatePaths = [
      '/admin/logistics/transporters',
      '/admin/transporters',
      '/customer/logistics/transporters',
      '/customer/operations/transporters',
    ];

    for (const path of candidatePaths) {
      await this.page.goto(path);
      await this.page.waitForLoadState('networkidle').catch(() => {});
      await this.pauseAfterAction(500);

      if (await this.page.getByText(/transporters/i).first().isVisible().catch(() => false)) {
        return;
      }
    }
  }

  async clickCreateTransporter() {
    if (!await this.createTransporterButton.isVisible().catch(() => false)) {
      const fallbackCreateButton = this.page.locator('button, a')
        .filter({ hasText: /create|add|new/i })
        .first();
      await fallbackCreateButton.waitFor({ state: 'visible', timeout: 10000 });
      await fallbackCreateButton.click();
    } else {
      await this.createTransporterButton.click();
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.pauseAfterAction();
  }

  async fillTransporterForm(transporter) {
    await this.fillFieldAfterLabel('Transporter Code', transporter.code, { required: true });
    await this.fillFieldAfterLabel('Transporter Name', transporter.name, { required: true });
    await this.fillFieldAfterLabel('Transporter Email', transporter.email, { required: true });
    await this.fillFieldAfterLabel('Phone Number', transporter.phone, { required: true, occurrence: 0 });

    await this.fillFieldAfterLabel('Country', transporter.country);
    await this.selectDropdownAfterLabel('State', transporter.state);
    await this.fillFieldAfterLabel('Local Government', transporter.localGovernment);
    await this.fillFieldAfterLabel('City', transporter.city);
    await this.fillFieldAfterLabel('Street', transporter.street);
    await this.fillFieldAfterLabel('Zip Code', transporter.zipCode);

    await this.uploadFile(transporter.documentPath, {
      inputIndex: 0,
      trigger: this.page.getByRole('button', { name: /choose file/i }).first(),
    });
    await this.fillFieldAfterLabel('Document Name', transporter.documentName);
    await this.fillFieldAfterLabel('Issue Date', transporter.issueDate);
    await this.fillFieldAfterLabel('Expiry Date', transporter.expiryDate);
    await this.fillFieldAfterLabel('Document Number', transporter.documentNumber);
    await this.fillFieldAfterLabel('Issuing Authority', transporter.issuingAuthority);

    await this.fillFieldAfterLabel('First Name', transporter.contactFirstName);
    await this.fillFieldAfterLabel('Last name', transporter.contactLastName);
    await this.fillFieldAfterLabel('Email Address', transporter.contactEmail);
    await this.fillFieldAfterLabel('Phone Number', transporter.contactPhone, { occurrence: 1 });
    await this.selectDropdownAfterLabel('Relationship', transporter.relationship);
    await this.uploadFile(transporter.photoPath, {
      inputIndex: 1,
      trigger: this.page.getByText(/upload\s*photo/i).first(),
    });
  }

  async submitTransporterForm() {
    const submitButton = this.page.getByRole('button', { name: /^save changes$/i })
      .or(this.page.locator('button').filter({ hasText: /^Save Changes$/ }))
      .first();

    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForFunction(() => {
      const buttons = [...document.querySelectorAll('button')];
      const saveChangesButton = buttons.find(button => button.textContent.trim().toLowerCase() === 'save changes');
      return saveChangesButton && !saveChangesButton.disabled && saveChangesButton.getAttribute('aria-disabled') !== 'true';
    }, null, { timeout: 15000 });
    await submitButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.pauseAfterAction(1500);
  }

  async expectTransporterCreated(transporterName) {
    const successSignal = this.page.getByText(/transporter.*created|created.*success|successfully|saved/i)
      .or(this.page.getByText(transporterName, { exact: false }))
      .first();

    await successSignal.waitFor({ state: 'visible', timeout: 15000 });
  }

  async fillFieldAfterLabel(labelText, value, options = {}) {
    if (!value) {
      return false;
    }

    const field = this.findFieldByLabel(labelText, options.occurrence || 0);
    if (!await field.isVisible().catch(() => false)) {
      if (options.required) {
        throw new Error(`Could not find required transporter field: ${labelText}`);
      }
      return false;
    }

    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click();
    const inputType = await field.getAttribute('type').catch(() => null);
    const fillValue = inputType === 'date' ? this.toDateInputValue(value) : String(value);
    await field.fill(fillValue);
    await field.press('Tab').catch(() => {});
    await this.pauseAfterAction(250);
    return true;
  }

  findFieldByLabel(labelText, occurrence = 0) {
    const labelPattern = new RegExp(this.escapeRegExp(labelText), 'i');

    if (/^phone number$/i.test(labelText) && occurrence === 0) {
      return this.page.getByPlaceholder(/enter phone no/i).first()
        .or(this.page.locator('input[placeholder*="phone" i]').first());
    }

    const exactLabelXpath = `(//*[normalize-space(text())=${this.xpathLiteral(labelText)}])[${occurrence + 1}]`;
    const fieldNearLabel = this.page.locator(`xpath=${exactLabelXpath}/following::input[1]`).first()
      .or(this.page.locator(`xpath=${exactLabelXpath}/following::textarea[1]`).first());

    if (occurrence > 0) {
      return fieldNearLabel;
    }

    return fieldNearLabel
      .or(this.page.getByLabel(labelPattern).first())
      .or(this.page.locator(`input[placeholder*="${labelText}" i], textarea[placeholder*="${labelText}" i]`).first())
      .or(this.page.locator(`input[name*="${this.toAttributeFragment(labelText)}" i], textarea[name*="${this.toAttributeFragment(labelText)}" i]`).first());
  }

  async selectDropdownAfterLabel(labelText, optionText) {
    if (!optionText) {
      return false;
    }

    const dropdown = this.page.getByText(new RegExp(this.escapeRegExp(labelText), 'i'))
      .first()
      .locator('xpath=following::*[@role="combobox" or self::button][1]');

    await dropdown.waitFor({ state: 'visible', timeout: 10000 });
    await dropdown.scrollIntoViewIfNeeded().catch(() => {});
    await dropdown.click({ force: true });
    await this.pauseAfterAction(700);

    const option = this.page.getByRole('option', { name: new RegExp(this.escapeRegExp(optionText), 'i') })
      .or(this.page.getByText(new RegExp(this.escapeRegExp(optionText), 'i')))
      .last();

    if (await option.isVisible().catch(() => false)) {
      await option.click({ force: true });
    } else {
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
    }

    await this.pauseAfterAction(500);
    return true;
  }

  async uploadFile(filePath, { inputIndex = 0, trigger = null } = {}) {
    if (!filePath) {
      return false;
    }

    const normalizedPath = String(filePath).replace(/^["']|["']$/g, '');
    const resolvedPath = path.resolve(normalizedPath);
    if (!fs.existsSync(resolvedPath)) {
      console.log(`   Skipping upload because file does not exist: ${resolvedPath}`);
      return false;
    }

    if (trigger && await trigger.isVisible().catch(() => false)) {
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await trigger.click({ force: true });

      const fileChooser = await fileChooserPromise;
      if (fileChooser) {
        await fileChooser.setFiles(resolvedPath);
        await this.pauseAfterAction(500);
        return true;
      }
    }

    const fileInput = this.page.locator('input[type="file"]').nth(inputIndex);
    if (!await fileInput.count().catch(() => 0)) {
      console.log(`   Skipping upload because file input ${inputIndex} was not found`);
      return false;
    }

    await fileInput.setInputFiles(resolvedPath);
    await this.pauseAfterAction(500);
    return true;
  }

  escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  toAttributeFragment(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  toDateInputValue(value) {
    const text = String(value);
    const dayMonthYear = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dayMonthYear) {
      const [, day, month, year] = dayMonthYear;
      return `${year}-${month}-${day}`;
    }

    return text;
  }

  xpathLiteral(text) {
    const value = String(text);
    if (!value.includes("'")) {
      return `'${value}'`;
    }

    if (!value.includes('"')) {
      return `"${value}"`;
    }

    return `concat('${value.replace(/'/g, `', "'", '`)}')`;
  }
}

module.exports = { AdminLogisticsPage };
