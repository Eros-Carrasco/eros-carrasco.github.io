// BASE_URL is defined by each project page before this script loads.
// e.g. for /projects/transfr/ → BASE_URL = "../../"
//      for /about/            → BASE_URL = "../"
// This lets asset paths work both locally and on GitHub Pages.

// ===== PROJECT DATA =====
const PROJECTS = {

  mrandarin: {
    title: "MRandarin",
    subtitle:
      "A mixed reality Chinese handwriting tutor for the Quest 3: marker based registration in WebXR, OCR on a paired PC, and an evaluation of five recognisers against real headset captures.",

    pills: ["WebXR", "Computer Vision", "Meta Quest 3", "Python"],

    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/mrandarin_hero.mp4`,
      poster: `${BASE_URL}assets/images/poster_mrandarin.jpg`
    },

    impactStats: [
      { value: "151", title: "Real Captures, Five Models", description: "Pulled from the running app, not from a dataset." },
      { value: "0%", title: "The Model That Should Have Won", description: "Its zero was my preprocessing, not the model." }
    ],

    work: {
      title: "The System",
      items: [
        {
          heading: "Capture and Registration (WebXR, ArUco)",
          text: [
            "WebXR gives an app no access to the headset cameras, so the headset casts what it sees to a PC and the PC does the reading.",
            "The headset draws the four markers itself, as holograms on the board, so the writing hand never covers them.",
            "Correct the perspective from those markers and crop to the board.",
            "The registration I built for this is now part of the Future Reality Lab's framework, used by the rest of the lab."
          ],
          figs: [{
            src: `${BASE_URL}assets/images/mrandarin_passthrough.jpg`,
            alt: "A whiteboard seen through the headset with a Chinese character recognised and markers at the corners",
            caption: "The corner markers are drawn by the headset, not stuck to the wall."
          }]
        },
        {
          heading: "Recognition and Feedback (Apple Vision, Python)",
          text: [
            "Read the character and answer around it: meaning above, pinyin beside it, an image, and a sentence to make it stick."
          ]
        },
        {
          heading: "Learning Layer (HanziWriter)",
          text: [
            "Every character written lands in a pokedex. Tap one to replay its stroke order.",
            "Ask for a new one and the app teaches it, then accepts nothing else until you write it."
          ]
        },
        {
          heading: "Model Evaluation (PyTorch, CASIA)",
          text: [
            "Apple Vision does the reading, picked because it installed fastest. Five of us benchmarked it against four other recognisers.",
            "I built the nine distortions we tested against, each modelled on what a headset does to an image: motion blur, lens glare, low resolution passthrough.",
            "I collected 151 captures from the running app and ran all five models on those instead."
          ]
        }
      ]
    },

    evaluation: {
      slope: {
        left: "CLEAN DATASET",
        right: "REAL CAPTURES",
        alt: "Accuracy of five OCR models on the CASIA dataset and on 151 real captures from the headset. ANCHOR falls from 58.1 percent to zero. CnOCR rises from 15.2 percent to 59.6 percent. The two lines cross.",
        caption: "Same five models, two test sets.",
        series: [
          { name: "ANCHOR", a: 58.1, b: 0.0, accent: "fall" },
          { name: "PaddleOCR", a: 40.5, b: 34.4 },
          { name: "Apple Vision", a: 39.7, b: 23.2 },
          { name: "EasyOCR", a: 26.9, b: 1.3 },
          { name: "CnOCR", a: 15.2, b: 59.6, accent: "rise" }
        ]
      },
      table: {
        headers: ["Model", "Clean data", "Real captures"],
        rows: [
          ["ANCHOR", "58.1%", "0.0%"],
          ["PaddleOCR", "40.5%", "34.4%"],
          ["Apple Vision", "39.7%", "23.2%"],
          ["EasyOCR", "26.9%", "1.3%"],
          ["CnOCR", "15.2%", "59.6%"]
        ]
      },
      takeaway: [
        "The zero was my preprocessing: I crop to the whiteboard, so the character sits small in a big rectangle and ANCHOR has no stage that finds it first. Nearly every guess came back 日 or 口.",
        "ANCHOR is not ruled out. Next: let CnOCR find the character, let ANCHOR read it."
      ]
    },

    credits: {
      title: "Credits",
      text: [
        "Coursework for Virtual Reality with Ken Perlin and Deep Learning for Media at NYU.",
        "The app is mine. The evaluation was group work with Kaylie Stuteville, Kezia Widjaja and Jasmine Zhang; my part was the nine distortions, the CnOCR and Apple Vision integrations, the capture app and the run on real captures."
      ]
    },
  },

  splatlab: {
    title: "SplatLab",
    subtitle:
      "Gaussian splat research: spatial analysis, object recognition, relighting and transitions, in an Unreal integration and a renderer of my own.",

    pills: ["Gaussian Splatting", "Unreal Engine", "HLSL", "CUDA"],

    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/splatlab_hero.mp4`,
      poster: `${BASE_URL}assets/images/poster_splatlab.jpg`
    },

    impactStats: [
      { value: "Relighting", title: "Lighting a capture that has no surfaces", description: "A photographed room can be put under a different light, in real time." },
      { value: "Transitions", title: "Moving between worlds without a cut", description: "Costs less to draw than the world it replaces, because it draws fewer gaussians." }
    ],

    work: {
      title: "The System",
      items: [
        {
          heading: "Relighting (HLSL, inside the renderer's shader)",
          text: [
            "Recover a surface direction for every gaussian from its own shape, live.",
            "Closed form. No preprocessing, no retraining, no stored normals.",
            "Multiply the captured colour, never add, so the original light survives."
          ],
          figs: [{
            src: `${BASE_URL}assets/images/splatlab_normals.jpg`,
            alt: "A colonnade with every surface coloured according to the direction it faces",
            caption: "Colour is which way each blob faces."
          }]
        },
        {
          text: ["The light it was captured under cannot be removed. This works on top of it."],
          figs: [{
            src: `${BASE_URL}assets/images/splatlab_relight.jpg`,
            alt: "The same hall twice, once under a warm light and once under a cold one",
            caption: "The same world under a warm key and a cold key."
          }]
        },
        {
          heading: "Transitions (HLSL)",
          text: [
            "Drop the draw budget and the whole room is described with a few thousand points, not cropped.",
            "The next world fills in from those same points.",
            "Runs per gaussian in the raster shader, on the GPU."
          ],
          clips: [
            { src: `${BASE_URL}assets/videos/splatlab_tr_breakroom.mp4`, alt: "A breakroom dissolving as a magenta band sweeps through it" },
            { src: `${BASE_URL}assets/videos/splatlab_tr_temple.mp4`, alt: "A temple crumbling into golden particles" },
            { src: `${BASE_URL}assets/videos/splatlab_tr_cabin.mp4`, alt: "A cabin breaking into points behind a cyan sweep" }
          ]
        },
        {
          heading: "Spatial Analysis (Python)",
          text: [
            "Measure floor, ceiling, walls, and clear distance in every direction.",
            "Write it once to a manifest everything downstream reads.",
            "Return nothing when nothing is there. The confidence measure this replaced went up as the data ran out."
          ],
          figs: [{
            src: `${BASE_URL}assets/images/splatlab_plan.jpg`,
            alt: "Top down plan of a room, with coloured lines measuring the distance from a point to every wall",
            caption: "Distance to a surface, coloured by height."
          }]
        },
        {
          heading: "Object Understanding (Local Vision Model)",
          text: [
            "Geometry separates the objects and sets their boundaries.",
            "A vision model reads eight views. Only what two of them agree on survives: chair went from 78,663 gaussians to 877.",
            "The model supplies the noun. A measurement decides the category."
          ],
          figs: [{
            src: `${BASE_URL}assets/images/splatlab_named.jpg`,
            alt: "Two spaces with objects highlighted in red and labelled, the chairs in one and the columns in the other",
            caption: "Two worlds, asked for a thing by name."
          }]
        },
        {
          heading: "Unreal Integration (C++)",
          text: [
            "Patched six runtime setters into the plugin so anything could be animated.",
            "Worlds travel to the player, because motion capture overwrites the player every frame."
          ]
        },
        {
          heading: "Renderer (CUDA, gsplat, Python)",
          text: [
            "Second implementation outside Unreal, on a Grace Blackwell machine.",
            "Every gaussian stays a tensor, so an effect is tensor maths, not a shader rewrite."
          ]
        }
      ]
    },

  },

  frl: {
    title: "Future Reality Lab",
    subtitle:
      "Research with Ken Perlin's group at NYU, building software for the lab's VR platform.",

    pills: ["Computer Vision", "Pose Estimation", "WebXR", "Research"],

    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/frl_hero.mp4`,
      poster: `${BASE_URL}assets/images/poster_frl.jpg`,
    },

    labProject: {
      title: "The Lab's Project",
      text: [
        "The lab is building a way for two people in different cities to work together in mixed reality, over their own desks rather than instead of them. You draw in the air, the drawing becomes a widget, and you both edit the same thing at once.",
        "It is a team project. The video calling layer is Ken Perlin's, and the drawing system comes from Chalktalk. My part is below."
      ]
    },

    contribution: {
      title: "What I Built",
      text: [
        "A system that connects the headset to your computer, so the machine you are working on becomes part of the VR space instead of something you take the headset off to use.",
        "The headset cannot see for itself, because WebXR blocks camera access. So it sends what it sees to the computer, and the computer works out where the screen is from markers shown on it. Everything else anchors to that.",
        "I also contribute to the group's research work, including an NSF funding proposal in preparation."
      ]
    },
  },

  transfr: {
    title: "Career Exploration XR Simulations – Transfr",
    subtitle:
      "Designed and developed five VR career exploration simulations in Unity, deployed in real educational environments.",

    pills: [
      "Unity Production",
      "VR",
      "Simulation Design",
      "User Experience"
    ],

    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/transfr_hero.mp4`,
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
        description: "Formalized the company's localization workflow."
      }
    ],

    ownership: [
      "Researched each occupation first, then led the simulation design from that research through to final implementation.",
      "Defined the learner's experience: interaction systems, user flow, pacing, and required asset structure.",
      "Implemented complex mechanics beyond standard SDK templates",
      "Delivered production-ready simulations used at scale in classrooms."
    ],

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
    title: "Procedural Biome: Interactive Ecosystem",
    subtitle:
      "A proof-of-concept exploring the intersection of physical hardware, live data, and social interaction.",
    pills: ["Arduino", "Procedural Generation", "Live Data", "Unity", "Hardware"],
    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/procedural_hero_slow.mp4`,
      poster: `${BASE_URL}assets/images/poster_procedural.jpg`,
    },
    context: [
      "A series of prototypes designed to explore how a digital world can be shaped by its physical and social surroundings.",
      "Developed locally as a technical foundation for a future interactive installation at the IDM space."
    ],
    experiments: {
      hardware: {
        title: "Physical Bridge (Arduino)",
        text: [
          "Custom Arduino controller using potentiometers to manipulate procedural terrain generation in real-time.",
          "Implemented deadzone filtering to handle sensor jitter and smooth out the interaction."
        ],
        video: `${BASE_URL}assets/videos/procedural_arduino.mp4`
      },
      social: {
        title: "Cloud-Based Identity (Google Sheets)",
        text: [
          "Integration with Google Sheets API to allow users to 'join' the biome.",
          "Entering a name in the sheet dynamically spawns a persistent avatar in the virtual ecosystem."
        ],
        video: `${BASE_URL}assets/videos/procedural_sheets.mp4`
      }
    },

    demo: {
      type: "iframe",
      src: `${BASE_URL}unity-webgl/index.html?v=5`,
      title: "Technical Sandbox",
      instructions: "Use the sliders to manipulate the terrain in real-time."
    },

    liveData: {
      title: "Live Environment (Weather API)",
      text: [
        "Fetches live data from Downtown Brooklyn via the Open-Meteo API."
      ]
    }
  },

  about: {
    title: "Eros Carrasco",
    subtitle:
      "Builds the real-time graphics and the computer vision that put the real world inside a headset.",
    pills: ["CUDA", "Gaussian Splatting", "Computer Vision", "Deep Learning", "Unity and Unreal"],
    hero: {
      type: "image",
      src: `${BASE_URL}assets/images/card_about.jpg`,
    },
    currently: {
      lead: "Graduate researcher at NYU.",
      labs: [
        {
          name: "Brooklyn Navy Yard",
          lead: "Research on Gaussian splats for production use in XR.",
          bullets: [
            "Building the computer vision and analysis in Python that let a local agent read a splat and work on it, because the captures cannot leave the building.",
            "Wrote a custom CUDA rasterizer for the work that does not fit a game engine.",
            "Writing the same renderer again in C++ as an Unreal plugin, deploying it in a VR multiplayer motion-capture production built with the team.",
            "Relight the scans with my own tooling."
          ]
        },
        {
          name: "Future Reality Lab",
          lead: "Research with Ken Perlin on how AR glasses will integrate into desktop workflows, collaboration, and work with 3D data.",
          bullets: [
            "Contributing to the lab's XR framework, which moves content between the desktop screen and 3D space. My piece is the registration that anchors your monitor in virtual space.",
            "Targeting publication at SIGGRAPH and CHI."
          ]
        }
      ]
    },
    industry: [
      "Designed and developed five VR career exploration simulations in Unity at Transfr, deployed in real educational environments.",
      "Defined and documented the Spanish localization workflow for 30+ learning experiences, adopted by the team as its standard."
    ],
    currentFocus: [
      "Graduating from NYU in May 2027 and available for full-time work from then.",
      "I want to work where the hard parts of real-time graphics are still unsolved."
    ],
    links: [
      {
        label: "Resume",
        url: `${BASE_URL}assets/Eros Carrasco - Resume.pdf`,
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
      }
    ],

    // Hidden until there are two or three of these. One entry under a heading
    // that says "Selected" promises a set it cannot deliver.
    // selectedRecognition: [{
    //   title: "1st Place, NYU Data Science Bootcamp",
    //   image: `${BASE_URL}assets/images/bootcampBadge.png`,
    //   link: "https://credentials.engineering.nyu.edu/7844a2f4-ff71-4ea0-a2c7-48d8b27766f9#acc.gz582Yac"
    // }]
  },

  mocap: {
    title: "Salsa AI",
    oneLiner:
      "Beat-synced salsa step sequencing in Unity, with pose-based transition weights for natural mixing in any order.",
    pills: ["Python-in-Unity Pipeline", "Motion Capture", "Beat-to-Motion Sync"],

    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/mocap_hero.mp4`,
      poster: "",
    },

    whatItDoes: [
      "Syncs salsa steps to any track (beat-accurate)",
      "Generates endless routines from a mocap step library",
      "Keeps transitions smooth in any step order"
    ],

    mocapSourceVideos: [
      `${BASE_URL}assets/videos/mocap_1.mp4`,
      `${BASE_URL}assets/videos/mocap_2.mp4`,
      `${BASE_URL}assets/videos/mocap_3.mp4`
    ],

    howItWorks: {
      dataIngestion: {
        title: "YouTube Audio Importer (Python → Unity)",
        text: [
          "Convert YouTube links to WAV files instantly in Unity, speeding up the music testing loop.",
          "Built the download pipeline with yt-dlp and Editor scripting."
        ],
        video: `${BASE_URL}assets/videos/mocaptool_1.mp4`
      },
      musicAnalysis: {
        title: "Music Analysis (Python → Unity)",
        text: [
          "Extract beat timestamps and measure beat intervals to capture tempo changes.",
          "Unity editor tooling runs the pipeline and exports timing data as ScriptableObjects."
        ],
        video: `${BASE_URL}assets/videos/mocaptool_2.mp4`
      },
      poseAnalysis: {
        title: "Animation Analysis (Unity)",
        text: [
          "Run clip analysis in a background scene.",
          "Compare first and last frames for each step combination to measure pose distance (limbs + torso).",
          "Generate custom transition weights for every step combination."
        ],
        video: `${BASE_URL}assets/videos/mocaptool_3.mp4`
      },
      runtime: {
        title: "Runtime",
        text: [
          "Play steps in a chosen order or randomized.",
          "Match playback speed to the song timing data.",
          "Apply the precomputed weights to keep transitions smooth."
        ],
        video: `${BASE_URL}assets/videos/mocap_mushy.mp4`
      }
    },

    interesting: [
      "Salsa songs don't keep a single tempo, it shifts constantly. Measuring time between beats lets the system follow those changes and stay on time.",
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
      "Explorations at the intersection of ML and interactive media, focused on real-time, creative applications.",
    pills: ["ML", "Interactive Media", "Prototyping"],
    hero: {
      type: "image",
      src: `${BASE_URL}assets/images/card_ml_placeholder.jpg`,
    },
    context: ["Prototypes and experiments connecting ML ideas to interactive experiences."],
    role: ["Research + prototypes + experiments."],
    technical: ["Model experimentation", "Data pipelines", "Interactive integration"],
    gallery: [],
    demo: null,
  },

  multiplayer: {
    title: "Member Bot Demo",
    subtitle: "A fast-paced multiplayer arena showcasing network synchronization and scalable software architecture.",
    pills: ["Unity Netcode (NGO)", "Editor Scripting", "System Architecture", "Multiplayer Game"],
    hero: {
      type: "video",
      src: `${BASE_URL}assets/videos/memberbot_hero.mp4`,
      poster: `${BASE_URL}assets/images/memberbot_poster.jpg`,
    },
    context: {
      title: "Context",
      text: [
        "Acted as the sole programmer over a year-long development cycle, building the game from the ground up alongside a team of 3D artists.",
        "Focused heavily on creating a modular codebase to integrate art and audio assets seamlessly into a synchronized online environment."
      ]
    },
    technicalNetcode: {
      title: "Multiplayer Implementation",
      text: [
        "Implemented Unity Netcode for GameObjects, handling complex state synchronization across distributed clients.",
        "Managed NetworkVariables and RPCs to ensure server-authoritative movement and hit detection."
      ]
    },
    technicalArchitecture: {
      title: "Architecture & Editor Tooling",
      text: [
        "Structured the core systems using the Observer design pattern with ScriptableObjects to broadcast events, keeping the codebase decoupled and SOLID.",
        "Developed custom Editor scripts and Property Drawers (e.g., custom range sliders to enrich a single SFX with multiple pitch variations).",
        "Engineered a highly modular WeaponData system nesting VFX, SFX, and physics configurations, alongside a custom Gizmo manager for runtime debugging."
      ]
    },
    designProcess: {
      images: [
        `${BASE_URL}assets/images/memberbot_1.jpg`,
        `${BASE_URL}assets/images/memberbot_2.jpg`,
        `${BASE_URL}assets/images/memberbot_3.jpg`
      ]
    },
    fullDemo: {
      title: "Gameplay Video",
      src: "https://player.vimeo.com/video/1164528040",
      description: ""
    }
  },
};


