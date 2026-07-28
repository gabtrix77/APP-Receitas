/* ============================================================
   RECEITAS PRA SECAR — app
   SPA vanilla, hash-router, estado em localStorage
   ============================================================ */

// ---------- estado ----------
const store = {
  get(k, fb) { try { const v = localStorage.getItem("rps_" + k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem("rps_" + k, JSON.stringify(v)); } catch {} },
};

const DIAS = [
  { id:"seg", nome:"Seg" }, { id:"ter", nome:"Ter" }, { id:"qua", nome:"Qua" },
  { id:"qui", nome:"Qui" }, { id:"sex", nome:"Sex" }, { id:"sab", nome:"Sáb" }, { id:"dom", nome:"Dom" },
];
const REFEICOES = [
  { id:"cafe", nome:"Café da manhã", emoji:"☕" },
  { id:"almoco", nome:"Almoço", emoji:"🍽️" },
  { id:"lanche", nome:"Lanche", emoji:"🥪" },
  { id:"jantar", nome:"Jantar", emoji:"🌙" },
];

let plannerDia = "seg";
let receitasFiltro = { cat: "todas", busca: "" };

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

function todasReceitas() { return RECEITAS.concat(BONUS_RECEITAS); }
function receita(id) { return todasReceitas().find(r => r.id === id); }
function catInfo(id) { return CATEGORIAS.find(c => c.id === id); }
function gradClass(r) { return r.cat ? "g-" + r.cat : "g-bonus"; }

// ---------- toast ----------
let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.add("hidden"), 2200);
}

// ---------- sheet ----------
function openSheet(html) {
  $("#sheet").innerHTML = '<div class="grab"></div>' + html;
  $("#sheet").classList.remove("hidden");
  $("#sheet-backdrop").classList.remove("hidden");
}
function closeSheet() {
  $("#sheet").classList.add("hidden");
  $("#sheet-backdrop").classList.add("hidden");
}
$("#sheet-backdrop").addEventListener("click", closeSheet);

// ---------- router ----------
const routes = {};
function navigate(hash) { location.hash = hash; }
window.addEventListener("hashchange", render);

