window.LabourApp = (() => {
  const routes = {
    dashboard: ["Dashboard", "grid"],
    employees: ["Employees", "people"],
    attendance: ["Attendance", "check"],
    projects: ["Projects", "brief"],
    expenses: ["Expenses", "card"],
    payroll: ["Payroll", "wage"],
    payments: ["Payments", "pay"],
    reports: ["Reports", "report"],
    settings: ["Settings", "gear"]
  };
  let user = null;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }
  function toast(message, type = "") {
    const region = document.getElementById("toastRegion");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
  function number(value) {
    const n = Number(value || 0);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function money(value) {
    const settings = getSettings();
    return `${settings.currency || "MMK"} ${number(value)}`;
  }
  function dateValue(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function formatDate(value) {
    if (!value) return "-";
    const settings = getSettings();
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    if (settings.dateFormat === "DD/MM/YYYY") return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    if (settings.dateFormat === "MM/DD/YYYY") return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
    return d.toISOString().slice(0,10);
  }
  function getSettings() {
    try { return JSON.parse(localStorage.getItem("labour_settings") || "{}"); }
    catch { return {}; }
  }
  function saveSettings(settings) { localStorage.setItem("labour_settings", JSON.stringify(settings)); }
  function applyTheme() {
    const settings = getSettings();
    const theme = settings.theme || localStorage.getItem("labour_theme") || "light";
    document.documentElement.dataset.theme = theme;
  }
  function modal(title, body, footer = "") {
    document.querySelector(".modal-backdrop")?.remove();
    const el = document.createElement("div");
    el.className = "modal-backdrop";
    el.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${escapeHTML(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Close">×</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ""}</div>`;
    document.body.appendChild(el);
    el.querySelector("[data-close]").addEventListener("click", () => el.remove());
    el.addEventListener("click", event => { if (event.target === el) el.remove(); });
    return el;
  }
  function confirmDialog(title, message) {
    return new Promise(resolve => {
      const el = modal(title, `<p>${escapeHTML(message)}</p>`, `<button class="btn" type="button" data-no>Cancel</button><button class="btn btn-danger" type="button" data-yes>Delete</button>`);
      el.querySelector("[data-no]").onclick = () => { el.remove(); resolve(false); };
      el.querySelector("[data-yes]").onclick = () => { el.remove(); resolve(true); };
    });
  }
  function exportCSV(filename, rows) {
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderShell() {
    applyTheme();
    const route = location.hash.slice(1) || "dashboard";
    const [title] = routes[route] || routes.dashboard;
    document.getElementById("app").innerHTML = `
      <div class="shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand"><span class="brand-mark">LB</span><span>${escapeHTML(getSettings().businessName || "Labour Book")}</span></div>
          <nav class="nav">${Object.entries(routes).map(([key, val]) => `<a href="#${key}" data-route="${key}" class="${key === route ? "active" : ""}"><span class="nav-icon">•</span><span>${val[0]}</span></a>`).join("")}</nav>
          <div class="sidebar-foot"><button class="btn" id="themeToggle" type="button">Toggle theme</button><button class="btn" id="logoutBtn" type="button">Log out</button></div>
        </aside>
        <main class="main">
          <header class="topbar"><div style="display:flex;align-items:center;gap:10px"><button class="icon-btn mobile-menu" id="menuBtn" type="button">☰</button><h1>${title}</h1></div><div class="top-actions"><span class="email muted">${escapeHTML(user?.email || "")}</span></div></header>
          <section class="content" id="pageContent"><div class="loading">Loading...</div></section>
        </main>
      </div>`;
    document.getElementById("menuBtn").onclick = () => document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("themeToggle").onclick = () => {
      const s = getSettings(); s.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      saveSettings(s); applyTheme();
    };
    document.getElementById("logoutBtn").onclick = async () => {
      const db = LabourDB.client;
      const { error } = await db.auth.signOut();
      if (error) toast(error.message, "error");
    };
  }
  async function renderRoute() {
    const route = location.hash.slice(1) || "dashboard";
    renderShell();
    const moduleName = route.charAt(0).toUpperCase() + route.slice(1);
    const modules = { Dashboard:window.LabourDashboard, Employees:window.LabourEmployees, Attendance:window.LabourAttendance, Projects:window.LabourProjects, Expenses:window.LabourExpenses, Payroll:window.LabourPayroll, Payments:window.LabourPayments, Reports:window.LabourReports, Settings:window.LabourSettings };
    const mod = modules[moduleName];
    if (mod?.render) await mod.render(document.getElementById("pageContent"));
  }
  async function init() {
    if (!LabourDB.keyIsConfigured()) {
      LabourAuth.renderAuth();
      toast("Supabase publishable key is missing. Add it to js/config.js.", "error");
      return;
    }
    const db = LabourDB.client;
    const { data } = await db.auth.getSession();
    user = data.session?.user || null;
    if (!user) LabourAuth.renderAuth();
    else await renderRoute();
    db.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      if (!user) LabourAuth.renderAuth();
      else if (location.hash) renderRoute();
      else { location.hash = "dashboard"; renderRoute(); }
    });
    window.addEventListener("hashchange", () => { if (user) renderRoute(); });
  }
  return { init, escapeHTML, toast, number, money, dateValue, formatDate, getSettings, saveSettings, applyTheme, modal, confirmDialog, exportCSV, renderShell };
})();

window.addEventListener("DOMContentLoaded", () => LabourApp.init());