// ===== HELPER FUNCTIONS =====

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
      ${gallery.map((img) => `
        <a href="${img.full}" target="_blank" rel="noopener">
          <img src="${img.thumb}" alt="${img.alt || ""}">
        </a>
      `).join("")}
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

function linksHTML(links = []) {
  if (!links.length) return "";
  return `
    <ul class="links-list">
      ${links.map((link) => `
        <li>
          <a href="${link.url}" target="_blank" rel="noopener">
            ${link.label}
          </a>
        </li>
      `).join("")}
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


// ===== RENDER FUNCTIONS =====

function renderProject(projectKey) {
  const p = PROJECTS[projectKey];
  if (!p) return `<p>Project not found.</p>`;

  if (projectKey === "about")       return renderAbout(p);
  if (projectKey === "mrandarin")   return renderMRandarin(p);
  if (projectKey === "frl")         return renderFRL(p);
  if (projectKey === "splatlab")    return renderSplatLab(p);
  if (projectKey === "transfr")     return renderTransfr(p);
  if (projectKey === "mocap")       return renderMocap(p);
  if (projectKey === "procedural")  return renderProcedural(p);
  if (projectKey === "multiplayer") return renderMultiplayer(p);

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

      ${p.demo ? `
        <section class="project-section span-2">
          <h2 class="section-title">Interactive Demo</h2>
          ${demoHTML(p.demo)}
        </section>
      ` : ""}
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
        <h2 class="section-title">Looking for</h2>
        ${listHTML(p.currentFocus)}
      </section>

      ${p.currently ? `
        <section class="project-section span-2">
          <h2 class="section-title">Currently</h2>
          <p class="currently-lead">${p.currently.lead}</p>
          <div class="lab-grid">
            ${p.currently.labs.map((l) => `
              <div class="lab-card">
                <h3 class="lab-name">${l.name}</h3>
                ${l.lead ? `<p class="lab-lead">${l.lead}</p>` : ""}
                ${l.bullets?.length ? listHTML(l.bullets) : ""}
              </div>
            `).join("")}
          </div>
        </section>
      ` : ""}

      ${p.industry?.length ? `
        <section class="project-section span-2">
          <h2 class="section-title">Industry</h2>
          ${listHTML(p.industry)}
        </section>
      ` : ""}

      ${p.links?.length ? `
        <section class="project-section">
          <h2 class="section-title">Links</h2>
          ${linksHTML(p.links)}
        </section>
      ` : ""}

    </div>
  `;
}

