// Homepage card behaviour.
// Navigation lives in the markup as real <a href> links, so cards work with
// JS disabled. This file plays the clips, shows the bar and the splat hint.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// No hover needed: every project clip plays on its own
// while it is on screen (on phones, only the four featured ones), so the page
// is moving before the visitor does anything. Clips are preload="none", so a
// clip downloads only once it first comes into view.

// Inline transition clips: load and play only while on screen, pause when not.
if (!reduceMotion && "IntersectionObserver" in window) {
  const clips = document.querySelectorAll(".fig-video video");
  if (clips.length) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      }),
      { threshold: 0.4 }
    );
    clips.forEach((v) => io.observe(v));
  }
}

// Phones get their own layout below 640px (the PHONE block in css/styles.css).
// There is no hover there, so the four featured clips play while most of them
// is on screen, and a small bar with the resume slides in once the intro with
// the contact buttons has scrolled away.
const phone = window.matchMedia("(max-width: 640px)");

if ("IntersectionObserver" in window) {
  // The same bar serves desktop: there it slides in once the profile card's
  // buttons have scrolled away.
  const bar = document.getElementById("phone-bar");
  const intro = document.getElementById("phone-intro");
  const actions = document.getElementById("profile-actions");
  if (bar && intro && actions) {
    const links = bar.querySelectorAll("a");
    const seen = new Map();
    const update = () => {
      const watched = phone.matches ? intro : actions;
      const on = seen.has(watched) && !seen.get(watched);
      bar.classList.toggle("is-on", on);
      bar.setAttribute("aria-hidden", on ? "false" : "true");
      links.forEach((a) => (a.tabIndex = on ? 0 : -1));
    };
    const watch = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting));
      update();
    });
    watch.observe(intro);
    watch.observe(actions);
    phone.addEventListener("change", update);
  }

  if (!reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const featured = e.target.closest(".card-featured");
        if (e.isIntersecting && (featured || !phone.matches)) e.target.play().catch(() => {});
        else e.target.pause();
      }),
      { threshold: 0.6 }
    );
    document.querySelectorAll(".projects-grid video").forEach((v) => io.observe(v));
  }
}

// Tell the visitor the splat turns. The hint goes for good on the
// first drag.
const hint = document.getElementById("splat-hint");
const splatCanvas = document.getElementById("splat-canvas");
if (hint && splatCanvas) {
  splatCanvas.addEventListener("pointerdown", () => hint.classList.add("is-gone"), { once: true });
}
