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
