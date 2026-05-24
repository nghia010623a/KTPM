"use strict";

const ROLES = ["PROJECT_MANAGER", "DEVELOPER", "TESTER", "BA", "GUEST"];

const ALL_PERMISSIONS = [
  "dashboard:view",
  "project:view",
  "project:create",
  "project:update",
  "project:delete",
  "project:assign",
  "project:budget:view",
  "project:budget:edit",
  "task:view",
  "task:create",
  "task:update",
  "task:update:self",
  "task:update:requirement",
  "task:test:update",
  "task:delete",
  "task:assign",
  "task:status:update",
  "task:progress:update",
  "task:complete",
  "resource:view",
  "resource:create",
  "resource:update",
  "resource:delete",
  "resource:finance:view",
  "resource:finance:edit",
  "report:view",
  "report:progress:view",
  "report:resource:view",
  "report:quality:view",
  "report:finance:view",
  "report:export",
  "notification:view",
  "notification:update",
  "access:view",
  "settings:view",
];

const ROLE_PERMISSIONS = Object.freeze({
  PROJECT_MANAGER: new Set(ALL_PERMISSIONS),
  DEVELOPER: new Set([
    "dashboard:view",
    "project:view",
    "task:view",
    "task:create",
    "task:update:self",
    "task:status:update",
    "task:progress:update",
    "task:complete",
    "resource:view",
    "report:view",
    "report:progress:view",
    "notification:view",
    "notification:update",
    "access:view",
    "settings:view",
  ]),
  TESTER: new Set([
    "dashboard:view",
    "project:view",
    "task:view",
    "task:create",
    "task:update:self",
    "task:test:update",
    "task:status:update",
    "task:progress:update",
    "task:complete",
    "resource:view",
    "report:view",
    "report:progress:view",
    "report:quality:view",
    "notification:view",
    "notification:update",
    "access:view",
    "settings:view",
  ]),
  BA: new Set([
    "dashboard:view",
    "project:view",
    "task:view",
    "task:create",
    "task:update:requirement",
    "task:status:update",
    "task:progress:update",
    "resource:view",
    "report:view",
    "report:progress:view",
    "report:resource:view",
    "notification:view",
    "notification:update",
    "access:view",
    "settings:view",
  ]),
  GUEST: new Set([
    "dashboard:view",
    "project:view",
    "task:view",
    "notification:view",
    "access:view",
    "settings:view",
  ]),
});

const TASK_TYPES_BY_ROLE = Object.freeze({
  PROJECT_MANAGER: ["TASK", "BUG", "TEST_CASE", "REQUIREMENT", "RESEARCH"],
  DEVELOPER: ["TASK", "BUG"],
  TESTER: ["BUG", "TEST_CASE"],
  BA: ["REQUIREMENT", "TASK"],
  GUEST: [],
});

const VIEW_META = Object.freeze({
  dashboard: { title: "Tong quan", permission: "dashboard:view" },
  projects: { title: "Du an", permission: "project:view" },
  tasks: { title: "Cong viec", permission: "task:view" },
  resources: { title: "Tai nguyen", permission: "resource:view" },
  reports: { title: "Bao cao", permission: "report:view" },
  notifications: { title: "Thong bao", permission: "notification:view" },
  access: { title: "Phan quyen", permission: "access:view" },
  settings: { title: "Cau hinh", permission: "settings:view" },
});

const DEFAULT_CONFIG = Object.freeze({
  apiBaseUrl: "https://manufacturers-experienced-chances-dolls.trycloudflare.com/api",
wsUrl: "wss://manufacturers-experienced-chances-dolls.trycloudflare.com/ws/notifications",  wsMode: "stomp",
});

const ENDPOINTS = Object.freeze({
  login: "/auth/login",
  me: "/auth/me",
  users: "/users",
  projects: "/projects",
  tasks: "/tasks",
  resources: "/resources",
  notifications: "/notifications",
  reportSummary: "/reports/summary",
});

const REPORT_PERMISSIONS = [
  ["report:progress:view", "Tien do"],
  ["report:resource:view", "Tai nguyen"],
  ["report:quality:view", "Chat luong"],
  ["report:finance:view", "Chi phi"],
];

const PERMISSION_GROUPS = [
  {
    group: "Du an",
    items: [
      ["project:view", "Xem"],
      ["project:create", "Tao"],
      ["project:update", "Sua"],
      ["project:delete", "Xoa"],
      ["project:assign", "Gan thanh vien"],
      ["project:budget:view", "Xem ngan sach"],
      ["project:budget:edit", "Sua ngan sach"],
    ],
  },
  {
    group: "Cong viec",
    items: [
      ["task:view", "Xem"],
      ["task:create", "Tao"],
      ["task:update", "Sua tat ca"],
      ["task:update:self", "Sua viec cua minh"],
      ["task:update:requirement", "Sua requirement"],
      ["task:test:update", "Sua bug/test"],
      ["task:assign", "Gan nguoi lam"],
      ["task:delete", "Xoa"],
      ["task:complete", "Hoan thanh"],
    ],
  },
  {
    group: "Tai nguyen",
    items: [
      ["resource:view", "Xem"],
      ["resource:create", "Tao"],
      ["resource:update", "Sua"],
      ["resource:delete", "Xoa"],
      ["resource:finance:view", "Xem chi phi"],
      ["resource:finance:edit", "Sua chi phi"],
    ],
  },
  {
    group: "Bao cao",
    items: REPORT_PERMISSIONS.concat([["report:export", "Export"]]),
  },
  {
    group: "Thong bao",
    items: [
      ["notification:view", "Xem"],
      ["notification:update", "Danh dau doc"],
    ],
  },
];

const state = {
  config: { ...DEFAULT_CONFIG },
  token: "",
  claims: null,
  role: "GUEST",
  user: null,
  projects: [],
  tasks: [],
  resources: [],
  notifications: [],
  users: [],
  report: null,
  activeView: "dashboard",
  activeDialogSubmit: null,
  socket: null,
  stompClient: null,
};

const dom = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  bindEvents();
  loadConfig();
  syncConfigInputs();
  loadStoredToken();

  if (state.token) {
    bootApp();
  } else {
    showAuth();
  }

  refreshIcons();
}

