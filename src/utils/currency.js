export async function getSettings() {
  const raw = localStorage.getItem('labour-book-settings');
  return raw ? JSON.parse(raw) : {
    businessName: 'Labour Book',
    currency: 'MMK',
    dateFormat: 'YYYY-MM-DD',
    theme: 'light',
    defaultDailyWage: 0
  };
}

export function formatMoney(value, currency = 'MMK') {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number)} ${currency}`;
}
