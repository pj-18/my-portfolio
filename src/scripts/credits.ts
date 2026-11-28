export {};

/* ---- email: put together here, so the full address is never in the page's HTML ---- */
const link = document.querySelector<HTMLAnchorElement>('[data-mail]');
const { mailUser, mailDomain } = link?.dataset ?? {};

if (link && mailUser && mailDomain) link.href = `mailto:${mailUser}@${mailDomain}`;
