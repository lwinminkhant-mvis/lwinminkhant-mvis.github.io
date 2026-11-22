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
    {label:'Type',value:r=>r.payment_type==='advance'?'<span class="badge blue">Advance</span>':'<span class="badge green">Payment</span>'},
    {label:'Reference',value:r=>esc(r.reference_number||'-')},
    {label:'Actions',value:r=>`<button class="icon-button print-payment" data-id="${r.id}" title="Print receipt">▣</button>`}
  ];
  window.__paymentRecords=rows;
  return `<div class="page"><div class="page-toolbar"><div class="filters"><input id="paymentSearch" class="search-input" placeholder="Search payments"><select id="paymentType"><option value="">All types</option><option value="payment">Payments</option><option value="advance">Advances</option></select></div><button class="button primary" id="addPayment">+ Record payment</button></div><section class="card"><div class="card-header"><h2>Payments & advances</h2><span class="badge blue">${rows.length} records</span></div>${table(columns,rows,'No payments recorded yet.')}</section></div>`;
}
export function bindPayments(){
  document.querySelector('#addPayment')?.addEventListener('click',openPayment);
  document.querySelectorAll('.print-payment').forEach(button=>{
    button.onclick=()=>printPayment((window.__paymentRecords||[]).find(record=>record.id===button.dataset.id));
  });
  document.querySelector('#paymentSearch')?.addEventListener('input',filterPayments);
  document.querySelector('#paymentType')?.addEventListener('change',filterPayments);
}
async function openPayment(){
  const [employees,payroll]=await Promise.all([listEmployees(),listPayroll()]);
  const data=await modal('Record payment',`<div class="form-grid">
    <div class="field"><label>Employee</label><select name="employee_id" required>${employees.map(e=>`<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}</select></div>
    <div class="field"><label>Payment date</label><input name="payment_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required></div>
    <div class="field"><label>Payment method</label><select name="payment_method">${['Cash','Bank','Mobile payment','Card','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Payment type</label><select name="payment_type"><option value="payment">Wage payment</option><option value="advance">Advance</option></select></div>
    <div class="field"><label>Payroll period</label><select name="payroll_id"><option value="">Not linked</option>${payroll.map(p=>`<option value="${p.id}">${esc(p.employees?.full_name||'Employee')} · ${p.period_start}–${p.period_end}</option>`).join('')}</select></div>
    <div class="field"><label>Reference number</label><input name="reference_number"></div>
    <div class="field full"><label>Description</label><textarea name="description"></textarea></div></div>`,'Save payment');
  if(!data)return;
  try{await savePayment({...data,amount:Number(data.amount),payroll_id:data.payroll_id||null,payment_type:data.payment_type||'payment'});if(data.payment_type==='payment'&&data.payroll_id){const p=payroll.find(x=>x.id===data.payroll_id);await savePayroll({...p,paid_amount:Number(p.paid_amount||0)+Number(data.amount)})}toast(data.payment_type==='advance'?'Advance saved':'Payment saved','success');location.reload()}catch(e){toast(e.message,'error')}
}
function printPayment(record){
  if(!record)return;
  const settings=window.__paymentRecords?.settings;
  const printWindow=window.open('','_blank','width=800,height=600');
  if(!printWindow)return;
  printWindow.document.write(`<html><head><title>Payment Receipt</title><style>body{font-family:Arial;padding:40px}table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #ddd}.total{font-size:20px;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>Payment Receipt</h1><table><tr><td>Receipt / Reference</td><td>${esc(record.reference_number||record.id.slice(0,8))}</td></tr><tr><td>Worker</td><td>${esc(record.employees?.full_name||'-')}</td></tr><tr><td>Date</td><td>${esc(record.payment_date)}</td></tr><tr><td>Method</td><td>${esc(record.payment_method)}</td></tr><tr><td>Type</td><td>${record.payment_type==='advance'?'Advance':'Wage payment'}</td></tr><tr><td>Amount</td><td class="total">${esc(record.amount)}</td></tr></table><button onclick="window.print()">Print</button></body></html>`);
  printWindow.document.close();
}
function filterPayments(){
  const search=document.querySelector('#paymentSearch')?.value.toLowerCase()||'',type=document.querySelector('#paymentType')?.value||'';
  document.querySelectorAll('.table-wrap tbody tr').forEach(row=>{
    const text=row.textContent.toLowerCase();
    const recordType=row.textContent.includes('Advance')?'advance':'payment';
    row.style.display=text.includes(search)&&(!type||recordType===type)?'':'none';
  });
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
