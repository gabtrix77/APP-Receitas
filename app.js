/* ============================================================
   RECEITAS PRA SECAR — app v3 "premium"
   SPA vanilla · hash-router · estado local (localStorage)
   ============================================================ */

// ---------- estado ----------
const store = {
  get(k, fb) { try { const v = localStorage.getItem("rps_" + k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem("rps_" + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem("rps_" + k); } catch {} },
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

const OB_OBJETIVOS = [
  { id:"comer",     emoji:"🥗", nome:"Comer melhor" },
  { id:"organizar", emoji:"📅", nome:"Organizar minha alimentação" },
  { id:"descobrir", emoji:"✨", nome:"Descobrir receitas saudáveis" },
  { id:"peso",      emoji:"⚖️", nome:"Perder peso de forma equilibrada" },
];
const OB_REFEICOES = [
  { id:"cafe",   emoji:"☕", nome:"Café da manhã" },
  { id:"almoco", emoji:"🍽️", nome:"Almoço" },
  { id:"lanches",emoji:"🥪", nome:"Lanche" },
  { id:"jantar", emoji:"🌙", nome:"Jantar" },
  { id:"todas",  emoji:"🍳", nome:"Todas" },
];
const OB_TEMPOS = [
  { id:10, emoji:"⚡", nome:"Até 10 minutos" },
  { id:20, emoji:"⏱️", nome:"10–20 minutos" },
  { id:40, emoji:"🍲", nome:"20–40 minutos" },
  { id:0,  emoji:"🤷‍♀️", nome:"Não tenho preferência" },
];

const CONQUISTAS = [
  { id:"primeira", emoji:"🏆", nome:"Primeira receita preparada", check: s => s.preparadas.length >= 1 },
  { id:"maos",     emoji:"👩‍🍳", nome:"3 receitas preparadas",      check: s => s.preparadas.length >= 3 },
  { id:"semana",   emoji:"📅", nome:"Primeira semana planejada",  check: s => s.slotsPlanner >= 5 },
  { id:"fav5",     emoji:"❤️", nome:"5 receitas favoritas",       check: s => s.favs.length >= 5 },
  { id:"lista",    emoji:"🛒", nome:"Primeira lista gerada",      check: s => s.listaGerada },
  { id:"agua",     emoji:"💧", nome:"Meta de água batida",        check: s => s.aguaMeta },
];

const POPULARES = ["a1","sb4","c2","lc2","x21","sb1","b1","l1"];

const DISCLAIMER = "As informações nutricionais apresentadas são estimativas e podem variar conforme ingredientes, marcas e quantidades utilizadas. Este conteúdo possui caráter educativo e não substitui orientação individualizada de profissional habilitado.";

let plannerDia = "seg";
let filtro = { cat:"todas", busca:"", tempo:0, kcal:0, prot:0, airfryer:false, dif:"" };
let diarioOff = 0;
let deferredInstall = null;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $("#view");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

function todasReceitas() { return RECEITAS.concat(BONUS_RECEITAS); }
function receita(id) { return todasReceitas().find(r => r.id === id); }
function catInfo(id) { return CATEGORIAS.find(c => c.id === id); }
function gradClass(r) { return r.cat ? "g-" + r.cat : "g-bonus"; }
function temImagem(r) { return typeof IMAGENS !== "undefined" && IMAGENS.has(r.id); }
function imgTag(r) {
  return temImagem(r) ? `<img src="img/${r.id}.webp" alt="${esc(r.nome)}" loading="lazy" decoding="async" onerror="this.remove()">` : "";
}

// favoritos / recentes / preparadas
const getFavs = () => store.get("favs", []);
const isFav = id => getFavs().includes(id);
function toggleFav(id) {
  let favs = getFavs();
  const on = favs.includes(id);
  favs = on ? favs.filter(f => f !== id) : [...favs, id];
  store.set("favs", favs);
  if (!on) checarConquistas();
  return !on;
}
function registrarRecente(id) {
  let rec = store.get("recentes", []).filter(x => x !== id);
  rec.unshift(id);
  store.set("recentes", rec.slice(0, 10));
}
const getPreparadas = () => store.get("preparadas", []);
const isPreparada = id => getPreparadas().some(p => p.id === id);

// tags automáticas (só quando verdadeiras)
function tagsAuto(r) {
  const t = [];
  if (r.tempo <= 15) t.push({ txt:"Até 15 min", cls:"t-time" });
  if (r.prot >= 20) t.push({ txt:"Rica em proteína", cls:"t-prot" });
  if ((r.tags || []).includes("airfryer")) t.push({ txt:"Airfryer", cls:"" });
  if (r.ing && r.ing.length <= 5) t.push({ txt:"Poucos ingredientes", cls:"" });
  if ((r.tags || []).includes("congelavel")) t.push({ txt:"Congelável", cls:"" });
  if ((r.tags || []).includes("semacucar")) t.push({ txt:"Sem açúcar", cls:"" });
  if ((r.tags || []).includes("semgluten")) t.push({ txt:"Sem glúten", cls:"" });
  if ((r.tags || []).includes("vegetariana")) t.push({ txt:"Vegetariana", cls:"" });
  const c = catInfo(r.cat);
  if (c) t.push({ txt:c.nome, cls:"" });
  return t.slice(0, 5);
}

// categorias de mercado p/ lista de compras
const MERCADO = [
  { id:"horti", nome:"Hortifruti", emoji:"🥬" },
  { id:"prot",  nome:"Proteínas", emoji:"🥩" },
  { id:"lact",  nome:"Laticínios", emoji:"🥛" },
  { id:"graos", nome:"Grãos e cereais", emoji:"🌾" },
  { id:"temp",  nome:"Temperos e condimentos", emoji:"🧂" },
  { id:"outros",nome:"Outros", emoji:"📦" },
];
const KW = {
  horti: ["banana","maçã","maca","laranja","limão","limao","tomate","cebola","alho","couve","abobrinha","cenoura","batata","abóbora","abobora","brócolis","brocolis","espinafre","rúcula","rucula","agrião","agriao","alface","manga","abacaxi","morango","melancia","maracujá","maracuja","abacate","beterraba","pepino","berinjela","pimentão","pimentao","gengibre","hortelã","hortela","salsinha","cebolinha","coentro","manjericão","manjericao","folhas","legumes","fruta","vagem","couve-flor","salsão","salsao","uva","mamão","mamao","açaí","acai","banana-da-terra","pupunha","milho verde"],
  prot:  ["frango","carne","patinho","músculo","musculo","peixe","salmão","salmao","tilápia","tilapia","atum","ovo","ovos","camarão","camarao","clara","lombo","almôndega","gema"],
  lact:  ["leite","iogurte","queijo","requeijão","requeijao","ricota","cottage","manteiga","parmesão","parmesao","muçarela","mucarela","coalho"],
  graos: ["arroz","aveia","quinoa","feijão","feijao","lentilha","grão-de-bico","grao-de-bico","farinha","tapioca","goma","macarrão","macarrao","pão","pao","flocão","flocao","granola","polenta","chia","linhaça","linhaca","gelatina","cacau","chocolate","castanha","nozes","amêndoa","amendoa","amendoim","gergelim","semente","coco ralado","leite em pó","leite em po"],
  temp:  ["sal","pimenta","orégano","oregano","canela","páprica","paprica","cominho","cúrcuma","curcuma","azeite","vinagre","shoyu","mostarda","mel","alecrim","tomilho","louro","noz-moscada","curry","za'atar","ervas","adoçante","adocante","fermento","óleo","oleo","essência","essencia","caldo","água","agua","hibisco"],
};
function catMercado(texto) {
  const t = texto.toLowerCase();
  for (const [cat, kws] of Object.entries(KW)) {
    if (kws.some(k => t.includes(k))) return cat;
  }
  return "outros";
}

// ---------- feedback ----------
let toastT;
function toast(msg, tipo) {
  const t = $("#toast");
  t.className = "toast" + (tipo === "ach" ? " t-ach" : "");
  t.innerHTML = msg;
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.add("hidden"), tipo === "ach" ? 3400 : 2200);
}

function checarConquistas() {
  const desbloq = store.get("ach", {});
  const planner = store.get("planner", {});
  let slots = 0;
  DIAS.forEach(d => REFEICOES.forEach(m => { if (planner[d.id]?.[m.id]) slots++; }));
  const diario = store.get("diario", {});
  const aguaMeta = Object.values(diario).some(d => (d.agua || 0) >= 8);
  const s = { preparadas: getPreparadas(), favs: getFavs(), slotsPlanner: slots, listaGerada: store.get("listaGerada", false), aguaMeta };
  for (const c of CONQUISTAS) {
    if (!desbloq[c.id] && c.check(s)) {
      desbloq[c.id] = true;
      store.set("ach", desbloq);
      setTimeout(() => toast(`${c.emoji} Conquista desbloqueada: <b>${c.nome}</b>`, "ach"), 350);
    }
  }
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
  const tabMap = { receita:"receitas", guia:"bonus", favoritos:"home", tabela:"home", diario:"home", perfil:"home" };
  const active = tabMap[route] || route;
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === active));
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}
$$(".tab").forEach(t => t.addEventListener("click", () => navigate(t.dataset.route)));

