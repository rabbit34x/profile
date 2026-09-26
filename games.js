(() => {
  const filters = document.querySelector('.record-filters');
  const cards = [...document.querySelectorAll('.record-card')];
  const count = document.querySelector('#record-result-count');
  const empty = document.querySelector('.record-empty');
  const reset = filters.querySelector('[type="reset"]');
  const applyFilters = () => {
    const genre = filters.querySelector('[name="genre"]:checked').value;
    const frequency = filters.querySelector('[name="frequency"]:checked').value;
    let visible = 0;
    cards.forEach((card) => {
      card.hidden = !((genre === 'all' || card.dataset.genre === genre)
        && (frequency === 'all' || card.dataset.frequency === frequency));
      if (!card.hidden) visible++;
    });
    count.textContent = `${visible} / ${cards.length} ゲーム`;
    empty.hidden = visible !== 0;
    reset.disabled = genre === 'all' && frequency === 'all';
  };
  filters.addEventListener('change', applyFilters);
  filters.addEventListener('submit', (event) => event.preventDefault());
  filters.addEventListener('reset', (event) => {
    event.preventDefault();
    filters.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = input.defaultChecked;
    });
    applyFilters();
  });
  filters.hidden = false;
  applyFilters();

  const dialog = document.createElement('dialog');
  dialog.className = 'record-modal';
  dialog.setAttribute('aria-labelledby', 'record-modal-title');
  dialog.innerHTML = `<header class="record-modal-header"><h2 id="record-modal-title"></h2><button class="record-modal-close" type="button" autofocus>一覧に戻る <span aria-hidden="true">×</span></button></header><div class="record-modal-content"></div>`;
  document.body.append(dialog);
  const title = dialog.querySelector('h2');
  const content = dialog.querySelector('.record-modal-content');
  let active = null;
  const historyKey = `game-records-${Date.now()}`;
  const openers = new Map();
  let closing = false;

  const requestClose = () => {
    if (!dialog.open || closing) return;
    closing = true;
    if (history.state?.recordModal?.key === historyKey) history.back();
    else dialog.close();
  };
  dialog.querySelector('.record-modal-close').addEventListener('click', requestClose);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });
  const outside = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  let startedOutside = false;
  dialog.addEventListener('pointerdown', (event) => { startedOutside = outside(event); });
  dialog.addEventListener('click', (event) => {
    if (startedOutside && outside(event)) requestClose();
    startedOutside = false;
  });
  window.addEventListener('popstate', (event) => {
    const entry = event.state?.recordModal;
    if (entry?.key === historyKey && openers.has(entry.id)) {
      if (!dialog.open) openers.get(entry.id)(false);
    } else if (dialog.open) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    closing = false;
    if (!active) return;
    if (active.body) active.details.append(active.body);
    content.replaceChildren();
    document.documentElement.style.overflow = active.overflow;
    active.button.focus({ preventScroll: true });
    window.scrollTo(active.scrollX, active.scrollY);
    active = null;
  });

  cards.forEach((card) => {
    const details = card.querySelector('.record-details');
    const body = details?.querySelector('.record-detail-body');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'record-open';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `${card.querySelector('h3').textContent}のカードを拡大`);
    card.append(button);
    if (details) details.hidden = true;
    const open = (pushHistory = true) => {
      if (dialog.open) return;
      active = { details, body, button, scrollX: window.scrollX, scrollY: window.scrollY, overflow: document.documentElement.style.overflow };
      title.textContent = card.querySelector('h3').textContent;
      content.append(card.querySelector('.record-overview').cloneNode(true));
      const goal = card.querySelector('.record-goal');
      if (goal) content.append(goal.cloneNode(true));
      if (body) content.append(body);
      const updated = card.querySelector('.record-updated');
      if (updated) content.append(updated.cloneNode(true));
      dialog.showModal();
      content.scrollTop = 0;
      document.documentElement.style.overflow = 'hidden';
      if (pushHistory) {
        history.pushState({ ...history.state, recordModal: { key: historyKey, id: card.id } }, '');
      }
    };
    openers.set(card.id, open);
    button.addEventListener('click', () => open());
  });
})();
