# Galaxia

A Space Invaders clone built with the HTML5 Canvas API and plain JavaScript. It has no dependencies and no build step.

## Play

Open `index.html` in a browser. You can also serve the folder with any static server:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

| Key                 | Action               |
| ------------------- | -------------------- |
| `←` `→` / `A` `D`   | Move                 |
| `Space` / `↑`       | Fire (every tap shoots; hold for auto-fire) |
| `P` / `Esc`         | Pause / resume       |
| `Enter`             | Start / restart      |
| `M`                 | Mute sound           |

## Features

- 5×11 invader formation that marches, drops and speeds up as invaders are destroyed
- Four destructible shields that wear away pixel by pixel
- Mystery UFO with the classic score table
- Three kinds of animated alien shots; only the lowest alien in each column can fire
- Rapid fire: each tap shoots right away, with several of your shots on screen at once
- Your shots and alien shots cancel out when they collide
- Extra life at 1,500 points and a new wave each level, with difficulty rising per level
- Sound effects synthesized with WebAudio (no audio files needed)
- High score saved in `localStorage`

## Code structure

- `index.html` is the page and the canvas
- `style.css` holds the layout and pixel-art scaling
- `game.js` holds all game logic:
  - **Input**: `keydown` and `keyup` update a set of held keys plus a per-tick set of newly pressed keys. Game keys call `preventDefault` so the page does not scroll, and all keys are released when the window loses focus.
  - **Loop**: `requestAnimationFrame` drives a fixed 60 Hz simulation step, so the game runs at the same speed on every display refresh rate.
  - **Sprites**: ASCII bitmaps are drawn once to offscreen canvases at startup.
