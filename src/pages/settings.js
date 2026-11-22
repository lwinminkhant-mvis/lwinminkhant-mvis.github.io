import { toast } from '../components/notification.js';

export async function settingsPage(){
  const raw=localStorage.getItem('labour-book-settings');const s=raw?JSON.parse(raw):{businessName:'Labour Book',businessInfo:'',currency:'MMK',dateFormat:'YYYY-MM-DD',theme:'light',defaultDailyWage:0};
  return `<div class="page"><section class="card"><div class="card-header"><h2>Business settings</h2></div><form class="card-body" id="settingsForm"><div class="form-grid">
    <div class="field"><label>Business name</label><input name="businessName" value="${esc(s.businessName)}"></div>
    <div class="field"><label>Currency</label><input name="currency" value="${esc(s.currency)}" placeholder="MMK"></div>
    <div class="field"><label>Date format</label><select name="dateFormat"><option ${s.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD</option><option ${s.dateFormat==='DD/MM/YYYY'?'selected':''}>DD/MM/YYYY</option><option ${s.dateFormat==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY</option></select></div>
    <div class="field"><label>Theme</label><select name="theme"><option value="light" ${s.theme==='light'?'selected':''}>Light</option><option value="dark" ${s.theme==='dark'?'selected':''}>Dark</option></select></div>
    <div class="field"><label>Default daily wage</label><input name="defaultDailyWage" type="number" min="0" step="0.01" value="${s.defaultDailyWage||0}"></div>
    <div class="field full"><label>Business information</label><textarea name="businessInfo">${esc(s.businessInfo||'')}</textarea></div>
  </div><div class="modal-actions"><button class="button primary" type="submit">Save settings</button></div></form></section></div>`;
}
export function bindSettings(){
  document.querySelector('#settingsForm')?.addEventListener('submit',e=>{
    e.preventDefault();const s=Object.fromEntries(new FormData(e.currentTarget));s.defaultDailyWage=Number(s.defaultDailyWage||0);
    localStorage.setItem('labour-book-settings',JSON.stringify(s));document.documentElement.dataset.theme=s.theme;toast('Settings saved','success');
  });
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
