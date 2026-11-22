import { listExpenses, saveExpense, deleteExpense } from '../services/expenseService.js';
import { listEmployees } from '../services/employeeService.js';
import { supabase } from '../services/supabase.js';
import { modal } from '../components/modal.js';
import { table } from '../components/table.js';
import { toast } from '../components/notification.js';
import { getSettings, formatMoney } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';

export async function expensesPage(){
  const [settings,rows,employees,projectResult]=await Promise.all([getSettings(),listExpenses(),listEmployees(),supabase?supabase.from('projects').select('id,name').order('name'):Promise.resolve({data:[]})]);
  window.__expenseProjects=projectResult.data||[];
  const columns=[
    {label:'Date',value:r=>formatDate(r.date,settings.dateFormat)}, {label:'Title',value:r=>`<strong>${esc(r.title)}</strong>`},
    {label:'Category',value:r=>`<span class="badge blue">${esc(r.category)}</span>`},{label:'Amount',value:r=>formatMoney(r.amount,settings.currency)},
    {label:'Project',value:r=>esc(r.projects?.name||'-')},{label:'Payment',value:r=>esc(r.payment_method||'-')},
    {label:'Actions',value:r=>`<button class="icon-button edit-expense" data-id="${r.id}">✎</button> <button class="icon-button delete-expense" data-id="${r.id}">×</button>`}
  ];
  return `<div class="page"><div class="page-toolbar"><div class="filters"><input id="expenseSearch" class="search-input" placeholder="Search expenses"><select id="expenseCategory"><option value="">All categories</option>${['Labour','Transportation','Fuel','Food','Equipment','Materials','Maintenance','Accommodation','Other'].map(c=>`<option>${c}</option>`).join('')}</select><input id="expenseDate" type="date"></div><button class="button primary" id="addExpense">+ Add expense</button></div><section class="card"><div class="card-header"><h2>Expenses</h2><span class="badge blue">${rows.length} records</span></div>${table(columns,rows,'No expense records yet.')}</section></div>`;
}
export function bindExpenses(){
  document.querySelector('#addExpense')?.addEventListener('click',()=>openExpense());
  document.querySelectorAll('.edit-expense').forEach(b=>b.onclick=async()=>{const rows=await listExpenses();openExpense(rows.find(r=>r.id===b.dataset.id))});
  document.querySelectorAll('.delete-expense').forEach(b=>b.onclick=async()=>{if(confirm('Delete this expense?')){try{await deleteExpense(b.dataset.id);toast('Expense deleted','success');location.reload()}catch(e){toast(e.message,'error')}}});
  document.querySelector('#expenseSearch')?.addEventListener('input',filterExpenses);
  document.querySelector('#expenseCategory')?.addEventListener('change',filterExpenses);
}
async function openExpense(record=null){
  const [employees,projects]=await Promise.all([listEmployees(),Promise.resolve(window.__expenseProjects||[])]);
  const data=await modal(record?'Edit expense':'Add expense',`<div class="form-grid">
    <div class="field"><label>Expense title</label><input name="title" required value="${esc(record?.title||'')}"></div>
    <div class="field"><label>Amount</label><input name="amount" type="number" min="0" step="0.01" required value="${record?.amount||''}"></div>
    <div class="field"><label>Date</label><input name="date" type="date" required value="${record?.date||new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Category</label><select name="category">${['Labour','Transportation','Fuel','Food','Equipment','Materials','Maintenance','Accommodation','Other'].map(c=>`<option ${record?.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Project</label><select name="project_id"><option value="">No project</option>${projects.map(p=>`<option value="${p.id}" ${record?.project_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Employee</label><select name="employee_id"><option value="">No employee</option>${employees.map(e=>`<option value="${e.id}" ${record?.employee_id===e.id?'selected':''}>${esc(e.full_name)}</option>`).join('')}</select></div>
    <div class="field"><label>Payment method</label><select name="payment_method">${['Cash','Bank','Mobile payment','Card','Other'].map(x=>`<option ${record?.payment_method===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Receipt reference</label><input name="receipt_reference" value="${esc(record?.receipt_reference||'')}"></div>
    <div class="field full"><label>Description</label><textarea name="description">${esc(record?.description||'')}</textarea></div></div>`,'Save');
  if(!data)return;
  try{await saveExpense({...data,id:record?.id,amount:Number(data.amount),project_id:data.project_id||null,employee_id:data.employee_id||null});toast('Expense saved','success');location.reload()}catch(e){toast(e.message,'error')}
}
function filterExpenses(){const s=document.querySelector('#expenseSearch')?.value.toLowerCase()||'',c=document.querySelector('#expenseCategory')?.value||'';document.querySelectorAll('.table-wrap tbody tr').forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(s)&&(!c||tr.children[2].textContent.includes(c))?'':'none'})}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
