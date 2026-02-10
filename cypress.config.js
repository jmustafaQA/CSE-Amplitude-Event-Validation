// cypress.config.js
export default {
  e2e: {
    baseUrl: "https://qa.commonsense.org",
    setupNodeEvents(on, config) {
      on("task", {
        log(message) {
          // prints to terminal
          console.log(message);
          return null;
        },
        logJson(obj) {
          console.log(JSON.stringify(obj, null, 2));
          return null;
        },
      });

      return config;
    },
  },
};


