function cacheDom() {
  dom.authScreen = document.getElementById("authScreen");
  dom.appShell = document.getElementById("appShell");
  dom.loginForm = document.getElementById("loginForm");
  dom.tokenForm = document.getElementById("tokenForm");
  dom.tokenInput = document.getElementById("tokenInput");
  dom.apiBaseInput = document.getElementById("apiBaseInput");
  dom.settingsForm = document.getElementById("settingsForm");
  dom.settingsApiBase = document.getElementById("settingsApiBase");
  dom.settingsWsUrl = document.getElementById("settingsWsUrl");
  dom.settingsWsMode = document.getElementById("settingsWsMode");
  dom.pageTitle = document.getElementById("pageTitle");
  dom.activeApiLabel = document.getElementById("activeApiLabel");
  dom.roleBadge = document.getElementById("roleBadge");
  dom.userBadge = document.getElementById("userBadge");
  dom.socketStatus = document.getElementById("socketStatus");
  dom.refreshBtn = document.getElementById("refreshBtn");
  dom.logoutBtn = document.getElementById("logoutBtn");
  dom.summaryCards = document.getElementById("summaryCards");
  dom.projectProgressList = document.getElementById("projectProgressList");
  dom.deadlineList = document.getElementById("deadlineList");
  dom.projectsTable = document.getElementById("projectsTable");
  dom.projectSearch = document.getElementById("projectSearch");
  dom.projectStatusFilter = document.getElementById("projectStatusFilter");
  dom.newProjectBtn = document.getElementById("newProjectBtn");
  dom.taskProjectFilter = document.getElementById("taskProjectFilter");
  dom.taskStatusFilter = document.getElementById("taskStatusFilter");
  dom.newTaskBtn = document.getElementById("newTaskBtn");
  dom.taskBoard = document.getElementById("taskBoard");
  dom.resourceProjectFilter = document.getElementById("resourceProjectFilter");
  dom.resourceTypeFilter = document.getElementById("resourceTypeFilter");
  dom.newResourceBtn = document.getElementById("newResourceBtn");
  dom.resourceCards = document.getElementById("resourceCards");
  dom.resourcesTable = document.getElementById("resourcesTable");
  dom.reportProjectFilter = document.getElementById("reportProjectFilter");
  dom.exportReportBtn = document.getElementById("exportReportBtn");
  dom.reportContent = document.getElementById("reportContent");
  dom.notificationFilter = document.getElementById("notificationFilter");
  dom.markAllReadBtn = document.getElementById("markAllReadBtn");
  dom.notificationList = document.getElementById("notificationList");
  dom.accessMatrix = document.getElementById("accessMatrix");
  dom.endpointTable = document.getElementById("endpointTable");
  dom.entityDialog = document.getElementById("entityDialog");
  dom.dialogForm = document.getElementById("dialogForm");
  dom.dialogTitle = document.getElementById("dialogTitle");
  dom.dialogBody = document.getElementById("dialogBody");
  dom.closeDialogBtn = document.getElementById("closeDialogBtn");
  dom.cancelDialogBtn = document.getElementById("cancelDialogBtn");
  dom.toastHost = document.getElementById("toastHost");
}

function bindEvents() {
  dom.loginForm.addEventListener("submit", handleLogin);
  dom.tokenForm.addEventListener("submit", handleTokenLogin);
  dom.settingsForm.addEventListener("submit", handleSettingsSave);
  dom.refreshBtn.addEventListener("click", refreshAll);
  dom.logoutBtn.addEventListener("click", logout);
  dom.newProjectBtn.addEventListener("click", () => openProjectDialog());
  dom.newTaskBtn.addEventListener("click", () => openTaskDialog());
  dom.newResourceBtn.addEventListener("click", () => openResourceDialog());
  dom.exportReportBtn.addEventListener("click", exportReportCsv);
  dom.markAllReadBtn.addEventListener("click", markAllNotificationsRead);
  dom.projectSearch.addEventListener("input", renderProjects);
  dom.projectStatusFilter.addEventListener("change", renderProjects);
  dom.taskProjectFilter.addEventListener("change", renderTasks);
  dom.taskStatusFilter.addEventListener("change", renderTasks);
  dom.resourceProjectFilter.addEventListener("change", renderResources);
  dom.resourceTypeFilter.addEventListener("change", renderResources);
  dom.reportProjectFilter.addEventListener("change", renderReports);
  dom.notificationFilter.addEventListener("change", renderNotifications);
  dom.closeDialogBtn.addEventListener("click", closeDialog);
  dom.cancelDialogBtn.addEventListener("click", closeDialog);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.view));
  });

  document.addEventListener("click", handleActionClick);

  dom.dialogForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.activeDialogSubmit) {
      closeDialog();
      return;
    }

    const submitButton = dom.dialogForm.querySelector("button[type='submit']");
    setBusy(submitButton, true);
    try {
      await state.activeDialogSubmit(new FormData(dom.dialogForm));
      closeDialog();
      await refreshAll();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(submitButton, false);
    }
  });
}

function loadConfig() {
  const raw = localStorage.getItem("pms.config");
  if (!raw) return;

  try {
    state.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    state.config = { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  localStorage.setItem("pms.config", JSON.stringify(state.config));
  syncConfigInputs();
}

function syncConfigInputs() {
  dom.apiBaseInput.value = state.config.apiBaseUrl;
  dom.settingsApiBase.value = state.config.apiBaseUrl;
  dom.settingsWsUrl.value = state.config.wsUrl;
  dom.settingsWsMode.value = state.config.wsMode;
  dom.activeApiLabel.textContent = state.config.apiBaseUrl;
}

function loadStoredToken() {
  const token = localStorage.getItem("pms.jwt");
  if (!token) return;

  try {
    setToken(token);
  } catch {
    localStorage.removeItem("pms.jwt");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(dom.loginForm);
  state.config.apiBaseUrl = String(form.get("apiBaseUrl") || "").trim();
  saveConfig();

  const submitButton = dom.loginForm.querySelector("button[type='submit']");
  setBusy(submitButton, true);
  try {
    const result = await apiFetch(ENDPOINTS.login, {
      method: "POST",
      body: {
        username: String(form.get("username") || "").trim(),
        password: String(form.get("password") || ""),
      },
      skipAuth: true,
    });
    const token = extractTokenFromLogin(result);
    if (!token) throw new Error("Login response khong co access token.");
    setToken(token);
    localStorage.setItem("pms.jwt", token);
    await bootApp();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(submitButton, false);
  }
}

async function handleTokenLogin(event) {
  event.preventDefault();
  const token = dom.tokenInput.value.trim();
  if (!token) {
    toast("Can nhap JWT.");
    return;
  }

  state.config.apiBaseUrl = dom.apiBaseInput.value.trim() || DEFAULT_CONFIG.apiBaseUrl;
  saveConfig();

  try {
    setToken(token);
    localStorage.setItem("pms.jwt", token);
    await bootApp();
  } catch (error) {
    showError(error);
  }
}

function handleSettingsSave(event) {
  event.preventDefault();
  state.config = {
    apiBaseUrl: dom.settingsApiBase.value.trim() || DEFAULT_CONFIG.apiBaseUrl,
    wsUrl: dom.settingsWsUrl.value.trim() || DEFAULT_CONFIG.wsUrl,
    wsMode: dom.settingsWsMode.value,
  };
  saveConfig();
  connectNotificationSocket();
  toast("Da luu cau hinh.");
}

function setToken(token) {
  const claims = decodeJwt(token);
  if (isTokenExpired(claims)) {
    throw new Error("JWT da het han.");
  }

  const role = extractRole(claims);
  if (!role) {
    throw new Error("JWT khong co role hop le: PROJECT_MANAGER, DEVELOPER, TESTER, BA, GUEST.");
  }

  state.token = token;
  state.claims = claims;
  state.role = role;
  state.user = normalizeUser(claims);
}

async function bootApp() {
  showApp();
  renderShell();
  await refreshAll();
  connectNotificationSocket();
}

function showAuth() {
  dom.authScreen.hidden = false;
  dom.appShell.hidden = true;
}

function showApp() {
  dom.authScreen.hidden = true;
  dom.appShell.hidden = false;
}

function logout() {
  closeSocket();
  state.token = "";
  state.claims = null;
  state.role = "GUEST";
  state.user = null;
  state.projects = [];
  state.tasks = [];
  state.resources = [];
  state.notifications = [];
  state.users = [];
  localStorage.removeItem("pms.jwt");
  showAuth();
  refreshIcons();
}

async function refreshAll() {
  if (!state.token) return;

  setBusy(dom.refreshBtn, true);
  const loaders = [
    ["projects", loadProjects],
    ["tasks", loadTasks],
    ["notifications", loadNotifications],
    ["users", loadUsers],
  ];

  if (can("resource:view")) loaders.push(["resources", loadResources]);
  if (can("report:view")) loaders.push(["report", loadReportSummary]);

  const results = await Promise.allSettled(loaders.map(([, loader]) => loader()));
  const failed = results
    .map((result, index) => (result.status === "rejected" ? loaders[index][0] : null))
    .filter(Boolean);

  if (failed.length) {
    toast(`Khong tai duoc: ${failed.join(", ")}.`);
  }

  renderShell();
  renderAll();
  setBusy(dom.refreshBtn, false);
}

async function loadProjects() {
  if (!can("project:view")) {
    state.projects = [];
    return;
  }

  const raw = await apiFetch(ENDPOINTS.projects);
  state.projects = normalizeList(raw).map(normalizeProject);
}

async function loadTasks() {
  if (!can("task:view")) {
    state.tasks = [];
    return;
  }

  const raw = await apiFetch(ENDPOINTS.tasks);
  state.tasks = normalizeList(raw).map(normalizeTask);
}

async function loadResources() {
  if (!can("resource:view")) {
    state.resources = [];
    return;
  }

  const raw = await apiFetch(ENDPOINTS.resources);
  state.resources = normalizeList(raw).map(normalizeResource);
}

async function loadNotifications() {
  if (!can("notification:view")) {
    state.notifications = [];
    return;
  }

  const raw = await apiFetch(ENDPOINTS.notifications);
  state.notifications = normalizeList(raw).map(normalizeNotification);
}

async function loadUsers() {
  if (!canAny(["project:assign", "task:assign", "task:create"])) {
    state.users = [];
    return;
  }

  try {
    const raw = await apiFetch(ENDPOINTS.users);
    state.users = normalizeList(raw).map(normalizeUserRecord);
  } catch {
    state.users = [];
  }
}

async function loadReportSummary() {
  if (!can("report:view")) {
    state.report = null;
    return;
  }

  try {
    state.report = await apiFetch(ENDPOINTS.reportSummary);
  } catch {
    state.report = null;
  }
}

function renderShell() {
  dom.roleBadge.textContent = state.role;
  dom.userBadge.textContent = state.user?.name || state.user?.id || state.role;
  dom.activeApiLabel.textContent = state.config.apiBaseUrl;
  syncConfigInputs();
  applyAccessControls(document);
  navigate(state.activeView, { silent: true });
  refreshIcons();
}

function renderAll() {
  renderProjectSelects();
  renderDashboard();
  renderProjects();
  renderTasks();
  renderResources();
  renderReports();
  renderNotifications();
  renderAccessMatrix();
  renderEndpointTable();
  applyAccessControls(document);
  refreshIcons();
}

function navigate(view, options = {}) {
  const meta = VIEW_META[view] || VIEW_META.dashboard;
  if (!can(meta.permission)) {
    if (!options.silent) toast("Ban khong co quyen truy cap muc nay.");
    view = "dashboard";
  }

  state.activeView = view;
  const activeMeta = VIEW_META[view];
  dom.pageTitle.textContent = activeMeta.title;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.viewPanel === view);
  });
}

