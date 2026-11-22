window.LabourDashboard = (() => {
  async function fetchAll(query) {
    const records = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await query.range(from, from + 999);
      if (error) throw error;
      records.push(...(data || []));
      if (!data || data.length < 1000) return records;
    }
  }

  async function render(container) {
    container.innerHTML = `<div class="loading">Loading dashboard...</div>`;
    try {
      const db = LabourDB.client;
      const [employees, attendance, allAttendance, expenses, payments, payroll] = await Promise.all([
        fetchAll(db.from("employees").select("id,full_name,employee_code,phone,daily_wage,employment_status").order("full_name")),
        db.from("attendance").select("*").eq("date", LabourApp.dateValue()),
        fetchAll(db.from("attendance").select("employee_id,date,status,created_at").order("date").order("created_at")),
        fetchAll(db.from("expenses").select("*")),
        fetchAll(db.from("payments").select("amount,status")),
        fetchAll(db.from("payroll").select("id"))
      ]);
      [employees, attendance, expenses, payments, payroll].forEach(r => { if (r.error) throw r.error; });
      const month = LabourApp.dateValue().slice(0,7);
      const monthlyExpenses = expenses.filter(x => String(x.expense_date || x.date || "").startsWith(month)).reduce((s,x)=>s+Number(x.amount||0),0);
      const employeeWages = new Map(employees.map(employee => [employee.id, Number(employee.daily_wage || 0)]));
      const attendanceByEmployeeDay = new Map();
      allAttendance.forEach(record => attendanceByEmployeeDay.set(`${record.employee_id}:${record.date}`, record));
      const wages = [...attendanceByEmployeeDay.values()].reduce((sum, record) => {
        const dayFraction = record.status === "present" ? 1 : record.status === "half-day" ? 0.5 : 0;
        return sum + dayFraction * (employeeWages.get(record.employee_id) || 0);
      }, 0);
      const paid = payments.reduce((sum, payment) => {
        return ["paid", "partial"].includes(String(payment.status || "paid").toLowerCase())
          ? sum + Number(payment.amount || 0)
          : sum;
      }, 0);
      const outstanding = Math.max(0, wages - paid);
      const empCount = employees.length;
      const present = (attendance.data || []).filter(x => x.status === "present").length;
      container.innerHTML = `
        <div class="cards">
          <article class="stat-card accent"><div class="label">Total employees</div><div class="value">${empCount}</div></article>
          <article class="stat-card"><div class="label">Today's attendance</div><div class="value">${present}</div></article>
          <article class="stat-card"><div class="label">Total wages</div><div class="value">${LabourApp.money(wages)}</div></article>
          <article class="stat-card"><div class="label">Outstanding payments</div><div class="value">${LabourApp.money(outstanding)}</div></article>
        </div>
        <div class="grid-2">
          <section class="panel"><div class="panel-head"><h2>Monthly overview</h2><span class="muted">${month}</span></div><div style="padding:16px"><div class="list">
            <div class="list-item"><span>Monthly expenses</span><strong>${LabourApp.money(monthlyExpenses)}</strong></div>
            <div class="list-item"><span>Payroll records</span><strong>${payroll.length}</strong></div>
            <div class="list-item"><span>Payment records</span><strong>${payments.length}</strong></div>
          </div></div></section>
          <section class="panel"><div class="panel-head"><h2>Recent activity</h2></div><div class="list" style="padding:0 16px">
            ${(attendance.data||[]).slice(0,6).map(a=>`<div class="list-item"><span>Attendance recorded</span><strong>${LabourApp.escapeHTML(a.status||"Recorded")}</strong></div>`).join("") || `<div class="empty">No activity today</div>`}
          </div></section>
        </div>`;
      container.insertAdjacentHTML("beforeend", `
        <section class="panel dashboard-expenses">
          <div class="panel-head">
            <div><h2>Expenses for selected day</h2><span class="muted">Choose today or another day to review its expenses.</span></div>
            <input id="dashboardExpenseDate" type="date" value="${LabourApp.dateValue()}" aria-label="Expenses date">
          </div>
          <div id="dashboardExpenseContent"></div>
        </section>
        <section class="panel dashboard-employees">
          <div class="panel-head">
            <div><h2>Employee information</h2><span class="muted">${employees.length} employee${employees.length === 1 ? "" : "s"}</span></div>
            <div class="toolbar"><input id="dashboardEmployeeSearch" class="field search" placeholder="Search employees" aria-label="Search employees"><a class="btn btn-primary" href="#employees">Manage employees</a></div>
          </div>
          <div class="table-wrap dashboard-employee-list">
            <table><thead><tr><th>Name</th><th>Code</th><th>Phone</th><th>Daily wage</th><th>Status</th></tr></thead>
            <tbody id="dashboardEmployeeRows">${employees.map(employeeRow).join("")}</tbody></table>
            ${employees.length ? "" : '<div class="empty">No employees added yet.</div>'}
          </div>
        </section>`);
      const expenseDate = document.getElementById("dashboardExpenseDate");
      expenseDate.onchange = () => renderDailyExpenses(expenses, expenseDate.value);
      renderDailyExpenses(expenses, expenseDate.value);
      document.getElementById("dashboardEmployeeSearch").oninput = event => {
        const search = event.target.value.toLowerCase();
        document.querySelectorAll("#dashboardEmployeeRows tr").forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(search) ? "" : "none";
        });
      };
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message || "Unable to load dashboard.")}</div></div>`;
    }
  }

  function employeeRow(employee) {
    const status = employee.employment_status || "active";
    return `<tr><td><strong>${LabourApp.escapeHTML(employee.full_name || "Employee")}</strong></td><td>${LabourApp.escapeHTML(employee.employee_code || "-")}</td><td>${LabourApp.escapeHTML(employee.phone || "-")}</td><td>${LabourApp.money(employee.daily_wage || 0)}</td><td><span class="status status-${LabourApp.escapeHTML(status)}">${LabourApp.escapeHTML(status)}</span></td></tr>`;
  }

  function renderDailyExpenses(expenses, date) {
    const content = document.getElementById("dashboardExpenseContent");
    if (!content) return;
    if (!date) {
      content.innerHTML = `<div class="empty">Choose a date to view expenses.</div>`;
      return;
    }
    const rows = expenses.filter(expense => (expense.expense_date || expense.date) === date);
    const total = rows.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    content.innerHTML = `
      <div class="daily-expense-total"><span>${LabourApp.formatDate(date)} total</span><strong>${LabourApp.money(total)}</strong></div>
      <div class="table-wrap"><table><thead><tr><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${rows.map(expense => `<tr><td>${LabourApp.escapeHTML(expense.category || "-")}</td><td>${LabourApp.escapeHTML(expense.description || "-")}</td><td><strong>${LabourApp.money(expense.amount)}</strong></td></tr>`).join("")}</tbody></table>
      ${rows.length ? "" : '<div class="empty">No expenses recorded for this day.</div>'}</div>`;
  }

  return { render };
})();
