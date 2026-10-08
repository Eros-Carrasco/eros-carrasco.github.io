// Homepage card behaviour.
// Navigation lives in the markup as real <a href> links, so this file only
// handles the hover preview. Cards work with JS disabled.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  document.querySelectorAll(".card").forEach((card) => {
    const video = card.querySelector("video");
    if (!video) return;

    // Videos are preload="none", so the first play() also triggers the download.
    // play() rejects if the pointer leaves before it resolves, so ignore that.
    const start = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    const stop = () => {
      video.pause();
      video.currentTime = 0;
    };

    card.addEventListener("mouseenter", start);
    card.addEventListener("mouseleave", stop);
    card.addEventListener("focus", start);
    card.addEventListener("blur", stop);
  });
}

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
        if (!phone.matches) return;
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      }),
      { threshold: 0.6 }
    );
    document.querySelectorAll(".card-featured video").forEach((v) => io.observe(v));
  }
}
