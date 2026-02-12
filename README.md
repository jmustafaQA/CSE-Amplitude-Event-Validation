# CSE Amplitude Event Validation

Cypress-based framework for validating critical Amplitude analytics events on Common Sense Education pages.

This project verifies that high-value analytics events are:

* Emitted from the browser
* Delivered to Amplitude over the network
* Structured with correct CMS metadata and routing information
* Aligned with expected analytics contract guarantees

This is end-to-end analytics contract validation in a real QA environment.

---

## Why Cypress Is Used

Cypress is used because analytics behavior depends on real browser conditions.

This framework requires:

* A real browser session
* Consent gating via OneTrust
* Amplitude SDK initialization timing
* Page lifecycle events (load, navigation, interaction)
* Network-level verification of outbound analytics traffic

Cypress allows us to:

* Control consent state before page load
* Capture outbound traffic (`fetch` + `sendBeacon`)
* Validate events after SDK initialization
* Assert behavior that only occurs in real browser execution

This ensures analytics events are validated in production-like conditions, not simulated environments.

---

## Suite Scope

This suite started as Tier-1 smoke coverage and has evolved into analytics contract validation.

Events covered here are:

* Release-critical
* Expected to fire on page visit or primary interaction
* Required for reporting accuracy
* Stable across frontend refactors and CMS changes

Assertions intentionally include stable CMS identifiers (node IDs, content types, route names) to prevent silent analytics regressions.

This is Tier-1 user journey validation with contract-level enforcement.

---

## What This Covers

### Viewed (Page View) Events

* Viewed Search

  * `/education/search`

* Viewed Lesson Info

  * `/education/digital-literacy`
  * `/education/digital-citizenship`
  * `/education/uk/digital-citizenship`

* Viewed Edu Home Page

  * `/education`

* Viewed Lesson Plan

  * `/education/digital-literacy/what-is-media`

* Viewed Course

  * `/education/training/teaching-digital-literacy-and-well-being`

* Viewed Article

  * `/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times`

---

### Clicked / Interaction Events

* Clicked Element (Hero CTA, video modal triggers, teaser elements)
* Clicked Element (Collection featured video teaser)
* Clicked Element (Video player controls)

---

### Video Lifecycle Events

* Played Video
* Paused Video
* Video Progress
* Completed Video

Video events validate:

* Correct page route
* Video provider
* Video title and URL
* Playback metadata (state, initiator, reason)
* CMS entity alignment

---

## What Each Test Verifies

Each case validates:

* Correct `event_type`
* Correct `page_url_path`
* Correct CMS metadata:

  * `cse_entity_id`
  * `cse_content_type`
  * `cse_entity_group`
* Successful page load (`page_http_status_code`)
* Expected interaction metadata (for click events)
* Video metadata integrity (for video lifecycle events)
* Confirmed outbound delivery to Amplitude

This validates what actually leaves the browser, not just what the SDK claims to emit.

---

## How It Works

1. Cypress visits a QA page using a controlled consent state.
2. Amplitude traffic is captured by:

   * Intercepting requests to:

     ```
     https://api2.amplitude.com/2/httpapi
     ```
   * Capturing payloads sent via `navigator.sendBeacon`
3. Events are stored in-memory during the test run.
4. Tests assert:

   * At least one Amplitude HTTP request was sent
   * Expected event types are present
   * Event payloads satisfy defined property predicates
5. Logging is intentionally minimal:

   * Only confirmation that event was verified
   * Only failures surface detailed diagnostics

This keeps output clean while preserving deep validation logic.

---

## Project Structure

```
cypress/
  e2e/
    amplitude_tier1.cy.js
  support/
    commands.js
cypress.config.js
```

* `commands.js`
  Contains capture logic, event buffering, predicate matching, and assertion helpers.

* `amplitude_tier1.cy.js`
  Defines viewed, click, and video validation cases using a structured case-driven pattern.

---

## Running the Tests

Install dependencies:

```
npm install
```

Run analytics validation:

```
npx cypress run --spec "cypress/e2e/amplitude_tier1.cy.js"
```

Interactive mode:

```
npx cypress open
```

---

## Environment Configuration

The QA base URL is set in `cypress.config.js`:

```
baseUrl: process.env.CYPRESS_BASE_URL || 'https://qa.commonsense.org'
```

Override if needed:

```
CYPRESS_BASE_URL=https://qa.commonsense.org npx cypress run
```

---

## Design Principles

* Validate stable identifiers, not volatile fields
* Exclude environment-dependent properties:

  * Viewport dimensions
  * Device user agent
  * Session IDs
  * Timing metadata
* Fail fast when:

  * Event not emitted
  * Event emitted but contract predicate fails
* Keep logging minimal to reduce noise

---

## Known Considerations

* Amplitude events may be delayed due to:

  * OneTrust consent gating
  * SDK batching and flush timing
* Tests include async wait windows to account for batching
* This validates correctness and presence, not volume or reporting aggregation

---

## Future Improvements

* Separate Tier-2 interaction suite
* Snapshot-based payload diffing for contract drift detection
* CI enforcement once analytics contracts stabilize
* Dedicated helper for video lifecycle grouping

---

## Ownership

Maintained by
Jawad Mustafa
QA – Common Sense Education


