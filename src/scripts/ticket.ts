export {};

/**
 * The hanging ticket: a damped pendulum you can grab and fling.
 * Scrolling nudges it, and it settles (and stops animating) when left alone.
 */
const hanger = document.querySelector<HTMLElement>('[data-hanger]');
const arm = hanger?.querySelector<HTMLElement>('[data-arm]');
const ticket = hanger?.querySelector<HTMLElement>('[data-ticket]');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

if (hanger && arm && ticket) {
  const STIFFNESS = 15; // g / L, in rad/s²
  const DAMPING = 0.85;
  const LIMIT = 1.25;

  let angle = calm.matches ? -0.05 : 0.55;
  let velocity = 0;
  let wobble = 0;
  let dragging = false;
  let running = false;
  let last = 0;
  let inView = true;

  const render = () => {
    arm.style.transform = `rotate(${angle}rad)`;
    ticket.style.transform = `rotate(${wobble}rad)`;
  };

  const step = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    if (!dragging) {
      const acceleration = -STIFFNESS * Math.sin(angle) - DAMPING * velocity;
      velocity += acceleration * dt;
      angle += velocity * dt;
      if (Math.abs(angle) > LIMIT) {
        angle = Math.sign(angle) * LIMIT;
        velocity *= -0.4;
      }
    }
    // the card lags a little behind the string, which sells the weight
    wobble += (-velocity * 0.09 - wobble) * Math.min(1, dt * 10);
    render();

    const resting = !dragging && Math.abs(velocity) < 0.002 && Math.abs(angle) < 0.002 && Math.abs(wobble) < 0.002;
    if (resting || !inView) {
      running = false;
      return;
    }
    requestAnimationFrame(step);
  };

  const wake = () => {
    if (running || calm.matches) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  };

  render();

  // ---- drag ----
  let pivotX = 0;
  let pivotY = 0;
  let lastAngle = 0;
  let lastTime = 0;

  const angleAt = (event: PointerEvent) =>
    Math.max(-LIMIT, Math.min(LIMIT, Math.atan2(-(event.clientX - pivotX), event.clientY - pivotY)));

  ticket.addEventListener('pointerdown', (event) => {
    if (calm.matches) return;
    const box = hanger.getBoundingClientRect();
    pivotX = box.left;
    pivotY = box.top;
    dragging = true;
    ticket.setPointerCapture(event.pointerId);
    lastAngle = angle;
    lastTime = performance.now();
    wake();
  });

  ticket.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const now = performance.now();
    const next = angleAt(event);
    const dt = Math.max(0.008, (now - lastTime) / 1000);
    velocity = velocity * 0.4 + ((next - lastAngle) / dt) * 0.6;
    angle = next;
    lastAngle = next;
    lastTime = now;
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    velocity = Math.max(-9, Math.min(9, velocity));
    wake();
  };
  ticket.addEventListener('pointerup', release);
  ticket.addEventListener('pointercancel', release);

  // ---- scroll nudges ----
  let lastScroll = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (!inView || dragging) return;
      velocity += Math.max(-0.6, Math.min(0.6, delta * 0.004));
      wake();
    },
    { passive: true },
  );

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) wake();
  }).observe(hanger.parentElement ?? hanger);

  // wait for the countdown before the first swing
  const start = () => wake();
  if (document.documentElement.classList.contains('intro')) {
    new MutationObserver((_, observer) => {
      if (!document.documentElement.classList.contains('intro')) {
        observer.disconnect();
        start();
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } else {
    start();
  }
}
