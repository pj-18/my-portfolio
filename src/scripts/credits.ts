export {};

/* ---- email: put together here, so the full address is never in the page's HTML ---- */
const band = document.querySelector<HTMLAnchorElement>('[data-mail]');
const { mailUser, mailDomain } = band?.dataset ?? {};
const email = mailUser && mailDomain ? `${mailUser}@${mailDomain}` : '';

if (band && email) {
  band.href = `mailto:${email}`;
  band.setAttribute('aria-label', (band.getAttribute('aria-label') ?? '').replace(/:.*$/, ` at ${email}`));
  for (const text of band.querySelectorAll('[data-mail-text]')) text.textContent = email;
}

/* ---- copy email ---- */
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy-mail]')) {
  const label = button.querySelector<HTMLElement>('[data-copy-label]');
  const original = label?.textContent ?? '';
  button.addEventListener('click', async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      if (label) label.textContent = 'Copied ✓';
    } catch {
      window.location.href = `mailto:${email}`;
      return;
    }
    window.setTimeout(() => {
      if (label) label.textContent = original;
    }, 2200);
  });
}
