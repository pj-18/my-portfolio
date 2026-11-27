export {};

/**
 * The hero backdrop: each layer drifts down at its own share of the scroll
 * (`data-depth`), so the deeper layers seem further away. Runs only while the
 * hero is on screen, and not at all for reduced motion.
 */
const backdrop = document.querySelector<HTMLElement>('[data-parallax]');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

if (backdrop) {
  const layers = [...backdrop.querySelectorAll<HTMLElement>('[data-depth]')].map((el) => ({
    el,
    depth: Number(el.dataset.depth) || 0,
  }));
  let inView = true;
  let queued = false;

  const render = () => {
    queued = false;
    const y = calm.matches ? 0 : window.scrollY;
    for (const { el, depth } of layers) el.style.transform = `translate3d(0, ${(y * depth).toFixed(1)}px, 0)`;
  };

  const queue = () => {
    if (queued || !inView) return;
    queued = true;
    requestAnimationFrame(render);
  };

  window.addEventListener('scroll', queue, { passive: true });
  calm.addEventListener('change', render);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) queue();
  }).observe(backdrop);
  render();
}
