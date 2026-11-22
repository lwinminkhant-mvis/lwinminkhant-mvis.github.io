export function header(title, actions = '') {
  return `<header class="topbar">
    <button class="icon-button menu-button" id="menuButton" aria-label="Open navigation">☰</button>
    <h1>${title}</h1>
    <div class="topbar-actions">${actions}</div>
  </header>`;
}
