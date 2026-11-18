// @ybouane/liquidglass 1.0.3 (MIT), bundle local para uso offline.
import { LiquidGlass } from './vendor/ybouane-liquidglass.js';

// Regular Glass: lente nítida; o acabamento fosco dos painéis fica no CSS.
const REGULAR_GLASS = Object.freeze({
  refraction: 1.35, blurAmount: 0, chromAberration: .06,
  edgeHighlight: .1, specular: .18, fresnel: .8,
  tintStrength: 0, brightness: .02, shadowOpacity: 0,
  shadowSpread: 0, shadowOffsetY: 0, floating: false
});

export function initLiquidGlass() {
  const targets = 'button:not(.liquid-tabs button):not(.scene-card):not(.yt-card):not(.resize-grip),.liquid-mode-indicator,.liquid-switch-thumb';
  let instance, root, pairs = [], timer, frame, building = false, queued = false;
  const reduced = matchMedia('(prefers-reduced-transparency: reduce)');

  function alignSelection(tabs) {
    if (tabs.classList.contains('liquid-held')) return;
    const selected = tabs.querySelector('button.active,button[aria-pressed=true]');
    if (!selected) return;
    tabs.style.setProperty('--selection-left', `${selected.offsetLeft}px`);
    tabs.style.setProperty('--selection-top', `${selected.offsetTop}px`);
    tabs.style.setProperty('--selection-width', `${selected.offsetWidth}px`);
    tabs.style.setProperty('--selection-height', `${selected.offsetHeight}px`);
  }

  // O motor exige filhos diretos. As lentes ficam em uma cena de composição
  // separada; seus canvases são exibidos nos controles originais, sem movê-los.
  document.querySelectorAll('.mode-tabs,.yt-tabs:not(.yt-account)').forEach(tabs => {
    tabs.classList.add('liquid-tabs');
    const indicator = document.createElement('span');
    indicator.className = 'liquid-mode-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    tabs.prepend(indicator);
    alignSelection(tabs);
    new ResizeObserver(() => alignSelection(tabs)).observe(tabs);
    new MutationObserver(() => alignSelection(tabs)).observe(tabs, {
      subtree: true, attributes: true, attributeFilter: ['class','aria-pressed','hidden']
    });
    let drag, suppressClick = false;
    tabs.addEventListener('pointerdown', event => {
      if (document.body.dataset.surfaceStyle !== 'glass' || event.button !== 0) return;
      const button = event.target.closest('button.active,button[aria-pressed=true]');
      if (!button) return;
      const buttons = [...tabs.querySelectorAll('button')].filter(item => !item.hidden && item.offsetWidth);
      drag = { id: event.pointerId, startX: event.clientX, left: button.offsetLeft, width: button.offsetWidth, moved: false, target: button, buttons };
      tabs.classList.add('liquid-held');
      tabs.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    tabs.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = event.clientX - drag.startX;
      drag.moved ||= Math.abs(delta) > 4;
      if (!drag.moved) return;
      const buttons = drag.buttons;
      tabs.classList.add('liquid-dragging');
      const left = Math.max(buttons[0].offsetLeft, Math.min(buttons.at(-1).offsetLeft, drag.left + delta));
      tabs.style.setProperty('--selection-left', `${left}px`);
      tabs.style.setProperty('--liquid-stretch', String(1 + Math.min(Math.abs(delta) / 450, .16)));
      const center = left + drag.width / 2;
      drag.target = buttons.reduce((best, candidate) => Math.abs(candidate.offsetLeft + candidate.offsetWidth / 2 - center) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - center) ? candidate : best);
      event.preventDefault();
    });
    const finishDrag = (event, cancelled = false) => {
      if (!drag || event.pointerId !== drag.id) return;
      const finished = drag;
      drag = undefined;
      tabs.classList.remove('liquid-held', 'liquid-dragging');
      tabs.style.removeProperty('--liquid-stretch');
      if (!cancelled && finished.moved) {
        finished.target.click();
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      }
      alignSelection(tabs);
      if (tabs.hasPointerCapture(event.pointerId)) tabs.releasePointerCapture(event.pointerId);
    };
    tabs.addEventListener('pointerup', event => finishDrag(event));
    tabs.addEventListener('pointercancel', event => finishDrag(event, true));
    tabs.addEventListener('lostpointercapture', event => finishDrag(event, true));
    tabs.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drag) { finishDrag({ pointerId: drag.id }, true); event.preventDefault(); }
    });
    tabs.addEventListener('click', event => {
      if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
  });
  const toggle = document.querySelector('#auto-hide');
  if (toggle) {
    const thumb = document.createElement('span');
    thumb.className = 'liquid-switch-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    toggle.after(thumb);
  }

  function clear() {
    cancelAnimationFrame(frame);
    for (const { source, host } of pairs) {
      source.classList.remove('liquid-surface', 'liquid-relative');
      host?.remove();
    }
    instance?.destroy();
    instance = undefined;
    root?.remove();
    root = undefined;
    pairs = [];
    delete document.body.dataset.liquidEngine;
  }

  function sync() {
    let changed = false;
    for (const pair of pairs) {
      const { source, lens, host } = pair;
      // Atualizações de rótulo não devem apagar o canvas do botão.
      if (host && host.parentElement !== source) source.prepend(host);
      const rect = source.getBoundingClientRect();
      const style = getComputedStyle(source);
      const geometry = [rect.left, rect.top, rect.width, rect.height, style.borderRadius].join(',');
      if (geometry !== pair.geometry) {
        pair.geometry = geometry;
        Object.assign(lens.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
        const radius = Math.min(parseFloat(style.borderRadius) || 0, rect.width / 2, rect.height / 2);
        const selected = source.classList.contains('liquid-mode-indicator');
        lens.dataset.config = JSON.stringify({
          cornerRadius: radius,
          // Uma curvatura mais larga estende a refração da borda para dentro.
          zRadius: selected
            ? Math.min(32, rect.height * .8)
            : Math.max(8, Math.min(30, Math.min(rect.width, rect.height) * .7)),
          ...(selected ? { refraction: 1.8, edgeHighlight: .25, specular: .4, fresnel: 1, chromAberration: .09 } : {})
        });
        changed = true;
      }
    }
    if (changed) instance?.markChanged();
  }

  function track() {
    sync();
    frame = requestAnimationFrame(track);
  }

  async function rebuild() {
    if (building) { queued = true; return; }
    building = true;
    clear();
    try {
      if (document.body.dataset.surfaceStyle !== 'glass' || reduced.matches) return;
      // O iframe externo do YouTube não disponibiliza seus pixels ao WebGL.
      // O fallback CSS não é apresentado como refração.
      if (document.querySelector('#scene-youtube:not([hidden])')) {
        document.body.dataset.liquidEngine = 'youtube-fallback';
        return;
      }
      const sources = [...document.querySelectorAll(targets)].filter(source => {
        const rect = source.getBoundingClientRect();
        if (!rect.width || !rect.height || source.closest('[hidden]')) return false;
        if (getComputedStyle(source).visibility === 'hidden') return false;
        return true;
      });
      if (!sources.length) return;
      root = document.createElement('div');
      root.id = 'liquid-compositor';
      root.setAttribute('aria-hidden', 'true');
      document.body.append(root);
      const scene = document.querySelector('#scene-image');
      const background = document.createElement(scene.classList.contains('neutral') ? 'div' : 'img');
      Object.assign(background.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', background: getComputedStyle(scene).background });
      if (background instanceof HTMLImageElement) {
        background.src = new URL('../assets/forest-trail.webp', import.meta.url).href;
        await background.decode();
      }
      root.append(background);
      pairs = sources.map(source => {
        const lens = document.createElement('div');
        lens.style.position = 'absolute';
        root.append(lens);
        return { source, lens };
      });
      sync();
      instance = await LiquidGlass.init({ root, glassElements: pairs.map(pair => pair.lens), defaults: REGULAR_GLASS });
      for (const pair of pairs) {
        const { source, lens } = pair;
        const canvas = instance.glassCanvases.get(lens);
        if (!canvas) throw new Error('LiquidGlass não criou a lente.');
        canvas.classList.add('liquid-output');
        if (getComputedStyle(source).position === 'static') source.classList.add('liquid-relative');
        const host = pair.host = document.createElement('span');
        host.className = 'liquid-canvas-host';
        host.setAttribute('aria-hidden', 'true');
        host.append(canvas);
        source.prepend(host);
        source.classList.add('liquid-surface');
      }
      document.body.dataset.liquidEngine = 'ybouane';
      instance.markChanged();
      track();
    } catch (error) {
      clear();
      console.warn('LiquidGlass indisponível; usando acabamento CSS.', error);
    } finally {
      building = false;
      if (queued) { queued = false; refresh(); }
    }
  }

  function refresh() {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 120);
  }
  new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['data-surface-style', 'class'] });
  new MutationObserver(refresh).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'open'] });
  document.addEventListener('workspace:notice', refresh);
  document.addEventListener('toggle', event => {
    if (event.target.matches('dialog,[popover],#timer-config')) refresh();
  }, true);
  document.addEventListener('click', event => {
    if (!event.target.closest('button')) return;
    setTimeout(() => {
      const visible = [...document.querySelectorAll(targets)].filter(source => {
        const rect = source.getBoundingClientRect();
        return rect.width && rect.height && !source.closest('[hidden]') && getComputedStyle(source).visibility !== 'hidden';
      });
      if (visible.length !== pairs.length || visible.some((source, i) => source !== pairs[i].source)) refresh();
      else sync();
    }, 0);
  });
  document.querySelectorAll('.scene-card').forEach(button => button.addEventListener('click', refresh));
  reduced.addEventListener('change', refresh);
  refresh();
}
