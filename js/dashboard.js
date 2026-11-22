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
        fetchAll(db.from("employees").select("id,daily_wage")),
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
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message || "Unable to load dashboard.")}</div></div>`;
    }
  }
  return { render };
})();
