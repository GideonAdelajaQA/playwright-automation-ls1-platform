# LS1 Exploration Agent

An AI-powered QA exploration agent that autonomously crawls the LS1 platform,
maps every page, and generates a prioritised test backlog — ready to feed into
the test-generation agent.

## How it works

```
Login → Capture DOM snapshot → Claude analyses page → Enqueue navigation targets
     ↑                                                                          ↓
     └──────────────────── Navigate to next target ────────────────────────────┘
                                     ↓ (when done)
                          Claude synthesises test map
                                     ↓
                     test-map.json + exploration-report.md
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browser
npx playwright install chromium

# 3. Configure your environment
cp .env.example .env
# Edit .env with your LS1 URL, credentials, and role
```

## Run

```bash
# Full exploration as distributor_manager (default)
npm run explore

# Watch mode — see the browser navigate live
npm run explore:watch

# Quick 5-page run to test your setup
npm run explore:fast

# Explore as different roles (each produces a separate test map)
npm run explore:distributor
npm run explore:sales
npm run explore:admin
```

## Output

After a run, `output/` contains:

| File | What it is |
|------|------------|
| `test-map.json` | Machine-readable map used by the test-gen agent |
| `exploration-report.md` | Human-readable summary with prioritised backlog |
| `screenshots/page-001.png` | One screenshot per page visited |

## test-map.json structure

```json
{
  "meta": { "role": "...", "pagesVisited": 12, "totalScenariosFound": 47 },
  "pages": [
    {
      "url": "https://...",
      "pageName": "Create Purchase Order",
      "pageType": "form",
      "primaryWorkflow": "...",
      "testScenarios": [
        {
          "id": "TC-AUTO-001",
          "title": "Submit PO with valid vendor and items",
          "type": "happy_path",
          "priority": "high",
          "steps": ["...", "..."],
          "expectedResult": "...",
          "requiredSelectors": ["vendor dropdown", "submit button"]
        }
      ],
      "pageObjects": {
        "suggestedClassName": "CreatePurchaseOrderPage",
        "keyLocators": [
          { "name": "vendorDropdown", "strategy": "getByRole('combobox', { name: 'Vendor' })", "purpose": "Select vendor" }
        ]
      }
    }
  ],
  "criticalFlows": [...],
  "prioritisedBacklog": [...]
}
```

## Config reference (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | required | Your Anthropic API key |
| `LS1_BASE_URL` | required | Base URL of the LS1 app |
| `LS1_USERNAME` | required | Login username |
| `LS1_PASSWORD` | required | Login password |
| `EXPLORE_AS_ROLE` | `distributor_manager` | Role label passed to Claude for context |
| `MAX_PAGES` | `20` | Stop after visiting this many pages |
| `SCREENSHOT_ON_EACH` | `true` | Capture screenshot at every page |
| `HEADLESS` | `true` | Set to `false` to watch the browser |

## Customising login selectors

If LS1 uses non-standard login field names, edit `src/login.js`.
The `emailSelectors` and `passwordSelectors` arrays try multiple strategies in order.

## Next step

Feed `output/test-map.json` into the **test-generation agent** which will
produce Playwright test files in your existing POM structure.
