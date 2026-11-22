export function attendanceWage(record, employee) {
  const daily = Number(record.wage_applicable ?? employee?.daily_wage ?? 0);
  if (record.status === 'half_day') return daily / 2;
  if (record.status === 'absent') return 0;
  if (record.status === 'hourly') {
    return Number(record.hours_worked || 0) * Number(employee?.hourly_wage || 0);
  }
  return daily;
}

export function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}
