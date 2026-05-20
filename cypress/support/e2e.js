// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Ignore known uncaught exceptions from the application that do not affect analytics.
Cypress.on('uncaught:exception', (err) => {
  const msg = String(err && err.message ? err.message : '')

  const ignoreList = [
    'once is not a function',
    'mutateObserve is not a function',
    "Cannot read properties of undefined (reading 'messages')",
    "Cannot read properties of undefined (reading 'PageState')",
    "Cannot read properties of null (reading 'cs.modal')",
    "Cannot read properties of undefined (reading 'get')",
  ]

  if (ignoreList.some((m) => msg.includes(m))) {
    return false
  }
})