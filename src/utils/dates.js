export function toDateInput(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(value, format = 'YYYY-MM-DD') {
  if (!value) return '-';
  const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  if (format === 'DD/MM/YYYY') return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  if (format === 'MM/DD/YYYY') return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  return toDateInput(date);
}

export function periodRange(type) {
  const now = new Date();
  const today = toDateInput(now);
  if (type === 'today') return [today, today];
  if (type === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return [toDateInput(start), today];
  }
  if (type === 'month') return [toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), today];
  return ['', ''];
}
