// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://qa.commonsense.org',
    supportFile: 'cypress/support/e2e.js',
    chromeWebSecurity: false,
    video: false,

    defaultCommandTimeout: 10000,
    pageLoadTimeout: 90000,
    requestTimeout: 30000,
    responseTimeout: 30000,

    env: {
      AMPLITUDE_CAPTURE_ENABLED: true,
      AMPLITUDE_ENDPOINT_PATTERNS: [
        'https://api2.amplitude.com/2/httpapi',
      ],
    },
  },
};




