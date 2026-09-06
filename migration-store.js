const ESMALTA_MIRROR_DB='esmalta-marina-real-v1';
const ESMALTA_MIRROR_STORE='data';
const ESMALTA_SCHEMA_VERSION=1;
let esmaltaMirrorTimer=null;
let esmaltaRestoring=false;

function esmaltaMigrationPayload(){
  return {
    app:'Esmalta CRM',
    schemaVersion:ESMALTA_SCHEMA_VERSION,
    dataEpoch:ESMALTA_DATA_EPOCH,
    updatedAt:new Date().toISOString(),
    clients:Array.isArray(C)?C:[],
    appointments:Array.isArray(A)?A:[],
    procedures:P
  };
}

function openEsmaltaMirrorDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const req=indexedDB.open(ESMALTA_MIRROR_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(ESMALTA_MIRROR_STORE)) db.createObjectStore(ESMALTA_MIRROR_STORE,{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function writeEsmaltaMirror(){
  if(esmaltaRestoring) return;
  try{
    const db=await openEsmaltaMirrorDB();
    const data=esmaltaMigrationPayload();
    const day=data.updatedAt.slice(0,10);
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(ESMALTA_MIRROR_STORE,'readwrite');
      const store=tx.objectStore(ESMALTA_MIRROR_STORE);
      store.put({key:'latest',updatedAt:data.updatedAt,data});
      store.put({key:`day-${day}`,updatedAt:data.updatedAt,data});
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch(e){
    console.warn('Espelho local do Esmalta indisponível',e);
  }
}

window.persistEsmaltaMirror=function(){
  clearTimeout(esmaltaMirrorTimer);
  esmaltaMirrorTimer=setTimeout(writeEsmaltaMirror,120);
};

async function readEsmaltaMirror(){
  try{
    const db=await openEsmaltaMirrorDB();
    const result=await new Promise((resolve,reject)=>{
      const tx=db.transaction(ESMALTA_MIRROR_STORE,'readonly');
      const req=tx.objectStore(ESMALTA_MIRROR_STORE).get('latest');
      req.onsuccess=()=>resolve(req.result?.data||null);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return result;
  }catch(e){
    return null;
  }
}

async function initEsmaltaPersistence(){
  try{ if(navigator.storage?.persist) await navigator.storage.persist(); }catch(e){}

  const hasPrimaryData=localStorage.getItem('esmaltaAppointments')!==null || localStorage.getItem('esmaltaClients')!==null;
  const mirror=await readEsmaltaMirror();

  if(!hasPrimaryData && mirror && mirror.dataEpoch===ESMALTA_DATA_EPOCH && Array.isArray(mirror.clients) && Array.isArray(mirror.appointments)){
    esmaltaRestoring=true;
    A=mirror.appointments;
    C=mirror.clients.map(c=>({...c,visits:c.visits??c.totalVisits??0,spent:c.spent??c.totalSpent??0}));
    localStorage.setItem('esmaltaAppointments',JSON.stringify(A));
    localStorage.setItem('esmaltaClients',JSON.stringify(C));
    esmaltaRestoring=false;
    render();
  }

  writeEsmaltaMirror();
}

window.getEsmaltaMigrationPayload=esmaltaMigrationPayload;
setTimeout(initEsmaltaPersistence,0);