// A labelled figure with a caption underneath. Used for the evaluation charts,
// which need to be read rather than glanced at, so they run full width.
function videoFigureHTML(fig) {
  return `
    <figure class="fig fig-video">
      <video src="${fig.src}" poster="${fig.poster}" muted loop playsinline
             preload="none" controls aria-label="${fig.alt || ""}"></video>
      ${fig.caption ? `<figcaption>${fig.caption}</figcaption>` : ""}
    </figure>
  `;
}

function figureHTML(fig) {
  return `
    <figure class="fig">
      <a href="${fig.src}" target="_blank" rel="noopener">
        <img src="${fig.src}" alt="${fig.alt || ""}" loading="lazy">
      </a>
      ${fig.caption ? `<figcaption>${fig.caption}</figcaption>` : ""}
    </figure>
  `;
}

function slopeChartHTML(spec) {
  if (!spec?.series?.length) return "";
  const W = 620, H = 340;
  const X1 = 196, X2 = 424;          // the two columns
  const TOP = 56, BOT = 292;         // plot band
  const max = Math.max(...spec.series.flatMap((s) => [s.a, s.b])) * 1.06;
  const y = (v) => BOT - (v / max) * (BOT - TOP);

  // push labels apart so none collide, keeping their order
  const spread = (key) => {
    const pts = spec.series
      .map((s, i) => ({ i, y: y(s[key]) }))
      .sort((m, n) => m.y - n.y);
    for (let k = 1; k < pts.length; k++) {
      if (pts[k].y - pts[k - 1].y < 18) pts[k].y = pts[k - 1].y + 18;
    }
    const out = [];
    pts.forEach((pt) => (out[pt.i] = pt.y));
    return out;
  };
  const la = spread("a"), lb = spread("b");
  const fmt = (v) => `${v.toFixed(1)}%`;

  const rows = spec.series
    .map((s, i) => {
      const cls = s.accent ? `slope-line accent-${s.accent}` : "slope-line";
      return `
      <g class="slope-series${s.accent ? " is-accent" : ""}">
        <line class="slope-hit" x1="${X1}" y1="${y(s.a)}" x2="${X2}" y2="${y(s.b)}" />
        <line class="${cls}" x1="${X1}" y1="${y(s.a)}" x2="${X2}" y2="${y(s.b)}" />
        <circle class="slope-dot ${cls}" cx="${X1}" cy="${y(s.a)}" r="4" />
        <circle class="slope-dot ${cls}" cx="${X2}" cy="${y(s.b)}" r="4" />
        <text class="slope-name" x="126" y="${la[i] + 4}" text-anchor="end">${s.name}</text>
        <text class="slope-val"  x="178" y="${la[i] + 4}" text-anchor="end">${fmt(s.a)}</text>
        <text class="slope-val"  x="442" y="${lb[i] + 4}">${fmt(s.b)}</text>
      </g>`;
    })
    .join("");

  return `
    <figure class="slope-figure">
      <svg class="slope" viewBox="36 8 458 316" role="img"
           aria-label="${spec.alt}">
        <line class="slope-axis" x1="${X1}" y1="${TOP - 14}" x2="${X1}" y2="${BOT + 14}" />
        <line class="slope-axis" x1="${X2}" y1="${TOP - 14}" x2="${X2}" y2="${BOT + 14}" />
        <text class="slope-head" x="${X1}" y="30" text-anchor="middle">${spec.left}</text>
        <text class="slope-head" x="${X2}" y="30" text-anchor="middle">${spec.right}</text>
        ${rows}
      </svg>
      ${spec.caption ? `<figcaption>${spec.caption}</figcaption>` : ""}
    </figure>`;
}

