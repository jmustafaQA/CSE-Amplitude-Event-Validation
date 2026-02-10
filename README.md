# CSE Amplitude Event Validation

Cypress-based framework for validating critical Amplitude analytics events on Common Sense Education pages.

This project verifies that high-value analytics events are actually emitted from the browser, delivered to Amplitude over the network, and include the expected CMS and routing metadata in a real QA environment.

This is end-to-end analytics contract validation.

---

## Why Cypress Is Used

Cypress is used because analytics behavior depends on real browser conditions.

This framework requires:
- A real browser session
- Consent gating via OneTrust
- SDK initialization timing
- Page lifecycle events (load, navigation, interaction)
- Network-level verification of what is sent to Amplitude

Cypress allows us to:
- Control consent state before page load
- Capture outbound network traffic (fetch and sendBeacon)
- Validate events after the SDK initializes
- Assert behavior that only occurs in a real browser

This ensures analytics events are validated in production-like conditions, not simulated environments.

---

## Tier Definition

This suite started as Tier-1 smoke coverage and now validates analytics contracts.

Events covered here are:
- Release-critical
- Expected to fire on every visit
- Required for reporting accuracy

Assertions intentionally include stable CMS identifiers (node IDs, content types) to prevent silent analytics regressions during frontend or CMS changes.

This can be considered Tier-1 user journeys with Tier-1+ contract validation.

---

## What This Covers

### Page View Events
- Viewed Search
  - /education/search
- Viewed Lesson Info
  - /education/digital-literacy
  - /education/digital-citizenship
  - /education/uk/digital-citizenship
- Viewed Edu Home Page
  - /education
- Viewed Lesson Plan
  - /education/digital-literacy/what-is-media

### Interaction Events
- Clicked EDU Homepage Hero CTA (See the lessons)

Each test asserts:
- Correct event_type
- Correct route (page_url_path)
- Correct CMS entity metadata (cse_entity_id, cse_content_type)
- Successful page load (page_http_status_code)
- Confirmed outbound delivery to Amplitude

---

## How It Works

1. Cypress visits a QA page
2. Amplitude traffic is captured by:
   - Intercepting fetch requests to https://api2.amplitude.com/2/httpapi
   - Capturing payloads sent via navigator.sendBeacon
3. Events are stored in-memory during the test run
4. Tests assert:
   - At least one Amplitude HTTP request was sent
   - Expected event types are present
   - Event payloads contain stable, expected properties
5. When a test passes, the exact matched event payload is logged

This validates what actually leaves the browser.

---

## Project Structure

cypress/
  e2e/
    amplitude_tier1.cy.js
  support/
    commands.js
cypress.config.js

---

## Running the Tests

Install dependencies:

npm install

Run analytics validation:

npx cypress run --spec "cypress/e2e/amplitude_tier1.cy.js"

Interactive mode:

npx cypress open

---

## Environment Configuration

The QA base URL is set in cypress.config.js:

baseUrl: process.env.CYPRESS_BASE_URL || 'https://qa.commonsense.org'

Override if needed:

CYPRESS_BASE_URL=https://qa.commonsense.org npx cypress run

---

## Notes / Known Considerations

- Amplitude events may be delayed due to:
  - OneTrust consent gating
  - SDK batching and flush timing
- Tests include async wait windows to account for this
- This framework validates presence and correctness, not volume
- Viewport, session, timing, and device fields are intentionally excluded from assertions

---

## Future Improvements

- Expand interaction coverage (filters, carousels, grade selectors)
- Introduce explicit Tier-2 suite for secondary interactions
- CI enforcement once analytics contracts stabilize
- Optional payload snapshots for historical comparison

---

## Ownership

Maintained by Jawad Mustafa  
QA – Common Sense Education


