// 1. DATOS DEL PROYECTO (Extraídos exactamente de tu main.js)
const mocapData = {
  title: "Salsa AI",
  oneLiner: "Beat-synced salsa step sequencing in Unity, with pose-based transition weights for natural mixing in any order.",
  pills: ["Python-in-Unity Pipeline", "Motion Capture", "Beat-to-Motion Sync"],

  hero: {
    type: "video",
    src: "../../assets/videos/mocap_hero.mp4",
    poster: "",
  },

  whatItDoes: [
    "Syncs salsa steps to any track (beat-accurate)",
    "Generates endless routines from a mocap step library",
    "Keeps transitions smooth in any step order"
  ],

  mocapSourceVideos: [
    "../../assets/videos/mocap_1.mp4",
    "../../assets/videos/mocap_2.mp4",
    "../../assets/videos/mocap_3.mp4"
  ],

  howItWorks: {
    dataIngestion: {
      title: "YouTube Audio Importer (Python → Unity)",
      text: [
        "Convert YouTube links to WAV files instantly in Unity, speeding up the music testing loop.",
        "Built the download pipeline with yt-dlp and Editor scripting."
      ],
      video: "../../assets/videos/mocaptool_1.mp4"
    },
    musicAnalysis: {
      title: "Music Analysis (Python → Unity)",
      text: [
        "Extract beat timestamps and measure beat intervals to capture tempo changes.",
        "Unity editor tooling runs the pipeline and exports timing data as ScriptableObjects."
      ],
      video: "../../assets/videos/mocaptool_2.mp4"
    },
    poseAnalysis: {
      title: "Animation Analysis (Unity)",
      text: [
        "Run clip analysis in a background scene.",
        "Compare first and last frames for each step combination to measure pose distance (limbs + torso).",
        "Generate custom transition weights for every step combination."
      ],
      video: "../../assets/videos/mocaptool_3.mp4"
    },
    runtime: {
      title: "Runtime",
      text: [
        "Play steps in a chosen order or randomized.",
        "Match playback speed to the song timing data.",
        "Apply the precomputed weights to keep transitions smooth."
      ],
      video: "../../assets/videos/mocap_mushy.mp4"
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
};

// 2. FUNCIONES DE APOYO (Extraídas de tu main.js para que cargue la interfaz visual)
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

// 3. FUNCIÓN DE RENDERIZADO DEL PROYECTO (La de renderMocap extraída de tu main.js)
function renderMocap(p) {
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
        <h2 class="section-title">Why salsa (and why it scales)</h2>
        ${listHTML(p.whySalsa)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">What makes it hard / interesting</h2>
        ${listHTML(p.interesting)}
      </section>

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

    </div>
  `;
}

// 4. INICIALIZACIÓN: Pinta el código en el HTML
document.getElementById("project-root").innerHTML = renderMocap(mocapData);