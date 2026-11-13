// Small, cancellable transitions; reduced motion also applies to JS animations.
const transitions = new WeakMap();
export function transitionSurface(element, open, done = () => {}) {
  const previous = transitions.get(element);
  const from = previous ? { opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform } : null;
  previous?.cancel();
  const resting = { opacity: 1, transform: 'translateY(0) scale(1)' };
  const collapsed = { opacity: 0, transform: 'translateY(6px) scale(.975)' };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { transitions.delete(element); done(); return; }
  const animation = element.animate([from || (open ? collapsed : resting), open ? resting : collapsed], {
    duration: open ? 220 : 160, easing: open ? 'cubic-bezier(.2,.8,.2,1)' : 'cubic-bezier(.4,0,1,1)', fill: 'both'
  });
  transitions.set(element, animation);
  animation.finished.then(() => {
    if (transitions.get(element) !== animation) return;
    transitions.delete(element); done(); animation.cancel();
  }).catch(() => {});
}

export function initDialogs() {
  document.querySelectorAll('dialog').forEach(dialog => {
    // Initial dialog focus must not activate contextual help.
    const heading = dialog.querySelector('h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.setAttribute('autofocus', '');
    }
    const nativeShow = dialog.showModal.bind(dialog), nativeClose = dialog.close.bind(dialog);
    let closing = false;
    dialog.showModal = () => { closing = false; nativeShow(); transitionSurface(dialog, true); };
    dialog.close = value => {
      if (!dialog.open || closing) return;
      closing = true;
      transitionSurface(dialog, false, () => { nativeClose(value); closing = false; });
    };
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    let outside = false;
    const isOutside = event => {
      const r = dialog.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', event => { outside = event.target === dialog && isOutside(event); });
    dialog.addEventListener('click', event => { if (outside && event.target === dialog && isOutside(event)) dialog.close(); outside = false; });
  });
}

const paths = {
  hero: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',
  notes: '<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  tasks: '<rect x="4" y="4" width="16" height="17" rx="4"/><path d="m8 12 3 3 5-6M9 4V2h6v2"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  player: '<path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  stats: '<path d="M4 20V4M4 20h17M9 16v-5M14 16V7M19 16v-8"/>',
  spaces: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="15.5" cy="8.5" r="1.5"/><path d="m3 17 6-6 5 5 3-3 4 4"/>',
  close: '<path d="m7 7 10 10M17 7 7 17"/>',
  minimize: '<path d="M6 12h12"/>'
};
export const icon = name => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

// Keep secondary explanations available without competing with the controls.
export function initContextHelp() {
  const groups = [
    ['#viewport-1-winner-notes', 'Sobre as notas', ['.notes-help']],
    ['#viewport-1-winner-stats', 'Sobre as estatísticas', ['.stats-help', '.stats-footer>span']],
    ['#viewport-1-winner-spaces', 'Sobre os ambientes', ['.panel-content>.hint', '.panel-content>small']],
    ['#viewport-1-winner-player', 'Sobre a mídia', ['.hint']],
    ['#viewport-1-winner-sound', 'Sobre os sons', ['.hint', 'details>small']],
    ['#viewport-1-winner-tasks', 'Sobre as tarefas', ['footer']],
    ['#settings', 'Sobre aparência e foco', [':scope>p']],
  ];
  let active = null;
  for (const [selector, title, selectors] of groups) {
    const host = document.querySelector(selector);
    const notes = selectors.flatMap(s => [...host.querySelectorAll(s)]).filter(note => !note.id && !note.closest('#ambience-controls'));
    if (!notes.length) continue;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'info-button'; button.textContent = 'i';
    button.setAttribute('aria-label', title); button.setAttribute('aria-expanded', 'false');
    const popup = document.createElement('div');
    popup.id = `help-${host.id}`; popup.className = 'info-popover'; popup.popover = 'auto';
    popup.setAttribute('role', 'region'); popup.setAttribute('aria-label', title);
    button.setAttribute('aria-controls', popup.id);
    const heading = document.createElement('strong'); heading.textContent = title; popup.append(heading);
    for (const note of notes) { const p = document.createElement('div'); p.className = 'info-copy'; p.append(...note.childNodes); popup.append(p); note.remove(); }
    const header = host.querySelector('.window-handle') || host.querySelector('header');
    header.insertBefore(button, header.querySelector('.drag-dots') || header.querySelector('[data-close]'));
    host.append(popup);
    let pinned = false, timer;
    const close = () => { clearTimeout(timer); popup.hidePopover(); pinned = false; };
    const position = () => {
      const r = button.getBoundingClientRect();
      popup.style.left = `${Math.max(12, Math.min(r.right-popup.offsetWidth, innerWidth-popup.offsetWidth-12))}px`;
      popup.style.top = `${Math.max(12, r.bottom+8+popup.offsetHeight>innerHeight-12 ? r.top-popup.offsetHeight-8 : r.bottom+8)}px`;
    };
    const show = () => { clearTimeout(timer); if (active && active !== close) active(); active = close; popup.showPopover(); position(); };
    const later = () => { clearTimeout(timer); timer = setTimeout(() => { if (!pinned && !button.matches(':hover') && !popup.matches(':hover') && !popup.contains(document.activeElement) && document.activeElement !== button) close(); }, 180); };
    button.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(); });
    button.addEventListener('pointerleave', later);
    button.addEventListener('focus', show);
    button.addEventListener('blur', later);
    button.addEventListener('click', () => { if (pinned) { close(); } else { show(); pinned = true; } });
    popup.addEventListener('pointerenter', () => clearTimeout(timer));
    popup.addEventListener('pointerleave', later); popup.addEventListener('focusout', later);
    popup.addEventListener('toggle', () => { const open = popup.matches(':popover-open'); button.setAttribute('aria-expanded', String(open)); if (!open) pinned = false; });
    host.addEventListener('close', close);
    window.addEventListener('resize', close);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.querySelector('.info-popover:popover-open')) {
      e.preventDefault(); e.stopImmediatePropagation(); active?.();
    }
  }, true);
  // Closing a tool or entering focus mode also dismisses its help.
  document.addEventListener('click', e => { if (e.target.closest('.close-button,[data-panel],#stats-shortcut')) active?.(); }, true);
  new MutationObserver(() => { if (document.body.classList.contains('focus-hidden')) active?.(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

export function initRoomMenu() {
  document.querySelectorAll('select').forEach(enhanceSelect);
}

function enhanceSelect(select) {
  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.id = `${select.id}-menu`; trigger.className = 'room-menu-trigger';
  trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  const accessibleName = select.getAttribute('aria-label') || [...(select.closest('label')?.childNodes || [])].filter(node=>node.nodeType===3).map(node=>node.textContent.trim()).join(' ') || 'Selecionar opção';
  trigger.setAttribute('aria-label', accessibleName);
  const label = document.createElement('span');
  trigger.append(label); trigger.insertAdjacentHTML('beforeend', '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 5.5 3 3 3-3"/></svg>');
  const menu = document.createElement('div');
  menu.id = `${select.id}-options`; menu.className = 'room-menu'; menu.popover = 'auto';
  menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', accessibleName);
  trigger.setAttribute('aria-controls', menu.id);
  select.hidden = true; select.after(trigger);
  (select.closest('dialog') || document.body).append(menu);
  const items = [...select.options].filter(option => !option.disabled).map(option => {
    const item = document.createElement('button'); item.type = 'button'; item.tabIndex = -1;
    item.setAttribute('role', 'menuitemradio'); item.dataset.value = option.value;
    const text = document.createElement('span'); text.textContent = option.textContent;
    const check = document.createElement('span'); check.className = 'menu-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
    item.append(text, check); menu.append(item);
    item.onclick = () => { select.value = option.value; select.dispatchEvent(new Event('change', {bubbles:true})); menu.hidePopover(); trigger.focus({preventScroll:true}); };
    return item;
  });
  function sync() {
    trigger.disabled = select.disabled;
    label.textContent = select.selectedOptions[0]?.textContent || 'Selecionar';
    items.forEach(item => item.setAttribute('aria-checked', String(item.dataset.value === (select.value || (select.id==='stats-room'?'all':'')))));
  }
  function close(){ if(menu.matches(':popover-open'))menu.hidePopover(); }
  function open(last = false) {
    sync(); if(trigger.disabled)return; menu.showPopover();
    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${Math.max(8,Math.min(rect.right-menu.offsetWidth,innerWidth-menu.offsetWidth-8))}px`;
    menu.style.top = `${Math.max(8,rect.bottom+6+menu.offsetHeight>innerHeight-8?rect.top-menu.offsetHeight-6:rect.bottom+6)}px`;
    (last ? items.at(-1) : items.find(item=>item.getAttribute('aria-checked')==='true') || items[0]).focus({preventScroll:true});
  }
  trigger.onclick = () => menu.matches(':popover-open') ? close() : open();
  trigger.onkeydown = event => { if (['ArrowDown','ArrowUp'].includes(event.key)) {event.preventDefault(); open(event.key==='ArrowUp');} };
  menu.addEventListener('keydown', event => {
    const index = items.indexOf(document.activeElement);
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const next = event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items[next].focus();
    }
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();trigger.focus();}
    if(event.key==='Tab'){close();trigger.focus();}
  });
  menu.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
  select.addEventListener('change',sync);
  select.addEventListener('selection:sync',sync);
  select.form?.addEventListener('settings:open',sync);
  select.closest('dialog')?.addEventListener('close',close);
  window.addEventListener('resize',close);
  document.addEventListener('click',event=>{if(event.target.closest('.close-button,[data-panel]'))close();},true);
  new MutationObserver(()=>{if(document.body.classList.contains('focus-hidden'))close();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  sync();
}
