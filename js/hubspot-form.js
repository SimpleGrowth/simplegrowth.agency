// Submits any form carrying data-hs-form-id to HubSpot's Forms Submission API.
//
// This endpoint is public by design — it takes no API key, and none should
// ever be put in client-side code. It is scoped to a single form, and HubSpot
// validates the payload against that form's definition.
//
// Each input's name= must be the HubSpot internal property name (firstname,
// lastname, email, phone, company, message). Rename a field in HubSpot and the
// submission is rejected until it is renamed here to match.
(() => {
  const FALLBACK_EMAIL = 'getsimplegrowth@gmail.com';
  const DEFAULT_SUCCESS = "Thanks — we've got your message and will reply within one business day.";

  const readCookie = (name) => {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  };

  const init = (form) => {
    const portalId = form.dataset.hsPortalId;
    const formId = form.dataset.hsFormId;
    const region = form.dataset.hsRegion || 'eu1';
    if (!portalId || !formId) return;

    // Region matters: a EU-resident portal is rejected by the generic
    // api.hsforms.com host.
    const endpoint = `https://api-${region}.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const successMessage = form.dataset.hsSuccess || DEFAULT_SUCCESS;

    const setStatus = (state, text) => {
      status.hidden = false;
      status.dataset.state = state;
      status.textContent = text;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      // 0-1 is HubSpot's object type id for contacts. Blank optional fields are
      // dropped rather than sent empty, so they can't overwrite values already
      // held against an existing contact.
      const fields = [...new FormData(form).entries()]
        .map(([name, value]) => [name, String(value).trim()])
        .filter(([, value]) => value !== '')
        .map(([name, value]) => ({ objectTypeId: '0-1', name, value }));

      const hutk = readCookie('hubspotutk');
      const payload = {
        fields,
        context: {
          pageUri: window.location.href,
          pageName: document.title,
          // Only present if HubSpot's tracking script is on the page; it links
          // the submission to that visitor's browsing history.
          ...(hutk ? { hutk } : {}),
        },
      };

      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      setStatus('pending', 'Sending…');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          form.reset();
          setStatus('success', successMessage);
        } else {
          // HubSpot names the offending field in its error, which is what makes
          // a form/property mismatch diagnosable, so surface it rather than
          // swallowing it behind a generic message.
          const body = await response.json().catch(() => null);
          const detail = body && body.errors && body.errors[0] && body.errors[0].message;
          setStatus(
            'error',
            detail
              ? `That didn't send: ${detail} You can also email us at ${FALLBACK_EMAIL}.`
              : `That didn't send. Please email us at ${FALLBACK_EMAIL}.`
          );
        }
      } catch {
        setStatus('error', `We couldn't reach the server. Please email us at ${FALLBACK_EMAIL}.`);
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  };

  document.querySelectorAll('form[data-hs-form-id]').forEach(init);
})();
