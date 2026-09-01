# âœ§ Lumina Studio â€” Next-Gen Productivity Operating System

> **All-in-One Local-First Productivity & Developer Workspace** â€” Real-time telemetry, Agile Kanban boards, first-class project portfolios, Web Audio procedural ambient synthesizer, and Markdown AI notes with interactive checklist-to-task synchronization.

---

## âœ¨ Features & Architecture

Lumina Studio is engineered as a modern, high-performance, client-side productivity OS built entirely with **Vanilla JavaScript (ES6+)**, **HTML5**, **CSS3**, **Canvas API**, **Web Audio API**, and **IndexedDB**. It has **zero external frameworks, zero npm dependencies, and zero trackers**.

`
                     +----------------------------------------------+
                     |          Lumina Glassmorphic UI              |
                     |  (Command Center, Projects, Kanban, Focus,   |
                     |    Notes, Analytics, Activity, Settings)     |
                     +----------------------+-----------------------+
                                            |
                                            v
                     +----------------------------------------------+
                     |          Lumina State Manager                |
                     | (Reactive Single Source of Truth & Cache)    |
                     +----------------------+-----------------------+
                                            |
                                            v
                     +----------------------------------------------+
                     |          Lumina Event Bus (Pub/Sub)          |
                     | (task:*, note:*, focus:*, project:*, etc.)   |
                     +----------------------+-----------------------+
                                            |
                                            v
                     +----------------------------------------------+
                     |          Repository Data Layer               |
                     |  (ProjectRepo, TaskRepo, NoteRepo,           |
                     |   FocusSessionRepo, ActivityRepo, Settings)  |
                     +----------------------+-----------------------+
                                            |
                                            v
                     +----------------------------------------------+
                     |          IndexedDB Persistence               |
                     |   (LuminaDB v1 + LocalStorage Migration)     |
                     +----------------------------------------------+
`

---

## ðŸŒŸ Core Modules

### 1. ðŸ“Š Command Center & Authentic Telemetry
- **Authentic Telemetry**: Replaces random numbers with real mathematical calculations derived from actual user activity:
  - **Task Completion Rate**: (completedTasks / totalTasks) * 100.
  - **Sprint Velocity**: Throughput of completed deliverables per weekly cycle.
  - **Deep Focus Hours**: Sum of all logged focus session minutes.
  - **Productivity Quality Score (0-100)**: Weighted score based on completed sessions, task throughput, and consistency.
- **Dynamic Canvas Area Chart**: Aggregated daily productivity points across 7D, 30D, and 90D timeframes with smooth cubic bezier curves and glowing gradients.
- **Work Breakdown Donut Chart**: Real-time categorized distribution of work across AI, Engineering, Design, and DevOps.

### 2. ðŸ“ Project Portfolio Management
- **First-Class Project Entities**: Name, description, custom theme accent color, status (Active, Paused, Archived, Completed).
- **Global Project Context Selector**: Header dropdown (All Projects â–¾, Lumina Studio Core, Cloud Edge Platform, AI Neural Research) dynamically filters Kanban, Notes, Focus Hub, Analytics, and Activity timeline across the entire application.
- **Project Dashboard**: Real-time progress bars, completed milestones count, total focused hours, focus sessions count, linked notes count, and instant action shortcuts.

### 3. ðŸ“‹ Agile Kanban Task Board
- **4 Progression Columns**: *Backlog*, *In Progress*, *Review*, and *Completed*.
- **Drag-and-Drop Workflow**: Smooth HTML5 Drag and Drop with column drag-over glowing highlights.
- **Task Deep Linking & Source Tracking**:
  - Assign tasks to projects, set estimated duration, priority level, category tags, and due dates.
  - **Task Detail View**: Displays focused time, estimated time, project context, and origin note relationship.
  - **Start Focus**: One-click jump from any task card directly into Focus Hub with task and project pre-bound.
  - **Completed Timestamp**: Automatic completedAt logging, project progress updates, and activity timeline event emission.

### 4. âœï¸ Markdown AI Note Studio & Checklist Sync
- **Multi-Note Management**: Notes drawer to create, switch, and delete notes linked to projects.
- **Live AST Markdown Parser**: Renders headers, code blocks, blockquotes, bold/italic, lists, and checklists.
- **Checklist-to-Task Conversion**:
  - Automatically identifies - [ ] Item in markdown and renders an interactive **âž• Task** button directly in the live preview.
  - **Convert All Checklist Items (âš¡ Tasks)**: One-click converts all unchecked checklist items into tracked Kanban tasks linked to the note (sourceNoteId).
  - **Open Source Note**: Jump directly from any task back to its originating note.
- **Note Metrics & Export**: Real-time word count, character count, estimated reading time, and one-click .md file download.

