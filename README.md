# CSE Amplitude Event Validation

Cypress-based framework for validating **Amplitude Tier-1 analytics events** on Common Sense Education pages.

This project focuses on verifying that critical analytics events (page views, search events, lesson views) are **actually emitted from the browser**, with the expected event types and core properties, in a real QA environment.

---

## Why Cypress (and not Jest)

The existing analytics Jest tests validate **enrichment logic in isolation** (unit-level correctness).  
This framework complements that by validating **end-to-end behavior**:

- Confirms events fire in a real browser session
- Captures outbound Amplitude requests (`fetch` / `sendBeacon`)
- Verifies events after consent, initialization, and page lifecycle
- Catches regressions that unit tests cannot (timing, consent, routing, SDK behavior)

In short:
- **Jest** → “Is the analytics code correct?”
- **Cypress** → “Does the event actually fire in production-like conditions?”

---

## What This Covers (Tier-1)

Tier-1 events are the highest-value analytics signals and are expected to fire reliably.

Current coverage includes:
- **Viewed Page**
  - `/education/search`
  - `/education/digital-literacy`
  - `/education/digital-citizenship`
  - `/education/uk/digital-citizenship`
- Search result page views (full results)

This framework is designed to be **extensible** as more Tier-1 events are added.

---

## How It Works (High Level)

1. Cypress visits a QA page
2. Amplitude traffic is captured by:
   - Intercepting `fetch` requests to `https://api2.amplitude.com/2/httpapi`
   - Capturing payloads sent via `navigator.sendBeacon`
3. Events are stored in-memory during the test run
4. Tests assert:
   - At least one Amplitude request was sent
   - Expected event types are present
   - (Optional) Core properties exist

This avoids relying on internal SDK state and validates **what actually leaves the browser**.

---

## Project Structure

```

cypress/
e2e/
amplitude_tier1.cy.js        # Tier-1 analytics tests
support/
commands.js                  # Custom Amplitude capture + assertions
cypress.config.js

````

---

## Running the Tests

### Install dependencies
```bash
npm install
````

### Run all analytics tests

```bash
npx cypress run --spec "cypress/e2e/amplitude_tier1.cy.js"
```

### Run in interactive mode

```bash
npx cypress open
```

---

## Environment Configuration

The QA base URL is set in `cypress.config.js`:

```js
baseUrl: process.env.CYPRESS_BASE_URL || 'https://qa.commonsense.org'
```

You can override it if needed:

```bash
CYPRESS_BASE_URL=https://qa.commonsense.org npx cypress run
```

---

## Notes / Known Considerations

* Amplitude events may be delayed due to:

  * consent gating (OneTrust)
  * SDK batching / flush timing
* Tests intentionally allow async wait windows to account for this
* This framework validates **presence and correctness**, not volume

---

## Future Improvements

* Add property-level assertions per event type
* Expand Tier-1 coverage beyond page views
* Integrate into CI once event behavior is finalized
* Optional reporting of captured event payloads

---

## Ownership

Maintained by Jawad Mustafa - QA - EDU

