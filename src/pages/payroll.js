import { listEmployees } from '../services/employeeService.js';
import { listAttendance } from '../services/attendanceService.js';
import { listPayroll, savePayroll } from '../services/payrollService.js';
import { modal } from '../components/modal.js';
import { table } from '../components/table.js';
import { toast } from '../components/notification.js';
import { getSettings, formatMoney } from '../utils/currency.js';

export async function payrollPage(){
  const [settings,rows,employees,attendance]=await Promise.all([getSettings(),listPayroll(),listEmployees(),listAttendance()]);
  const start=new Date();start.setDate(1);
  window.__payrollContext={employees,attendance,periodStart:start.toISOString().slice(0,10),periodEnd:new Date().toISOString().slice(0,10)};
  const columns=[
    {label:'Employee',value:r=>esc(r.employees?.full_name||'-')},{label:'Period',value:r=>`${r.period_start} – ${r.period_end}`},
    {label:'Gross wages',value:r=>formatMoney(r.gross_wages,settings.currency)},{label:'Deductions',value:r=>formatMoney(r.deductions,settings.currency)},
    {label:'Net wages',value:r=>`<strong>${formatMoney(r.net_wages,settings.currency)}</strong>`},
    {label:'Status',value:r=>Number(r.paid_amount||0)<=0?'<span class="badge red">Unpaid</span>':Number(r.paid_amount||0)<Number(r.net_wages||0)?'<span class="badge blue">Partially paid</span>':'<span class="badge green">Fully paid</span>'}
  ];
  return `<div class="page"><div class="page-toolbar"><div class="filters"><select id="payrollPeriod"><option value="month">Monthly payroll</option><option value="week">Weekly payroll</option><option value="custom">Custom payroll</option></select><input id="payrollStart" type="date" value="${window.__payrollContext.periodStart}"><input id="payrollEnd" type="date" value="${window.__payrollContext.periodEnd}"></div><button class="button primary" id="generatePayroll">Generate payroll</button></div><section class="card"><div class="card-header"><h2>Payroll records</h2><span class="badge blue">${rows.length} records</span></div>${table(columns,rows,'No payroll records yet.')}</section></div>`;
}
export function bindPayroll(){
  document.querySelector('#generatePayroll')?.addEventListener('click',openPayroll);
  document.querySelector('#payrollPeriod')?.addEventListener('change',e=>{
    if(e.target.value==='week'){const end=new Date(),start=new Date();start.setDate(end.getDate()-6);document.querySelector('#payrollStart').value=start.toISOString().slice(0,10);document.querySelector('#payrollEnd').value=end.toISOString().slice(0,10)}
  });
}
async function openPayroll(){
  const ctx=window.__payrollContext, start=document.querySelector('#payrollStart')?.value||ctx.periodStart,end=document.querySelector('#payrollEnd')?.value||ctx.periodEnd;
  const data=await modal('Generate payroll',`<div class="form-grid">
    <div class="field"><label>Employee</label><select name="employee_id" required>${ctx.employees.map(e=>`<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}</select></div>
    <div class="field"><label>Period start</label><input name="period_start" type="date" required value="${start}"></div>
    <div class="field"><label>Period end</label><input name="period_end" type="date" required value="${end}"></div>
    <div class="field"><label>Additional earnings</label><input name="additional_earnings" type="number" min="0" step="0.01" value="0"></div>
    <div class="field"><label>Deductions</label><input name="deductions" type="number" min="0" step="0.01" value="0"></div>
    <div class="field"><label>Advances</label><input name="advance_amount" type="number" min="0" step="0.01" value="0"></div>
    </div><p class="badge blue">Wages are calculated from attendance records and the wage rate saved on each record.</p>`,'Calculate & save');
  if(!data)return;
  try{
    const employee=ctx.employees.find(e=>e.id===data.employee_id);
    const records=ctx.attendance.filter(r=>r.employee_id===data.employee_id&&r.date>=data.period_start&&r.date<=data.period_end);
    let gross=0,full=0,half=0,hours=0;
    records.forEach(r=>{const daily=Number(r.wage_applicable||employee?.daily_wage||0);if(r.status==='present')gross+=daily,full++;else if(r.status==='half_day')gross+=daily/2,half++;hours+=Number(r.hours_worked||0)});
    const additional=Number(data.additional_earnings||0), deductions=Number(data.deductions||0), advances=Number(data.advance_amount||0);
    const net=gross+additional-deductions-advances;
    await savePayroll({employee_id:data.employee_id,period_start:data.period_start,period_end:data.period_end,full_days:full,half_days:half,total_hours:hours,gross_wages:gross,additional_earnings:additional,deductions,advance_amount:advances,net_wages:net,paid_amount:0});
    toast(`Payroll saved. Net wages: ${net}`,'success');location.reload();
  }catch(e){toast(e.message,'error')}
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