### 5. â±ï¸ Focus Hub & Web Audio Ambient Synthesizer
- **Task & Project Binding Banner**: Displays currently focused project and task.
- **Pomodoro Timer**: Customizable focus sessions (Focus 25m, Short Break 5m, Long Break 15m) with an SVG radial countdown ring and audio chimes.
- **Procedural Web Audio Engine**: Zero-sample ambient sound generators with memory-leak-safe node disposal and gain ramping:
  - ðŸŒŒ **Cosmic Drone**: Deep multi-oscillator sawtooth chord synthesis with lowpass filter sweeps.
  - ðŸ§  **Binaural 432Hz**: Alpha wave focus beats with 8Hz differential.
  - ðŸŒ§ï¸ **Gentle Rain**: Procedural white/pink noise with modulated bandpass filter curves.
  - ðŸ’¨ **Pink Noise**: 1/f spectral noise acoustic filter.
- **Live Spectrum Visualizer**: 60FPS frequency spectrum canvas that pulses to the synthesized sound waves.
- **Focus Session Hook**: Finishing a session credits focused minutes (+25m) to both the active Task and active Project, logs the session to IndexedDB, and updates productivity scores.

### 6. ðŸ“œ System Activity Timeline
- Chronological timeline grouped by **TODAY**, **YESTERDAY**, and **EARLIER**.
- Filterable by project and event type (*Tasks*, *Focus Sessions*, *Notes*, *Projects*).
- Formatted timestamps, icons, descriptions, and quick action links.

### 7. âŒ¨ï¸ Universal Command Palette (Ctrl + K) & Global Search
- Instant keyboard-driven global action and search menu with fuzzy filtering across projects, tasks, notes, activities, and system commands.
- Prefix filters: 	ask:auth, project:lumina, 
ote:arch.
- Full keyboard navigation (â†‘, â†“, Enter, Esc).

### 8. âš™ï¸ Settings & Data Management
- **Themes**: 4 cyber-luxe themes (**Dark Obsidian ðŸŒ™**, **Nebula Purple ðŸ”®**, **Cyber Emerald ðŸŒ¿**, **Crisp Light â˜€ï¸**).
- **Reduced Motion**: Respects @media (prefers-reduced-motion: reduce) with dedicated toggle.
- **Data Management**:
  - ðŸ’¾ **Export Workspace JSON**: Complete backup of projects, tasks, notes, focus sessions, activities, and settings.
  - ðŸ“¥ **Import Workspace**: Validated JSON restore with conflict resolution.
  - ðŸ“‘ **Export All Notes**: Batch download of all workspace notes as Markdown.
  - âš ï¸ **Reset Workspace**: Safe clearing and restore to factory templates.
- **Diagnostics**: Real-time storage statistics of records stored in IndexedDB.

### 9. ðŸ“± Progressive Web App (PWA) & Offline Ready
- Includes manifest.json and cache-first service-worker.js.
- Installable on desktop and mobile devices.
- 100% offline-ready with local status badge (â— Local / Offline Ready).

---

## âŒ¨ï¸ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd> | Open Universal Command & Search Palette |
| <kbd>Ctrl + P</kbd> / <kbd>Cmd + P</kbd> | Open Quick Project Switcher Dropdown |
| <kbd>Ctrl + T</kbd> / <kbd>Cmd + T</kbd> | Open Create Task Modal |
| <kbd>Ctrl + N</kbd> / <kbd>Cmd + N</kbd> | Create New Markdown Note |
| <kbd>Space</kbd> | Toggle Start / Pause Focus Timer (when on Focus Hub) |
| <kbd>Escape</kbd> | Close any active Modal or Palette |
| <kbd>G then D</kbd> | Navigate to Command Center Dashboard |
| <kbd>G then P</kbd> | Navigate to Projects Management |
| <kbd>G then K</kbd> | Navigate to Kanban Task Board |
| <kbd>G then N</kbd> | Navigate to AI Note Studio |
| <kbd>G then F</kbd> | Navigate to Focus Hub & Audio |
| <kbd>G then A</kbd> | Navigate to Productivity Analytics |
| <kbd>G then S</kbd> | Navigate to Settings & Data Management |

---

## ðŸ“‚ Project Structure

`
Lumina/
â”œâ”€â”€ index.html        # Single Page Application layout, navigation & modals
â”œâ”€â”€ style.css         # Cyber-luxe glassmorphic design system & responsive layout
â”œâ”€â”€ app.js            # Reactive state bus, IndexedDB repositories, Web Audio synth & charts
â”œâ”€â”€ manifest.json     # Progressive Web App (PWA) manifest
â”œâ”€â”€ service-worker.js # Cache-first service worker for 100% offline operation
â””â”€â”€ README.md         # Documentation & architecture guide
`

---

## ðŸš€ Getting Started

Lumina Studio runs completely client-side in any modern web browser with zero build steps or npm installations.

### Option 1: Direct File Launch
Double click index.html in your file manager or open ile:///.../index.html in Chrome, Edge, Safari, or Firefox.

### Option 2: Live Local Server
`ash
# Start a local HTTP server
python -m http.server 3000
# or: npx serve .
`
Visit http://localhost:3000 in your browser.

---

## ðŸ“œ License
MIT License. Created with Lumina Studio.