function render() {
  const hash = location.hash.replace(/^#\/?/, "") || "home";
  const [route, param] = hash.split("/");
  closeSheet();
  (routes[route] || routes.home)(param);
  const tabRoute = ["receita", "guia"].includes(route) ? "receitas"
    : ["tabela", "diario"].includes(route) ? "home"
    : route;
  document.querySelectorAll(".tab").forEach(t =>
    t.classList.toggle("active", t.dataset.route === (routes[tabRoute] ? tabRoute : "home")));
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(t =>
  t.addEventListener("click", () => navigate(t.dataset.route)));

const backBtn = (to) => `<button class="back" onclick="${to ? `navigate('${to}')` : "history.back()"}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>`;

// ---------- componentes ----------
function rcardHTML(r, onclick) {
  const c = catInfo(r.cat);
  return `<div class="rcard" onclick="${onclick || `navigate('receita/${r.id}')`}">
    <div class="thumb ${gradClass(r)}">${r.emoji}</div>
    <div class="r-info">
      <div class="r-name">${esc(r.nome)}</div>
      <div class="r-meta">
        <i>⏱ ${r.tempo} min</i><i>🔥 ${r.kcal ? r.kcal + " kcal" : "—"}</i><i>${c ? c.nome : "Bônus"}</i>
      </div>
    </div>
    <svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
  </div>`;
}

// ---------- HOME ----------
routes.home = () => {
  const nome = store.get("nome", "");
  const h = new Date().getHours();
  const sauda = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const planner = store.get("planner", {});
  let preenchidos = 0;
  DIAS.forEach(d => REFEICOES.forEach(m => { if (planner[d.id]?.[m.id]) preenchidos++; }));
  const pct = Math.round((preenchidos / 28) * 100);

  // sugestões do dia (determinístico pela data)
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  const sug = [
    RECEITAS.filter(r => r.cat === "cafe")[seed % 5],
    RECEITAS.filter(r => r.cat === "almoco")[(seed + 1) % 5],
    RECEITAS.filter(r => r.cat === "sobremesas")[(seed + 2) % 5],
  ];

  view.innerHTML = `
    <header class="apphead">
      <div class="eyebrow">Receitas pra secar</div>
      <div class="hello">${sauda}${nome ? ", " + esc(nome) : ""}! 👋</div>
      <div class="sub">O que vamos cozinhar hoje?</div>
    </header>

    <div class="hero-card">
      <h2>Monte sua semana em 5 minutos</h2>
      <p>Escolha as receitas no planner e a lista de compras sai pronta, sozinha.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('planner')">Abrir planner →</button>
    </div>

    ${preenchidos > 0 ? `
    <div class="section">
      <div class="card" style="padding:15px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <b style="font-size:14px">Sua semana planejada</b>
          <span style="font-size:12px;color:var(--ink-soft);font-weight:700">${preenchidos}/28 refeições</span>
        </div>
        <div class="progress-bar"><i style="width:${pct}%"></i></div>
      </div>
    </div>` : ""}

    <div class="section">
      <div class="section-head"><h2>Sugestões de hoje</h2><button class="link" onclick="navigate('receitas')">Ver todas</button></div>
      <div class="recipe-row">${sug.map(r => rcardHTML(r)).join("")}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Ferramentas</h2></div>
      <div class="tiles">
        <div class="tile" onclick="navigate('diario')">
          <div class="t-ico t-green">📔</div><b>Diário Alimentar</b><span>Registre o dia e a água</span>
        </div>
        <div class="tile" onclick="navigate('tabela')">
          <div class="t-ico t-gold">📊</div><b>Tabela Nutricional</b><span>Calorias e macros de ${ALIMENTOS.length} alimentos</span>
        </div>
        <div class="tile" onclick="navigate('lista')">
          <div class="t-ico t-terra">🛒</div><b>Lista de Compras</b><span>Gerada do seu planner</span>
        </div>
        <div class="tile" onclick="navigate('guia')">
          <div class="t-ico t-green">⚙️</div><b>Guia Airfryer</b><span>Tempos e temperaturas</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Seus bônus</h2><button class="link" onclick="navigate('bonus')">Ver todos</button></div>
      <div class="bonus-grid">
        ${BONUS.slice(0, 2).map(b => `
          <div class="bonus-card" onclick="navigate('bonus/${b.id}')">
            <span class="b-tag">Bônus</span>
            <div class="b-emoji">${b.emoji}</div><b>${esc(b.nome)}</b><span>${esc(b.desc)}</span>
          </div>`).join("")}
      </div>
    </div>`;
};

// ---------- RECEITAS ----------
routes.receitas = () => {
  const { cat, busca } = receitasFiltro;
  let lista = RECEITAS;
  if (cat !== "todas") lista = lista.filter(r => r.cat === cat);
  if (busca) {
    const q = busca.toLowerCase();
    lista = lista.filter(r => r.nome.toLowerCase().includes(q) || (r.ing || []).some(i => i.toLowerCase().includes(q)));
  }
  view.innerHTML = `
    <header class="pagehead"><h1>Receitas</h1></header>
    <div class="search-wrap">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="busca" type="search" placeholder="Buscar receita ou ingrediente…" value="${esc(busca)}" />
    </div>
    <div class="chips">
      <button class="chip ${cat === "todas" ? "active" : ""}" data-cat="todas">Todas</button>
      ${CATEGORIAS.map(c => `<button class="chip ${cat === c.id ? "active" : ""}" data-cat="${c.id}">${c.emoji} ${c.nome}</button>`).join("")}
    </div>
    <div class="recipe-row" style="margin-top:6px">
      ${lista.length ? lista.map(r => rcardHTML(r)).join("") :
        `<div class="empty"><div class="e-emoji">🔍</div><b>Nada por aqui</b><p>Tente outra palavra ou categoria.</p></div>`}
    </div>`;
  $("#busca").addEventListener("input", e => {
    receitasFiltro.busca = e.target.value;
    routes.receitas();
    const inp = $("#busca"); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  });
  document.querySelectorAll(".chip").forEach(c =>
    c.addEventListener("click", () => { receitasFiltro.cat = c.dataset.cat; routes.receitas(); }));
};

// ---------- DETALHE ----------
routes.receita = (id) => {
  const r = receita(id);
  if (!r) return navigate("receitas");
  const c = catInfo(r.cat);
  const isGuia = r.dif === "Método";
  view.innerHTML = `
    <header class="pagehead">${backBtn()}<h1 style="font-size:18px">${c ? c.nome : "Bônus"}</h1></header>
    <div class="detail-hero ${gradClass(r)}">${r.emoji}</div>
    <h1 class="detail-title display">${esc(r.nome)}</h1>
    <div class="meta-chips">
      <span class="mchip">⏱ <b>${r.tempo} min</b></span>
      <span class="mchip">🍽 <b>${r.porcoes} ${r.porcoes > 1 ? "porções" : "porção"}</b></span>
      <span class="mchip">📶 <b>${r.dif}</b></span>
    </div>
    ${r.kcal ? `
    <div class="macros">
      <div class="macro"><b>${r.kcal}</b><span>kcal</span></div>
      <div class="macro"><b>${r.prot}g</b><span>Prot.</span></div>
      <div class="macro"><b>${r.carb}g</b><span>Carb.</span></div>
      <div class="macro"><b>${r.gord}g</b><span>Gord.</span></div>
    </div>
    <p style="font-size:11.5px;color:var(--ink-faint);margin-top:-8px">*valores aproximados por porção</p>` : ""}

    <h2 class="block-title">🧺 Ingredientes</h2>
    <div class="card" style="padding:8px">
      <div class="ing-list">
        ${r.ing.map((i, idx) => `<div class="ing" data-i="${idx}"><span class="box"></span><span>${esc(i)}</span></div>`).join("")}
      </div>
    </div>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" id="add-lista">🛒 Adicionar ingredientes à lista de compras</button>

    <h2 class="block-title">👩‍🍳 Modo de preparo</h2>
    <div class="steps">${r.passos.map(p => `<div class="step"><div>${esc(p)}</div></div>`).join("")}</div>

    ${!isGuia ? `
    <div class="detail-actions">
      <button class="btn btn-green" id="add-planner">📅 Pôr no planner</button>
      <button class="btn btn-primary" onclick="navigate('receitas')">Ver mais receitas</button>
    </div>` : ""}`;

  document.querySelectorAll(".ing").forEach(el =>
    el.addEventListener("click", () => el.classList.toggle("done")));

  $("#add-lista").addEventListener("click", () => {
    const lista = store.get("lista", []);
    let add = 0;
    r.ing.forEach(i => {
      if (!lista.some(x => x.t === i)) { lista.push({ t: i, done: false, g: r.nome }); add++; }
    });
    store.set("lista", lista);
    toast(add ? `${add} ingredientes na lista 🛒` : "Já estavam na lista ✓");
  });

  const addPlanner = $("#add-planner");
  if (addPlanner) addPlanner.addEventListener("click", () => {
    openSheet(`
      <h2>Adicionar ao planner</h2>
      <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">Escolha o dia e a refeição:</p>
      <div class="chips" id="sh-dias">${DIAS.map((d, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-d="${d.id}">${d.nome}</button>`).join("")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px">
        ${REFEICOES.map(m => `<button class="btn btn-ghost btn-sm" data-m="${m.id}">${m.emoji} ${m.nome}</button>`).join("")}
      </div>`);
    let dSel = "seg";
    document.querySelectorAll("#sh-dias .chip").forEach(ch =>
      ch.addEventListener("click", () => {
        document.querySelectorAll("#sh-dias .chip").forEach(x => x.classList.remove("active"));
        ch.classList.add("active"); dSel = ch.dataset.d;
      }));
    document.querySelectorAll("#sheet [data-m]").forEach(b =>
      b.addEventListener("click", () => {
        const planner = store.get("planner", {});
        planner[dSel] = planner[dSel] || {};
        planner[dSel][b.dataset.m] = r.id;
        store.set("planner", planner);
        closeSheet();
        toast(`Adicionado: ${DIAS.find(x => x.id === dSel).nome} · ${REFEICOES.find(x => x.id === b.dataset.m).nome} ✓`);
      }));
  });
};

// ---------- PLANNER ----------
routes.planner = () => {
  const planner = store.get("planner", {});
  const dia = planner[plannerDia] || {};
  view.innerHTML = `
    <header class="pagehead"><h1>Planner Semanal</h1></header>
    <div class="day-picker">
      ${DIAS.map(d => {
        const has = REFEICOES.some(m => planner[d.id]?.[m.id]);
        return `<button class="daybtn ${d.id === plannerDia ? "active" : ""} ${has ? "has" : ""}" data-d="${d.id}">
          <small>${d.nome}</small><b>${d.nome[0]}</b><div class="dot"></div></button>`;
      }).join("")}
    </div>
    ${REFEICOES.map(m => {
      const rid = dia[m.id];
      const r = rid && receita(rid);
      return `<div class="meal-slot">
        <div class="slot-label">${m.emoji} ${m.nome}</div>
        ${r ? `<div class="slot-filled">${rcardHTML(r)}<button class="rm" data-rm="${m.id}">×</button></div>`
            : `<div class="slot-empty" data-pick="${m.id}">+ Escolher receita</div>`}
      </div>`;
    }).join("")}
    <div class="divider"></div>
    <button class="btn btn-primary btn-block" onclick="navigate('lista')">🛒 Gerar lista de compras da semana</button>`;

  document.querySelectorAll(".daybtn").forEach(b =>
    b.addEventListener("click", () => { plannerDia = b.dataset.d; routes.planner(); }));

  document.querySelectorAll("[data-rm]").forEach(b =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const planner = store.get("planner", {});
      if (planner[plannerDia]) delete planner[plannerDia][b.dataset.rm];
      store.set("planner", planner);
      routes.planner();
    }));

  document.querySelectorAll("[data-pick]").forEach(slot =>
    slot.addEventListener("click", () => abrirSeletor(slot.dataset.pick)));
};

function abrirSeletor(mealId) {
  const renderLista = (q = "") => {
    let lista = todasReceitas().filter(r => r.dif !== "Método");
    if (q) lista = lista.filter(r => r.nome.toLowerCase().includes(q.toLowerCase()));
    $("#sel-lista").innerHTML = lista.slice(0, 40).map(r =>
      rcardHTML(r, `selecionarReceita('${r.id}','${mealId}')`)).join("");
  };
  openSheet(`
    <h2>${REFEICOES.find(m => m.id === mealId).emoji} Escolher receita</h2>
    <div class="search-wrap">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="sel-busca" type="search" placeholder="Buscar…" />
    </div>
    <div class="recipe-row" id="sel-lista"></div>`);
  renderLista();
  $("#sel-busca").addEventListener("input", e => renderLista(e.target.value));
}

window.selecionarReceita = (rid, mealId) => {
  const planner = store.get("planner", {});
  planner[plannerDia] = planner[plannerDia] || {};
  planner[plannerDia][mealId] = rid;
  store.set("planner", planner);
  closeSheet();
  routes.planner();
  toast("Receita adicionada ✓");
};

// ---------- LISTA ----------
routes.lista = () => {
  const lista = store.get("lista", []);
  const grupos = {};
  lista.forEach((item, idx) => {
    const g = item.g || "Outros itens";
    (grupos[g] = grupos[g] || []).push({ ...item, idx });
  });
  view.innerHTML = `
    <header class="pagehead"><h1>Lista de Compras</h1></header>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px">
      <button class="btn btn-green btn-sm" id="gerar">⚡ Gerar do planner</button>
      <button class="btn btn-ghost btn-sm" id="limpar">🗑 Limpar marcados</button>
    </div>
    <div class="add-row">
      <input id="novo-item" type="text" placeholder="Adicionar item manualmente…" />
      <button class="btn btn-primary btn-sm" id="add-item">+</button>
    </div>
    ${Object.keys(grupos).length ? Object.entries(grupos).map(([g, items]) => `
      <div class="list-group">
        <h3>${esc(g)} <span class="cnt">${items.filter(i => !i.done).length}</span></h3>
        <div class="card" style="padding:6px">
          ${items.map(i => `<div class="ing ${i.done ? "done" : ""}" data-idx="${i.idx}"><span class="box"></span><span>${esc(i.t)}</span></div>`).join("")}
        </div>
      </div>`).join("") :
      `<div class="empty"><div class="e-emoji">🛒</div><b>Lista vazia</b><p>Monte seu planner e toque em "Gerar do planner" — a lista sai sozinha.</p></div>`}`;

  $("#gerar").addEventListener("click", () => {
    const planner = store.get("planner", {});
    const lista = store.get("lista", []).filter(i => i.g === "Outros itens"); // preserva manuais
    const vistos = new Set(lista.map(i => i.t));
    let add = 0;
    DIAS.forEach(d => REFEICOES.forEach(m => {
      const r = planner[d.id]?.[m.id] && receita(planner[d.id][m.id]);
      if (r) r.ing.forEach(i => {
        if (!vistos.has(i)) { vistos.add(i); lista.push({ t: i, done: false, g: r.nome }); add++; }
      });
    }));
    store.set("lista", lista);
    routes.lista();
    toast(add ? `Lista gerada: ${add} itens ⚡` : "Planner vazio — monte sua semana primeiro");
  });

  $("#limpar").addEventListener("click", () => {
    store.set("lista", store.get("lista", []).filter(i => !i.done));
    routes.lista();
  });

  const addManual = () => {
    const inp = $("#novo-item");
    if (!inp.value.trim()) return;
    const lista = store.get("lista", []);
    lista.push({ t: inp.value.trim(), done: false, g: "Outros itens" });
    store.set("lista", lista);
    routes.lista();
    $("#novo-item").focus();
  };
  $("#add-item").addEventListener("click", addManual);
  $("#novo-item").addEventListener("keydown", e => { if (e.key === "Enter") addManual(); });

  document.querySelectorAll(".ing[data-idx]").forEach(el =>
    el.addEventListener("click", () => {
      const lista = store.get("lista", []);
      lista[+el.dataset.idx].done = !lista[+el.dataset.idx].done;
      store.set("lista", lista);
      routes.lista();
    }));
};

// ---------- DIÁRIO ----------
function hojeKey(off = 0) {
  const d = new Date(); d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}
let diarioOff = 0;
routes.diario = () => {
  const key = hojeKey(diarioOff);
  const diario = store.get("diario", {});
  const dia = diario[key] || { agua: 0 };
  const d = new Date(); d.setDate(d.getDate() + diarioOff);
  const label = diarioOff === 0 ? "Hoje" : diarioOff === -1 ? "Ontem" :
    d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });

  view.innerHTML = `
    <header class="pagehead">${backBtn("home")}<h1>Diário Alimentar</h1></header>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button class="btn btn-ghost btn-sm" id="d-prev">←</button>
      <b style="font-family:var(--font-display);font-size:17px">${label}</b>
      <button class="btn btn-ghost btn-sm" id="d-next" ${diarioOff >= 0 ? "disabled style='opacity:.35'" : ""}>→</button>
    </div>

    <div class="card water-card">
      <div class="w-info"><b>💧 ${(dia.agua || 0) * 250} ml</b><span>Meta: 2.000 ml de água</span></div>
      <div class="water-btns">
        <button class="wbtn" id="w-menos">−</button>
        <button class="wbtn" id="w-mais">+</button>
      </div>
    </div>
    <div class="progress-bar" style="margin:10px 0 20px"><i style="width:${Math.min(100, ((dia.agua || 0) * 250 / 2000) * 100)}%"></i></div>

    ${REFEICOES.map(m => `
      <div class="card diary-meal">
        <div class="dm-head"><b>${m.emoji} ${m.nome}</b></div>
        <textarea data-meal="${m.id}" placeholder="O que você comeu?">${esc(dia[m.id] || "")}</textarea>
      </div>`).join("")}

    <div class="notice">💡 Registrar o que come — sem julgamento — é o hábito nº 1 de quem emagrece de verdade. Leva 1 minuto.</div>`;

  const salvar = (patch) => {
    const diario = store.get("diario", {});
    diario[key] = { ...(diario[key] || { agua: 0 }), ...patch };
    store.set("diario", diario);
  };
  $("#w-mais").addEventListener("click", () => { salvar({ agua: (dia.agua || 0) + 1 }); routes.diario(); });
  $("#w-menos").addEventListener("click", () => { salvar({ agua: Math.max(0, (dia.agua || 0) - 1) }); routes.diario(); });
  $("#d-prev").addEventListener("click", () => { diarioOff--; routes.diario(); });
  $("#d-next").addEventListener("click", () => { if (diarioOff < 0) { diarioOff++; routes.diario(); } });
  document.querySelectorAll("[data-meal]").forEach(t =>
    t.addEventListener("input", () => salvar({ [t.dataset.meal]: t.value })));
};

// ---------- TABELA ----------
routes.tabela = () => {
  view.innerHTML = `
    <header class="pagehead">${backBtn("home")}<h1>Tabela Nutricional</h1></header>
    <div class="search-wrap">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="t-busca" type="search" placeholder="Buscar alimento…" />
    </div>
    <p style="font-size:12px;color:var(--ink-faint);margin-bottom:10px">Valores aproximados por 100 g</p>
    <div class="card" style="padding:6px;overflow-x:auto" id="t-wrap"></div>`;
  const renderT = (q = "") => {
    let lista = ALIMENTOS;
    if (q) lista = lista.filter(a => a.n.toLowerCase().includes(q.toLowerCase()));
    const grupos = {};
    lista.forEach(a => (grupos[a.g] = grupos[a.g] || []).push(a));
    $("#t-wrap").innerHTML = `<table class="food-table">
      <thead><tr><th>Alimento</th><th>kcal</th><th>P</th><th>C</th><th>G</th></tr></thead>
      <tbody>${Object.entries(grupos).map(([g, items]) =>
        `<tr><td colspan="5" style="background:var(--paper-2);font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-soft)">${g}</td></tr>` +
        items.map(a => `<tr><td>${esc(a.n)}</td><td>${a.kcal}</td><td>${a.p}</td><td>${a.c}</td><td>${a.f}</td></tr>`).join("")
      ).join("")}</tbody></table>`;
  };
  renderT();
  $("#t-busca").addEventListener("input", e => renderT(e.target.value));
};

// ---------- BÔNUS ----------
routes.bonus = (id) => {
  if (id === undefined) {
    view.innerHTML = `
      <header class="pagehead"><h1>Seus Bônus</h1></header>
      <p style="font-size:13.5px;color:var(--ink-soft);margin-bottom:16px">Tudo isso já está incluído no seu acesso — sem pagar nada a mais.</p>
      <div class="bonus-grid">
        ${BONUS.map(b => `
          <div class="bonus-card" onclick="navigate('${b.tipo === "guia" ? "guia" : "bonus/" + b.id}')">
            <span class="b-tag">Valor ${b.valor}</span>
            <div class="b-emoji">${b.emoji}</div><b>${esc(b.nome)}</b><span>${esc(b.desc)}</span>
          </div>`).join("")}
      </div>`;
    return;
  }
  const b = BONUS.find(x => x.id === id);
  if (!b) return navigate("bonus");
  const receitas = BONUS_RECEITAS.filter(r => r.bonus === id);
  view.innerHTML = `
    <header class="pagehead">${backBtn("bonus")}<h1>${b.emoji} ${esc(b.nome)}</h1></header>
    <p style="font-size:14px;color:var(--ink-soft);margin-bottom:16px">${esc(b.desc)}</p>
    <div class="recipe-row">${receitas.map(r => rcardHTML(r)).join("")}</div>`;
};

// ---------- GUIA AIRFRYER ----------
routes.guia = () => {
  const g = GUIA_AIRFRYER;
  view.innerHTML = `
    <header class="pagehead">${backBtn()}<h1>⚙️ ${esc(g.titulo)}</h1></header>
    <p style="font-size:14px;color:var(--ink-soft);margin-bottom:16px">${esc(g.intro)}</p>
    <div class="article">
      ${g.secoes.map(s => `<div class="card">
        <h3>${esc(s.titulo)}</h3>
        ${s.tabela ? `<div style="overflow-x:auto"><table>
          <thead><tr>${s.tabela.colunas.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${s.tabela.linhas.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>` : ""}
        ${s.lista ? `<ul>${s.lista.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")}
    </div>`;
};

// ---------- ONBOARDING ----------
function onboarding() {
  const ob = $("#onboarding");
  ob.classList.remove("hidden");
  let passo = 0;
  const passos = [
    () => `
      <div class="ob-inner">
        <div class="ob-emoji">🌿</div>
        <h1>Bem-vinda ao seu novo jeito de comer</h1>
        <p>Aqui você não segue dieta sofrida. Você <b>organiza</b> a alimentação — e o resultado vem como consequência.</p>
        <input id="ob-nome" type="text" placeholder="Como podemos te chamar?" maxlength="20" />
        <button class="btn btn-primary btn-block" id="ob-next">Começar →</button>
        <div class="ob-dots"><i class="on"></i><i></i><i></i></div>
      </div>`,
    () => `
      <div class="ob-inner">
        <div class="ob-emoji">🗺️</div>
        <h1>Como funciona</h1>
        <div class="ob-steps">
          <div class="ob-step"><div class="n">1</div><div><b>Escolha as receitas</b><span>Monte sua semana no Planner em 5 minutos</span></div></div>
          <div class="ob-step"><div class="n">2</div><div><b>Lista de compras pronta</b><span>O app gera sozinho — só ir ao mercado</span></div></div>
          <div class="ob-step"><div class="n">3</div><div><b>Cozinhe 1x, coma a semana toda</b><span>Marmitas e bases que congelam</span></div></div>
        </div>
        <button class="btn btn-primary btn-block" id="ob-next">Entendi →</button>
        <div class="ob-dots"><i></i><i class="on"></i><i></i></div>
      </div>`,
    () => `
      <div class="ob-inner">
        <div class="ob-emoji">🎉</div>
        <h1>Seu primeiro passo é hoje</h1>
        <p>Separamos <b>3 receitas fáceis</b> para você fazer ainda hoje e sentir na prática. Depois explore os <b>10 bônus</b> inclusos no seu acesso.</p>
        <button class="btn btn-primary btn-block" id="ob-next">Ver minhas receitas 🍳</button>
        <div class="ob-dots"><i></i><i></i><i class="on"></i></div>
      </div>`,
  ];
  const renderOb = () => {
    ob.innerHTML = passos[passo]();
    $("#ob-next").addEventListener("click", () => {
      if (passo === 0) {
        const nome = $("#ob-nome").value.trim();
        if (nome) store.set("nome", nome.split(" ")[0]);
      }
      passo++;
      if (passo >= passos.length) {
        store.set("onboarded", true);
        ob.classList.add("hidden");
        navigate("home");
        render();
      } else renderOb();
    });
  };
  renderOb();
}

// ---------- init ----------
if (!store.get("onboarded", false)) onboarding();
render();
