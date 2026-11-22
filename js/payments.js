window.LabourPayments = (() => {
  const PAGE_SIZE = 1000;

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
    container.innerHTML = `<div class="loading">Calculating employee balances...</div>`;
    await load(container);
  }

  async function load(container) {
    try {
      const [employees, attendance, payments] = await Promise.all([
        fetchAll(LabourDB.client.from("employees").select("id,full_name,daily_wage,employment_status").order("full_name")),
        fetchAll(LabourDB.client.from("attendance").select("employee_id,date,status,created_at").order("date").order("created_at")),
        fetchAll(LabourDB.client.from("payments").select("*").order("payment_date", { ascending: false }))
      ]);
      const balances = calculateBalances(employees, attendance, payments);
      const paidTotal = payments.reduce((sum, payment) => sum + paidAmount(payment), 0);
      const earnedTotal = balances.reduce((sum, employee) => sum + employee.earned, 0);
      const outstandingTotal = balances.reduce((sum, employee) => sum + employee.outstanding, 0);

      container.innerHTML = `
        <div class="cards">
          <article class="stat-card accent"><div class="label">Total wages earned</div><div class="value">${LabourApp.money(earnedTotal)}</div></article>
          <article class="stat-card"><div class="label">Payments made</div><div class="value">${LabourApp.money(paidTotal)}</div></article>
          <article class="stat-card"><div class="label">Still need to pay</div><div class="value">${LabourApp.money(outstandingTotal)}</div></article>
          <article class="stat-card"><div class="label">Employees with balance</div><div class="value">${balances.filter(employee => employee.outstanding > 0).length}</div></article>
        </div>
        <section class="panel">
          <div class="panel-head"><div><h2>Employee wage balances</h2><span class="muted">Present days earn one daily wage; half-days earn half. Paid and advance payments reduce the balance.</span></div><button class="btn btn-primary" id="addPayment">+ Record payment</button></div>
          <div class="table-wrap"><table><thead><tr><th>Employee</th><th>Attendance days</th><th>Total earned</th><th>Paid</th><th>Still need to pay</th><th>Status</th></tr></thead><tbody id="balanceRows">${balances.map(balanceRow).join("")}</tbody></table>
          ${balances.length ? "" : '<div class="empty">Add employees and record attendance to calculate wages.</div>'}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Payment history</h2><input class="field search" id="paymentSearch" placeholder="Search payments"></div>
          <div class="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Amount</th><th>Payment status</th><th>Notes</th><th>Actions</th></tr></thead><tbody id="paymentRows">${payments.map(payment => paymentRow(payment, employees)).join("")}</tbody></table>
          ${payments.length ? "" : '<div class="empty">No payments have been recorded.</div>'}</div>
        </section>`;

      document.getElementById("paymentSearch").oninput = event => {
        const search = event.target.value.toLowerCase();
        document.querySelectorAll("#paymentRows tr").forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(search) ? "" : "none";
        });
      };
      document.getElementById("addPayment").onclick = () => openPayment(container, employees, balances);
      document.querySelectorAll("[data-edit-payment]").forEach(button => {
        const payment = payments.find(item => item.id === button.dataset.editPayment);
        button.onclick = () => openPayment(container, employees, balances, payment);
      });
      document.querySelectorAll("[data-delete-payment]").forEach(button => {
        button.onclick = async () => {
          if (!await LabourApp.confirmDialog("Delete payment", "Delete this payment record? The employee balance will be recalculated.")) return;
          const { error } = await LabourDB.client.from("payments").delete().eq("id", button.dataset.deletePayment);
          if (error) LabourApp.toast(error.message, "error");
          else {
            LabourApp.toast("Payment deleted. Balance recalculated.", "success");
            await load(container);
          }
        };
      });
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message || "Could not load wage balances.")}</div></div>`;
    }
  }

  function calculateBalances(employees, attendance, payments) {
    return employees.map(employee => {
      const byDate = new Map();
      attendance.filter(row => row.employee_id === employee.id).forEach(row => byDate.set(row.date, row));
      const days = [...byDate.values()].reduce((sum, row) => sum + (row.status === "present" ? 1 : row.status === "half-day" ? 0.5 : 0), 0);
      const earned = days * Number(employee.daily_wage || 0);
      const paid = payments
        .filter(payment => payment.employee_id === employee.id)
        .reduce((sum, payment) => sum + paidAmount(payment), 0);
      return { ...employee, days, earned, paid, outstanding: Math.max(0, earned - paid) };
    });
  }

  function paidAmount(payment) {
    const status = String(payment.status || "paid").toLowerCase();
    return status === "paid" || status === "partial" ? Number(payment.amount || 0) : 0;
  }

  function balanceRow(employee) {
    const status = employee.outstanding > 0 ? "pending" : employee.earned > 0 ? "paid" : "draft";
    const label = employee.outstanding > 0 ? "Needs payment" : employee.earned > 0 ? "Paid" : "No wages yet";
    return `<tr><td><strong>${LabourApp.escapeHTML(employee.full_name || "Employee")}</strong>${employee.employment_status === "inactive" ? ' <span class="muted">(inactive)</span>' : ""}</td><td>${LabourApp.number(employee.days)}</td><td>${LabourApp.money(employee.earned)}</td><td>${LabourApp.money(employee.paid)}</td><td><strong>${LabourApp.money(employee.outstanding)}</strong></td><td><span class="status status-${status}">${label}</span></td></tr>`;
  }

  function paymentRow(payment, employees) {
    const employee = employees.find(item => item.id === payment.employee_id);
    const status = payment.status || "paid";
    return `<tr><td>${LabourApp.formatDate(payment.payment_date || payment.date)}</td><td>${LabourApp.escapeHTML(employee?.full_name || "Employee")}</td><td>${LabourApp.escapeHTML(payment.payment_type || payment.type || "payment")}</td><td><strong>${LabourApp.money(payment.amount)}</strong></td><td><span class="status status-${LabourApp.escapeHTML(status)}">${LabourApp.escapeHTML(status)}</span></td><td>${LabourApp.escapeHTML(payment.notes || "-")}</td><td><div class="actions"><button class="action-btn" data-edit-payment="${payment.id}" type="button">Edit</button><button class="action-btn danger" data-delete-payment="${payment.id}" type="button">Delete</button></div></td></tr>`;
  }

  function openPayment(container, employees, balances, payment = null) {
    const employeeOptions = balances.map(employee => {
      const label = `${employee.full_name || "Employee"} — due ${LabourApp.money(employee.outstanding)}`;
      return `<option value="${employee.id}">${LabourApp.escapeHTML(label)}</option>`;
    }).join("");
    const el = LabourApp.modal(payment ? "Edit payment" : "Record a payment", `
      <form id="paymentForm" class="form-grid">
        <div class="two-cols">
          <div class="field"><label>Employee *</label><select name="employee_id" required><option value="">Select employee</option>${employeeOptions}</select></div>
          <div class="field"><label>Date *</label><input name="payment_date" type="date" required value="${payment?.payment_date || payment?.date || LabourApp.dateValue()}"></div>
          <div class="field"><label>Type *</label><select name="payment_type" required><option value="payment" ${!payment || (payment.payment_type || payment.type) === "payment" ? "selected" : ""}>Wage payment</option><option value="advance" ${(payment?.payment_type || payment?.type) === "advance" ? "selected" : ""}>Advance</option></select></div>
          <div class="field"><label>Amount paid *</label><input name="amount" type="number" min="0.01" step="0.01" required value="${payment?.amount ?? ""}"></div>
          <div class="field"><label>Payment status *</label><select name="status" required><option value="paid" ${!payment || payment.status === "paid" ? "selected" : ""}>Paid</option><option value="partial" ${payment?.status === "partial" ? "selected" : ""}>Partially paid</option><option value="pending" ${payment?.status === "pending" ? "selected" : ""}>Not paid yet</option></select></div>
        </div>
        <div class="field"><label>Notes</label><textarea name="notes">${LabourApp.escapeHTML(payment?.notes || "")}</textarea></div>
        <p class="muted payment-balance-hint">Paid and partial payments reduce the outstanding balance. Pending records do not.</p>
      </form>`, `
      <button class="btn" type="button" data-cancel>Cancel</button>
      <button class="btn btn-primary" type="button" data-save>${payment ? "Update payment" : "Save payment"}</button>`);

    if (payment) el.querySelector('[name="employee_id"]').value = payment.employee_id;

    el.querySelector("[data-cancel]").onclick = () => el.remove();
    el.querySelector("[data-save]").onclick = async () => {
      const form = el.querySelector("#paymentForm");
      if (!form.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.amount = Number(payload.amount);
      const { data: { session }, error: sessionError } = await LabourDB.client.auth.getSession();
      if (sessionError) {
        LabourApp.toast(sessionError.message, "error");
        return;
      }
      payload.user_id = session.user.id;
      const result = payment
        ? await LabourDB.client.from("payments").update(payload).eq("id", payment.id)
        : await LabourDB.client.from("payments").insert({ ...payload, user_id: session.user.id });
      const { error } = result;
      if (error) LabourApp.toast(error.message, "error");
      else {
        el.remove();
        LabourApp.toast("Payment saved. Employee balance recalculated.", "success");
        await load(container);
      }
    };
  }

  return { render };
})();
