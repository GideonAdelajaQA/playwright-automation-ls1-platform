# LS1 Automation Repository

This repository contains automated testing assets for the LS1 web platform. It currently covers:

- Playwright end-to-end UI flows for LS1 business workflows.
- A Playwright admin flow for creating transporters.
- k6 HTTP performance tests.
- JMeter HTTP load and stress tests.

The goal is to keep functional automation and performance automation in one place so LS1 can be tested consistently across UI behavior, business workflow completion, route availability, latency, and stress behavior.

## Repository Structure

```text
.
├── Pages/
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── PurchaseOrderPage.js
│   ├── SalesOrderPage.js
│   └── AdminLogisticsPage.js
├── tests/
│   ├── ls1-e2e-flow.spec.js
│   └── admin-transporter.spec.js
├── utils/
│   └── testData.js
├── performance/
│   ├── README.md
│   ├── k6/
│   │   └── ls1-http.js
│   └── jmeter/
│       └── ls1-http.jmx
├── playwright.config.js
├── package.json
├── .env.example
└── .gitignore
```

## What Each Area Does

### `Pages/`

Page Object Model classes for reusable browser actions.

- `LoginPage.js`: opens LS1 and logs users in.
- `DashboardPage.js`: navigates common customer dashboard sections.
- `PurchaseOrderPage.js`: creates and approves purchase orders.
- `SalesOrderPage.js`: creates and approves sales orders, creates deliveries, creates shipments, and completes delivery/POD-related actions.
- `AdminLogisticsPage.js`: navigates admin logistics and fills the transporter creation form.

### `tests/`

Playwright test specifications.

- `ls1-e2e-flow.spec.js`: full LS1 customer/distributor workflow covering login, purchase order creation, PO approval, sales order creation, SO approval, delivery, shipment, and POD completion.
- `admin-transporter.spec.js`: admin workflow for creating a transporter from the admin Logistics > Transporters area.

### `utils/testData.js`

Default test data used by the Playwright flows. Environment variables can override many of these values at runtime.

### `performance/`

Performance and stress testing assets.

- `performance/k6/ls1-http.js`: k6 script with smoke, load, and stress profiles.
- `performance/jmeter/ls1-http.jmx`: Apache JMeter test plan with configurable target host, threads, ramp-up, duration, and routes.
- `performance/README.md`: focused performance-test documentation.

### Generated Folders

These are runtime outputs and should not be committed:

- `test-results/`
- `playwright-report/`
- `performance/results/`
- `jmeter.log`

## Setup