const backBtn = (to) => `<button class="iconbtn" aria-label="Voltar" onclick="${to ? `navigate('${to}')` : "history.back()"}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>`;

// ---------- componentes ----------
function thumb(r) {
  return `<div class="thumb ${gradClass(r)}" aria-hidden="true">${r.emoji}${imgTag(r)}</div>`;
}
function rcardHTML(r, onclick) {
  const fav = isFav(r.id);
  return `<div class="rcard" role="button" tabindex="0" aria-label="${esc(r.nome)}" onclick="${onclick || `navigate('receita/${r.id}')`}" onkeydown="if(event.key==='Enter')this.click()">
    ${thumb(r)}
    <div class="r-info">
      <div class="r-name">${esc(r.nome)}</div>
      <div class="r-meta"><i>⏱ ${r.tempo} min</i>${r.kcal ? `<i>🔥 ${r.kcal} kcal</i>` : ""}${r.prot >= 20 ? `<i>💪 ${r.prot}g prot.</i>` : ""}</div>
    </div>
    ${fav ? `<span class="r-fav" aria-hidden="true">❤️</span>` : ""}
    <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
  </div>`;
}
function hcardHTML(r) {
  return `<div class="hcard" role="button" tabindex="0" aria-label="${esc(r.nome)}" onclick="navigate('receita/${r.id}')" onkeydown="if(event.key==='Enter')this.click()">
    <div class="h-img ${gradClass(r)}" aria-hidden="true">${r.emoji}${imgTag(r)}</div>
    <div class="h-body">
      <div class="h-name">${esc(r.nome)}</div>
      <div class="h-meta"><span>⏱ ${r.tempo}min</span>${r.kcal ? `<span>🔥 ${r.kcal}</span>` : ""}</div>
    </div>
  </div>`;
}
function ringHTML(pct, size = 74, stroke = 7) {
  const rr = (size - stroke) / 2, c = 2 * Math.PI * rr;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size/2}" cy="${size/2}" r="${rr}" fill="none" stroke="var(--paper-2)" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${rr}" fill="none" stroke="var(--green-bright)" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"
      style="transition: stroke-dashoffset .7s var(--ease)"/>
  </svg>`;
}

// ---------- HOME (dashboard) ----------
routes.home = () => {
  const nome = store.get("nome", "");
  const prefs = store.get("prefs", {});
  const h = new Date().getHours();
  const sauda = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const seed = new Date().getDate() + new Date().getMonth() * 31;

  // receita do dia (respeita preferências quando existirem)
  let pool = RECEITAS;
  if (prefs.refeicao && prefs.refeicao !== "todas") {
    const p = RECEITAS.filter(r => r.cat === prefs.refeicao || (prefs.refeicao === "almoco" && r.cat === "almoco"));
    if (p.length) pool = p;
  }
  const doDia = pool[seed % pool.length];

  // escolhidas para você
  let escolhidas = RECEITAS.filter(r => {
    const okTempo = !prefs.tempo || r.tempo <= prefs.tempo + 10;
    const okRef = !prefs.refeicao || prefs.refeicao === "todas" || r.cat === prefs.refeicao;
    return okTempo && okRef;
  });
  if (escolhidas.length < 4) escolhidas = escolhidas.concat(RECEITAS.filter(r => !escolhidas.includes(r)));
  escolhidas = escolhidas.slice(seed % 3, (seed % 3) + 8);

  const rapidas = todasReceitas().filter(r => r.tempo <= 15 && r.dif !== "Método").slice(0, 8);
  const populares = POPULARES.map(receita).filter(Boolean);
  const recentes = store.get("recentes", []).map(receita).filter(Boolean).slice(0, 6);
  const favs = getFavs().map(receita).filter(Boolean);

  // água de hoje
  const hoje = new Date().toISOString().slice(0, 10);
  const agua = (store.get("diario", {})[hoje]?.agua || 0);
  const aguaPct = Math.min(1, (agua * 250) / 2000);

  // stats
  const planner = store.get("planner", {});
  let slots = 0;
  DIAS.forEach(d => REFEICOES.forEach(m => { if (planner[d.id]?.[m.id]) slots++; }));
  const nPrep = getPreparadas().length;

  const iosStandalone = window.navigator.standalone === true;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
  const mostrarInstall = !isStandalone && !store.get("instHide", false) && (deferredInstall || /iphone|ipad/i.test(navigator.userAgent));

  view.innerHTML = `
    <header class="apphead">
      <div>
        <div class="eyebrow">Receitas pra secar</div>
        <div class="hello">${sauda}${nome ? ", " + esc(nome) : ""} 👋</div>
        <div class="sub">O que vamos preparar hoje?</div>
      </div>
      <button class="avatar-btn" aria-label="Meu perfil" onclick="navigate('perfil')">${nome ? esc(nome[0].toUpperCase()) : "🙂"}</button>
    </header>

    ${(nPrep || slots || favs.length) ? `
    <div class="streak-row">
      ${nPrep ? `<div class="stat-pill"><span class="sp-emoji">👩‍🍳</span>${nPrep} receita${nPrep > 1 ? "s" : ""} <small>preparada${nPrep > 1 ? "s" : ""}</small></div>` : ""}
      ${slots ? `<div class="stat-pill"><span class="sp-emoji">📅</span>${slots} refeiç${slots > 1 ? "ões" : "ão"} <small>planejada${slots > 1 ? "s" : ""}</small></div>` : ""}
      ${favs.length ? `<div class="stat-pill"><span class="sp-emoji">❤️</span>${favs.length} favorita${favs.length > 1 ? "s" : ""}</div>` : ""}
    </div>` : ""}

    <div class="hero-card" style="margin-top:${(nPrep || slots || favs.length) ? "10px" : "0"}">
      <div class="eyebrow">Receita do dia</div>
      <h2>${esc(doDia.nome)}</h2>
      <p>⏱ ${doDia.tempo} min · 🔥 ${doDia.kcal} kcal · ${doDia.dif}</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('receita/${doDia.id}')">Ver receita →</button>
    </div>

    <div class="section">
      <div class="card mini-water">
        <div class="water-ring" style="width:54px;height:54px">${ringHTML(aguaPct, 54, 6)}
          <div class="wr-txt">${Math.round(aguaPct * 100)}%</div>
        </div>
        <div class="mw-info"><b>💧 ${agua * 250} ml de água</b><span>Meta do dia: 2.000 ml</span></div>
        <button class="btn btn-soft btn-sm" id="agua-add">+250 ml</button>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Escolhidas para você</h2><button class="link" onclick="navigate('receitas')">Ver todas</button></div>
      <div class="hscroll">${escolhidas.map(hcardHTML).join("")}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Prontas em poucos minutos</h2></div>
      <div class="hscroll">${rapidas.map(hcardHTML).join("")}</div>
    </div>

    ${favs.length ? `
    <div class="section">
      <div class="section-head"><h2>Suas favoritas</h2><button class="link" onclick="navigate('favoritos')">Ver todas</button></div>
      <div class="hscroll">${favs.slice(0, 8).map(hcardHTML).join("")}</div>
    </div>` : ""}

    ${recentes.length ? `
    <div class="section">
      <div class="section-head"><h2>Vistas recentemente</h2></div>
      <div class="hscroll">${recentes.map(hcardHTML).join("")}</div>
    </div>` : ""}

    <div class="section">
      <div class="section-head"><h2>Mais populares</h2></div>
      <div class="hscroll">${populares.map(hcardHTML).join("")}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Explore por categoria</h2></div>
      <div class="cat-grid">
        ${CATEGORIAS.map(c => {
          const n = RECEITAS.filter(r => r.cat === c.id).length;
          return `<div class="cat-pill" role="button" tabindex="0" onclick="filtro.cat='${c.id}';filtro.busca='';navigate('receitas')" onkeydown="if(event.key==='Enter')this.click()">
            <div class="cp-ico g-${c.id}">${c.emoji}</div>
            <div>${c.nome}<small>${n} receitas</small></div>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Ferramentas</h2></div>
      <div class="tiles">
        <div class="tile" role="button" tabindex="0" onclick="navigate('planner')"><div class="t-ico t-green">📅</div><b>Planner Semanal</b><span>${slots ? slots + " de 28 refeições" : "Monte sua semana"}</span></div>
        <div class="tile" role="button" tabindex="0" onclick="navigate('lista')"><div class="t-ico t-terra">🛒</div><b>Lista de Compras</b><span>Gerada do planner</span></div>
        <div class="tile" role="button" tabindex="0" onclick="navigate('diario')"><div class="t-ico t-gold">📔</div><b>Diário Alimentar</b><span>Registre seu dia</span></div>
        <div class="tile" role="button" tabindex="0" onclick="navigate('tabela')"><div class="t-ico t-green">📊</div><b>Tabela Nutricional</b><span>${ALIMENTOS.length} alimentos</span></div>
      </div>
    </div>

    ${mostrarInstall ? `
    <div class="install-banner">
      <div class="ib-ico">📲</div>
      <div class="ib-body"><b>Instale o app no seu celular</b><span>Acesso em 1 toque, direto da tela inicial</span></div>
      <button class="btn btn-green btn-sm" id="inst-go">Instalar</button>
      <button class="ib-x" id="inst-x" aria-label="Dispensar">✕</button>
    </div>` : ""}`;

  $("#agua-add")?.addEventListener("click", () => {
    const diario = store.get("diario", {});
    diario[hoje] = { ...(diario[hoje] || {}), agua: (diario[hoje]?.agua || 0) + 1 };
    store.set("diario", diario);
    checarConquistas();
    routes.home();
    toast("💧 +250 ml registrados");
  });
  $("#inst-x")?.addEventListener("click", () => { store.set("instHide", true); routes.home(); });
  $("#inst-go")?.addEventListener("click", async () => {
    if (deferredInstall) {
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      routes.home();
    } else {
      openSheet(`
        <h2>📲 Adicionar à tela inicial</h2>
        <div class="article">
          <div class="card"><h3>No iPhone (Safari)</h3>
            <ul><li>Toque no botão <b>Compartilhar</b> (quadrado com seta ↑)</li><li>Escolha <b>"Adicionar à Tela de Início"</b></li><li>Toque em <b>Adicionar</b> — pronto!</li></ul></div>
          <div class="card"><h3>No Android (Chrome)</h3>
            <ul><li>Toque no menu <b>⋮</b> no canto superior</li><li>Escolha <b>"Adicionar à tela inicial"</b> ou <b>"Instalar app"</b></li></ul></div>
        </div>`);
    }
  });
};

// ---------- RECEITAS ----------
function filtrosAtivos() { return (filtro.tempo || filtro.kcal || filtro.prot || filtro.airfryer || filtro.dif) ? true : false; }

routes.receitas = () => {
  const { cat, busca } = filtro;
  let base = busca ? todasReceitas().filter(r => r.dif !== "Método") : RECEITAS;
  let lista = base;
  if (!busca && cat !== "todas") lista = lista.filter(r => r.cat === cat);
  if (busca) {
    const q = busca.toLowerCase();
    lista = lista.filter(r => r.nome.toLowerCase().includes(q) || (r.ing || []).some(i => i.toLowerCase().includes(q)));
  }
  if (filtro.tempo) lista = lista.filter(r => r.tempo <= filtro.tempo);
  if (filtro.kcal) lista = lista.filter(r => r.kcal && r.kcal <= filtro.kcal);
  if (filtro.prot) lista = lista.filter(r => r.prot >= filtro.prot);
  if (filtro.airfryer) lista = lista.filter(r => (r.tags || []).includes("airfryer"));
  if (filtro.dif) lista = lista.filter(r => r.dif === filtro.dif);

  view.innerHTML = `
    <header class="pagehead"><h1>Receitas</h1></header>
    <div class="search-wrap">
      <div class="s-box">
        <svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="busca" type="search" placeholder="Busque por nome ou ingrediente…" value="${esc(busca)}" aria-label="Buscar receitas" />
      </div>
      <button class="iconbtn filter-btn" id="abrir-filtros" aria-label="Filtros" style="width:46px;height:46px">
        <svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        ${filtrosAtivos() ? '<span class="f-dot"></span>' : ""}
      </button>
    </div>
    ${!busca ? `<div class="chips">
      <button class="chip ${cat === "todas" ? "active" : ""}" data-cat="todas">Todas</button>
      ${CATEGORIAS.map(c => `<button class="chip ${cat === c.id ? "active" : ""}" data-cat="${c.id}">${c.emoji} ${c.nome}</button>`).join("")}
    </div>` : `<p style="font-size:12.5px;color:var(--ink-soft);font-weight:700;margin-bottom:10px">${lista.length} resultado${lista.length !== 1 ? "s" : ""} para "${esc(busca)}" (inclui bônus)</p>`}
    <div class="recipe-row" style="margin-top:6px">
      ${lista.length ? lista.map(r => rcardHTML(r)).join("") :
        `<div class="empty"><div class="e-emoji">🔍</div><b>Nenhuma receita encontrada</b><p>Tente outra palavra ou limpe os filtros.</p>
         ${filtrosAtivos() ? '<button class="btn btn-soft btn-sm" id="limpar-f">Limpar filtros</button>' : ""}</div>`}
    </div>`;

  $("#busca").addEventListener("input", e => {
    filtro.busca = e.target.value;
    routes.receitas();
    const inp = $("#busca"); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  });
  $$(".chip[data-cat]").forEach(c => c.addEventListener("click", () => { filtro.cat = c.dataset.cat; routes.receitas(); }));
  $("#limpar-f")?.addEventListener("click", () => { filtro = { ...filtro, tempo:0, kcal:0, prot:0, airfryer:false, dif:"" }; routes.receitas(); });
  $("#abrir-filtros").addEventListener("click", abrirFiltros);
};

function abrirFiltros() {
  const opt = (grupo, val, label) => {
    const on = filtro[grupo] === val;
    return `<button class="chip ${on ? "active" : ""}" data-fg="${grupo}" data-fv="${val}">${label}</button>`;
  };
  openSheet(`
    <h2>Filtrar receitas</h2>
    <div class="f-group"><b>Tempo de preparo</b><div class="f-opts">${opt("tempo",0,"Qualquer")}${opt("tempo",15,"Até 15 min")}${opt("tempo",30,"Até 30 min")}</div></div>
    <div class="f-group"><b>Calorias (por porção)</b><div class="f-opts">${opt("kcal",0,"Qualquer")}${opt("kcal",150,"Até 150")}${opt("kcal",300,"Até 300")}</div></div>
    <div class="f-group"><b>Proteína</b><div class="f-opts">${opt("prot",0,"Qualquer")}${opt("prot",15,"15g ou mais")}${opt("prot",25,"25g ou mais")}</div></div>
    <div class="f-group"><b>Dificuldade</b><div class="f-opts">${opt("dif","","Qualquer")}${opt("dif","Fácil","Fácil")}${opt("dif","Médio","Médio")}</div></div>
    <div class="f-group"><b>Equipamento</b><div class="f-opts"><button class="chip ${filtro.airfryer ? "active" : ""}" data-fg="airfryer" data-fv="1">🌀 Airfryer</button></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:6px">
      <button class="btn btn-ghost" id="f-limpar">Limpar</button>
      <button class="btn btn-green" id="f-aplicar">Aplicar</button>
    </div>`);
  $$("#sheet [data-fg]").forEach(b => b.addEventListener("click", () => {
    const g = b.dataset.fg;
    if (g === "airfryer") filtro.airfryer = !filtro.airfryer;
    else {
      let v = b.dataset.fv;
      filtro[g] = (g === "dif") ? v : +v;
    }
    abrirFiltros();
  }));
  $("#f-limpar").addEventListener("click", () => { filtro = { ...filtro, tempo:0, kcal:0, prot:0, airfryer:false, dif:"" }; closeSheet(); routes.receitas(); });
  $("#f-aplicar").addEventListener("click", () => { closeSheet(); routes.receitas(); });
}

// ---------- DETALHE ----------
routes.receita = (id) => {
  const r = receita(id);
  if (!r) return navigate("receitas");
  registrarRecente(id);
  const c = catInfo(r.cat);
  const isGuiaMetodo = r.dif === "Método";
  const fav = isFav(id);
  const prep = isPreparada(id);
  const totalMacro = (r.prot || 0) + (r.carb || 0) + (r.gord || 0);
  const pctOf = v => totalMacro ? Math.max(6, Math.round((v / totalMacro) * 100)) : 0;

  view.innerHTML = `
    <header class="pagehead">
      ${backBtn()}
      <h1 style="font-size:17px">${c ? c.nome : "Bônus"}</h1>
      <button class="iconbtn" id="share-btn" aria-label="Compartilhar receita"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4"/></svg></button>
      <button class="iconbtn ${fav ? "fav-on" : ""}" id="fav-btn" aria-label="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}" aria-pressed="${fav}">
        <svg viewBox="0 0 24 24"><path d="M12 20.5C7 16.7 3.5 13.4 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.8-3.5 7.1-8.5 10.9Z"/></svg>
      </button>
    </header>

    <div class="detail-hero ${gradClass(r)}">${r.emoji}${imgTag(r)}</div>
    <h1 class="detail-title display">${esc(r.nome)}</h1>
    <div class="tag-row">${tagsAuto(r).map(t => `<span class="tagchip ${t.cls}">${t.txt}</span>`).join("")}</div>
    <div class="meta-chips">
      <span class="mchip">⏱ <b>${r.tempo} min</b></span>
      <span class="mchip">🍽 <b>${r.porcoes} ${r.porcoes > 1 ? "porções" : "porção"}</b></span>
      <span class="mchip">📶 <b>${r.dif}</b></span>
    </div>

    ${r.kcal ? `
    <div class="macro-panel">
      <div class="macro-kcal"><b>${r.kcal}</b><span>kcal por porção</span></div>
      <div class="macro-bars">
        <div class="mbar"><div class="m-top"><span>Proteína</span><b>${r.prot}g</b></div><div class="m-track"><i class="m-fill mf-prot" data-w="${pctOf(r.prot)}"></i></div></div>
        <div class="mbar"><div class="m-top"><span>Carboidr.</span><b>${r.carb}g</b></div><div class="m-track"><i class="m-fill mf-carb" data-w="${pctOf(r.carb)}"></i></div></div>
        <div class="mbar"><div class="m-top"><span>Gordura</span><b>${r.gord}g</b></div><div class="m-track"><i class="m-fill mf-gord" data-w="${pctOf(r.gord)}"></i></div></div>
      </div>
      <div class="macro-note">Valores estimados por porção.</div>
    </div>` : ""}

    <h2 class="block-title">🧺 Ingredientes</h2>
    <div class="card" style="padding:7px">
      <div class="ing-list">
        ${r.ing.map((i, idx) => `<div class="ing" role="checkbox" aria-checked="false" tabindex="0" data-i="${idx}"><span class="box"></span><span>${esc(i)}</span></div>`).join("")}
      </div>
    </div>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" id="add-lista">🛒 Adicionar ingredientes à lista de compras</button>

    <h2 class="block-title">👩‍🍳 Modo de preparo</h2>
    <div class="steps">${r.passos.map(p => `<div class="step"><div>${esc(p)}</div></div>`).join("")}</div>

    ${!isGuiaMetodo ? `
    <div class="detail-actions">
      <button class="btn btn-green" id="add-planner">📅 Pôr no planner</button>
      <button class="btn ${prep ? "btn-soft" : "btn-primary"} done-btn ${prep ? "is-done" : ""}" id="prep-btn">${prep ? "✓ Preparada!" : "🍳 Já preparei"}</button>
    </div>` : ""}
    <p class="disclaimer">${DISCLAIMER}</p>`;

  // barras de macro animadas
  requestAnimationFrame(() => $$(".m-fill").forEach(el => { el.style.width = el.dataset.w + "%"; }));

  $$(".ing").forEach(el => {
    const tgl = () => { el.classList.toggle("done"); el.setAttribute("aria-checked", el.classList.contains("done")); };
    el.addEventListener("click", tgl);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tgl(); } });
  });

  $("#fav-btn").addEventListener("click", () => {
    const on = toggleFav(id);
    const btn = $("#fav-btn");
    btn.classList.toggle("fav-on", on);
    btn.setAttribute("aria-pressed", on);
    btn.classList.remove("heart-pop"); void btn.offsetWidth; btn.classList.add("heart-pop");
    toast(on ? "❤️ Salva nas favoritas" : "Removida das favoritas");
  });

  $("#share-btn").addEventListener("click", async () => {
    const texto = `${r.nome} — ${r.tempo} min · ${r.kcal ? r.kcal + " kcal · " : ""}${r.dif}\n\nIngredientes:\n${r.ing.map(i => "• " + i).join("\n")}`;
    if (navigator.share) {
      try { await navigator.share({ title: r.nome, text: texto }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(texto); toast("📋 Receita copiada!"); } catch { toast("Não foi possível compartilhar"); }
    }
  });

  $("#prep-btn")?.addEventListener("click", () => {
    let prep = getPreparadas();
    if (isPreparada(id)) prep = prep.filter(p => p.id !== id);
    else {
      prep.push({ id, d: new Date().toISOString().slice(0, 10) });
      toast("🎉 Boa! Receita marcada como preparada");
    }
    store.set("preparadas", prep);
    checarConquistas();
    routes.receita(id);
  });

  $("#add-lista").addEventListener("click", () => {
    const lista = store.get("lista", []);
    let add = 0;
    r.ing.forEach(i => {
      if (!lista.some(x => x.t === i)) { lista.push({ t: i, done: false, g: r.nome, c: catMercado(i) }); add++; }
    });
    store.set("lista", lista);
    toast(add ? `🛒 ${add} ingredientes na lista` : "✓ Já estavam na lista");
  });

  $("#add-planner")?.addEventListener("click", () => {
    openSheet(`
      <h2>Adicionar ao planner</h2>
      <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">Escolha o dia e a refeição:</p>
      <div class="chips" id="sh-dias" style="margin:0;padding:2px 0 10px">${DIAS.map((d, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-d="${d.id}">${d.nome}</button>`).join("")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px">
        ${REFEICOES.map(m => `<button class="btn btn-ghost btn-sm" data-m="${m.id}">${m.emoji} ${m.nome}</button>`).join("")}
      </div>`);
    let dSel = "seg";
    $$("#sh-dias .chip").forEach(ch => ch.addEventListener("click", () => {
      $$("#sh-dias .chip").forEach(x => x.classList.remove("active"));
      ch.classList.add("active"); dSel = ch.dataset.d;
    }));
    $$("#sheet [data-m]").forEach(b => b.addEventListener("click", () => {
      const planner = store.get("planner", {});
      planner[dSel] = planner[dSel] || {};
      planner[dSel][b.dataset.m] = id;
      store.set("planner", planner);
      closeSheet();
      checarConquistas();
      toast(`📅 ${DIAS.find(x => x.id === dSel).nome} · ${REFEICOES.find(x => x.id === b.dataset.m).nome} ✓`);
    }));
  });
};

// ---------- FAVORITOS ----------
routes.favoritos = () => {
  const favs = getFavs().map(receita).filter(Boolean);
  view.innerHTML = `
    <header class="pagehead">${backBtn("home")}<h1>Suas favoritas</h1></header>
    ${favs.length ? `<div class="recipe-row">${favs.map(r => rcardHTML(r)).join("")}</div>` :
      `<div class="empty"><div class="e-emoji">❤️</div><b>Seu livro de receitas favorito começa aqui</b><p>Toque no coração de uma receita para salvá-la e encontrá-la rapidinho depois.</p>
       <button class="btn btn-primary btn-sm" onclick="navigate('receitas')">Explorar receitas</button></div>`}`;
};

// ---------- PLANNER ----------
routes.planner = () => {
  const planner = store.get("planner", {});
  const dia = planner[plannerDia] || {};
  let slots = 0;
  DIAS.forEach(d => REFEICOES.forEach(m => { if (planner[d.id]?.[m.id]) slots++; }));

  view.innerHTML = `
    <header class="pagehead"><h1>Meu planejamento da semana</h1></header>
    ${slots ? `
    <div class="card week-progress">
      <div class="water-ring" style="width:46px;height:46px">${ringHTML(slots / 28, 46, 5)}<div class="wr-txt" style="font-size:10px">${slots}</div></div>
      <div class="wp-txt"><b>${slots} de 28 refeições planejadas</b><span>Semana organizada = decisões fáceis</span></div>
    </div>` : ""}
    <div class="day-picker">
      ${DIAS.map(d => {
        const has = REFEICOES.some(m => planner[d.id]?.[m.id]);
        return `<button class="daybtn ${d.id === plannerDia ? "active" : ""} ${has ? "has" : ""}" data-d="${d.id}" aria-label="${d.nome}">
          <small>${d.nome}</small><b>${d.nome[0]}</b><div class="dot"></div></button>`;
      }).join("")}
    </div>
    ${!slots ? `<div class="empty" style="padding:20px 24px 26px"><div class="e-emoji">📅</div><b>Vamos organizar sua semana?</b><p>Escolha suas receitas e deixe as refeições mais simples — a lista de compras sai sozinha.</p></div>` : ""}
    ${REFEICOES.map(m => {
      const rid = dia[m.id];
      const r = rid && receita(rid);
      return `<div class="meal-slot">
        <div class="slot-label">${m.emoji} ${m.nome}</div>
        ${r ? `<div class="slot-filled">${rcardHTML(r)}<button class="rm" data-rm="${m.id}" aria-label="Remover ${esc(r.nome)}">×</button></div>`
            : `<div class="slot-empty" role="button" tabindex="0" data-pick="${m.id}">+ Escolher receita</div>`}
      </div>`;
    }).join("")}
    <div class="divider"></div>
    <button class="btn btn-primary btn-block" onclick="navigate('lista')">🛒 Gerar lista de compras da semana</button>`;

  $$(".daybtn").forEach(b => b.addEventListener("click", () => { plannerDia = b.dataset.d; routes.planner(); }));
  $$("[data-rm]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const planner = store.get("planner", {});
    if (planner[plannerDia]) delete planner[plannerDia][b.dataset.rm];
    store.set("planner", planner);
    routes.planner();
  }));
  $$("[data-pick]").forEach(slot => {
    slot.addEventListener("click", () => abrirSeletor(slot.dataset.pick));
    slot.addEventListener("keydown", e => { if (e.key === "Enter") abrirSeletor(slot.dataset.pick); });
  });
};

function abrirSeletor(mealId) {
  const sugestao = { cafe:"cafe", almoco:"almoco", lanche:"lanches", jantar:"almoco" }[mealId];
  const renderLista = (q = "") => {
    let lista = todasReceitas().filter(r => r.dif !== "Método");
    if (q) lista = lista.filter(r => r.nome.toLowerCase().includes(q.toLowerCase()) || (r.ing || []).some(i => i.toLowerCase().includes(q.toLowerCase())));
    else lista = [...lista].sort((a, b) => (b.cat === sugestao) - (a.cat === sugestao));
    $("#sel-lista").innerHTML = lista.slice(0, 40).map(r =>
      rcardHTML(r, `selecionarReceita('${r.id}','${mealId}')`)).join("");
  };
  openSheet(`
    <h2>${REFEICOES.find(m => m.id === mealId).emoji} Escolher receita</h2>
    <div class="search-wrap">
      <div class="s-box">
        <svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="sel-busca" type="search" placeholder="Buscar por nome ou ingrediente…" />
      </div>
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
  checarConquistas();
  routes.planner();
  toast("✓ Receita adicionada ao planner");
};

// ---------- LISTA DE COMPRAS ----------
routes.lista = () => {
  const lista = store.get("lista", []);
  const total = lista.length;
  const feitos = lista.filter(i => i.done).length;
  const grupos = {};
  lista.forEach((item, idx) => {
    const c = item.c || catMercado(item.t);
    (grupos[c] = grupos[c] || []).push({ ...item, idx });
  });

  view.innerHTML = `
    <header class="pagehead"><h1>Lista de Compras</h1></header>
    ${total ? `
    <div class="card shop-progress">
      <div class="sp-head"><b>🛒 ${feitos} de ${total} itens comprados</b><span>${Math.round((feitos / total) * 100)}%</span></div>
      <div class="progress-bar"><i style="width:${(feitos / total) * 100}%"></i></div>
    </div>` : ""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px">
      <button class="btn btn-green btn-sm" id="gerar">⚡ Gerar do planner</button>
      <button class="btn btn-ghost btn-sm" id="limpar">🗑 Limpar marcados</button>
    </div>
    <div class="add-row">
      <input id="novo-item" type="text" placeholder="Adicionar item manualmente…" aria-label="Novo item" />
      <button class="btn btn-primary btn-sm" id="add-item" aria-label="Adicionar item" style="min-width:46px">+</button>
    </div>
    ${total ? MERCADO.filter(m => grupos[m.id]?.length).map(m => `
      <div class="list-group">
        <h3>${m.emoji} ${m.nome} <span class="cnt">${grupos[m.id].filter(i => !i.done).length}</span></h3>
        <div class="card" style="padding:6px">
          ${grupos[m.id].map(i => `<div class="ing ${i.done ? "done" : ""}" role="checkbox" aria-checked="${i.done}" tabindex="0" data-idx="${i.idx}"><span class="box"></span><span>${esc(i.t)}</span></div>`).join("")}
        </div>
      </div>`).join("") :
      `<div class="empty"><div class="e-emoji">🛒</div><b>Sua lista está vazia</b><p>Adicione receitas ao planner e gere sua lista automaticamente — agrupada por seção do mercado.</p>
       <button class="btn btn-primary btn-sm" onclick="navigate('planner')">Montar meu planner</button></div>`}`;

  $("#gerar").addEventListener("click", () => {
    const planner = store.get("planner", {});
    const manter = store.get("lista", []).filter(i => !i.g); // preserva itens manuais
    const vistos = new Set(manter.map(i => i.t));
    let add = 0;
    DIAS.forEach(d => REFEICOES.forEach(m => {
      const r = planner[d.id]?.[m.id] && receita(planner[d.id][m.id]);
      if (r) r.ing.forEach(i => {
        if (!vistos.has(i)) { vistos.add(i); manter.push({ t: i, done: false, g: r.nome, c: catMercado(i) }); add++; }
      });
    }));
    store.set("lista", manter);
    if (add) store.set("listaGerada", true);
    checarConquistas();
    routes.lista();
    toast(add ? `⚡ Lista gerada: ${add} itens` : "Monte seu planner primeiro 😉");
  });

  $("#limpar").addEventListener("click", () => {
    store.set("lista", store.get("lista", []).filter(i => !i.done));
    routes.lista();
  });

  const addManual = () => {
    const inp = $("#novo-item");
    if (!inp.value.trim()) return;
    const lista = store.get("lista", []);
    lista.push({ t: inp.value.trim(), done: false, g: "", c: catMercado(inp.value) });
    store.set("lista", lista);
    routes.lista();
    $("#novo-item").focus();
  };
  $("#add-item").addEventListener("click", addManual);
  $("#novo-item").addEventListener("keydown", e => { if (e.key === "Enter") addManual(); });

  $$(".ing[data-idx]").forEach(el => {
    const tgl = () => {
      const lista = store.get("lista", []);
      lista[+el.dataset.idx].done = !lista[+el.dataset.idx].done;
      store.set("lista", lista);
      routes.lista();
    };
    el.addEventListener("click", tgl);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tgl(); } });
  });
};

