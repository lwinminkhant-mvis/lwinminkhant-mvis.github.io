export function table(columns, rows, empty = 'No records found.') {
  if (!rows.length) return `<div class="empty-state">${empty}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(c => `<td>${typeof c.value === 'function' ? c.value(row) : (row[c.value] ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
