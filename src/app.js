import { initialState, advance, dayKey, bounds, total, buckets, focusStreak, embedUrl } from './core.js';
import { Mixer } from './audio.js';
import * as calendar from './calendar.js';
import { initNotes } from './notes.js';
import { initWorkspace } from './workspace.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const key = 'meu-espaco-v1';
let state = initialState(), period = 'last7', filter = '', muted = false, owned = false, calendarItems = [], calendarConnected = false;
try { const saved = JSON.parse(localStorage.getItem(key)); if (saved?.version === 1 && Array.isArray(saved.sessions) && Array.isArray(saved.tasks) && saved.durations && Number.isFinite(saved.remaining)) state = { ...state, ...saved }; } catch { /* keep a usable fresh state */ }
state.alarm = { sound: 'bell', volume: 70, ...state.alarm };
const mixer = new Mixer();
function save() { if (!owned) return false; try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch { toast('Não foi possível salvar. Exporte seus dados antes de fechar.'); return false; } }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; document.dispatchEvent(new Event('workspace:notice')); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 6000); }
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomName = room => room === 'work' ? 'Trabalho' : 'Estudos';
const duration = ms => {
  const minutes = Math.floor(ms / 60000), hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ') || '0';
};
const section = name => $(`#viewport-1-winner-${name}`);
const shell = $('#viewport-1-winner');
const panels = ['nav','hero','tasks','sound','player','stats'].map(section);
shell.replaceChildren(...panels);
// Retain the generated shell, panels, background and artwork; replace demo data with live controls.
section('hero').innerHTML = `<div class="intro"><p class="eyebrow">MEU ESPAÇO · UM MOMENTO PARA VOCÊ</p><h1>Um passo de cada vez.<br><em>Hoje importa.</em></h1><p>Escolha sua sala. Respire. Comece.</p><span id="today-label"></span></div><div class="timer"><div class="tabs mode-tabs" aria-label="Modo do temporizador"><button data-mode="focus">Pomodoro</button><button data-mode="short">Pausa curta</button><button data-mode="long">Pausa longa</button></div><div class="timer-orbit"><small id="timer-room">ESTUDOS</small><output id="clock" aria-label="Tempo restante">50:00</output><button id="toggle-timer" class="primary">▶ Iniciar</button></div><div class="timer-tools"><button id="reset" aria-label="Reiniciar temporizador">↺ Reiniciar</button><button data-dialog="settings">⚙ Ajustar</button></div><div id="timer-progress"><i></i></div></div><div class="rooms"><p class="eyebrow">SUA SALA DE FOCO</p><button data-room="study"><span>⌑</span><div>Estudos<small>Aprender, praticar, evoluir</small></div><i></i></button><button data-room="work"><span>▣</span><div>Trabalho<small>Uma entrega de cada vez</small></div><i></i></button><small>Seu tempo fica separado por sala.</small></div>`;
section('nav').innerHTML = `<a class="brand" href="#" aria-label="Meu Espaço">✳</a><button data-scroll="hero" class="nav-active"><b>◉</b>Foco</button><button data-scroll="tasks"><b>☑</b>Tarefas</button><button data-scroll="sound"><b>≋</b>Sons</button><button data-scroll="player"><b>♫</b>Mídia</button><button data-scroll="stats"><b>▥</b>Estatísticas</button><button data-dialog="settings"><b>⚙</b>Ajustes</button><div class="nav-bottom"><span class="dot"></span> Local<br><small>Seu ritmo.<br>Seu espaço.</small></div>`;
section('tasks').innerHTML = `<header><div><h2>✓ Tarefas do dia</h2><small id="task-count"></small></div><input type="date" id="task-date" aria-label="Data das tarefas"></header><div class="task-source"><span id="calendar-status">Agenda ainda não conectada</span><button data-dialog="integrations">Conectar agenda ↗</button></div><form id="task-form"><input id="task-title" required maxlength="200" placeholder="O que merece sua atenção?" aria-label="Nova tarefa"><button class="primary" aria-label="Adicionar tarefa">+</button></form><div id="task-list"></div><div id="calendar-list"></div><footer><span class="dot"></span><span>Tarefas e sessões salvas neste navegador.</span></footer>`;
section('sound').innerHTML = `<header><h2>Sons</h2><button id="mute" aria-label="Silenciar sons">Silenciar</button></header><div id="mixer"></div><p class="hint">Sons sintetizados. Delta e Theta são tons estéreo; use fones.</p><details><summary>Adicionar áudio ambiente</summary><label class="file-label">Café, teclado ou outro som<input id="sound-file" type="file" accept="audio/*"></label><audio id="custom-audio" controls loop></audio><small>O arquivo fica nesta sessão e não é enviado.</small></details>`;
section('player').innerHTML = `<div id="media-container"><div class="media-empty"><span>♫</span><p>Uma trilha para entrar no ritmo.</p><small>YouTube · Spotify · Apple Music</small></div></div><form id="media-form"><input id="media-url" type="url" required placeholder="Cole o link da música, vídeo ou playlist" aria-label="Link da mídia"><button>Salvar</button><button id="remove-media" type="button" aria-label="Remover mídia" title="Remover mídia">×</button></form><p class="hint">O volume e a reprodução são controlados no próprio player.</p>`;
section('stats').innerHTML = `<p class="stats-help">Tempo de foco real; pausas não entram na conta. A sequência atual soma dias consecutivos com foco em Estudos ou Trabalho, incluindo hoje ou terminando ontem. O tempo da sequência soma somente esses dias e não muda com os filtros do gráfico.</p><div class="streak-summary"><div><small>Dias seguidos</small><strong><span aria-hidden="true">🔥</span> <span id="streak-days">0</span></strong></div><div><small>Foco na sequência</small><strong id="streak-time">0</strong></div></div><div class="stats-controls"><select id="stats-period" aria-label="Período das estatísticas"><option value="day">Hoje</option><option value="last7" selected>Últimos 7 dias</option><option value="last14">Últimos 14 dias</option><option value="month">Este mês</option><option value="year">Este ano</option></select><select id="stats-room" aria-label="Filtrar estatísticas por sala"><option value="" disabled hidden selected>Sala</option><option value="all">Todas as salas</option><option value="study">Estudos</option><option value="work">Trabalho</option></select></div><div class="stats-summary"><div><small>Total no período</small><strong id="total-focus"></strong></div><div class="study"><small>● Estudos</small><strong id="study-focus"></strong></div><div class="work"><small>● Trabalho</small><strong id="work-focus"></strong></div></div><div class="chart-card"><div class="chart-heading"><span>Tempo de foco</span><span id="chart-unit">Horas e minutos</span></div><div class="chart-layout"><div id="chart-scale" aria-hidden="true"></div><div id="chart" role="img" aria-label="Tempo de foco por intervalo"></div></div><p id="empty-stats" class="hint">Nenhum foco registrado neste período.</p></div><div class="stats-footer"><span>Horário local · semana começa na segunda</span><button id="export">↓ Exportar histórico</button></div>`;
document.body.insertAdjacentHTML('beforeend', `<div id="toast" role="status" hidden></div><dialog id="settings"><header><h2>Seu ritmo de foco</h2><button data-close aria-label="Fechar">×</button></header><form id="settings-form"><p>Defina a duração de cada sessão, em minutos.</p><label>Pomodoro<input name="focus" type="number" min="1" max="240" required></label><label>Pausa curta<input name="short" type="number" min="1" max="120" required></label><label>Pausa longa<input name="long" type="number" min="1" max="120" required></label><p class="hint">Salvar pausa e reinicia o temporizador. O foco já registrado é preservado. Cada etapa é iniciada manualmente.</p><button class="primary">Salvar tempos</button></form><hr><label>Ambiente visual<select id="background"><option value="forest">Cinza escuro</option><option value="night">Noite tranquila</option><option value="warm">Fim de tarde</option></select></label><label class="file-label">Usar uma imagem de fundo<input id="background-file" type="file" accept="image/*"></label><p class="hint">A imagem personalizada vale para esta sessão.</p><button id="notify">Ativar aviso do navegador</button></dialog><dialog id="integrations"><header><h2>Sua agenda no foco</h2><button data-close aria-label="Fechar">×</button></header><p>Conecte a conta Google usada no Notion Calendar para ver os mesmos eventos aqui.</p><div class="connection-note">Somente leitura. Marcar uma atividade aqui não altera o evento no Google ou no Notion Calendar.</div><details open><summary>Configuração da conexão local</summary><p>Crie um cliente OAuth do tipo aplicativo web no Google Cloud, ative a Calendar API e cadastre a origem <code>http://127.0.0.1:5173</code>. Os passos estão no README do projeto.</p><label>Client ID público do Google<input id="google-client" placeholder="…apps.googleusercontent.com" autocomplete="off"></label><label>ID da agenda<input id="google-calendar" placeholder="primary"></label><small>Use “primary” para a agenda principal. Não cole senha ou Client Secret.</small><button id="prepare-google">Preparar conexão</button></details><button id="connect-google" class="primary" disabled>Entrar com Google</button><button id="refresh-calendar">Atualizar eventos</button><button id="disconnect-google">Desconectar</button><p id="integration-message" role="status">Aguardando configuração e autorização da conta.</p><a href="https://calendar.notion.so" target="_blank" rel="noopener">Abrir Notion Calendar ↗</a></dialog>`);
$('#task-date').value = dayKey();
$('#today-label').textContent = new Date().toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long'});
$('#background').value = state.background;
document.body.dataset.background = state.background;
$('#google-client').value = state.googleClient || '';
$('#google-calendar').value = state.googleCalendar || 'primary';
for (const [id,label] of [['master','Volume geral'],['rain','☂ Chuva'],['ocean','≈ Oceano'],['fire','♨ Lareira'],['delta','∿ Ondas Delta'],['theta','∿ Ondas Theta']]) {
  $('#mixer').insertAdjacentHTML('beforeend', `<label class="sound-row ${id==='master'?'master':''}"><span>${label}</span><input type="range" min="0" max="100" value="${state.volumes[id]}" data-volume="${id}" aria-label="${label}"><output>${state.volumes[id]}%</output></label>`);
}
function updateTimer() {
  const seconds = Math.ceil(state.remaining / 1000), time = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const streak = focusStreak(state.sessions);
  $('#focus-count').textContent = streak.days;
  const [today,tomorrow] = bounds('day');
  const summary = `${streak.days} dias seguidos de foco · Hoje: ${duration(total(state.sessions,today,tomorrow))} · ${state.mode==='focus'?'Foco':'Pausa'}: ${time} restantes`;
  $('#stats-shortcut').title=summary;$('#stats-shortcut').setAttribute('aria-label',`Abrir estatísticas. ${summary}`);
  $('#clock').textContent = time; document.title = `${state.running ? time+' · ' : ''}Meu Espaço`;
  $('#toggle-timer').textContent = state.running ? 'Ⅱ Pausar' : state.remaining === 0 ? '↻ Nova sessão' : '▶ Iniciar';
  $('#timer-room').textContent = `${roomName(state.room)} · ${state.mode === 'focus' ? 'FOCO' : 'PAUSA'}`;
  $$('[data-room]').forEach(b => { b.classList.toggle('active', b.dataset.room===state.room); b.setAttribute('aria-pressed',b.dataset.room===state.room); });
  $$('[data-mode]').forEach(b => { b.classList.toggle('active',b.dataset.mode===state.mode); b.setAttribute('aria-pressed',b.dataset.mode===state.mode); });
  $('#timer-progress i').style.width = `${100 - state.remaining / (state.durations[state.mode]*60000)*100}%`;
}
function tick() {
  if (!owned) return;
  if (advance(state)) {
    mixer.alarm(state.alarm).catch(()=>{}); toast(state.mode==='focus'?'Sessão concluída. Hora de uma pausa!':'Pausa concluída. Pronto para continuar?');
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Meu Espaço', {body:state.mode==='focus'?'Seu Pomodoro terminou. Faça uma pausa.':'Sua pausa terminou.'});
  }
  updateTimer(); save(); if (!document.hidden) renderStats();
}
function renderTasks() {
  const date = $('#task-date').value;
  const tasks = state.tasks.filter(t=>t.date===date && t.room===state.room);
  $('#task-count').textContent = `${roomName(state.room)} · ${tasks.filter(t=>t.done).length} de ${tasks.length} concluídas`;
  $('#task-list').innerHTML = tasks.length ? tasks.map(t=>`<div class="task ${t.done?'done':''}"><label><input type="checkbox" data-task="${escape(t.id)}" ${t.done?'checked':''}><span>${escape(t.title)}</span></label><button data-delete="${escape(t.id)}" aria-label="Excluir ${escape(t.title)}">×</button></div>`).join('') : `<div class="empty"><span>☷</span><p>Um dia com espaço para o que importa.</p><small>Adicione sua primeira tarefa de ${roomName(state.room).toLowerCase()}.</small></div>`;
}
function renderCalendar() {
  $('#calendar-status').textContent = calendarConnected ? 'Google Agenda · somente leitura' : 'Agenda ainda não conectada';
  $('#calendar-list').innerHTML = calendarConnected ? `<h3>Na sua agenda</h3>${calendarItems.length ? calendarItems.map(item=>`<div class="calendar-event"><span class="event-time">${escape(item.time)}</span><span>${escape(item.title)}</span><button data-event="${escape(item.id)}" title="Adicionar à sala atual">+ ${roomName(state.room)}</button></div>`).join('') : '<p class="hint">Nenhum evento nesta data.</p>'}` : '';
}
function renderStats() {
  const reportDate = new Date();
  const [start,end] = bounds(period,reportDate);
  const streak = focusStreak(state.sessions);
  $('#streak-days').textContent = streak.days;
  $('#streak-time').textContent = duration(streak.time);
  $('#total-focus').textContent = duration(total(state.sessions,start,end,filter));
  $('#study-focus').textContent = duration(total(state.sessions,start,end,'study'));
  $('#work-focus').textContent = duration(total(state.sessions,start,end,'work'));
  $('#total-focus').parentElement.hidden=false;
  $('#study-focus').parentElement.hidden=Boolean(filter)&&filter!=='study';
  $('#work-focus').parentElement.hidden=Boolean(filter)&&filter!=='work';
  section('stats').querySelector('.stats-summary').classList.toggle('single-room',Boolean(filter));
  const data = buckets(state.sessions,period,reportDate,filter);
  const peak = Math.max(60000,...data.map(d=>d.value));
  const stepMinutes = Math.max(5,Math.ceil(peak / 60000 / 4 / 5)*5);
  const max = stepMinutes*4*60000;
  const axisLabel = minutes => duration(minutes * 60000);
  $('#chart-scale').innerHTML = [4,3,2,1,0].map(n=>`<span>${axisLabel(n*stepMinutes)}</span>`).join('');
  $('#chart').classList.toggle('dense-chart',data.length>12);
  $('#chart').innerHTML = data.map((d,i)=>`<div class="bar-column" title="${escape(d.label)}: ${duration(d.value)}"><div class="bar-track"><i style="height:${d.value/max*100}%"></i></div><span>${data.length>12 && i!==data.length-1 && (i%Math.ceil(data.length/8)!==0 || i>data.length-4) ? '' : escape(d.label)}</span></div>`).join('');
  $('#chart').setAttribute('aria-label',data.map(d=>`${d.label}: ${duration(d.value)}`).join('; '));
  $('#empty-stats').hidden = data.some(d=>d.value>0);
}
function renderMedia() {
  $('#media-url').value = state.media;
  const url = embedUrl(state.media);
  section('player').classList.toggle('has-media',Boolean(url));
  $('#remove-media').disabled=!url;
  $('#media-container').innerHTML = url ? `<iframe title="Player de mídia" src="${escape(url)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : `<div class="media-empty"><span>♫</span><p>Uma trilha para entrar no ritmo.</p><small>YouTube · Spotify · Apple Music</small></div>`;
}
$('#toggle-timer').onclick = async () => {
  if (!owned) return toast('Já existe outra aba controlando o Pomodoro. Feche-a e recarregue esta.');
  tick(); if (state.running) { state.running = false; state.cursor = null; } else { if (!state.remaining) state.remaining = state.durations[state.mode]*60000; state.running = true; state.cursor = Date.now(); }
  updateTimer(); save(); await syncMixer().catch(()=>toast('O áudio não está disponível neste navegador.'));
};
$('#reset').onclick = () => { tick(); state.running = false; state.cursor = null; state.remaining = state.durations[state.mode]*60000; updateTimer(); save(); };
$$('[data-mode]').forEach(b=>b.onclick=()=>{ if(state.mode===b.dataset.mode)return; tick(); state.mode=b.dataset.mode; state.running=false; state.cursor=null; state.remaining=state.durations[state.mode]*60000; updateTimer();save(); });
$$('[data-room]').forEach(b=>b.onclick=()=>{ tick(); state.room=b.dataset.room; updateTimer(); renderTasks();renderCalendar();save(); });
$$('[data-scroll]').forEach(b=>b.onclick=()=>{ section(b.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'}); $$('[data-scroll]').forEach(x=>x.classList.toggle('nav-active',x===b)); });
$$('[data-dialog]').forEach(b=>b.onclick=()=>{
  if(b.dataset.dialog==='settings') for(const [mode,value] of Object.entries(state.durations)) $(`#settings input[name="${mode}"]`).value=value;
  $(`#${b.dataset.dialog}`).showModal();
});
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#settings-form').onsubmit=e=>{
  e.preventDefault();
  const changed=Object.keys(state.durations).some(mode=>state.durations[mode]!==Number(e.target.elements[mode].value));
  if(changed){tick();for(const mode of Object.keys(state.durations))state.durations[mode]=Number(e.target.elements[mode].value);state.running=false;state.cursor=null;state.remaining=state.durations[state.mode]*60000;}
  state.alarm={sound:$('#alarm-sound').value,volume:Number($('#alarm-volume').value)};
  save();updateTimer();$('#settings').close();
};
$('#task-form').onsubmit=e=>{e.preventDefault(); const title=$('#task-title').value.trim();if(!title)return;state.tasks.push({id:crypto.randomUUID(),title,date:$('#task-date').value,room:state.room,done:false});$('#task-title').value='';save();renderTasks();};
$('#task-list').onchange=e=>{const task=state.tasks.find(t=>t.id===e.target.dataset.task);if(task){task.done=e.target.checked;save();renderTasks();}};
$('#task-list').onclick=e=>{const id=e.target.closest('[data-delete]')?.dataset.delete;if(id){state.tasks=state.tasks.filter(t=>t.id!==id);save();renderTasks();}};
$('#task-date').onchange=()=>{if(!$('#task-date').value)$('#task-date').value=dayKey();renderTasks();if(calendarConnected)refreshCalendar();};
$('#calendar-list').onclick=e=>{const id=e.target.closest('[data-event]')?.dataset.event,item=calendarItems.find(t=>t.id===id);if(!item)return;if(state.tasks.some(t=>t.eventId===id&&t.date===$('#task-date').value))return toast('Esta atividade já está nas tarefas.');state.tasks.push({id:crypto.randomUUID(),eventId:id,title:item.title,date:$('#task-date').value,room:state.room,done:false});save();renderTasks();};
async function syncMixer() {
  for (const [name,value] of Object.entries(state.volumes)) await mixer.set(name,value);
}
$$('[data-volume]').forEach(input=>input.oninput=async()=>{state.volumes[input.dataset.volume]=Number(input.value);input.nextElementSibling.value=input.value+'%';$('#custom-audio').volume=state.volumes.master/100;save();try{await syncMixer();}catch{toast('O áudio não está disponível neste navegador.');}});
$('#mute').onclick=async()=>{muted=!muted;await mixer.mute(muted);$('#custom-audio').muted=muted;$('#mute').textContent=muted?'Ativar sons':'Silenciar';};
let soundUrl,backgroundUrl;
$('#sound-file').onchange=e=>{const file=e.target.files[0];if(!file)return;if(soundUrl)URL.revokeObjectURL(soundUrl);soundUrl=URL.createObjectURL(file);$('#custom-audio').src=soundUrl;$('#custom-audio').volume=state.volumes.master/100;};
$('#media-form').onsubmit=e=>{e.preventDefault();const value=$('#media-url').value.trim();if(!embedUrl(value))return toast('Use um link válido de YouTube, Spotify ou Apple Music.');state.media=value;save();renderMedia();};
$('#remove-media').onclick=()=>{state.media='';save();renderMedia();};
$('#stats-period').onchange=e=>{period=e.target.value;renderStats();};
$('#stats-room').onchange=e=>{filter=e.target.value==='all'?'':e.target.value;renderStats();};
$('#background').onchange=e=>{state.background=e.target.value;document.body.dataset.background=state.background;$('.generated-screen').style.backgroundImage='';save();};
$('#background-file').onchange=e=>{const file=e.target.files[0];if(!file)return;if(backgroundUrl)URL.revokeObjectURL(backgroundUrl);backgroundUrl=URL.createObjectURL(file);state.background='forest';document.body.dataset.background='forest';$('#background').value='forest';save();$('.generated-screen').style.backgroundImage=`linear-gradient(#15182066,#15182066),url("${backgroundUrl}")`;};
$('#notify').onclick=async()=>{if(!('Notification'in window))return toast('Este navegador não oferece notificações.');const result=await Notification.requestPermission();toast(result==='granted'?'Avisos ativados.':'Avisos não autorizados. O alarme continua disponível.');};
$('#export').onclick=()=>{tick();const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),sessions:state.sessions,tasks:state.tasks,notes:state.notes},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`meu-espaco-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#prepare-google').onclick=async()=>{const client=$('#google-client').value.trim();if(!client.endsWith('.apps.googleusercontent.com'))return $('#integration-message').textContent='Cole o Client ID público do Google Cloud.';state.googleClient=client;state.googleCalendar=$('#google-calendar').value.trim()||'primary';save();$('#integration-message').textContent='Carregando conexão segura do Google…';try{await calendar.loadGoogle();$('#connect-google').disabled=false;$('#integration-message').textContent='Pronto. Clique em Entrar com Google para autorizar.';}catch(e){$('#integration-message').textContent=e.message;}};
$('#connect-google').onclick=async()=>{try{await calendar.authorize(state.googleClient);calendarConnected=true;await refreshCalendar();}catch(e){$('#integration-message').textContent=e.message;}};
let calendarRequest=0;
async function refreshCalendar(){const request=++calendarRequest;calendarItems=[];renderCalendar();$('#integration-message').textContent='Atualizando eventos…';try{const items=await calendar.events($('#task-date').value,state.googleCalendar);if(request!==calendarRequest)return;calendarItems=items;$('#integration-message').textContent=`${items.length} evento(s) carregado(s).`;renderCalendar();}catch(e){if(request!==calendarRequest)return;$('#integration-message').textContent=e.message;toast(e.message);}}
$('#refresh-calendar').onclick=refreshCalendar;
$('#disconnect-google').onclick=()=>{calendar.disconnect();calendarRequest++;calendarConnected=false;calendarItems=[];renderCalendar();$('#integration-message').textContent='Conta desconectada.';};
const alarmSettings = document.createElement('fieldset');
alarmSettings.className = 'alarm-settings';
alarmSettings.innerHTML = `<legend>Alarme ao terminar</legend><label>Som<select id="alarm-sound"><option value="bell">Sinal clássico</option><option value="chime">Sinos</option><option value="soft">Suave</option><option value="digital">Digital</option><option value="none">Sem som</option></select></label><label>Volume<div class="alarm-volume"><input id="alarm-volume" type="range" min="0" max="100" aria-label="Volume do alarme"><output id="alarm-volume-value"></output></div></label><button id="preview-alarm" type="button">Ouvir som</button>`;
const timerSettingsForm=$('#settings-form');
timerSettingsForm.querySelectorAll('p').forEach(note=>note.remove());
const durationSettings=document.createElement('fieldset');durationSettings.className='duration-settings';
durationSettings.innerHTML='<legend>Duração <span>(min)</span></legend>';
durationSettings.append(...timerSettingsForm.querySelectorAll(':scope>label'));
const saveSettings=timerSettingsForm.querySelector(':scope>button');saveSettings.textContent='Salvar';
saveSettings.title='Salvar configurações. Alterar a duração reinicia o temporizador.';
timerSettingsForm.replaceChildren(durationSettings,alarmSettings,saveSettings);
$('#alarm-sound').value=state.alarm.sound;
$('#alarm-volume').value=state.alarm.volume;
function updateAlarmControls(){
  const silent=$('#alarm-sound').value==='none';
  $('#alarm-volume').disabled=silent;
  $('#preview-alarm').disabled=silent||Number($('#alarm-volume').value)===0;
  $('#alarm-volume-value').textContent=`${$('#alarm-volume').value}%`;
}
$('#alarm-sound').onchange=updateAlarmControls;
$('#alarm-volume').oninput=updateAlarmControls;
$('#preview-alarm').onclick=async()=>{
  if(muted)return toast('Ative os sons no mixer para ouvir o alarme.');
  try{await mixer.set('master',state.volumes.master);await mixer.alarm({sound:$('#alarm-sound').value,volume:Number($('#alarm-volume').value)});}catch{toast('Não foi possível reproduzir o som.');}
};
timerSettingsForm.addEventListener('settings:open',()=>{$('#alarm-sound').value=state.alarm.sound;$('#alarm-volume').value=state.alarm.volume;updateAlarmControls();});
updateAlarmControls();
initNotes({state,save,canEdit:()=>owned});
initWorkspace({state, save, toast});
// Keep pointer clicks quiet visually while preserving keyboard focus indicators.
document.addEventListener('pointerdown',()=>{document.body.dataset.inputMode='pointer';},true);
document.addEventListener('keydown',()=>{document.body.dataset.inputMode='keyboard';},true);
function start(){owned=true;tick();renderTasks();renderCalendar();renderMedia();renderStats();setInterval(tick,1000);}
if(navigator.locks)navigator.locks.request('meu-espaco-writer',{ifAvailable:true},async lock=>{if(!lock){toast('Outra aba está aberta. Use apenas uma aba para registrar seu foco.');document.body.classList.add('read-only');updateTimer();renderTasks();renderMedia();renderStats();$$('button,input,select,textarea').forEach(el=>el.disabled=true);return;}start();await new Promise(()=>{});});else start();
document.addEventListener('visibilitychange',()=>{if(owned)tick();});
window.addEventListener('pagehide',()=>{if(owned){advance(state);save();}});
