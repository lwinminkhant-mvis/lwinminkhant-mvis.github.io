import { listEmployees } from '../services/employeeService.js';
import { listAttendance } from '../services/attendanceService.js';
import { listExpenses } from '../services/expenseService.js';
import { listPayments } from '../services/paymentService.js';
import { listPayroll } from '../services/payrollService.js';
import { getSettings, formatMoney } from '../utils/currency.js';
import { periodRange, formatDate, toDateInput } from '../utils/dates.js';
import { sum } from '../utils/calculations.js';

export async function dashboardPage() {
  const settings = await getSettings();
  const [today, monthEnd] = periodRange('month');
  const [employees, attendance, expenses, payments, payroll] = await Promise.all([
    listEmployees(), listAttendance(today, monthEnd), listExpenses(today, monthEnd), listPayments(), listPayroll()
  ]);
  const labourExpenses = expenses.filter(r => r.category === 'Labour').reduce((n,r)=>n+Number(r.amount||0),0);
  const additionalExpenses = expenses.filter(r => r.category !== 'Labour').reduce((n,r)=>n+Number(r.amount||0),0);
  const wagesEarned = sum(payroll, 'net_wages');
  const totalPaid = sum(payments, 'amount');
  const unpaid = payroll.reduce((n,r)=>n+Math.max(0,Number(r.net_wages||0)-Number(r.paid_amount||0)),0);
  const advances = payroll.reduce((n,r)=>n+Number(r.advance_amount||0),0);
  const todayKey = toDateInput();
  const workedToday = new Set(attendance.filter(r => r.date === todayKey && r.status !== 'absent').map(r => r.employee_id)).size;
  const active = employees.filter(r => r.active !== false).length;

  const recentAttendance = attendance.slice(0,5);
  const recentExpenses = expenses.slice(0,5);
  const recentPayments = payments.slice(0,5);
  const categoryTotals = {};
  expenses.forEach(r => categoryTotals[r.category || 'Other'] = (categoryTotals[r.category || 'Other'] || 0) + Number(r.amount||0));
  const bars = Object.entries(categoryTotals).slice(0,7);
  const max = Math.max(...bars.map(([,v])=>v),1);

  return `<div class="page">
    <div class="page-toolbar"><div class="filters"><select id="dashboardPeriod"><option value="month">This month</option><option value="today">Today</option><option value="week">This week</option></select><input id="dashboardStart" type="date"><input id="dashboardEnd" type="date"></div></div>
    <div class="stat-grid">
      ${stat('Labour expenses', formatMoney(labourExpenses, settings.currency), 'bad')}
      ${stat('Additional expenses', formatMoney(additionalExpenses, settings.currency), 'bad')}
      ${stat('Wages earned', formatMoney(wagesEarned, settings.currency))}
      ${stat('Amount paid', formatMoney(totalPaid, settings.currency), 'good')}
      ${stat('Unpaid wages', formatMoney(unpaid, settings.currency), 'bad')}
      ${stat('Outstanding advances', formatMoney(advances, settings.currency), 'bad')}
      ${stat('Registered employees', active)}
      ${stat('Worked today', `${workedToday} / ${active}`, workedToday ? 'good' : '')}
    </div>
    <div class="dashboard-grid">
      ${miniCard('Recent attendance', recentAttendance.map(r=>`<div class="detail-item"><strong>${r.employees?.full_name || 'Employee'}</strong><br><small>${formatDate(r.date, settings.dateFormat)} · ${r.status?.replace('_',' ')}</small></div>`).join('') || '<div class="empty-state">No attendance records</div>', 'span-2')}
      ${miniCard('Recent expenses', recentExpenses.map(r=>`<div class="detail-item"><strong>${r.title}</strong><br><small>${formatMoney(r.amount, settings.currency)} · ${formatDate(r.date, settings.dateFormat)}</small></div>`).join('') || '<div class="empty-state">No expense records</div>')}
      ${miniCard('Recent payments', recentPayments.map(r=>`<div class="detail-item"><strong>${r.employees?.full_name || 'Employee'}</strong><br><small>${formatMoney(r.amount, settings.currency)} · ${formatDate(r.payment_date, settings.dateFormat)}</small></div>`).join('') || '<div class="empty-state">No payment records</div>')}
      ${miniCard('Monthly expense chart', bars.length ? `<div class="chart-bars">${bars.map(([label,value])=>`<div class="chart-bar" style="height:${Math.round(value/max*130)}px" title="${label}: ${formatMoney(value, settings.currency)}"><span>${label}</span></div>`).join('')}</div>` : '<div class="empty-state">No expense data</div>', 'span-2')}
    </div>
  </div>`;
}
function stat(label, value, tone=''){return `<div class="card stat-card"><div class="stat-label">${label}</div><div class="stat-value ${tone}">${value}</div></div>`}
function miniCard(title, body, extra=''){return `<section class="card ${extra}"><div class="card-header"><h2>${title}</h2></div><div class="card-body details-grid">${body}</div></section>`}