Install Node dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install chromium
```

Create or update the main `.env` file for the existing LS1 E2E flow. Use `.env.example` as the starting point.

Required examples:

```env
BASE_URL=https://ls1dev.web.app
LS1_EMAIL=your-subdistributor-email
LS1_PASSWORD=your-subdistributor-password
LS1_DISTRIBUTOR_EMAIL=your-distributor-email
LS1_DISTRIBUTOR_PASSWORD=your-distributor-password
HEADLESS=false
SLOW_MO=500
USE_BRAVE=false
```

## Transporter Flow Config

The admin transporter test uses a separate local file named:

```text
transporte.env
```

This file is ignored by Git because it contains credentials and local file paths.

Example:

```env
LS1_ADMIN_EMAIL=admin@example.com
LS1_ADMIN_PASSWORD=your-password
LS1_TRANSPORTER_CODE_PREFIX=AUTO-TR
LS1_TRANSPORTER_NAME_PREFIX=Auto Transporter
LS1_TRANSPORTER_EMAIL=auto.transporter@yopmail.com
LS1_TRANSPORTER_PHONE=08012345678
LS1_TRANSPORTER_COUNTRY=Nigeria
LS1_TRANSPORTER_STATE=Lagos
LS1_TRANSPORTER_LOCAL_GOVERNMENT=Ikeja
LS1_TRANSPORTER_CITY=Lagos
LS1_TRANSPORTER_STREET=12 Automation Road
LS1_TRANSPORTER_ZIP_CODE=100001
LS1_TRANSPORTER_DOCUMENT_PATH="C:\Users\G\Documents\CCA.docx"
LS1_TRANSPORTER_DOCUMENT_NAME=Transporter License
LS1_TRANSPORTER_ISSUE_DATE=01/01/2025
LS1_TRANSPORTER_EXPIRY_DATE=31/12/2026
LS1_TRANSPORTER_DOCUMENT_NUMBER=DOC123456
LS1_TRANSPORTER_ISSUING_AUTHORITY=Lagos State Ministry of Transport
LS1_TRANSPORTER_CONTACT_FIRST_NAME=Automation
LS1_TRANSPORTER_CONTACT_LAST_NAME=User
LS1_TRANSPORTER_CONTACT_EMAIL=auto.contact@yopmail.com
LS1_TRANSPORTER_CONTACT_PHONE=08087654321
LS1_TRANSPORTER_RELATIONSHIP=Sibling
LS1_TRANSPORTER_PHOTO_PATH="C:\Users\G\Documents\cassius.jpg"
```

The document and photo paths must point to real files on the local PC running the test.

## Run Playwright Tests

Run the full Playwright suite:

```bash
npm test
```

Run in headed mode:

```bash
npm run test:headed
```

Run the admin transporter flow only:

```bash
npm run test:admin-transporter
```

Open Playwright UI mode:

```bash
npm run test:ui
```

View the latest HTML report:

```bash
npm run report
```

## What The Main E2E Flow Achieves

The main LS1 E2E test validates that core order and logistics workflows can be completed by the correct user roles.

It covers:

1. Subdistributor login.
2. Purchase order creation.
3. Purchase order approval.
4. Distributor login.
5. Sales order creation from the approved purchase order.
6. Sales order approval.
7. Delivery creation.
8. Shipment creation.
9. Subdistributor login.
10. Delivery/POD completion.

This is a functional regression test for the core LS1 order lifecycle.

## What The Transporter Flow Achieves

The admin transporter test validates that an admin can create a transporter from the logistics area.

It covers:

1. Admin login.
2. Navigation to Logistics.
3. Navigation to Transporters.
4. Opening the Create Transporter form.
5. Filling transporter details.
6. Filling contact address.
7. Uploading a document from the local PC.
8. Filling supporting document metadata.
9. Filling contact person details.
10. Uploading a contact photo from the local PC.
11. Clicking `Save Changes`.

## Run k6 Performance Tests

k6 must be installed and available on `PATH`.

Smoke:

```bash
npm run perf:k6:smoke
```

Load:

```bash
npm run perf:k6:load
```

Stress:

```bash
npm run perf:k6:stress
```

Useful override:

```bash
k6 run -e SCENARIO=stress -e TARGET_URL=https://ls1dev.web.app performance/k6/ls1-http.js
```

## Run JMeter Performance Tests

Apache JMeter must be installed and available on `PATH`.

Smoke:

```bash
npm run perf:jmeter:smoke
```

Load:

```bash
npm run perf:jmeter:load
```

Stress:

```bash
npm run perf:jmeter:stress
```

Generate a JMeter HTML report after a run:

```bash
jmeter -g performance/results/jmeter-load.jtl -o performance/results/jmeter-load-report
```

The output report folder must not already exist.

## Debugging

Use headed mode first when selectors or dropdowns need calibration:

```bash
npm run test:headed
```

Run only one spec:

```bash
npx playwright test tests/admin-transporter.spec.js
```

Open a trace after a failure:

```bash
npx playwright show-trace test-results/<failed-test-folder>/trace.zip
```

Failure artifacts are written to `test-results/`.

## Notes

- Do not commit `.env` or `transporte.env`.
- Do not commit generated reports or performance output.
- Update `utils/testData.js` when a stable default test value changes.
- Use environment variables for credentials and local-only values such as upload file paths.
