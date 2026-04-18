# LS1 Playwright Test Suite
**Flow covered:** Login → Raise Purchase Order → Approve Purchase Order

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers (first time only)
npx playwright install chromium

# 3. Copy and update your .env (already pre-filled with gestid credentials)
#    Open .env and confirm values are correct
```

---

## Run Tests

```bash
# Headed (watch the browser — recommended first run)
npm run test:headed

# Headless (fast, for CI)
npm test

# Interactive UI mode (Playwright's built-in test explorer)
npm run test:ui

# View HTML report after a run
npm run report
```

---

## Project Structure

```
ls1-playwright/
├── pages/
│   ├── LoginPage.js           # Login form interactions
│   ├── DashboardPage.js       # Sidebar navigation
│   └── PurchaseOrderPage.js   # PO list, form, and detail actions
├── tests/
│   └── purchaseOrder.spec.js  # Main test file (3 tests, serial)
├── utils/
│   └── testData.js            # Supplier name, product name, quantity
├── .env                       # Credentials (never commit this)
├── .gitignore
├── package.json
└── playwright.config.js
```

---

## Before First Run — Calibrate Selectors

The PO form uses Radix UI comboboxes 
Do these two things before running:

1. **Update `utils/testData.js`** — replace `RetroSip Nigeria Ltd` and `Malta`
   with the exact supplier and product names visible in the gestid account dropdown.

2. **Check sidebar link text** — open the app, log in manually, and confirm
   the sidebar link says exactly "Purchase Order" (or whatever it says).
   Update `DashboardPage.js → purchaseOrdersLink` selector if different.

3. **Run headed first** — watch the browser so you can spot where it gets stuck
   and adjust selectors in the relevant Page Object.

---

## Debugging Tips

- Set `headless: false` and `slowMo: 500` in `playwright.config.js` to slow things down
- Run a single test: `npx playwright test --grep "TC-PO-01"`
- Screenshots and videos on failure are saved to `test-results/`
- If a combobox isn't opening, inspect its `role` attribute in DevTools
  and update the `selectDropdownOption()` helper in `PurchaseOrderPage.js`
