describe('Amplitude Tier-1 Analytics', () => {
  it('fires "Viewed Page" on /education/search full results page view', () => {
    cy.visitWithAmplitudeCapture('/education/search?keywords=privacy');

    // Debug helper (remove once stable)
    cy.logCapturedAmplitudeEventTypes();

    cy.assertAmplitudeEvent('Viewed Page', {
      timeout: 60000,
      predicate: (ev) => {
        const props = ev.event_properties || {};
        return (
          props.page_url_path === '/education/search' &&
          props.search_type === 'full_results' &&
          props.search_term === 'privacy'
        );
      },
    });
  });

  it('fires "Viewed Page" on /education/digital-literacy', () => {
    cy.visitWithAmplitudeCapture('/education/digital-literacy');

    cy.logCapturedAmplitudeEventTypes();

    cy.assertAmplitudeEvent('Viewed Page', {
      timeout: 60000,
      predicate: (ev) => {
        const props = ev.event_properties || {};
        return props.page_url_path === '/education/digital-literacy';
      },
    });
  });

  it('fires "Viewed Page" on /education/digital-citizenship', () => {
    cy.visitWithAmplitudeCapture('/education/digital-citizenship');

    cy.logCapturedAmplitudeEventTypes();

    cy.assertAmplitudeEvent('Viewed Page', {
      timeout: 60000,
      predicate: (ev) => {
        const props = ev.event_properties || {};
        return props.page_url_path === '/education/digital-citizenship';
      },
    });
  });

  it('fires "Viewed Page" on /education/uk/digital-citizenship', () => {
    cy.visitWithAmplitudeCapture('/education/uk/digital-citizenship');

    cy.logCapturedAmplitudeEventTypes();

    cy.assertAmplitudeEvent('Viewed Page', {
      timeout: 60000,
      predicate: (ev) => {
        const props = ev.event_properties || {};
        return props.page_url_path === '/education/uk/digital-citizenship';
      },
    });
  });
});












