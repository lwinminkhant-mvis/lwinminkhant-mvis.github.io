window.LabourDashboard = (() => {
  async function render(container) {
    container.innerHTML = `<div class="loading">Loading dashboard...</div>`;
    try {
      const db = LabourDB.client;
      const [employees, attendance, expenses, payments, payroll] = await Promise.all([
        db.from("employees").select("*"),
        db.from("attendance").select("*").eq("date", LabourApp.dateValue()),
        db.from("expenses").select("*"),
        db.from("payments").select("*"),
        db.from("payroll").select("*")
      ]);
      [employees, attendance, expenses, payments, payroll].forEach(r => { if (r.error) throw r.error; });
      const month = LabourApp.dateValue().slice(0,7);
      const monthlyExpenses = (expenses.data || []).filter(x => String(x.expense_date || x.date || "").startsWith(month)).reduce((s,x)=>s+Number(x.amount||0),0);
      const outstanding = (payments.data || []).filter(x => String(x.status || "").toLowerCase() !== "paid").reduce((s,x)=>s+Math.max(0,Number(x.balance||0)),0);
      const wages = (payroll.data || []).reduce((s,x)=>s+Number(x.net_wages ?? x.net_pay ?? 0),0);
      const empCount = (employees.data || []).length;
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
            <div class="list-item"><span>Payroll records</span><strong>${(payroll.data||[]).length}</strong></div>
            <div class="list-item"><span>Payment records</span><strong>${(payments.data||[]).length}</strong></div>
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
