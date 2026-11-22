import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/responsive.css';

import { isSupabaseConfigured } from './config/config.js';
import { getSession, signOut } from './services/auth.js';
import { sidebar } from './components/sidebar.js';
import { header } from './components/header.js';
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

const titles = {
  dashboard: 'Dashboard', employees: 'Workers', attendance: 'Attendance',
  projects: 'Projects / Jobs', expenses: 'Expenses', payroll: 'Payroll',
  payments: 'Payments', reports: 'Reports', settings: 'Settings'
};

function App() {
  const [route, setRoute] = useState(location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');
  const [session, setSession] = useState(undefined);
  const [html, setHtml] = useState('');

  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }
    getSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      if (!isSupabaseConfigured) {
        setHtml(`<div class="page"><section class="card setup-card"><div class="card-header"><h2>Supabase setup required</h2></div><div class="card-body"><p>Add <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> to an environment file and rebuild. The project URL is preconfigured.</p><p>Never add a service-role key to this frontend.</p></div></section></div>`);
        return;
      }
      if (!session) return;

      let content = '';
      let binder = null;
      try {
        if (route === 'dashboard') content = await dashboardPage();
        else if (route === 'employees') { content = await employeesPage(); binder = bindEmployees; }
        else if (route === 'attendance') { content = await attendancePage(); binder = bindAttendance; }
        else if (route === 'projects') { content = await projectsPage(); binder = bindProjects; }
        else if (route === 'expenses') { content = await expensesPage(); binder = bindExpenses; }
        else if (route === 'payroll') { content = await payrollPage(); binder = bindPayroll; }
        else if (route === 'payments') { content = await paymentsPage(); binder = bindPayments; }
        else if (route === 'reports') { content = await reportsPage(); binder = bindReports; }
        else if (route === 'settings') { content = await settingsPage(); binder = bindSettings; }
        else content = await dashboardPage();
      } catch (error) {
        content = `<div class="page"><section class="card"><div class="card-header"><h2>Unable to load data</h2></div><div class="card-body">${escapeHtml(error.message)}</div></section></div>`;
      }
      if (active) setHtml(content);
      window.setTimeout(() => { if (active) binder?.(); }, 0);
    }

    if (session !== undefined) loadPage();
    return () => { active = false; };
  }, [route, session]);

  useEffect(() => {
    if (!isSupabaseConfigured || session) return;
    queueMicrotask(() => bindAuth());
  }, [session]);

  if (session === undefined) {
    return <main className="loading-screen">Loading…</main>;
  }

  if (isSupabaseConfigured && !session) {
    return <div dangerouslySetInnerHTML={{ __html: authPage() }} />;
  }

  return (
    <div className="app-shell">
      <div dangerouslySetInnerHTML={{ __html: sidebar(route) }} />
      <main className="main-area">
        <div dangerouslySetInnerHTML={{ __html: header(titles[route] || 'Dashboard', '<button class="button secondary" id="logoutButton">Logout</button>') }} />
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <LogoutHandler />
    </div>
  );
}

function LogoutHandler() {
  useEffect(() => {
    const button = document.querySelector('#logoutButton');
    if (!button) return;
    const handler = async () => {
      await signOut();
      location.hash = '';
      location.reload();
    };
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  });
  return null;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

createRoot(document.querySelector('#app')).render(<App />);
