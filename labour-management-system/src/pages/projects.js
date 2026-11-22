import { supabase } from '../services/supabase.js';
import { modal } from '../components/modal.js';
import { table } from '../components/table.js';
import { toast } from '../components/notification.js';
import { formatDate } from '../utils/dates.js';
import { getSettings } from '../utils/currency.js';

export async function projectsPage(){
  const settings=await getSettings();
  let rows=[];
  if(supabase){const {data,error}=await supabase.from('projects').select('*').order('created_at',{ascending:false});if(error)throw error;rows=data||[]}
  const columns=[
    {label:'Project',value:r=>`<strong>${esc(r.name)}</strong>`},{label:'Location',value:r=>esc(r.location||'-')},
    {label:'Start',value:r=>formatDate(r.start_date,settings.dateFormat)},
    {label:'End',value:r=>formatDate(r.end_date,settings.dateFormat)},
    {label:'Status',value:r=>`<span class="badge ${r.status==='completed'?'green':r.status==='active'?'blue':'gray'}">${esc(r.status||'active')}</span>`},
    {label:'Actions',value:r=>`<button class="icon-button edit-project" data-id="${r.id}">✎</button>`}
  ];
  return `<div class="page"><div class="page-toolbar"><div></div><button class="button primary" id="addProject">+ Add project</button></div><section class="card"><div class="card-header"><h2>Projects / Jobs</h2><span class="badge blue">${rows.length} records</span></div>${table(columns,rows,'No projects created yet.')}</section></div>`;
}
export function bindProjects(){
  document.querySelector('#addProject')?.addEventListener('click',()=>openProject());
  document.querySelectorAll('.edit-project').forEach(b=>b.onclick=async()=>{
    const {data}=await supabase.from('projects').select('*').eq('id',b.dataset.id).single();openProject(data);
  });
}
async function openProject(record=null){
  if(!supabase){toast('Supabase is not configured','error');return}
  const data=await modal(record?'Edit project':'Add project',`<div class="form-grid">
    <div class="field"><label>Project name</label><input name="name" required value="${esc(record?.name||'')}"></div>
    <div class="field"><label>Location</label><input name="location" value="${esc(record?.location||'')}"></div>
    <div class="field"><label>Start date</label><input name="start_date" type="date" value="${record?.start_date||''}"></div>
    <div class="field"><label>End date</label><input name="end_date" type="date" value="${record?.end_date||''}"></div>
    <div class="field"><label>Status</label><select name="status"><option ${record?.status==='active'||!record?'selected':''}>active</option><option ${record?.status==='completed'?'selected':''}>completed</option><option ${record?.status==='on_hold'?'selected':''}>on_hold</option></select></div>
    <div class="field full"><label>Description</label><textarea name="description">${esc(record?.description||'')}</textarea></div></div>`,'Save');
  if(!data)return;
  try{
    const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;
    const payload={...data,owner_id:user.id,end_date:data.end_date||null};
    const query=record?supabase.from('projects').update(payload).eq('id',record.id):supabase.from('projects').insert(payload);
    const {error}=await query;if(error)throw error;toast('Project saved','success');location.reload();
  }catch(e){toast(e.message,'error')}
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
