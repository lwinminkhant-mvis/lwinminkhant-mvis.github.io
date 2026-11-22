window.LabourProjects = (() => {
  async function render(container){
    container.innerHTML=`<div class="loading">Loading projects...</div>`;await load(container);
  }
  async function load(container){
    try{
      const r=await LabourDB.client.from("projects").select("*").order("created_at",{ascending:false});
      if(r.error)throw r.error;const rows=r.data||[];
      container.innerHTML=`<section class="panel"><div class="panel-head"><h2>Projects</h2><div class="toolbar"><input class="field search" id="projectSearch" placeholder="Search projects"><button class="btn btn-primary" id="addProject">+ Add project</button></div></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Location</th><th>Start date</th><th>End date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="projectRows">${rows.map(row).join("")}</tbody></table>${rows.length?"":'<div class="empty">No projects yet.</div>'}</div></section>`;
      document.getElementById("projectSearch").oninput=e=>document.querySelectorAll("#projectRows tr").forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(e.target.value.toLowerCase())?"":"none");
      document.getElementById("addProject").onclick=()=>openModal(container);
      document.querySelectorAll("[data-edit-project]").forEach(b=>b.onclick=()=>openModal(container,rows.find(x=>x.id===b.dataset.editProject)));
      document.querySelectorAll("[data-delete-project]").forEach(b=>b.onclick=async()=>{if(await LabourApp.confirmDialog("Delete project","Delete this project?")){const r=await LabourDB.client.from("projects").delete().eq("id",b.dataset.deleteProject);if(r.error)LabourApp.toast(r.error.message,"error");else{LabourApp.toast("Project deleted.","success");load(container)}}});
    }catch(error){container.innerHTML=`<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message)}</div></div>`}
  }
  function row(p){
    const status=p.status||"active";
    return `<tr><td><strong>${LabourApp.escapeHTML(p.name)}</strong></td><td>${LabourApp.escapeHTML(p.location||"-")}</td><td>${LabourApp.formatDate(p.start_date)}</td><td>${LabourApp.formatDate(p.end_date)}</td><td><span class="status status-${status}">${status}</span></td><td><div class="actions"><button class="action-btn" data-edit-project="${p.id}" type="button">Edit</button><button class="action-btn danger" data-delete-project="${p.id}" type="button">Delete</button></div></td></tr>`;
  }
  async function openModal(container,p={}){
    let employees=[], assignments=[];
    if(p.id){
      const [employeeResult, assignmentResult]=await Promise.all([
        LabourDB.client.from("employees").select("id,full_name").eq("employment_status","active").order("full_name"),
        LabourDB.client.from("project_assignments").select("employee_id").eq("project_id",p.id)
      ]);
      employees=employeeResult.data||[];
      assignments=(assignmentResult.data||[]).map(a=>a.employee_id);
    }else{
      const r=await LabourDB.client.from("employees").select("id,full_name").eq("employment_status","active").order("full_name");
      employees=r.data||[];
    }
    const el=LabourApp.modal(p.id?"Edit project":"Add project",`<form id="projectForm" class="form-grid"><div class="two-cols"><div class="field"><label>Project name *</label><input name="name" required value="${LabourApp.escapeHTML(p.name||"")}"></div><div class="field"><label>Location</label><input name="location" value="${LabourApp.escapeHTML(p.location||"")}"></div><div class="field"><label>Start date</label><input name="start_date" type="date" value="${p.start_date||""}"></div><div class="field"><label>End date</label><input name="end_date" type="date" value="${p.end_date||""}"></div><div class="field"><label>Budget</label><input name="budget" type="number" min="0" step="0.01" value="${p.budget||0}"></div><div class="field"><label>Status</label><select name="status"><option ${p.status==="active"?"selected":""} value="active">Active</option><option ${p.status==="completed"?"selected":""} value="completed">Completed</option><option ${p.status==="cancelled"?"selected":""} value="cancelled">Cancelled</option></select></div></div><div class="field"><label>Description</label><textarea name="description">${LabourApp.escapeHTML(p.description||"")}</textarea></div><div class="field"><label>Assigned employees</label><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${employees.map(e=>`<label style="font-weight:500"><input type="checkbox" name="assigned_employee" value="${e.id}" ${assignments.includes(e.id)?"checked":""}> <span data-no-translate>${LabourApp.escapeHTML(e.full_name)}</span></label>`).join("")||'<span class="muted">No active employees</span>'}</div></div></form>`,`<button class="btn" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="button" data-save>Save project</button>`);
    el.querySelector("[data-cancel]").onclick=()=>el.remove();
    el.querySelector("[data-save]").onclick=async()=>{
      const f=el.querySelector("#projectForm"); if(!f.reportValidity())return;
      const fd=new FormData(f);const payload={};for(const [k,v] of fd.entries()){if(k==="assigned_employee")continue;payload[k]=v}
      payload.budget=Number(payload.budget||0);payload.start_date=payload.start_date||null;payload.end_date=payload.end_date||null;
      const {data:{session}}=await LabourDB.client.auth.getSession();payload.user_id=session.user.id;
      const r=p.id?await LabourDB.client.from("projects").update(payload).eq("id",p.id):await LabourDB.client.from("projects").insert(payload).select("id").single();
      if(r.error){LabourApp.toast(r.error.message,"error");return}
      const projectId=p.id||r.data.id;
      const selected=fd.getAll("assigned_employee");
      await LabourDB.client.from("project_assignments").delete().eq("project_id",projectId);
      if(selected.length){
        const assignmentRows=selected.map(employee_id=>({user_id:session.user.id,project_id:projectId,employee_id,assigned_date:LabourApp.dateValue(),status:"active"}));
        const ar=await LabourDB.client.from("project_assignments").insert(assignmentRows);
        if(ar.error){LabourApp.toast(ar.error.message,"error");return}
      }
      el.remove();LabourApp.toast(p.id?"Project updated.":"Project added.","success");load(container)
    };
  }
  return{render};
})();
