// Background parallax for project pages.
// Tweak these two values to taste:
const PARALLAX_RATE = 0.3;   // 0 = fixed, 1 = scrolls with content
const PARALLAX_MAX  = 220;   // max pixels the background will shift before stopping

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;

  // Writing backgroundPositionY forces a reflow, so batch it into one write
  // per animation frame instead of one per scroll event.
  const update = () => {
    const offset = Math.min(window.scrollY * PARALLAX_RATE, PARALLAX_MAX);
    document.body.style.backgroundPositionY = `calc(50% + ${offset}px)`;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
}
