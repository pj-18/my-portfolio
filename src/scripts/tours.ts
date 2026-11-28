export {};

/**
 * Trip status pills ("Leaving in 12 days", "On the road · Day 2", "Back home"). The build
 * writes them as of build time; this keeps them true on the day you look, without a rebuild.
 */
import { tripStatus } from '../lib/tours';

const pills = [...document.querySelectorAll<HTMLElement>('[data-trip-status]')];

const refresh = () => {
  const now = Date.now();
  for (const pill of pills) {
    const { start, days, offset } = pill.dataset;
    if (!start || !days) continue;
    const status = tripStatus(start, Number(days), now, Number(offset ?? 330));
    if (pill.textContent?.trim() !== status.label) pill.textContent = status.label;
    pill.dataset.state = status.state;
  }
};

if (pills.length) {
  refresh();
  // the day can turn over while the page is open
  window.setInterval(refresh, 60_000);
}
