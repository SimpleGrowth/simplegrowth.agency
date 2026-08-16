// Submits the contact form to HubSpot's Forms Submission API.
//
// This endpoint is public by design — it takes no API key, and none should
// ever be put in client-side code. It is scoped to one form, and HubSpot
// validates the payload against that form's definition.
//
// The hublet is eu1, so the host is api-eu1.hsforms.com; the generic
// api.hsforms.com host will reject a EU-resident portal.
(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const PORTAL_ID = '149109126';
  const FORM_ID = '4e01d51a-4d93-4e37-b883-4023c5fda956';
  const ENDPOINT = `https://api-eu1.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_ID}`;

  const status = document.getElementById('contact-form-status');
  const button = form.querySelector('button[type="submit"]');
  const FALLBACK_EMAIL = 'getsimplegrowth@gmail.com';

  const readCookie = (name) => {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  };

  const setStatus = (state, text) => {
    status.hidden = false;
    status.dataset.state = state;
    status.textContent = text;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 0-1 is HubSpot's object type id for contacts. Empty optional fields are
    // dropped rather than submitted blank, so they don't overwrite values
    // already held against an existing contact.
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
    setStatus('pending', 'Sending your message…');

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        form.reset();
        setStatus('success', "Thanks — we've got your message and will reply within one business day.");
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
})();
