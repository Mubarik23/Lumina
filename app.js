/* ==========================================================================
   LUMINA STUDIO - Core Application Logic
   Dynamic Canvas Particles, Custom Charts, Web Audio Synth, Kanban & Notes
   ========================================================================== */

(function () {
  'use strict';

  // State Management
  const state = {
    currentView: 'dashboard',
    theme: localStorage.getItem('lumina_theme') || 'dark',
    tasks: [],
    timer: {
      totalSeconds: 1500,
      remainingSeconds: 1500,
      intervalId: null,
      isRunning: false,
      modeLabel: 'Focus Time'
    },
    audio: {
      ctx: null,
      analyser: null,
      isPlaying: {
        drone: false,
        binaural: false,
        rain: false,
        noise: false,
        balochi: false
      },
      nodes: {},
      volumes: {
        drone: 0.4,
        binaural: 0.35,
        rain: 0.5,
        noise: 0.3,
        balochi: 0.55
      }
    },
    liveSimulation: false,
    simInterval: null,
    chartRange: '7d'
  };

  // Pre-populated Default Tasks
  const defaultTasks = [
    {
      id: 'task-1',
      title: 'Architect Web Audio Synthesizer Node Pipeline',
      desc: 'Build modular oscillators, biquad filter sweeps, and buffer generators for real-time soundscapes.',
      status: 'done',
      tag: 'ai',
      priority: 'High',
      progress: 100,
      dueDate: 'Today'
    },
    {
      id: 'task-2',
      title: 'Design Glassmorphism Cyber-Luxe Tokens',
      desc: 'Craft dynamic CSS custom properties, backdrop blur layers, and responsive breakpoint layouts.',
      status: 'done',
      tag: 'design',
      priority: 'High',
      progress: 100,
      dueDate: 'Today'
    },
    {
      id: 'task-3',
      title: 'Implement Interactive Canvas Charts Engine',
      desc: 'Render smooth cubic bezier area paths with glowing gradient fills and dynamic tooltip math.',
      status: 'in-progress',
      tag: 'dev',
      priority: 'High',
      progress: 75,
      dueDate: 'Tomorrow'
    },
    {
      id: 'task-4',
      title: 'Deploy Pomodoro Focus Engine with Audio Chimes',
      desc: 'Sync SVG radial dashoffset countdowns with Web Audio alert frequencies.',
      status: 'in-progress',
      tag: 'dev',
      priority: 'Medium',
      progress: 60,
      dueDate: 'Sep 03'
    },
    {
      id: 'task-5',
      title: 'Build Markdown Studio with Live AST Parser',
      desc: 'Instant regex-based markdown compiler supporting tables, code fences, and export.',
      status: 'review',
      tag: 'ai',
      priority: 'Medium',
      progress: 90,
      dueDate: 'Sep 04'
    },
    {
      id: 'task-6',
      title: 'Kubernetes Cluster Edge Optimization',
      desc: 'Configure ingress traffic routing and autoscaling telemetry thresholds.',
      status: 'backlog',
      tag: 'ops',
      priority: 'Low',
      progress: 20,
      dueDate: 'Sep 08'
    }
  ];

  // ==========================================================================
  // 1. INITIALIZATION & ROUTING
  // ==========================================================================

  function init() {
    loadTheme();
    loadTasks();
    initParticleCanvas();
    initNavigation();
    initCharts();
    initKanban();
    initTimer();
    initAudioEngine();
    initMarkdownStudio();
    initCommandPalette();
    initQuickActions();
    populateActivityFeed();
    startLiveTicker();

    // Set default sample markdown note
    const noteInput = document.getElementById('note-input');
    if (noteInput && !noteInput.value) {
      loadTemplate('sprint');
    }
  }

  // View Navigation
  function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
        playUiSound('click');
      });
    });
  }

  function switchView(viewName) {
    state.currentView = viewName;

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
      kanban: { title: 'Task & Project Board', sub: 'Drag and drop agile cards across progression columns' },
      focus: { title: 'Focus Hub & Audio Lab', sub: 'Binaural beats, ambient sound generator & pomodoro timer' },
      notes: { title: 'Markdown AI Studio', sub: 'Distraction-free rich note editor with live rendering' }
    };

    if (headers[viewName]) {
      titleEl.textContent = headers[viewName].title;
      subTitleEl.textContent = headers[viewName].sub;
    }

    // Re-render charts if entering dashboard
    if (viewName === 'dashboard') {
      setTimeout(renderAreaChart, 50);
      setTimeout(renderDonutChart, 50);
    }
  }

  // Theme Management
  function loadTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === state.theme);
      btn.addEventListener('click', () => {
        const t = btn.dataset.themeVal;
        state.theme = t;
        localStorage.setItem('lumina_theme', t);
        document.documentElement.setAttribute('data-theme', t);
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.themeVal === t));
        showToast(`Theme switched to ${t.charAt(0).toUpperCase() + t.slice(1)}`);
        playUiSound('pop');
        renderAreaChart();
        renderDonutChart();
      });
    });
  }

  // ==========================================================================
  // 2. DYNAMIC PARTICLE BACKGROUND CANVAS
  // ==========================================================================

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
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const pColor = isLight ? '99, 102, 241' : '168, 85, 247';

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${pColor}, ${(1 - dist / 130) * 0.15})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
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

  // ==========================================================================
  // 3. INTERACTIVE CANVAS CHARTS
  // ==========================================================================

  let areaChartData = [24, 38, 35, 52, 48, 70, 85];
  let areaLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function initCharts() {
    window.addEventListener('resize', () => {
      renderAreaChart();
      renderDonutChart();
    });

    // Chart Range Filter Buttons
    document.querySelectorAll('.filter-chip[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-range]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.chartRange = btn.dataset.range;

        if (state.chartRange === '7d') {
          areaChartData = [24, 38, 35, 52, 48, 70, 85];
          areaLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        } else if (state.chartRange === '30d') {
          areaChartData = [20, 25, 40, 35, 55, 60, 50, 68, 75, 80, 88, 95];
          areaLabels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];
        } else {
          areaChartData = [45, 60, 75, 92, 110, 135];
          areaLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        }
        renderAreaChart();
        playUiSound('click');
      });
    });

    // Live Simulation Pulse Toggle
    const simBtn = document.getElementById('toggle-sim-btn');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        state.liveSimulation = !state.liveSimulation;
        simBtn.classList.toggle('active', state.liveSimulation);
        simBtn.textContent = state.liveSimulation ? '⚡ Pulsing...' : '⚡ Live Pulse';

        if (state.liveSimulation) {
          showToast('Live telemetry simulation started');
          state.simInterval = setInterval(() => {
            // Jitter last data point
            const delta = (Math.random() - 0.45) * 8;
            areaChartData[areaChartData.length - 1] = Math.max(20, Math.min(100, areaChartData[areaChartData.length - 1] + delta));
            renderAreaChart();

            // Update random metric
            const kpiOut = document.getElementById('kpi-output');
            if (kpiOut) {
              const currentVal = parseInt(kpiOut.textContent.replace(/[^0-9]/g, ''));
              kpiOut.textContent = `$${(currentVal + Math.floor(Math.random() * 40)).toLocaleString()}`;
            }
          }, 1200);
        } else {
          clearInterval(state.simInterval);
          showToast('Live telemetry paused');
        }
      });
    }

    renderAreaChart();
    renderDonutChart();
  }

  function renderAreaChart() {
    const canvas = document.getElementById('area-chart-canvas');
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

    const padding = { top: 25, right: 25, bottom: 35, left: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxVal = Math.max(...areaChartData) * 1.2 || 100;
    const minVal = 0;

    // Draw horizontal gridlines
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
      ctx.fillText(val, padding.left - 8, y + 3);
    }

    // Calculate Points
    const points = areaChartData.map((val, idx) => {
      const x = padding.left + (chartW / (areaChartData.length - 1)) * idx;
      const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y };
    });

    // Draw Smooth Area Gradient
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

    // Draw Smooth Stroke Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Glowing Points & Labels
    ctx.textAlign = 'center';
    points.forEach((p, idx) => {
      // Glow circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottom Label
      if (areaLabels[idx]) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.fillText(areaLabels[idx], p.x, h - padding.bottom + 18);
      }
    });
  }

  function renderDonutChart() {
    const canvas = document.getElementById('donut-chart-canvas');
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

    const centerX = w / 2;
    const centerY = h / 2 - 10;
    const outerRadius = Math.min(centerX, centerY) - 20;
    const innerRadius = outerRadius * 0.65;

    const slices = [
      { label: 'AI Core', value: 40, color: '#6366f1' },
      { label: 'Frontend', value: 30, color: '#06b6d4' },
      { label: 'Design', value: 20, color: '#ec4899' },
      { label: 'DevOps', value: 10, color: '#f59e0b' }
    ];

    const total = slices.reduce((acc, s) => acc + s.value, 0);
    let startAngle = -Math.PI / 2;

    slices.forEach(slice => {
      const sliceAngle = (slice.value / total) * Math.PI * 2;
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
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('100%', centerX, centerY - 4);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Sprint Total', centerX, centerY + 16);

    // Legend
    const legendY = h - 22;
    const itemWidth = w / slices.length;
    slices.forEach((s, idx) => {
      const lx = idx * itemWidth + itemWidth / 2;
      ctx.beginPath();
      ctx.arc(lx - 18, legendY, 4, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${s.label}`, lx - 10, legendY + 3);
    });
  }

  // ==========================================================================
  // 4. KANBAN BOARD & DRAG AND DROP
  // ==========================================================================

  function loadTasks() {
    const stored = localStorage.getItem('lumina_tasks');
    if (stored) {
      try {
        state.tasks = JSON.parse(stored);
      } catch (e) {
        state.tasks = [...defaultTasks];
      }
    } else {
      state.tasks = [...defaultTasks];
    }
  }

  function saveTasks() {
    localStorage.setItem('lumina_tasks', JSON.stringify(state.tasks));
    updateTaskCounts();
  }

  function updateTaskCounts() {
    const counts = { backlog: 0, 'in-progress': 0, review: 0, done: 0 };
    state.tasks.forEach(t => {
      if (counts[t.status] !== undefined) counts[t.status]++;
    });

    ['backlog', 'in-progress', 'review', 'done'].forEach(col => {
      const countEl = document.getElementById(`count-${col}`);
      if (countEl) countEl.textContent = counts[col];
    });

    const sidebarCount = document.getElementById('sidebar-task-count');
    if (sidebarCount) sidebarCount.textContent = state.tasks.length;

    const kpiDone = document.getElementById('kpi-tasks-done');
    if (kpiDone) kpiDone.textContent = `${counts.done} / ${state.tasks.length}`;
  }

  function initKanban() {
    renderKanbanCards();

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

        const task = state.tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
          task.status = newStatus;
          if (newStatus === 'done') {
            task.progress = 100;
            playUiSound('success');
            showToast(`Task marked as Completed!`);
          } else {
            playUiSound('drop');
          }
          saveTasks();
          renderKanbanCards();
        }
      });
    });

    // Tag Filter Pills
    document.querySelectorAll('.filter-chip[data-tag-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip[data-tag-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tag = btn.dataset.tagFilter;
        renderKanbanCards(tag, document.getElementById('kanban-filter-input').value);
      });
    });

    // Search Input Filter
    const searchInput = document.getElementById('kanban-filter-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const activeTagBtn = document.querySelector('.filter-chip[data-tag-filter].active');
        const tag = activeTagBtn ? activeTagBtn.dataset.tagFilter : 'all';
        renderKanbanCards(tag, e.target.value);
      });
    }

    // Modal Trigger Buttons
    const openModalBtns = [
      document.getElementById('header-create-task-btn'),
      document.getElementById('open-new-task-modal-btn')
    ];
    openModalBtns.forEach(btn => {
      if (btn) btn.addEventListener('click', () => openTaskModal());
    });

    const closeModalBtn = document.getElementById('close-task-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-task-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeTaskModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeTaskModal);

    // Form Submit
    const form = document.getElementById('create-task-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const title = document.getElementById('task-title-input').value.trim();
        const desc = document.getElementById('task-desc-input').value.trim();
        const col = document.getElementById('task-column-select').value;
        const tag = document.getElementById('task-tag-select').value;
        const priority = document.getElementById('task-priority-select').value;
        const dueDate = document.getElementById('task-due-input').value || 'Upcoming';

        if (!title) return;

        const newTask = {
          id: `task-${Date.now()}`,
          title,
          desc: desc || 'Deliverable milestone assigned to current sprint.',
          status: col,
          tag,
          priority,
          progress: col === 'done' ? 100 : col === 'in-progress' ? 40 : 0,
          dueDate
        };

        state.tasks.unshift(newTask);
        saveTasks();
        renderKanbanCards();
        closeTaskModal();
        form.reset();
        showToast('New task added successfully!');
        playUiSound('success');
      });
    }
  }

  function renderKanbanCards(tagFilter = 'all', searchQuery = '') {
    const containers = {
      backlog: document.getElementById('cards-backlog'),
      'in-progress': document.getElementById('cards-in-progress'),
      review: document.getElementById('cards-review'),
      done: document.getElementById('cards-done')
    };

    Object.values(containers).forEach(c => { if (c) c.innerHTML = ''; });

    const filtered = state.tasks.filter(task => {
      const matchTag = tagFilter === 'all' || task.tag.toLowerCase() === tagFilter.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || task.title.toLowerCase().includes(query) || task.desc.toLowerCase().includes(query);
      return matchTag && matchQuery;
    });

    filtered.forEach(task => {
      const card = createCardElement(task);
      if (containers[task.status]) {
        containers[task.status].appendChild(card);
      }
    });

    updateTaskCounts();
  }

  function createCardElement(task) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = task.id;

    const tagClasses = {
      design: 'tag-design',
      dev: 'tag-dev',
      ai: 'tag-ai',
      ops: 'tag-ops'
    };
    const tagClass = tagClasses[task.tag] || 'tag-dev';

    card.innerHTML = `
      <div class="card-tags">
        <span class="tag ${tagClass}">${task.tag}</span>
        <span style="font-size:10px; font-weight:700; color:${task.priority === 'High' ? 'var(--accent-danger)' : task.priority === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-success)'}">
          ${task.priority}
        </span>
      </div>
      <div class="card-title">${escapeHtml(task.title)}</div>
      <div class="card-desc">${escapeHtml(task.desc)}</div>
      <div class="card-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${task.progress}%;"></div>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-due">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${task.dueDate}</span>
        </div>
        <div class="card-actions">
          <button class="card-action-btn delete-task-btn" title="Delete Task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
      playUiSound('pop');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    // Delete event
    const deleteBtn = card.querySelector('.delete-task-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderKanbanCards();
        showToast('Task removed');
        playUiSound('trash');
      });
    }

    return card;
  }

  function openTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
      modal.classList.add('active');
      document.getElementById('task-title-input').focus();
    }
  }

  function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('active');
  }

  // ==========================================================================
  // 5. POMODORO FOCUS ENGINE
  // ==========================================================================

  function initTimer() {
    const display = document.getElementById('timer-display');
    const startPauseBtn = document.getElementById('timer-start-pause-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const statusText = document.getElementById('timer-status-text');

    // Preset time selector buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pauseTimer();
        state.timer.totalSeconds = parseInt(btn.dataset.time, 10);
        state.timer.remainingSeconds = state.timer.totalSeconds;
        state.timer.modeLabel = btn.dataset.label;
        statusText.textContent = state.timer.modeLabel;
        updateTimerDisplay();
        playUiSound('click');
      });
    });

    if (startPauseBtn) {
      startPauseBtn.addEventListener('click', () => {
        if (state.timer.isRunning) {
          pauseTimer();
        } else {
          startTimer();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        pauseTimer();
        state.timer.remainingSeconds = state.timer.totalSeconds;
        updateTimerDisplay();
        playUiSound('pop');
      });
    }

    updateTimerDisplay();
  }

  function startTimer() {
    state.timer.isRunning = true;
    const btnLabel = document.getElementById('timer-btn-label');
    const btnIcon = document.getElementById('timer-btn-icon');
    const statusText = document.getElementById('timer-status-text');

    if (btnLabel) btnLabel.textContent = 'Pause';
    if (btnIcon) btnIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    if (statusText) statusText.textContent = 'Focus Session Active';

    playUiSound('start');
    showToast('Focus timer running');

    state.timer.intervalId = setInterval(() => {
      if (state.timer.remainingSeconds > 0) {
        state.timer.remainingSeconds--;
        updateTimerDisplay();
      } else {
        pauseTimer();
        playUiSound('chime');
        showToast('🎉 Focus session completed! Take a break.');
        if (statusText) statusText.textContent = 'Session Complete!';
      }
    }, 1000);
  }

  function pauseTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.intervalId);

    const btnLabel = document.getElementById('timer-btn-label');
    const btnIcon = document.getElementById('timer-btn-icon');
    const statusText = document.getElementById('timer-status-text');

    if (btnLabel) btnLabel.textContent = 'Start Focus';
    if (btnIcon) btnIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    if (statusText && state.timer.remainingSeconds === state.timer.totalSeconds) {
      statusText.textContent = 'Ready to Focus';
    }
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.timer.remainingSeconds / 60);
    const secs = state.timer.remainingSeconds % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const display = document.getElementById('timer-display');
    if (display) display.textContent = str;

    // SVG Circular Ring offset
    const ring = document.getElementById('timer-progress-ring');
    if (ring) {
      const circumference = 2 * Math.PI * 110; // ~691.15
      const fraction = state.timer.remainingSeconds / state.timer.totalSeconds;
      const offset = circumference * (1 - fraction);
      ring.style.strokeDashoffset = offset;
    }
  }

  // ==========================================================================
  // 6. WEB AUDIO AMBIENT SYNTHESIZER & VISUALIZER
  // ==========================================================================

  function getAudioContext() {
    if (!state.audio.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audio.ctx = new AudioCtx();
      state.audio.analyser = state.audio.ctx.createAnalyser();
      state.audio.analyser.fftSize = 64;
      state.audio.analyser.connect(state.audio.ctx.destination);
      initVisualizerLoop();
    }
    if (state.audio.ctx.state === 'suspended') {
      state.audio.ctx.resume();
    }
    return state.audio.ctx;
  }

  function initAudioEngine() {
    // Sound Toggles
    const soundTypes = ['balochi', 'drone', 'binaural', 'rain', 'noise'];
    soundTypes.forEach(type => {
      const btn = document.getElementById(`btn-sound-${type}`);
      const volSlider = document.getElementById(`vol-${type}`);

      if (btn) {
        btn.addEventListener('click', () => {
          getAudioContext();
          if (state.audio.isPlaying[type]) {
            stopSound(type);
            btn.classList.remove('active');
            btn.textContent = 'Play';
          } else {
            playSound(type);
            btn.classList.add('active');
            btn.textContent = 'Playing';
          }
        });
      }

      if (volSlider) {
        volSlider.addEventListener('input', e => {
          const val = parseFloat(e.target.value) / 100;
          state.audio.volumes[type] = val;
          if (state.audio.nodes[type] && state.audio.nodes[type].gain) {
            state.audio.nodes[type].gain.gain.setValueAtTime(val, state.audio.ctx.currentTime);
          }
        });
      }
    });

    const muteAllBtn = document.getElementById('stop-all-audio-btn');
    if (muteAllBtn) {
      muteAllBtn.addEventListener('click', () => {
        soundTypes.forEach(t => stopSound(t));
        document.querySelectorAll('.sound-toggle-btn').forEach(b => {
          b.classList.remove('active');
          b.textContent = 'Play';
        });
        showToast('All ambient sounds muted');
      });
    }
  }

  function playSound(type) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(state.audio.volumes[type], now);
    masterGain.connect(state.audio.analyser);

    
    if (type === 'balochi') {
      // =========================================================================
      // BALOCHI SUROZ & DAMBURAG FOLK SYNTHESIZER
      // Simulates traditional Balochi Suroz bowed harmonics + Damburag rhythmic drone
      // =========================================================================
      
      // 1. Damburag (Two-stringed long-neck lute) Drone: Root D3 (146.83Hz) + Fifth A3 (220Hz)
      const damburagGain = ctx.createGain();
      damburagGain.gain.setValueAtTime(0.65, now);
      damburagGain.connect(masterGain);

      const droneRoot = ctx.createOscillator();
      droneRoot.type = 'triangle';
      droneRoot.frequency.setValueAtTime(146.83, now); // D3

      const droneFifth = ctx.createOscillator();
      droneFifth.type = 'sawtooth';
      droneFifth.frequency.setValueAtTime(220.00, now); // A3

      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(480, now);
      droneFilter.Q.setValueAtTime(2.5, now);

      droneRoot.connect(droneFilter);
      droneFifth.connect(droneFilter);
      droneFilter.connect(damburagGain);
      droneRoot.start(now);
      droneFifth.start(now);

      // 2. Suroz (سروز - Bowed folk fiddle with sympathetic resonator strings)
      // Generates warm expressive modal melody in D Bayati / Rast folk scale
      const surozGain = ctx.createGain();
      surozGain.gain.setValueAtTime(0.7, now);
      surozGain.connect(masterGain);

      const surozOsc = ctx.createOscillator();
      surozOsc.type = 'sawtooth';

      // Sympathetic resonance oscillator (octave + fifth overtone)
      const sympatheticOsc = ctx.createOscillator();
      sympatheticOsc.type = 'sine';

      // Suroz acoustic vibrato LFO (5.2 Hz gentle expressive vibrato)
      const vibratoLfo = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibratoLfo.frequency.setValueAtTime(5.2, now);
      vibratoGain.gain.setValueAtTime(3.5, now); // subtle pitch depth
      vibratoLfo.connect(vibratoGain);
      vibratoGain.connect(surozOsc.frequency);
      vibratoGain.connect(sympatheticOsc.frequency);
      vibratoLfo.start(now);

      // Resonant Bow filter (Acoustic body wood resonance)
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'bandpass';
      bodyFilter.frequency.setValueAtTime(650, now);
      bodyFilter.Q.setValueAtTime(1.8, now);

      surozOsc.connect(bodyFilter);
      sympatheticOsc.connect(bodyFilter);
      bodyFilter.connect(surozGain);

      // Balochi Modal Melody Scale (D Bayati / Zahirok folk mode: D4, E4-half-flat, F4, G4, A4, Bb4, C5, D5)
      const balochiScale = [293.66, 320.00, 349.23, 392.00, 440.00, 466.16, 523.25, 587.33];
      surozOsc.frequency.setValueAtTime(balochiScale[0], now);
      sympatheticOsc.frequency.setValueAtTime(balochiScale[0] * 2, now);
      surozOsc.start(now);
      sympatheticOsc.start(now);

      // 3. Generative Melodic Glissando & Damburag Strum Timer
      let noteIdx = 0;
      const melodySequence = [0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3, 2, 0, 1, 0];
      
      const balochiInterval = setInterval(() => {
        if (!state.audio.isPlaying.balochi) {
          clearInterval(balochiInterval);
          return;
        }
        const t = ctx.currentTime;
        noteIdx = (noteIdx + 1) % melodySequence.length;
        const targetFreq = balochiScale[melodySequence[noteIdx]];

        // Glissando / Portamento between Balochi modal notes (authentic bowed slide)
        surozOsc.frequency.cancelScheduledValues(t);
        sympatheticOsc.frequency.cancelScheduledValues(t);
        surozOsc.frequency.setTargetAtTime(targetFreq, t, 0.18);
        sympatheticOsc.frequency.setTargetAtTime(targetFreq * 2, t, 0.18);

        // Body filter sweep for dynamic bowing expression
        bodyFilter.frequency.setTargetAtTime(450 + (targetFreq * 0.7), t, 0.15);

        // Damburag rhythmic pluck pulse simulation
        damburagGain.gain.setValueAtTime(0.75, t);
        damburagGain.gain.exponentialRampToValueAtTime(0.4, t + 0.35);
      }, 1400);

      state.audio.nodes.balochi = {
        droneRoot,
        droneFifth,
        surozOsc,
        sympatheticOsc,
        vibratoLfo,
        balochiInterval,
        gain: masterGain
      };
    } else if (type === 'drone') {

      // Cosmic Drone: Tri-oscillator chord (110Hz, 165Hz, 220Hz) with low-pass sweep
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

      state.audio.nodes.drone = { oscs, filter, gain: masterGain };
    } else if (type === 'binaural') {
      // Binaural 432Hz alpha beat (432Hz left, 440Hz right = 8Hz alpha wave)
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

      state.audio.nodes.binaural = { oscL, oscR, gain: masterGain };
    } else if (type === 'rain' || type === 'noise') {
      // White / Pink Noise Buffer synthesis
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'noise') {
          // Pink noise filter approximation
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
        } else {
          // Rain noise
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

      state.audio.nodes[type] = { noiseSource, filter, gain: masterGain };
    }

    state.audio.isPlaying[type] = true;
    document.getElementById('audio-state-badge').textContent = 'Audio Synthesizer Active';
    document.getElementById('audio-state-badge').style.color = 'var(--accent-success)';
  }

  function stopSound(type) {
    if (!state.audio.isPlaying[type]) return;
    const node = state.audio.nodes[type];
    if (node) {
      if (node.balochiInterval) clearInterval(node.balochiInterval);
      if (node.droneRoot) { try { node.droneRoot.stop(); node.droneFifth.stop(); node.surozOsc.stop(); node.sympatheticOsc.stop(); node.vibratoLfo.stop(); } catch(e){} }
      if (node.oscs) node.oscs.forEach(o => { try { o.stop(); } catch(e){} });
      if (node.oscL) { try { node.oscL.stop(); node.oscR.stop(); } catch(e){} }
      if (node.noiseSource) { try { node.noiseSource.stop(); } catch(e){} }
      if (node.gain) node.gain.disconnect();
    }
    state.audio.isPlaying[type] = false;
    delete state.audio.nodes[type];

    const anyPlaying = Object.values(state.audio.isPlaying).some(v => v);
    if (!anyPlaying) {
      document.getElementById('audio-state-badge').textContent = 'Engine Standby';
      document.getElementById('audio-state-badge').style.color = 'var(--text-muted)';
    }
  }

  function initVisualizerLoop() {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bufferLength = state.audio.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      requestAnimationFrame(draw);

      const w = (canvas.width = canvas.parentElement.clientWidth);
      const h = (canvas.height = 100);

      state.audio.analyser.getByteFrequencyData(dataArray);

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

  // Synthesized UI Sound Effects
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
      } else if (name === 'success' || name === 'chime') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);

          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
          noteGain.gain.setValueAtTime(0.08, now + idx * 0.08);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

          noteOsc.start(now + idx * 0.08);
          noteOsc.stop(now + idx * 0.08 + 0.35);
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
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }

  // ==========================================================================
  // 7. MARKDOWN AI NOTE STUDIO
  // ==========================================================================

  const templates = {
    sprint: `# 🚀 Sprint Planning — Q3 Alpha Release

## Core Deliverables
- [x] Integrate Web Audio Synthesizer pipeline
- [x] Dynamic glassmorphic theme selector (Obsidian, Nebula, Emerald)
- [ ] Implement real-time WebSocket telemetry feed
- [ ] Finalize responsive touch interaction tests

## Architectural Notes
> "High-performance interfaces must achieve continuous 60fps renders with zero frame drops."

### Technical Stack
\`\`\`javascript
const studio = new LuminaEngine({
  audioVisualizer: true,
  themeEngine: 'cyber-luxe',
  refreshRate: '60hz'
});
studio.boot();
\`\`\`
`,
    meeting: `# 📝 Engineering Sync Minutes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** Product Lead, UI Architect, AI Core Team

### Key Decisions
1. **Performance**: All charts rendered on HTML5 Canvas for zero DOM bloat.
2. **Audio**: Ambient binaural alpha beats running at 432Hz / 8Hz offset.
3. **Storage**: Full state persistence via localStorage with export options.

### Action Items
- [ ] Review sprint backlog milestones
- [ ] Audit keyboard accessibility shortcuts
`,
    arch: `# 🏛️ Lumina Architecture Blueprint

### Component Hierarchy
1. **Particle Subsystem**: Independent canvas worker with dynamic alpha blending.
2. **State Store**: Centralized reactive event bus.
3. **Synthesizer Engine**: Multi-node Web Audio graph with biquad bandpass curves.

\`\`\`
[Input Events] -> [Reactive State Bus] -> [Canvas Render Pipeline]
                          |
                          v
                 [Audio Synth Engine]
\`\`\`
`,
    ideas: `# 💡 Brainstorming Sandbox

- **Idea 1**: Auto-generate ambient generative drone scales from project sprint velocity.
- **Idea 2**: Export Kanban boards to CSV and Jira compatible formats.
- **Idea 3**: AI auto-summarizer for markdown meeting logs.
`
  };

  function initMarkdownStudio() {
    const textarea = document.getElementById('note-input');
    const preview = document.getElementById('note-preview');
    const templateSelect = document.getElementById('note-template-select');
    const exportBtn = document.getElementById('export-note-btn');
    const copyBtn = document.getElementById('copy-markdown-btn');

    if (textarea) {
      textarea.addEventListener('input', () => {
        renderMarkdown(textarea.value);
        updateWordStats(textarea.value);
      });
    }

    if (templateSelect) {
      templateSelect.addEventListener('change', e => {
        if (e.target.value) {
          loadTemplate(e.target.value);
          e.target.value = '';
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const text = textarea ? textarea.value : '';
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumina-note-${Date.now()}.md`;
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
        if (action === 'quote') replacement = `\n> ${selected || 'Quote'}\n`;

        textarea.setRangeText(replacement, start, end, 'end');
        renderMarkdown(textarea.value);
        updateWordStats(textarea.value);
        textarea.focus();
        playUiSound('click');
      });
    });
  }

  function loadTemplate(key) {
    const textarea = document.getElementById('note-input');
    if (textarea && templates[key]) {
      textarea.value = templates[key];
      renderMarkdown(textarea.value);
      updateWordStats(textarea.value);
      showToast(`Loaded "${key.charAt(0).toUpperCase() + key.slice(1)}" template`);
      playUiSound('pop');
    }
  }

  function renderMarkdown(md) {
    const preview = document.getElementById('note-preview');
    if (!preview) return;

    if (!md.trim()) {
      preview.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">Start typing to see live preview...</p>';
      return;
    }

    let html = md
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Checkboxes
      .replace(/^- \[x\] (.*$)/gim, '<li style="list-style:none;">✅ $1</li>')
      .replace(/^- \[ \] (.*$)/gim, '<li style="list-style:none;">⬜ $1</li>')
      // Bullet lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // Bold & Italic
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    preview.innerHTML = `<p>${html}</p>`;
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
  // 8. GLOBAL COMMAND PALETTE (CTRL + K)
  // ==========================================================================

  const commands = [
    { title: 'Go to Dashboard', category: 'Navigation', icon: '📊', action: () => switchView('dashboard') },
    { title: 'Go to Task Board', category: 'Navigation', icon: '📋', action: () => switchView('kanban') },
    { title: 'Go to Focus Hub', category: 'Navigation', icon: '⏱️', action: () => switchView('focus') },
    { title: 'Go to AI Note Studio', category: 'Navigation', icon: '✍️', action: () => switchView('notes') },
    { title: 'Create New Task', category: 'Action', icon: '➕', action: () => openTaskModal() },
    { title: 'Start 25m Focus Timer', category: 'Focus', icon: '▶️', action: () => { switchView('focus'); startTimer(); } },
    { title: 'Reset Focus Timer', category: 'Focus', icon: '🔄', action: () => { switchView('focus'); pauseTimer(); } },
    { title: 'Play Balochi Suroz & Folk Drone (سروز)', category: 'Audio', icon: '🪕', action: () => { playSound('balochi'); showToast('Playing Balochi Suroz & Damburag Ambient'); } },
    { title: 'Play Cosmic Ambient Drone', category: 'Audio', icon: '🌌', action: () => { playSound('drone'); showToast('Playing Cosmic Drone'); } },
    { title: 'Play Binaural 432Hz Beats', category: 'Audio', icon: '🧠', action: () => { playSound('binaural'); showToast('Playing Binaural Beats'); } },
    { title: 'Play Gentle Rain Generator', category: 'Audio', icon: '🌧️', action: () => { playSound('rain'); showToast('Playing Rain Generator'); } },
    { title: 'Switch to Dark Obsidian Theme', category: 'Theme', icon: '🌙', action: () => setThemeDirect('dark') },
    { title: 'Switch to Nebula Purple Theme', category: 'Theme', icon: '🔮', action: () => setThemeDirect('nebula') },
    { title: 'Switch to Cyber Emerald Theme', category: 'Theme', icon: '🌿', action: () => setThemeDirect('emerald') },
    { title: 'Switch to Crisp Light Theme', category: 'Theme', icon: '☀️', action: () => setThemeDirect('light') },
    { title: 'Export Notes to File', category: 'Notes', icon: '💾', action: () => document.getElementById('export-note-btn')?.click() }
  ];

  let selectedCmdIdx = 0;

  function initCommandPalette() {
    const cmdBtn = document.getElementById('cmd-palette-btn');
    const cmdModal = document.getElementById('cmd-modal');
    const cmdInput = document.getElementById('cmd-search-input');

    if (cmdBtn) cmdBtn.addEventListener('click', openCommandPalette);

    // Global Keydown
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (cmdModal.classList.contains('active')) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      } else if (e.key === 'Escape') {
        closeCommandPalette();
        closeTaskModal();
      }
    });

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

    const filtered = commands.filter(c => {
      const q = query.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    });

    if (!filtered.length) {
      list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">No matching commands found.</div>';
      return;
    }

    filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `cmd-item ${idx === selectedCmdIdx ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="cmd-item-left">
          <span style="font-size:16px;">${cmd.icon}</span>
          <div>
            <div style="font-weight:600; color:var(--text-primary); font-size:13px;">${cmd.title}</div>
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
      if (idx === selectedCmdIdx) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function setThemeDirect(t) {
    state.theme = t;
    localStorage.setItem('lumina_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.themeVal === t));
    showToast(`Theme switched to ${t.charAt(0).toUpperCase() + t.slice(1)}`);
    renderAreaChart();
    renderDonutChart();
  }

  // ==========================================================================
  // 9. QUICK ACTION TILES & ACTIVITIES
  // ==========================================================================

  function initQuickActions() {
    document.querySelectorAll('.action-tile[data-action]').forEach(tile => {
      tile.addEventListener('click', () => {
        const action = tile.dataset.action;
        if (action === 'goto-kanban') switchView('kanban');
        if (action === 'start-focus') { switchView('focus'); startTimer(); }
        if (action === 'new-note') switchView('notes');
        if (action === 'play-ambient') { playSound('drone'); showToast('Playing Cosmic Ambient Drone'); }
        playUiSound('click');
      });
    });
  }

  function populateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const events = [
      { user: 'AI', name: 'Synthesizer Engine', time: '2m ago', desc: 'Audio graph synchronized at 48kHz frequency' },
      { user: 'UI', name: 'Glassmorphic Pipeline', time: '14m ago', desc: 'Dynamic GPU backdrop blur tokens compiled' },
      { user: 'KB', name: 'Task Board', time: '1h ago', desc: 'Automated milestone completed in Sprint Q3' }
    ];

    feed.innerHTML = events.map(e => `
      <div class="activity-item">
        <div class="activity-avatar">${e.user}</div>
        <div class="activity-details">
          <div class="activity-title">${e.name}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${e.desc}</div>
        </div>
        <div class="activity-time">${e.time}</div>
      </div>
    `).join('');
  }

  function startLiveTicker() {
    setInterval(() => {
      const liveIndicator = document.getElementById('live-indicator');
      if (liveIndicator) {
        liveIndicator.style.opacity = '0.5';
        setTimeout(() => liveIndicator.style.opacity = '1', 200);
      }
    }, 4000);
  }

  // Toast Notification System
  function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">✧</span>
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
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot Application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
