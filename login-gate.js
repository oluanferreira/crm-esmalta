/* Login gate: sem sessão, mostra login; com sessão, libera o app. */
function gateShowLogin(msg) {
  document.querySelector(".app").style.display = "none";
  let box = document.getElementById("loginGate");
  if (!box) {
    box = document.createElement("div");
    box.id = "loginGate";
    box.innerHTML =
      '<div class="login-card"><div class="brand"><div class="mark">E</div>' +
      "<div><strong>Esmalta</strong><small>CRM da Marina</small></div></div>" +
      '<p class="login-hint">Entre para sincronizar entre aparelhos.</p>' +
      '<div class="form"><label>Email<input id="loginEmail" type="email" autocomplete="username" placeholder="voce@email.com"></label>' +
      '<label>Senha<input id="loginPass" type="password" autocomplete="current-password" placeholder="••••••••"></label>' +
      '<div class="login-err" id="loginErr"></div>' +
      '<button class="primary" id="loginBtn">Entrar</button></div></div>';
    document.body.appendChild(box);
    document.getElementById("loginBtn").onclick = async () => {
      const em = document.getElementById("loginEmail").value.trim();
      const pw = document.getElementById("loginPass").value;
      const err = document.getElementById("loginErr");
      err.textContent = "";
      document.getElementById("loginBtn").textContent = "Entrando...";
      const r = await cloudLogin(em, pw);
      document.getElementById("loginBtn").textContent = "Entrar";
      if (!r.ok) { err.textContent = r.error; return; }
      document.querySelector(".app").style.display = "";
      box.remove();
      gateStatusPill();
    };
  }
  const m = document.getElementById("loginErr");
  if (m && msg) m.textContent = msg;
}

function gateStatusPill() {
  if (document.getElementById("cloudStatus")) return;
  const top = document.querySelector(".top > div");
  if (!top) return;
  const s = document.createElement("div");
  s.id = "cloudStatus";
  s.className = "cloud-status";
  top.appendChild(s);
  cloudSetStatus(cloudStatus);
}

function gateLogoutBtn() {
  const nav = document.getElementById("nav");
  if (!nav || document.getElementById("logoutBtn")) return;
  const b = document.createElement("button");
  b.id = "logoutBtn";
  b.innerHTML = "<span>Sair</span>";
  b.onclick = async () => {
    if (!confirm("Sair da conta neste aparelho? Os dados ficam salvos aqui e na nuvem.")) return;
    await cloudLogout();
    location.reload();
  };
  nav.appendChild(b);
}

window.addEventListener("DOMContentLoaded", async () => {
  if (!cloudClient()) {
    gateShowLogin("Nuvem em configuração. Fale com o Luan.");
    return;
  }
  const ok = await cloudBoot();
  if (ok) {
    const g = document.getElementById("loginGate");
    if (g) g.remove();
    document.querySelector(".app").style.display = "";
    gateStatusPill();
    gateLogoutBtn();
  } else {
    gateShowLogin("");
  }
});