// ---------- DIÁRIO ----------
function hojeKey(off = 0) {
  const d = new Date(); d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}
routes.diario = () => {
  const key = hojeKey(diarioOff);
  const diario = store.get("diario", {});
  const dia = diario[key] || { agua: 0 };
  const d = new Date(); d.setDate(d.getDate() + diarioOff);
  const label = diarioOff === 0 ? "Hoje" : diarioOff === -1 ? "Ontem" :
    d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  const aguaPct = Math.min(1, ((dia.agua || 0) * 250) / 2000);

  view.innerHTML = `
    <header class="pagehead">${backBtn("home")}<h1>Diário Alimentar</h1></header>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button class="iconbtn" id="d-prev" aria-label="Dia anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <b style="font-family:var(--font-display);font-size:17px">${label}</b>
      <button class="iconbtn" id="d-next" aria-label="Próximo dia" ${diarioOff >= 0 ? "disabled style='opacity:.35'" : ""}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>

    <div class="card water-card">
      <div class="water-ring">${ringHTML(aguaPct)}<div class="wr-txt">${Math.round(aguaPct * 100)}%</div></div>
      <div class="w-info"><b>💧 ${(dia.agua || 0) * 250} ml</b><span>Meta: 2.000 ml de água</span></div>
      <div class="water-btns">
        <button class="wbtn" id="w-menos" aria-label="Remover 250 ml">−</button>
        <button class="wbtn" id="w-mais" aria-label="Adicionar 250 ml">+</button>
      </div>
    </div>
    <div style="height:16px"></div>

    ${REFEICOES.map(m => `
      <div class="card diary-meal">
        <div class="dm-head"><b>${m.emoji} ${m.nome}</b></div>
        <textarea data-meal="${m.id}" placeholder="O que você comeu?" aria-label="${m.nome}">${esc(dia[m.id] || "")}</textarea>
      </div>`).join("")}

    <div class="notice">💡 Registrar o que você come — sem julgamento — ajuda muito a manter a consistência. Leva 1 minuto.</div>`;

  const salvar = (patch) => {
    const diario = store.get("diario", {});
    diario[key] = { ...(diario[key] || { agua: 0 }), ...patch };
    store.set("diario", diario);
  };
  $("#w-mais").addEventListener("click", () => { salvar({ agua: (dia.agua || 0) + 1 }); checarConquistas(); routes.diario(); });
  $("#w-menos").addEventListener("click", () => { salvar({ agua: Math.max(0, (dia.agua || 0) - 1) }); routes.diario(); });
  $("#d-prev").addEventListener("click", () => { diarioOff--; routes.diario(); });
  $("#d-next").addEventListener("click", () => { if (diarioOff < 0) { diarioOff++; routes.diario(); } });
  $$("[data-meal]").forEach(t => t.addEventListener("input", () => salvar({ [t.dataset.meal]: t.value })));
};

