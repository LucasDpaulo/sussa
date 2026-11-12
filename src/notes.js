export function initNotes({ state, save, canEdit }) {
  if (!Array.isArray(state.notes)) state.notes = [];
  const panel = document.createElement('div'); panel.id = 'viewport-1-winner-notes';
  panel.innerHTML = `<div class="notes-content"><div class="notes-toolbar"><input id="notes-search" type="search" placeholder="Buscar notas" aria-label="Buscar notas"><button id="new-note" type="button">+ Nova</button></div><div id="notes-list" aria-label="Notas salvas"></div><div id="notes-empty" class="hint">Anote uma ideia para retomar depois.</div><div id="note-editor" hidden><input id="note-title" maxlength="120" placeholder="Sem título" aria-label="Título da nota"><textarea id="note-body" placeholder="Escreva aqui…" aria-label="Conteúdo da nota" spellcheck="true"></textarea><div class="note-actions"><button id="pin-note" type="button" aria-pressed="false">Fixar</button><button id="download-note" type="button">Baixar .txt</button><button id="delete-note" type="button">Excluir</button></div><small id="note-status" role="status"></small></div><div id="note-undo" hidden><span>Nota excluída.</span><button type="button" id="undo-note">Desfazer</button></div><p class="notes-help">Notas salvas automaticamente neste navegador, compartilhadas entre suas salas. Fixe as importantes no topo e use a busca pelo título ou conteúdo. Baixe uma cópia em texto para guardar fora do navegador.</p></div>`;
  document.querySelector('#viewport-1-winner').append(panel);
  const $ = selector => panel.querySelector(selector);
  let active = state.notes[0]?.id || null, removed = null;
  const current = () => state.notes.find(note => note.id === active);
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function persist() { const ok=save(); $('#note-status').textContent=ok?'Salvo neste navegador':'Não foi possível salvar'; }
  function renderList() {
    const query = normalize($('#notes-search').value);
    const notes = state.notes.filter(note=>normalize(`${note.title} ${note.body}`).includes(query))
      .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt);
    $('#notes-list').replaceChildren();
    for (const note of notes) {
      const button = document.createElement('button'); button.type='button'; button.className='note-item';
      button.setAttribute('aria-pressed',String(note.id===active)); button.dataset.note=note.id;
      const title=document.createElement('strong'); title.textContent=`${note.pinned?'★ ':''}${note.title.trim()||'Sem título'}`;
      const preview=document.createElement('span'); preview.textContent=note.body.trim().replace(/\s+/g,' ').slice(0,90)||'Nota vazia';
      button.append(title,preview); button.onclick=()=>{active=note.id;renderEditor();renderList();};
      $('#notes-list').append(button);
    }
    $('#notes-empty').hidden=notes.length>0;
    $('#notes-empty').textContent=query?'Nenhuma nota encontrada.':'Anote uma ideia para retomar depois.';
  }
  function renderEditor() {
    const note=current(); $('#note-editor').hidden=!note;
    if(!note)return;
    $('#note-title').value=note.title;$('#note-body').value=note.body;
    $('#pin-note').textContent=note.pinned?'Desafixar':'Fixar';$('#pin-note').setAttribute('aria-pressed',String(note.pinned));
    $('#note-status').textContent='';
  }
  $('#new-note').onclick=()=>{
    if(!canEdit())return;
    const note={id:crypto.randomUUID(),title:'',body:'',pinned:false,updatedAt:Date.now()};
    state.notes.unshift(note);active=note.id;$('#notes-search').value='';renderEditor();persist();renderList();$('#note-title').focus();
  };
  function edit(){if(!canEdit()||!current())return;Object.assign(current(),{title:$('#note-title').value,body:$('#note-body').value,updatedAt:Date.now()});persist();renderList();}
  $('#note-title').oninput=edit;$('#note-body').oninput=edit;
  $('#notes-search').oninput=renderList;
  $('#pin-note').onclick=()=>{if(!canEdit()||!current())return;current().pinned=!current().pinned;renderEditor();persist();renderList();};
  $('#delete-note').onclick=()=>{
    if(!canEdit()||!current())return;
    removed=current();state.notes=state.notes.filter(note=>note.id!==active);active=state.notes[0]?.id||null;
    renderEditor();persist();renderList();$('#note-undo').hidden=false;$('#undo-note').focus();
  };
  $('#undo-note').onclick=()=>{
    if(!canEdit()||!removed)return;
    state.notes.push(removed);active=removed.id;removed=null;$('#note-undo').hidden=true;renderEditor();persist();renderList();$('#note-title').focus();
  };
  $('#download-note').onclick=()=>{
    const note=current();if(!note)return;
    const url=URL.createObjectURL(new Blob([`${note.title}\n\n${note.body}`],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`${(note.title.trim()||'nota').replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,60)||'nota'}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  renderEditor();renderList();
}
