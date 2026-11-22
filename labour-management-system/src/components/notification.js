export function toast(message, type = 'info') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.append(host);
  }
  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.textContent = message;
  host.append(item);
  setTimeout(() => item.remove(), 4200);
}
