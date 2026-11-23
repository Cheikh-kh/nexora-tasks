/* =========================================================
   NEXORA — Task Dashboard
   Vanilla JS · localStorage persistence · accessible interactions
   ========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "nexora.tasks.v1";
  const THEME_KEY = "nexora.theme.v1";

  const STATUS_LABELS = {
    todo: "To do",
    progress: "In progress",
    done: "Completed",
  };

  const PRIORITY_LABELS = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

  const state = {
    tasks: [],
    status: "all",
    priority: "all",
    sort: "newest",
    query: "",
    editingId: null,
  };

  let lastFocused = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const els = {
    search: $("#searchInput"),
    themeToggle: $("#themeToggle"),
    openAddTask: $("#openAddTask"),
    todayLabel: $("#todayLabel"),
    taskList: $("#taskList"),
    emptyState: $("#emptyState"),
    resultsSummary: $("#resultsSummary"),
    tabs: $$(".tab"),
    counts: $$("[data-count]"),
    priorityFilter: $("#priorityFilter"),
    sortSelect: $("#sortSelect"),
    statTotal: $("#statTotal"),
    statTodo: $("#statTodo"),
    statProgress: $("#statProgress"),
    statPercent: $("#statPercent"),
    statCaption: $("#statCaption"),
    progressBar: $("#progressBar"),
    progressTrack: $("#progressTrack"),
    modalBackdrop: $("#modalBackdrop"),
    modal: $(".modal"),
    modalEyebrow: $("#modalEyebrow"),
    modalTitle: $("#modalTitle"),
    form: $("#taskForm"),
    titleInput: $("#taskTitleInput"),
    descInput: $("#taskDescInput"),
    statusInput: $("#taskStatusInput"),
    priorityInput: $("#taskPriorityInput"),
    dueInput: $("#taskDueInput"),
    titleError: $("#titleError"),
    descCount: $("#descCount"),
    submitTask: $("#submitTask"),
    toastStack: $("#toastStack"),
  };

  /* --------------------------- Utilities --------------------------- */

  const esc = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[char];
    });

  const icon = (name) =>
    `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const uid = () => {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const parseDate = (value) => {
    if (!value) return null;
    const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const dateOffset = (days) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const formatDate = (value, forceYear = false) => {
    const date = parseDate(value);
    if (!date) return "—";
    const options = { month: "short", day: "numeric" };
    if (forceYear || date.getFullYear() !== new Date().getFullYear()) {
      options.year = "numeric";
    }
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  const truncate = (value, limit = 34) =>
    value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;

  /* ----------------------------- Data ------------------------------ */

  function seedTasks() {
    const now = Date.now();
    const day = 86400000;

    return [
      {
        id: uid(),
        title: "Kick off the NEXORA brand refresh",
        description:
          "Align the team on the new visual direction, moodboard and messaging pillars before the client review.",
        status: "progress",
        priority: "high",
        due: dateOffset(2),
        createdAt: new Date(now - 2 * day).toISOString(),
      },
      {
        id: uid(),
        title: "Send the Q4 proposal to Atlantik Foods",
        description:
          "Final pricing, timeline and scope. Include the social media add-on we discussed on Friday.",
        status: "todo",
        priority: "high",
        due: dateOffset(-1),
        createdAt: new Date(now - 3 * day).toISOString(),
      },
      {
        id: uid(),
        title: "Design dashboard empty and loading states",
        description:
          "Create friendly illustrations and microcopy for the zero-task and no-results views.",
        status: "progress",
        priority: "medium",
        due: dateOffset(5),
        createdAt: new Date(now - 4 * day).toISOString(),
      },
      {
        id: uid(),
        title: "Write the October performance recap",
        description:
          "Pull numbers from analytics and summarise wins, learnings and next steps for the client.",
        status: "todo",
        priority: "low",
        due: dateOffset(9),
        createdAt: new Date(now - 5 * day).toISOString(),
      },
      {
        id: uid(),
        title: "Publish the September newsletter",
        description: "Final proofread, export the hero image and schedule the send for 9:00 AM.",
        status: "done",
        priority: "medium",
        due: dateOffset(-3),
        createdAt: new Date(now - 9 * day).toISOString(),
      },
      {
        id: uid(),
        title: "Set up landing page analytics events",
        description:
          "Track form starts, submissions and CTA clicks so the next campaign has clean attribution.",
        status: "done",
        priority: "high",
        due: dateOffset(-7),
        createdAt: new Date(now - 11 * day).toISOString(),
      },
    ];
  }

  function normalizeTask(task) {
    if (!task || typeof task !== "object") return null;

    const title = typeof task.title === "string" ? task.title.trim().slice(0, 90) : "";
    if (!title) return null;

    const createdAt = parseDate(task.createdAt);

    return {
      id: typeof task.id === "string" && task.id ? task.id : uid(),
      title,
      description:
        typeof task.description === "string" ? task.description.trim().slice(0, 240) : "",
      status: Object.hasOwn(STATUS_LABELS, task.status) ? task.status : "todo",
      priority: Object.hasOwn(PRIORITY_LABELS, task.priority) ? task.priority : "medium",
      due: typeof task.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : "",
      createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
    };
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedTasks();

      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed && parsed.tasks;
      if (!Array.isArray(list)) return seedTasks();

      return list.map(normalizeTask).filter(Boolean);
    } catch (error) {
      return seedTasks();
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, tasks: state.tasks })
      );
    } catch (error) {
      /* Storage may be unavailable (private mode / quota); the UI still works. */
    }
  }

  const findTask = (id) => state.tasks.find((task) => task.id === id);

  /* ----------------------------- Theme ----------------------------- */

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    els.themeToggle.setAttribute("aria-label", nextLabel);
    els.themeToggle.title = nextLabel;

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#0b1120" : "#f4f6fb";
  }

  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (error) {
      stored = null;
    }

    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light");
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      /* ignore */
    }
  }

  /* ---------------------------- Filtering -------------------------- */

  const SORTERS = {
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    due: (a, b) => {
      if (!a.due && !b.due) return new Date(b.createdAt) - new Date(a.createdAt);
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    },
    priority: (a, b) =>
      PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
      new Date(b.createdAt) - new Date(a.createdAt),
    title: (a, b) => a.title.localeCompare(b.title),
  };

  function taskMatchesFilters(task) {
    if (state.status !== "all" && task.status !== state.status) return false;
    if (state.priority !== "all" && task.priority !== state.priority) return false;

    const query = state.query.trim().toLowerCase();
    if (query && !`${task.title} ${task.description}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  }

  function getVisibleTasks() {
    return state.tasks
      .filter(taskMatchesFilters)
      .sort(SORTERS[state.sort] || SORTERS.newest);
  }

  function clearFilterState() {
    state.status = "all";
    state.priority = "all";
    state.query = "";
    els.priorityFilter.value = "all";
    els.search.value = "";
  }

  /* ----------------------------- Rendering ------------------------- */

  function renderStats() {
    const total = state.tasks.length;
    const counts = { todo: 0, progress: 0, done: 0 };
    state.tasks.forEach((task) => {
      counts[task.status] += 1;
    });

    const percent = total ? Math.round((counts.done / total) * 100) : 0;

    els.statTotal.textContent = total;
    els.statTodo.textContent = counts.todo;
    els.statProgress.textContent = counts.progress;
    els.statPercent.textContent = `${percent}%`;
    els.statCaption.textContent = `${counts.done} of ${total} task${total === 1 ? "" : "s"} done`;
    els.progressBar.style.width = `${percent}%`;
    els.progressTrack.setAttribute("aria-valuenow", String(percent));

    return counts;
  }

  function renderTabs(counts) {
    const totals = { all: state.tasks.length, ...counts };

    els.tabs.forEach((tab) => {
      const status = tab.dataset.status;
      tab.setAttribute("aria-pressed", String(status === state.status));
    });

    els.counts.forEach((chip) => {
      const key = chip.dataset.count;
      chip.textContent = totals[key] ?? 0;
    });
  }

  function dueMeta(task) {
    const dueDate = parseDate(task.due);
    if (!dueDate) return null;

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due - startOfToday()) / 86400000);
    const formatted = formatDate(dueDate);

    let label = `Due ${formatted}`;
    let className = "";

    if (task.status !== "done") {
      if (diff < 0) {
        label = `Overdue · ${formatted}`;
        className = "due-overdue";
      } else if (diff === 0) {
        label = "Due today";
        className = "due-soon";
      } else if (diff === 1) {
        label = "Due tomorrow";
        className = "due-soon";
      }
    }

    return { label, className };
  }

  function renderTask(task) {
    const isDone = task.status === "done";
    const due = dueMeta(task);
    const fullTitle = esc(task.title);

    return `
      <li class="task${isDone ? " is-done" : ""}" data-id="${esc(task.id)}">
        <button
          class="task-check"
          type="button"
          data-action="toggle"
          aria-pressed="${isDone}"
          aria-label="${isDone ? "Mark as not completed" : "Mark as completed"}: ${fullTitle}"
        >
          ${icon("check")}
        </button>

        <div class="task-main">
          <div class="task-top">
            <h3 class="task-title">
              <button class="title-btn" type="button" data-action="edit">${fullTitle}</button>
            </h3>
            <span class="badge status-${task.status}">${STATUS_LABELS[task.status]}</span>
            <span class="badge priority-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
          </div>
          ${task.description ? `<p class="task-desc">${esc(task.description)}</p>` : ""}
          <div class="task-meta">
            ${due ? `<span class="meta ${due.className}">${icon("calendar")}${due.label}</span>` : ""}
            <span class="meta">${icon("clock")}Created ${formatDate(task.createdAt)}</span>
          </div>
        </div>

        <div class="task-actions">
          <button class="icon-btn edit" type="button" data-action="edit" aria-label="Edit task: ${fullTitle}" title="Edit task">
            ${icon("edit")}
          </button>
          <button class="icon-btn delete" type="button" data-action="delete" aria-label="Delete task: ${fullTitle}" title="Delete task">
            ${icon("trash")}
          </button>
        </div>
      </li>
    `;
  }

  const EMPTY_ART = `
    <svg class="empty-art" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="var(--primary-soft)"/>
      <rect x="35" y="30" width="50" height="62" rx="11" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="2"/>
      <rect x="49" y="24" width="22" height="12" rx="4" fill="var(--primary)"/>
      <path d="M47 61l8 8 17-17" stroke="var(--primary)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="46" y1="78" x2="74" y2="78" stroke="var(--border-strong)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  function renderEmpty() {
    const hasAnyTask = state.tasks.length > 0;

    if (hasAnyTask) {
      els.emptyState.innerHTML = `
        ${EMPTY_ART}
        <h3>No tasks match your filters</h3>
        <p>Try a different search term, or clear the filters to see everything again.</p>
        <button class="btn btn-ghost" type="button" data-action="reset">Clear filters</button>
      `;
    } else {
      els.emptyState.innerHTML = `
        ${EMPTY_ART}
        <h3>Your workspace is clear</h3>
        <p>Add your first task and give your day a little structure.</p>
        <button class="btn btn-primary" type="button" data-action="new">
          ${icon("plus")}
          <span>Create a task</span>
        </button>
      `;
    }
  }

  function renderList() {
    const visible = getVisibleTasks();
    els.taskList.innerHTML = visible.map(renderTask).join("");

    const isEmpty = visible.length === 0;
    els.emptyState.hidden = !isEmpty;
    if (isEmpty) renderEmpty();

    els.resultsSummary.textContent = isEmpty
      ? "No tasks to show."
      : `${visible.length} task${visible.length === 1 ? "" : "s"} shown.`;
  }

  function render() {
    const counts = renderStats();
    renderTabs(counts);
    renderList();
  }

  /* ----------------------------- Toasts ---------------------------- */

  function showToast(message, options = {}) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");

    const iconClass = options.tone === "danger" ? "toast-icon danger" : "toast-icon";
    toast.innerHTML = `
      <span class="${iconClass}">${icon(options.icon || "check-circle")}</span>
      <p class="toast-message">${esc(message)}</p>
    `;

    if (options.actionLabel && typeof options.onAction === "function") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "toast-action";
      action.textContent = options.actionLabel;
      action.addEventListener("click", () => {
        options.onAction();
        dismiss();
      });
      toast.appendChild(action);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "Dismiss notification");
    close.innerHTML = icon("x");
    close.addEventListener("click", () => dismiss());
    toast.appendChild(close);

    while (els.toastStack.children.length >= 3) {
      els.toastStack.firstElementChild.remove();
    }

    els.toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));

    let timer = window.setTimeout(dismiss, options.duration || 5000);

    toast.addEventListener("mouseenter", () => window.clearTimeout(timer));
    toast.addEventListener("mouseleave", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(dismiss, 2200);
    });

    function dismiss() {
      window.clearTimeout(timer);
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }
  }

  /* ----------------------------- Actions --------------------------- */

  function toggleTask(id) {
    const task = findTask(id);
    if (!task) return;

    task.status = task.status === "done" ? "todo" : "done";
    saveTasks();
    render();
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex((task) => task.id === id);
    if (index === -1) return;

    const [removed] = state.tasks.splice(index, 1);
    saveTasks();
    render();

    showToast(`“${truncate(removed.title)}” deleted`, {
      icon: "trash",
      tone: "danger",
      actionLabel: "Undo",
      duration: 6000,
      onAction: () => {
        state.tasks.splice(Math.min(index, state.tasks.length), 0, removed);
        saveTasks();
        render();
        showToast("Task restored");
      },
    });
  }

  /* ------------------------------ Modal ---------------------------- */

  function clearTitleError() {
    els.titleError.hidden = true;
    els.titleInput.removeAttribute("aria-invalid");
    els.titleInput.removeAttribute("aria-describedby");
  }

  function updateDescCount() {
    els.descCount.textContent = `${els.descInput.value.length} / 240`;
  }

  function openModal(task = null) {
    lastFocused = document.activeElement;

    state.editingId = task ? task.id : null;
    els.form.reset();

    els.titleInput.value = task ? task.title : "";
    els.descInput.value = task ? task.description : "";
    els.statusInput.value = task ? task.status : "todo";
    els.priorityInput.value = task ? task.priority : "medium";
    els.dueInput.value = task ? task.due : "";

    els.modalEyebrow.textContent = task ? "Update details" : "Plan your next move";
    els.modalTitle.textContent = task ? "Edit task" : "New task";
    els.submitTask.textContent = task ? "Save changes" : "Create task";

    clearTitleError();
    updateDescCount();

    els.modalBackdrop.hidden = false;
    document.body.classList.add("no-scroll");

    window.requestAnimationFrame(() => els.titleInput.focus());
  }

  function closeModal() {
    if (els.modalBackdrop.hidden) return;

    els.modalBackdrop.hidden = true;
    document.body.classList.remove("no-scroll");
    state.editingId = null;

    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const title = els.titleInput.value.trim();
    if (!title) {
      els.titleError.hidden = false;
      els.titleInput.setAttribute("aria-invalid", "true");
      els.titleInput.setAttribute("aria-describedby", "titleError");
      els.titleInput.focus();
      return;
    }

    const payload = {
      title,
      description: els.descInput.value.trim(),
      status: els.statusInput.value,
      priority: els.priorityInput.value,
      due: els.dueInput.value || "",
    };

    const isEditing = Boolean(state.editingId);

    if (isEditing) {
      const task = findTask(state.editingId);
      if (task) Object.assign(task, payload);
      if (task && !taskMatchesFilters(task)) clearFilterState();
    } else {
      const created = {
        id: uid(),
        createdAt: new Date().toISOString(),
        ...payload,
      };
      state.tasks.unshift(created);
      if (!taskMatchesFilters(created)) clearFilterState();
    }

    saveTasks();
    closeModal();
    render();

    showToast(isEditing ? "Task updated" : "Task created", {
      icon: isEditing ? "edit" : "check-circle",
    });
  }

  /* ------------------------------ Events --------------------------- */

  function bindEvents() {
    els.openAddTask.addEventListener("click", () => openModal());
    els.themeToggle.addEventListener("click", toggleTheme);

    els.form.addEventListener("submit", handleSubmit);

    els.titleInput.addEventListener("input", () => {
      if (!els.titleInput.value.trim()) return;
      clearTitleError();
    });

    els.descInput.addEventListener("input", updateDescCount);

    $$("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    els.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === els.modalBackdrop) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      const modalOpen = !els.modalBackdrop.hidden;

      if (event.key === "Escape" && modalOpen) {
        closeModal();
        return;
      }

      if (!modalOpen && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        els.search.focus();
        els.search.select();
        return;
      }

      const tag = event.target.tagName;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target.isContentEditable;

      if (!modalOpen && event.key === "/" && !typing) {
        event.preventDefault();
        els.search.focus();
      }
    });

    els.modalBackdrop.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;

      const focusable = $$(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        els.modal
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    els.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        state.status = tab.dataset.status;
        renderTabs(renderStats());
        renderList();
      });
    });

    els.priorityFilter.addEventListener("change", () => {
      state.priority = els.priorityFilter.value;
      renderList();
    });

    els.sortSelect.addEventListener("change", () => {
      state.sort = els.sortSelect.value;
      renderList();
    });

    let searchTimer = null;
    els.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        state.query = els.search.value;
        renderList();
      }, 90);
    });

    els.taskList.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) return;

      const item = trigger.closest(".task");
      if (!item) return;

      const { action } = trigger.dataset;
      const id = item.dataset.id;

      if (action === "toggle") toggleTask(id);
      else if (action === "edit") openModal(findTask(id));
      else if (action === "delete") deleteTask(id);
    });

    els.emptyState.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) return;

      if (trigger.dataset.action === "new") {
        openModal();
      } else if (trigger.dataset.action === "reset") {
        clearFilterState();
        render();
      }
    });
  }

  /* ------------------------------- Init ---------------------------- */

  function setToday() {
    els.todayLabel.textContent = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }

  function setShortcutHint() {
    const isMac = /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
    if (isMac) {
      const hint = $(".search kbd");
      if (hint) hint.textContent = "⌘K";
    }
  }

  function init() {
    initTheme();
    setToday();
    setShortcutHint();

    state.tasks = loadTasks();
    bindEvents();
    render();
    saveTasks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