function dataTableHTML(table) {
  if (!table?.rows?.length) return "";
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>${table.headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${table.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Prose section: paragraphs rather than bullets, for the parts of the page
// that carry an argument instead of a list of facts.
function proseSection(block, extra = "") {
  if (!block) return "";
  return `
    <section class="project-section span-2">
      <h2 class="section-title">${block.title}</h2>
      ${block.text.map((t) => `<p class="prose">${t}</p>`).join("")}
      ${extra}
    </section>
  `;
}

function renderMRandarin(p) {
  const ev = p.evaluation;
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
        <h2 class="section-title">In Short</h2>
        ${statsHTML(p.impactStats)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">${p.work.title}</h2>
        ${p.work.items.map((it) => `
          ${it.heading ? `<h3 class="part-title">${it.heading}</h3>` : ""}
          <div class="part-block${(it.figs || []).length ? " part-block-media" : ""}">
            <ul class="part-list">${it.text.map((t) => `<li>${t}</li>`).join("")}</ul>
            ${(it.figs || []).length ? `<div class="part-media">${it.figs.map(figureHTML).join("")}</div>` : ""}
          </div>
        `).join("")}
        ${slopeChartHTML(ev.slope)}
        <details class="numbers">
          <summary>Show the numbers</summary>
          ${dataTableHTML(ev.table)}
        </details>
        <ul class="part-list">${ev.takeaway.map((t) => `<li>${t}</li>`).join("")}</ul>
      </section>

      ${proseSection(p.credits)}
    </div>
  `;
}

function renderSplatLab(p) {
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
        <h2 class="section-title">In Short</h2>
        ${statsHTML(p.impactStats)}
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">${p.work.title}</h2>
        ${p.work.items.map((it) => `
          ${it.heading ? `<h3 class="part-title">${it.heading}</h3>` : ""}
          ${it.clips
            ? `<ul class="part-list">${it.text.map((t) => `<li>${t}</li>`).join("")}</ul>
               <div class="mocap-grid">${it.clips.map((c) => `<video src="${c.src}" aria-label="${c.alt}" autoplay muted loop playsinline></video>`).join("")}</div>`
            : `<div class="part-block${(it.figs || []).length ? " part-block-media" : ""}">
                 <ul class="part-list">${it.text.map((t) => `<li>${t}</li>`).join("")}</ul>
                 ${(it.figs || []).length ? `<div class="part-media">${it.figs.map(figureHTML).join("")}</div>` : ""}
               </div>`}
        `).join("")}
      </section>

    </div>
  `;
}

function renderFRL(p) {
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
      ${proseSection(p.labProject)}
      ${proseSection(p.contribution)}
      ${proseSection(p.howItWorks)}
      ${proseSection(p.throughLine)}
      ${proseSection(p.role)}
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

function renderProcedural(p) {
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
        </div>
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">Live Sandbox & API Integration</h2>
        <div class="sandbox-api-layout">

          <div class="sandbox-container">
            ${demoHTML(p.demo)}
          </div>

          <div class="api-context">
            <h3 class="how-title" style="margin-top: 0;">${p.liveData.title}</h3>
            ${listHTML(p.liveData.text)}
          </div>

        </div>
      </section>

    </div>
  `;
}

function renderMultiplayer(p) {
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
        <div class="split-layout">

          <div class="split-text-column">

            <div class="tech-card" style="margin-bottom: 30px;">
              <h3 class="how-title">${p.context.title}</h3>
              <ul class="tech-list">
                ${p.context.text.map(t => `<li>${t}</li>`).join("")}
              </ul>
            </div>

            <div class="tech-card" style="margin-bottom: 30px;">
              <h3 class="how-title">${p.technicalNetcode.title}</h3>
              <ul class="tech-list">
                ${p.technicalNetcode.text.map(t => `<li>${t}</li>`).join("")}
              </ul>
            </div>

            <div class="tech-card">
              <h3 class="how-title">${p.technicalArchitecture.title}</h3>
              <ul class="tech-list">
                ${p.technicalArchitecture.text.map(t => `<li>${t}</li>`).join("")}
              </ul>
            </div>

          </div>

          <div class="split-image-column">
            ${p.designProcess.images.map(img => `
              <img src="${img}" alt="" class="split-img" style="width: 100%; border-radius: 8px; margin-bottom: 15px; border: 1px solid rgba(255, 255, 255, 0.1);">
            `).join("")}
          </div>

        </div>
      </section>

      <section class="project-section span-2">
        <h2 class="section-title">${p.fullDemo.title}</h2>
        <p style="margin-bottom: 20px; color: var(--card-accent, #aaa);">${p.fullDemo.description}</p>
        <div class="youtube-wrapper">
          <iframe src="${p.fullDemo.src}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
      </section>

    </div>
  `;
}
