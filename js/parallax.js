// Background parallax for project pages.
// Tweak these two values to taste:
const PARALLAX_RATE = 0.3;   // 0 = fixed, 1 = scrolls with content
const PARALLAX_MAX  = 220;   // max pixels the background will shift before stopping

window.addEventListener("scroll", () => {
  const offset = Math.min(window.scrollY * PARALLAX_RATE, PARALLAX_MAX);
  document.body.style.backgroundPositionY = `calc(50% + ${offset}px)`;
});
