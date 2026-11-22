import { listEmployees, saveEmployee, archiveEmployee } from '../services/employeeService.js';
import { getSettings, formatMoney } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { modal } from '../components/modal.js';
import { table } from '../components/table.js';
import { toast } from '../components/notification.js';

export async function employeesPage() {
  const settings = await getSettings();
  let rows = await listEmployees();
  const positions = [...new Set(rows.map(r=>r.position).filter(Boolean))];
  return employeeMarkup(rows, positions, settings);
}
function employeeMarkup(rows, positions, settings) {
  const columns = [
    {label:'Employee ID',value:r=>r.employee_code || '-'},
    {label:'Name',value:r=>`<strong>${esc(r.full_name)}</strong>`},
    {label:'Position',value:r=>esc(r.position || '-')},
    {label:'Daily wage',value:r=>formatMoney(r.daily_wage, settings.currency)},
    {label:'Status',value:r=>r.active !== false ? '<span class="badge green">Active</span>' : '<span class="badge gray">Inactive</span>'},
    {label:'Actions',value:r=>`<button class="icon-button edit-employee" data-id="${r.id}" title="Edit">✎</button> <button class="icon-button archive-employee" data-id="${r.id}" title="Archive">⌫</button>`}
  ];
  return `<div class="page">
    <div class="page-toolbar"><div class="filters"><input class="search-input" id="employeeSearch" placeholder="Search employees"><select id="positionFilter"><option value="">All positions</option>${positions.map(p=>`<option>${esc(p)}</option>`).join('')}</select><select id="statusFilter"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div><button class="button primary" id="addEmployee">+ Add employee</button></div>
    <section class="card"><div class="card-header"><h2>Employee directory</h2><span class="badge blue">${rows.length} records</span></div>${table(columns, rows, 'No employees added yet.')}</section>
  </div>`;
}
export function bindEmployees() {
  document.querySelector('#addEmployee')?.addEventListener('click',()=>openEmployee());
  document.querySelectorAll('.edit-employee').forEach(b=>b.onclick=async()=>{const rows=await listEmployees();openEmployee(rows.find(r=>r.id===b.dataset.id));});
  document.querySelectorAll('.archive-employee').forEach(b=>b.onclick=async()=>{
    if(!confirm('Archive this employee? Historical records will be preserved.')) return;
    try{await archiveEmployee(b.dataset.id);toast('Employee archived','success');location.reload();}catch(e){toast(e.message,'error')}
  });
  const search=document.querySelector('#employeeSearch'), position=document.querySelector('#positionFilter'), status=document.querySelector('#statusFilter');
  [search,position,status].forEach(el=>el?.addEventListener('input',filterEmployees));
}
async function openEmployee(employee=null){
  const settings=await getSettings();
  const data=await modal(employee?'Edit employee':'Add employee',`
    <div class="form-grid">
      <div class="field"><label>Unique employee ID</label><input name="employee_code" required value="${esc(employee?.employee_code||'')}"></div>
      <div class="field"><label>Full name</label><input name="full_name" required value="${esc(employee?.full_name||'')}"></div>
      <div class="field"><label>Phone number</label><input name="phone" value="${esc(employee?.phone||'')}"></div>
      <div class="field"><label>Job position</label><input name="position" required value="${esc(employee?.position||'')}"></div>
      <div class="field"><label>Daily wage</label><input name="daily_wage" type="number" min="0" step="0.01" required value="${employee?.daily_wage||settings.defaultDailyWage||0}"></div>
      <div class="field"><label>Hourly wage</label><input name="hourly_wage" type="number" min="0" step="0.01" value="${employee?.hourly_wage||0}"></div>
      <div class="field"><label>Start date</label><input name="start_date" type="date" value="${employee?.start_date||''}"></div>
      <div class="field"><label>Status</label><select name="active"><option value="true" ${employee?.active!==false?'selected':''}>Active</option><option value="false" ${employee?.active===false?'selected':''}>Inactive</option></select></div>
      <div class="field full"><label>Address</label><input name="address" value="${esc(employee?.address||'')}"></div>
      <div class="field full"><label>Notes</label><textarea name="notes">${esc(employee?.notes||'')}</textarea></div>
    </div>`,employee?'Update':'Add');
  if(!data)return;
  try{
    await saveEmployee({...data,id:employee?.id,daily_wage:Number(data.daily_wage),hourly_wage:Number(data.hourly_wage||0),active:data.active==='true'});
    toast(employee?'Employee updated':'Employee added','success');location.reload();
  }catch(e){toast(e.message,'error')}
}
function filterEmployees(){
  const s=document.querySelector('#employeeSearch')?.value.toLowerCase()||'',p=document.querySelector('#positionFilter')?.value,status=document.querySelector('#statusFilter')?.value;
  document.querySelectorAll('.table-wrap tbody tr').forEach(tr=>{
    const text=tr.textContent.toLowerCase(),positionText=tr.children[2]?.textContent||'',statusText=tr.children[4]?.textContent.toLowerCase()||'';
    tr.style.display=text.includes(s)&&(!p||positionText===p)&&(!status||statusText.includes(status))?'':'none';
  });
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
