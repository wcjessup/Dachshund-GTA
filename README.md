# Dachshund GTA — Wiener Wanted 🌭🐾

A tiny top-down "Grand Theft Auto"-style browser game where you play a
dachshund burgling a small procedurally-generated city. Everything —
sprites, city, music, and sound effects — is generated in code with
Canvas 2D and the Web Audio API. There are no external image or audio
files, so the whole game is a handful of small JS/CSS/HTML files.

## Play it

Just open `index.html` in a browser (double-click it, or drag it into a
tab). No build step, no server, no dependencies.

If you'd rather serve it (some browsers are stricter about local files):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Works on desktop (keyboard) and mobile/touch (on-screen joystick +
buttons appear automatically on touch devices).

## How to play

- **WASD / Arrow keys** — run around town
- **Shift** — sprint (burns your stamina bar, bottom-left)
- **E / Space** (hold, near a pedestrian) — steal whatever they're carrying
- **B** — bark, startles nearby pedestrians
- **Esc** — pause
- **M** — mute

Steal cash, purses, wallets, phones, watches, hot dogs, and donuts from
wandering pedestrians and off the ground before the 2-minute clock runs
out. Every theft raises your **heat** (top right, ★ meter) — enough heat
and nearby cops will start chasing you. Get caught and you'll drop some
of your cash and lose time. Duck into the **cardboard box** in the
graffiti alley to hide and let your heat cool off faster. There's also a
jump-rope easter egg hidden in that same alley — go find it.

High score is saved locally in your browser (`localStorage`).

## Project layout

```
index.html        Markup: canvas, HUD, title/pause/game-over screens
css/style.css      All visual styling, responsive + touch layout
js/utils.js        Math/collision helpers
js/audio.js        Web Audio synth engine — procedural music + SFX
js/sprites.js      Every character/prop, drawn with canvas paths
js/city.js         Procedural city layout, buildings, props, collision
js/entities.js     Player, Pedestrian, Cop, Pickup, Particle classes
js/input.js        Keyboard + on-screen touch controls
js/game.js         Game loop, camera, spawning, scoring, heat system
js/main.js         Boots everything, draws the title logo
```

## Notes

- The Google Font import in `css/style.css` is a progressive enhancement;
  if it can't load (e.g. offline), the UI falls back to a system
  sans-serif and everything still works.
- `window.__gameRef` exposes the live game instance in the browser
  console, handy for poking at state while playing.
