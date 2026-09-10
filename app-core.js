const P={
  alongamento:{name:'Alongamento',price:165,min:120,days:25,next:'manutencao'},
  manutencao:{name:'Manutenção',price:85,min:80,days:25,next:'manutencao'},
  banhoGel:{name:'Banho de gel',price:120,min:90,days:25,next:'manutencao'},
  peMao:{name:'Pé e mão tradicional',price:50,min:90,react:15},
  peOuMao:{name:'Pé ou mão tradicional',price:30,min:50,react:15}
};
const ICONS={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></svg>',
 calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M3.5 9.5h17"/></svg>',
 repeat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 7h-9a6 6 0 0 0-6 6v1"/><path d="m17 4 3 3-3 3"/><path d="M4 17h9a6 6 0 0 0 6-6v-1"/><path d="m7 20-3-3 3-3"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.3-4 2.1-6 5.5-6s5.2 2 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.5c3.2-.5 5 1.2 5 4.5"/></svg>',
 settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19 12a7.2 7.2 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.3 3a8 8 0 0 0-1.8 1L5 6 3 9.4 5 11a7.2 7.2 0 0 0 0 2l-2 1.6L5 18l2.5-1a8 8 0 0 0 1.8 1l.3 3h4.8l.3-3a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>',
 left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m15 18-6-6 6-6"/></svg>',
 right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>',
 close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 6 12 12M18 6 6 18"/></svg>',
 whatsapp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z"/><path d="M8.5 8.5c.5 2.5 2 4 4.9 5.2"/></svg>',
 share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 16V4"/><path d="m8 8 4-4 4 4"/><rect x="4" y="10" width="16" height="10" rx="2"/></svg>'
};
const today=()=>{let d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const obj=d=>new Date(d+'T12:00:00');
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const add=(d,n)=>{let x=obj(d);x.setDate(x.getDate()+n);return iso(x)};
const monthAdd=(d,n)=>{let x=obj(d);x.setDate(1);x.setMonth(x.getMonth()+n);return iso(x)};
const fmt=(d,o={day:'2-digit',month:'short'})=>d?new Intl.DateTimeFormat('pt-BR',o).format(obj(d)):'—';
const long=d=>new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(obj(d));
const weekday=d=>new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(obj(d)).replace('.','');
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const tmin=t=>{let[a,b]=t.split(':').map(Number);return a*60+b};
const mt=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const ini=n=>n.split(' ').filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
const days=(a,b)=>Math.floor((obj(b)-obj(a))/86400000);
const work=d=>{let x=obj(d).getDay();return x===0?null:[480,x===6?1080:1050]};
const wstart=d=>{let x=obj(d),n=x.getDay();x.setDate(x.getDate()+(n===0?-6:1-n));return iso(x)};
const procOf=id=>P[id]||{name:'(procedimento anterior)',min:60,price:0,days:0};
const statusLabel=s=>({scheduled:'Agendado',confirmed:'Confirmado',done:'Concluído',cancelled:'Cancelado',missed:'Faltou'}[s]||s);
const ageText=r=>r.due<today()?`${days(r.due,today())} dias atrasada`:r.notify===today()?'Contato hoje':`Contato ${fmt(r.notify)}`;

// A partir desta versão, a base é exclusivamente real. Este epoch limpa apenas os dados
// antigos de demonstração uma única vez e marca o início da base migrável da Marina.
const ESMALTA_DATA_EPOCH='marina-real-v1';
if(localStorage.getItem('esmaltaDataEpoch')!==ESMALTA_DATA_EPOCH){
  localStorage.removeItem('esmaltaAppointments');
  localStorage.removeItem('esmaltaClients');
  localStorage.setItem('esmaltaDataEpoch',ESMALTA_DATA_EPOCH);
}
let A=JSON.parse(localStorage.getItem('esmaltaAppointments')||'[]');
let C=JSON.parse(localStorage.getItem('esmaltaClients')||'[]').map(c=>({...c,visits:c.visits??c.totalVisits??0,spent:c.spent??c.totalSpent??0}));
let tab='today',view='day',sel=today();
const save=()=>{
  const t=new Date().toISOString();
  A.forEach(a=>{a.updated_at=t;});
  C.forEach(c=>{c.updated_at=t;});
  localStorage.setItem('esmaltaAppointments',JSON.stringify(A));
  localStorage.setItem('esmaltaClients',JSON.stringify(C));
  if(window.persistEsmaltaMirror) window.persistEsmaltaMirror();
  if(typeof cloudSchedule==='function')cloudSchedule();
};
function cloudTombstone(kind,id){
  try{
    const k='esmaltaDeleted';
    const d=JSON.parse(localStorage.getItem(k)||'{"a":[],"c":[]}');
    const arr=kind==='a'?d.a:d.c;
    if(!arr.includes(String(id)))arr.push(String(id));
    localStorage.setItem(k,JSON.stringify(d));
  }catch(e){}
  if(typeof cloudSchedule==='function')cloudSchedule();
}
function cloudTombstones(){
  try{return JSON.parse(localStorage.getItem('esmaltaDeleted')||'{"a":[],"c":[]}');}
  catch(e){return{a:[],c:[]};}
}

function returns(){return C.filter(c=>c.lastVisit&&P[c.lastProcedure]).map(c=>{let p=procOf(c.lastProcedure);if(p.days){let due=c.nextDue||add(c.lastVisit,p.days);return{...c,due,notify:add(due,-1),type:'return',suggest:p.next||c.lastProcedure}}let due=add(c.lastVisit,p.react||15);return{...c,due,notify:due,type:'react',suggest:c.lastProcedure}})}
function future(r){return A.some(a=>a.phone===r.phone&&a.date>=today()&&!['cancelled','missed'].includes(a.status))}
function segments(d){let r=work(d);if(!r)return[];let as=A.filter(a=>a.date===d&&!['cancelled','missed'].includes(a.status)).sort((a,b)=>a.time.localeCompare(b.time)),out=[],cur=r[0];as.forEach(a=>{let s=tmin(a.time),e=s+procOf(a.procedure).min;if(s>cur)out.push({k:'free',s:cur,e:s});out.push({k:'appt',a,s,e});cur=Math.max(cur,e)});if(cur<r[1])out.push({k:'free',s:cur,e:r[1]});return out}
function firstSlot(d,proc){for(let i=0;i<21;i++){let x=add(d,i),dur=procOf(proc).min;for(let s of segments(x))if(s.k==='free'&&s.e-s.s>=dur)return{date:x,time:mt(s.s)}}return null}
function clientHistory(phone){return A.filter(a=>a.phone===phone&&a.status==='done').sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))}
function weekData(start=wstart(today())){let end=add(start,5),apps=A.filter(a=>a.date>=start&&a.date<=end&&!['cancelled','missed'].includes(a.status)),rs=returns().filter(r=>r.notify>=start&&r.notify<=end&&!future(r)),react=returns().filter(r=>r.type==='react'&&r.due<=end&&!future(r)),daysFree=Array.from({length:6},(_,i)=>{let d=add(start,i),segs=segments(d).filter(s=>s.k==='free'&&s.e-s.s>=50);return{date:d,minutes:segs.reduce((n,s)=>n+s.e-s.s,0),gaps:segs}});return{start,end,apps,rs,react,daysFree,rev:apps.reduce((s,a)=>s+procOf(a.procedure).price,0)}}
function renderNav(){let late=returns().filter(r=>r.due<today()&&!future(r)).length,items=[['today','home','Hoje'],['agenda','calendar','Agenda'],['returns','repeat','Retornos'],['clients','users','Clientes'],['settings','settings','Configurações']];document.getElementById('nav').innerHTML=items.map(x=>`<button class="${tab===x[0]?'active':''}" onclick="go('${x[0]}')">${ICONS[x[1]]}<span>${x[2]}</span>${x[0]==='returns'&&late?`<span class="nav-count">${late}</span>`:''}</button>`).join('');bottom.innerHTML=`<button class="${tab==='today'?'active':''}" onclick="go('today')">${ICONS.home}<span>Hoje</span></button><button class="${tab==='agenda'?'active':''}" onclick="go('agenda')">${ICONS.calendar}<span>Agenda</span></button><button class="plus" aria-label="Novo agendamento" onclick="openNew()">${ICONS.plus}</button><button class="${tab==='returns'?'active':''}" onclick="go('returns')">${ICONS.repeat}<span>Retornos</span></button><button class="${tab==='clients'?'active':''}" onclick="go('clients')">${ICONS.users}<span>Clientes</span></button>`}
function go(x){tab=x;render()}
function render(){renderNav();title.textContent={today:'Hoje',agenda:'Agenda',returns:'Retornos',clients:'Clientes',settings:'Configurações'}[tab];document.getElementById('pageDate').textContent=tab==='today'?long(today()):'';content.innerHTML=tab==='today'?todayHTML():tab==='agenda'?agendaHTML():tab==='returns'?returnsHTML():tab==='clients'?clientsHTML():settingsHTML()}

function toastMsg(t){toast.textContent=t;toast.style.display='block';clearTimeout(window.tt);window.tt=setTimeout(()=>toast.style.display='none',2600)}
function closeSheet(){overlay.innerHTML=''}
function valid(form,ignore){if(!P[form.procedure])return'Procedimento inválido. Escolha de novo.';let p=P[form.procedure],r=work(form.date);if(!r)return'Marina não atende aos domingos.';let s=tmin(form.time),e=s+p.min;if(s<r[0]||e>r[1])return'Esse procedimento ultrapassa o horário de atendimento.';let c=A.find(a=>String(a.id)!==String(ignore)&&a.date===form.date&&!['cancelled','missed'].includes(a.status)&&s<tmin(a.time)+procOf(a.procedure).min&&e>tmin(a.time));return c?`Conflita com ${c.client}, às ${c.time}.`:''}