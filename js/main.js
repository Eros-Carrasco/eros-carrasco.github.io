const overlay = document.getElementById("overlay");
const overlayContent = overlay.querySelector(".overlay-content");
const closeBtn = overlay.querySelector(".overlay-close");

let lastFocusedEl = null;

// ----- 1) PROJECT DATA (edit this per card) -----
const PROJECTS = {
  transfr: {
    title: "VR Career Exploration Simulations – Transfr",
    subtitle:
      "Designed and developed production-ready career exploration experiences in Unity, focused on clear guided interactions, accessibility, and real-world deployment.",
    pills: ["Unity", "XR Production", "Interaction Design", "Accessibility"],
    hero: {
      type: "video",
      src: "assets/videos/card_transfr_1.mp4",
      poster: "", // optional
    },
    context: [
      "Built multiple career exploration simulations aligned with classroom deployment needs.",
      "Worked within established SDK workflows and collaborated across disciplines (PM, QA, SMEs, engineers).",
    ],
    role: [
      "Led XR development and experience design within Unity.",
      "Built complex interactions using Transfr’s SDK and maintained clean guided user flow.",
      "Implemented accessibility features such as height adjustment and closed captions.",
      "Contributed SDK feedback, bug reports, and workflow improvements.",
    ],
    technical: [
      "Interaction architecture and state management",
      "Performance-minded scene building and content optimization",
      "Localization-ready content structure (EN ↔ ES workflows)",
      "Iterative QA collaboration and polish passes",
    ],
    // Transfr: mostly video-based. Keep gallery optional:
    gallery: [
      // Add screenshots when you have them:
      // { thumb: "assets/images/transfr_01.jpg", full: "assets/images/transfr_01.jpg", alt: "Interaction close-up" },
    ],
    demo: null, // no embedded demo for transfr
  },

  procedural: {
    title: "Procedural World Generation",
    subtitle:
      "Procedural visuals and interaction experiments—designed for exploration, style, and real-time play.",
    pills: ["WebGL", "Procedural", "Shaders", "Interactive"],
    hero: {
      type: "video",
      src: "assets/videos/card_procedural.mp4",
      poster: "",
    },
    context: ["Procedural generation exploration with interactive controls."],
    role: ["Design + implementation, visuals, and interaction tuning."],
    technical: ["Procedural systems", "Real-time rendering", "Interactive controls"],
    gallery: [
      // add images when you want
    ],
    demo: {
      type: "iframe",
      // Put your demo URL here. Could be WebXR / p5 / Unity WebGL build
      src: "YOUR_DEMO_URL_HERE",
      title: "Procedural Demo",
    },
  },

  about: {
    title: "About Eros Carrasco",
    subtitle:
      "Creative technologist focused on XR and interactive systems—bridging design, engineering, and production.",
    pills: ["XR", "Unity", "WebXR", "NYU"],
    hero: {
      type: "image",
      src: "assets/images/card_about.jpg",
    },
    context: [
      "Short bio, current focus, and what you’re building next."
    ],
    role: [
      "XR development (Unity + WebXR)",
      "Interactive systems and tooling",
      "Production collaboration + documentation"
    ],
    technical: [],
    gallery: [],
    demo: null,
  },

  mocap: {
    title: "Motion Capture & Animation Tool",
    subtitle:
      "Tooling for capturing, organizing, and iterating on motion—built to accelerate animation workflows.",
    pills: ["Unity Tooling", "Animation", "Pipeline"],
    hero: {
      type: "video",
      src: "assets/videos/card_motionCapture.mp4",
      poster: "",
    },
    context: ["A practical tool focused on fast iteration and clean organization."],
    role: ["Tool design + implementation, UX for creators, pipeline thinking."],
    technical: ["Editor tooling", "Data organization", "Workflow acceleration"],
    gallery: [],
    demo: null,
  },

  ml: {
    title: "Deep Learning for XR",
    subtitle:
      "Explorations at the intersection of ML and interactive media—focused on real-time, creative applications.",
    pills: ["ML", "Interactive Media", "Prototyping"],
    hero: {
      type: "image",
      src: "assets/images/card_ml_placeholder.jpg", // add one placeholder image if you want
    },
    context: ["Prototypes and experiments connecting ML ideas to interactive experiences."],
    role: ["Research + prototypes + experiments."],
    technical: ["Model experimentation", "Data pipelines", "Interactive integration"],
    gallery: [],
    demo: null,
  },

  multiplayer: {
    title: "Multiplayer Game in Unity",
    subtitle:
      "Online multiplayer prototype exploring networking, interaction, and moment-to-moment feel.",
    pills: ["Unity", "Netcode", "Multiplayer"],
    hero: {
      type: "video",
      src: "assets/videos/card_memberbot.mp4",
      poster: "",
    },
    context: ["A focused prototype to explore networking + gameplay feel."],
    role: ["Programming, architecture, iteration."],
    technical: ["Netcode patterns", "State sync", "Gameplay systems"],
    gallery: [],
    demo: null,
  },
};

