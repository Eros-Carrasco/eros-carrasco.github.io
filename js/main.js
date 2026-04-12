const PROJECT_URLS = {
  transfr:    "projects/transfr/",
  mocap:      "projects/salsa-ai/",
  procedural: "projects/idm-biome/",
  multiplayer:"projects/member-bot/",
  about:      "about/",
};

document.querySelectorAll(".card").forEach((card) => {
  const video = card.querySelector("video");

  // Hover: play video on enter, pause on leave
  if (video) {
    card.addEventListener("mouseenter", () => {
      video.currentTime = 0;
      video.play();
    });

    card.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
    });
  }

  // Click: navigate to project page
  card.addEventListener("click", () => {
    const key = card.getAttribute("data-project");
    const url = PROJECT_URLS[key];
    if (url) window.location.href = url;
  });

  // Keyboard accessibility
  card.setAttribute("tabindex", "0");
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const key = card.getAttribute("data-project");
      const url = PROJECT_URLS[key];
      if (url) window.location.href = url;
    }
  });
});
