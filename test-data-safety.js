const ESMALTA_BACKUP_DB='esmalta-test-backups';
const ESMALTA_BACKUP_STORE='snapshots';
const ESMALTA_SCHEMA_VERSION=1;
let esmaltaBackupTimer=null;

function backupPayload(){
  return {
    app:'Esmalta CRM',
    schemaVersion:ESMALTA_SCHEMA_VERSION,
    exportedAt:new Date().toISOString(),
    mode:'test-local',
    clients:Array.isArray(C)?C:[],
    appointments:Array.isArray(A)?A:[],
    procedures:P
  };
}
function openBackupDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const req=indexedDB.open(ESMALTA_BACKUP_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(ESMALTA_BACKUP_STORE)) db.createObjectStore(ESMALTA_BACKUP_STORE,{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function writeLocalSnapshot(reason='auto'){
  try{
    const db=await openBackupDB();
    const payload=backupPayload();
    const day=payload.exportedAt.slice(0,10);
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(ESMALTA_BACKUP_STORE,'readwrite');
      const store=tx.objectStore(ESMALTA_BACKUP_STORE);
      store.put({key:'latest',createdAt:payload.exportedAt,reason,data:payload});
      store.put({key:`day-${day}`,createdAt:payload.exportedAt,reason,data:payload});
      if(reason!=='auto'&&reason!=='load') store.put({key:`${reason}-${Date.now()}`,createdAt:payload.exportedAt,reason,data:payload});
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
    if(document.getElementById('backupStatus')) refreshBackupStatus();
  }catch(e){ console.warn('Backup local indisponível',e); }
}
function queueLocalSnapshot(reason='auto'){
  clearTimeout(esmaltaBackupTimer);
  esmaltaBackupTimer=setTimeout(()=>writeLocalSnapshot(reason),250);
}
async function readLatestSnapshot(){
  try{
    const db=await openBackupDB();
    const result=await new Promise((resolve,reject)=>{
      const tx=db.transaction(ESMALTA_BACKUP_STORE,'readonly');
      const req=tx.objectStore(ESMALTA_BACKUP_STORE).get('latest');
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return result;
  }catch(e){ return null; }
}
function validateBackup(data){
  if(!data||data.app!=='Esmalta CRM') throw new Error('Arquivo não pertence ao Esmalta CRM.');
  if(!Array.isArray(data.clients)||!Array.isArray(data.appointments)) throw new Error('Backup inválido ou incompleto.');
  if((data.schemaVersion||1)>ESMALTA_SCHEMA_VERSION) throw new Error('Backup criado por uma versão mais nova do CRM.');
  return data;
}
function restorePayload(data){
  const clean=validateBackup(data);
  A=clean.appointments;
  C=clean.clients.map(c=>({...c,visits:c.visits??c.totalVisits??0,spent:c.spent??c.totalSpent??0}));
  save();
  render();
  queueLocalSnapshot('after-restore');
}
async function exportTestBackup(){
  const payload=backupPayload();
  await writeLocalSnapshot('manual-export');
  const json=JSON.stringify(payload,null,2);
  const fileName=`esmalta-backup-${payload.exportedAt.slice(0,16).replace(/[:T]/g,'-')}.json`;
  const file=new File([json],fileName,{type:'application/json'});
  try{
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({title:'Backup Esmalta CRM',text:'Backup dos testes da Esmalta',files:[file]});
      toastMsg('Backup pronto para salvar ou compartilhar.');
      return;
    }
  }catch(e){ if(e?.name==='AbortError') return; }
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  toastMsg('Backup exportado.');
}
function chooseBackupFile(){ document.getElementById('backupFileInput')?.click(); }
async function importTestBackup(input){
  const file=input.files?.[0]; if(!file) return;
  try{
    await writeLocalSnapshot('before-import');
    const data=validateBackup(JSON.parse(await file.text()));
    const ok=confirm(`Restaurar ${data.clients.length} clientes e ${data.appointments.length} agendamentos deste backup?\n\nOs dados atuais serão substituídos, mas uma cópia local foi criada antes.`);
    if(!ok){ input.value=''; return; }
    restorePayload(data);
    closeSheet();
    toastMsg('Backup restaurado com sucesso.');
  }catch(e){ toastMsg(e.message||'Não foi possível restaurar o backup.'); }
  input.value='';
}
async function restoreLocalBackup(){
  const snap=await readLatestSnapshot();
  if(!snap) return toastMsg('Nenhum backup local encontrado neste aparelho.');
  const d=snap.data;
  const when=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(snap.createdAt));
  if(!confirm(`Restaurar o backup local de ${when}?\n\n${d.clients.length} clientes · ${d.appointments.length} agendamentos`)) return;
  restorePayload(d);
  closeSheet();
  toastMsg('Backup local restaurado.');
}
async function startRealTestBase(){
  if(!confirm('Iniciar uma base vazia para os testes reais da Marina?\n\nSerá criado um backup local antes de remover os dados de demonstração.')) return;
  await writeLocalSnapshot('before-real-base');
  A=[];C=[];save();render();
  queueLocalSnapshot('real-base-created');
  toastMsg('Base real iniciada. Agora cadastre as clientes da Marina.');
}
async function refreshBackupStatus(){
  const el=document.getElementById('backupStatus'); if(!el) return;
  const snap=await readLatestSnapshot();
  if(!snap){el.textContent='Ainda não há backup local neste aparelho.';return;}
  const when=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(snap.createdAt));
  el.textContent=`Última cópia local: ${when} · ${snap.data.clients.length} clientes · ${snap.data.appointments.length} agendamentos`;
}
function safetyPanelHTML(){
  const hasReal=A.length===0&&C.length===0;
  return `<section class="settings safety-settings"><div class="section-head"><div><div class="eyebrow">DADOS DOS TESTES</div><h2>Backup e restauração</h2><p>Enquanto o Supabase definitivo não estiver conectado, mantenha uma cópia dos clientes e agendamentos reais.</p></div><span class="test-chip">MODO TESTE</span></div><div class="backup-actions"><button class="backup-primary" onclick="exportTestBackup()">Fazer backup</button><button onclick="chooseBackupFile()">Restaurar arquivo</button><button onclick="restoreLocalBackup()">Restaurar cópia local</button></div><input id="backupFileInput" type="file" accept="application/json,.json" hidden onchange="importTestBackup(this)"><div class="backup-status" id="backupStatus">Verificando cópia local…</div>${!hasReal?`<div class="danger-zone"><div><strong>Começar os testes com dados reais</strong><span>Remove apenas a base de demonstração atual deste aparelho e cria um backup antes.</span></div><button onclick="startRealTestBase()">Iniciar base real</button></div>`:''}</section>`;
}

const __settingsHTML=settingsHTML;
settingsHTML=function(){ return __settingsHTML()+safetyPanelHTML(); };
const __render=render;
render=function(){ __render(); if(tab==='settings') setTimeout(refreshBackupStatus,0); };

const __storageSetItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  __storageSetItem.call(this,key,value);
  if(this===localStorage&&(key==='esmaltaAppointments'||key==='esmaltaClients')) queueLocalSnapshot('auto');
};

setTimeout(()=>writeLocalSnapshot('load'),500);