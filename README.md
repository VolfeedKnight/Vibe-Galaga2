# Mini Galaga

A small browser arcade game built with `HTML`, `CSS`, and `JavaScript`.

## Files

- `index.html` - game screen and HUD
- `style.css` - layout and presentation
- `config.js` - shared game constants
- `audio.js` - sound and music controller
- `game.js` - game loop, input, collision, rendering

## Run

1. Open the project folder.
2. Open `index.html` in a browser.

If you want to serve it locally:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Controls

- `Left / Right` or `A / D` - move
- `Space` - shoot
- `P` - pause
- `Enter` - restart
- Mobile buttons are available below the canvas

## Game Flow

- The game now uses 3 stages.
- `Stage 1` covers waves 1-4.
- `Stage 2` covers waves 5-8.
- `Stage 3` starts at wave 9 and keeps the late-game pace going.

## Enemies

- `scout`, `fighter`, `tank`, `sniper`, `splitter`, `boss`

## Powerups

- `shield`, `rapid`, `spread`, `score x2`, `bomb`

## Notes

- Score, combo, best score, lives, wave, stage, and power are shown in the HUD.
- Boss waves still appear every 4th wave.
