const _baseOpenClient = openClient;

clientsHTML = function(){
  return `<div class="clients-wrap"><div class="clients-controls"><div class="search">${ICONS.search}<input id="q" placeholder="Buscar por nome ou WhatsApp" oninput="filterClients(this.value)"></div><button class="client-add" onclick="openClientEditor()">${ICONS.plus}<span>Nova cliente</span></button></div><div id="clientList">${clientRows(C)}</div></div>`;
};

openClient = function(id){
  _baseOpenClient(id);
  const top = overlay.querySelector('.sheettop');
  const close = top?.querySelector('.icon');
  if(!top || !close) return;
  const tools = document.createElement('div');
  tools.className = 'client-sheet-tools';
  const edit = document.createElement('button');
  edit.className = 'edit-client-btn';
  edit.textContent = 'Editar cliente';
  edit.onclick = () => openClientEditor(id);
  tools.appendChild(edit);
  tools.appendChild(close);
  top.appendChild(tools);
};

function openClientEditor(id=''){
  const c = id ? C.find(x=>String(x.id)===String(id)) : null;
  overlay.innerHTML = `<div class="back" onclick="if(event.target===this)closeSheet()"><section class="sheet"><div class="grab"></div><div class="sheettop"><div><span class="eyebrow">${c?'EDITAR':'NOVA'} CLIENTE</span><h2>${c?'Dados da cliente':'Adicionar cliente'}</h2></div><button class="icon" onclick="closeSheet()">${ICONS.close}</button></div><div class="form client-editor-form"><label>Nome<input id="clientName" autocomplete="name" placeholder="Nome da cliente" value="${c?.name||''}"></label><label>WhatsApp<input id="clientPhone" inputmode="tel" autocomplete="tel" placeholder="(77) 99999-9999" value="${c?.phone||''}"></label><div class="client-editor-note">WhatsApp é opcional. Com ele, a cliente entra no histórico, retornos e atalhos de mensagem.</div><button class="primary" onclick="saveClientEditor('${id}')">${c?'Salvar alterações':'Adicionar cliente'}</button>${c?`<button class="danger" onclick="deleteClient('${id}')">Excluir cliente</button>`:''}</div></section></div>`;
  setTimeout(()=>document.getElementById('clientName')?.focus(),60);
}

function saveClientEditor(id=''){
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.replace(/\D/g,'');
  if(!name) return toastMsg('Informe o nome da cliente.');
  if(phone&&phone.length<10) return toastMsg('WhatsApp incompleto. Confira o número.');
  const duplicate = phone ? C.find(c=>c.phone&&c.phone===phone && String(c.id)!==String(id)) : null;
  if(duplicate) return toastMsg(`Esse WhatsApp já pertence a ${duplicate.name}.`);

  if(id){
    const c = C.find(x=>String(x.id)===String(id));
    if(!c) return toastMsg('Cliente não encontrada.');
    const oldPhone = c.phone;
    c.name = name;
    c.phone = phone;
    A = A.map(a=>a.phone===oldPhone ? {...a,client:name,phone} : a);
    save();
    render();
    toastMsg('Cliente atualizada.');
    openClient(c.id);
  }else{
    const newClient = {id:Date.now(),name,phone,lastProcedure:null,lastVisit:null,nextDue:null,visits:0,spent:0};
    C.push(newClient);
    save();
    render();
    toastMsg('Cliente adicionada.');
    openClient(newClient.id);
  }
}

function deleteClient(id=''){
  const c=C.find(x=>String(x.id)===String(id));
  if(!c) return toastMsg('Cliente não encontrada.');
  const upcoming=A.filter(a=>a.phone&&c.phone&&a.phone===c.phone&&a.date>=today()&&!['cancelled','missed','done'].includes(a.status)).length;
  const msg=upcoming?`Excluir ${c.name}? Ela tem ${upcoming} agendamento(s) futuro(s) que serão mantidos no histórico.`:`Excluir ${c.name} do cadastro?`;
  if(!confirm(msg)) return;
  C=C.filter(x=>String(x.id)!==String(id));
  if(typeof cloudTombstone==='function')cloudTombstone('c',id);
  save();closeSheet();render();
  toastMsg('Cliente excluída. Histórico de atendimentos mantido.');
}