// ---------- TABELA ----------
routes.tabela = () => {
  view.innerHTML = `
    <header class="pagehead">${backBtn("home")}<h1>Tabela Nutricional</h1></header>
    <div class="search-wrap">
      <div class="s-box">
        <svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="t-busca" type="search" placeholder="Buscar alimento…" aria-label="Buscar alimento" />
      </div>
    </div>
    <p style="font-size:12px;color:var(--ink-faint);margin-bottom:10px">Valores aproximados por 100 g · P = proteína, C = carboidrato, G = gordura</p>
    <div class="card" style="padding:6px;overflow-x:auto" id="t-wrap"></div>
    <p class="disclaimer">${DISCLAIMER}</p>`;
  const renderT = (q = "") => {
    let lista = ALIMENTOS;
    if (q) lista = lista.filter(a => a.n.toLowerCase().includes(q.toLowerCase()));
    const grupos = {};
    lista.forEach(a => (grupos[a.g] = grupos[a.g] || []).push(a));
    $("#t-wrap").innerHTML = lista.length ? `<table class="food-table">
      <thead><tr><th>Alimento</th><th>kcal</th><th>P</th><th>C</th><th>G</th></tr></thead>
      <tbody>${Object.entries(grupos).map(([g, items]) =>
        `<tr class="tgroup"><td colspan="5">${g}</td></tr>` +
        items.map(a => `<tr><td>${esc(a.n)}</td><td>${a.kcal}</td><td>${a.p}</td><td>${a.c}</td><td>${a.f}</td></tr>`).join("")
      ).join("")}</tbody></table>` :
      `<div class="empty"><div class="e-emoji">🔍</div><b>Alimento não encontrado</b><p>Tente buscar de outra forma.</p></div>`;
  };
  renderT();
  $("#t-busca").addEventListener("input", e => renderT(e.target.value));
};

