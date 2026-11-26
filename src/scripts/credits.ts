export {};

/* ---- copy email ---- */
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const label = button.querySelector<HTMLElement>('[data-copy-label]');
  const original = label?.textContent ?? '';
  button.addEventListener('click', async () => {
    const value = button.dataset.copy ?? '';
    try {
      await navigator.clipboard.writeText(value);
      if (label) label.textContent = 'Copied ✓';
    } catch {
      window.location.href = `mailto:${value}`;
      return;
    }
    window.setTimeout(() => {
      if (label) label.textContent = original;
    }, 2200);
  });
}
