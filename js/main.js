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

    impactStats: [
      {
        value: "5",
        title: "VR Simulations Developed",
        description: "Career exploration experiences deployed in real classrooms."
      },
      {
        value: "30+",
        title: "Simulations Localized to Spanish",
        description: "Formalized the company’s localization workflow."
      }
    ],

    // // 1️⃣ Scope — hard facts first
    // scope: [
    //   "Developed 5 full-scale VR simulations introducing students to real-world careers.",
    //   "Localized 30+ simulations into Spanish and formalized the company’s localization workflow."
    //   // "Contributed to SDK feedback, bug detection, and cross-simulation stability improvements."
    // ],

    // 2️⃣ Ownership — leadership clarity
    ownership: [
      "Led simulation design from initial research to final implementation.",
      "Defined interaction systems, user flow, pacing, and required asset structure.",
      "Implemented complex mechanics beyond standard SDK templates",
      "Delivered production-ready simulations used at scale in classrooms."
    ],



    // 4️⃣ Production Environment — real-world signal
    productionEnvironment: [
      "Collaborated cross-functionally with SDK engineers, product managers, instructional designers, SMEs, and QA.",
      "Presented and defended design decisions during stakeholder reviews.",
      "Adapted systems and scope based on technical, timeline, and resource constraints."
    ],

    gameplayVideos: [
      { title: "Assemble Components of an EV Battery", id: "xrnN0EvmYmY" },
      { title: "Replace EV Battery", id: "MAn4C9F4Ub0" },
      { title: "Repair Diesel Farm Equipment", id: "15ak7XKbooE" }
    ],
  },

  procedural: {
    title: "IDM Biome: Experimental Ecosystem",
    subtitle:
      "A proof-of-concept exploring the intersection of physical hardware, live data, and social interaction.",
    pills: ["Unity", "C#", "Arduino", "API Integration"],
    hero: {
      type: "video",
      src: "assets/videos/card_procedural.mp4",
      poster: "assets/images/biome_poster.jpg",
    },
    context: [
      "A series of prototypes designed to explore how a digital world can be shaped by its physical and social surroundings.",
      "Developed locally as a technical foundation for a future interactive installation at the IDM space."
    ],
    // NUEVA SECCIÓN: Aquí metemos tus videos y experimentos
    experiments: {
      hardware: {
        title: "Physical Bridge (Arduino)",
        text: [
          "Custom Arduino controller using potentiometers to manipulate procedural terrain generation in real-time.",
          "Implemented deadzone filtering to handle sensor jitter and smooth out the interaction."
        ],
        video: "assets/videos/arduino_video.mp4" // Tu video usando el Arduino
      },
      social: {
        title: "Cloud-Based Identity (Google Sheets)",
        text: [
          "Integration with Google Sheets API to allow users to 'join' the biome.",
          "Entering a name in the sheet dynamically spawns a persistent avatar in the virtual ecosystem."
        ],
        video: "assets/videos/sheets_video.mp4" // Tu video metiendo el nombre
      },
      liveData: {
        title: "Live Environment (Weather API)",
        text: [
          "Synchronizing the digital environment with Brooklyn's real-time weather.",
          "Built an asynchronous polling system to fetch JSON data from the Open-Meteo API."
        ],
        video: null // Si no tienes video de esto, no pasa nada, el layout se adapta
      }
    },

    demo: {
    type: "iframe",
    src: "unity-webgl/index.html?v=5",
    title: "Technical Sandbox",
    // Esta es la instrucción que leerá la función de abajo
    instructions: "Use the sliders to manipulate the terrain parameters (Seed, Scale, Strength) and vegetation density in real-time."
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
        label: "Resume",
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
        url: "mailto:ejj2059@nyu.edu",
        type: "external"
      }],

    selectedRecognition: [{
      title: "1st Place — NYU Data Science Bootcamp",
      image: "assets/images/bootcampBadge.png",
      link: "https://credentials.engineering.nyu.edu/7844a2f4-ff71-4ea0-a2c7-48d8b27766f9#acc.gz582Yac"
    }]
  },


  mocap: {
    title: "Salsa AI",
    oneLiner:
      "Beat-synced salsa step sequencing in Unity, with pose-based transition weights for natural mixing in any order.",
    pills: ["Python-in-Unity Pipeline", "Mocap Animation Set", "Beat-to-Motion Sync"],

    hero: {
      type: "video",
      // <-- NUEVO: Aquí pones el video de tu personaje honguito en el environment lindo
      src: "assets/videos/mocap_hero.mp4",
      poster: "",
    },

    whatItDoes: [
      "Syncs salsa steps to any track (beat-accurate)",
      "Generates endless routines from a mocap step library",
      "Keeps transitions smooth in any step order"
    ],

    // <-- NUEVO: Arreglo para tus 3 videos cortitos del origen del Mocap
    mocapSourceVideos: [
      "assets/videos/mocap_1.mp4",
      "assets/videos/mocap_2.mp4",
      "assets/videos/mocap_3.mp4"
    ],

    howItWorks: {
      // <-- NUEVO: Sección de Ingesta de datos (yt-dlp)
      dataIngestion: {
        title: "YouTube Audio Importer (Python → Unity)",
        text: [
          "Convert YouTube links to WAV files instantly in Unity, speeding up the music testing loop.",
          "Built the download pipeline with yt-dlp and Editor scripting."
        ],
        video: "assets/videos/mocaptool_1.mp4" // Video de la herramienta descargando
      },
      musicAnalysis: {
        title: "Music Analysis (Python → Unity)",
        text: [
          "Extract beat timestamps and measure beat intervals to capture tempo changes.",
          "Unity editor tooling runs the pipeline and exports timing data as ScriptableObjects."
        ],
        video: "assets/videos/mocaptool_2.mp4" // Video del análisis de la música
      },
      poseAnalysis: {
        title: "Animation Analysis (Unity)",
        text: [
          "Run clip analysis in a background scene.",
          "Compare first and last frames for each step combination to measure pose distance (limbs + torso).",
          "Generate custom transition weights for every step combination."
        ],
        video: "assets/videos/mocaptool_3.mp4" // Video del análisis de animaciones
      },
      runtime: {
        title: "Runtime",
        text: [
          "Play steps in a chosen order or randomized.",
          "Match playback speed to the song timing data.",
          "Apply the precomputed weights to keep transitions smooth."
        ],
        video: "assets/videos/mocap_mushy.mp4"
      }
    },

    interesting: [
      "Salsa songs don’t keep a single tempo, it shifts constantly. Measuring time between beats lets the system follow those changes and stay on time.",
      "Any-order sequencing usually breaks transitions. I solve it by measuring start/end pose distances between clips.",
      "Instead of one blend value, transitions use a specific weight for each body part to keep motion natural."
    ],

    whySalsa: [
      "Salsa animations are almost non-existent. This project becomes a curated mocap library of 7 distinct salsa steps.",
      "While I focused on salsa, the system already supports other dances and genres, expanding it is mainly adding more clips (including mixing steps across styles)."
    ],

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

  if (projectKey === "mocap") {
    return renderMocap(p);
  }

  if (projectKey === "procedural") {
    return renderProcedural(p);
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
        ${statsHTML(p.impactStats)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Responsibility</h2>
        ${listHTML(p.ownership)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Production Environment</h2>
        ${listHTML(p.productionEnvironment)}
      </section>

      ${p.gameplayVideos?.length ? `
        <section class="project-section span-2">
          <h2 class="section-title">Gameplay & Playthroughs</h2>
          ${youtubeGalleryHTML(p.gameplayVideos)}
        </section>
      ` : ""}

    </div>
  `;
}

function renderMocap(p) {
  // <-- NUEVO: Función auxiliar para crear los bloques de How It Works con video integrado
  const renderHowBlock = (blockData) => {
    if (!blockData) return "";
    return `
      <div class="how-block how-block-with-video">
        <div class="how-text">
          <h3 class="how-title">${blockData.title}</h3>
          ${listHTML(blockData.text)}
        </div>
        ${blockData.video ? `
          <div class="how-video">
            <video src="${blockData.video}" autoplay muted loop playsinline controls></video>
          </div>
        ` : ""}
      </div>
    `;
  };

  return `
    <div class="project-hero">
      ${heroHTML(p.hero)}
      <div class="project-hero-caption">
        <h1 class="project-title">${p.title}</h1>
        <p class="project-subtitle">${p.oneLiner}</p>
        ${pillsHTML(p.pills)}
      </div>
    </div>

    <div class="project-sections">

      <section class="project-section span-2">
        <h2 class="section-title">What it does</h2>
        <div class="what-grid">
          ${p.whatItDoes.map(line => `
            <div class="what-block">
              <p>${line}</p>
            </div>
          `).join("")}
        </div>
      </section>

      ${p.mocapSourceVideos?.length ? `
        <section class="project-section span-2">
          <h2 class="section-title">The Origin of the Data (Mocap)</h2>
          <div class="mocap-grid">
            ${p.mocapSourceVideos.map(vid => `
              <video src="${vid}" autoplay muted loop playsinline></video>
            `).join("")}
          </div>
        </section>
      ` : ""}

      <section class="project-section span-2">
        <h2 class="section-title">How it works</h2>
        <div class="how-stack">
          ${renderHowBlock(p.howItWorks?.dataIngestion)}
          ${renderHowBlock(p.howItWorks?.musicAnalysis)}
          ${renderHowBlock(p.howItWorks?.poseAnalysis)}
          ${renderHowBlock(p.howItWorks?.runtime)}
        </div>
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">What makes it hard / interesting</h2>
        ${listHTML(p.interesting)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Why salsa (and why it scales)</h2>
        ${listHTML(p.whySalsa)}
      </section>

    </div>
  `;
}

function renderProcedural(p) {
  // Reutilizamos la lógica visual que creaste para Mocap
  const renderExperiment = (blockData) => {
    if (!blockData) return "";
    return `
      <div class="how-block how-block-with-video">
        <div class="how-text">
          <h3 class="how-title">${blockData.title}</h3>
          ${listHTML(blockData.text)}
        </div>
        ${blockData.video ? `
          <div class="how-video">
            <video src="${blockData.video}" autoplay muted loop playsinline controls></video>
          </div>
        ` : ""}
      </div>
    `;
  };

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
        <h2 class="section-title">Context & Goal</h2>
        ${listHTML(p.context)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">The Experiments</h2>
        <div class="how-stack">
          ${renderExperiment(p.experiments?.hardware)}
          ${renderExperiment(p.experiments?.social)}
          ${renderExperiment(p.experiments?.liveData)}
        </div>
      </section>

      
      
      <section class="project-section span-2">
        <h2 class="section-title">Interactive Simulation</h2>
    
        ${p.demo.instructions ? `<p class="section-description">${p.demo.instructions}</p>` : ""}
    
        <div class="demo-container">
          ${demoHTML(p.demo)}
        </div>
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

function statsHTML(stats = []) {
  return `
    <div class="stats-grid">
      ${stats.map(stat => `
        <div class="stat-card">
          <div class="stat-value">${stat.value}</div>
          <div class="stat-content">
            <div class="stat-title">${stat.title}</div>
            <div class="stat-desc">${stat.description}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function youtubeGalleryHTML(videos = []) {
  if (!videos.length) return "";
  return `
    <div class="youtube-grid">
      ${videos.map(v => `
        <div class="youtube-card">
          <div class="youtube-wrapper">
            <iframe 
              src="https://www.youtube.com/embed/${v.id}" 
              title="${v.title}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
          <h3 class="youtube-title">${v.title}</h3>
        </div>
      `).join("")}
    </div>
  `;
}