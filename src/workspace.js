import { embedUrl } from './core.js';
import { initYouTubeCatalog } from './youtube.js';
import { initSceneBar } from './scene-bar.js';
import { initGoogleAccount } from './google-account.js';
import { initCompact } from './compact.js';
import { transitionSurface, initDialogs, initContextHelp, initRoomMenu, icon } from './interface.js';

const $ = s => document.querySelector(s);
const labels = { hero:'Pomodoro', tasks:'Tarefas', notes:'Notas', sound:'Sons', player:'Mídia', stats:'Estatísticas', spaces:'Ambientes' };



export function initWorkspace({state, save, toast}) {
  document.body.classList.add('workspace');
  const preferences = state.workspace = { autoHide:true, hideAfter:5, scene:'forest', videoUrl:'', backgroundVolume:0, positions:{}, sizes:{}, open:['hero'], ...state.workspace };
  preferences.sizes = preferences.sizes?.player ? { player: preferences.sizes.player } : {};
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
    if(config.open){for(const [mode,value] of Object.entries(state.durations))settingsForm.elements[mode].value=value;settingsForm.dispatchEvent(new Event('settings:open'));}
    clampPanel(hero); wake();
  });
  const timerRoom = document.createElement('span'); timerRoom.id='timer-room'; timerRoom.className='sr-only';hero.append(timerRoom);

  document.body.insertAdjacentHTML('afterbegin', `<div id="scene" aria-hidden="true"><div id="scene-image"></div><div id="scene-youtube" hidden></div></div>`);
  const bar = document.createElement('div');bar.id='workspace-bar';bar.className='workspace-chrome';
  bar.innerHTML = `<div class="top-group"><span class="workspace-name">◌ Sussa</span><button id="stats-shortcut" aria-label="Abrir estatísticas" aria-controls="viewport-1-winner-stats"><span id="focus-count">0</span><span aria-hidden="true">🔥</span></button></div><div class="top-group"><label class="room-select-label">Sala <select id="workspace-room" aria-label="Sala de foco"><option value="study">Estudos</option><option value="work">Trabalho</option></select></label><button id="fullscreen" aria-label="Tela cheia" title="Tela cheia">⛶</button><button id="appearance" aria-label="Aparência" title="Aparência e modo foco">⚙</button></div>`;
  document.body.append(bar);
  $('#workspace-room').value=state.room;
  $('#workspace-room').onchange=e=>{roomButtons.find(b=>b.dataset.room===e.target.value).click();e.target.blur();wake();};
  nav.className='workspace-chrome';
  nav.innerHTML=Object.keys(labels).map(name=>`<button data-panel="${name}" aria-controls="viewport-1-winner-${name}" aria-expanded="false"><span>${icon(name)}</span>${labels[name]}</button>`).join('');

  const spaces=document.createElement('div');spaces.id='viewport-1-winner-spaces';
  spaces.innerHTML=`<div class="panel-content"><h2>Seu ambiente</h2><p class="hint">Escolha um vídeo do YouTube para o fundo ou uma imagem que funciona sem internet. O vídeo é controlado pela barra no rodapé da tela.</p><div id="youtube-slot"></div><p id="scene-now" hidden></p><p class="scene-section">Sem internet</p><div class="scene-options"><button id="forest-scene" class="scene-card" aria-pressed="false"><img src="/assets/forest-trail.webp" alt=""><span>Trilha na floresta</span></button><button id="neutral-scene" class="scene-card" aria-pressed="false"><i class="neutral-preview"></i><span>Fundo neutro</span></button></div><p id="scene-status" role="status"></p><small>Foto: <a href="https://unsplash.com/photos/a-dirt-path-in-the-middle-of-a-forest-GJJdGDsoomU" target="_blank" rel="noopener">Anton Sobotyak / Unsplash ↗</a></small></div>`;
  root.append(spaces);
  const settings=$('#settings');
  settings.innerHTML=`<header><h2>Aparência e foco</h2><button data-close aria-label="Fechar">×</button></header><p>Painéis escuros sobre o seu ambiente.</p><label>Ocultar barras<input id="auto-hide" type="checkbox" ${preferences.autoHide?'checked':''}></label><label>Tempo de espera (s)<input id="hide-after" type="number" min="2" max="120" value="${preferences.hideAfter}"></label><p class="hint">As barras superior e lateral somem após a espera. Os painéis abertos continuam visíveis. Mova o mouse, toque na tela ou pressione uma tecla para mostrar as barras novamente.</p><button id="reset-layout">Restaurar posições</button><hr><button id="notify">Ativar notificações</button>`;
  settings.querySelector('[data-close]').onclick=()=>settings.close();
  $('#notify').onclick=async()=>{if(!('Notification'in window))return toast('Este navegador não oferece notificações.');toast(await Notification.requestPermission()==='granted'?'Avisos ativados.':'Avisos não autorizados.');};
  if(window.desktopApp){const data=document.createElement('button');data.id='open-data';data.type='button';data.textContent='Abrir pasta dos dados';data.onclick=()=>window.desktopApp.openDataFolder();$('#notify').after(data);}
  initGoogleAccount({toast});
  $('#appearance').onclick=()=>{wake();settings.showModal();};
  $('#auto-hide').onchange=e=>{preferences.autoHide=e.target.checked;save();wake();};
  $('#hide-after').onchange=e=>{preferences.hideAfter=Math.min(120,Math.max(2,Number(e.target.value)||5));e.target.value=preferences.hideAfter;save();wake();};
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Não foi possível ativar a tela cheia.');}};

  let z=20, dragging=false, inactivity, youtubePaused=false, pausedForTray=false, sceneBar=null;
  const panelMap=new Map();
  function hideChrome(){
    if(document.body.classList.contains('compact-mode'))return;
    const editing=document.activeElement?.matches('input:not([type="range"]):not([type="checkbox"]):not([type="file"]),textarea,select');
    if(dragging || document.querySelector('dialog[open]') || config.open || editing) { scheduleHide();return; }
    document.body.classList.add('focus-hidden');
    [nav,bar].forEach(el=>el.inert=true);
    if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  }
  function scheduleHide(){clearTimeout(inactivity);if(preferences.autoHide)inactivity=setTimeout(hideChrome,preferences.hideAfter*1000);}
  function wake(){document.body.classList.remove('focus-hidden');[nav,bar].forEach(el=>el.inert=false);scheduleHide();}
  ['pointermove','pointerdown','keydown','wheel','touchstart'].forEach(event=>document.addEventListener(event,wake,{passive:true,capture:true}));
  document.addEventListener('workspace:notice',wake);
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',wake));
  $('#stats-shortcut').onclick=()=>{setOpen('stats',true);wake();};

  function defaultPosition(name,panel){
    if(innerWidth<600)return {x:88,y:70};
    if(name==='hero')return {x:innerWidth-panel.offsetWidth-22,y:74};
    if(name==='stats')return {x:Math.max(100,(innerWidth-panel.offsetWidth)/2),y:110};
    return {x:100,y:74};
  }
  const resizeGrips=new Map();
  function positionGrip(panel){
    const grip=resizeGrips.get(panel);if(!grip)return;
    const rect=panel.getBoundingClientRect();
    grip.style.left=`${rect.right-27}px`;grip.style.top=`${rect.bottom-27}px`;
    grip.style.zIndex=Number(panel.style.zIndex||20)+1;
    grip.hidden=panel.hidden||panel.dataset.open!=='true';
  }
  function resizePanel(panel,width,height){
    const x=parseFloat(panel.style.left)||8,y=parseFloat(panel.style.top)||74;
    const maxWidth=Math.max(180,innerWidth-x-8),maxHeight=Math.max(140,innerHeight-y-8);
    panel.style.setProperty('width',`${Math.min(maxWidth,Math.max(260,width))}px`,'important');
    panel.style.setProperty('height',`${Math.min(maxHeight,Math.max(panel.dataset.window==='hero'?170:240,height))}px`,'important');
    panel.classList.add('user-sized');positionGrip(panel);
  }
  function setPosition(panel,x,y){
    const left=Math.max(8,Math.min(x,innerWidth-panel.offsetWidth-8));
    const top=Math.max(64,Math.min(y,innerHeight-Math.min(panel.offsetHeight,innerHeight-72)-8));
    panel.style.left=`${left}px`;panel.style.top=`${top}px`;positionGrip(panel);
  }
  function clampPanel(panel){if(!panel.hidden)setPosition(panel,parseFloat(panel.style.left)||8,parseFloat(panel.style.top)||74);}
  function persistPosition(name,panel){preferences.positions[name]={x:parseFloat(panel.style.left)/innerWidth,y:parseFloat(panel.style.top)/innerHeight};save();}
  function setOpen(name,open,animate=true){
    const panel=panelMap.get(name);
    panel.dataset.open=String(open);panel.inert=!open;
    if(open)panel.hidden=false;
    const button=nav.querySelector(`[data-panel="${name}"]`);button.setAttribute('aria-expanded',String(open));button.classList.toggle('active',open);
    if(open){panel.style.zIndex=(z+=2);const saved=preferences.positions[name];const position=saved?{x:saved.x*innerWidth,y:saved.y*innerHeight}:defaultPosition(name,panel);setPosition(panel,position.x,position.y);}
    preferences.open=[...panelMap].filter(([,p])=>p.dataset.open==='true').map(([id])=>id);save();wake();
    if(!open && panel.contains(document.activeElement))button.focus({preventScroll:true});
    if(animate)transitionSurface(panel,open,()=>{panel.hidden=!open;positionGrip(panel);});else panel.hidden=!open;
    positionGrip(panel);
  }
  const initiallyOpen=new Set(preferences.open);
  for(const name of Object.keys(labels)){
    const panel=$(`#viewport-1-winner-${name}`);panel.classList.add('floating-panel');panel.dataset.window=name;panelMap.set(name,panel);
    const handle=document.createElement('div');handle.className='window-handle';handle.tabIndex=0;handle.setAttribute('aria-label',`Mover janela ${labels[name]} com as setas`);
    handle.innerHTML=`<span>${labels[name]}${name==='hero'?'<span id="cycle-dots" class="cycle-dots" role="img"></span>':''}</span><span class="drag-dots" aria-hidden="true">⠿</span><button aria-label="Minimizar ${labels[name]}" title="Minimizar ${labels[name]}" class="close-button">${icon('minimize')}</button>`;
    panel.prepend(handle);
    handle.querySelector('button').onclick=()=>setOpen(name,false);
    panel.addEventListener('pointerdown',()=>{panel.style.zIndex=(z+=2);positionGrip(panel);});
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0 || e.target.closest('button'))return;
      e.preventDefault();dragging=true;wake();handle.setPointerCapture(e.pointerId);
      const rect=panel.getBoundingClientRect(), startX=e.clientX, startY=e.clientY;
      const move=event=>setPosition(panel,rect.left+event.clientX-startX,rect.top+event.clientY-startY);
      const end=()=>{dragging=false;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);persistPosition(name,panel);wake();};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    });
    handle.addEventListener('keydown',e=>{const shifts={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(!shifts[e.key]||e.target!==handle)return;e.preventDefault();const [dx,dy]=shifts[e.key];setPosition(panel,parseFloat(panel.style.left)+dx,parseFloat(panel.style.top)+dy);persistPosition(name,panel);});
    if(name==='player'){
    const grip=document.createElement('button');grip.type='button';grip.className='resize-grip';
    grip.setAttribute('aria-label',`Redimensionar ${labels[name]} com as setas`);
    grip.title='Arraste para redimensionar. Use as setas pelo teclado.';
    grip.innerHTML='<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 11 7-7m-3 7 3-3"/></svg>';
    root.append(grip);resizeGrips.set(panel,grip);
    const persistSize=()=>{preferences.sizes[name]={width:panel.offsetWidth,height:panel.offsetHeight};save();};
    grip.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;e.preventDefault();dragging=true;wake();
      panel.style.zIndex=(z+=2);positionGrip(panel);grip.setPointerCapture(e.pointerId);
      document.body.classList.add('resizing-panel');
      const rect=panel.getBoundingClientRect(),x=e.clientX,y=e.clientY;
      const move=event=>resizePanel(panel,rect.width+event.clientX-x,rect.height+event.clientY-y);
      const end=()=>{dragging=false;document.body.classList.remove('resizing-panel');grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);persistSize();wake();};
      grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
    });
    grip.addEventListener('keydown',e=>{
      const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];
      if(!delta)return;e.preventDefault();resizePanel(panel,panel.offsetWidth+delta[0],panel.offsetHeight+delta[1]);persistSize();wake();
    });
    new ResizeObserver(()=>positionGrip(panel)).observe(panel);
    }
    panel.hidden=true;
  }
  for(const name of Object.keys(labels))setOpen(name,initiallyOpen.has(name),false);
  for(const [name,panel]of panelMap){const size=preferences.sizes[name];if(size){resizePanel(panel,size.width,size.height);clampPanel(panel);}}
  nav.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{const name=button.dataset.panel;setOpen(name,panelMap.get(name).dataset.open!=='true');});
  $('#reset-layout').onclick=()=>{preferences.positions={};preferences.sizes={};for(const panel of panelMap.values()){panel.style.removeProperty('width');panel.style.removeProperty('height');panel.classList.remove('user-sized');}for(const [name,panel]of panelMap)if(!panel.hidden){const pos=defaultPosition(name,panel);setPosition(panel,pos.x,pos.y);}save();};
  window.addEventListener('resize',()=>{if(document.body.classList.contains('compact-mode'))return;for(const panel of panelMap.values()){clampPanel(panel);if(panel.classList.contains('user-sized'))resizePanel(panel,panel.offsetWidth,panel.offsetHeight);positionGrip(panel);}});

  // Fundos: vídeo do YouTube (catálogo), trilha na floresta ou fundo neutro. Os dois últimos funcionam sem internet.
  const image=$('#scene-image'),youtube=$('#scene-youtube');
  delete preferences.stillScene;
  if(!['forest','neutral','youtube'].includes(preferences.scene)||(preferences.scene==='youtube'&&!embedUrl(preferences.videoUrl)))preferences.scene='forest';
  // O player do YouTube aceita comandos por postMessage quando carregado com enablejsapi=1.
  function youtubeCommand(func,args=[]){youtube.querySelector('iframe')?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args}),'https://www.youtube-nocookie.com');}
  function youtubeVolume(){if(preferences.backgroundVolume>0){youtubeCommand('unMute');youtubeCommand('setVolume',[preferences.backgroundVolume]);}else youtubeCommand('mute');}
  function controls(){
    $('#forest-scene').setAttribute('aria-pressed',preferences.scene==='forest');
    $('#neutral-scene').setAttribute('aria-pressed',preferences.scene==='neutral');
    const now=$('#scene-now'),playing=preferences.scene==='youtube'&&preferences.videoTitle;
    now.hidden=!playing;if(playing)now.innerHTML=`<span>Tocando agora</span><b></b><small></small>`,now.querySelector('b').textContent=preferences.videoTitle,now.querySelector('small').textContent=preferences.videoChannel||'';
    sceneBar?.update();
  }
  function applyScene(){
    youtube.hidden=true;youtube.replaceChildren();image.hidden=false;image.classList.toggle('neutral',preferences.scene==='neutral');$('#scene-status').textContent='';
    if(preferences.scene==='youtube'){
      const url=embedUrl(preferences.videoUrl),id=url.split('/').at(-1),iframe=document.createElement('iframe');
      youtubePaused=false;iframe.title='Vídeo de fundo';iframe.allow='autoplay; encrypted-media';iframe.tabIndex=-1;
      iframe.src=`${url}?autoplay=1&mute=${preferences.backgroundVolume?0:1}&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&enablejsapi=1`;
      iframe.addEventListener('load',()=>{youtubeVolume();sceneBar?.listen(iframe);});
      youtube.append(iframe);youtube.hidden=false;image.hidden=true;
    }
    controls();
  }
  function useScene(scene){preferences.scene=scene;save();applyScene();}
  $('#forest-scene').onclick=()=>useScene('forest');
  $('#neutral-scene').onclick=()=>useScene('neutral');
  function togglePlay(){youtubePaused=!youtubePaused;youtubeCommand(youtubePaused?'pauseVideo':'playVideo');controls();}
  function setBackgroundVolume(value){preferences.backgroundVolume=Math.max(0,Math.min(100,value));youtubeVolume();sceneBar?.update();save();}
  sceneBar=initSceneBar({preferences,save,isVideoScene:()=>preferences.scene==='youtube',isPaused:()=>youtubePaused,togglePlay,setVolume:setBackgroundVolume,
    onYoutubeState:playerState=>{if(playerState===1||playerState===2){youtubePaused=playerState===2;controls();}}});
  // Modo na barra: vídeo de fundo sem som é só imagem, então pausa para poupar bateria.
  document.addEventListener('sussa:tray',e=>{
    if(e.detail==='entered'){pausedForTray=preferences.scene==='youtube'&&!youtubePaused&&!preferences.backgroundVolume;if(pausedForTray)youtubeCommand('pauseVideo');}
    else{if(pausedForTray&&preferences.scene==='youtube')youtubeCommand('playVideo');pausedForTray=false;}
  });
  initYouTubeCatalog({preferences,save,toast,play:(video,{music})=>{
    Object.assign(preferences,{scene:'youtube',videoUrl:`https://www.youtube.com/watch?v=${video.id}`,videoTitle:video.title,videoChannel:video.channel});
    // Vídeos de música (study with me, lo-fi) começam com som; paisagens seguem o volume escolhido.
    if(music&&!preferences.backgroundVolume)preferences.backgroundVolume=50;
    save();applyScene();
  }});
  document.querySelectorAll('dialog [data-close]').forEach(button=>{button.classList.add('close-button');button.innerHTML=icon('close');});
  initDialogs();
  initContextHelp();
  initRoomMenu();
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||document.querySelector('dialog[open]'))return;
    if(config.open){config.open=false;config.querySelector('summary').focus();return;}
    const top=[...panelMap].filter(([,p])=>p.dataset.open==='true').sort((a,b)=>Number(b[1].style.zIndex)-Number(a[1].style.zIndex))[0];
    if(top){e.preventDefault();setOpen(top[0],false);}
  });
  initCompact({toast,state});
  applyScene();wake();
}