// ---------- BÔNUS ----------
routes.bonus = (id) => {
  if (id === undefined) {
    view.innerHTML = `
      <header class="pagehead"><h1>Biblioteca de Bônus</h1></header>
      <div class="bonus-hero">
        <h2>Seus ${BONUS.length} bônus exclusivos</h2>
        <p>Tudo incluído no seu acesso — coleções extras para nunca faltar ideia na cozinha.</p>
      </div>
      <div class="bonus-grid">
        ${BONUS.map((b, i) => {
          const n = BONUS_RECEITAS.filter(r => r.bonus === b.id).length;
          return `<div class="bonus-card" role="button" tabindex="0" onclick="navigate('${b.tipo === "guia" ? "guia" : "bonus/" + b.id}')" onkeydown="if(event.key==='Enter')this.click()">
            <div class="b-num">🎁 Bônus ${String(i + 1).padStart(2, "0")}</div>
            <div class="b-emoji">${b.emoji}</div>
            <b>${esc(b.nome)}</b>
            <span>${esc(b.desc)}</span>
            <div class="b-cnt">${b.tipo === "guia" ? "Guia completo →" : n + " receitas →"}</div>
          </div>`;
        }).join("")}
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

// ---------- PERFIL ----------
routes.perfil = () => {
  const nome = store.get("nome", "");
  const prefs = store.get("prefs", {});
  const ach = store.get("ach", {});
  const obj = OB_OBJETIVOS.find(o => o.id === prefs.objetivo);
  const refP = OB_REFEICOES.find(o => o.id === prefs.refeicao);
  const tmp = OB_TEMPOS.find(o => o.id === prefs.tempo);
  const nPrep = getPreparadas().length;
  const nFav = getFavs().length;
  const planner = store.get("planner", {});
  let slots = 0;
  DIAS.forEach(d => REFEICOES.forEach(m => { if (planner[d.id]?.[m.id]) slots++; }));

  view.innerHTML = `
    <header class="pagehead">${backBtn("home")}<h1>Meu perfil</h1></header>
    <div class="profile-head">
      <div class="p-avatar">${nome ? esc(nome[0].toUpperCase()) : "🙂"}</div>
      <h2>${nome ? esc(nome) : "Olá!"}</h2>
      <span>${nPrep} preparada${nPrep === 1 ? "" : "s"} · ${nFav} favorita${nFav === 1 ? "" : "s"} · ${slots} planejada${slots === 1 ? "" : "s"}</span>
    </div>

    <div class="section" style="margin-top:4px">
      <div class="section-head"><h2>Conquistas</h2></div>
      <div class="ach-grid">
        ${CONQUISTAS.map(c => `<div class="ach ${ach[c.id] ? "on" : ""}"><div class="a-emoji">${c.emoji}</div><b>${c.nome}</b></div>`).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Minhas preferências</h2></div>
      <div class="card">
        <div class="pref-row" role="button" tabindex="0" data-pref="nome"><span class="pr-emoji">✏️</span><div class="pr-body"><b>Nome</b><span>${nome ? esc(nome) : "Não informado"}</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>
        <div class="pref-row" role="button" tabindex="0" data-pref="objetivo"><span class="pr-emoji">${obj ? obj.emoji : "🎯"}</span><div class="pr-body"><b>Objetivo</b><span>${obj ? obj.nome : "Escolher"}</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>
        <div class="pref-row" role="button" tabindex="0" data-pref="refeicao"><span class="pr-emoji">${refP ? refP.emoji : "🍽️"}</span><div class="pr-body"><b>Refeição que mais precisa de ideias</b><span>${refP ? refP.nome : "Escolher"}</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>
        <div class="pref-row" role="button" tabindex="0" data-pref="tempo"><span class="pr-emoji">${tmp ? tmp.emoji : "⏱️"}</span><div class="pr-body"><b>Tempo para cozinhar</b><span>${tmp ? tmp.nome : "Escolher"}</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Aplicativo</h2></div>
      <div class="card">
        <div class="pref-row" role="button" tabindex="0" id="p-install"><span class="pr-emoji">📲</span><div class="pr-body"><b>Adicionar à tela inicial</b><span>Use como um app de verdade</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>
        <div class="pref-row" role="button" tabindex="0" id="p-reset"><span class="pr-emoji">🗑️</span><div class="pr-body"><b>Redefinir meus dados</b><span>Apaga favoritos, planner e diário deste aparelho</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>
      </div>
    </div>
    <p class="disclaimer">${DISCLAIMER}</p>`;

  $$("[data-pref]").forEach(row => {
    const abrir = () => {
      const tipo = row.dataset.pref;
      if (tipo === "nome") {
        openSheet(`
          <h2>✏️ Seu nome</h2>
          <div class="add-row"><input id="p-nome" type="text" maxlength="20" value="${esc(nome)}" placeholder="Como podemos te chamar?" />
          <button class="btn btn-green btn-sm" id="p-nome-ok">Salvar</button></div>`);
        $("#p-nome-ok").addEventListener("click", () => {
          const v = $("#p-nome").value.trim();
          if (v) store.set("nome", v.split(" ")[0]);
          closeSheet(); routes.perfil();
        });
        return;
      }
      const opcoes = { objetivo: OB_OBJETIVOS, refeicao: OB_REFEICOES, tempo: OB_TEMPOS }[tipo];
      const titulo = { objetivo:"🎯 Qual seu principal objetivo?", refeicao:"🍽️ Qual refeição mais precisa de ideias?", tempo:"⏱️ Quanto tempo você tem para cozinhar?" }[tipo];
      openSheet(`<h2>${titulo}</h2><div class="ob-opts">${opcoes.map(o =>
        `<button class="ob-opt ${prefs[tipo] === o.id ? "sel" : ""}" data-v="${o.id}"><span class="oo-emoji">${o.emoji}</span>${o.nome}</button>`).join("")}</div>`);
      $$("#sheet [data-v]").forEach(b => b.addEventListener("click", () => {
        const prefs = store.get("prefs", {});
        prefs[tipo] = (tipo === "tempo") ? +b.dataset.v : b.dataset.v;
        store.set("prefs", prefs);
        closeSheet(); routes.perfil();
        toast("✓ Preferência atualizada");
      }));
    };
    row.addEventListener("click", abrir);
    row.addEventListener("keydown", e => { if (e.key === "Enter") abrir(); });
  });

  $("#p-install").addEventListener("click", async () => {
    if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; }
    else openSheet(`
      <h2>📲 Adicionar à tela inicial</h2>
      <div class="article">
        <div class="card"><h3>No iPhone (Safari)</h3><ul><li>Toque em <b>Compartilhar</b> (↑)</li><li>Escolha <b>"Adicionar à Tela de Início"</b></li></ul></div>
        <div class="card"><h3>No Android (Chrome)</h3><ul><li>Menu <b>⋮</b> → <b>"Instalar app"</b></li></ul></div>
      </div>`);
  });

  $("#p-reset").addEventListener("click", () => {
    openSheet(`
      <h2>🗑️ Redefinir meus dados?</h2>
      <p style="font-size:14px;color:var(--ink-soft);margin-bottom:16px">Isso apaga <b>deste aparelho</b>: favoritos, planner, lista, diário e conquistas. As receitas continuam todas disponíveis.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
        <button class="btn btn-ghost" id="rst-nao">Cancelar</button>
        <button class="btn btn-primary" id="rst-sim">Apagar tudo</button>
      </div>`);
    $("#rst-nao").addEventListener("click", closeSheet);
    $("#rst-sim").addEventListener("click", () => {
      Object.keys(localStorage).filter(k => k.startsWith("rps_")).forEach(k => localStorage.removeItem(k));
      location.hash = ""; location.reload();
    });
  });
};

// ---------- ONBOARDING ----------
function onboarding() {
  const ob = $("#onboarding");
  ob.classList.remove("hidden");
  ob.setAttribute("aria-hidden", "false");
  let passo = 0;
  const respostas = {};

  const BENEFITS = [
    ["🍳","+100 receitas"], ["📅","Planner semanal"], ["🛒","Lista automática"],
    ["📊","Info nutricional"], ["📔","Diário alimentar"], ["💧","Controle de água"],
    ["🎁","10 bônus inclusos"], ["⚙️","Guia de airfryer"],
  ];

  const telas = [
    // 0 — boas-vindas
    () => `
      <div class="ob-inner">
        <div class="ob-emoji">🎉</div>
        <div class="eyebrow">Receitas pra secar</div>
        <h1>Seu acesso está liberado!</h1>
        <p class="ob-sub">Tudo isso já é seu, para sempre:</p>
        <div class="ob-benefits">
          ${BENEFITS.map(([e, t], i) => `<div class="ob-benefit" style="animation-delay:${i * 60}ms"><span class="obe">${e}</span>${t}</div>`).join("")}
        </div>
        <button class="btn btn-primary btn-block" id="ob-next">Começar minha jornada →</button>
        ${dots(0)}
      </div>`,
    // 1 — nome
    () => `
      <div class="ob-inner">
        <div class="ob-emoji">🌿</div>
        <h1>Antes de tudo…</h1>
        <p class="ob-sub">Como podemos te chamar?</p>
        <input id="ob-nome" type="text" placeholder="Seu primeiro nome" maxlength="20" autocomplete="given-name" />
        <button class="btn btn-primary btn-block" id="ob-next">Continuar →</button>
        ${dots(1)}
      </div>`,
    // 2 — objetivo
    () => pergunta("🎯", "Qual seu principal objetivo?", "objetivo", OB_OBJETIVOS, 2),
    // 3 — refeição
    () => pergunta("🍽️", "Qual refeição você mais precisa de ideias?", "refeicao", OB_REFEICOES, 3),
    // 4 — tempo
    () => pergunta("⏱️", "Quanto tempo normalmente tem para cozinhar?", "tempo", OB_TEMPOS, 4),
    // 5 — fim
    () => {
      const nome = respostas.nome || "";
      return `
      <div class="ob-inner">
        <div class="ob-emoji">✨</div>
        <h1>Tudo pronto${nome ? ", " + esc(nome) : ""}!</h1>
        <p class="ob-sub">Personalizamos suas sugestões com base nas suas respostas. Seu primeiro passo: escolha <b>1 receita</b> para fazer hoje.</p>
        <button class="btn btn-primary btn-block" id="ob-next">Abrir meu app 🍳</button>
        ${dots(5)}
      </div>`;
    },
  ];

  function dots(on) {
    return `<div class="ob-dots">${telas.map((_, i) => `<i class="${i === on ? "on" : ""}"></i>`).join("")}</div>`;
  }
  function pergunta(emoji, titulo, campo, opcoes, idx) {
    return `
      <div class="ob-inner">
        <div class="ob-emoji">${emoji}</div>
        <h1 style="font-size:23px">${titulo}</h1>
        <div class="ob-opts" style="margin-top:18px">
          ${opcoes.map(o => `<button class="ob-opt" data-v="${o.id}"><span class="oo-emoji">${o.emoji}</span>${o.nome}</button>`).join("")}
        </div>
        ${dots(idx)}
        <button class="ob-skip" id="ob-skip">Pular</button>
      </div>`;
  }

  const avancar = () => {
    passo++;
    if (passo >= telas.length) {
      store.set("nome", respostas.nome || "");
      store.set("prefs", { objetivo: respostas.objetivo, refeicao: respostas.refeicao, tempo: respostas.tempo ?? 0 });
      store.set("onboarded", true);
      ob.classList.add("hidden");
      ob.setAttribute("aria-hidden", "true");
      navigate("home");
      render();
      return;
    }
    renderOb();
  };

  const renderOb = () => {
    ob.innerHTML = telas[passo]();
    ob.scrollTop = 0;
    $("#ob-next")?.addEventListener("click", () => {
      if (passo === 1) {
        const v = $("#ob-nome").value.trim();
        if (v) respostas.nome = v.split(" ")[0];
      }
      avancar();
    });
    $("#ob-skip")?.addEventListener("click", avancar);
    $$("#onboarding [data-v]").forEach(b => b.addEventListener("click", () => {
      b.classList.add("sel");
      const campo = passo === 2 ? "objetivo" : passo === 3 ? "refeicao" : "tempo";
      respostas[campo] = campo === "tempo" ? +b.dataset.v : b.dataset.v;
      setTimeout(avancar, 220);
    }));
    $("#ob-nome")?.focus();
  };
  renderOb();
}

// ---------- PWA install ----------
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  if ((location.hash.replace(/^#\/?/, "") || "home") === "home" && store.get("onboarded", false)) routes.home();
});

// ---------- init ----------
if (!store.get("onboarded", false)) onboarding();
render();
checarConquistas();
