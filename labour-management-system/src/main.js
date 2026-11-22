import './styles/main.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/responsive.css';

import { isSupabaseConfigured } from './config/config.js';
import { supabase } from './services/supabase.js';
import { getSession, signOut } from './services/auth.js';
import { sidebar } from './components/sidebar.js';
import { header } from './components/header.js';
import { toast } from './components/notification.js';
import { authPage, bindAuth } from './pages/auth.js';
import { dashboardPage } from './pages/dashboard.js';
import { employeesPage, bindEmployees } from './pages/employees.js';
import { attendancePage, bindAttendance } from './pages/attendance.js';
import { projectsPage, bindProjects } from './pages/projects.js';
import { expensesPage, bindExpenses } from './pages/expenses.js';
import { payrollPage, bindPayroll } from './pages/payroll.js';
import { paymentsPage, bindPayments } from './pages/payments.js';
import { reportsPage, bindReports } from './pages/reports.js';
import { settingsPage, bindSettings } from './pages/settings.js';

const app=document.querySelector('#app');
const titles={dashboard:'Dashboard',employees:'Employees',attendance:'Attendance',projects:'Projects / Jobs',expenses:'Expenses',payroll:'Payroll',payments:'Payments',reports:'Reports',settings:'Settings'};

async function boot(){
  if(!isSupabaseConfigured){renderApp(true);return}
  let session=null;
  try{session=await getSession()}catch(error){toast(error.message,'error')}
  if(!session){renderAuth();return}
  renderApp(false);
}

function renderAuth(){app.innerHTML=authPage();bindAuth()}

async function renderApp(configMissing=false){
  const route=(location.hash.replace(/^#\/?/,'').split('?')[0]||'dashboard');
  let content='';
  let binder=null;
  try{
    if(configMissing) throw new Error('Supabase credentials are not configured. Add your environment variables and rebuild.');
    if(route==='dashboard') content=await dashboardPage();
    else if(route==='employees'){content=await employeesPage();binder=bindEmployees}
    else if(route==='attendance'){content=await attendancePage();binder=bindAttendance}
    else if(route==='projects'){content=await projectsPage();binder=bindProjects}
    else if(route==='expenses'){content=await expensesPage();binder=bindExpenses}
    else if(route==='payroll'){content=await payrollPage();binder=bindPayroll}
    else if(route==='payments'){content=await paymentsPage();binder=bindPayments}
    else if(route==='reports'){content=await reportsPage();binder=bindReports}
    else if(route==='settings'){content=await settingsPage();binder=bindSettings}
    else {content=await dashboardPage()}
  }catch(error){content=`<div class="page"><section class="card"><div class="card-header"><h2>Unable to load data</h2></div><div class="card-body">${escape(error.message)}</div></section></div>`}
  app.innerHTML=`<div class="app-shell">${sidebar(route)}<main class="main-area">${header(titles[route]||'Dashboard',`<button class="button secondary" id="logoutButton">Logout</button>`)}${!isSupabaseConfigured&&!configMissing?'<div class="setup-banner">Supabase credentials are missing.</div>':''}${content}</main></div>`;
  document.querySelector('#menuButton')?.addEventListener('click',()=>document.querySelector('#sidebar')?.classList.toggle('open'));
  document.querySelector('#logoutButton')?.addEventListener('click',async()=>{try{await signOut();location.hash='';location.reload()}catch(e){toast(e.message,'error')}});
  binder?.();
  document.querySelectorAll('[data-nav]').forEach(link=>link.onclick=()=>document.querySelector('#sidebar')?.classList.remove('open'));
}

function escape(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

window.addEventListener('hashchange',()=>renderApp(false));
window.addEventListener('offline',()=>{const el=document.createElement('div');el.className='offline-banner';el.textContent='You are offline. Database changes require a connection.';document.body.append(el)});
window.addEventListener('online',()=>document.querySelectorAll('.offline-banner').forEach(el=>el.remove()));

if('serviceWorker' in navigator && location.protocol!=='file:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

boot();
