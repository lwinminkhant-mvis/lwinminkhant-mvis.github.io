window.LabourAttendance = (() => {
  async function render(container) {
    container.innerHTML=`<div class="loading">Loading attendance...</div>`;
    try {
      const [emps, projs, att] = await Promise.all([
        LabourDB.client.from("employees").select("id,full_name").order("full_name"),
        LabourDB.client.from("projects").select("id,name").order("name"),
        LabourDB.client.from("attendance").select("*").order("date",{ascending:false}).limit(500)
      ]);
      [emps,projs,att].forEach(r=>{if(r.error)throw r.error});
      const employees=emps.data||[], projects=projs.data||[];
      container.innerHTML=`<section class="panel"><div class="panel-head"><h2>Daily attendance</h2><button class="btn btn-primary" id="recordAttendance">+ Record attendance</button></div><div class="panel-head" style="border-top:0"><div class="toolbar"><input class="field search" id="attendanceDate" type="date" value="${LabourApp.dateValue()}"><select class="field" id="attendanceFilter" style="width:auto"><option value="">All statuses</option><option>present</option><option>absent</option><option>half-day</option></select></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Project</th><th>Status</th><th>Actions</th></tr></thead><tbody id="attendanceRows">${(att.data||[]).map(a=>row(a,employees,projects)).join("")}</tbody></table>${(att.data||[]).length?"":'<div class="empty">No attendance records yet.</div>'}</div></section>`;
      document.getElementById("recordAttendance").onclick=()=>openModal(container,employees,projects);
      document.getElementById("attendanceDate").onchange=filter;
      document.getElementById("attendanceFilter").onchange=filter;
      document.querySelectorAll("[data-delete-attendance]").forEach(b=>b.onclick=async()=>{
        if(!await LabourApp.confirmDialog("Delete attendance","Delete this attendance record?"))return;
        const r=await LabourDB.client.from("attendance").delete().eq("id",b.dataset.deleteAttendance);
        if(r.error)LabourApp.toast(r.error.message,"error");else{LabourApp.toast("Attendance deleted.","success");render(container)}
      });
      function filter(){
        const date=document.getElementById("attendanceDate").value;
        const status=document.getElementById("attendanceFilter").value;
        document.querySelectorAll("#attendanceRows tr").forEach(tr=>{
          tr.style.display=( (!date||tr.dataset.date===date)&&(!status||tr.dataset.status===status) )?"":"none";
        });
      }
    }catch(error){container.innerHTML=`<div class="panel"><div class="empty">${LabourApp.escapeHTML(error.message)}</div></div>`}
  }
  function row(a,employees,projects){
    const emp=employees.find(e=>e.id===a.employee_id);
    const proj=projects.find(p=>p.id===a.project_id);
    const status=a.status||"present";
    return `<tr data-date="${LabourApp.escapeHTML(a.date||a.attendance_date||"")}" data-status="${LabourApp.escapeHTML(status)}"><td>${LabourApp.formatDate(a.date||a.attendance_date)}</td><td>${LabourApp.escapeHTML(emp?.full_name||"-")}</td><td>${LabourApp.escapeHTML(proj?.name||a.project_name||"-")}</td><td><span class="status status-${status}">${status}</span></td><td><button class="action-btn danger" data-delete-attendance="${a.id}" type="button">Delete</button></td></tr>`;
  }
  function openModal(container,employees,projects){
    const el=LabourApp.modal("Record attendance",`<form id="attendanceForm" class="form-grid"><div class="three-cols"><div class="field"><label>Date *</label><input name="date" type="date" required value="${LabourApp.dateValue()}"></div><div class="field"><label>Employee *</label><select name="employee_id" required><option value="">Select employee</option>${employees.map(e=>`<option value="${e.id}">${LabourApp.escapeHTML(e.full_name)}</option>`).join("")}</select></div><div class="field"><label>Status *</label><select name="status" required><option value="present">Present</option><option value="absent">Absent</option><option value="half-day">Half-day</option></select></div></div><div class="field"><label>Project</label><select name="project_id"><option value="">Unassigned</option>${projects.map(p=>`<option value="${p.id}">${LabourApp.escapeHTML(p.name)}</option>`).join("")}</select></div><div class="field"><label>Notes</label><textarea name="notes"></textarea></div></form>`,`<button class="btn" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="button" data-save>Save attendance</button>`);
    el.querySelector("[data-cancel]").onclick=()=>el.remove();
    el.querySelector("[data-save]").onclick=async()=>{
      const f=el.querySelector("#attendanceForm");if(!f.reportValidity())return;
      const payload=Object.fromEntries(new FormData(f).entries());payload.project_id=payload.project_id||null;
      const {data:{session}}=await LabourDB.client.auth.getSession();payload.user_id=session.user.id;
      const r=await LabourDB.client.from("attendance").insert(payload);
      if(r.error)LabourApp.toast(r.error.message,"error");else{el.remove();LabourApp.toast("Attendance saved.","success");render(container)}
    }
  }
  return {render};
})();
