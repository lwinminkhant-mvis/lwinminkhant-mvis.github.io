import { listPayments, savePayment } from '../services/paymentService.js';
import { listEmployees } from '../services/employeeService.js';
import { listPayroll } from '../services/payrollService.js';
import { savePayroll } from '../services/payrollService.js';
import { modal } from '../components/modal.js';
import { table } from '../components/table.js';
import { toast } from '../components/notification.js';
import { getSettings, formatMoney } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';

export async function paymentsPage(){
  const [settings,rows,employees,payroll]=await Promise.all([getSettings(),listPayments(),listEmployees(),listPayroll()]);
  window.__paymentPayroll=payroll;
  const columns=[
    {label:'Date',value:r=>formatDate(r.payment_date,settings.dateFormat)},{label:'Employee',value:r=>esc(r.employees?.full_name||'-')},
    {label:'Amount',value:r=>`<strong>${formatMoney(r.amount,settings.currency)}</strong>`},{label:'Method',value:r=>esc(r.payment_method||'-')},
    {label:'Reference',value:r=>esc(r.reference_number||'-')},{label:'Description',value:r=>esc(r.description||'-')}
  ];
  return `<div class="page"><div class="page-toolbar"><div></div><button class="button primary" id="addPayment">+ Record payment</button></div><section class="card"><div class="card-header"><h2>Payments</h2><span class="badge blue">${rows.length} records</span></div>${table(columns,rows,'No payments recorded yet.')}</section></div>`;
}
export function bindPayments(){document.querySelector('#addPayment')?.addEventListener('click',openPayment)}
async function openPayment(){
  const [employees,payroll]=await Promise.all([listEmployees(),listPayroll()]);
  const data=await modal('Record payment',`<div class="form-grid">
    <div class="field"><label>Employee</label><select name="employee_id" required>${employees.map(e=>`<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}</select></div>
    <div class="field"><label>Payment date</label><input name="payment_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required></div>
    <div class="field"><label>Payment method</label><select name="payment_method">${['Cash','Bank','Mobile payment','Card','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Payroll period</label><select name="payroll_id"><option value="">Not linked</option>${payroll.map(p=>`<option value="${p.id}">${esc(p.employees?.full_name||'Employee')} · ${p.period_start}–${p.period_end}</option>`).join('')}</select></div>
    <div class="field"><label>Reference number</label><input name="reference_number"></div>
    <div class="field full"><label>Description</label><textarea name="description"></textarea></div></div>`,'Save payment');
  if(!data)return;
  try{await savePayment({...data,amount:Number(data.amount),payroll_id:data.payroll_id||null});if(data.payroll_id){const p=payroll.find(x=>x.id===data.payroll_id);await savePayroll({...p,paid_amount:Number(p.paid_amount||0)+Number(data.amount)})}toast('Payment saved','success');location.reload()}catch(e){toast(e.message,'error')}
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
