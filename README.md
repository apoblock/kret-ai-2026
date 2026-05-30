# KRET (1991) - Retro Web Clone

A modern, high-fidelity web-based clone and tribute to the classic 1991 Polish puzzle-arcade DOS game **Kret** (The Mole), originally developed by Andrzej Baka and Mariusz Buras. Built in 100% Vanilla JavaScript, HTML5 Canvas, and CSS3, this clone features chiptune chimes synthesized via the Web Audio API, responsive CRT monitor styling, customizable screen sizing, and bilingual support.

### 🎮 **[Play Live on GitHub Pages!](https://apoblock.github.io/kret-ai-2026/)**

---

## ℹ About the Original Game

Originally released in Poland in 1991, **Kret** is a unique puzzle-arcade game where the player controls a mole (Kret) navigating a grid filled with interlocking blocks. Unlike standard falling-block games (like Tetris), the mole digs through the block piles, eating entire pieces to score points while avoiding being crushed by blocks sliding or falling from above. The mole is subject to gravity, falling when unsupported, but can scale block piles if the player acts quickly.

---

## 🚀 Key Features

*   **VGA CRT Monitor Aesthetics:** Real-time CSS scanlines overlay, curved glass reflections, screen vignettes, and subtle CRT screen flickers (with a toggle in settings to turn the effects on/off).
*   **Configurable Board Sizes:** Dynamically switch between **Small (400x400 px)**, **Medium (500x500 px)**, and **Large (600x600 px)** board dimensions in settings. The cabinet frame, playing field, and HUD dashboards scale and adapt seamlessly.
*   **Dense Cave Prefill:** Each session starts with a highly populated grid of **85 to 100 random blocks** filling the visible cavern area (rows 20–39). Kret spawns dynamically on a random empty starting cell on the bottom floor.
*   **Multi-Block Spawning & Cascades:** Spawns a constant stream of falling blocks from the sky (rows 0–19) whenever the top 4 rows are cleared. Blocks fall at speed-scaled intervals.
*   **Responsive Touch D-Pad:** Mobile and tablet support via on-screen controls, styled with retro directional arrow glyphs.
*   **Chiptune Sound Synthesis:** Browser-synthesized audio effects (eat chime, thud land, minor arpeggio game over) generated programmatically using Web Audio API oscillators.
*   **Settings & Leaderboards:** Polish/English language selector, CRT scanlines toggle, audio volume slider, and local top-10 high scores leaderboard saved in `localStorage`.
*   **Bloody Death Animation:** When Kret is crushed, a custom 2-second death sequence triggers: Kret splats into a red blood puddle and 40 red physics-based particles spray outwards and scatter across the board.

---

## 🎮 How to Play

1.  **Controls:**
    *   **Move Left:** `Left Arrow` / `A` / Left Touch Button
    *   **Move Right:** `Right Arrow` / `D` / Right Touch Button
    *   **Climb / Dig Up:** `Up Arrow` / `W` / Up Touch Button
2.  **Rules:**
    *   Dig through blocks by moving into them. Eating a tetromino clears the entire piece and awards **+40 points**.
    *   If you climb up or step into empty air, you fall down.
    *   **Watch your head!** If an unsupported block falls and overlaps Kret's cell, Kret is crushed (Game Over).
    *   Blocks fall at speed-scaled intervals (1 second per step at Level 0, speeding up as your score increases).
    *   A random block on the board is chosen to dissolve every **15 seconds**, flashing for 3 seconds as a warning before disappearing. If you eat the flashing block, the dissolution is cancelled.

---

## 🛠 Tech Stack

*   **Logic & Physics:** Vanilla JavaScript (ES6) with a single unified `blocks = []` list database.
*   **Graphics:** HTML5 Canvas API (2D context).
*   **Styling & FX:** Vanilla CSS3 Flexbox with viewport-relative queries, custom linear gradients (for the red brick cabinet), and CSS keyframe animations.
*   **Sound:** Web Audio API (`AudioContext`, `OscillatorNode`, and `GainNode`).
*   **Storage:** HTML5 Web Storage API (`localStorage`).

---

## ✍ Original Authors Tribute
This project is a non-commercial tribute to the original creators of the 1991 Polish classic:
*   **Andrzej Baka** & **Mariusz Buras** (1991)

*Remake created in 2026.*
