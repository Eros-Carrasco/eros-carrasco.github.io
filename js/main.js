const overlay = document.getElementById("overlay");
const overlayContent = overlay.querySelector(".overlay-content");
const closeBtn = overlay.querySelector(".overlay-close");

let lastFocusedEl = null;

// ----- 1) PROJECT DATA (edit this per card) -----
const PROJECTS = {

  transfr: {
    title: "Career Exploration XR Simulations – Transfr",
    subtitle:
      "Designed and developed five VR career exploration simulations in Unity, deployed in real educational environments.",

    pills: [
      "Unity Production",
      "XR Systems",
      "Design Ownership",
      "Accessibility",
      "Localization"
    ],

    hero: {
      type: "video",
      src: "assets/videos/card_transfr_1.mp4",
      title: "Transfr Showcase Reel"
    },

    // 1️⃣ Scope — hard facts first
    scope: [
      "Developed 5 full-scale VR simulations introducing students to real-world careers.",
      "Localized 30+ simulations into Spanish and formalized the company’s localization workflow.",
      "Contributed to SDK feedback, bug detection, and cross-simulation stability improvements."
    ],

    // 2️⃣ Ownership — leadership clarity
    ownership: [
      "Led simulation design from initial research to final implementation.",
      "Defined interaction systems, user flow, pacing, and required asset structure.",
      "Implemented complex mechanics beyond standard SDK templates",
      "Iterated with product managers, engineers, instructional designers, SMEs, and QA.",
      "Delivered production-ready simulations used at scale in classrooms."
    ],



    // 4️⃣ Production Environment — real-world signal
    productionEnvironment: [
      "Collaborated cross-functionally with SDK engineers, product managers, instructional designers, SMEs, and QA.",
      "Presented and defended design decisions during stakeholder reviews.",
      "Adapted systems and scope based on technical, timeline, and resource constraints."
    ],

    gallery: [
      // screenshots when ready
    ],

    demo: null
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
      src: "unity-webgl/index.html",
      title: "Procedural Demo",
    },
  },

  about: {
    title: "Eros Carrasco",
    subtitle:
      "Creative Technologist at the intersection of XR and AI",
    pills: ["NYU M.S.", "Production Experience"],
    hero: {
      type: "image",
      src: "assets/images/card_about.jpg",
    },
    overview: [
      "Production-focused XR developer building interactive systems from concept to deployment.",
      "I combine design ownership with strong technical execution, leading architecture decisions and complex interaction systems.",
      "I aim to work where ambitious, complex technologies are being built and pushed forward — currently expanding into AI-integrated interactive systems at NYU."
    ],
    // productionExperience: [
    //   "Led the end-to-end development of five XR simulations in production environments.",
    //   "Fully owned the design and technical direction of one complete simulation from ground up.",
    //   "Architected custom interaction systems beyond standard SDK constraints.",
    //   "Drove interaction direction through stakeholder reviews, delivering scalable production-ready experiences."
    // ],
    currentFocus: ["Building AI-integrated XR systems through deep learning coursework at NYU, developing advanced interactive projects under Ken Perlin."],
    links: [
      {
        label: "Download CV",
        url: "assets/Eros Carrasco - Resume.pdf",
        type: "external"
      },
      {
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/eros-carrasco/",
        type: "external"
      },
      {
        label: "GitHub",
        url: "https://github.com/Eros-Carrasco",
        type: "external"
      },
      {
        label: "Email",
        url: "mailto:ErosCarrasco11@gmail.com",
        type: "external"
      }],

    selectedRecognition: [{
      title: "1st Place — NYU Data Science Bootcamp",
      image: "assets/images/bootcampBadge.png",
      link: "https://credentials.engineering.nyu.edu/7844a2f4-ff71-4ea0-a2c7-48d8b27766f9#acc.gz582Yac"
    }]
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
      type: "iframe",
      src: "https://player.vimeo.com/video/1164528040",
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

  if (projectKey === "about") {
    return renderAbout(p);
  }

  if (projectKey === "transfr") {
    return renderTransfr(p);
  }

  return renderStandardProject(p);
}

function renderStandardProject(p) {
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

      ${p.demo
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

function renderAbout(p) {
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

      <section class="project-section span-2">
        <h2 class="section-title">Overview</h2>
        ${listHTML(p.overview)}
      </section>

      <section class="project-section">
        <h2 class="section-title">Current Focus</h2>
        ${listHTML(p.currentFocus)}
      </section>

      ${p.links?.length
      ? `
        <section class="project-section">
          <h2 class="section-title">Links</h2>
          ${linksHTML(p.links)}
        </section>

        ${p.selectedRecognition?.length ? `
  <section class="project-section span-2">
    <h2 class="section-title">Selected Recognition</h2>
    ${recognitionHTML(p.selectedRecognition)}
  </section>
` : ""}
      `
      : ""
    }
    </div>
  `;
}

function renderTransfr(p) {
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

      <section class="project-section span-2">
        <h2 class="section-title">Impact</h2>
        ${listHTML(p.scope)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Responsibility</h2>
        ${listHTML(p.ownership)}
      </section>

      <section class="project-section">
        <h2 class="section-title">Production Environment</h2>
        ${listHTML(p.productionEnvironment)}
      </section>



      <section class="project-section span-2">
        <h2 class="section-title">Visual Gallery</h2>
        ${galleryHTML(p.gallery)}
      </section>

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
  const video = card.querySelector("video");

  // ---- Hover behavior ----
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

  // ---- Click behavior ----
  card.addEventListener("click", () => {
    const key = card.getAttribute("data-project");
    openOverlay(key, card);
  });

  // ---- Keyboard accessibility ----
  card.setAttribute("tabindex", "0");
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const key = card.getAttribute("data-project");
      openOverlay(key, card);
    }
  });
});

function linksHTML(links = []) {
  if (!links.length) return "";

  return `
    <ul class="links-list">
      ${links
      .map(
        (link) => `
            <li>
              <a href="${link.url}" target="_blank" rel="noopener">
                ${link.label}
              </a>
            </li>
          `
      )
      .join("")}
    </ul>
  `;
}

function recognitionHTML(items = []) {
  if (!items.length) return "";

  return `
    <div class="recognition-list">
      ${items.map(item => `
        <a href="${item.link}" target="_blank" class="recognition-item">
          <img src="${item.image}" alt="${item.title}" />
          <span>${item.title}</span>
        </a>
      `).join("")}
    </div>
  `;
}
