/* Esmalta CRM - nuvem (Supabase). Offline-first: localStorage continua valendo,
   a nuvem sincroniza quando tem login e rede. */
const ESMALTA_CLOUD_URL = "https://twoywqhmtdrxukrudptf.supabase.co";
const ESMALTA_CLOUD_ANON = "sb_publishable_Pz0uw4i74vxuHCdflbSbTg_bFXD9lqD";

let sbCloud = null;
let cloudUser = null;
let cloudTimer = null;
let cloudStatus = "off"; // off|syncing|ok|error
let cloudStatusTimer = null;

function cloudNow() { return new Date().toISOString(); }

function cloudClient() {
  if (sbCloud) return sbCloud;
  if (!window.supabase || !window.supabase.createClient) return null;
  if (!ESMALTA_CLOUD_ANON || ESMALTA_CLOUD_ANON.indexOf("PASTE_") === 0) return null;
  sbCloud = window.supabase.createClient(ESMALTA_CLOUD_URL, ESMALTA_CLOUD_ANON);
  return sbCloud;
}

function cloudIdMap() {
  try { return JSON.parse(localStorage.getItem("esmaltaIdMap") || "{}"); }
  catch (e) { return {}; }
}
function cloudSaveIdMap(m) { localStorage.setItem("esmaltaIdMap", JSON.stringify(m)); }

function stampRows() {
  const t = cloudNow();
  (typeof A !== "undefined" ? A : []).forEach(a => { if (!a.updated_at) a.updated_at = t; });
  (typeof C !== "undefined" ? C : []).forEach(c => { if (!c.updated_at) c.updated_at = t; });
}

async function cloudRefreshSession() {
  const sb = cloudClient();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  cloudUser = (data && data.session && data.session.user) || null;
  return !!cloudUser;
}

async function cloudLogin(email, password) {
  const sb = cloudClient();
  if (!sb) return { ok: false, error: "Nuvem não configurada neste aparelho." };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Login inválido. Confira email e senha." };
  cloudUser = data.user;
  await cloudSyncNow();
  return { ok: true };
}

async function cloudLogout() {
  const sb = cloudClient();
  if (sb) await sb.auth.signOut();
  cloudUser = null;
  render();
}

function cloudSetStatus(s) {
  cloudStatus = s;
  const el = document.getElementById("cloudStatus");
  if (el) {
    el.textContent = s === "ok" ? "Nuvem sincronizada" : s === "syncing" ? "Sincronizando..." : s === "error" ? "Falha ao sincronizar" : "";
    el.className = "cloud-status " + s;
  }
}

function toServerAppointment(a) {
  return {
    owner_id: cloudUser ? cloudUser.id : null,
    local_id: String(a.id),
    client_name: a.client, phone: a.phone || "", date: a.date, time: a.time,
    procedure: a.procedure, status: a.status || "scheduled",
    is_deleted: false, updated_at: a.updated_at || cloudNow(),
  };
}

function toServerClient(c) {
  return {
    owner_id: cloudUser ? cloudUser.id : null,
    local_id: String(c.id),
    name: c.name, phone: c.phone || "",
    last_procedure: c.lastProcedure || null, last_visit: c.lastVisit || null,
    next_due: c.nextDue || null, visits: c.visits || 0, spent: c.spent || 0,
    is_deleted: false, updated_at: c.updated_at || cloudNow(),
  };
}

function fromServerAppointment(r) {
  return {
    id: r.local_id && !isNaN(Number(r.local_id)) ? Number(r.local_id) : ("srv-" + r.id),
    client: r.client_name, phone: r.phone || "", date: r.date, time: r.time,
    procedure: r.procedure, status: r.status, updated_at: r.updated_at,
  };
}

function fromServerClient(r) {
  return {
    id: r.local_id && !isNaN(Number(r.local_id)) ? Number(r.local_id) : ("srv-" + r.id),
    name: r.name, phone: r.phone || "",
    lastProcedure: r.last_procedure, lastVisit: r.last_visit, nextDue: r.next_due,
    visits: r.visits || 0, spent: r.spent || 0, updated_at: r.updated_at,
  };
}

async function cloudSyncNow() {
  if (!cloudUser) return false;
  const sb = cloudClient();
  if (!sb || !navigator.onLine) return false;
  cloudSetStatus("syncing");
  try {
    stampRows();
    // PUSH tombstones (local deletes win)
    try {
      const tb = typeof cloudTombstones === "function" ? cloudTombstones() : { a: [], c: [] };
      for (const lid of tb.a || []) {
        await sb.from("esmalta_appointments").delete().eq("local_id", String(lid));
      }
      for (const lid of tb.c || []) {
        await sb.from("esmalta_clients").delete().eq("local_id", String(lid));
      }
    } catch (e) {}
    // PUSH appointments
    for (const a of A) {
      a.updated_at = a.updated_at || cloudNow();
      const { error } = await sb.from("esmalta_appointments")
        .upsert(toServerAppointment(a), { onConflict: "owner_id,local_id" });
      if (error) throw error;
    }
    // PUSH clients
    for (const c of C) {
      c.updated_at = c.updated_at || cloudNow();
      const { error } = await sb.from("esmalta_clients")
        .upsert(toServerClient(c), { onConflict: "owner_id,local_id" });
      if (error) throw error;
    }
    // PULL appointments (last-write-wins)
    const { data: srvA, error: eA } = await sb.from("esmalta_appointments").select("*");
    if (eA) throw eA;
    const localA = new Map(A.map(a => [String(a.id), a]));
    (srvA || []).forEach(r => {
      const cur = localA.get(String(r.local_id));
      if (r.is_deleted) {
        if (cur) A = A.filter(x => String(x.id) !== String(r.local_id));
        return;
      }
      const incoming = fromServerAppointment(r);
      if (!cur) { A.push(incoming); return; }
      if ((r.updated_at || "") > (cur.updated_at || "")) Object.assign(cur, incoming);
    });
    // PULL clients
    const { data: srvC, error: eC } = await sb.from("esmalta_clients").select("*");
    if (eC) throw eC;
    const localC = new Map(C.map(c => [String(c.id), c]));
    (srvC || []).forEach(r => {
      const cur = localC.get(String(r.local_id));
      if (r.is_deleted) {
        if (cur) C = C.filter(x => String(x.id) !== String(r.local_id));
        return;
      }
      const incoming = fromServerClient(r);
      if (!cur) { C.push(incoming); return; }
      if ((r.updated_at || "") > (cur.updated_at || "")) Object.assign(cur, incoming);
    });
    try { localStorage.setItem("esmaltaAppointments", JSON.stringify(A)); } catch (e) {}
    try { localStorage.setItem("esmaltaClients", JSON.stringify(C)); } catch (e) {}
    if (typeof render === "function") render();
    cloudSetStatus("ok");
    return true;
  } catch (e) {
    cloudSetStatus("error");
    return false;
  }
}

function cloudSchedule() {
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => { cloudSyncNow(); }, 2500);
}

async function cloudBoot() {
  const ok = await cloudRefreshSession();
  if (!ok) { cloudSetStatus("off"); return false; }
  cloudSetStatus("ok");
  cloudSyncNow();
  return true;
}

window.addEventListener("online", () => cloudSyncNow());
