# eros-carrasco.github.io

Personal portfolio of **Eros Carrasco** — Creative Technologist working at the
intersection of XR and AI. NYU M.S.

**Live site → <https://eros-carrasco.github.io/>**

## Featured work

| Project | What it is | Stack |
| --- | --- | --- |
| [Transfr](https://eros-carrasco.github.io/projects/transfr/) | Five VR career exploration simulations deployed in real classrooms, plus a formalized Spanish localization workflow for 30+ sims | Unity, VR, localization |
| [Salsa AI](https://eros-carrasco.github.io/projects/salsa-ai/) | Beat-synced salsa step sequencing with pose-based transition weights, so captured steps mix naturally in any order | Unity, motion capture, Python-in-Unity |
| [IDM Biome](https://eros-carrasco.github.io/projects/idm-biome/) | A procedurally generated world shaped by physical hardware and live data | Unity, Arduino, procedural generation |
| [Member Bot](https://eros-carrasco.github.io/projects/member-bot/) | A multiplayer arena built solo over a year-long cycle, focused on network sync and modular architecture | Unity Netcode (NGO), editor tooling |

## Tech

Hand-written static HTML, CSS, and vanilla JavaScript. No framework, no build
step, no dependencies — clone it and open `index.html`.

## Structure

```
index.html            Homepage: about card + 2x2 project grid
about/                About page
projects/<slug>/      One thin HTML shell per project
css/styles.css        All styles
js/
  projects.js         Project content as data + the renderer
  main.js             Homepage card hover previews
  parallax.js         Background parallax on project pages
assets/               Videos, images, resume
unity-webgl/          Unity WebGL build embedded in IDM Biome
```

### Adding a project

Content lives as data, not markup. To add a project:

1. Add an entry to the `PROJECTS` object in [`js/projects.js`](js/projects.js).
2. Copy any `projects/<slug>/index.html` to a new folder and point
   `renderProject("<key>")` at your new key.
3. Add a card to the grid in [`index.html`](index.html).

Each project page sets `BASE_URL` before loading `projects.js` so asset paths
resolve correctly at any directory depth.

### Media

Videos are encoded for web delivery with H.264 + `faststart`:

```sh
# hero (full-width, autoplays)
ffmpeg -i in.mp4 -c:v libx264 -preset slow -crf 28 -r 30 \
  -vf "scale='min(1440,iw)':-2" -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 96k out.mp4

# homepage card preview (plays on hover, no audio)
ffmpeg -i in.mp4 -c:v libx264 -preset slow -crf 30 -r 30 \
  -vf "scale='min(1280,iw)':-2" -pix_fmt yuv420p -movflags +faststart \
  -an out.mp4
```

Keep raw screen-recorder exports out of the repo — they run ~20 Mbps, which is
roughly 30x heavier than these settings for no visible gain.
