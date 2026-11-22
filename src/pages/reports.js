import { listEmployees } from '../services/employeeService.js';
import { listAttendance } from '../services/attendanceService.js';
import { listExpenses } from '../services/expenseService.js';
import { listPayments } from '../services/paymentService.js';
import { listPayroll } from '../services/payrollService.js';
import { table } from '../components/table.js';
import { exportCsv, printReport } from '../utils/export.js';
import { getSettings, formatMoney } from '../utils/currency.js';

export async function reportsPage(){
  const [settings,employees,attendance,expenses,payments,payroll]=await Promise.all([getSettings(),listEmployees(),listAttendance(),listExpenses(),listPayments(),listPayroll()]);
  window.__reportData={employees,attendance,expenses,payments,payroll};
  const labour=payroll.reduce((n,r)=>n+Number(r.gross_wages||0),0),additional=expenses.filter(r=>r.category!=='Labour').reduce((n,r)=>n+Number(r.amount||0),0),paid=payments.reduce((n,r)=>n+Number(r.amount||0),0),outstanding=payroll.reduce((n,r)=>n+Math.max(0,Number(r.net_wages||0)-Number(r.paid_amount||0)),0);
  const rows=employees.map(e=>{
    const a=attendance.filter(r=>r.employee_id===e.id),p=payroll.filter(r=>r.employee_id===e.id),pay=payments.filter(r=>r.employee_id===e.id);
    return {name:e.full_name,days:a.filter(r=>r.status==='present').length,half:a.filter(r=>r.status==='half_day').length,wages:p.reduce((n,r)=>n+Number(r.net_wages||0),0),payments:pay.reduce((n,r)=>n+Number(r.amount||0),0)};
  });
  const cols=[{label:'Employee',value:'name'},{label:'Full days',value:'days'},{label:'Half-days',value:'half'},{label:'Wages earned',value:r=>formatMoney(r.wages,settings.currency)},{label:'Payments',value:r=>formatMoney(r.payments,settings.currency)}];
  return `<div class="page"><div class="page-toolbar"><div class="filters"><input type="date" id="reportStart"><input type="date" id="reportEnd"><select id="reportEmployee"><option value="">All employees</option>${employees.map(e=>`<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}</select></div><div><button class="button secondary" id="exportCsv">Export CSV</button> <button class="button primary" id="printReport">Print / PDF</button></div></div>
  <div class="stat-grid">${stat('Labour costs',labour,settings.currency)}${stat('Additional expenses',additional,settings.currency)}${stat('Total payments',paid,settings.currency)}${stat('Outstanding wages',outstanding,settings.currency)}</div>
  <section class="card"><div class="card-header"><h2>Employee summary</h2></div>${table(cols,rows,'No report data found.')}</section></div>`;
}
export function bindReports(){
  document.querySelector('#exportCsv')?.addEventListener('click',()=>{
    const d=window.__reportData;const rows=d.employees.map(e=>{const p=d.payroll.filter(r=>r.employee_id===e.id),pay=d.payments.filter(r=>r.employee_id===e.id);return {name:e.full_name,wages:p.reduce((n,r)=>n+Number(r.net_wages||0),0),payments:pay.reduce((n,r)=>n+Number(r.amount||0),0)}});
    exportCsv('labour-report.csv',[{label:'Employee',value:'name'},{label:'Wages earned',value:'wages'},{label:'Payments',value:'payments'}],rows);
  });
  document.querySelector('#printReport')?.addEventListener('click',()=>printReport('Labour Book - Report'));
}
function stat(label,value,currency){return `<div class="card stat-card"><div class="stat-label">${label}</div><div class="stat-value">${formatMoney(value,currency)}</div></div>`}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
