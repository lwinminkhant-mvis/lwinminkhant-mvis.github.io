window.LabourAttendance = (() => {
  const PAGE_SIZE = 1000;
  const statusCycle = ["present", "half-day", "absent"];
  let employees = [];
  let projects = [];
  let currentRecords = [];
  let statuses = new Map();

  async function fetchAll(query) {
    const all = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < PAGE_SIZE) return all;
    }
  }

  async function render(container) {
    container.innerHTML = `<div class="loading">Loading attendance...</div>`;
    try {
      const [employeeRows, projectRows] = await Promise.all([
        fetchAll(LabourDB.client.from("employees").select("id,full_name,employment_status").order("full_name")),
        fetchAll(LabourDB.client.from("projects").select("id,name").order("name"))
      ]);
      employees = employeeRows.filter(employee => (employee.employment_status || "active") === "active");
      projects = projectRows;
      const today = LabourApp.dateValue();
      container.innerHTML = `
        <section class="panel attendance-filter-panel">
          <div class="panel-head">
            <div><h2>Attendance period</h2><span class="muted">This selection controls attendance entry and the history shown below.</span></div>
            <div class="toolbar">
              <select id="attendancePeriod" aria-label="Attendance period">
                <option value="day">Day</option><option value="month">Month</option><option value="year">Year</option>
              </select>
              <input id="attendancePeriodValue" type="date" value="${today}" aria-label="Selected attendance date">
              <select id="attendanceStatusFilter" aria-label="Filter attendance status">
                <option value="">All statuses</option><option value="present">Present</option><option value="half-day">Half-day</option><option value="absent">Absent</option>
              </select>
            </div>
          </div>
        </section>
        <div class="attendance-top">
          <section class="panel attendance-entry" id="attendanceEntry">
            <div class="panel-head">
              <div><h2>Quick attendance</h2><span class="muted">Tap each person's status, then save the roster.</span></div>
              <div class="toolbar">
                <button class="btn" type="button" id="markAllPresent">All present</button>
                <button class="btn" type="button" id="resetAttendance">Reset edits</button>
                <button class="btn btn-primary" type="button" id="saveAttendance">Save attendance</button>
              </div>
            </div>
            <div class="attendance-key"><span><i class="key-dot present"></i>Present</span><span><i class="key-dot half-day"></i>Half-day</span><span><i class="key-dot absent"></i>Absent</span><span class="muted">Tap a status to cycle through present, half-day, and absent.</span></div>
            <div class="attendance-roster" id="attendanceRoster"></div>
          </section>
          <section class="panel">
            <div class="panel-head"><div><h2>Attendance history</h2><span class="muted" id="historyPeriodLabel"></span></div></div>
            <div id="historySummary" class="attendance-summary"></div>
            <div id="attendanceHistory" class="table-wrap"></div>
          </section>
        </div>`;
      statuses = new Map();
      bindRoster(container);
      document.getElementById("attendancePeriod").onchange = async () => {
        updatePeriodInput();
        await refreshPeriod(container);
      };
      document.getElementById("attendancePeriodValue").onchange = () => refreshPeriod(container);
      document.getElementById("attendanceStatusFilter").onchange = () => loadHistory(container);
      document.getElementById("markAllPresent").onclick = () => {
        employees.forEach(employee => statuses.set(employee.id, "present"));
        drawRoster();
      };
      document.getElementById("resetAttendance").onclick = () => resetStatuses();
      document.getElementById("saveAttendance").onclick = () => saveRoster(container);
      await refreshPeriod(container);
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message || "Unable to load attendance.")}</div></div>`;
    }
  }

  function bindRoster(container) {
    document.getElementById("attendanceRoster").addEventListener("click", event => {
      const button = event.target.closest("[data-status-employee]");
      if (!button) return;
      const current = statuses.get(button.dataset.statusEmployee) || "";
      statuses.set(button.dataset.statusEmployee, statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length]);
      drawRoster();
    });
  }

  async function refreshPeriod(container) {
    const period = document.getElementById("attendancePeriod").value;
    const value = document.getElementById("attendancePeriodValue").value;
    const entry = document.getElementById("attendanceEntry");
    entry.hidden = period !== "day" || !value;
    if (!value) {
      await loadHistory(container);
      return;
    }
    if (period === "day") {
      await Promise.all([loadRoster(container), loadHistory(container)]);
    } else {
      await loadHistory(container);
    }
  }

  async function loadRoster(container) {
    const date = document.getElementById("attendancePeriodValue").value;
    if (!date) return;
    try {
      const { data, error } = await LabourDB.client.from("attendance")
        .select("*").eq("date", date).order("created_at");
      if (error) throw error;
      currentRecords = data || [];
      statuses = new Map(employees.map(employee => {
        const record = currentRecords.find(row => row.employee_id === employee.id);
        return [employee.id, record?.status || ""];
      }));
      drawRoster();
    } catch (error) {
      LabourApp.toast(error.message || "Could not load attendance for this date.", "error");
    }
  }

  function resetStatuses() {
    statuses = new Map(employees.map(employee => {
      const record = currentRecords.find(row => row.employee_id === employee.id);
      return [employee.id, record?.status || ""];
    }));
    drawRoster();
  }

  function drawRoster() {
    const roster = document.getElementById("attendanceRoster");
    if (!roster) return;
    if (!employees.length) {
      roster.innerHTML = `<div class="empty">No active employees found. Add employees before recording attendance.</div>`;
      return;
    }
    roster.innerHTML = employees.map(employee => {
      const status = statuses.get(employee.id) || "";
      const record = currentRecords.find(row => row.employee_id === employee.id);
      const projectId = record?.project_id || "";
      return `<article class="attendance-person ${status ? `is-${status}` : ""}">
        <div class="attendance-person-info"><span class="attendance-avatar">${LabourApp.escapeHTML(initials(employee.full_name))}</span><div><strong>${LabourApp.escapeHTML(employee.full_name || "Employee")}</strong><small>${status ? statusLabel(status) : "Not marked"}</small></div></div>
        <button type="button" class="attendance-status-button ${status ? `status-${status}` : ""}" data-status-employee="${employee.id}" aria-label="Set attendance status for ${LabourApp.escapeHTML(employee.full_name)}">${status ? statusLabel(status) : "Tap to mark"}</button>
        <select class="attendance-project" data-project-employee="${employee.id}" aria-label="Project for ${LabourApp.escapeHTML(employee.full_name)}"><option value="">No project</option>${projects.map(project => `<option value="${project.id}" ${projectId === project.id ? "selected" : ""}>${LabourApp.escapeHTML(project.name)}</option>`).join("")}</select>
      </article>`;
    }).join("");
  }

  async function saveRoster(container) {
    const saveButton = document.getElementById("saveAttendance");
    const selected = employees.filter(employee => statuses.get(employee.id));
    if (!selected.length) {
      LabourApp.toast("Mark at least one employee before saving.", "error");
      return;
    }
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    try {
      const { data: { session }, error: sessionError } = await LabourDB.client.auth.getSession();
      if (sessionError) throw sessionError;
      const date = document.getElementById("attendancePeriodValue").value;
      const operations = selected.map(employee => {
        const existing = currentRecords.find(row => row.employee_id === employee.id);
        const projectSelect = [...document.querySelectorAll("[data-project-employee]")]
          .find(select => select.dataset.projectEmployee === employee.id);
        const payload = {
          date,
          employee_id: employee.id,
          project_id: projectSelect?.value || null,
          status: statuses.get(employee.id),
          user_id: session.user.id
        };
        return existing
          ? LabourDB.client.from("attendance").update(payload).eq("id", existing.id)
          : LabourDB.client.from("attendance").insert(payload);
      });
      const results = await Promise.all(operations);
      const failed = results.find(result => result.error);
      if (failed) throw failed.error;
      LabourApp.toast(`Saved attendance for ${selected.length} employee${selected.length === 1 ? "" : "s"}.`, "success");
      await refreshPeriod(container);
    } catch (error) {
      LabourApp.toast(error.message || "Could not save attendance.", "error");
      await loadRoster(container);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save attendance";
    }
  }

  function updatePeriodInput() {
    const period = document.getElementById("attendancePeriod").value;
    const input = document.getElementById("attendancePeriodValue");
    const previousValue = input.value;
    if (period === "year") {
      input.type = "number";
      input.min = "2000";
      input.max = "2100";
      input.value = previousValue.slice(0, 4) || String(new Date().getFullYear());
    } else {
      input.type = period === "month" ? "month" : "date";
      input.removeAttribute("min");
      input.removeAttribute("max");
      input.value = period === "month"
        ? (previousValue.length === 4 ? `${previousValue}-01` : previousValue.slice(0, 7))
        : (previousValue.length === 4 ? `${previousValue}-01-01` : previousValue.length === 7 ? `${previousValue}-01` : previousValue.slice(0, 10));
    }
  }

  async function loadHistory(container) {
    const output = document.getElementById("attendanceHistory");
    if (!output) return;
    output.innerHTML = `<div class="loading">Loading history...</div>`;
    try {
      const period = document.getElementById("attendancePeriod").value;
      const value = document.getElementById("attendancePeriodValue").value;
      if (!value || (period === "year" && !/^\d{4}$/.test(value))) {
        drawSummary([]);
        document.getElementById("historyPeriodLabel").textContent = "";
        output.innerHTML = `<div class="empty">Choose a valid period.</div>`;
        return;
      }
      let start, end;
      if (period === "day") start = end = value;
      else if (period === "month") {
        const [year, month] = value.split("-").map(Number);
        start = `${year}-${String(month).padStart(2, "0")}-01`;
        end = LabourApp.dateValue(new Date(year, month, 0));
      } else {
        start = `${value}-01-01`;
        end = `${value}-12-31`;
      }
      document.getElementById("historyPeriodLabel").textContent = periodLabel(period, value);
      const rows = await fetchAll(LabourDB.client.from("attendance").select("*")
        .gte("date", start).lte("date", end).order("date", { ascending: false }));
      const status = document.getElementById("attendanceStatusFilter").value;
      const filtered = status ? rows.filter(row => row.status === status) : rows;
      drawSummary(filtered);
      output.innerHTML = filtered.length
        ? `<table><thead><tr><th>Date</th><th>Employee</th><th>Project</th><th>Status</th></tr></thead><tbody>${filtered.map(row => historyRow(row)).join("")}</tbody></table>`
        : `<div class="empty">No attendance records for this ${period}.</div>`;
    } catch (error) {
      output.innerHTML = `<div class="empty">${LabourApp.escapeHTML(error.message || "Could not load attendance history.")}</div>`;
    }
  }

  function drawSummary(rows) {
    const totals = rows.reduce((counts, row) => {
      counts[row.status] = (counts[row.status] || 0) + 1;
      return counts;
    }, {});
    document.getElementById("historySummary").innerHTML = `
      <div class="attendance-total"><strong>${rows.length}</strong><span>Records</span></div>
      <div class="attendance-total"><strong>${totals.present || 0}</strong><span>Present</span></div>
      <div class="attendance-total"><strong>${totals["half-day"] || 0}</strong><span>Half-day</span></div>
      <div class="attendance-total"><strong>${totals.absent || 0}</strong><span>Absent</span></div>`;
  }

  function periodLabel(period, value) {
    if (period === "day") return LabourApp.formatDate(value);
    if (period === "month") {
      const [year, month] = value.split("-").map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    return value;
  }

  function historyRow(row) {
    const employee = employees.find(item => item.id === row.employee_id);
    const project = projects.find(item => item.id === row.project_id);
    return `<tr><td>${LabourApp.formatDate(row.date)}</td><td>${LabourApp.escapeHTML(employee?.full_name || "Employee")}</td><td>${LabourApp.escapeHTML(project?.name || "-")}</td><td><span class="status status-${LabourApp.escapeHTML(row.status)}">${LabourApp.escapeHTML(statusLabel(row.status))}</span></td></tr>`;
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join("");
  }
  function statusLabel(status) {
    return status === "half-day" ? "Half-day" : status.charAt(0).toUpperCase() + status.slice(1);
  }

  return { render };
})();
