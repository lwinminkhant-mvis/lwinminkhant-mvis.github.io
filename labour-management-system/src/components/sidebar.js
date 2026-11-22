export function sidebar(active) {
  const items = [
    ['dashboard', 'Dashboard', '▦'], ['employees', 'Employees', '♙'], ['attendance', 'Attendance', '✓'],
    ['projects', 'Projects / Jobs', '▧'], ['expenses', 'Expenses', '↗'], ['payroll', 'Payroll', '◎'],
    ['payments', 'Payments', '৳'], ['reports', 'Reports', '▥'], ['settings', 'Settings', '⚙']
  ];
  return `<aside class="sidebar" id="sidebar">
    <div class="brand"><div class="brand-mark">LB</div><div><strong>Labour Book</strong><small>Management</small></div></div>
    <nav class="nav-list">${items.map(([id, label, icon]) => `<a class="nav-item ${active === id ? 'active' : ''}" href="#/${id}" data-nav="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></a>`).join('')}</nav>
  </aside>`;
}