// ----- 2) TEMPLATE RENDER -----
function heroHTML(hero) {
  if (!hero) return "";

  if (hero.type === "video") {
    const posterAttr = hero.poster ? `poster="${hero.poster}"` : "";
    return `
      <div class="project-hero-media">
        <video src="${hero.src}" ${posterAttr} autoplay muted loop playsinline controls></video>
      </div>
    `;
  }

  if (hero.type === "image") {
    return `
      <div class="project-hero-media">
        <img src="${hero.src}" alt="" />
      </div>
    `;
  }

  if (hero.type === "iframe") {
    return `
      <div class="project-hero-media">
        <iframe src="${hero.src}" title="${hero.title || "Demo"}" loading="lazy"></iframe>
      </div>
    `;
  }

  return "";
}

function listHTML(items = []) {
  if (!items.length) return `<p style="margin:0;opacity:0.8;">(Add content)</p>`;
  return `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
}

function pillsHTML(pills = []) {
  if (!pills.length) return "";
  return `
    <div class="project-meta">
      ${pills.map((p) => `<span class="pill">${p}</span>`).join("")}
    </div>
  `;
}

function galleryHTML(gallery = []) {
  if (!gallery.length) return `<p style="margin:0;opacity:0.8;">(Gallery coming soon)</p>`;
  return `
    <div class="gallery">
      ${gallery
        .map(
          (img) => `
        <a href="${img.full}" target="_blank" rel="noopener">
          <img src="${img.thumb}" alt="${img.alt || ""}">
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

function demoHTML(demo) {
  if (!demo) return "";
  if (demo.type === "iframe") {
    return `
      <div class="embed">
        <iframe src="${demo.src}" title="${demo.title || "Demo"}" loading="lazy"></iframe>
      </div>
    `;
  }
  return "";
}

function renderProject(projectKey) {
  const p = PROJECTS[projectKey];
  if (!p) return `<p>Project not found.</p>`;

  return `
    <div class="project-hero">
      ${heroHTML(p.hero)}
      <div class="project-hero-caption">
        <h1 class="project-title">${p.title}</h1>
        <p class="project-subtitle">${p.subtitle}</p>
        ${pillsHTML(p.pills)}
      </div>
    </div>

    <div class="project-sections">
      <section class="project-section">
        <h2 class="section-title">Context</h2>
        ${listHTML(p.context)}
      </section>

      <section class="project-section">
        <h2 class="section-title">My Role</h2>
        ${listHTML(p.role)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Technical Focus</h2>
        ${listHTML(p.technical)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Visual Gallery</h2>
        ${galleryHTML(p.gallery)}
      </section>

      ${
        p.demo
          ? `
        <section class="project-section span-2">
          <h2 class="section-title">Interactive Demo</h2>
          ${demoHTML(p.demo)}
        </section>
      `
          : ""
      }
    </div>
  `;
}

// ----- 4) OPEN/CLOSE -----
function openOverlay(projectKey, focusEl) {
  lastFocusedEl = focusEl || document.activeElement;

  overlayContent.innerHTML = renderProject(projectKey);
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";

  // accessibility-ish: focus close button
  closeBtn.focus();
}

function closeOverlay() {
  overlay.classList.remove("is-open");
  overlayContent.innerHTML = "";
  document.body.style.overflow = "";

  if (lastFocusedEl) lastFocusedEl.focus();
}

// close button
closeBtn.addEventListener("click", closeOverlay);

// click outside content (on the dark backdrop) closes
overlay.addEventListener("click", (e) => {
  // only if clicked the overlay backdrop itself, not inside inner content
  if (e.target === overlay) closeOverlay();
});

// ESC closes
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("is-open")) {
    closeOverlay();
  }
});

// ----- 5) CARD CLICKS -----
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", () => {
    const key = card.getAttribute("data-project");
    openOverlay(key, card);
  });

  // optional: allow keyboard open
  card.setAttribute("tabindex", "0");
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const key = card.getAttribute("data-project");
      openOverlay(key, card);
    }
  });
});