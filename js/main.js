// Homepage card behaviour.
// Navigation lives in the markup as real <a href> links, so cards work with
// JS disabled. This file plays the clips, the phone bar and the splat hint.

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
  const bar = document.getElementById("phone-bar");
  const intro = document.getElementById("phone-intro");
  if (bar && intro) {
    const link = bar.querySelector("a");
    new IntersectionObserver(([e]) => {
      const on = phone.matches && !e.isIntersecting;
      bar.classList.toggle("is-on", on);
      bar.setAttribute("aria-hidden", on ? "false" : "true");
      link.tabIndex = on ? 0 : -1;
    }).observe(intro);
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
