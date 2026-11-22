window.LabourPayments = (() => {
  const PAGE_SIZE = 1000;
  let employees = [];
  let attendance = [];
  let payments = [];

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
      const [employeeRows, attendanceRows, paymentRows] = await Promise.all([
        fetchAll(LabourDB.client.from("employees")
          .select("id,full_name,daily_wage,employment_status").order("full_name")),
        fetchAll(LabourDB.client.from("attendance")
          .select("employee_id,date,status,created_at").order("date").order("created_at")),
        fetchAll(LabourDB.client.from("payments")
          .select("*").order("payment_date", { ascending: false }))
      ]);
      employees = employeeRows;
      attendance = deduplicateAttendance(attendanceRows);
      payments = paymentRows;
      renderPage(container);
    } catch (error) {
      container.innerHTML = `<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message || "Could not load wage balances.")}</div></div>`;
    }
  }

  function deduplicateAttendance(rows) {
    const byEmployeeDate = new Map();
    rows.forEach(row => byEmployeeDate.set(`${row.employee_id}:${row.date}`, row));
    return [...byEmployeeDate.values()];
  }

  function renderPage(container) {
    const currentMonth = LabourApp.dateValue().slice(0, 7);
    container.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div><h2>Employee wage balance</h2><span class="muted">Choose month or year. Click an employee's name to record a payment.</span></div>
          <div class="toolbar">
            <label class="period-control"><span>Balance period</span><select id="balancePeriod"><option value="month">Month</option><option value="year">Year</option></select></label>
            <input id="balancePeriodValue" type="month" value="${currentMonth}" aria-label="Wage balance period">
          </div>
        </div>
        <div id="wageBalanceContent"></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Payment history</h2><input class="field search" id="paymentSearch" placeholder="Search payments"></div>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Amount</th><th>Payment status</th><th>Notes</th><th>Actions</th></tr></thead><tbody id="paymentRows">${payments.map(paymentRow).join("")}</tbody></table>
        ${payments.length ? "" : '<div class="empty">No payments have been recorded.</div>'}</div>
      </section>
      <section class="panel monthly-payment-panel">
        <div class="panel-head">
          <div><h2>Monthly payments</h2><span class="muted">Positive balance means we owe the employee; negative means the employee owes us. Advances are included.</span></div>
          <div class="toolbar">
            <label class="period-control"><span>Month</span><input id="monthlyPaymentPeriod" type="month" value="${currentMonth}"></label>
            <button class="btn btn-primary" id="payAllDue" type="button">Pay all outstanding</button>
          </div>
        </div>
        <div id="monthlyPaymentContent"></div>
      </section>`;

    document.getElementById("monthlyPaymentPeriod").onchange = () => {
      renderMonthlyPayments(container);
      bindBalanceLinks(container);
    };
    document.getElementById("payAllDue").onclick = () => recordAllOutstanding(container);
    document.getElementById("balancePeriod").onchange = () => {
      updateBalancePeriodInput();
      renderWageBalances(container);
      bindBalanceLinks(container);
    };
    document.getElementById("balancePeriodValue").onchange = () => {
      renderWageBalances(container);
      bindBalanceLinks(container);
    };
    document.getElementById("paymentSearch").oninput = event => {
      const search = event.target.value.toLowerCase();
      document.querySelectorAll("#paymentRows tr").forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? "" : "none";
      });
    };
    renderMonthlyPayments(container);
    renderWageBalances(container);
    bindPaymentActions(container);
  }

  function renderMonthlyPayments(container) {
    const value = document.getElementById("monthlyPaymentPeriod").value;
    const content = document.getElementById("monthlyPaymentContent");
    if (!value) {
      content.innerHTML = `<div class="empty">Choose a month.</div>`;
      return;
    }
    const rows = calculateBalances(employees, attendance, payments, "month", value);
    const attendanceDays = rows.reduce((sum, row) => sum + row.days, 0);
    const earned = rows.reduce((sum, row) => sum + row.earned, 0);
    const takenOut = rows.reduce((sum, row) => sum + row.paid, 0);
    const carry = rows.reduce((sum, row) => sum + row.carry, 0);
    const due = rows.reduce((sum, row) => sum + row.balance, 0);
    content.innerHTML = `
      <div class="monthly-ledger-summary">
        <div><span>Attendance days</span><strong>${LabourApp.number(attendanceDays)}</strong></div>
        <div><span>Need to pay this month</span><strong>${LabourApp.money(earned)}</strong></div>
        <div><span>Taken out, including advances</span><strong>${LabourApp.money(takenOut)}</strong></div>
        <div><span>Left from earlier months</span><strong>${signedMoney(carry)}</strong></div>
        <div><span>Amount left to give</span><strong class="signed-balance ${due < 0 ? "negative" : "positive"}">${signedMoney(due)}</strong></div>
      </div>
      <div class="monthly-ledger-grid">${rows.map(row => monthlyLedgerCard(row, value)).join("")}
      ${rows.length ? "" : '<div class="empty">No employees found.</div>'}</div>`;
  }

  function renderWageBalances(container) {
    const period = document.getElementById("balancePeriod").value;
    const value = document.getElementById("balancePeriodValue").value;
    const content = document.getElementById("wageBalanceContent");
    if (!value) {
      content.innerHTML = `<div class="empty">Choose a balance period.</div>`;
      return;
    }
    const rows = calculateBalances(employees, attendance, payments, period, value);
    const earned = rows.reduce((sum, row) => sum + row.earned, 0);
    const paid = rows.reduce((sum, row) => sum + row.paid, 0);
    const carry = rows.reduce((sum, row) => sum + row.carry, 0);
    const remaining = rows.reduce((sum, row) => sum + row.balance, 0);
    content.innerHTML = `
      <div class="wage-balance-summary"><span>${period === "month" ? monthLabel(value) : value} totals</span><strong>Earned ${LabourApp.money(earned)}</strong><strong>Taken out ${LabourApp.money(paid)}</strong><strong>Prior balance ${signedMoney(carry)}</strong><strong>Amount left to give ${signedMoney(remaining)}</strong></div>
      <div class="table-wrap"><table><thead><tr><th>Period</th><th>Employee</th><th>Attendance days</th><th>Daily wage</th><th>Need to pay in period</th><th>Taken out (incl. advances)</th><th>Left before period</th><th>Amount left to give</th></tr></thead>
      <tbody>${rows.map(row => balanceTableRow(row, period, value)).join("")}</tbody></table>
      ${rows.length ? "" : '<div class="empty">No employees found.</div>'}</div>`;
  }

  function calculateBalances(employeeRows, attendanceRows, paymentRows, period, value) {
    const periodStart = period === "month" ? `${value}-01` : `${value}-01-01`;
    return employeeRows.map(employee => {
      const periodAttendance = attendanceRows.filter(row =>
        row.employee_id === employee.id && isInPeriod(row.date, period, value));
      const previousAttendance = attendanceRows.filter(row =>
        row.employee_id === employee.id && row.date && row.date < periodStart);
      const days = periodAttendance.reduce((sum, row) =>
        sum + (row.status === "present" ? 1 : row.status === "half-day" ? 0.5 : 0), 0);
      const earned = days * Number(employee.daily_wage || 0);
      const paid = paymentRows.filter(payment =>
        payment.employee_id === employee.id && paymentInPeriod(payment, period, value)
      ).reduce((sum, payment) => sum + paidAmount(payment), 0);
      const previousDays = previousAttendance.reduce((sum, row) =>
        sum + (row.status === "present" ? 1 : row.status === "half-day" ? 0.5 : 0), 0);
      const previousPaid = paymentRows.filter(payment => {
        const paymentDate = accountingDate(payment);
        return payment.employee_id === employee.id && paymentDate && paymentDate < periodStart;
      }).reduce((sum, payment) => sum + paidAmount(payment), 0);
      const carry = previousDays * Number(employee.daily_wage || 0) - previousPaid;
      return { ...employee, days, earned, paid, carry, balance: carry + earned - paid };
    });
  }

  function isInPeriod(date, period, value) {
    if (!date) return false;
    return period === "month" ? String(date).startsWith(value) : String(date).startsWith(value);
  }

  function paymentInPeriod(payment, period, value) {
    return isInPeriod(accountingDate(payment), period, value);
  }

  function accountingDate(payment) {
    const taggedMonth = String(payment.notes || "").match(/\[wage-month:(\d{4}-\d{2})\]/i);
    return taggedMonth ? `${taggedMonth[1]}-01` : payment.payment_date || payment.date;
  }

  function visibleNotes(notes) {
    return String(notes || "").replace(/\[wage-month:\d{4}-\d{2}\]\s*/i, "").trim();
  }

  function saveNotes(notes, period, value) {
    const clean = visibleNotes(notes);
    if (period === "month" && /^\d{4}-\d{2}$/.test(value || "")) {
      return `[wage-month:${value}]${clean ? ` ${clean}` : ""}`;
    }
    return clean || null;
  }

  function paidAmount(payment) {
    const status = String(payment.status || "paid").toLowerCase();
    return status === "paid" || status === "partial" ? Number(payment.amount || 0) : 0;
  }

  function balanceTableRow(employee, period, value) {
    const periodName = period === "month" ? monthLabel(value) : value;
    const status = employee.balance > 0 ? "pending" : employee.balance < 0 ? "partial" : employee.earned > 0 ? "paid" : "draft";
    const label = employee.balance > 0 ? "We owe them" : employee.balance < 0 ? "They owe us" : employee.earned > 0 ? "Settled" : "No wages yet";
    return `<tr>
      <td>${LabourApp.escapeHTML(periodName)}</td>
      <td><button class="employee-payment-link" type="button" data-pay-employee="${employee.id}" data-pay-period="${period}" data-pay-value="${value}"><span class="employee-payment-avatar">${LabourApp.escapeHTML(initials(employee.full_name))}</span><span class="employee-payment-name">${LabourApp.escapeHTML(employee.full_name || "Employee")}</span></button>${employee.employment_status === "inactive" ? ' <span class="muted">(inactive)</span>' : ""}</td>
      <td>${LabourApp.number(employee.days)}</td><td>${LabourApp.money(employee.daily_wage || 0)}</td>
      <td>${LabourApp.money(employee.earned)}</td><td>${LabourApp.money(employee.paid)}</td><td>${signedMoney(employee.carry)}</td>
      <td><strong class="signed-balance ${employee.balance < 0 ? "negative" : "positive"}">${signedMoney(employee.balance)}</strong><br><span class="status status-${status}">${label}</span></td>
    </tr>`;
  }

  function monthlyLedgerCard(employee, month) {
    const owed = employee.balance > 0;
    const label = owed ? "We owe them" : employee.balance < 0 ? "They owe us" : "Settled";
    const status = owed ? "pending" : employee.balance < 0 ? "partial" : "paid";
    return `<article class="monthly-ledger-card">
      <header class="monthly-ledger-card-head">
        <button class="monthly-ledger-name" type="button" data-pay-employee="${employee.id}" data-pay-period="month" data-pay-value="${month}">
          <span class="employee-payment-avatar">${LabourApp.escapeHTML(initials(employee.full_name))}</span>
          <span><strong data-no-translate>${LabourApp.escapeHTML(employee.full_name || "Employee")}</strong><small>Click to record payment</small></span>
        </button>
        <span class="status status-${status}">${label}</span>
      </header>
      <div class="monthly-ledger-details">
        <div><span>Month</span><strong>${LabourApp.escapeHTML(monthLabel(month))}</strong></div>
        <div><span>Attendance days</span><strong>${LabourApp.number(employee.days)}</strong></div>
        <div><span>Daily wage</span><strong>${LabourApp.money(employee.daily_wage || 0)}</strong></div>
        <div><span>Need to pay this month</span><strong>${LabourApp.money(employee.earned)}</strong></div>
        <div><span>Taken out, including advances</span><strong>${LabourApp.money(employee.paid)}</strong></div>
        <div><span>Left from other months</span><strong class="signed-balance ${employee.carry < 0 ? "negative" : "positive"}">${signedMoney(employee.carry)}</strong></div>
        <div class="monthly-ledger-final"><span>Amount left to give</span><strong class="signed-balance ${employee.balance < 0 ? "negative" : "positive"}">${signedMoney(employee.balance)}</strong></div>
      </div>
    </article>`;
  }

  function paymentRow(payment) {
    const employee = employees.find(item => item.id === payment.employee_id);
    const status = payment.status || "paid";
    return `<tr><td>${LabourApp.formatDate(payment.payment_date || payment.date)}</td><td>${LabourApp.escapeHTML(employee?.full_name || "Employee")}</td><td>${LabourApp.escapeHTML(payment.payment_type || payment.type || "payment")}</td><td><strong>${LabourApp.money(payment.amount)}</strong></td><td><span class="status status-${LabourApp.escapeHTML(status)}">${LabourApp.escapeHTML(status)}</span></td><td>${LabourApp.escapeHTML(visibleNotes(payment.notes) || "-")}</td><td><div class="actions"><button class="action-btn" data-edit-payment="${payment.id}" type="button">Edit</button><button class="action-btn danger" data-delete-payment="${payment.id}" type="button">Delete</button></div></td></tr>`;
  }

  function bindPaymentActions(container) {
    bindBalanceLinks(container);
    document.querySelectorAll("[data-edit-payment]").forEach(button => {
      const payment = payments.find(item => item.id === button.dataset.editPayment);
      if (!payment) return;
      const wageMonth = String(payment.notes || "").match(/\[wage-month:(\d{4}-\d{2})\]/i)?.[1] || "";
      button.onclick = () => openPayment(container, employees.find(item => item.id === payment.employee_id), null, "month", wageMonth, payment);
    });
    document.querySelectorAll("[data-delete-payment]").forEach(button => {
      button.onclick = async () => {
        if (!await LabourApp.confirmDialog("Delete payment", "Delete this payment record? Wage balances will be recalculated.")) return;
        const { error } = await LabourDB.client.from("payments").delete().eq("id", button.dataset.deletePayment);
        if (error) LabourApp.toast(error.message, "error");
        else {
          LabourApp.toast("Payment deleted. Wage balances recalculated.", "success");
          await load(container);
        }
      };
    });
  }

  function bindBalanceLinks(container) {
    document.querySelectorAll("[data-pay-employee]").forEach(button => {
      button.onclick = () => {
        const employee = employees.find(item => item.id === button.dataset.payEmployee);
        const row = calculateBalances(employees, attendance, payments, button.dataset.payPeriod, button.dataset.payValue)
          .find(item => item.id === button.dataset.payEmployee);
        openPayment(container, employee, row, button.dataset.payPeriod, button.dataset.payValue);
      };
    });
  }

  async function recordAllOutstanding(container) {
    const month = document.getElementById("monthlyPaymentPeriod").value;
    if (!month) {
      LabourApp.toast("Choose a month first.", "error");
      return;
    }
    const rows = calculateBalances(employees, attendance, payments, "month", month)
      .filter(employee => employee.balance > 0);
    if (!rows.length) {
      LabourApp.toast("There are no outstanding wages for this month.", "error");
      return;
    }
    const total = rows.reduce((sum, employee) => sum + employee.balance, 0);
    const el = LabourApp.modal("Record all monthly payments", `
      <p>This records each positive balance, including any amount carried from earlier months, as <strong>paid</strong> for ${rows.length} employees.</p>
      <p>Total to record: <strong>${LabourApp.money(total)}</strong></p>
      <form id="bulkPaymentForm" class="form-grid"><div class="field"><label>Payment date *</label><input name="payment_date" type="date" required value="${LabourApp.dateValue()}"></div></form>
      <p class="muted">The selected month is used for wage-balance calculations; the chosen date records when the money was paid.</p>`, `
      <button class="btn" type="button" data-cancel>Cancel</button>
      <button class="btn btn-primary" type="button" data-confirm>Record all as paid</button>`);
    el.querySelector("[data-cancel]").onclick = () => el.remove();
    el.querySelector("[data-confirm]").onclick = async () => {
      const form = el.querySelector("#bulkPaymentForm");
      if (!form.reportValidity()) return;
      try {
        const { data: { session }, error: sessionError } = await LabourDB.client.auth.getSession();
        if (sessionError) throw sessionError;
        const paymentDate = new FormData(form).get("payment_date");
        const rowsToInsert = rows.map(employee => ({
          user_id: session.user.id,
          employee_id: employee.id,
          payment_date: paymentDate,
          payment_type: "payment",
          amount: employee.balance,
          status: "paid",
          notes: saveNotes("Monthly wages", "month", month)
        }));
        const { error } = await LabourDB.client.from("payments").insert(rowsToInsert);
        if (error) throw error;
        el.remove();
        LabourApp.toast("Monthly payments recorded.", "success");
        await load(container);
      } catch (error) {
        LabourApp.toast(error.message || "Could not record payments.", "error");
      }
    };
  }

  function openPayment(container, employee, balance, period, value, existingPayment = null) {
    const label = employee?.full_name || "Employee";
    const defaultAmount = existingPayment?.amount ?? (balance?.balance > 0 ? balance.balance : "");
    const statusValue = existingPayment?.status || "paid";
    const balanceDetails = balance
      ? `<p class="muted">This period earned ${LabourApp.money(balance.earned)}; taken out ${LabourApp.money(balance.paid)}; carried balance ${signedMoney(balance.carry)}; amount left to give ${signedMoney(balance.balance)}.</p>`
      : "";
    const el = LabourApp.modal(existingPayment ? "Edit payment" : `Record payment for ${label}`, `
      <form id="paymentForm" class="form-grid">
        <div class="two-cols">
          <div class="field"><label>Employee</label><input value="${LabourApp.escapeHTML(label)}" disabled></div>
          <div class="field"><label>Period</label><input value="${value ? (period === "month" ? monthLabel(value) : value) : "Payment history"}" disabled></div>
          <div class="field"><label>Payment date *</label><input name="payment_date" type="date" required value="${existingPayment?.payment_date || existingPayment?.date || LabourApp.dateValue()}"></div>
          <div class="field"><label>Type *</label><select name="payment_type" required><option value="payment" ${!existingPayment || (existingPayment.payment_type || existingPayment.type) === "payment" ? "selected" : ""}>Wage payment</option><option value="advance" ${(existingPayment?.payment_type || existingPayment?.type) === "advance" ? "selected" : ""}>Advance</option></select></div>
          <div class="field"><label>Amount paid *</label><input name="amount" type="number" min="0.01" step="0.01" required value="${defaultAmount}"></div>
          <div class="field"><label>Status *</label><select name="status" required><option value="paid" ${statusValue === "paid" ? "selected" : ""}>Paid</option><option value="partial" ${statusValue === "partial" ? "selected" : ""}>Partially paid</option><option value="pending" ${statusValue === "pending" ? "selected" : ""}>Not paid yet</option></select></div>
        </div>
        <div class="field"><label>Notes</label><textarea name="notes">${LabourApp.escapeHTML(visibleNotes(existingPayment?.notes || ""))}</textarea></div>
        ${balanceDetails}
        <p class="muted">Paid/partial amounts reduce the balance. Payments from a monthly row are applied to that wage month; the payment date records when money was paid.</p>
      </form>`, `
      <button class="btn" type="button" data-cancel>Cancel</button>
      <button class="btn btn-primary" type="button" data-save>${existingPayment ? "Update payment" : "Save payment"}</button>`);

    el.querySelector("[data-cancel]").onclick = () => el.remove();
    el.querySelector("[data-save]").onclick = async () => {
      const form = el.querySelector("#paymentForm");
      if (!form.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.employee_id = employee?.id || existingPayment?.employee_id;
      if (!payload.employee_id) {
        LabourApp.toast("The selected employee could not be found.", "error");
        return;
      }
      payload.amount = Number(payload.amount);
      payload.notes = saveNotes(payload.notes, period, value);
      try {
        const { data: { session }, error: sessionError } = await LabourDB.client.auth.getSession();
        if (sessionError) throw sessionError;
        payload.user_id = session.user.id;
        const result = existingPayment
          ? await LabourDB.client.from("payments").update(payload).eq("id", existingPayment.id)
          : await LabourDB.client.from("payments").insert(payload);
        if (result.error) throw result.error;
        el.remove();
        LabourApp.toast("Payment saved. Wage balances recalculated.", "success");
        await load(container);
      } catch (error) {
        LabourApp.toast(error.message || "Could not save payment.", "error");
      }
    };
  }

  function updateBalancePeriodInput() {
    const period = document.getElementById("balancePeriod").value;
    const input = document.getElementById("balancePeriodValue");
    const previous = input.value;
    input.value = "";
    if (period === "year") {
      input.type = "number";
      input.min = "2000";
      input.max = "2100";
      input.value = previous.slice(0, 4) || LabourApp.dateValue().slice(0, 4);
    } else {
      input.type = "month";
      input.removeAttribute("min");
      input.removeAttribute("max");
      input.value = previous.length === 4 ? `${previous}-01` : previous.slice(0, 7);
    }
  }

  function monthLabel(value) {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return value;
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function signedMoney(value) {
    const amount = Number(value || 0);
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return `${LabourApp.getSettings().currency || "MMK"} ${sign}${LabourApp.number(Math.abs(amount))}`;
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2)
      .map(part => part.charAt(0).toUpperCase()).join("");
  }

  return { render };
})();
