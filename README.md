# ✧ Lumina Studio

> **Next-Gen Workspace & Productivity Hub** — Real-time telemetry, Agile Kanban management, Web Audio ambient synthesizer, and Markdown AI notes with a modern glassmorphic interface.

---

## ✨ Features

- **📊 Command Center & Analytics**:
  - Live animated HTML5 Canvas charts (Smooth Bezier Area Chart with 7D/30D/90D filters & Donut Chart).
  - Dynamic KPI cards with live trend indicators and 60FPS real-time telemetry simulation.

- **📋 Agile Kanban Task Board**:
  - Interactive drag-and-drop workflow across 4 progression columns (*Backlog*, *In Progress*, *Review*, *Completed*).
  - Real-time search, category filtering (`AI`, `Design`, `Dev`, `Ops`), and task creation modal.
  - Complete state persistence with `localStorage`.

- **⏱️ Focus Hub & Web Audio Synthesizer**:
  - Pomodoro timer with SVG radial countdown ring and audio chimes.
  - Self-contained multi-node Web Audio API ambient sound generator:
    - 🪕 **Balochi Suroz & Damburag Ambient (سروز)**: Traditional modal drone and generative bowed glissando in D Bayati / Zahirok folk scale.
    - 🌌 **Cosmic Drone** (Multi-oscillator chord synthesis)
    - 🧠 **Binaural 432Hz** (Alpha wave 8Hz focus beat)
    - 🌧️ **Gentle Rain** (Filtered white noise synthesis)
    - 💨 **Pink Noise** (1/f spectral noise filter)
  - Real-time spectrum visualizer canvas.

- **✍️ Markdown AI Note Studio**:
  - Split-view editor with live markdown parser rendering headings, checklists, code blocks, and quotes.
  - Quick-load templates (*Sprint Planning*, *Meeting Minutes*, *System Architecture*, *Brainstorming Sandbox*).
  - Live word count, character count, read time estimator, and one-click `.md` file export.

- **⌨️ Command Palette (`Ctrl + K`)**:
  - Instant keyboard-driven global action menu with fuzzy filtering.

- **🎨 Multi-Theme Engine**:
  - 4 themes: **Dark Obsidian 🌙**, **Nebula Purple 🔮**, **Cyber Emerald 🌿**, and **Crisp Light ☀️**.

---

## 🚀 Getting Started

Lumina Studio is built using Vanilla HTML5, CSS3, and modern JavaScript with zero external build dependencies or npm requirements.

### Option 1: Direct Browser Launch
Simply open `index.html` in any modern web browser.

### Option 2: Local HTTP Server (Python)
```bash
# Clone the repository
git clone https://github.com/Mubarik23/Lumina.git
cd Lumina

# Start Python local server
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.

---

## 📂 Project Structure

```
Lumina/
├── index.html        # Semantic HTML5 Single Page Application
├── style.css         # Glassmorphic cyber-luxe design system & responsive layout
├── app.js            # Reactive state bus, Canvas charts, Web Audio synth & Kanban
└── README.md         # Documentation & setup guide
```

---

## 📜 License
MIT License. Created with Lumina Studio.