function renderDashboard() {
  if (!can("dashboard:view")) return;

  const activeProjects = state.projects.filter((project) => project.status === "ACTIVE").length;
  const doneTasks = state.tasks.filter((task) => task.status === "DONE").length;
  const overdueTasks = state.tasks.filter((task) => isOverdue(task.dueDate) && task.status !== "DONE").length;
  const progress = state.tasks.length ? Math.round((doneTasks / state.tasks.length) * 100) : 0;
  const resourceUsage = calculateResourceUsage(state.resources);
  const budget = calculateBudget();

  const cards = [
    ["Du an", state.projects.length, `${activeProjects} dang chay`],
    ["Cong viec", state.tasks.length, `${progress}% hoan thanh`],
    ["Qua han", overdueTasks, "deadline tre"],
    can("report:finance:view")
      ? ["Chi phi", formatMoney(budget.spent), `${formatMoney(budget.budget)} ngan sach`]
      : ["Tai nguyen", `${resourceUsage}%`, "muc su dung"],
  ];

  dom.summaryCards.innerHTML = cards
    .map(
      ([label, value, sub]) => `
        <article class="metric-card">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(String(value))}</strong>
          <span>${escapeHtml(sub)}</span>
        </article>
      `,
    )
    .join("");

  const progressItems = state.projects.slice(0, 8).map((project) => {
    const percent = clamp(project.progress || calculateProjectProgress(project.id), 0, 100);
    return `
      <div class="progress-item">
        <div class="progress-meta">
          <span>${escapeHtml(project.name)}</span>
          <span>${percent}%</span>
        </div>
        <div class="progress-line"><span style="width:${percent}%"></span></div>
      </div>
    `;
  });
  dom.projectProgressList.innerHTML = progressItems.length
    ? progressItems.join("")
    : emptyState("Chua co du an.");

  const upcoming = state.tasks
    .filter((task) => task.status !== "DONE" && isUpcoming(task.dueDate, 7))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 8);

  dom.deadlineList.innerHTML = upcoming.length
    ? upcoming
        .map(
          (task) => `
            <article class="compact-item">
              <strong>${escapeHtml(task.title)}</strong>
              <small>${escapeHtml(projectName(task.projectId))} - ${formatDate(task.dueDate)}</small>
            </article>
          `,
        )
        .join("")
    : emptyState("Khong co deadline gan.");
}

