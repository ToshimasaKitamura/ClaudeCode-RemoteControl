document.addEventListener("DOMContentLoaded", () => {

  // ========================================
  // State
  // ========================================
  let tasks = JSON.parse(localStorage.getItem("tm_tasks") || "[]");
  let currentFilter = "all";
  let currentCategory = null;
  let currentSort = localStorage.getItem("tm_sort") || "created-desc";
  let searchQuery = "";
  let selectedIds = new Set();
  let dragSrcId = null;

  const CATEGORY_COLORS = {
    personal: "#6c5ce7",
    work: "#0984e3",
    study: "#00b894",
    health: "#e17055",
    other: "#fdcb6e"
  };

  // ========================================
  // DOM References
  // ========================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const taskListEl = $("#task-list");
  const emptyStateEl = $("#empty-state");
  const addForm = $("#add-form");
  const addInput = $("#add-input");
  const addPriority = $("#add-priority");
  const addCategory = $("#add-category");
  const addDue = $("#add-due");
  const searchInput = $("#search-input");
  const searchClear = $("#search-clear");
  const sortSelect = $("#sort-select");
  const sidebar = $("#sidebar");
  const sidebarToggle = $("#sidebar-toggle");
  const toastEl = $("#toast");
  const bulkBar = $("#bulk-bar");
  const bulkCount = $("#bulk-count");

  // Stats
  const statTotal = $("#stat-total");
  const statDone = $("#stat-done");
  const statStreak = $("#stat-streak");
  const statPercent = $("#stat-percent");
  const progressRingFill = $("#progress-ring-fill");

  // ========================================
  // Dark Mode
  // ========================================
  const darkToggle = $("#dark-toggle");
  if (localStorage.getItem("tm_dark") === "true") {
    document.body.classList.add("dark");
  }

  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("tm_dark", document.body.classList.contains("dark"));
  });

  // ========================================
  // Sidebar Mobile
  // ========================================
  let backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.classList.toggle("active");
  });

  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("active");
  });

  // ========================================
  // Toast
  // ========================================
  let toastTimer;
  function showToast(message, type = "") {
    toastEl.textContent = message;
    toastEl.className = "toast show" + (type ? " toast-" + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2500);
  }

  // ========================================
  // Save & Render
  // ========================================
  function save() {
    localStorage.setItem("tm_tasks", JSON.stringify(tasks));
  }

  function getFilteredTasks() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = tasks;

    // Filter
    if (currentFilter === "active") {
      filtered = filtered.filter(t => !t.done);
    } else if (currentFilter === "completed") {
      filtered = filtered.filter(t => t.done);
    } else if (currentFilter === "overdue") {
      filtered = filtered.filter(t => {
        if (t.done || !t.due) return false;
        return new Date(t.due) < now;
      });
    }

    // Category filter
    if (currentCategory) {
      filtered = filtered.filter(t => t.category === currentCategory);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.desc && t.desc.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // Sort
    const priorityMap = { high: 3, medium: 2, low: 1 };
    const [sortKey, sortDir] = currentSort.split("-");
    const dir = sortDir === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      switch (sortKey) {
        case "created":
          return (a.createdAt - b.createdAt) * dir;
        case "priority":
          return (priorityMap[a.priority] - priorityMap[b.priority]) * dir;
        case "due":
          const aD = a.due ? new Date(a.due).getTime() : Infinity;
          const bD = b.due ? new Date(b.due).getTime() : Infinity;
          return (aD - bD) * dir;
        case "alpha":
          return a.title.localeCompare(b.title) * dir;
        default:
          return 0;
      }
    });

    return filtered;
  }

  function render() {
    const filtered = getFilteredTasks();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Update stats
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const overdue = tasks.filter(t => !t.done && t.due && new Date(t.due) < now).length;
    const active = tasks.filter(t => !t.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    statTotal.textContent = total;
    statDone.textContent = done;
    statPercent.textContent = pct + "%";

    // Calculate streak
    statStreak.textContent = calculateStreak();

    // Progress ring
    const circumference = 2 * Math.PI * 34;
    progressRingFill.style.strokeDashoffset = circumference - (pct / 100) * circumference;

    // Sidebar badges
    $("#count-all").textContent = total;
    $("#count-active").textContent = active;
    $("#count-completed").textContent = done;
    $("#count-overdue").textContent = overdue;

    // Render tasks
    if (filtered.length === 0) {
      taskListEl.innerHTML = "";
      emptyStateEl.style.display = "block";
    } else {
      emptyStateEl.style.display = "none";
      taskListEl.innerHTML = filtered.map(task => {
        const isOverdue = !task.done && task.due && new Date(task.due) < now;
        const subtasksDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0;
        const subtasksTotal = task.subtasks ? task.subtasks.length : 0;
        const subtaskPct = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

        return `
          <div class="task-item ${task.done ? 'completed' : ''} priority-${task.priority}"
               data-id="${task.id}" draggable="true">
            <input type="checkbox" class="task-select" data-id="${task.id}"
              ${selectedIds.has(task.id) ? 'checked' : ''}>
            <input type="checkbox" class="task-check" data-id="${task.id}"
              ${task.done ? 'checked' : ''}>
            <div class="task-body">
              <div class="task-title">${escapeHTML(task.title)}</div>
              ${task.desc ? `<div class="task-desc">${escapeHTML(task.desc)}</div>` : ''}
              <div class="task-meta">
                <span class="task-tag tag-priority-${task.priority}">${capitalize(task.priority)}</span>
                <span class="task-tag tag-category" style="background:${CATEGORY_COLORS[task.category]}22;color:${CATEGORY_COLORS[task.category]}">${capitalize(task.category)}</span>
                ${task.due ? `<span class="task-tag ${isOverdue ? 'tag-overdue' : 'tag-due'}">${formatDate(task.due)}${task.dueTime ? ' ' + task.dueTime : ''}</span>` : ''}
              </div>
              ${subtasksTotal > 0 ? `
                <div class="task-subtasks">
                  ${task.subtasks.map((s, i) => `
                    <div class="subtask-row">
                      <input type="checkbox" class="subtask-check" data-task-id="${task.id}" data-index="${i}" ${s.done ? 'checked' : ''}>
                      <span class="subtask-text ${s.done ? 'done' : ''}">${escapeHTML(s.text)}</span>
                    </div>
                  `).join('')}
                  <div class="subtask-progress">
                    <div class="subtask-progress-fill" style="width:${subtaskPct}%"></div>
                  </div>
                </div>
              ` : ''}
            </div>
            <div class="task-actions">
              <button class="task-action-btn edit" data-id="${task.id}" title="Edit">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
              <button class="task-action-btn delete" data-id="${task.id}" title="Delete">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join("");

      bindTaskEvents();
    }

    updateBulkBar();
  }

  function bindTaskEvents() {
    // Check/uncheck
    taskListEl.querySelectorAll(".task-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const id = Number(cb.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.done = cb.checked;
          if (task.done) {
            task.completedAt = Date.now();
            showToast("Task completed!", "success");
          } else {
            task.completedAt = null;
          }
          save();
          render();
        }
      });
    });

    // Subtask check
    taskListEl.querySelectorAll(".subtask-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const taskId = Number(cb.dataset.taskId);
        const index = Number(cb.dataset.index);
        const task = tasks.find(t => t.id === taskId);
        if (task && task.subtasks[index] !== undefined) {
          task.subtasks[index].done = cb.checked;
          save();
          render();
        }
      });
    });

    // Edit
    taskListEl.querySelectorAll(".task-action-btn.edit").forEach(btn => {
      btn.addEventListener("click", () => openEditModal(Number(btn.dataset.id)));
    });

    // Delete
    taskListEl.querySelectorAll(".task-action-btn.delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const item = taskListEl.querySelector(`.task-item[data-id="${id}"]`);
        if (item) {
          item.style.animation = "taskRemove 0.3s forwards";
          setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            save();
            render();
            showToast("Task deleted", "danger");
          }, 280);
        }
      });
    });

    // Select for bulk
    taskListEl.querySelectorAll(".task-select").forEach(cb => {
      cb.addEventListener("change", () => {
        const id = Number(cb.dataset.id);
        if (cb.checked) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
        }
        updateBulkBar();
      });
    });

    // Drag and drop
    taskListEl.querySelectorAll(".task-item").forEach(item => {
      item.addEventListener("dragstart", (e) => {
        dragSrcId = Number(item.dataset.id);
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        taskListEl.querySelectorAll(".task-item").forEach(el => el.classList.remove("drag-over"));
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        item.classList.add("drag-over");
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        const targetId = Number(item.dataset.id);
        if (dragSrcId !== null && dragSrcId !== targetId) {
          const srcIdx = tasks.findIndex(t => t.id === dragSrcId);
          const targetIdx = tasks.findIndex(t => t.id === targetId);
          if (srcIdx !== -1 && targetIdx !== -1) {
            const [moved] = tasks.splice(srcIdx, 1);
            tasks.splice(targetIdx, 0, moved);
            save();
            render();
          }
        }
        dragSrcId = null;
      });
    });
  }

  // ========================================
  // Add Task
  // ========================================
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = addInput.value.trim();
    if (!title) return;

    const task = {
      id: Date.now(),
      title,
      desc: "",
      priority: addPriority.value,
      category: addCategory.value,
      due: addDue.value || null,
      dueTime: null,
      done: false,
      completedAt: null,
      createdAt: Date.now(),
      subtasks: []
    };

    tasks.unshift(task);
    save();
    addInput.value = "";
    addDue.value = "";
    render();
    showToast("Task added!", "success");
  });

  // ========================================
  // Search
  // ========================================
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();
    searchClear.style.display = searchQuery ? "block" : "none";
    render();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClear.style.display = "none";
    render();
  });

  // ========================================
  // Sort
  // ========================================
  sortSelect.value = currentSort;
  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    localStorage.setItem("tm_sort", currentSort);
    render();
  });

  // ========================================
  // Sidebar Navigation
  // ========================================
  $$("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("[data-filter]").forEach(b => b.classList.remove("active"));
      $$("[data-category]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      currentCategory = null;
      render();
      closeMobileSidebar();
    });
  });

  $$("[data-category]").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("[data-filter]").forEach(b => b.classList.remove("active"));
      $$("[data-category]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      currentFilter = "all";
      render();
      closeMobileSidebar();
    });
  });

  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("active");
  }

  // ========================================
  // Bulk Actions
  // ========================================
  function updateBulkBar() {
    if (selectedIds.size > 0) {
      bulkBar.style.display = "flex";
      bulkCount.textContent = selectedIds.size + " selected";
    } else {
      bulkBar.style.display = "none";
    }
  }

  $("#bulk-complete").addEventListener("click", () => {
    tasks.forEach(t => {
      if (selectedIds.has(t.id)) {
        t.done = true;
        t.completedAt = Date.now();
      }
    });
    selectedIds.clear();
    save();
    render();
    showToast("Tasks completed!", "success");
  });

  $("#bulk-delete").addEventListener("click", () => {
    tasks = tasks.filter(t => !selectedIds.has(t.id));
    selectedIds.clear();
    save();
    render();
    showToast("Tasks deleted", "danger");
  });

  $("#bulk-cancel").addEventListener("click", () => {
    selectedIds.clear();
    render();
  });

  // ========================================
  // Edit Modal
  // ========================================
  const editModal = $("#edit-modal");
  const editForm = $("#edit-form");
  let editSubtasks = [];

  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    $("#edit-id").value = task.id;
    $("#edit-title").value = task.title;
    $("#edit-desc").value = task.desc || "";
    $("#edit-priority").value = task.priority;
    $("#edit-category").value = task.category;
    $("#edit-due").value = task.due || "";
    $("#edit-time").value = task.dueTime || "";
    editSubtasks = task.subtasks ? task.subtasks.map(s => ({ ...s })) : [];
    renderEditSubtasks();
    openModal(editModal);
  }

  function renderEditSubtasks() {
    const container = $("#edit-subtasks");
    container.innerHTML = editSubtasks.map((s, i) => `
      <div class="subtask-edit-row">
        <input type="text" value="${escapeHTML(s.text)}" data-index="${i}">
        <button type="button" class="subtask-remove-btn" data-index="${i}">&times;</button>
      </div>
    `).join("");

    container.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        editSubtasks[Number(inp.dataset.index)].text = inp.value;
      });
    });

    container.querySelectorAll(".subtask-remove-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        editSubtasks.splice(Number(btn.dataset.index), 1);
        renderEditSubtasks();
      });
    });
  }

  $("#edit-add-subtask").addEventListener("click", () => {
    const input = $("#edit-subtask-input");
    const text = input.value.trim();
    if (!text) return;
    editSubtasks.push({ text, done: false });
    input.value = "";
    renderEditSubtasks();
  });

  $("#edit-subtask-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#edit-add-subtask").click();
    }
  });

  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = Number($("#edit-id").value);
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.title = $("#edit-title").value.trim();
    task.desc = $("#edit-desc").value.trim();
    task.priority = $("#edit-priority").value;
    task.category = $("#edit-category").value;
    task.due = $("#edit-due").value || null;
    task.dueTime = $("#edit-time").value || null;
    task.subtasks = editSubtasks.filter(s => s.text.trim());

    save();
    render();
    closeModal(editModal);
    showToast("Task updated!", "success");
  });

  // ========================================
  // Modal Utilities
  // ========================================
  function openModal(modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  $$("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal);
    });
  });

  $$(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // ========================================
  // Pomodoro Timer
  // ========================================
  const pomodoroModal = $("#pomodoro-modal");
  const pomodoroTime = $("#pomodoro-time");
  const pomodoroProgress = $("#pomodoro-progress");
  const pomodoroLabel = $("#pomodoro-label");
  const pomodoroSessionCount = $("#pomodoro-session-count");
  const pomodoroStart = $("#pomodoro-start");
  const pomodoroPause = $("#pomodoro-pause");
  const pomodoroReset = $("#pomodoro-reset");

  const WORK_DURATION = 25 * 60;
  const SHORT_BREAK = 5 * 60;
  const LONG_BREAK = 15 * 60;
  const CIRCUMFERENCE = 2 * Math.PI * 90;

  let pomodoroSeconds = WORK_DURATION;
  let pomodoroRunning = false;
  let pomodoroInterval = null;
  let pomodoroIsBreak = false;
  let pomodoroSessions = 0;
  let pomodoroDuration = WORK_DURATION;

  function updatePomodoroDisplay() {
    const mins = Math.floor(pomodoroSeconds / 60);
    const secs = pomodoroSeconds % 60;
    pomodoroTime.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");

    const progress = 1 - (pomodoroSeconds / pomodoroDuration);
    pomodoroProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    pomodoroProgress.classList.toggle("break-mode", pomodoroIsBreak);
  }

  function startPomodoro() {
    pomodoroRunning = true;
    pomodoroStart.disabled = true;
    pomodoroPause.disabled = false;

    pomodoroInterval = setInterval(() => {
      pomodoroSeconds--;
      updatePomodoroDisplay();

      if (pomodoroSeconds <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;

        if (!pomodoroIsBreak) {
          pomodoroSessions++;
          pomodoroSessionCount.textContent = pomodoroSessions;
          showToast("Focus session complete! Take a break.", "success");

          pomodoroIsBreak = true;
          pomodoroDuration = pomodoroSessions % 4 === 0 ? LONG_BREAK : SHORT_BREAK;
          pomodoroSeconds = pomodoroDuration;
          pomodoroLabel.textContent = pomodoroSessions % 4 === 0 ? "Long Break" : "Short Break";
        } else {
          showToast("Break over! Time to focus.", "");
          pomodoroIsBreak = false;
          pomodoroDuration = WORK_DURATION;
          pomodoroSeconds = WORK_DURATION;
          pomodoroLabel.textContent = "Focus Time";
        }

        pomodoroStart.disabled = false;
        pomodoroPause.disabled = true;
        updatePomodoroDisplay();
      }
    }, 1000);
  }

  pomodoroStart.addEventListener("click", startPomodoro);

  pomodoroPause.addEventListener("click", () => {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    pomodoroStart.disabled = false;
    pomodoroPause.disabled = true;
  });

  pomodoroReset.addEventListener("click", () => {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    pomodoroIsBreak = false;
    pomodoroSeconds = WORK_DURATION;
    pomodoroDuration = WORK_DURATION;
    pomodoroLabel.textContent = "Focus Time";
    pomodoroStart.disabled = false;
    pomodoroPause.disabled = true;
    updatePomodoroDisplay();
  });

  updatePomodoroDisplay();

  $("#open-pomodoro").addEventListener("click", () => {
    openModal(pomodoroModal);
    closeMobileSidebar();
  });

  // ========================================
  // Import/Export
  // ========================================
  const ioModal = $("#io-modal");

  $("#open-io").addEventListener("click", () => {
    openModal(ioModal);
    closeMobileSidebar();
  });

  $("#export-btn").addEventListener("click", () => {
    const data = JSON.stringify(tasks, null, 2);
    downloadFile(data, "taskmaster-backup.json", "application/json");
    showToast("Exported as JSON!", "success");
  });

  $("#export-csv-btn").addEventListener("click", () => {
    const headers = ["Title", "Description", "Priority", "Category", "Due Date", "Status", "Created"];
    const rows = tasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${(t.desc || '').replace(/"/g, '""')}"`,
      t.priority,
      t.category,
      t.due || "",
      t.done ? "Done" : "Active",
      new Date(t.createdAt).toLocaleDateString()
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    downloadFile(csv, "taskmaster-backup.csv", "text/csv");
    showToast("Exported as CSV!", "success");
  });

  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (Array.isArray(imported)) {
          tasks = imported;
          save();
          render();
          showToast(`Imported ${imported.length} tasks!`, "success");
          closeModal(ioModal);
        }
      } catch {
        showToast("Invalid file format", "danger");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ========================================
  // Keyboard Shortcuts
  // ========================================
  const shortcutsModal = $("#shortcuts-modal");

  $("#open-shortcuts").addEventListener("click", () => {
    openModal(shortcutsModal);
    closeMobileSidebar();
  });

  document.addEventListener("keydown", (e) => {
    // Ignore when typing in inputs
    if (e.target.matches("input, textarea, select")) {
      if (e.key === "Escape") {
        e.target.blur();
      }
      return;
    }

    switch (e.key) {
      case "n":
      case "N":
        e.preventDefault();
        addInput.focus();
        break;
      case "/":
        e.preventDefault();
        searchInput.focus();
        break;
      case "d":
      case "D":
        e.preventDefault();
        darkToggle.click();
        break;
      case "p":
      case "P":
        e.preventDefault();
        openModal(pomodoroModal);
        break;
      case "1":
        e.preventDefault();
        $("[data-filter='all']").click();
        break;
      case "2":
        e.preventDefault();
        $("[data-filter='active']").click();
        break;
      case "3":
        e.preventDefault();
        $("[data-filter='completed']").click();
        break;
      case "?":
        e.preventDefault();
        openModal(shortcutsModal);
        break;
      case "Escape":
        $$(".modal.active").forEach(m => closeModal(m));
        break;
    }
  });

  // ========================================
  // Streak Calculator
  // ========================================
  function calculateStreak() {
    const completedDates = tasks
      .filter(t => t.completedAt)
      .map(t => {
        const d = new Date(t.completedAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      });

    const uniqueDates = [...new Set(completedDates)].sort().reverse();

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const dateStr of uniqueDates) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (dateStr === key) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // ========================================
  // Helper Functions
  // ========================================
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - now) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff > 0 && diff <= 7) return `${diff} days`;

    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  }

  // ========================================
  // Initial Render
  // ========================================
  render();

});
