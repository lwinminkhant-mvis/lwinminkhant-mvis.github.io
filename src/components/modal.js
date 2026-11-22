export function modal(title, bodyHtml, submitLabel = 'Save') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-label="${title}">
        <header class="modal-header"><h2>${title}</h2><button type="button" class="icon-button modal-close" aria-label="Close">×</button></header>
        <form class="modal-form">${bodyHtml}<div class="modal-actions"><button type="button" class="button secondary modal-cancel">Cancel</button><button type="submit" class="button primary">${submitLabel}</button></div></form>
      </section>`;
    document.body.append(overlay);
    const close = value => { overlay.remove(); resolve(value); };
    overlay.querySelector('.modal-close').onclick = () => close(null);
    overlay.querySelector('.modal-cancel').onclick = () => close(null);
    overlay.querySelector('.modal-backdrop')?.addEventListener;
    overlay.onclick = event => { if (event.target === overlay) close(null); };
    overlay.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      close(data);
    };
  });
}
