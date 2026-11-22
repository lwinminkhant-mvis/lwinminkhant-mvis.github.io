window.LabourEmployees = (() => {
  function form(employee = {}) {
    return `<form id="employeeForm" class="form-grid">
      <div class="two-cols">
        <div class="field"><label>Full name *</label><input name="full_name" required value="${LabourApp.escapeHTML(employee.full_name||employee.name||"")}"></div>
        <div class="field"><label>Employee code</label><input name="employee_code" value="${LabourApp.escapeHTML(employee.employee_code||employee.code||"")}"></div>
        <div class="field"><label>Phone</label><input name="phone" type="tel" value="${LabourApp.escapeHTML(employee.phone||employee.phone_number||"")}"></div>
        <div class="field"><label>Email</label><input name="email" type="email" value="${LabourApp.escapeHTML(employee.email||"")}"></div>
        <div class="field"><label>Daily wage *</label><input name="daily_wage" type="number" min="0" step="0.01" required value="${employee.daily_wage ?? LabourApp.getSettings().defaultDailyWage ?? 0}"></div>
        <div class="field"><label>Employment status</label><select name="employment_status"><option value="active" ${employee.employment_status==="inactive"?"":"selected"}>Active</option><option value="inactive" ${employee.employment_status==="inactive"?"selected":""}>Inactive</option></select></div>
      </div>
      <div class="field"><label>Address</label><textarea name="address">${LabourApp.escapeHTML(employee.address||"")}</textarea></div>
    </form>`;
  }
  async function render(container) {
    container.innerHTML = `<div class="loading">Loading employees...</div>`;
    await load(container);
  }
  async function load(container) {
    try {
      const { data, error } = await LabourDB.client.from("employees").select("*").order("full_name");
      if (error) throw error;
      const rows = data || [];
      container.innerHTML = `<section class="panel"><div class="panel-head"><h2>Employee list</h2><div class="toolbar"><input class="field search" id="employeeSearch" placeholder="Search employees"><button class="btn btn-primary" id="addEmployee">+ Add employee</button></div></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Phone</th><th>Daily wage</th><th>Status</th><th>Actions</th></tr></thead><tbody id="employeeRows">${rows.map(employeeRow).join("")}</tbody></table>${rows.length?"":'<div class="empty">No employees yet. Add your first employee.</div>'}</div></section>`;
      document.getElementById("employeeSearch").oninput = event => {
        const q = event.target.value.toLowerCase();
        document.querySelectorAll("#employeeRows tr").forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none");
      };
      document.getElementById("addEmployee").onclick = () => openEmployeeModal(container);
      document.querySelectorAll("[data-edit-employee]").forEach(btn => btn.onclick = () => openEmployeeModal(container, rows.find(r => r.id === btn.dataset.editEmployee)));
      document.querySelectorAll("[data-delete-employee]").forEach(btn => btn.onclick = async () => {
        if (!await LabourApp.confirmDialog("Delete employee", "This employee and their related visible records may be affected. Continue?")) return;
        const { error } = await LabourDB.client.from("employees").delete().eq("id", btn.dataset.deleteEmployee);
        if (error) LabourApp.toast(error.message, "error"); else { LabourApp.toast("Employee deleted.","success"); await load(container); }
      });
    } catch (error) { container.innerHTML = `<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message)}</div></div>`; }
  }
  function employeeRow(e) {
    const status = e.employment_status || "active";
    return `<tr><td><strong>${LabourApp.escapeHTML(e.full_name||e.name||"-")}</strong></td><td>${LabourApp.escapeHTML(e.employee_code||e.code||"-")}</td><td>${LabourApp.escapeHTML(e.phone||e.phone_number||"-")}</td><td>${LabourApp.money(e.daily_wage||0)}</td><td><span class="status status-${status}">${LabourApp.escapeHTML(status)}</span></td><td><div class="actions"><button class="action-btn" data-edit-employee="${e.id}" type="button">Edit</button><button class="action-btn danger" data-delete-employee="${e.id}" type="button">Delete</button></div></td></tr>`;
  }
  function openEmployeeModal(container, employee) {
    const el = LabourApp.modal(employee?"Edit employee":"Add employee", form(employee), `<button class="btn" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="button" data-save>Save employee</button>`);
    el.querySelector("[data-cancel]").onclick = () => el.remove();
    el.querySelector("[data-save]").onclick = async () => {
      const formEl = el.querySelector("#employeeForm");
      if (!formEl.reportValidity()) return;
      const fd = new FormData(formEl);
      const payload = Object.fromEntries(fd.entries());
      payload.full_name = payload.full_name.trim();
      payload.daily_wage = Number(payload.daily_wage);
      const { data:{session} } = await LabourDB.client.auth.getSession();
      payload.user_id = session.user.id;
      let result = employee
        ? await LabourDB.client.from("employees").update(payload).eq("id",employee.id)
        : await LabourDB.client.from("employees").insert(payload);
      if (result.error) LabourApp.toast(result.error.message,"error");
      else { el.remove(); LabourApp.toast(employee?"Employee updated.":"Employee added.","success"); await load(container); }
    };
  }
  return { render };
})();
