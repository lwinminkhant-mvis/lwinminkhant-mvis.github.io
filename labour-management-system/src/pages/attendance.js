import { listEmployees } from '../services/employeeService.js';
import { listAttendance, saveAttendance } from '../services/attendanceService.js';
import { supabase } from '../services/supabase.js';
import { modal } from '../components/modal.js';
import { table } from '../components/table.js';
import { toast } from '../components/notification.js';
import { toDateInput, formatDate } from '../utils/dates.js';
import { getSettings } from '../utils/currency.js';

export async function attendancePage() {
  const settings=await getSettings(), date=toDateInput();
  const [employees,records]=await Promise.all([listEmployees(),listAttendance(date,date)]);
  const columns=[
    {label:'Employee',value:r=>esc(r.employees?.full_name||'-')},
    {label:'Status',value:r=>`<span class="badge ${r.status==='present'?'green':r.status==='absent'?'red':'blue'}">${esc(r.status?.replace('_',' ')||'')}</span>`},
    {label:'Hours',value:r=>r.hours_worked||0},
    {label:'Wage applicable',value:r=>r.wage_applicable},
    {label:'Notes',value:r=>esc(r.notes||'-')},
    {label:'Actions',value:r=>`<button class="icon-button edit-attendance" data-id="${r.id}">✎</button>`}
  ];
  let projects=[];
  if(supabase){const {data}=await supabase.from('projects').select('id,name').order('name');projects=data||[]}
  return `<div class="page"><div class="page-toolbar"><div class="filters"><input id="attendanceDate" type="date" value="${date}"><select id="attendanceEmployee"><option value="">All employees</option>${employees.map(e=>`<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}</select></div><button class="button primary" id="markAttendance">+ Mark attendance</button></div>
  <section class="card"><div class="card-header"><h2>Attendance · ${formatDate(date,settings.dateFormat)}</h2><span class="badge blue">${records.length} records</span></div>${table(columns,records,'No attendance marked for this date.')}</section></div>`;
}
export function bindAttendance(){
  document.querySelector('#attendanceDate')?.addEventListener('change',e=>location.hash=`#/attendance?date=${e.target.value}`);
  document.querySelector('#markAttendance')?.addEventListener('click',openAttendance);
  document.querySelectorAll('.edit-attendance').forEach(b=>b.onclick=()=>openAttendanceById(b.dataset.id));
}
async function openAttendanceById(id){
  const date=document.querySelector('#attendanceDate')?.value||toDateInput();
  const records=await listAttendance(date,date);await openAttendance(records.find(r=>r.id===id));
}
async function openAttendance(record=null){
  const [employees,projectsResult,settings]=await Promise.all([listEmployees(),supabase?supabase.from('projects').select('id,name').order('name'):Promise.resolve({data:[]}),getSettings()]);
  const projects=projectsResult.data||[];
  const date=document.querySelector('#attendanceDate')?.value||toDateInput();
  const data=await modal(record?'Edit attendance':'Mark attendance',`
    <div class="form-grid">
      <div class="field"><label>Employee</label><select name="employee_id" required ${record?'disabled':''}>${employees.map(e=>`<option value="${e.id}" ${record?.employee_id===e.id?'selected':''}>${esc(e.full_name)}</option>`).join('')}</select></div>
      <div class="field"><label>Date</label><input type="date" name="date" required value="${record?.date||date}"></div>
      <div class="field"><label>Status</label><select name="status"><option value="present" ${record?.status==='present'?'selected':''}>Present</option><option value="absent" ${record?.status==='absent'?'selected':''}>Absent</option><option value="half_day" ${record?.status==='half_day'?'selected':''}>Half-day</option></select></div>
      <div class="field"><label>Working hours</label><input type="number" name="hours_worked" min="0" max="24" step="0.25" value="${record?.hours_worked||8}"></div>
      <div class="field"><label>Applicable wage</label><input type="number" name="wage_applicable" min="0" step="0.01" required value="${record?.wage_applicable||employees[0]?.daily_wage||settings.defaultDailyWage||0}"></div>
      <div class="field"><label>Project</label><select name="project_id"><option value="">No project</option>${projects.map(p=>`<option value="${p.id}" ${record?.project_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field full"><label>Notes</label><textarea name="notes">${esc(record?.notes||'')}</textarea></div>
    </div>`,'Save');
  if(!data)return;
  if(record) data.employee_id=record.employee_id;
  try{await saveAttendance({...data,id:record?.id,employee_id:data.employee_id,hours_worked:Number(data.hours_worked),wage_applicable:Number(data.wage_applicable),project_id:data.project_id||null});toast('Attendance saved','success');location.reload()}catch(e){toast(e.message,'error')}
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