function renderProjects() {
  if (!can("project:view")) return;

  const query = dom.projectSearch.value.trim().toLowerCase();
  const status = dom.projectStatusFilter.value;
  const projects = state.projects.filter((project) => {
    const matchesSearch = !query || `${project.name} ${project.code}`.toLowerCase().includes(query);
    const matchesStatus = status === "ALL" || project.status === status;
    return matchesSearch && matchesStatus;
  });

  const showBudget = can("project:budget:view");
  const budgetHeaders = showBudget ? "<th>Ngan sach</th><th>Da dung</th>" : "";
  const budgetCells = (project) =>
    showBudget ? `<td class="money">${formatMoney(project.budget)}</td><td class="money">${formatMoney(project.spent)}</td>` : "";

  dom.projectsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ma</th>
          <th>Du an</th>
          <th>Trang thai</th>
          <th>Tien do</th>
          <th>Bat dau</th>
          <th>Ket thuc</th>
          ${budgetHeaders}
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${
          projects.length
            ? projects
                .map(
                  (project) => `
                    <tr>
                      <td>${escapeHtml(project.code || project.id)}</td>
                      <td>
                        <strong>${escapeHtml(project.name)}</strong><br />
                        <small>${escapeHtml(project.description || "")}</small>
                      </td>
                      <td>${statusBadge(project.status)}</td>
                      <td>${renderMiniProgress(project.progress || calculateProjectProgress(project.id))}</td>
                      <td>${formatDate(project.startDate)}</td>
                      <td>${formatDate(project.endDate)}</td>
                      ${budgetCells(project)}
                      <td>
                        <div class="row-actions">
                          ${
                            can("project:update")
                              ? actionButton("edit-project", project.id, "pencil", "Sua")
                              : ""
                          }
                          ${
                            can("project:delete")
                              ? actionButton("delete-project", project.id, "trash-2", "Xoa", "danger")
                              : ""
                          }
                        </div>
                      </td>
                    </tr>
                  `,
                )
                .join("")
            : `<tr><td colspan="${showBudget ? 9 : 7}">${emptyState("Khong co du an phu hop.")}</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function renderTasks() {
  if (!can("task:view")) return;

  const projectId = dom.taskProjectFilter.value || "ALL";
  const status = dom.taskStatusFilter.value || "ALL";
  const statuses = ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"];
  const tasks = state.tasks.filter((task) => {
    const matchesProject = projectId === "ALL" || String(task.projectId) === projectId;
    const matchesStatus = status === "ALL" || task.status === status;
    return matchesProject && matchesStatus;
  });

  dom.taskBoard.innerHTML = statuses
    .map((columnStatus) => {
      const columnTasks = tasks.filter((task) => task.status === columnStatus);
      return `
        <section class="task-column">
          <h3>
            <span>${escapeHtml(columnStatus)}</span>
            <span class="badge muted">${columnTasks.length}</span>
          </h3>
          ${
            columnTasks.length
              ? columnTasks.map(renderTaskCard).join("")
              : `<div class="empty-state">Trong</div>`
          }
        </section>
      `;
    })
    .join("");
}

function renderTaskCard(task) {
  const editable = canEditTask(task);
  const canCompleteTask = can("task:complete") && task.status !== "DONE" && editable;
  const overdue = isOverdue(task.dueDate) && task.status !== "DONE";

  return `
    <article class="task-card">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <div class="task-meta">
          ${statusBadge(task.priority, "muted")}
          ${statusBadge(task.type, "muted")}
          ${overdue ? statusBadge("OVERDUE", "danger") : ""}
        </div>
      </div>
      <div class="progress-line"><span style="width:${clamp(task.progress, 0, 100)}%"></span></div>
      <small>${escapeHtml(projectName(task.projectId))} - ${formatDate(task.dueDate)}</small>
      <small>${escapeHtml(task.assigneeName || userName(task.assigneeId) || "Unassigned")}</small>
      <div class="row-actions">
        ${editable ? actionButton("edit-task", task.id, "pencil", "Sua") : ""}
        ${canCompleteTask ? actionButton("complete-task", task.id, "check", "Hoan thanh") : ""}
        ${can("task:delete") ? actionButton("delete-task", task.id, "trash-2", "Xoa", "danger") : ""}
      </div>
    </article>
  `;
}

function renderResources() {
  if (!can("resource:view")) return;

  const projectId = dom.resourceProjectFilter.value || "ALL";
  const type = dom.resourceTypeFilter.value || "ALL";
  const resources = state.resources.filter((resource) => {
    const matchesProject = projectId === "ALL" || String(resource.projectId) === projectId;
    const matchesType = type === "ALL" || resource.type === type;
    return matchesProject && matchesType;
  });

  const personnel = resources.filter((resource) => resource.type === "PERSONNEL").length;
  const equipment = resources.filter((resource) => resource.type === "EQUIPMENT").length;
  const usage = calculateResourceUsage(resources);
  const totalCost = resources.reduce((sum, resource) => sum + toNumber(resource.totalCost), 0);

  const cards = [
    ["Nhan su", personnel, "nguoi"],
    ["Thiet bi", equipment, "thiet bi"],
    ["Su dung", `${usage}%`, "allocated"],
    can("resource:finance:view") ? ["Chi phi", formatMoney(totalCost), "tong"] : ["Ngan sach", "An", "khong co quyen"],
  ];

  dom.resourceCards.innerHTML = cards
    .map(
      ([label, value, sub]) => `
        <article class="metric-card">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(String(value))}</strong>
          <span>${escapeHtml(sub)}</span>
        </article>
      `,
    )
    .join("");

  const showFinance = can("resource:finance:view");
  const financeHeaders = showFinance ? "<th>Don gia</th><th>Tong chi phi</th>" : "";
  const financeCells = (resource) =>
    showFinance
      ? `<td class="money">${formatMoney(resource.unitCost)}</td><td class="money">${formatMoney(resource.totalCost)}</td>`
      : "";

  dom.resourcesTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Loai</th>
          <th>Ten</th>
          <th>Du an</th>
          <th>Cap phat</th>
          <th>Da dung</th>
          <th>Trang thai</th>
          ${financeHeaders}
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${
          resources.length
            ? resources
                .map(
                  (resource) => `
                    <tr>
                      <td>${statusBadge(resource.type, "muted")}</td>
                      <td><strong>${escapeHtml(resource.name)}</strong></td>
                      <td>${escapeHtml(projectName(resource.projectId))}</td>
                      <td>${escapeHtml(String(resource.allocated))}</td>
                      <td>${escapeHtml(String(resource.used))}</td>
                      <td>${statusBadge(resource.status)}</td>
                      ${financeCells(resource)}
                      <td>
                        <div class="row-actions">
                          ${can("resource:update") ? actionButton("edit-resource", resource.id, "pencil", "Sua") : ""}
                          ${can("resource:delete") ? actionButton("delete-resource", resource.id, "trash-2", "Xoa", "danger") : ""}
                        </div>
                      </td>
                    </tr>
                  `,
                )
                .join("")
            : `<tr><td colspan="${showFinance ? 9 : 7}">${emptyState("Khong co tai nguyen phu hop.")}</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function renderReports() {
  if (!can("report:view")) return;

  const projectId = dom.reportProjectFilter.value || "ALL";
  const projects = state.projects.filter((project) => projectId === "ALL" || String(project.id) === projectId);
  const tasks = state.tasks.filter((task) => projectId === "ALL" || String(task.projectId) === projectId);
  const resources = state.resources.filter((resource) => projectId === "ALL" || String(resource.projectId) === projectId);
  const done = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const bugs = tasks.filter((task) => task.type === "BUG").length;
  const openBugs = tasks.filter((task) => task.type === "BUG" && task.status !== "DONE").length;
  const budget = calculateBudget(projects, resources);

  const panels = [];

  if (can("report:progress:view")) {
    panels.push(`
      <section class="panel">
        <div class="panel-head"><h3>Tien do</h3>${statusBadge(`${progress}%`, "ok")}</div>
        <div class="progress-line"><span style="width:${progress}%"></span></div>
        <div class="compact-list" style="margin-top:12px">
          ${projects
            .map(
              (project) => `
                <article class="compact-item">
                  <strong>${escapeHtml(project.name)}</strong>
                  <small>${calculateProjectProgress(project.id)}% - ${escapeHtml(project.status)}</small>
                </article>
              `,
            )
            .join("") || emptyState("Khong co du lieu.")}
        </div>
      </section>
    `);
  }

  if (can("report:resource:view")) {
    panels.push(`
      <section class="panel">
        <div class="panel-head"><h3>Tai nguyen</h3>${statusBadge(`${calculateResourceUsage(resources)}%`, "warn")}</div>
        <div class="compact-list">
          ${["PERSONNEL", "EQUIPMENT", "BUDGET"]
            .map((type) => {
              const list = resources.filter((resource) => resource.type === type);
              return `<article class="compact-item"><strong>${type}</strong><small>${list.length} muc</small></article>`;
            })
            .join("")}
        </div>
      </section>
    `);
  }

  if (can("report:quality:view")) {
    panels.push(`
      <section class="panel">
        <div class="panel-head"><h3>Chat luong</h3>${statusBadge(`${openBugs}/${bugs}`, openBugs ? "warn" : "ok")}</div>
        <div class="compact-list">
          <article class="compact-item"><strong>Bug dang mo</strong><small>${openBugs}</small></article>
          <article class="compact-item"><strong>Test case</strong><small>${tasks.filter((task) => task.type === "TEST_CASE").length}</small></article>
        </div>
      </section>
    `);
  }

  if (can("report:finance:view")) {
    panels.push(`
      <section class="panel">
        <div class="panel-head"><h3>Chi phi</h3>${statusBadge(formatMoney(budget.spent), "muted")}</div>
        <div class="compact-list">
          <article class="compact-item"><strong>Ngan sach</strong><small>${formatMoney(budget.budget)}</small></article>
          <article class="compact-item"><strong>Da dung</strong><small>${formatMoney(budget.spent)}</small></article>
          <article class="compact-item"><strong>Con lai</strong><small>${formatMoney(budget.budget - budget.spent)}</small></article>
        </div>
      </section>
    `);
  }

  dom.reportContent.innerHTML = panels.join("") || emptyState("Khong co quyen xem bao cao.");
}

function renderNotifications() {
  if (!can("notification:view")) return;

  const filter = dom.notificationFilter.value || "ALL";
  const notifications = state.notifications.filter((notification) => {
    if (filter === "UNREAD") return !notification.read;
    if (filter === "READ") return notification.read;
    return true;
  });

  dom.notificationList.innerHTML = notifications.length
    ? notifications
        .map(
          (notification) => `
            <article class="notification-item">
              <div class="panel-head">
                <div>
                  <strong>${escapeHtml(notification.title)}</strong>
                  <small>${escapeHtml(notification.message || "")}</small>
                </div>
                ${statusBadge(notification.read ? "READ" : "NEW", notification.read ? "muted" : "ok")}
              </div>
              <div class="panel-head" style="margin-bottom:0">
                <small>${formatDateTime(notification.createdAt)}</small>
                ${
                  can("notification:update") && !notification.read
                    ? `<button class="ghost-btn" type="button" data-action="read-notification" data-id="${escapeHtml(notification.id)}">Da doc</button>`
                    : ""
                }
              </div>
            </article>
          `,
        )
        .join("")
    : emptyState("Khong co thong bao.");
}

function renderAccessMatrix() {
  if (!can("access:view")) return;

  dom.accessMatrix.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nhom</th>
          <th>Quyen</th>
          ${ROLES.map((role) => `<th>${escapeHtml(role)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${PERMISSION_GROUPS.map((group) =>
          group.items
            .map(
              ([permission, label], index) => `
                <tr>
                  ${index === 0 ? `<td rowspan="${group.items.length}"><strong>${escapeHtml(group.group)}</strong></td>` : ""}
                  <td>${escapeHtml(label)}</td>
                  ${ROLES.map((role) => `<td>${ROLE_PERMISSIONS[role].has(permission) ? "OK" : "--"}</td>`).join("")}
                </tr>
              `,
            )
            .join(""),
        ).join("")}
      </tbody>
    </table>
  `;
}

function renderEndpointTable() {
  if (!can("settings:view")) return;

  const rows = [
    ["POST", "/auth/login", "Dang nhap, tra ve accessToken/token/jwt"],
    ["GET", "/projects", "Danh sach du an"],
    ["POST", "/projects", "Tao du an"],
    ["PUT", "/projects/{id}", "Sua du an"],
    ["DELETE", "/projects/{id}", "Xoa du an"],
    ["GET", "/tasks", "Danh sach cong viec"],
    ["POST", "/tasks", "Tao cong viec"],
    ["PUT", "/tasks/{id}", "Sua cong viec"],
    ["DELETE", "/tasks/{id}", "Xoa cong viec"],
    ["GET", "/resources", "Danh sach tai nguyen"],
    ["POST", "/resources", "Them tai nguyen"],
    ["GET", "/reports/summary", "Bao cao tong hop"],
    ["GET", "/notifications", "Thong bao"],
    ["PATCH", "/notifications/{id}/read", "Danh dau da doc"],
  ];

  dom.endpointTable.innerHTML = `
    <table>
      <thead><tr><th>Method</th><th>Path</th><th>UI</th></tr></thead>
      <tbody>
        ${rows
          .map(
            ([method, path, usage]) => `
              <tr>
                <td><strong>${method}</strong></td>
                <td><code>${escapeHtml(path)}</code></td>
                <td>${escapeHtml(usage)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderProjectSelects() {
  fillProjectSelect(dom.taskProjectFilter, "Tat ca du an");
  fillProjectSelect(dom.resourceProjectFilter, "Tat ca du an");
  fillProjectSelect(dom.reportProjectFilter, "Tat ca du an");
}

function fillProjectSelect(select, allLabel) {
  const current = select.value || "ALL";
  select.innerHTML = `
    <option value="ALL">${escapeHtml(allLabel)}</option>
    ${state.projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join("")}
  `;
  select.value = state.projects.some((project) => String(project.id) === current) ? current : "ALL";
}

async function handleActionClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  try {
    if (action === "edit-project") {
      const project = state.projects.find((item) => String(item.id) === String(id));
      openProjectDialog(project);
    }
    if (action === "delete-project") await deleteProject(id);
    if (action === "edit-task") {
      const task = state.tasks.find((item) => String(item.id) === String(id));
      openTaskDialog(task);
    }
    if (action === "complete-task") await completeTask(id);
    if (action === "delete-task") await deleteTask(id);
    if (action === "edit-resource") {
      const resource = state.resources.find((item) => String(item.id) === String(id));
      openResourceDialog(resource);
    }
    if (action === "delete-resource") await deleteResource(id);
    if (action === "read-notification") await markNotificationRead(id);
  } catch (error) {
    showError(error);
  }
}

function openProjectDialog(project = null) {
  guard(project ? "project:update" : "project:create");
  const canEditBudget = can("project:budget:edit");
  openDialog(project ? "Sua du an" : "Tao du an", projectForm(project, canEditBudget), async (form) => {
    const payload = {
      name: textValue(form, "name"),
      code: textValue(form, "code"),
      description: textValue(form, "description"),
      status: textValue(form, "status"),
      startDate: textValue(form, "startDate"),
      endDate: textValue(form, "endDate"),
      ownerId: textValue(form, "ownerId"),
    };

    if (canEditBudget) {
      payload.budget = numberValue(form, "budget");
    }

    if (project) {
      await apiFetch(`${ENDPOINTS.projects}/${encodeURIComponent(project.id)}`, { method: "PUT", body: payload });
      toast("Da sua du an.");
    } else {
      await apiFetch(ENDPOINTS.projects, { method: "POST", body: payload });
      toast("Da tao du an.");
    }
  });
}

function projectForm(project, canEditBudget) {
  const p = project || {};
  return `
    <div class="two-col">
      <label>Ten du an<input name="name" required value="${escapeHtml(p.name || "")}" /></label>
      <label>Ma du an<input name="code" value="${escapeHtml(p.code || "")}" /></label>
    </div>
    <label>Mo ta<textarea name="description">${escapeHtml(p.description || "")}</textarea></label>
    <div class="three-col">
      <label>Trang thai
        <select name="status">
          ${options(["PLANNING", "ACTIVE", "ON_HOLD", "DONE", "CANCELLED"], p.status || "PLANNING")}
        </select>
      </label>
      <label>Ngay bat dau<input name="startDate" type="date" value="${dateInputValue(p.startDate)}" /></label>
      <label>Ngay ket thuc<input name="endDate" type="date" value="${dateInputValue(p.endDate)}" /></label>
    </div>
    <div class="two-col">
      <label>Quan ly du an
        <select name="ownerId">
          <option value="">Chua gan</option>
          ${userOptions(p.ownerId)}
        </select>
      </label>
      ${
        canEditBudget
          ? `<label>Ngan sach<input name="budget" type="number" min="0" step="1000" value="${escapeHtml(p.budget ?? "")}" /></label>`
          : `<input name="budget" type="hidden" value="${escapeHtml(p.budget ?? "")}" />`
      }
    </div>
  `;
}

function openTaskDialog(task = null) {
  if (task) {
    if (!canEditTask(task)) throw new Error("Ban khong co quyen sua cong viec nay.");
  } else {
    guard("task:create");
  }

  openDialog(task ? "Sua cong viec" : "Tao cong viec", taskForm(task), async (form) => {
    const type = textValue(form, "type");
    if (!canUseTaskType(type)) {
      throw new Error(`Role ${state.role} khong duoc tao/sua loai ${type}.`);
    }

    const payload = {
      title: textValue(form, "title"),
      description: textValue(form, "description"),
      projectId: textValue(form, "projectId"),
      assigneeId: can("task:assign") ? textValue(form, "assigneeId") : state.user?.id,
      type,
      priority: textValue(form, "priority"),
      status: textValue(form, "status"),
      progress: numberValue(form, "progress"),
      dueDate: textValue(form, "dueDate"),
      estimatedHours: numberValue(form, "estimatedHours"),
      actualHours: numberValue(form, "actualHours"),
    };

    if (task) {
      await apiFetch(`${ENDPOINTS.tasks}/${encodeURIComponent(task.id)}`, { method: "PUT", body: payload });
      toast("Da sua cong viec.");
    } else {
      await apiFetch(ENDPOINTS.tasks, { method: "POST", body: payload });
      toast("Da tao cong viec.");
    }
  });
}

function taskForm(task) {
  const t = task || {};
  const typeList = TASK_TYPES_BY_ROLE[state.role] || [];
  const selectedType = typeList.includes(t.type) ? t.type : typeList[0] || "TASK";
  const canAssign = can("task:assign");
  const progressDisabled = canAny(["task:progress:update", "task:update", "task:update:self", "task:update:requirement", "task:test:update"])
    ? ""
    : "disabled";

  return `
    <label>Tiêu đề<input name="title" required value="${escapeHtml(t.title || "")}" /></label>
    <label>Mô tả<textarea name="description">${escapeHtml(t.description || "")}</textarea></label>
    <div class="three-col">
      <label>Dự án
        <select name="projectId" required>
          ${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${String(project.id) === String(t.projectId) ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}
        </select>
      </label>
      <label>Loại
        <select name="type">
          ${options(typeList, selectedType)}
        </select>
      </label>
      <label>Độ ưu tiên
        <select name="priority">
          ${options(["LOW", "MEDIUM", "HIGH", "CRITICAL"], t.priority || "MEDIUM")}
        </select>
      </label>
    </div>
    <div class="three-col">
      <label>Trạng thái
        <select name="status">
          ${options(["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE", "BLOCKED"], t.status || "TODO")}
        </select>
      </label>
      <label>Tiến độ %<input name="progress" type="number" min="0" max="100" value="${escapeHtml(t.progress ?? 0)}" ${progressDisabled} /></label>
      <label>Deadline<input name="dueDate" type="date" value="${dateInputValue(t.dueDate)}" /></label>
    </div>
    <div class="three-col">
      <label>Estimate h<input name="estimatedHours" type="number" min="0" step="0.5" value="${escapeHtml(t.estimatedHours ?? 0)}" /></label>
      <label>Actual h<input name="actualHours" type="number" min="0" step="0.5" value="${escapeHtml(t.actualHours ?? 0)}" /></label>
      <label>Người làm
        <select name="assigneeId" ${canAssign ? "" : "disabled"}>
          <option value="">Chưa gán</option>
          ${userOptions(t.assigneeId || state.user?.id)}
        </select>
      </label>
    </div>
  `;
}

function openResourceDialog(resource = null) {
  guard(resource ? "resource:update" : "resource:create");
  const finance = can("resource:finance:edit");
  openDialog(resource ? "Sua tai nguyen" : "Them tai nguyen", resourceForm(resource, finance), async (form) => {
    const payload = {
      name: textValue(form, "name"),
      projectId: textValue(form, "projectId"),
      type: textValue(form, "type"),
      allocated: numberValue(form, "allocated"),
      used: numberValue(form, "used"),
      status: textValue(form, "status"),
      ownerId: textValue(form, "ownerId"),
    };

    if (finance) {
      payload.unitCost = numberValue(form, "unitCost");
      payload.totalCost = numberValue(form, "totalCost");
    }

    if (resource) {
      await apiFetch(`${ENDPOINTS.resources}/${encodeURIComponent(resource.id)}`, { method: "PUT", body: payload });
      toast("Da sua tai nguyen.");
    } else {
      await apiFetch(ENDPOINTS.resources, { method: "POST", body: payload });
      toast("Da them tai nguyen.");
    }
  });
}

function resourceForm(resource, finance) {
  const r = resource || {};
  return `
    <div class="three-col">
      <label>Tên tài nguyên<input name="name" required value="${escapeHtml(r.name || "")}" /></label>
      <label>Loại
        <select name="type">
          ${options(["PERSONNEL", "EQUIPMENT", "BUDGET"], r.type || "PERSONNEL")}
        </select>
      </label>
      <label>Dự án
        <select name="projectId" required>
          ${state.projects.map((project) => `<option value="${escapeHtml(project.id)}" ${String(project.id) === String(r.projectId) ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="three-col">
      <label>Cấp phát<input name="allocated" type="number" min="0" step="0.5" value="${escapeHtml(r.allocated ?? 0)}" /></label>
      <label>Đã dùng<input name="used" type="number" min="0" step="0.5" value="${escapeHtml(r.used ?? 0)}" /></label>
      <label>Trạng thái
        <select name="status">
          ${options(["AVAILABLE", "ALLOCATED", "OVERUSED", "INACTIVE"], r.status || "ALLOCATED")}
        </select>
      </label>
    </div>
    <div class="three-col">
      <label>Người phụ trách
        <select name="ownerId">
          <option value="">Chưa gán</option>
          ${userOptions(r.ownerId)}
        </select>
      </label>
      ${
        finance
          ? `<label>Đơn giá<input name="unitCost" type="number" min="0" step="1000" value="${escapeHtml(r.unitCost ?? 0)}" /></label>
             <label>Tổng chi phí<input name="totalCost" type="number" min="0" step="1000" value="${escapeHtml(r.totalCost ?? 0)}" /></label>`
          : `<input name="unitCost" type="hidden" value="${escapeHtml(r.unitCost ?? 0)}" />
             <input name="totalCost" type="hidden" value="${escapeHtml(r.totalCost ?? 0)}" />`
      }
    </div>
  `;
}

async function deleteProject(id) {
  guard("project:delete");
  if (!confirm("Xoá dự án này?")) return;
  await apiFetch(`${ENDPOINTS.projects}/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Da xoa du an.");
  await refreshAll();
}

async function deleteTask(id) {
  guard("task:delete");
  if (!confirm("Xoá công việc này?")) return;
  await apiFetch(`${ENDPOINTS.tasks}/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Da xoa cong viec.");
  await refreshAll();
}

async function completeTask(id) {
  const task = state.tasks.find((item) => String(item.id) === String(id));
  if (!task || !canEditTask(task) || !can("task:complete")) {
    throw new Error("Bạn không có quyền hoàn thành công việc này.");
  }

  await apiFetch(`${ENDPOINTS.tasks}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { ...task, status: "DONE", progress: 100 },
  });
  toast("Đã hoàn thành công việc.");
  await refreshAll();
}

async function deleteResource(id) {
  guard("resource:delete");
  if (!confirm("Xoá tài nguyên này?")) return;
  await apiFetch(`${ENDPOINTS.resources}/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast("Đã xoá tài nguyên.");
  await refreshAll();
}

async function markNotificationRead(id) {
  guard("notification:update");
  await apiFetch(`${ENDPOINTS.notifications}/${encodeURIComponent(id)}/read`, { method: "PATCH" });
  const notification = state.notifications.find((item) => String(item.id) === String(id));
  if (notification) notification.read = true;
  renderNotifications();
}

async function markAllNotificationsRead() {
  guard("notification:update");
  await Promise.all(
    state.notifications
      .filter((notification) => !notification.read)
      .map((notification) =>
        apiFetch(`${ENDPOINTS.notifications}/${encodeURIComponent(notification.id)}/read`, { method: "PATCH" }),
      ),
  );
  state.notifications.forEach((notification) => {
    notification.read = true;
  });
  renderNotifications();
  toast("Da danh dau doc tat ca.");
}

function exportReportCsv() {
  guard("report:export");
  const rows = [["Project", "Progress", "Tasks", "Done", "Budget", "Spent"]];
  state.projects.forEach((project) => {
    const tasks = state.tasks.filter((task) => String(task.projectId) === String(project.id));
    rows.push([
      project.name,
      `${calculateProjectProgress(project.id)}%`,
      tasks.length,
      tasks.filter((task) => task.status === "DONE").length,
      project.budget,
      project.spent,
    ]);
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pms-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function openDialog(title, body, onSubmit) {
  dom.dialogTitle.textContent = title;
  dom.dialogBody.innerHTML = body;
  state.activeDialogSubmit = onSubmit;
  if (typeof dom.entityDialog.showModal === "function") {
    dom.entityDialog.showModal();
  } else {
    dom.entityDialog.setAttribute("open", "open");
  }
  applyAccessControls(dom.entityDialog);
  refreshIcons();
}

function closeDialog() {
  state.activeDialogSubmit = null;
  dom.dialogForm.reset();
  if (typeof dom.entityDialog.close === "function") {
    dom.entityDialog.close();
  } else {
    dom.entityDialog.removeAttribute("open");
  }
}

function connectNotificationSocket() {
  closeSocket();

  if (!state.token || !can("notification:view") || !state.config.wsUrl) {
    updateSocketStatus("WS off", "muted");
    return;
  }

  if (state.config.wsMode === "stomp") {
    connectStompSocket();
    return;
  }

  connectNativeSocket();
}

function connectNativeSocket() {
  try {
    const socketUrl = appendQuery(state.config.wsUrl, { token: state.token });
    const socket = new WebSocket(socketUrl);
    state.socket = socket;
    updateSocketStatus("WS connecting", "warn");

    socket.addEventListener("open", () => updateSocketStatus("WS live", "ok"));
    socket.addEventListener("close", () => updateSocketStatus("WS closed", "muted"));
    socket.addEventListener("error", () => updateSocketStatus("WS error", "danger"));
    socket.addEventListener("message", (event) => pushNotification(parseSocketMessage(event.data)));
  } catch {
    updateSocketStatus("WS error", "danger");
  }
}

function connectStompSocket() {
  if (!window.StompJs) {
    updateSocketStatus("STOMP missing", "danger");
    return;
  }

  const isWebSocketUrl = /^wss?:\/\//i.test(state.config.wsUrl);
  const clientConfig = {
    reconnectDelay: 5000,
    connectHeaders: { Authorization: `Bearer ${state.token}` },
    debug: () => {},
    onConnect: () => {
      updateSocketStatus("STOMP live", "ok");
      ["/user/queue/notifications", "/topic/notifications", "/topic/projects"].forEach((destination) => {
        state.stompClient.subscribe(destination, (message) => pushNotification(parseSocketMessage(message.body)));
      });
    },
    onStompError: () => updateSocketStatus("STOMP error", "danger"),
    onWebSocketClose: () => updateSocketStatus("STOMP closed", "muted"),
  };

  if (isWebSocketUrl) {
    clientConfig.brokerURL = appendQuery(state.config.wsUrl, { token: state.token });
  } else if (window.SockJS) {
    clientConfig.webSocketFactory = () => new window.SockJS(appendQuery(state.config.wsUrl, { token: state.token }));
  } else {
    updateSocketStatus("SockJS missing", "danger");
    return;
  }

  state.stompClient = new window.StompJs.Client(clientConfig);
  updateSocketStatus("STOMP connecting", "warn");
  state.stompClient.activate();
}

function closeSocket() {
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }

  if (state.stompClient) {
    state.stompClient.deactivate();
    state.stompClient = null;
  }
}

function pushNotification(raw) {
  const notification = normalizeNotification(raw);
  state.notifications = [notification, ...state.notifications.filter((item) => String(item.id) !== String(notification.id))];
  renderNotifications();
  renderDashboard();
  refreshIcons();
  toast(notification.title || "Co thong bao moi.");
}

function updateSocketStatus(text, type) {
  dom.socketStatus.textContent = text;
  dom.socketStatus.className = `status-pill ${type || "muted"}`;
}

async function apiFetch(path, options = {}) {
  const { method = "GET", body, query, skipAuth = false } = options;
  const url = buildApiUrl(path, query);
  const headers = new Headers(options.headers || {});

  if (!skipAuth && state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const fetchOptions = { method, headers };
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  if (response.status === 401) {
    logout();
    throw new Error("Phien dang nhap het han.");
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function buildApiUrl(path, query) {
  const base = state.config.apiBaseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${cleanPath}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function appendQuery(url, params) {
  const parsed = new URL(url, window.location.href);
  Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
  return parsed.toString();
}

function can(permission, role = state.role) {
  return Boolean(ROLE_PERMISSIONS[role]?.has(permission));
}

function canAny(permissions) {
  return permissions.some((permission) => can(permission));
}

function canSpec(spec) {
  return String(spec)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .some((permission) => can(permission));
}

function guard(permission) {
  if (!can(permission)) throw new Error(`Role ${state.role} khong co quyen ${permission}.`);
}

function canUseTaskType(type) {
  return (TASK_TYPES_BY_ROLE[state.role] || []).includes(type);
}

function canEditTask(task) {
  if (can("task:update")) return true;
  if (can("task:update:self") && isCurrentAssignee(task)) return true;
  if (can("task:update:requirement") && task.type === "REQUIREMENT") return true;
  if (can("task:test:update") && ["BUG", "TEST_CASE"].includes(task.type)) return true;
  return false;
}

function isCurrentAssignee(task) {
  const current = state.user || {};
  const candidates = [current.id, current.username, current.email, current.name].filter(Boolean).map(String);
  return [task.assigneeId, task.assigneeName, task.assigneeEmail].filter(Boolean).map(String).some((value) => candidates.includes(value));
}

function applyAccessControls(scope) {
  scope.querySelectorAll("[data-permission]").forEach((element) => {
    element.hidden = !canSpec(element.dataset.permission);
  });
}

function decodeJwt(token) {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("JWT khong dung dinh dang.");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
  return JSON.parse(decodeURIComponent(escape(window.atob(padded))));
}

function extractRole(claims) {
  const values = [];
  collectClaimValues(claims.role, values);
  collectClaimValues(claims.roles, values);
  collectClaimValues(claims.authority, values);
  collectClaimValues(claims.authorities, values);
  collectClaimValues(claims.scope, values);
  collectClaimValues(claims.scp, values);

  for (const value of values) {
    const role = normalizeRoleValue(value);
    if (role) return role;
  }

  return null;
}

function collectClaimValues(value, output) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectClaimValues(item, output));
    return;
  }
  if (typeof value === "object") {
    collectClaimValues(value.authority || value.role || value.name, output);
    return;
  }
  String(value)
    .split(/[,\s]+/)
    .filter(Boolean)
    .forEach((item) => output.push(item));
}

function normalizeRoleValue(value) {
  const normalized = String(value).trim().replace(/^ROLE_/i, "").toUpperCase();
  return ROLES.includes(normalized) ? normalized : null;
}

function normalizeUser(claims) {
  return {
    id: claims.userId || claims.id || claims.sub || claims.uid || "",
    username: claims.username || claims.preferred_username || claims.sub || "",
    email: claims.email || "",
    name: claims.name || claims.fullName || claims.username || claims.preferred_username || claims.sub || "User",
  };
}

function isTokenExpired(claims) {
  if (!claims.exp) return false;
  return Number(claims.exp) * 1000 <= Date.now();
}

function extractTokenFromLogin(result) {
  return result?.accessToken || result?.token || result?.jwt || result?.data?.accessToken || result?.data?.token || "";
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.result)) return raw.result;
  return [];
}

function normalizeProject(item) {
  return {
    id: item.id ?? item.projectId ?? item.uuid,
    code: item.code ?? item.projectCode ?? "",
    name: item.name ?? item.projectName ?? "Untitled",
    description: item.description ?? "",
    status: item.status ?? "PLANNING",
    startDate: item.startDate ?? item.startedAt ?? "",
    endDate: item.endDate ?? item.deadline ?? "",
    ownerId: item.ownerId ?? item.managerId ?? item.projectManagerId ?? "",
    budget: toNumber(item.budget ?? item.totalBudget),
    spent: toNumber(item.spent ?? item.usedBudget ?? item.cost),
    progress: toNumber(item.progress ?? item.percentComplete),
  };
}

function normalizeTask(item) {
  return {
    id: item.id ?? item.taskId ?? item.uuid,
    title: item.title ?? item.name ?? "Untitled",
    description: item.description ?? "",
    projectId: item.projectId ?? item.project?.id ?? "",
    assigneeId: item.assigneeId ?? item.assignee?.id ?? item.userId ?? "",
    assigneeName: item.assigneeName ?? item.assignee?.name ?? item.assignee?.username ?? "",
    assigneeEmail: item.assigneeEmail ?? item.assignee?.email ?? "",
    type: item.type ?? item.taskType ?? "TASK",
    priority: item.priority ?? "MEDIUM",
    status: item.status ?? "TODO",
    progress: toNumber(item.progress ?? item.percentComplete),
    dueDate: item.dueDate ?? item.deadline ?? "",
    estimatedHours: toNumber(item.estimatedHours ?? item.estimate),
    actualHours: toNumber(item.actualHours ?? item.actual),
  };
}

function normalizeResource(item) {
  return {
    id: item.id ?? item.resourceId ?? item.uuid,
    projectId: item.projectId ?? item.project?.id ?? "",
    type: item.type ?? item.resourceType ?? "PERSONNEL",
    name: item.name ?? item.resourceName ?? "Untitled",
    allocated: toNumber(item.allocated ?? item.capacity ?? item.quantity),
    used: toNumber(item.used ?? item.usage ?? item.consumed),
    unitCost: toNumber(item.unitCost ?? item.rate),
    totalCost: toNumber(item.totalCost ?? item.cost),
    status: item.status ?? "ALLOCATED",
    ownerId: item.ownerId ?? item.userId ?? "",
  };
}

function normalizeNotification(item) {
  const fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: item?.id ?? item?.notificationId ?? fallbackId,
    title: item?.title ?? item?.eventType ?? item?.type ?? "Thong bao",
    message: item?.message ?? item?.content ?? item?.body ?? "",
    type: item?.type ?? item?.eventType ?? "INFO",
    read: Boolean(item?.read ?? item?.isRead),
    createdAt: item?.createdAt ?? item?.time ?? item?.timestamp ?? new Date().toISOString(),
  };
}

function normalizeUserRecord(item) {
  return {
    id: item.id ?? item.userId ?? item.uuid ?? item.username,
    name: item.name ?? item.fullName ?? item.username ?? item.email ?? "User",
    username: item.username ?? "",
    email: item.email ?? "",
    role: extractRole(item) || normalizeRoleValue(item.role) || "",
  };
}

function parseSocketMessage(data) {
  try {
    return JSON.parse(data);
  } catch {
    return { title: "Thong bao", message: String(data), createdAt: new Date().toISOString() };
  }
}

function calculateProjectProgress(projectId) {
  const tasks = state.tasks.filter((task) => String(task.projectId) === String(projectId));
  if (!tasks.length) return 0;
  const done = tasks.filter((task) => task.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

function calculateResourceUsage(resources = state.resources) {
  const allocated = resources.reduce((sum, resource) => sum + toNumber(resource.allocated), 0);
  const used = resources.reduce((sum, resource) => sum + toNumber(resource.used), 0);
  return allocated ? Math.round((used / allocated) * 100) : 0;
}

function calculateBudget(projects = state.projects, resources = state.resources) {
  const budget = projects.reduce((sum, project) => sum + toNumber(project.budget), 0);
  const projectSpent = projects.reduce((sum, project) => sum + toNumber(project.spent), 0);
  const resourceSpent = resources.reduce((sum, resource) => sum + toNumber(resource.totalCost), 0);
  return { budget, spent: projectSpent || resourceSpent };
}

function projectName(projectId) {
  return state.projects.find((project) => String(project.id) === String(projectId))?.name || "No project";
}

function userName(userId) {
  return state.users.find((user) => String(user.id) === String(userId))?.name || "";
}

function actionButton(action, id, icon, title, tone = "") {
  return `
    <button class="icon-btn ${tone}" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}" title="${escapeHtml(title)}">
      <i data-lucide="${escapeHtml(icon)}"></i>
      <span class="sr-only">${escapeHtml(title)}</span>
    </button>
  `;
}

function statusBadge(value, tone) {
  const text = String(value || "-");
  const resolvedTone =
    tone ||
    (["DONE", "ACTIVE", "AVAILABLE", "READ"].includes(text)
      ? "ok"
      : ["BLOCKED", "OVERDUE", "CANCELLED", "CRITICAL"].includes(text)
        ? "danger"
        : ["ON_HOLD", "IN_PROGRESS", "TESTING", "HIGH", "NEW"].includes(text)
          ? "warn"
          : "muted");
  return `<span class="badge ${resolvedTone}">${escapeHtml(text)}</span>`;
}

function renderMiniProgress(value) {
  const percent = clamp(value, 0, 100);
  return `
    <div class="progress-item">
      <div class="progress-meta"><span>${percent}%</span></div>
      <div class="progress-line"><span style="width:${percent}%"></span></div>
    </div>
  `;
}

function options(values, selected) {
  return values
    .map((value) => `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(value)}</option>`)
    .join("");
}

function userOptions(selected) {
  return state.users
    .map((user) => `<option value="${escapeHtml(user.id)}" ${String(user.id) === String(selected) ? "selected" : ""}>${escapeHtml(user.name)}</option>`)
    .join("");
}

function textValue(form, key) {
  return String(form.get(key) || "").trim();
}

function numberValue(form, key) {
  return toNumber(form.get(key));
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, toNumber(value)));
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isOverdue(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date < startOfToday();
}

function isUpcoming(value, days) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(today.getDate() + days);
  return date >= today && date <= end;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function setBusy(element, busy) {
  if (!element) return;
  element.disabled = busy;
  element.dataset.originalLabel ||= element.innerHTML;
  element.innerHTML = busy ? `<i data-lucide="loader-circle"></i>` : element.dataset.originalLabel;
  refreshIcons();
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  dom.toastHost.appendChild(node);
  window.setTimeout(() => node.remove(), 4200);
}

function showError(error) {
  toast(error?.message || "Co loi xay ra.");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
