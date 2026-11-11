import { embedUrl } from './core.js';

const $ = s => document.querySelector(s);
const labels = { hero:'Pomodoro', tasks:'Tarefas', sound:'Sons', player:'Mídia', stats:'Estatísticas', spaces:'Ambientes' };
const icons = { hero:'◷', tasks:'☑', sound:'♬', player:'▷', stats:'▥', spaces:'◉' };

function assetStore(action, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('meu-espaco-assets', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('backgrounds');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('backgrounds', action === 'get' ? 'readonly' : 'readwrite');
      const op = action === 'get' ? tx.objectStore('backgrounds').get('current') : tx.objectStore('backgrounds').put(value, 'current');
      tx.oncomplete = () => { resolve(op.result); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    };
  });
}

export function initWorkspace({state, save, toast}) {
  document.body.classList.add('workspace');
  const preferences = state.workspace = { autoHide:true, hideAfter:5, scene:'forest', videoUrl:'', backgroundVolume:0, positions:{}, open:['hero'], ...state.workspace };
  preferences.hideAfter = Math.min(120, Math.max(2, Number(preferences.hideAfter) || 5));
  const root = $('#viewport-1-winner'); root.id = 'workspace-ui';
  const nav = $('#viewport-1-winner-nav');
  const hero = $('#viewport-1-winner-hero');
  const roomButtons = [...hero.querySelectorAll('[data-room]')];
  const settingsForm = $('#settings-form');
  const timerParts = ['#clock','#toggle-timer','#reset','.mode-tabs','#timer-progress'].map($);
  hero.replaceChildren();
  const timerBody = document.createElement('div'); timerBody.className = 'timer-body';
  const timerRow = document.createElement('div'); timerRow.className = 'timer-row';
  timerRow.append(...timerParts.slice(0,3));
  const timerFooter = document.createElement('div'); timerFooter.className = 'timer-footer';
  timerFooter.append(timerParts[3]);
  const config = document.createElement('details'); config.id = 'timer-config';
  config.innerHTML = '<summary aria-label="Configurar tempos do Pomodoro" title="Configurar tempos">⚙</summary>';
  config.append(settingsForm); timerFooter.append(config);
  timerBody.append(timerRow,timerFooter,timerParts[4]);
  hero.append(timerBody);
  // Preserve the existing timer and room handlers while moving their controls.
  const roomActions = document.createElement('div'); roomActions.hidden = true; roomActions.append(...roomButtons); document.body.append(roomActions);
  settingsForm.addEventListener('submit', () => { config.open = false; clampPanel(hero); wake(); });
  config.addEventListener('toggle', () => {
    if(config.open)for(const [mode,value] of Object.entries(state.durations))settingsForm.elements[mode].value=value;
    clampPanel(hero); wake();
  });
  const timerRoom = document.createElement('span'); timerRoom.id='timer-room'; timerRoom.className='sr-only';hero.append(timerRoom);

  document.body.insertAdjacentHTML('afterbegin', `<div id="scene" aria-hidden="true"><div id="scene-image"></div><video id="scene-video" muted loop playsinline preload="metadata" hidden></video><div id="scene-youtube" hidden></div></div>`);
  const bar = document.createElement('div');bar.id='workspace-bar';bar.className='workspace-chrome';
  bar.innerHTML = `<div class="top-group"><span class="workspace-name">◌ Meu Espaço</span><button id="focus-toggle" title="Ocultar ferramentas agora">◉ Foco</button></div><div class="top-group"><label class="room-select-label">Sala <select id="workspace-room" aria-label="Sala de foco"><option value="study">Estudos</option><option value="work">Trabalho</option></select></label><button id="fullscreen" aria-label="Tela cheia" title="Tela cheia">⛶</button><button id="appearance" aria-label="Aparência" title="Aparência e modo foco">⚙</button></div>`;
  document.body.append(bar);
  $('#workspace-room').value=state.room;
  $('#workspace-room').onchange=e=>{roomButtons.find(b=>b.dataset.room===e.target.value).click();e.target.blur();wake();};
  nav.className='workspace-chrome';
  nav.innerHTML=Object.keys(labels).map(name=>`<button data-panel="${name}" aria-controls="viewport-1-winner-${name}" aria-expanded="false"><span>${icons[name]}</span>${labels[name]}</button>`).join('');

  const spaces=document.createElement('div');spaces.id='viewport-1-winner-spaces';
  spaces.innerHTML=`<div class="panel-content"><h2>Seu ambiente</h2><p class="hint">Uma paisagem para acompanhar seu foco.</p><button id="forest-scene" class="scene-card"><img src="/assets/forest-trail.webp" alt="Trilha em uma floresta"><span>Trilha na floresta</span></button><button id="neutral-scene">Fundo neutro</button><hr><label class="file-label">Imagem ou vídeo do computador<input id="scene-file" type="file" accept="image/*,video/*"></label><p class="hint">O arquivo fica salvo somente neste navegador.</p><form id="scene-url-form"><label>Vídeo por link<input id="scene-url" type="url" placeholder="YouTube ou link direto MP4 / WebM" required></label><button>Usar vídeo</button></form><p id="scene-status" role="status"></p><div class="scene-controls"><button id="scene-play">Pausar vídeo</button><label>Áudio do vídeo<input id="scene-volume" type="range" min="0" max="100" value="${preferences.backgroundVolume}"></label></div><p class="hint">Vídeos do YouTube ficam sem áudio neste fundo. Para ouvir música, use Mídia.</p><small>Foto: <a href="https://unsplash.com/photos/a-dirt-path-in-the-middle-of-a-forest-GJJdGDsoomU" target="_blank" rel="noopener">Anton Sobotyak / Unsplash ↗</a></small></div>`;
  root.append(spaces);
  $('#scene-url').value=preferences.videoUrl;
  const settings=$('#settings');
  settings.innerHTML=`<header><h2>Aparência e foco</h2><button data-close aria-label="Fechar">×</button></header><p>Painéis escuros sobre o seu ambiente.</p><label>Ocultar ferramentas sem interação<input id="auto-hide" type="checkbox" ${preferences.autoHide?'checked':''}></label><label>Ocultar após (segundos)<input id="hide-after" type="number" min="2" max="120" value="${preferences.hideAfter}"></label><p class="hint">Mova o mouse, toque na tela ou pressione uma tecla para mostrar os controles novamente. O cronômetro e os sons continuam funcionando.</p><button id="reset-layout">Restaurar posições das janelas</button><hr><button id="notify">Ativar aviso do navegador</button>`;
  settings.querySelector('[data-close]').onclick=()=>settings.close();
  $('#notify').onclick=async()=>{if(!('Notification'in window))return toast('Este navegador não oferece notificações.');toast(await Notification.requestPermission()==='granted'?'Avisos ativados.':'Avisos não autorizados.');};
  $('#appearance').onclick=()=>{wake();settings.showModal();};
  $('#auto-hide').onchange=e=>{preferences.autoHide=e.target.checked;save();wake();};
  $('#hide-after').onchange=e=>{preferences.hideAfter=Math.min(120,Math.max(2,Number(e.target.value)||5));e.target.value=preferences.hideAfter;save();wake();};
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Não foi possível ativar a tela cheia.');}};

  let z=20, dragging=false, inactivity, objectUrl, sceneRevision=0;
  const panelMap=new Map();
  function hideChrome(){
    const editing=document.activeElement?.matches('input:not([type="range"]):not([type="checkbox"]):not([type="file"]),textarea,select');
    if(dragging || document.querySelector('dialog[open]') || config.open || editing) { scheduleHide();return; }
    document.body.classList.add('focus-hidden');
    [root,bar].forEach(el=>el.inert=true);
    if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  }
  function scheduleHide(){clearTimeout(inactivity);if(preferences.autoHide)inactivity=setTimeout(hideChrome,preferences.hideAfter*1000);}
  function wake(){document.body.classList.remove('focus-hidden');[root,bar].forEach(el=>el.inert=false);scheduleHide();}
  ['pointermove','pointerdown','keydown','wheel','touchstart'].forEach(event=>document.addEventListener(event,wake,{passive:true,capture:true}));
  document.addEventListener('workspace:notice',wake);
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',wake));
  $('#focus-toggle').onclick=()=>{document.activeElement.blur();hideChrome();};

  function defaultPosition(name,panel){
    if(innerWidth<600)return {x:88,y:70};
    if(name==='hero')return {x:innerWidth-panel.offsetWidth-22,y:74};
    if(name==='stats')return {x:Math.max(100,(innerWidth-panel.offsetWidth)/2),y:110};
    return {x:100,y:74};
  }
  function setPosition(panel,x,y){
    const left=Math.max(8,Math.min(x,innerWidth-panel.offsetWidth-8));
    const top=Math.max(64,Math.min(y,innerHeight-Math.min(panel.offsetHeight,innerHeight-72)-8));
    panel.style.left=`${left}px`;panel.style.top=`${top}px`;
  }
  function clampPanel(panel){if(!panel.hidden)setPosition(panel,parseFloat(panel.style.left)||8,parseFloat(panel.style.top)||74);}
  function persistPosition(name,panel){preferences.positions[name]={x:parseFloat(panel.style.left)/innerWidth,y:parseFloat(panel.style.top)/innerHeight};save();}
  function setOpen(name,open){
    const panel=panelMap.get(name);panel.hidden=!open;
    const button=nav.querySelector(`[data-panel="${name}"]`);button.setAttribute('aria-expanded',String(open));button.classList.toggle('active',open);
    if(open){panel.style.zIndex=++z;const saved=preferences.positions[name];const position=saved?{x:saved.x*innerWidth,y:saved.y*innerHeight}:defaultPosition(name,panel);setPosition(panel,position.x,position.y);}
    preferences.open=[...panelMap].filter(([,p])=>!p.hidden).map(([id])=>id);save();wake();
  }
  const initiallyOpen=new Set(preferences.open);
  for(const name of Object.keys(labels)){
    const panel=$(`#viewport-1-winner-${name}`);panel.classList.add('floating-panel');panel.dataset.window=name;panelMap.set(name,panel);
    const handle=document.createElement('div');handle.className='window-handle';handle.tabIndex=0;handle.setAttribute('aria-label',`Mover janela ${labels[name]} com as setas`);
    handle.innerHTML=`<span>${labels[name]}</span><span class="drag-dots" aria-hidden="true">⠿</span><button aria-label="Fechar ${labels[name]}" title="Ocultar painel">−</button>`;
    panel.prepend(handle);
    handle.querySelector('button').onclick=()=>setOpen(name,false);
    panel.addEventListener('pointerdown',()=>panel.style.zIndex=++z);
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0 || e.target.closest('button'))return;
      e.preventDefault();dragging=true;wake();handle.setPointerCapture(e.pointerId);
      const rect=panel.getBoundingClientRect(), startX=e.clientX, startY=e.clientY;
      const move=event=>setPosition(panel,rect.left+event.clientX-startX,rect.top+event.clientY-startY);
      const end=()=>{dragging=false;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);persistPosition(name,panel);wake();};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    });
    handle.addEventListener('keydown',e=>{const shifts={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(!shifts[e.key]||e.target!==handle)return;e.preventDefault();const [dx,dy]=shifts[e.key];setPosition(panel,parseFloat(panel.style.left)+dx,parseFloat(panel.style.top)+dy);persistPosition(name,panel);});
    panel.hidden=true;
  }
  for(const name of Object.keys(labels))setOpen(name,initiallyOpen.has(name));
  nav.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{const name=button.dataset.panel;setOpen(name,panelMap.get(name).hidden);});
  $('#reset-layout').onclick=()=>{preferences.positions={};for(const [name,panel]of panelMap)if(!panel.hidden){const pos=defaultPosition(name,panel);setPosition(panel,pos.x,pos.y);}save();};
  window.addEventListener('resize',()=>{for(const panel of panelMap.values())clampPanel(panel);});

  const video=$('#scene-video'),image=$('#scene-image'),youtube=$('#scene-youtube');
  function clearScene(){video.pause();video.removeAttribute('src');video.load();video.hidden=true;youtube.hidden=true;youtube.replaceChildren();image.hidden=false;image.style.backgroundImage='';image.classList.remove('neutral');if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}}
  function controls(){const isVideo=preferences.scene==='file-video'||preferences.scene==='video-url';$('.scene-controls').hidden=!isVideo;$('#scene-play').textContent=video.paused?'Reproduzir vídeo':'Pausar vídeo';}
  async function applyScene(){
    const revision=++sceneRevision;clearScene();$('#scene-status').textContent='';
    try{
      if(preferences.scene==='neutral')image.classList.add('neutral');
      else if(preferences.scene==='file-image'||preferences.scene==='file-video'){
        const file=await assetStore('get');if(revision!==sceneRevision)return;if(!file)throw new Error('Escolha o arquivo de fundo novamente.');
        objectUrl=URL.createObjectURL(file);
        if(preferences.scene==='file-image')image.style.backgroundImage=`url("${objectUrl}")`;
        else{video.src=objectUrl;video.hidden=false;image.hidden=true;}
      }else if(preferences.scene==='video-url'){video.src=preferences.videoUrl;video.hidden=false;image.hidden=true;}
      else if(preferences.scene==='youtube'){
        const url=embedUrl(preferences.videoUrl);if(!url?.startsWith('https://www.youtube-nocookie.com/'))throw new Error('Link do YouTube inválido.');
        const id=url.split('/').at(-1),iframe=document.createElement('iframe');iframe.title='Vídeo de fundo';iframe.src=`${url}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1`;iframe.allow='autoplay; encrypted-media';iframe.tabIndex=-1;youtube.append(iframe);youtube.hidden=false;image.hidden=true;
        $('#scene-status').textContent='Se o vídeo não permitir reprodução incorporada, escolha outro link ou arquivo local.';
      }
      if(!video.hidden){video.volume=preferences.backgroundVolume/100;video.muted=preferences.backgroundVolume===0;try{await video.play();}catch{if(revision===sceneRevision)$('#scene-status').textContent='Clique em Reproduzir vídeo para iniciar o fundo.';}}
    }catch(error){if(revision===sceneRevision){image.hidden=false;$('#scene-status').textContent=error.message;}}
    if(revision===sceneRevision)controls();
  }
  video.addEventListener('error',()=>{if(!video.hidden){image.hidden=false;video.hidden=true;$('#scene-status').textContent='Não foi possível reproduzir este vídeo. Tente MP4/WebM compatível ou outro arquivo.';controls();}});
  $('#forest-scene').onclick=()=>{preferences.scene='forest';save();applyScene();};
  $('#neutral-scene').onclick=()=>{preferences.scene='neutral';save();applyScene();};
  $('#scene-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    if(!file.type.startsWith('image/')&&!file.type.startsWith('video/'))return toast('Escolha um arquivo de imagem ou vídeo.');
    try{await assetStore('put',file);preferences.scene=file.type.startsWith('video/')?'file-video':'file-image';save();await applyScene();}catch{toast('Não foi possível guardar o arquivo. Tente um arquivo menor.');}
  };
  $('#scene-url-form').onsubmit=e=>{
    e.preventDefault();const value=$('#scene-url').value.trim();let url;try{url=new URL(value);}catch{return toast('Informe um link válido.');}
    if(!['http:','https:'].includes(url.protocol))return toast('Use um link HTTP ou HTTPS.');
    const embedded=embedUrl(value);const isYoutube=embedded?.startsWith('https://www.youtube-nocookie.com/');
    if(!isYoutube&&!/\.(mp4|webm|ogg)$/i.test(url.pathname))return toast('Use um vídeo do YouTube ou um link direto MP4/WebM.');
    preferences.videoUrl=value;preferences.scene=isYoutube?'youtube':'video-url';save();applyScene();$('#scene-url').blur();
  };
  $('#scene-play').onclick=async()=>{if(video.paused){try{await video.play();$('#scene-status').textContent='';}catch{toast('Não foi possível iniciar este vídeo.');}}else video.pause();controls();};
  $('#scene-volume').oninput=e=>{preferences.backgroundVolume=Number(e.target.value);video.volume=preferences.backgroundVolume/100;video.muted=preferences.backgroundVolume===0;save();};
  applyScene();wake();
}
