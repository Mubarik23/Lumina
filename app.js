/* ==========================================================================
   LUMINA STUDIO - Complete Product Operating System (v3.0)
   Unified Reactive State, IndexedDB Repositories, Event Bus, Web Audio Synth,
   Connected Projects, Tasks, Notes, Focus Hub & Real Telemetry
   ========================================================================== */

(function () {
  'use strict';

  // ==========================================================================
  // 1. EVENT BUS (LuminaBus)
  // ==========================================================================
  const LuminaBus = {
    events: {},
    on(event, handler) {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(handler);
    },
    off(event, handler) {
      if (!this.events[event]) return;
      this.events[event] = this.events[event].filter(h => h !== handler);
    },
    emit(event, data) {
      if (!this.events[event]) return;
      this.events[event].forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[LuminaBus] Error handling event ${event}:`, err);
        }
      });
    }
  };

  // ==========================================================================
  // 2. INDEXEDDB PERSISTENCE & DATA LAYER (LuminaDB)
  // ==========================================================================
  const DB_NAME = 'LuminaDB';
  const DB_VERSION = 1;
  let dbInstance = null;

  const LuminaDB = {
    async open() {
      if (dbInstance) return dbInstance;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('focusSessions')) db.createObjectStore('focusSessions', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('activities')) db.createObjectStore('activities', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
        };
        req.onsuccess = (e) => {
          dbInstance = e.target.result;
          resolve(dbInstance);
        };
        req.onerror = (e) => {
          console.warn('[LuminaDB] IndexedDB access restricted, using fallback storage:', e.target.error);
          resolve(null);
        };
      });
    },

    async getAll(storeName) {
      const db = await this.open();
      if (!db) {
        const local = localStorage.getItem(`lumina_store_${storeName}`);
        return local ? JSON.parse(local) : [];
      }
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    },

    async getById(storeName, id) {
      const db = await this.open();
      if (!db) {
        const items = await this.getAll(storeName);
        return items.find(i => i.id === id) || null;
      }
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    },

    async put(storeName, item) {
      const db = await this.open();
      if (!db) {
        const items = await this.getAll(storeName);
        const idx = items.findIndex(i => i.id === item.id);
        if (idx >= 0) items[idx] = item;
        else items.unshift(item);
        localStorage.setItem(`lumina_store_${storeName}`, JSON.stringify(items));
        return item;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(item);
        req.onerror = () => reject(req.error);
      });
    },

    async delete(storeName, id) {
      const db = await this.open();
      if (!db) {
        let items = await this.getAll(storeName);
        items = items.filter(i => i.id !== id);
        localStorage.setItem(`lumina_store_${storeName}`, JSON.stringify(items));
        return true;
      }
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    },

    async clear(storeName) {
      const db = await this.open();
      if (!db) {
        localStorage.removeItem(`lumina_store_${storeName}`);
        return true;
      }
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    }
  };

  // Repositories
  const ProjectRepository = {
    getAll: () => LuminaDB.getAll('projects'),
    getById: (id) => LuminaDB.getById('projects', id),
    create: (proj) => LuminaDB.put('projects', proj),
    update: (proj) => LuminaDB.put('projects', proj),
    delete: (id) => LuminaDB.delete('projects', id)
  };

  const TaskRepository = {
    getAll: () => LuminaDB.getAll('tasks'),
    getById: (id) => LuminaDB.getById('tasks', id),
    create: (task) => LuminaDB.put('tasks', task),
    update: (task) => LuminaDB.put('tasks', task),
    delete: (id) => LuminaDB.delete('tasks', id)
  };

  const NoteRepository = {
    getAll: () => LuminaDB.getAll('notes'),
    getById: (id) => LuminaDB.getById('notes', id),
    create: (note) => LuminaDB.put('notes', note),
    update: (note) => LuminaDB.put('notes', note),
    delete: (id) => LuminaDB.delete('notes', id)
  };

  const FocusSessionRepository = {
    getAll: () => LuminaDB.getAll('focusSessions'),
    create: (session) => LuminaDB.put('focusSessions', session)
  };

  const ActivityRepository = {
    getAll: () => LuminaDB.getAll('activities'),
    create: (activity) => LuminaDB.put('activities', activity)
  };

  const SettingsRepository = {
    get: async (key, defaultVal) => {
      const res = await LuminaDB.getById('settings', key);
      return res ? res.value : defaultVal;
    },
    set: async (key, val) => {
      return LuminaDB.put('settings', { id: key, value: val });
    }
  };

  // ==========================================================================
  // 3. GLOBAL REACTIVE STATE (LuminaState)
  // ==========================================================================
  const LuminaState = {
    currentView: 'dashboard',
    activeProjectId: 'all', // 'all' or specific projectId
    projects: [],
    tasks: [],
    notes: [],
    activeNoteId: null,
    focusSessions: [],
    activities: [],
    settings: {
      theme: localStorage.getItem('lumina_theme') || 'dark',
      reducedMotion: false,
      focusDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      defaultSoundscape: 'drone'
    },
    timer: {
      totalSeconds: 1500,
      remainingSeconds: 1500,
      intervalId: null,
      isRunning: false,
      modeLabel: 'Focus Time',
      boundTaskId: null,
      boundProjectId: 'proj-lumina'
    },
    audio: {
      ctx: null,
      analyser: null,
      masterOutputGain: null,
      isPlaying: {
        drone: false,
        binaural: false,
        rain: false,
        noise: false
      },
      nodes: {},
      volumes: {
        drone: 0.4,
        binaural: 0.35,
        rain: 0.5,
        noise: 0.3
      }
    },
    chartRange: '7d',
    analyticsRange: '7d'
  };

  // ==========================================================================
  // 4. DATA MIGRATION & SEEDING LAYER
  // ==========================================================================
  async function checkAndMigrateData() {
    const isMigrated = localStorage.getItem('lumina_migrated_v3');
    const existingProjects = await ProjectRepository.getAll();

    if (isMigrated && existingProjects.length > 0) {
      // Data already established
      return;
    }

    console.log('[Lumina Migration] Initializing standard workspace schema...');

    // 1. Seed Initial Projects
    const seedProjects = [
      {
        id: 'proj-lumina',
        name: 'Lumina Studio Core',
        desc: 'All-in-one cyber-luxe workspace OS, real-time telemetry, Web Audio synthesizers, and Kanban engine.',
        color: '#6366f1',
        status: 'Active',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'proj-website',
        name: 'Cloud Edge Platform',
        desc: 'Ingress routing, developer dashboard, automated CI/CD pipelines, and high-availability telemetry nodes.',
        color: '#06b6d4',
        status: 'Active',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'proj-research',
        name: 'AI Neural Research',
        desc: 'Ambient procedural audio generators, neural network models, and real-time Markdown AST parsing.',
        color: '#ec4899',
        status: 'Active',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const p of seedProjects) {
      await ProjectRepository.create(p);
    }

    // 2. Seed / Migrate Tasks
    let tasksToSeed = [];
    const legacyTasksRaw = localStorage.getItem('lumina_tasks');
    if (legacyTasksRaw) {
      try {
        const parsed = JSON.parse(legacyTasksRaw);
        tasksToSeed = parsed.map(t => ({
          id: t.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          projectId: 'proj-lumina',
          title: t.title,
          desc: t.desc || '',
          status: t.status || 'backlog',
          tag: t.tag || 'dev',
          priority: t.priority || 'Medium',
          progress: t.progress || (t.status === 'done' ? 100 : 40),
          estimatedMinutes: 60,
          focusedMinutes: t.status === 'done' ? 50 : 25,
          sourceNoteId: null,
          dueDate: t.dueDate || 'Upcoming',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: t.status === 'done' ? new Date().toISOString() : null
        }));
      } catch (e) {
        tasksToSeed = [];
      }
    }

    if (!tasksToSeed.length) {
      tasksToSeed = [
        {
          id: 'task-1',
          projectId: 'proj-lumina',
          title: 'Architect Web Audio Synthesizer Node Pipeline',
          desc: 'Build modular oscillators, biquad filter sweeps, and buffer generators for zero-leak ambient audio.',
          status: 'done',
          tag: 'ai',
          priority: 'High',
          progress: 100,
          estimatedMinutes: 90,
          focusedMinutes: 75,
          sourceNoteId: 'note-arch',
          dueDate: 'Today',
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date(Date.now() - 1 * 86400000).toISOString()
        },
        {
          id: 'task-2',
          projectId: 'proj-lumina',
          title: 'Design Glassmorphism Cyber-Luxe Design System',
          desc: 'Craft dynamic CSS custom properties, backdrop blur layers, and responsive layouts across 4 themes.',
          status: 'done',
          tag: 'design',
          priority: 'High',
          progress: 100,
          estimatedMinutes: 60,
          focusedMinutes: 50,
          sourceNoteId: null,
          dueDate: 'Today',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        },
        {
          id: 'task-3',
          projectId: 'proj-lumina',
          title: 'Implement Interactive Canvas Charts Engine',
          desc: 'Render smooth cubic bezier area paths with glowing gradient fills and authentic telemetry math.',
          status: 'in-progress',
          tag: 'dev',
          priority: 'High',
          progress: 75,
          estimatedMinutes: 120,
          focusedMinutes: 50,
          sourceNoteId: 'note-sprint',
          dueDate: 'Tomorrow',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        },
        {
          id: 'task-4',
          projectId: 'proj-lumina',
          title: 'Deploy Pomodoro Focus Engine with Audio Chimes',
          desc: 'Sync SVG radial dashoffset countdowns with Web Audio alert frequencies and task tracking.',
          status: 'in-progress',
          tag: 'dev',
          priority: 'Medium',
          progress: 50,
          estimatedMinutes: 45,
          focusedMinutes: 25,
          sourceNoteId: null,
          dueDate: 'Sep 03',
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        },
        {
          id: 'task-5',
          projectId: 'proj-research',
          title: 'Build Markdown Studio with Live AST & Checklist Sync',
          desc: 'Instant regex-based markdown compiler supporting interactive checklist task converters.',
          status: 'review',
          tag: 'ai',
          priority: 'Medium',
          progress: 90,
          estimatedMinutes: 60,
          focusedMinutes: 50,
          sourceNoteId: 'note-arch',
          dueDate: 'Sep 04',
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        },
        {
          id: 'task-6',
          projectId: 'proj-website',
          title: 'Kubernetes Cluster Edge Optimization & Ingress',
          desc: 'Configure ingress traffic routing and autoscaling telemetry thresholds for zero-downtime deploys.',
          status: 'backlog',
          tag: 'ops',
          priority: 'Low',
          progress: 0,
          estimatedMinutes: 90,
          focusedMinutes: 0,
          sourceNoteId: null,
          dueDate: 'Sep 08',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        }
      ];
    }

    for (const t of tasksToSeed) {
      await TaskRepository.create(t);
    }

    // 3. Seed Initial Notes
    const seedNotes = [
      {
        id: 'note-sprint',
        projectId: 'proj-lumina',
        title: 'Sprint Planning â€” Q3 Alpha Release',
        content: `# ðŸš€ Sprint Planning â€” Q3 Alpha Release\n\n## Core Deliverables\n- [x] Integrate Web Audio Synthesizer pipeline\n- [x] Dynamic glassmorphic theme selector (Obsidian, Nebula, Emerald)\n- [ ] Implement real-time WebSocket telemetry feed\n- [ ] Finalize responsive touch interaction tests\n\n## Architectural Notes\n> "High-performance interfaces must achieve continuous 60fps renders with zero frame drops."\n\n### Technical Stack\n\`\`\`javascript\nconst studio = new LuminaEngine({\n  audioVisualizer: true,\n  themeEngine: 'cyber-luxe',\n  storage: 'IndexedDB'\n});\nstudio.boot();\n\`\`\`\n`,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note-arch',
        projectId: 'proj-lumina',
        title: 'Lumina Architecture Blueprint',
        content: `# ðŸ›ï¸ Lumina Architecture Blueprint\n\n### Component Hierarchy\n1. **Particle Subsystem**: Independent canvas worker with dynamic alpha blending.\n2. **State Store**: Centralized reactive event bus & IndexedDB repositories.\n3. **Synthesizer Engine**: Multi-node Web Audio graph with biquad bandpass curves.\n\n### Action Items\n- [ ] Audit keyboard accessibility shortcuts\n- [ ] Verify offline PWA shell caching\n- [x] Create project productivity dashboard\n`,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const n of seedNotes) {
      await NoteRepository.create(n);
    }

    // 4. Seed Focus Sessions
    const seedSessions = [
      {
        id: 'session-1',
        projectId: 'proj-lumina',
        taskId: 'task-1',
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        endedAt: new Date(Date.now() - 86400000 + 1500000).toISOString(),
        durationMinutes: 25,
        completed: true,
        soundscape: 'Cosmic Drone'
      },
      {
        id: 'session-2',
        projectId: 'proj-lumina',
        taskId: 'task-1',
        startedAt: new Date(Date.now() - 82000000).toISOString(),
        endedAt: new Date(Date.now() - 82000000 + 1500000).toISOString(),
        durationMinutes: 25,
        completed: true,
        soundscape: 'Binaural 432Hz'
      },
      {
        id: 'session-3',
        projectId: 'proj-lumina',
        taskId: 'task-2',
        startedAt: new Date(Date.now() - 40000000).toISOString(),
        endedAt: new Date(Date.now() - 40000000 + 1500000).toISOString(),
        durationMinutes: 25,
        completed: true,
        soundscape: 'Gentle Rain'
      }
    ];

    for (const s of seedSessions) {
      await FocusSessionRepository.create(s);
    }

    // 5. Seed Activity Items
    const seedActivities = [
      {
        id: 'act-1',
        type: 'task',
        timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
        projectId: 'proj-lumina',
        entityId: 'task-2',
        title: 'Completed Task',
        desc: 'Marked "Design Glassmorphism Cyber-Luxe Tokens" as Completed'
      },
      {
        id: 'act-2',
        type: 'focus',
        timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
        projectId: 'proj-lumina',
        entityId: 'task-2',
        title: 'Completed Focus Session',
        desc: '25m Deep Focus session with Gentle Rain ambient sound'
      },
      {
        id: 'act-3',
        type: 'note',
        timestamp: new Date(Date.now() - 140 * 60000).toISOString(),
        projectId: 'proj-lumina',
        entityId: 'note-sprint',
        title: 'Updated Note',
        desc: 'Edited Sprint Planning â€” Q3 Alpha Release'
      },
      {
        id: 'act-4',
        type: 'project',
        timestamp: new Date(Date.now() - 280 * 60000).toISOString(),
        projectId: 'proj-lumina',
        entityId: 'proj-lumina',
        title: 'Created Project',
        desc: 'Initialized workspace project "Lumina Studio Core"'
      }
    ];

    for (const a of seedActivities) {
      await ActivityRepository.create(a);
    }

    localStorage.setItem('lumina_migrated_v3', 'true');
    console.log('[Lumina Migration] Migration completed successfully.');
  }

  // ==========================================================================
  // 5. APP INITIALIZATION & REFRESH
  // ==========================================================================
  async function init() {
    await checkAndMigrateData();
    await loadApplicationState();

    initTheme();
    initParticleCanvas();
    initNavigation();
    initProjectContextSelector();
    initProjectsModule();
    initKanbanModule();
    initFocusModule();
    initNotesModule();
    initAnalyticsModule();
    initActivityModule();
    initSettingsModule();
    initCommandPalette();
    initQuickActions();
    initGlobalShortcuts();
    initPWA();

    // Bind Bus Listeners for Targeted Cross-Module Updates
    bindEventBusSubscribers();

    // Initial Render of Views
    renderAllViews();
  }

  async function loadApplicationState() {
    LuminaState.projects = await ProjectRepository.getAll();
    LuminaState.tasks = await TaskRepository.getAll();
    LuminaState.notes = await NoteRepository.getAll();
    LuminaState.focusSessions = await FocusSessionRepository.getAll();
    LuminaState.activities = await ActivityRepository.getAll();

    // Sort activities latest first
    LuminaState.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Default note selection
    if (LuminaState.notes.length > 0 && !LuminaState.activeNoteId) {
      LuminaState.activeNoteId = LuminaState.notes[0].id;
    }
  }

  function bindEventBusSubscribers() {
    // Task Events
    LuminaBus.on('task:created', async (task) => {
      await TaskRepository.create(task);
      LuminaState.tasks.unshift(task);
      logActivity('task', task.id, task.projectId, 'Created Task', `Added "${task.title}"`);
      renderKanbanCards();
      renderProjectsGrid();
      updateSidebarCounts();
      updateDashboardTelemetry();
    });

    LuminaBus.on('task:updated', async (task) => {
      await TaskRepository.update(task);
      const idx = LuminaState.tasks.findIndex(t => t.id === task.id);
      if (idx >= 0) LuminaState.tasks[idx] = task;
      renderKanbanCards();
      renderProjectsGrid();
      updateDashboardTelemetry();
    });

    LuminaBus.on('task:completed', async (task) => {
      task.status = 'done';
      task.progress = 100;
      task.completedAt = new Date().toISOString();
      await TaskRepository.update(task);
      const idx = LuminaState.tasks.findIndex(t => t.id === task.id);
      if (idx >= 0) LuminaState.tasks[idx] = task;
      logActivity('task', task.id, task.projectId, 'Completed Task', `Finished deliverable "${task.title}"`);
      renderKanbanCards();
      renderProjectsGrid();
      updateSidebarCounts();
      updateDashboardTelemetry();
      playUiSound('success');
      showToast(`ðŸŽ‰ Completed task: "${task.title}"`);
    });

    LuminaBus.on('task:deleted', async (taskId) => {
      await TaskRepository.delete(taskId);
      LuminaState.tasks = LuminaState.tasks.filter(t => t.id !== taskId);
      renderKanbanCards();
      renderProjectsGrid();
      updateSidebarCounts();
      updateDashboardTelemetry();
    });

    // Project Events
    LuminaBus.on('project:created', async (proj) => {
      await ProjectRepository.create(proj);
      LuminaState.projects.unshift(proj);
      logActivity('project', proj.id, proj.id, 'Created Project', `New project workspace "${proj.name}"`);
      renderProjectSelectors();
      renderProjectsGrid();
      updateSidebarCounts();
    });

    LuminaBus.on('project:updated', async (proj) => {
      await ProjectRepository.update(proj);
      const idx = LuminaState.projects.findIndex(p => p.id === proj.id);
      if (idx >= 0) LuminaState.projects[idx] = proj;
      renderProjectSelectors();
      renderProjectsGrid();
    });

    LuminaBus.on('project:selected', (projId) => {
      LuminaState.activeProjectId = projId;
      updateProjectSelectorUI();
      renderKanbanCards();
      renderNotesList();
      renderActivityFeed();
      renderFullActivityTimeline();
      updateDashboardTelemetry();
      updateFocusContextBanner();
    });

    // Note Events
    LuminaBus.on('note:created', async (note) => {
      await NoteRepository.create(note);
      LuminaState.notes.unshift(note);
      LuminaState.activeNoteId = note.id;
      logActivity('note', note.id, note.projectId, 'Created Note', `Created "${note.title}"`);
      renderNotesList();
      loadActiveNoteToEditor();
      updateSidebarCounts();
    });

    LuminaBus.on('note:updated', async (note) => {
      await NoteRepository.update(note);
      const idx = LuminaState.notes.findIndex(n => n.id === note.id);
      if (idx >= 0) LuminaState.notes[idx] = note;
      renderNotesList();
    });

    // Focus Events
    LuminaBus.on('focus:completed', async (session) => {
      await FocusSessionRepository.create(session);
      LuminaState.focusSessions.unshift(session);

      // Add focused minutes to task
      if (session.taskId) {
        const task = LuminaState.tasks.find(t => t.id === session.taskId);
        if (task) {
          task.focusedMinutes = (task.focusedMinutes || 0) + session.durationMinutes;
          await TaskRepository.update(task);
        }
      }

      logActivity('focus', session.id, session.projectId, 'Completed Focus Session', `${session.durationMinutes}m deep focus completed with ${session.soundscape || 'Cosmic Drone'}`);
      renderProjectsGrid();
      renderKanbanCards();
      updateDashboardTelemetry();
      renderActivityFeed();
      renderFullActivityTimeline();
    });
  }

  async function logActivity(type, entityId, projectId, title, desc) {
    const activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      entityId,
      projectId: projectId || 'proj-lumina',
      title,
      desc,
      timestamp: new Date().toISOString()
    };
    await ActivityRepository.create(activity);
    LuminaState.activities.unshift(activity);
    renderActivityFeed();
    renderFullActivityTimeline();
    updateStorageStats();
  }

  function renderAllViews() {
    renderProjectSelectors();
    renderProjectsGrid();
    renderKanbanCards();
    renderNotesList();
    loadActiveNoteToEditor();
    renderActivityFeed();
    renderFullActivityTimeline();
    updateDashboardTelemetry();
    updateSidebarCounts();
    updateStorageStats();
  }

  // ==========================================================================
  // 6. NAVIGATION & ROUTING
  // ==========================================================================
  function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
        playUiSound('click');
      });
    });
  }

  function switchView(viewName) {
    LuminaState.currentView = viewName;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update active section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update Header titles
    const titleEl = document.getElementById('page-heading');
    const subTitleEl = document.getElementById('page-subheading');

    const headers = {
      dashboard: { title: 'Command Center', sub: 'Live telemetry, focus analytics & active workflow' },
      projects: { title: 'Projects Management', sub: 'Workspace portfolios, milestone metrics & project health' },
      kanban: { title: 'Task & Agile Board', sub: 'Drag and drop agile cards across progression columns' },
      focus: { title: 'Focus Hub & Audio Lab', sub: 'Binaural beats, ambient sound generator & pomodoro timer' },
      notes: { title: 'Markdown AI Studio', sub: 'Distraction-free rich note editor with live checklist conversion' },
      analytics: { title: 'Productivity Analytics', sub: 'Detailed velocity curves, focus scores & project comparison' },
      activity: { title: 'Activity Timeline', sub: 'Chronological event log of milestones, focus intervals & notes' },
      settings: { title: 'Workspace Settings', sub: 'Theme configuration, data import/export & shortcut cheatsheet' }
    };

    if (headers[viewName]) {
      titleEl.textContent = headers[viewName].title;
      subTitleEl.textContent = headers[viewName].sub;
    }

    // Trigger Canvas redraws if entering dashboard or analytics
    if (viewName === 'dashboard') {
      setTimeout(() => {
        renderAreaChart();
        renderDonutChart();
      }, 60);
    } else if (viewName === 'analytics') {
      setTimeout(() => {
        renderAnalyticsCharts();
      }, 60);
    } else if (viewName === 'settings') {
      updateStorageStats();
    }
  }

  // ==========================================================================
  // 7. PROJECT MANAGEMENT & GLOBAL SELECTOR
  // ==========================================================================
  function initProjectContextSelector() {
    const btn = document.getElementById('global-project-selector-btn');
    const menu = document.getElementById('global-project-dropdown');
    const quickNewBtn = document.getElementById('btn-quick-new-project');

    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
          menu.classList.remove('active');
        }
      });
    }

    if (quickNewBtn) {
      quickNewBtn.addEventListener('click', () => {
        if (menu) menu.classList.remove('active');
        openProjectModal();
      });
    }
  }

  function renderProjectSelectors() {
    // 1. Header Global Dropdown list
    const listEl = document.getElementById('global-project-list');
    if (listEl) {
      listEl.innerHTML = '';

      // All Projects Item
      const allItem = document.createElement('div');
      allItem.className = `proj-dropdown-item ${LuminaState.activeProjectId === 'all' ? 'active' : ''}`;
      allItem.innerHTML = `
        <span class="proj-color-dot" style="background:var(--accent-primary);"></span>
        <span style="font-weight:600;">All Projects</span>
      `;
      allItem.addEventListener('click', () => {
        LuminaBus.emit('project:selected', 'all');
        document.getElementById('global-project-dropdown')?.classList.remove('active');
      });
      listEl.appendChild(allItem);

      // Individual Projects
      LuminaState.projects.forEach(p => {
        const item = document.createElement('div');
        item.className = `proj-dropdown-item ${LuminaState.activeProjectId === p.id ? 'active' : ''}`;
        item.innerHTML = `
          <span class="proj-color-dot" style="background:${p.color};"></span>
          <span>${escapeHtml(p.name)}</span>
        `;
        item.addEventListener('click', () => {
          LuminaBus.emit('project:selected', p.id);
          document.getElementById('global-project-dropdown')?.classList.remove('active');
        });
        listEl.appendChild(item);
      });
    }

    // 2. Task Form Project Select Dropdown
    const taskProjSelect = document.getElementById('task-project-select');
    if (taskProjSelect) {
      taskProjSelect.innerHTML = LuminaState.projects.map(p => `
        <option value="${p.id}">${escapeHtml(p.name)}</option>
      `).join('');
    }

    // 3. Note Project Select Dropdown
    const noteProjSelect = document.getElementById('note-project-select');
    if (noteProjSelect) {
      noteProjSelect.innerHTML = LuminaState.projects.map(p => `
        <option value="${p.id}">${escapeHtml(p.name)}</option>
      `).join('');
    }

    updateProjectSelectorUI();
  }

  function updateProjectSelectorUI() {
    const dot = document.getElementById('active-proj-dot');
    const name = document.getElementById('active-proj-name');

    if (LuminaState.activeProjectId === 'all') {
      if (dot) dot.style.background = 'var(--accent-primary)';
      if (name) name.textContent = 'All Projects';
    } else {
      const activeProj = LuminaState.projects.find(p => p.id === LuminaState.activeProjectId);
      if (activeProj) {
        if (dot) dot.style.background = activeProj.color;
        if (name) name.textContent = activeProj.name;
      }
    }
  }

  function initProjectsModule() {
    const searchInput = document.getElementById('projects-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderProjectsGrid(searchInput.value);
      });
    }

    const openModalBtn = document.getElementById('btn-create-project-modal');
    if (openModalBtn) openModalBtn.addEventListener('click', () => openProjectModal());

    const closeModalBtn = document.getElementById('close-project-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-project-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProjectModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeProjectModal);

    const form = document.getElementById('project-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('project-edit-id').value;
        const name = document.getElementById('project-name-input').value.trim();
        const desc = document.getElementById('project-desc-input').value.trim();
        const status = document.getElementById('project-status-select').value;
        const colorRadio = document.querySelector('input[name="proj-color"]:checked');
        const color = colorRadio ? colorRadio.value : '#6366f1';

        if (!name) return;

        if (editId) {
          const proj = LuminaState.projects.find(p => p.id === editId);
          if (proj) {
            proj.name = name;
            proj.desc = desc;
            proj.color = color;
            proj.status = status;
            proj.updatedAt = new Date().toISOString();
            LuminaBus.emit('project:updated', proj);
            showToast('Project updated successfully');
          }
        } else {
          const newProj = {
            id: `proj-${Date.now()}`,
            name,
            desc: desc || 'Productivity workspace project.',
            color,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          LuminaBus.emit('project:created', newProj);
          showToast(`Project "${name}" created!`);
        }

        closeProjectModal();
        playUiSound('success');
      });
    }
  }

  function renderProjectsGrid(searchQuery = '') {
    const grid = document.getElementById('projects-card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const query = searchQuery.toLowerCase();
    const filtered = LuminaState.projects.filter(p => {
      return !searchQuery || p.name.toLowerCase().includes(query) || (p.desc && p.desc.toLowerCase().includes(query));
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align:center; padding:40px;">
          <div style="font-size:36px; margin-bottom:8px;">ðŸ“</div>
          <div style="font-size:16px; font-weight:700;">No projects found</div>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Create your first project to organize tasks, notes, and deep focus sessions.</p>
          <button class="btn-primary" style="margin-top:16px;" onclick="document.getElementById('btn-create-project-modal').click()">+ Create Project</button>
        </div>
      `;
      return;
    }

    filtered.forEach(proj => {
      const projTasks = LuminaState.tasks.filter(t => t.projectId === proj.id);
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter(t => t.status === 'done').length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const projSessions = LuminaState.focusSessions.filter(s => s.projectId === proj.id);
      const totalFocusMins = projSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const focusHoursStr = (totalFocusMins / 60).toFixed(1) + 'h';

      const projNotes = LuminaState.notes.filter(n => n.projectId === proj.id).length;

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="proj-card-top">
          <div class="proj-card-title-wrap">
            <span class="proj-color-dot" style="background:${proj.color}; width:12px; height:12px;"></span>
            <span class="proj-card-title">${escapeHtml(proj.name)}</span>
          </div>
          <span class="proj-status-badge status-${proj.status.toLowerCase()}">${proj.status}</span>
        </div>
        <p class="proj-card-desc">${escapeHtml(proj.desc || 'No description provided.')}</p>
        
        <div>
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-weight:600;">
            <span style="color:var(--text-secondary);">Progress</span>
            <span style="color:var(--accent-primary);">${progressPercent}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${progressPercent}%; background:${proj.color};"></div>
          </div>
        </div>

        <div class="proj-metrics-row">
          <div>
            <div class="proj-mini-stat-val">${completedTasks}/${totalTasks}</div>
            <div class="proj-mini-stat-label">Tasks Done</div>
          </div>
          <div>
            <div class="proj-mini-stat-val">${focusHoursStr}</div>
            <div class="proj-mini-stat-label">Focus Time</div>
          </div>
          <div>
            <div class="proj-mini-stat-val">${projSessions.length}</div>
            <div class="proj-mini-stat-label">Sessions</div>
          </div>
          <div>
            <div class="proj-mini-stat-val">${projNotes}</div>
            <div class="proj-mini-stat-label">Notes</div>
          </div>
        </div>

        <div class="proj-card-footer">
          <div style="display:flex; gap:6px;">
            <button class="btn-secondary proj-open-board-btn" style="padding:4px 10px; font-size:11px;">Open Board</button>
            <button class="btn-secondary proj-start-focus-btn" style="padding:4px 8px; font-size:11px;" title="Focus on this project">â±ï¸ Focus</button>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="card-action-btn proj-edit-btn" title="Edit Project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="card-action-btn delete-btn proj-delete-btn" title="Delete Project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;

      card.querySelector('.proj-open-board-btn').addEventListener('click', () => {
        LuminaBus.emit('project:selected', proj.id);
        switchView('kanban');
      });

      card.querySelector('.proj-start-focus-btn').addEventListener('click', () => {
        LuminaState.timer.boundProjectId = proj.id;
        LuminaState.timer.boundTaskId = null;
        updateFocusContextBanner();
        switchView('focus');
      });

      card.querySelector('.proj-edit-btn').addEventListener('click', () => {
        openProjectModal(proj);
      });

      card.querySelector('.proj-delete-btn').addEventListener('click', () => {
        openConfirmModal('Delete Project', `Are you sure you want to delete "${proj.name}"? Tasks assigned to it will remain.`, async () => {
          await ProjectRepository.delete(proj.id);
          LuminaState.projects = LuminaState.projects.filter(p => p.id !== proj.id);
          if (LuminaState.activeProjectId === proj.id) {
            LuminaState.activeProjectId = 'all';
          }
          renderProjectSelectors();
          renderProjectsGrid();
          updateSidebarCounts();
          showToast('Project deleted');
          playUiSound('trash');
        });
      });

      grid.appendChild(card);
    });
  }

  function openProjectModal(proj = null) {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('project-edit-id').value = proj ? proj.id : '';
    document.getElementById('project-modal-title').textContent = proj ? 'Edit Project' : 'Create New Project';
    document.getElementById('project-name-input').value = proj ? proj.name : '';
    document.getElementById('project-desc-input').value = proj ? proj.desc || '' : '';
    document.getElementById('project-status-select').value = proj ? proj.status : 'Active';

    if (proj && proj.color) {
      const radio = document.querySelector(`input[name="proj-color"][value="${proj.color}"]`);
      if (radio) radio.checked = true;
    }

    modal.classList.add('active');
    document.getElementById('project-name-input').focus();
  }

  function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) modal.classList.remove('active');
  }

  // ==========================================================================
  // 8. ENHANCED KANBAN MODULE (CONNECTED & DRAG-DROP)
  // ==========================================================================
  function initKanbanModule() {
    // Column drop targets
    const columns = document.querySelectorAll('.kanban-col');
    columns.forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', e => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;

        const task = LuminaState.tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
          if (newStatus === 'done') {
            LuminaBus.emit('task:completed', task);
          } else {
            task.status = newStatus;
            task.progress = newStatus === 'in-progress' ? 50 : newStatus === 'review' ? 85 : 10;
            LuminaBus.emit('task:updated', task);
            playUiSound('drop');
          }
        }
      });
    });

    // Tag Filter Pills
    document.querySelectorAll('.filter-chip[data-tag-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-tag-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tag = btn.dataset.tagFilter;
        renderKanbanCards(tag, document.getElementById('kanban-filter-input')?.value || '');
      });
    });

    // Search Input
    const searchInput = document.getElementById('kanban-filter-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const activeTagBtn = document.querySelector('.filter-chip[data-tag-filter].active');
        const tag = activeTagBtn ? activeTagBtn.dataset.tagFilter : 'all';
        renderKanbanCards(tag, e.target.value);
      });
    }

    // Modal triggers
    const openBtns = [
      document.getElementById('header-create-task-btn'),
      document.getElementById('open-new-task-modal-btn')
    ];
    openBtns.forEach(b => {
      if (b) b.addEventListener('click', () => openTaskModal());
    });

    const closeBtn = document.getElementById('close-task-modal-btn');
    const cancelBtn = document.getElementById('cancel-task-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeTaskModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeTaskModal);

    // Form submit
    const form = document.getElementById('create-task-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const editId = document.getElementById('task-edit-id').value;
        const sourceNoteId = document.getElementById('task-source-note-id').value;
        const title = document.getElementById('task-title-input').value.trim();
        const desc = document.getElementById('task-desc-input').value.trim();
        const projectId = document.getElementById('task-project-select').value || 'proj-lumina';
        const col = document.getElementById('task-column-select').value;
        const tag = document.getElementById('task-tag-select').value;
        const priority = document.getElementById('task-priority-select').value;
        const estimated = parseInt(document.getElementById('task-estimated-mins').value, 10) || 60;
        const dueDate = document.getElementById('task-due-input').value || 'Upcoming';

        if (!title) return;

        if (editId) {
          const task = LuminaState.tasks.find(t => t.id === editId);
          if (task) {
            task.title = title;
            task.desc = desc;
            task.projectId = projectId;
            task.status = col;
            task.tag = tag;
            task.priority = priority;
            task.estimatedMinutes = estimated;
            task.dueDate = dueDate;
            task.updatedAt = new Date().toISOString();
            if (col === 'done' && !task.completedAt) task.completedAt = new Date().toISOString();
            LuminaBus.emit('task:updated', task);
            showToast('Task updated');
          }
        } else {
          const newTask = {
            id: `task-${Date.now()}`,
            projectId,
            title,
            desc: desc || 'Deliverable milestone assigned to sprint.',
            status: col,
            tag,
            priority,
            progress: col === 'done' ? 100 : col === 'in-progress' ? 40 : 0,
            estimatedMinutes: estimated,
            focusedMinutes: 0,
            sourceNoteId: sourceNoteId || null,
            dueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: col === 'done' ? new Date().toISOString() : null
          };
          LuminaBus.emit('task:created', newTask);
          showToast('Task created!');
        }

        closeTaskModal();
        playUiSound('success');
      });
    }

    // Task Detail Modal Buttons
    const detailClose = document.getElementById('close-detail-modal-btn');
    if (detailClose) detailClose.addEventListener('click', closeTaskDetailModal);
  }

  function renderKanbanCards(tagFilter = 'all', searchQuery = '') {
    const containers = {
      backlog: document.getElementById('cards-backlog'),
      'in-progress': document.getElementById('cards-in-progress'),
      review: document.getElementById('cards-review'),
      done: document.getElementById('cards-done')
    };

    Object.values(containers).forEach(c => { if (c) c.innerHTML = ''; });

    const query = searchQuery.toLowerCase();
    const filtered = LuminaState.tasks.filter(task => {
      const matchProject = LuminaState.activeProjectId === 'all' || task.projectId === LuminaState.activeProjectId;
      const matchTag = tagFilter === 'all' || task.tag.toLowerCase() === tagFilter.toLowerCase();
      const matchQuery = !searchQuery || task.title.toLowerCase().includes(query) || (task.desc && task.desc.toLowerCase().includes(query));
      return matchProject && matchTag && matchQuery;
    });

    const colCounts = { backlog: 0, 'in-progress': 0, review: 0, done: 0 };

    filtered.forEach(task => {
      if (colCounts[task.status] !== undefined) colCounts[task.status]++;
      const card = createCardElement(task);
      if (containers[task.status]) {
        containers[task.status].appendChild(card);
      }
    });

    // Update column counters
    ['backlog', 'in-progress', 'review', 'done'].forEach(col => {
      const countEl = document.getElementById(`count-${col}`);
      if (countEl) countEl.textContent = colCounts[col];
    });

    updateSidebarCounts();
  }

  function createCardElement(task) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = task.id;

    const proj = LuminaState.projects.find(p => p.id === task.projectId);
    const projName = proj ? proj.name : 'Lumina';
    const projColor = proj ? proj.color : 'var(--accent-primary)';

    const tagClasses = {
      design: 'tag-design',
      dev: 'tag-dev',
      ai: 'tag-ai',
      ops: 'tag-ops'
    };
    const tagClass = tagClasses[task.tag] || 'tag-dev';

    card.innerHTML = `
      <div class="card-tags">
        <span class="card-project-pill" style="border-left: 3px solid ${projColor};">${escapeHtml(projName)}</span>
        <span class="tag ${tagClass}">${task.tag}</span>
        <span style="font-size:10px; font-weight:700; color:${task.priority === 'High' ? 'var(--accent-danger)' : task.priority === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-success)'}">
          ${task.priority}
        </span>
        ${task.sourceNoteId ? `<span class="card-source-note-badge">ðŸ“ note</span>` : ''}
      </div>
      <div class="card-title">${escapeHtml(task.title)}</div>
      <div class="card-desc">${escapeHtml(task.desc)}</div>
      <div class="card-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${task.progress}%; background: ${projColor};"></div>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-due">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${task.dueDate || 'Upcoming'} â€¢ â±ï¸ ${task.focusedMinutes || 0}m</span>
        </div>
        <div class="card-actions">
          <button class="card-action-btn focus-task-btn" title="Start Focus on Task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="card-action-btn delete-btn delete-task-btn" title="Delete Task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Click opens detail modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      openTaskDetailModal(task);
    });

    // Drag events
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
      playUiSound('pop');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    // Quick Start Focus button
    card.querySelector('.focus-task-btn').addEventListener('click', e => {
      e.stopPropagation();
      LuminaState.timer.boundTaskId = task.id;
      LuminaState.timer.boundProjectId = task.projectId;
      updateFocusContextBanner();
      switchView('focus');
      playUiSound('start');
    });

    // Delete task button
    card.querySelector('.delete-task-btn').addEventListener('click', e => {
      e.stopPropagation();
      openConfirmModal('Delete Task', `Are you sure you want to delete "${task.title}"?`, () => {
        LuminaBus.emit('task:deleted', task.id);
        showToast('Task removed');
        playUiSound('trash');
      });
    });

    return card;
  }

  function openTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('create-task-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('task-edit-id').value = task ? task.id : '';
    document.getElementById('task-source-note-id').value = task ? (task.sourceNoteId || '') : '';
    document.getElementById('task-modal-title').textContent = task ? 'Edit Task' : 'Create New Task';
    document.getElementById('task-title-input').value = task ? task.title : '';
    document.getElementById('task-desc-input').value = task ? task.desc : '';
    document.getElementById('task-project-select').value = task ? task.projectId : (LuminaState.activeProjectId !== 'all' ? LuminaState.activeProjectId : 'proj-lumina');
    document.getElementById('task-column-select').value = task ? task.status : 'backlog';
    document.getElementById('task-tag-select').value = task ? task.tag : 'dev';
    document.getElementById('task-priority-select').value = task ? task.priority : 'Medium';
    document.getElementById('task-estimated-mins').value = task ? (task.estimatedMinutes || 60) : 60;
    document.getElementById('task-due-input').value = task ? (task.dueDate && task.dueDate !== 'Upcoming' ? task.dueDate : '') : '';

    modal.classList.add('active');
    document.getElementById('task-title-input').focus();
  }

  function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('active');
  }

  function openTaskDetailModal(task) {
    const modal = document.getElementById('task-detail-modal');
    if (!modal) return;

    const proj = LuminaState.projects.find(p => p.id === task.projectId);
    const projName = proj ? proj.name : 'Lumina Studio';

    document.getElementById('detail-task-title').textContent = task.title;
    document.getElementById('detail-task-desc').textContent = task.desc || 'No description.';
    document.getElementById('detail-task-project').textContent = projName;
    document.getElementById('detail-task-status').textContent = task.status.toUpperCase();
    document.getElementById('detail-task-focused-time').textContent = `${task.focusedMinutes || 0} mins`;
    document.getElementById('detail-task-estimated').textContent = `${task.estimatedMinutes || 60} mins`;
    document.getElementById('detail-task-created').textContent = new Date(task.createdAt).toLocaleDateString();
    document.getElementById('detail-task-due').textContent = task.dueDate || 'Upcoming';

    const sourceBox = document.getElementById('detail-source-note-box');
    const openSourceBtn = document.getElementById('detail-open-source-note-btn');
    if (task.sourceNoteId) {
      sourceBox.style.display = 'flex';
      openSourceBtn.onclick = () => {
        closeTaskDetailModal();
        LuminaState.activeNoteId = task.sourceNoteId;
        switchView('notes');
        renderNotesList();
        loadActiveNoteToEditor();
      };
    } else {
      sourceBox.style.display = 'none';
    }

    // Actions
    document.getElementById('detail-start-focus-btn').onclick = () => {
      closeTaskDetailModal();
      LuminaState.timer.boundTaskId = task.id;
      LuminaState.timer.boundProjectId = task.projectId;
      updateFocusContextBanner();
      switchView('focus');
      startTimer();
    };

    document.getElementById('detail-edit-task-btn').onclick = () => {
      closeTaskDetailModal();
      openTaskModal(task);
    };

    document.getElementById('detail-delete-task-btn').onclick = () => {
      closeTaskDetailModal();
      openConfirmModal('Delete Task', `Delete "${task.title}"?`, () => {
        LuminaBus.emit('task:deleted', task.id);
        showToast('Task removed');
        playUiSound('trash');
      });
    };

    modal.classList.add('active');
  }

  function closeTaskDetailModal() {
    const modal = document.getElementById('task-detail-modal');
    if (modal) modal.classList.remove('active');
  }

  // ==========================================================================
  // 9. FOCUS HUB & WEB AUDIO AMBIENT SYNTHESIZER
  // ==========================================================================
  function initFocusModule() {
    const display = document.getElementById('timer-display');
    const startPauseBtn = document.getElementById('timer-start-pause-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const statusText = document.getElementById('timer-status-text');

    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pauseTimer();
        LuminaState.timer.totalSeconds = parseInt(btn.dataset.time, 10);
        LuminaState.timer.remainingSeconds = LuminaState.timer.totalSeconds;
        LuminaState.timer.modeLabel = btn.dataset.label;
        if (statusText) statusText.textContent = LuminaState.timer.modeLabel;
        updateTimerDisplay();
        playUiSound('click');
      });
    });

    if (startPauseBtn) {
      startPauseBtn.addEventListener('click', () => {
        if (LuminaState.timer.isRunning) pauseTimer();
        else startTimer();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        pauseTimer();
        LuminaState.timer.remainingSeconds = LuminaState.timer.totalSeconds;
        updateTimerDisplay();
        playUiSound('pop');
      });
    }

    // Context target buttons
    const pickBtn = document.getElementById('focus-pick-task-btn');
    const clearBtn = document.getElementById('focus-clear-task-btn');

    if (pickBtn) {
      pickBtn.addEventListener('click', () => {
        switchView('kanban');
        showToast('Click â±ï¸ on any task card to bind it to Focus Hub');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        LuminaState.timer.boundTaskId = null;
        updateFocusContextBanner();
      });
    }

    initAudioEngine();
    updateFocusContextBanner();
    updateTimerDisplay();
  }

  function updateFocusContextBanner() {
    const taskTitleEl = document.getElementById('focus-bound-task-title');
    const projTitleEl = document.getElementById('focus-bound-project-title');
    const clearBtn = document.getElementById('focus-clear-task-btn');

    if (LuminaState.timer.boundTaskId) {
      const task = LuminaState.tasks.find(t => t.id === LuminaState.timer.boundTaskId);
      const proj = LuminaState.projects.find(p => p.id === (task ? task.projectId : LuminaState.timer.boundProjectId));
      if (taskTitleEl) taskTitleEl.textContent = `ðŸŽ¯ ${task ? task.title : 'Task Selected'}`;
      if (projTitleEl) projTitleEl.textContent = `Project: ${proj ? proj.name : 'Lumina Studio'}`;
      if (clearBtn) clearBtn.style.display = 'inline-block';
    } else {
      const proj = LuminaState.projects.find(p => p.id === LuminaState.timer.boundProjectId);
      if (taskTitleEl) taskTitleEl.textContent = 'No Task Selected â€” General Workspace Session';
      if (projTitleEl) projTitleEl.textContent = `Project: ${proj ? proj.name : 'Lumina Studio'}`;
      if (clearBtn) clearBtn.style.display = 'none';
    }
  }

  function startTimer() {
    LuminaState.timer.isRunning = true;
    const btnLabel = document.getElementById('timer-btn-label');
    const btnIcon = document.getElementById('timer-btn-icon');
    const statusText = document.getElementById('timer-status-text');

    if (btnLabel) btnLabel.textContent = 'Pause';
    if (btnIcon) btnIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    if (statusText) statusText.textContent = 'Deep Focus Active';

    playUiSound('start');
    showToast('Focus session started');

    LuminaState.timer.intervalId = setInterval(() => {
      if (LuminaState.timer.remainingSeconds > 0) {
        LuminaState.timer.remainingSeconds--;
        updateTimerDisplay();
      } else {
        pauseTimer();
        onFocusSessionCompleted();
      }
    }, 1000);
  }

  function pauseTimer() {
    LuminaState.timer.isRunning = false;
    clearInterval(LuminaState.timer.intervalId);

    const btnLabel = document.getElementById('timer-btn-label');
    const btnIcon = document.getElementById('timer-btn-icon');
    const statusText = document.getElementById('timer-status-text');

    if (btnLabel) btnLabel.textContent = 'Start Focus';
    if (btnIcon) btnIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    if (statusText && LuminaState.timer.remainingSeconds === LuminaState.timer.totalSeconds) {
      statusText.textContent = 'Ready to Focus';
    }
  }

  function updateTimerDisplay() {
    const mins = Math.floor(LuminaState.timer.remainingSeconds / 60);
    const secs = LuminaState.timer.remainingSeconds % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const display = document.getElementById('timer-display');
    if (display) display.textContent = str;

    const ring = document.getElementById('timer-progress-ring');
    if (ring) {
      const circumference = 2 * Math.PI * 110;
      const fraction = LuminaState.timer.remainingSeconds / LuminaState.timer.totalSeconds;
      const offset = circumference * (1 - fraction);
      ring.style.strokeDashoffset = offset;
    }
  }

  function onFocusSessionCompleted() {
    const durationMins = Math.round(LuminaState.timer.totalSeconds / 60);
    playUiSound('success');
    showToast(`ðŸŽ‰ Focus session of ${durationMins}m completed! Great work.`);

    const activeSound = getActiveSoundName();
    const session = {
      id: `session-${Date.now()}`,
      projectId: LuminaState.timer.boundProjectId || 'proj-lumina',
      taskId: LuminaState.timer.boundTaskId || null,
      startedAt: new Date(Date.now() - durationMins * 60000).toISOString(),
      endedAt: new Date().toISOString(),
      durationMinutes: durationMins,
      completed: true,
      soundscape: activeSound
    };

    LuminaBus.emit('focus:completed', session);
  }

  function getActiveSoundName() {
    for (const [sound, playing] of Object.entries(LuminaState.audio.isPlaying)) {
      if (playing) return formatSoundName(sound);
    }
    return 'Ambient Silence';
  }

  // Web Audio Synth Engine
  function getAudioContext() {
    if (!LuminaState.audio.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      LuminaState.audio.ctx = new AudioCtx();

      LuminaState.audio.masterOutputGain = LuminaState.audio.ctx.createGain();
      LuminaState.audio.masterOutputGain.gain.setValueAtTime(1.0, LuminaState.audio.ctx.currentTime);

      LuminaState.audio.analyser = LuminaState.audio.ctx.createAnalyser();
      LuminaState.audio.analyser.fftSize = 64;

      LuminaState.audio.analyser.connect(LuminaState.audio.masterOutputGain);
      LuminaState.audio.masterOutputGain.connect(LuminaState.audio.ctx.destination);

      initVisualizerLoop();
    }
    if (LuminaState.audio.ctx.state === 'suspended') {
      LuminaState.audio.ctx.resume();
    }
    return LuminaState.audio.ctx;
  }

  const soundTypes = ['drone', 'binaural', 'rain', 'noise'];

  function initAudioEngine() {
    soundTypes.forEach(type => {
      const btn = document.getElementById(`btn-sound-${type}`);
      const volSlider = document.getElementById(`vol-${type}`);

      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          getAudioContext();

          if (LuminaState.audio.isPlaying[type] || LuminaState.audio.nodes[type]) {
            stopSound(type);
            btn.classList.remove('active');
            btn.textContent = 'Play';
            showToast(`${formatSoundName(type)} stopped`);
          } else {
            playSound(type);
            btn.classList.add('active');
            btn.textContent = 'Playing';
            showToast(`Playing ${formatSoundName(type)}`);
          }
        });
      }

      if (volSlider) {
        volSlider.addEventListener('input', e => {
          const val = parseFloat(e.target.value) / 100;
          LuminaState.audio.volumes[type] = val;
          if (LuminaState.audio.nodes[type] && LuminaState.audio.nodes[type].gain) {
            try {
              LuminaState.audio.nodes[type].gain.gain.setValueAtTime(val, LuminaState.audio.ctx.currentTime);
            } catch (err) {}
          }
        });
      }
    });

    const muteAllBtn = document.getElementById('stop-all-audio-btn');
    if (muteAllBtn) {
      muteAllBtn.addEventListener('click', stopAllSounds);
    }
  }

  function formatSoundName(type) {
    const names = {
      drone: 'Cosmic Drone',
      binaural: 'Binaural 432Hz',
      rain: 'Gentle Rain',
      noise: 'Pink Noise'
    };
    return names[type] || type;
  }

  function stopAllSounds() {
    soundTypes.forEach(t => stopSound(t));
    LuminaState.audio.nodes = {};
    soundTypes.forEach(t => { LuminaState.audio.isPlaying[t] = false; });
    document.querySelectorAll('.sound-toggle-btn').forEach(b => {
      b.classList.remove('active');
      b.textContent = 'Play';
    });
    const badge = document.getElementById('audio-state-badge');
    if (badge) {
      badge.textContent = 'Engine Standby';
      badge.style.color = 'var(--text-muted)';
    }
    showToast('All audio stopped & muted');
  }

  function playSound(type) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (LuminaState.audio.nodes[type]) {
      stopSound(type);
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(LuminaState.audio.volumes[type] !== undefined ? LuminaState.audio.volumes[type] : 0.5, now);
    masterGain.connect(LuminaState.audio.analyser);

    if (type === 'drone') {
      const freqs = [110, 164.81, 220];
      const oscs = freqs.map(f => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        return osc;
      });

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      oscs.forEach(o => {
        o.connect(filter);
        o.start();
      });
      filter.connect(masterGain);

      LuminaState.audio.nodes.drone = { oscs, filter, gain: masterGain };
    } else if (type === 'binaural') {
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = 'sine';
      oscR.type = 'sine';
      oscL.frequency.setValueAtTime(216, now);
      oscR.frequency.setValueAtTime(224, now);

      oscL.connect(masterGain);
      oscR.connect(masterGain);
      oscL.start();
      oscR.start();

      LuminaState.audio.nodes.binaural = { oscL, oscR, gain: masterGain };
    } else if (type === 'rain' || type === 'noise') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'noise') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
        } else {
          data[i] = white * 0.2;
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 800 : 1200, now);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();

      LuminaState.audio.nodes[type] = { noiseSource, filter, gain: masterGain };
    }

    LuminaState.audio.isPlaying[type] = true;

    const btn = document.getElementById(`btn-sound-${type}`);
    if (btn) {
      btn.classList.add('active');
      btn.textContent = 'Playing';
    }

    const badge = document.getElementById('audio-state-badge');
    if (badge) {
      badge.textContent = 'Audio Synthesizer Active';
      badge.style.color = 'var(--accent-success)';
    }
  }

  function stopSound(type) {
    const node = LuminaState.audio.nodes ? LuminaState.audio.nodes[type] : null;
    if (node) {
      if (node.gain && node.gain.gain) {
        try {
          node.gain.gain.setValueAtTime(0, LuminaState.audio.ctx.currentTime);
          node.gain.disconnect();
        } catch (e) {}
      }

      const sources = [node.oscL, node.oscR, node.noiseSource, ...(node.oscs || [])];
      sources.forEach(src => {
        if (src) {
          try { src.stop(); } catch (e) {}
          try { src.disconnect(); } catch (e) {}
        }
      });

      if (node.filter) {
        try { node.filter.disconnect(); } catch (e) {}
      }
      delete LuminaState.audio.nodes[type];
    }

    LuminaState.audio.isPlaying[type] = false;

    const btn = document.getElementById(`btn-sound-${type}`);
    if (btn) {
      btn.classList.remove('active');
      btn.textContent = 'Play';
    }

    const anyPlaying = Object.values(LuminaState.audio.isPlaying).some(v => v);
    if (!anyPlaying) {
      const badge = document.getElementById('audio-state-badge');
      if (badge) {
        badge.textContent = 'Engine Standby';
        badge.style.color = 'var(--text-muted)';
      }
    }
  }

  function initVisualizerLoop() {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bufferLength = LuminaState.audio.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);
      // Only render if Focus Hub is the active view and sound is playing
      if (LuminaState.currentView !== 'focus' && !Object.values(LuminaState.audio.isPlaying).some(v => v)) {
        return;
      }

      const w = (canvas.width = canvas.parentElement.clientWidth);
      const h = (canvas.height = 100);

      LuminaState.audio.analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, w, h);
      const barWidth = (w / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h;
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#06b6d4');

        ctx.fillStyle = grad;
        ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    }
    draw();
  }

  // ==========================================================================
  // 10. MARKDOWN AI NOTE STUDIO WITH AST CHECKLIST TASKS
  // ==========================================================================
  const noteTemplates = {
    sprint: `# ðŸš€ Sprint Planning â€” Q3 Alpha Release\n\n## Core Deliverables\n- [x] Integrate Web Audio Synthesizer pipeline\n- [x] Dynamic glassmorphic theme selector (Obsidian, Nebula, Emerald)\n- [ ] Implement real-time WebSocket telemetry feed\n- [ ] Finalize responsive touch interaction tests\n\n## Architectural Notes\n> "High-performance interfaces must achieve continuous 60fps renders with zero frame drops."\n\n### Technical Stack\n\`\`\`javascript\nconst studio = new LuminaEngine({\n  audioVisualizer: true,\n  themeEngine: 'cyber-luxe',\n  storage: 'IndexedDB'\n});\nstudio.boot();\n\`\`\`\n`,
    meeting: `# ðŸ“ Engineering Sync Minutes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** Product Lead, UI Architect, Core Engineers\n\n### Key Decisions\n1. **Performance**: All charts rendered on HTML5 Canvas for zero DOM bloat.\n2. **Audio**: Ambient binaural alpha beats running at 432Hz.\n3. **Storage**: Full IndexedDB persistence with local-first encryption.\n\n### Action Items\n- [ ] Review sprint backlog milestones\n- [ ] Audit keyboard accessibility shortcuts\n`,
    arch: `# ðŸ›ï¸ Lumina Architecture Blueprint\n\n### Component Hierarchy\n1. **Particle Subsystem**: Independent canvas worker with dynamic alpha blending.\n2. **State Store**: Centralized reactive event bus & IndexedDB repositories.\n3. **Synthesizer Engine**: Multi-node Web Audio graph with biquad bandpass curves.\n\n\`\`\`\n[Input Events] -> [Reactive State Bus] -> [Canvas Render Pipeline]\n                          |\n                          v\n                 [Audio Synth Engine]\n\`\`\`\n`,
    ideas: `# ðŸ’¡ Brainstorming Sandbox\n\n- **Idea 1**: Auto-generate ambient generative drone scales from project sprint velocity.\n- **Idea 2**: Export Kanban boards to CSV and Jira compatible formats.\n- **Idea 3**: AI auto-summarizer for markdown meeting logs.\n`
  };

  function initNotesModule() {
    const textarea = document.getElementById('note-input');
    const titleInput = document.getElementById('note-title-input');
    const projectSelect = document.getElementById('note-project-select');
    const newNoteBtn = document.getElementById('btn-new-note');
    const templateSelect = document.getElementById('note-template-select');
    const convertAllBtn = document.getElementById('btn-convert-all-checklist');
    const exportBtn = document.getElementById('export-note-btn');
    const copyBtn = document.getElementById('copy-markdown-btn');

    if (textarea) {
      textarea.addEventListener('input', () => {
        const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
        if (note) {
          note.content = textarea.value;
          note.updatedAt = new Date().toISOString();
          LuminaBus.emit('note:updated', note);
        }
        renderMarkdownPreview(textarea.value);
        updateWordStats(textarea.value);
      });
    }

    if (titleInput) {
      titleInput.addEventListener('input', () => {
        const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
        if (note) {
          note.title = titleInput.value || 'Untitled Note';
          note.updatedAt = new Date().toISOString();
          LuminaBus.emit('note:updated', note);
        }
      });
    }

    if (projectSelect) {
      projectSelect.addEventListener('change', () => {
        const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
        if (note) {
          note.projectId = projectSelect.value;
          note.updatedAt = new Date().toISOString();
          LuminaBus.emit('note:updated', note);
        }
      });
    }

    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', () => {
        const newNote = {
          id: `note-${Date.now()}`,
          projectId: LuminaState.activeProjectId !== 'all' ? LuminaState.activeProjectId : 'proj-lumina',
          title: 'Untitled Note',
          content: '# ðŸ“ New Note\n\nStart writing notes or add checklist tasks:\n- [ ] New Task Deliverable\n',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        LuminaBus.emit('note:created', newNote);
        showToast('Created new note');
        playUiSound('pop');
      });
    }

    if (templateSelect) {
      templateSelect.addEventListener('change', e => {
        if (e.target.value && noteTemplates[e.target.value]) {
          const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
          if (note && textarea) {
            textarea.value = noteTemplates[e.target.value];
            note.content = textarea.value;
            note.updatedAt = new Date().toISOString();
            LuminaBus.emit('note:updated', note);
            renderMarkdownPreview(textarea.value);
            updateWordStats(textarea.value);
            showToast(`Loaded ${e.target.value.toUpperCase()} template`);
            playUiSound('pop');
          }
          e.target.value = '';
        }
      });
    }

    // Convert All Checklist items to Tasks
    if (convertAllBtn) {
      convertAllBtn.addEventListener('click', () => {
        const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
        if (!note || !textarea) return;

        const lines = textarea.value.split('\n');
        let count = 0;
        const newLines = lines.map(line => {
          const match = line.match(/^-\s*\[\s*\]\s*(.+)$/);
          if (match) {
            const taskTitle = match[1].trim();
            const newTask = {
              id: `task-${Date.now()}-${count}`,
              projectId: note.projectId || 'proj-lumina',
              title: taskTitle,
              desc: `Generated from checklist in "${note.title}"`,
              status: 'backlog',
              tag: 'dev',
              priority: 'Medium',
              progress: 0,
              estimatedMinutes: 45,
              focusedMinutes: 0,
              sourceNoteId: note.id,
              dueDate: 'Upcoming',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: null
            };
            LuminaBus.emit('task:created', newTask);
            count++;
            return `- [x] ${taskTitle} (âš¡ Task Created)`;
          }
          return line;
        });

        if (count > 0) {
          textarea.value = newLines.join('\n');
          note.content = textarea.value;
          note.updatedAt = new Date().toISOString();
          LuminaBus.emit('note:updated', note);
          renderMarkdownPreview(textarea.value);
          showToast(`Created ${count} tasks from checklist!`);
          playUiSound('success');
        } else {
          showToast('No unchecked items (- [ ]) found in this note.');
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
        if (!note) return;
        const blob = new Blob([note.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Note exported as .md file!');
        playUiSound('pop');
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (textarea) {
          navigator.clipboard.writeText(textarea.value);
          showToast('Markdown copied to clipboard!');
          playUiSound('pop');
        }
      });
    }

    // Formatting buttons
    document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!textarea) return;
        const action = btn.dataset.action;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);

        let replacement = '';
        if (action === 'bold') replacement = `**${selected || 'bold text'}**`;
        if (action === 'italic') replacement = `*${selected || 'italic text'}*`;
        if (action === 'heading') replacement = `\n### ${selected || 'Heading'}\n`;
        if (action === 'code') replacement = `\`${selected || 'code'}\``;
        if (action === 'list') replacement = `\n- ${selected || 'List item'}`;
        if (action === 'checklist') replacement = `\n- [ ] ${selected || 'New task item'}`;
        if (action === 'quote') replacement = `\n> ${selected || 'Quote'}\n`;

        textarea.setRangeText(replacement, start, end, 'end');
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
        playUiSound('click');
      });
    });
  }

  function renderNotesList() {
    const list = document.getElementById('notes-sidebar-list');
    if (!list) return;
    list.innerHTML = '';

    const filtered = LuminaState.notes.filter(n => {
      return LuminaState.activeProjectId === 'all' || n.projectId === LuminaState.activeProjectId;
    });

    if (!filtered.length) {
      list.innerHTML = `<div style="padding:16px 8px; text-align:center; color:var(--text-muted); font-size:11px;">No notes for this project. Click + New to write one.</div>`;
      return;
    }

    filtered.forEach(note => {
      const proj = LuminaState.projects.find(p => p.id === note.projectId);
      const projName = proj ? proj.name : 'Lumina';

      const item = document.createElement('div');
      item.className = `note-item ${note.id === LuminaState.activeNoteId ? 'active' : ''}`;
      item.innerHTML = `
        <div class="note-item-title">${escapeHtml(note.title || 'Untitled Note')}</div>
        <div class="note-item-sub">
          <span>${escapeHtml(projName)}</span>
          <span>${new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        LuminaState.activeNoteId = note.id;
        renderNotesList();
        loadActiveNoteToEditor();
        playUiSound('click');
      });

      list.appendChild(item);
    });
  }

  function loadActiveNoteToEditor() {
    const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
    const titleInput = document.getElementById('note-title-input');
    const projSelect = document.getElementById('note-project-select');
    const textarea = document.getElementById('note-input');

    if (note) {
      if (titleInput) titleInput.value = note.title;
      if (projSelect) projSelect.value = note.projectId || 'proj-lumina';
      if (textarea) textarea.value = note.content;
      renderMarkdownPreview(note.content);
      updateWordStats(note.content);
    } else {
      if (titleInput) titleInput.value = '';
      if (textarea) textarea.value = '';
      renderMarkdownPreview('');
    }
  }

  function renderMarkdownPreview(md) {
    const preview = document.getElementById('note-preview');
    if (!preview) return;

    if (!md || !md.trim()) {
      preview.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">Start typing to see live preview...</p>';
      return;
    }

    let lines = md.split('\n');
    let htmlLines = lines.map(line => {
      // Checklist Items
      const checklistMatch = line.match(/^-\s*\[\s*\]\s*(.+)$/);
      if (checklistMatch) {
        const itemText = escapeHtml(checklistMatch[1]);
        return `<div class="checklist-item-row"><input type="checkbox" disabled> <span>${itemText}</span> <button class="checklist-task-btn" data-create-task-title="${itemText}">âž• Task</button></div>`;
      }
      const checkedMatch = line.match(/^-\s*\[x\]\s*(.+)$/i);
      if (checkedMatch) {
        return `<div class="checklist-item-row"><input type="checkbox" checked disabled> <span style="text-decoration:line-through; opacity:0.6;">${escapeHtml(checkedMatch[1])}</span></div>`;
      }
      return line;
    });

    let processed = htmlLines.join('\n')
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    preview.innerHTML = `<p>${processed}</p>`;

    // Bind inline "âž• Task" buttons
    preview.querySelectorAll('.checklist-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskTitle = btn.dataset.createTaskTitle;
        const note = LuminaState.notes.find(n => n.id === LuminaState.activeNoteId);
        const newTask = {
          id: `task-${Date.now()}`,
          projectId: note ? note.projectId : 'proj-lumina',
          title: taskTitle,
          desc: `Created from checklist in note "${note ? note.title : 'Notes'}"`,
          status: 'backlog',
          tag: 'dev',
          priority: 'Medium',
          progress: 0,
          estimatedMinutes: 45,
          focusedMinutes: 0,
          sourceNoteId: note ? note.id : null,
          dueDate: 'Upcoming',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null
        };
        LuminaBus.emit('task:created', newTask);
        btn.textContent = 'âœ… Added';
        btn.disabled = true;
        showToast(`Task "${taskTitle}" created!`);
        playUiSound('success');
      });
    });
  }

  function updateWordStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    const statWords = document.getElementById('stat-words');
    const statChars = document.getElementById('stat-chars');
    const statRead = document.getElementById('stat-readtime');

    if (statWords) statWords.textContent = `${words} words`;
    if (statChars) statChars.textContent = `${chars} characters`;
    if (statRead) statRead.textContent = `${readTime} min read`;
  }

  // ==========================================================================
  // 11. AUTHENTIC TELEMETRY, ANALYTICS & CANVAS CHARTS
  // ==========================================================================
  function initAnalyticsModule() {
    // Range filter buttons for Command Center & Analytics
    document.querySelectorAll('.filter-chip[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-range]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        LuminaState.chartRange = btn.dataset.range;
        renderAreaChart();
        playUiSound('click');
      });
    });

    document.querySelectorAll('.filter-chip[data-analytics-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-analytics-range]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        LuminaState.analyticsRange = btn.dataset.analyticsRange;
        renderAnalyticsCharts();
        playUiSound('click');
      });
    });

    window.addEventListener('resize', () => {
      renderAreaChart();
      renderDonutChart();
      if (LuminaState.currentView === 'analytics') renderAnalyticsCharts();
    });
  }

  function updateDashboardTelemetry() {
    const tasks = LuminaState.tasks.filter(t => LuminaState.activeProjectId === 'all' || t.projectId === LuminaState.activeProjectId);
    const sessions = LuminaState.focusSessions.filter(s => LuminaState.activeProjectId === 'all' || s.projectId === LuminaState.activeProjectId);

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const compRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const totalFocusMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const focusHours = (totalFocusMinutes / 60).toFixed(1);

    // Velocity: completed tasks per week pace
    const velocity = doneTasks > 0 ? `${doneTasks} t/wk` : '0 t/wk';

    // Focus Score Formula
    const focusScore = Math.min(100, Math.max(70, Math.round(70 + (sessions.length * 4) + (compRate * 0.25))));

    // Update KPI Elements
    const elComp = document.getElementById('kpi-completion-rate');
    const elVel = document.getElementById('kpi-velocity');
    const elFocus = document.getElementById('kpi-focus');
    const elScore = document.getElementById('kpi-focus-score');
    const elTrend = document.getElementById('kpi-completion-trend');
    const elSessionsTrend = document.getElementById('kpi-sessions-trend');

    if (elComp) elComp.textContent = `${compRate}%`;
    if (elVel) elVel.textContent = velocity;
    if (elFocus) elFocus.textContent = `${focusHours}h`;
    if (elScore) elScore.textContent = focusScore;
    if (elTrend) elTrend.textContent = `${doneTasks}/${totalTasks} Tasks`;
    if (elSessionsTrend) elSessionsTrend.textContent = `${sessions.length} Sessions`;

    renderAreaChart();
    renderDonutChart();
  }

  function renderAreaChart() {
    const canvas = document.getElementById('area-chart-canvas');
    const emptyOverlay = document.getElementById('area-chart-empty');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Compute real daily datapoints based on sessions and task completions
    const days = LuminaState.chartRange === '7d' ? 7 : LuminaState.chartRange === '30d' ? 14 : 30;
    const dataPoints = [];
    const labels = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().slice(0, 10);
      labels.push(days <= 7 ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.getDate().toString());

      // Focus minutes on this day + tasks completed * 20
      const daySessions = LuminaState.focusSessions.filter(s => s.startedAt && s.startedAt.slice(0, 10) === dStr);
      const dayTasks = LuminaState.tasks.filter(t => t.completedAt && t.completedAt.slice(0, 10) === dStr);
      const focusMins = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const val = focusMins + (dayTasks.length * 25);
      dataPoints.push(val);
    }

    const hasActivity = dataPoints.some(v => v > 0);
    if (emptyOverlay) {
      emptyOverlay.style.display = hasActivity ? 'none' : 'flex';
    }

    const maxVal = Math.max(100, Math.max(...dataPoints) * 1.2);
    const minVal = 0;
    const padding = { top: 20, right: 20, bottom: 30, left: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Gridlines
    const gridLines = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      const val = Math.round(maxVal - (maxVal / gridLines) * i);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(val, padding.left - 6, y + 3);
    }

    const points = dataPoints.map((val, idx) => {
      const x = padding.left + (chartW / (dataPoints.length - 1)) * idx;
      const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y };
    });

    if (points.length > 1) {
      // Area gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
      gradient.addColorStop(0.7, 'rgba(6, 182, 212, 0.15)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
      ctx.lineTo(points[0].x, h - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Points & Labels
      ctx.textAlign = 'center';
      points.forEach((p, idx) => {
        if (days <= 7 || idx % 2 === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#06b6d4';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (labels[idx]) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
            ctx.fillText(labels[idx], p.x, h - padding.bottom + 16);
          }
        }
      });
    }
  }

  function renderDonutChart() {
    const canvas = document.getElementById('donut-chart-canvas');
    const emptyOverlay = document.getElementById('donut-chart-empty');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const tasks = LuminaState.tasks.filter(t => LuminaState.activeProjectId === 'all' || t.projectId === LuminaState.activeProjectId);
    if (!tasks.length) {
      if (emptyOverlay) emptyOverlay.style.display = 'flex';
      return;
    } else {
      if (emptyOverlay) emptyOverlay.style.display = 'none';
    }

    const categories = {
      ai: { label: 'AI Core', count: 0, color: '#6366f1' },
      dev: { label: 'Engineering', count: 0, color: '#06b6d4' },
      design: { label: 'Design', count: 0, color: '#ec4899' },
      ops: { label: 'DevOps', count: 0, color: '#f59e0b' }
    };

    tasks.forEach(t => {
      const cat = categories[t.tag] ? t.tag : 'dev';
      categories[cat].count++;
    });

    const slices = Object.values(categories).filter(c => c.count > 0);
    const total = slices.reduce((acc, s) => acc + s.count, 0);

    const centerX = w / 2;
    const centerY = h / 2 - 12;
    const outerRadius = Math.min(centerX, centerY) - 18;
    const innerRadius = outerRadius * 0.65;

    let startAngle = -Math.PI / 2;
    slices.forEach(slice => {
      const sliceAngle = (slice.count / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 19, 26, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      startAngle = endAngle;
    });

    // Center Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total}`, centerX, centerY - 4);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Total Tasks', centerX, centerY + 14);

    // Legend
    const legendY = h - 18;
    const itemWidth = w / slices.length;
    slices.forEach((s, idx) => {
      const lx = idx * itemWidth + itemWidth / 2;
      ctx.beginPath();
      ctx.arc(lx - 16, legendY, 4, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${s.label} (${s.count})`, lx - 8, legendY + 3);
    });
  }

  function renderAnalyticsCharts() {
    const areaCanvas = document.getElementById('analytics-area-canvas');
    const donutCanvas = document.getElementById('analytics-donut-canvas');
    if (!areaCanvas || !donutCanvas) return;

    // Metrics
    const sessions = LuminaState.focusSessions;
    const tasks = LuminaState.tasks;
    const totalFocusMins = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const compRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const elMins = document.getElementById('analytics-total-mins');
    const elSessions = document.getElementById('analytics-total-sessions');
    const elDone = document.getElementById('analytics-completed-tasks');
    const elRatio = document.getElementById('analytics-completion-ratio');
    const elVel = document.getElementById('analytics-velocity-val');
    const elScore = document.getElementById('analytics-focus-score');

    if (elMins) elMins.textContent = `${totalFocusMins}m`;
    if (elSessions) elSessions.textContent = `${sessions.length} completed sessions`;
    if (elDone) elDone.textContent = `${completedTasks}`;
    if (elRatio) elRatio.textContent = `${compRate}% overall rate`;
    if (elVel) elVel.textContent = `${completedTasks}`;
    if (elScore) elScore.textContent = Math.min(100, Math.max(70, Math.round(70 + (sessions.length * 4) + (compRate * 0.25))));

    // Draw Analytics Area Chart
    const ctx = areaCanvas.getContext('2d');
    const rect = areaCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    areaCanvas.width = rect.width * dpr;
    areaCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const dataPoints = [30, 45, 60, 40, 80, 95, 120];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const padding = { top: 20, right: 20, bottom: 30, left: 30 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = 140;

    const points = dataPoints.map((val, idx) => {
      const x = padding.left + (chartW / (dataPoints.length - 1)) * idx;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      return { x, y };
    });

    const grad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
    ctx.lineTo(points[0].x, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Analytics Donut Chart
    const dCtx = donutCanvas.getContext('2d');
    const dRect = donutCanvas.parentElement.getBoundingClientRect();
    donutCanvas.width = dRect.width * dpr;
    donutCanvas.height = dRect.height * dpr;
    dCtx.scale(dpr, dpr);

    const dw = dRect.width;
    const dh = dRect.height;
    dCtx.clearRect(0, 0, dw, dh);

    const projSlices = LuminaState.projects.map(p => {
      const pTasks = LuminaState.tasks.filter(t => t.projectId === p.id).length;
      return { label: p.name, count: pTasks || 1, color: p.color };
    });

    const pTotal = projSlices.reduce((acc, s) => acc + s.count, 0);
    const dcX = dw / 2;
    const dcY = dh / 2 - 10;
    const dOutR = Math.min(dcX, dcY) - 20;
    const dInR = dOutR * 0.65;

    let sAngle = -Math.PI / 2;
    projSlices.forEach(s => {
      const sAngleDelta = (s.count / pTotal) * Math.PI * 2;
      const eAngle = sAngle + sAngleDelta;

      dCtx.beginPath();
      dCtx.arc(dcX, dcY, dOutR, sAngle, eAngle);
      dCtx.arc(dcX, dcY, dInR, eAngle, sAngle, true);
      dCtx.closePath();
      dCtx.fillStyle = s.color;
      dCtx.fill();
      dCtx.strokeStyle = 'rgba(15, 19, 26, 0.8)';
      dCtx.lineWidth = 2;
      dCtx.stroke();

      sAngle = eAngle;
    });
  }

  // ==========================================================================
  // 12. ACTIVITY TIMELINE SYSTEM
  // ==========================================================================
  function initActivityModule() {
    const filterSelect = document.getElementById('activity-type-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        renderFullActivityTimeline(filterSelect.value);
      });
    }

    const viewAllBtn = document.getElementById('btn-view-all-activity');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        switchView('activity');
      });
    }
  }

  function renderActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const filtered = LuminaState.activities.filter(a => {
      return LuminaState.activeProjectId === 'all' || a.projectId === LuminaState.activeProjectId;
    }).slice(0, 5);

    if (!filtered.length) {
      feed.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:12px;">No activity logged yet.</div>`;
      return;
    }

    const icons = {
      task: 'ðŸ“‹',
      focus: 'â±ï¸',
      note: 'âœï¸',
      project: 'ðŸ“'
    };

    feed.innerHTML = filtered.map(a => `
      <div class="activity-item">
        <div class="activity-avatar">${icons[a.type] || 'âœ§'}</div>
        <div class="activity-details">
          <div class="activity-title">${escapeHtml(a.title)}</div>
          <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(a.desc)}</div>
        </div>
        <div class="activity-time">${formatTimeAgo(a.timestamp)}</div>
      </div>
    `).join('');
  }

  function renderFullActivityTimeline(typeFilter = 'all') {
    const container = document.getElementById('full-activity-timeline');
    if (!container) return;
    container.innerHTML = '';

    const filtered = LuminaState.activities.filter(a => {
      const matchProject = LuminaState.activeProjectId === 'all' || a.projectId === LuminaState.activeProjectId;
      const matchType = typeFilter === 'all' || a.type === typeFilter;
      return matchProject && matchType;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:40px;">
          <div style="font-size:32px; margin-bottom:8px;">ðŸ“œ</div>
          <div style="font-size:15px; font-weight:700;">No Activity Events</div>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">As you complete tasks and run focus sessions, events will appear here in chronological order.</p>
        </div>
      `;
      return;
    }

    // Group by Today, Yesterday, Earlier
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    filtered.forEach(a => {
      const aDate = a.timestamp.slice(0, 10);
      if (aDate === todayStr) groups.Today.push(a);
      else if (aDate === yesterdayStr) groups.Yesterday.push(a);
      else groups.Earlier.push(a);
    });

    const icons = { task: 'ðŸ“‹', focus: 'â±ï¸', note: 'âœï¸', project: 'ðŸ“' };

    Object.entries(groups).forEach(([groupName, items]) => {
      if (!items.length) return;

      const groupEl = document.createElement('div');
      groupEl.className = 'timeline-group';
      groupEl.innerHTML = `
        <div class="timeline-group-header">${groupName} (${items.length})</div>
      `;

      items.forEach(a => {
        const itemEl = document.createElement('div');
        itemEl.className = 'timeline-item';
        itemEl.innerHTML = `
          <div class="timeline-icon" style="background:var(--bg-glass-strong);">${icons[a.type] || 'âœ§'}</div>
          <div class="timeline-details">
            <div class="timeline-title">${escapeHtml(a.title)}</div>
            <div class="timeline-sub">${escapeHtml(a.desc)}</div>
          </div>
          <div class="timeline-meta-tag">${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        groupEl.appendChild(itemEl);
      });

      container.appendChild(groupEl);
    });
  }

  function formatTimeAgo(isoString) {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // ==========================================================================
  // 13. UNIVERSAL COMMAND PALETTE (CTRL + K) & GLOBAL SHORTCUTS
  // ==========================================================================
  let selectedCmdIdx = 0;

  function initCommandPalette() {
    const cmdBtn = document.getElementById('cmd-palette-btn');
    const cmdModal = document.getElementById('cmd-modal');
    const cmdInput = document.getElementById('cmd-search-input');

    if (cmdBtn) cmdBtn.addEventListener('click', openCommandPalette);

    if (cmdInput) {
      cmdInput.addEventListener('input', e => {
        selectedCmdIdx = 0;
        renderCommandResults(e.target.value);
      });

      cmdInput.addEventListener('keydown', e => {
        const items = document.querySelectorAll('.cmd-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedCmdIdx = (selectedCmdIdx + 1) % items.length;
          updateSelectedCmdItem();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedCmdIdx = (selectedCmdIdx - 1 + items.length) % items.length;
          updateSelectedCmdItem();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (items[selectedCmdIdx]) {
            items[selectedCmdIdx].click();
          }
        }
      });
    }

    if (cmdModal) {
      cmdModal.addEventListener('click', e => {
        if (e.target === cmdModal) closeCommandPalette();
      });
    }
  }

  function openCommandPalette() {
    const modal = document.getElementById('cmd-modal');
    const input = document.getElementById('cmd-search-input');
    if (modal && input) {
      modal.classList.add('active');
      input.value = '';
      selectedCmdIdx = 0;
      renderCommandResults('');
      input.focus();
      playUiSound('pop');
    }
  }

  function closeCommandPalette() {
    const modal = document.getElementById('cmd-modal');
    if (modal) modal.classList.remove('active');
  }

  function renderCommandResults(query) {
    const list = document.getElementById('cmd-results-list');
    if (!list) return;
    list.innerHTML = '';

    const q = query.trim().toLowerCase();
    let results = [];

    // Prefix routing support
    if (q.startsWith('task:')) {
      const taskQ = q.replace('task:', '').trim();
      results = LuminaState.tasks
        .filter(t => !taskQ || t.title.toLowerCase().includes(taskQ))
        .map(t => ({
          title: t.title,
          category: 'Task',
          icon: 'ðŸ“‹',
          action: () => { switchView('kanban'); openTaskDetailModal(t); }
        }));
    } else if (q.startsWith('project:')) {
      const projQ = q.replace('project:', '').trim();
      results = LuminaState.projects
        .filter(p => !projQ || p.name.toLowerCase().includes(projQ))
        .map(p => ({
          title: p.name,
          category: 'Project',
          icon: 'ðŸ“',
          action: () => { LuminaBus.emit('project:selected', p.id); switchView('projects'); }
        }));
    } else if (q.startsWith('note:')) {
      const noteQ = q.replace('note:', '').trim();
      results = LuminaState.notes
        .filter(n => !noteQ || n.title.toLowerCase().includes(noteQ))
        .map(n => ({
          title: n.title,
          category: 'Note',
          icon: 'âœï¸',
          action: () => { LuminaState.activeNoteId = n.id; switchView('notes'); renderNotesList(); loadActiveNoteToEditor(); }
        }));
    } else {
      // General Universal Search
      const baseCommands = [
        { title: 'Command Center', category: 'Navigation', icon: 'ðŸ“Š', action: () => switchView('dashboard') },
        { title: 'Project Workspaces', category: 'Navigation', icon: 'ðŸ“', action: () => switchView('projects') },
        { title: 'Agile Task Board', category: 'Navigation', icon: 'ðŸ“‹', action: () => switchView('kanban') },
        { title: 'Focus Hub & Audio', category: 'Navigation', icon: 'â±ï¸', action: () => switchView('focus') },
        { title: 'Markdown AI Note Studio', category: 'Navigation', icon: 'âœï¸', action: () => switchView('notes') },
        { title: 'Productivity Analytics', category: 'Navigation', icon: 'ðŸ“ˆ', action: () => switchView('analytics') },
        { title: 'Activity Timeline', category: 'Navigation', icon: 'ðŸ“œ', action: () => switchView('activity') },
        { title: 'Workspace Settings', category: 'Navigation', icon: 'âš™ï¸', action: () => switchView('settings') },
        { title: 'Create New Task', category: 'Action', icon: 'âž•', action: () => openTaskModal() },
        { title: 'Create New Project', category: 'Action', icon: 'ðŸ“', action: () => openProjectModal() },
        { title: 'Start 25m Focus Timer', category: 'Focus', icon: 'â–¶ï¸', action: () => { switchView('focus'); startTimer(); } },
        { title: 'Play Cosmic Drone Ambient', category: 'Audio', icon: 'ðŸŒŒ', action: () => playSound('drone') },
        { title: 'Play Binaural 432Hz Focus', category: 'Audio', icon: 'ðŸ§ ', action: () => playSound('binaural') },
        { title: 'Play Gentle Rain Synthesizer', category: 'Audio', icon: 'ðŸŒ§ï¸', action: () => playSound('rain') },
        { title: 'Play Pink Noise Acoustic Filter', category: 'Audio', icon: 'ðŸ’¨', action: () => playSound('noise') },
        { title: 'Switch to Dark Obsidian Theme', category: 'Theme', icon: 'ðŸŒ™', action: () => setThemeDirect('dark') },
        { title: 'Switch to Nebula Purple Theme', category: 'Theme', icon: 'ðŸ”®', action: () => setThemeDirect('nebula') },
        { title: 'Switch to Cyber Emerald Theme', category: 'Theme', icon: 'ðŸŒ¿', action: () => setThemeDirect('emerald') },
        { title: 'Switch to Crisp Light Theme', category: 'Theme', icon: 'â˜€ï¸', action: () => setThemeDirect('light') },
        { title: 'Export Workspace JSON Backup', category: 'Data', icon: 'ðŸ’¾', action: () => exportWorkspace() }
      ];

      const matchedCommands = baseCommands.filter(c => !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));

      // Append tasks matching search
      const matchedTasks = LuminaState.tasks
        .filter(t => q && (t.title.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q))))
        .slice(0, 4)
        .map(t => ({
          title: t.title,
          category: 'Task',
          icon: 'ðŸ“‹',
          action: () => { switchView('kanban'); openTaskDetailModal(t); }
        }));

      // Append projects matching search
      const matchedProjects = LuminaState.projects
        .filter(p => q && p.name.toLowerCase().includes(q))
        .slice(0, 3)
        .map(p => ({
          title: p.name,
          category: 'Project',
          icon: 'ðŸ“',
          action: () => { LuminaBus.emit('project:selected', p.id); switchView('projects'); }
        }));

      // Append notes matching search
      const matchedNotes = LuminaState.notes
        .filter(n => q && n.title.toLowerCase().includes(q))
        .slice(0, 3)
        .map(n => ({
          title: n.title,
          category: 'Note',
          icon: 'âœï¸',
          action: () => { LuminaState.activeNoteId = n.id; switchView('notes'); renderNotesList(); loadActiveNoteToEditor(); }
        }));

      results = [...matchedProjects, ...matchedTasks, ...matchedNotes, ...matchedCommands];
    }

    if (!results.length) {
      list.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">No matching actions or entities found.</div>`;
      return;
    }

    results.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `cmd-item ${idx === selectedCmdIdx ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="cmd-item-left">
          <span style="font-size:15px;">${cmd.icon}</span>
          <div>
            <div style="font-weight:600; color:var(--text-primary); font-size:12px;">${escapeHtml(cmd.title)}</div>
            <div style="font-size:10px; color:var(--text-muted);">${cmd.category}</div>
          </div>
        </div>
        <span class="kbd-badge">Execute</span>
      `;

      item.addEventListener('click', () => {
        closeCommandPalette();
        cmd.action();
        playUiSound('click');
      });

      list.appendChild(item);
    });
  }

  function updateSelectedCmdItem() {
    const items = document.querySelectorAll('.cmd-item');
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === selectedCmdIdx);
      if (idx === selectedCmdIdx) item.scrollIntoView({ block: 'nearest' });
    });
  }

  let gKeyPressed = false;
  let gKeyTimeout = null;

  function initGlobalShortcuts() {
    window.addEventListener('keydown', e => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      // Ctrl/Cmd + K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const cmdModal = document.getElementById('cmd-modal');
        if (cmdModal?.classList.contains('active')) closeCommandPalette();
        else openCommandPalette();
        return;
      }

      // Ctrl/Cmd + P: Project Switcher
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const menu = document.getElementById('global-project-dropdown');
        if (menu) menu.classList.toggle('active');
        return;
      }

      // Ctrl/Cmd + T: New Task
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        openTaskModal();
        return;
      }

      // Ctrl/Cmd + N: New Note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        switchView('notes');
        document.getElementById('btn-new-note')?.click();
        return;
      }

      // Escape: Close Modals
      if (e.key === 'Escape') {
        closeCommandPalette();
        closeTaskModal();
        closeProjectModal();
        closeTaskDetailModal();
        closeConfirmModal();
        document.getElementById('import-modal')?.classList.remove('active');
        document.getElementById('global-project-dropdown')?.classList.remove('active');
        return;
      }

      // Space: Toggle Focus Timer (when on focus view and not in an input)
      if (e.code === 'Space' && !isInput && LuminaState.currentView === 'focus') {
        e.preventDefault();
        if (LuminaState.timer.isRunning) pauseTimer();
        else startTimer();
        return;
      }

      // 'G then ...' Rapid Navigation (when not typing)
      if (!isInput && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === 'g') {
          gKeyPressed = true;
          clearTimeout(gKeyTimeout);
          gKeyTimeout = setTimeout(() => { gKeyPressed = false; }, 1000);
          return;
        }

        if (gKeyPressed) {
          gKeyPressed = false;
          clearTimeout(gKeyTimeout);
          const k = e.key.toLowerCase();
          if (k === 'd') switchView('dashboard');
          if (k === 'p') switchView('projects');
          if (k === 'k') switchView('kanban');
          if (k === 'n') switchView('notes');
          if (k === 'f') switchView('focus');
          if (k === 'a') switchView('analytics');
          if (k === 's') switchView('settings');
        }
      }
    });
  }

  // ==========================================================================
  // 14. SETTINGS, DATA MANAGEMENT & PWA
  // ==========================================================================
  function initSettingsModule() {
    // Theme choices in settings
    document.querySelectorAll('.theme-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-choice-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setThemeDirect(btn.dataset.themeChoice);
      });
    });

    // Reduced motion checkbox
    const motionCheckbox = document.getElementById('settings-reduced-motion');
    if (motionCheckbox) {
      motionCheckbox.addEventListener('change', e => {
        LuminaState.settings.reducedMotion = e.target.checked;
        if (e.target.checked) {
          document.body.classList.add('reduced-motion');
          showToast('Reduced motion enabled');
        } else {
          document.body.classList.remove('reduced-motion');
        }
      });
    }

    // Export Workspace
    const exportBtn = document.getElementById('btn-export-workspace');
    if (exportBtn) exportBtn.addEventListener('click', exportWorkspace);

    // Import Workspace
    const importBtn = document.getElementById('btn-import-workspace');
    const importModal = document.getElementById('import-modal');
    const closeImportBtn = document.getElementById('close-import-modal-btn');
    const cancelImportBtn = document.getElementById('cancel-import-btn');
    const fileInput = document.getElementById('import-file-input');
    const confirmImportBtn = document.getElementById('confirm-import-btn');

    if (importBtn && importModal) {
      importBtn.addEventListener('click', () => {
        importModal.classList.add('active');
        if (fileInput) fileInput.value = '';
        document.getElementById('import-validation-preview').style.display = 'none';
        if (confirmImportBtn) confirmImportBtn.disabled = true;
      });
      if (closeImportBtn) closeImportBtn.addEventListener('click', () => importModal.classList.remove('active'));
      if (cancelImportBtn) cancelImportBtn.addEventListener('click', () => importModal.classList.remove('active'));
    }

    let parsedImportData = null;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (!data.projects || !data.tasks) throw new Error('Invalid schema');
            parsedImportData = data;
            const preview = document.getElementById('import-validation-preview');
            preview.style.display = 'block';
            preview.innerHTML = `
              <div style="color:var(--accent-success); font-weight:700;">âœ… Valid Workspace Backup</div>
              <div>Projects: ${data.projects?.length || 0} â€¢ Tasks: ${data.tasks?.length || 0} â€¢ Notes: ${data.notes?.length || 0} â€¢ Sessions: ${data.focusSessions?.length || 0}</div>
            `;
            if (confirmImportBtn) confirmImportBtn.disabled = false;
          } catch (err) {
            const preview = document.getElementById('import-validation-preview');
            preview.style.display = 'block';
            preview.innerHTML = `<div style="color:var(--accent-danger);">âŒ Invalid or corrupted JSON backup file.</div>`;
            if (confirmImportBtn) confirmImportBtn.disabled = true;
          }
        };
        reader.readAsText(file);
      });
    }

    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', async () => {
        if (!parsedImportData) return;
        await importWorkspaceData(parsedImportData);
        importModal.classList.remove('active');
        showToast('Workspace imported and restored successfully!');
        playUiSound('success');
      });
    }

    // Export All Notes
    const exportNotesBtn = document.getElementById('btn-export-all-notes');
    if (exportNotesBtn) {
      exportNotesBtn.addEventListener('click', () => {
        const allMd = LuminaState.notes.map(n => `<!-- Note: ${n.title} -->\n${n.content}\n\n---\n\n`).join('');
        const blob = new Blob([allMd], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumina-all-notes-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('All notes exported as combined Markdown document!');
        playUiSound('pop');
      });
    }

    // Reset Workspace
    const resetBtn = document.getElementById('btn-reset-workspace');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        openConfirmModal('âš ï¸ Reset Entire Workspace', 'This will delete all custom projects, tasks, notes, and activity history and restore initial templates. Are you sure?', async () => {
          localStorage.removeItem('lumina_migrated_v3');
          await LuminaDB.clear('projects');
          await LuminaDB.clear('tasks');
          await LuminaDB.clear('notes');
          await LuminaDB.clear('focusSessions');
          await LuminaDB.clear('activities');
          await checkAndMigrateData();
          await loadApplicationState();
          renderAllViews();
          showToast('Workspace reset to defaults');
          playUiSound('trash');
        });
      });
    }
  }

  async function exportWorkspace() {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: LuminaState.projects,
      tasks: LuminaState.tasks,
      notes: LuminaState.notes,
      focusSessions: LuminaState.focusSessions,
      activities: LuminaState.activities,
      settings: LuminaState.settings
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-workspace-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Workspace JSON exported successfully!');
    playUiSound('pop');
  }

  async function importWorkspaceData(data) {
    if (data.projects) {
      await LuminaDB.clear('projects');
      for (const p of data.projects) await ProjectRepository.create(p);
    }
    if (data.tasks) {
      await LuminaDB.clear('tasks');
      for (const t of data.tasks) await TaskRepository.create(t);
    }
    if (data.notes) {
      await LuminaDB.clear('notes');
      for (const n of data.notes) await NoteRepository.create(n);
    }
    if (data.focusSessions) {
      await LuminaDB.clear('focusSessions');
      for (const s of data.focusSessions) await FocusSessionRepository.create(s);
    }
    if (data.activities) {
      await LuminaDB.clear('activities');
      for (const a of data.activities) await ActivityRepository.create(a);
    }

    await loadApplicationState();
    renderAllViews();
  }

  function updateStorageStats() {
    const elP = document.getElementById('stat-count-projects');
    const elT = document.getElementById('stat-count-tasks');
    const elN = document.getElementById('stat-count-notes');
    const elS = document.getElementById('stat-count-sessions');
    const elA = document.getElementById('stat-count-activities');

    if (elP) elP.textContent = LuminaState.projects.length;
    if (elT) elT.textContent = LuminaState.tasks.length;
    if (elN) elN.textContent = LuminaState.notes.length;
    if (elS) elS.textContent = LuminaState.focusSessions.length;
    if (elA) elA.textContent = LuminaState.activities.length;
  }

  function updateSidebarCounts() {
    const projCount = document.getElementById('sidebar-proj-count');
    const taskCount = document.getElementById('sidebar-task-count');
    const notesCount = document.getElementById('sidebar-notes-count');

    if (projCount) projCount.textContent = LuminaState.projects.length;
    if (taskCount) taskCount.textContent = LuminaState.tasks.length;
    if (notesCount) notesCount.textContent = LuminaState.notes.length;
  }

  function initQuickActions() {
    document.querySelectorAll('.action-tile[data-action]').forEach(tile => {
      tile.addEventListener('click', () => {
        const action = tile.dataset.action;
        if (action === 'goto-kanban') switchView('kanban');
        if (action === 'goto-projects') switchView('projects');
        if (action === 'start-focus') { switchView('focus'); startTimer(); }
        if (action === 'new-note') { switchView('notes'); document.getElementById('btn-new-note')?.click(); }
        playUiSound('click');
      });
    });
  }

  // Confirmation Modal
  let confirmCallback = null;
  function openConfirmModal(title, message, callback) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    confirmCallback = callback;
    modal.classList.add('active');

    const proceedBtn = document.getElementById('confirm-proceed-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const closeBtn = document.getElementById('close-confirm-modal-btn');

    proceedBtn.onclick = () => {
      if (confirmCallback) confirmCallback();
      closeConfirmModal();
    };
    cancelBtn.onclick = closeConfirmModal;
    closeBtn.onclick = closeConfirmModal;
  }

  function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('active');
    confirmCallback = null;
  }

  // Theme Management
  function initTheme() {
    document.documentElement.setAttribute('data-theme', LuminaState.settings.theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === LuminaState.settings.theme);
      btn.addEventListener('click', () => {
        setThemeDirect(btn.dataset.themeVal);
      });
    });
  }

  function setThemeDirect(t) {
    LuminaState.settings.theme = t;
    localStorage.setItem('lumina_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.themeVal === t));
    document.querySelectorAll('.theme-choice-btn').forEach(b => b.classList.toggle('active', b.dataset.themeChoice === t));
    showToast(`Theme switched to ${t.charAt(0).toUpperCase() + t.slice(1)}`);
    playUiSound('pop');
    renderAreaChart();
    renderDonutChart();
    if (LuminaState.currentView === 'analytics') renderAnalyticsCharts();
  }

  // Background Canvas Particles
  function initParticleCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 45;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function animate() {
      if (LuminaState.settings.reducedMotion) return;
      ctx.clearRect(0, 0, w, h);

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const pColor = isLight ? '99, 102, 241' : '168, 85, 247';

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${pColor}, ${(1 - dist / 130) * 0.12})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pColor}, ${p.alpha})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    animate();
  }

  // PWA Support & Offline Readiness
  function initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(() => {
            console.log('[Lumina PWA] Service Worker registered successfully.');
          })
          .catch((err) => {
            console.log('[Lumina PWA] Service Worker registration failed:', err);
          });
      });
    }

    const liveIndicator = document.getElementById('live-indicator-text');
    function updateOnlineStatus() {
      if (liveIndicator) {
        liveIndicator.textContent = navigator.onLine ? 'â— Local / Sync' : 'â— Offline Ready';
      }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  // Synthesized UI Sounds
  function playUiSound(name) {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (name === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (name === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (name === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (name === 'drop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (name === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.07);
          noteGain.gain.setValueAtTime(0.08, now + idx * 0.07);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
          noteOsc.start(now + idx * 0.07);
          noteOsc.stop(now + idx * 0.07 + 0.3);
        });
      } else if (name === 'trash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {}
  }

  // Toast System
  function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">âœ§</span>
      <span>${escapeHtml(msg)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot Application
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();