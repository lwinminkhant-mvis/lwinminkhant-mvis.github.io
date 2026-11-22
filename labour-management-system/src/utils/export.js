export function exportCsv(filename, columns, rows) {
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    columns.map(column => escape(column.label)).join(','),
    ...rows.map(row => columns.map(column => escape(typeof column.value === 'function' ? column.value(row) : row[column.value])).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printReport(title) {
  document.title = title;
  window.print();
  setTimeout(() => history.back(), 100);
}
