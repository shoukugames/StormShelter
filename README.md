# StormShelter

**Version 0.1.1** · Released November 8, 2026 · Recommended ages **3+**

StormShelter is a physics-based building puzzle game for young children, loosely
inspired by *The Three Little Pigs*. Instead of pigs there are children, and
instead of a wolf there is a storm.

A **weather warning** sounds: high winds, a gale, a thunderstorm, a tornado or a
hurricane is on the way. The player has **99 seconds** to build a shelter around
the kids using the supplies in the box. When the timer runs out, or when the
player presses **Done!**, the storm arrives. If the kids stay safe and dry for
**5 seconds** of full-force wind, the level is passed.

## Features

- **100 levels** across five storm types (High Winds, Gale, Thunderstorm,
  Tornado, Hurricane), each one verified to be beatable by the real physics engine.
- **Three difficulties**: Easy, Medium and Hard. Harder modes bring stronger
  wind, weaker glue and fewer spare pieces.
- **Real physics** (planck.js / Box2D): straw is light and weak, wood is
  medium, brick is heavy and strong, stone is strongest. Touching pieces stick
  together when the storm hits, and joints can break under stress.
- **Kid-friendly controls**: click (or tap) a piece in the box to pick it up,
  move it where you want it, and click again to drop it. No need to hold the
  mouse button down. Big buttons, picture icons and optional read-aloud hints.
- **3 save slots** with automatic progress saving and an in-game **Save Game**
  button that remembers a half-built shelter so you can resume it later from
  the level screen.
- **For Parents** section (behind a simple grown-ups check) showing progress per
  difficulty, stars, score, play time, success rate, recent attempts and a
  "what to practise" list of the things the child got wrong, with tips.
- **Relaxing ambient music** (procedurally generated) with a Music On/Off
  toggle on the title screen, plus wind, rain, thunder and building sounds.
- Hand-drawn procedural graphics: changing skies, swaying trees and grass, rain,
  lightning, a tornado funnel, rainbows and confetti.
- Works completely offline.

## How to play

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Pick up a piece | Click (tap) it in the box at the bottom | |
| Move the piece | Move the mouse; the piece follows (a dashed line shows where it will land) | |
| Drop the piece | Click (tap) where you want it | |
| Turn the piece you are holding | Turn button, mouse wheel or right-click | `R` or `Space` |
| Move a placed piece | Click it to pick it up, then click where it should go | |
| Turn a placed piece | Right-click it | |
| Put a piece back | Click on the box while holding it | `Esc` |
| Undo the last piece | Undo button | `Ctrl+Z` |
| Take everything back | Broom button | |
| Start the storm early | **Done!** button | `Enter` |
| Pause / Save | Pause button | `Esc` |
| Fullscreen | Title screen button | `F11` |

Click-and-hold dragging still works too: press on a piece, drag it and let go.

**Tips:** build walls on the side the wind arrow points from, put a roof over
the kids when it rains, and use heavier materials for strong storms. In tornado
levels the wind changes direction, so build walls on both sides.

## Installing

Pre-built packages are created in `dist/`:

- **Linux (Debian/Ubuntu):** `storm-shelter_0.1.1_amd64.deb`
  ```bash
  sudo apt install ./dist/storm-shelter_0.1.1_amd64.deb
  ```
  Then launch **StormShelter** from your applications menu or run `stormshelter`.
- **Windows:** `StormShelter-Setup-0.1.1.exe` (installer) or
  `StormShelter-Portable-0.1.1.exe` (no installation needed).

## Building from source

Requirements: Node.js 18+ and npm. Building the Windows `.exe` on Linux also
needs Wine.

```bash
npm install            # install Electron, electron-builder, planck.js, fonts
npm run vendor         # copy planck.js, fonts and the license text into src/
npm start              # run the game
npm run test:sim       # verify all 300 level/difficulty combinations
npm run dist           # build the .deb and the Windows .exe files into dist/
```

`node scripts/build-levels.js` regenerates `src/js/levels-data.js`. Every level
is generated from a fixed seed and only accepted once a reference shelter
survives the storm in the physics simulation, with a 15% safety margin.

## Project layout

```
main.js, preload.js     Electron shell
src/index.html          screens and HUD
src/css/style.css       UI styling
src/js/data.js          materials, pieces, storms, difficulty settings
src/js/levels-data.js   the 100 levels x 3 difficulties (generated)
src/js/physics.js       planck.js world, wind and rain model, glue and breaking
src/js/render.js        procedural graphics
src/js/audio.js         procedural music and sound effects (Web Audio)
src/js/save.js          settings and the 3 save slots
src/js/game.js          game flow, building, storm, scoring, input
src/js/ui.js            menus, level select, parents' report, credits
src/js/icons.js         SVG icon set
scripts/                level generator, regression test, vendoring helpers
```

## Reporting bugs

See [BUGREPORT.md](BUGREPORT.md), or email **info@shoukugames.org**.

## Credits

- **Created by:** Shawn Rapaz
- **Developed with:** Claude Code
- **Website:** https://shoukugames.org/
- **Email:** info@shoukugames.org
- Physics: [planck.js](https://github.com/piqnt/planck.js) (MIT)
- Font: Fredoka (SIL Open Font License 1.1)
- Runtime: Electron (MIT)

## License

Copyright © 2026 Shawn Rapaz

This program is free software: you can redistribute it and/or modify it under
the terms of the **GNU General Public License v3.0** as published by the Free
Software Foundation. This program is distributed in the hope that it will be
useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See [LICENSE](LICENSE) for
the full text.
