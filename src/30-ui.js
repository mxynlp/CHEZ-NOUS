
/* ---------- 6. Composants : feuilles modales, toasts, routeur ---------- */
const ACT = {};                        // actions déclenchées par data-act
const F = {};                          // état du formulaire ouvert dans la feuille
const val = id => { const n = document.getElementById(id); return n ? n.value : ''; };
function resetF(o) { Object.keys(F).forEach(k => delete F[k]); Object.assign(F, o || {}); }

let SH = null, SHT = 0, CONF = null;
function focusKeep(fn) {
  const ae = document.activeElement, id = ae && ae.id, s = ae && ae.selectionStart, e2 = ae && ae.selectionEnd;
  fn();
  if (id) { const n = document.getElementById(id); if (n && n !== document.activeElement) { try { n.focus({ preventScroll: true }); n.setSelectionRange(s, e2); } catch (x) { /* champ sans sélection */ } } }
}
function openSheet(render, opts = {}) {
  clearTimeout(SHT);
  const root = $('#sheetRoot');
  SH = { render, live: !!opts.live };
  root.innerHTML = `<div class="backdrop" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"><i></i></div><div class="sheet-body" id="sheetBody">${render()}</div></div>`;
  root.classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show')));
  if (opts.focus) setTimeout(() => { const n = document.getElementById(opts.focus); if (n) n.focus(); }, 340);
}
function refreshSheet() {
  if (!SH || !SH.live) return; const b = $('#sheetBody'); if (!b) return;
  const st = b.scrollTop; focusKeep(() => { b.innerHTML = SH.render(); }); b.scrollTop = st;
}
function closeSheet(instant) {
  const root = $('#sheetRoot'); SH = null; root.classList.remove('show'); clearTimeout(SHT);
  SHT = setTimeout(() => { root.classList.remove('open'); root.innerHTML = ''; }, instant ? 0 : 320);
}
ACT['sheet-close'] = () => closeSheet();
function confirmSheet(o) {
  CONF = o.onOk; resetF();
  openSheet(() => `<div class="st">${esc(o.title)}</div><p class="ss" style="margin-top:6px;font-size:15px">${esc(o.text || '')}</p><div class="btns two"><button class="btn btn-s" data-act="sheet-close">Annuler</button><button class="btn ${o.danger ? 'btn-d' : 'btn-p'}" data-act="conf-ok">${esc(o.ok || 'Confirmer')}</button></div>`);
}
ACT['conf-ok'] = () => { const f = CONF; CONF = null; closeSheet(); if (f) f(); };

function toast(msg, kind, ms) {
  const r = $('#toastRoot'); const t = document.createElement('div');
  t.className = 'toast' + (kind === 'err' ? ' err' : '');
  t.innerHTML = (kind === 'err' ? '' : '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>') + `<span>${esc(msg)}</span>`;
  r.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms || 2200);
}

/* petits constructeurs de formulaire */
const lbl = t => `<div class="lbl">${t}</div>`;
const chipsH = (key, opts, v) => `<div class="chips">${opts.map(o => `<button type="button" class="chip${String(o.id) === String(v) ? ' on' : ''}" data-pick="${key}" data-val="${esc(o.id)}">${o.i ? `<span>${esc(o.i)}</span>` : ''}${esc(o.l)}</button>`).join('')}</div>`;
const segH = (key, opts, v) => `<div class="seg">${opts.map(o => `<button type="button" class="${String(o.id) === String(v) ? 'on' : ''}" data-pick="${key}" data-val="${esc(o.id)}">${o.i || ''}${esc(o.l)}</button>`).join('')}</div>`;
const swH = (key, label, on) => `<button type="button" class="swr" data-toggle="${key}"><span>${label}</span><i class="sw${on ? ' on' : ''}"></i></button>`;
const whoOpts = (both) => { const o = [{ id: A.me, l: 'Moi' }, { id: otherP(A.me), l: NAMES[otherP(A.me)] }]; if (both) o.push({ id: 'both', l: 'Nous deux' }); return o; };
const emptyH = (icon, title, text, btn) => `<div class="empty"><div class="eic">${ico(icon, 30)}</div><b>${esc(title)}</b>${esc(text)}${btn || ''}</div>`;

/* en-tête commun (titre large, profil, synchro) */
function hdr(title, sub, o = {}) {
  return `<div class="hdr${o.back ? ' hback' : ''}"><div class="hrow">${o.back ? `<button class="ib flat" data-act="${o.back}" aria-label="Retour">${ico('chevL', 24)}</button>` : ''}<div class="title">${esc(title)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${o.right || ''}${o.back ? '' : `<button class="ib sm" data-act="search-open" aria-label="Rechercher (Ctrl K)">${ico('search', 20)}</button>`}<button class="me-btn" data-act="profile" aria-label="Profil et réglages">${av(A.me, 36)}<i class="sd${A.sync === 'live' ? '' : ' off'}"></i></button></div>${o.extra || ''}</div>`;
}
const navRow = (prev, next, label, sub) => `<div class="navrow"><button class="ib" aria-label="Précédent" data-act="${prev}">${ico('chevL')}</button><div class="navt"><b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div><button class="ib" aria-label="Suivant" data-act="${next}">${ico('chevR')}</button></div>`;

/* barre d'onglets */
const TABS = [{ id: 'home', l: 'Accueil', i: 'home' }, { id: 'plan', l: 'Planning', i: 'cal' }, { id: 'meal', l: 'Repas', i: 'meal' }, { id: 'bud', l: 'Budget', i: 'wallet' }];
let tabHtml = '';
function renderTabs() {
  const h = `<div class="brand">${ico('home', 26)}Chez nous</div>` + TABS.map(x => `<button class="tab${A.tab === x.id ? ' on' : ''}" role="tab" aria-selected="${A.tab === x.id}" data-act="tab" data-t="${x.id}"><span class="tic">${ico(x.i, 24)}</span><span>${x.l}</span></button>`).join('');
  if (h !== tabHtml) { tabHtml = h; $('#tabbar').innerHTML = h; }
}
ACT.tab = d => { if (A.tab === d.t) { $('#view').scrollTo({ top: 0, behavior: 'smooth' }); return; } A.tab = d.t; A.anim = 'a-fade'; A.resetScroll = true; lsSet('cn-tab', d.t); schedule(); };

/* bouton d'ajout rapide selon l'onglet */
function fabInfo() {
  if (A.tab === 'plan') return 'Nouvel événement';
  if (A.tab === 'meal') return A.meal.sub === 'week' ? 'Planifier un repas' : A.meal.sub === 'recipes' ? 'Nouveau plat' : '';
  if (A.tab === 'bud') return { over: 'Nouvelle dépense', tx: 'Nouvelle dépense', inc: 'Nouveau revenu', goals: 'Nouvel objectif' }[A.bud.sub] || '';
  return '';
}
function updateFab() {
  const f = $('#fab'), l = fabInfo(); f.classList.toggle('hide', !l); f.setAttribute('aria-label', l || 'Ajouter');
  if (!f.firstChild) f.innerHTML = ico('plus', 28, 2.2);
}
ACT.fab = () => {
  if (A.tab === 'plan') return openEvent({ date: A.plan.level === 'day' ? A.plan.date : today() });
  if (A.tab === 'meal') { if (A.meal.sub === 'week') return openMealNext(); if (A.meal.sub === 'recipes') return openRecipe(''); }
  if (A.tab === 'bud') { const s = A.bud.sub; if (s === 'inc') return openIncome(''); if (s === 'goals') return openGoal(''); return openExpense(''); }
};

/* rendu principal */
function renderSkel() {
  $('#view').innerHTML = `<div class="page"><div class="hdr"><div class="title">Chez nous</div></div><div class="content"><div class="sk" style="height:150px;margin-top:14px"></div><div class="sk" style="height:110px;margin-top:14px"></div><div class="sk" style="height:130px;margin-top:14px"></div></div></div>`;
  $('#fab').classList.add('hide');
}
function setView(html) {
  const el = $('#view'); const st = A.resetScroll ? 0 : el.scrollTop;
  focusKeep(() => { el.innerHTML = html; });
  el.scrollTop = st;
  if (A.anim) { const c = el.querySelector('.content'); if (c) c.classList.add(A.anim); A.anim = null; }
  A.resetScroll = false; if (window.__hdrUpd) window.__hdrUpd();
}
(function () { const v = document.getElementById('view'); if (!v) return; let c = false; window.__hdrUpd = () => { const h = v.querySelector('.hdr'); if (!h) return; const t = v.scrollTop; if (!c && t > 56) c = true; else if (c && t < 8) c = false; h.classList.toggle('compact', c); }; v.addEventListener('scroll', window.__hdrUpd, { passive: true }); })();
function render() {
  if (!A.ready) { renderSkel(); return; }
  if (!A.me) { renderGate(); return; }
  $('#gate').classList.remove('on');
  renderTabs();
  try { if (typeof ensureMonth === 'function') ensureMonth(); } catch (e) { console.error(e); }
  const V ={ home: vHome, plan: vPlan, meal: vMeal, bud: vBud };
  let html;
  try { html = V[A.tab](); } catch (e) { console.error(e); html = `<div class="page">${hdr('Oups', '')}<div class="content"><div class="note"><div class="grow"><b>Un affichage a échoué</b>Recharge la page. (${esc(e.message)})</div></div></div></div>`; }
  setView(html); updateFab(); refreshSheet(); if (typeof renderSelBar === 'function') renderSelBar();
}

/* ---------- 12. Événements globaux ---------- */
document.addEventListener('click', e => {
  const pk = e.target.closest('[data-pick]');
  if (pk) { const k = pk.dataset.pick, v = pk.dataset.val; F[k] = v; $$('[data-pick="' + k + '"]').forEach(x => x.classList.toggle('on', x.dataset.val === v)); if (F._onpick) F._onpick(k, v); return; }
  const tg = e.target.closest('[data-toggle]');
  if (tg) { const k = tg.dataset.toggle; F[k] = !F[k]; const s = tg.querySelector('.sw'); if (s) s.classList.toggle('on', !!F[k]); if (F._ontoggle) F._ontoggle(k, F[k]); return; }
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) ACT[a.dataset.act](a.dataset, a, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && SH) closeSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Enter' && e.target && e.target.id === 'shop-new') { e.preventDefault(); ACT['shop-add'](); }
  if (e.key === 'Enter' && e.target && e.target.id === 'ex-amt') { e.preventDefault(); const b = $('[data-act="exp-save"]'); if (b) b.click(); }
});
document.addEventListener('input', e => {
  const id = e.target && e.target.id;
  if (id === 'tx-q') { A.bud.f.q = e.target.value; const l = document.getElementById('tx-list'); if (l && typeof txListHtml === 'function') l.innerHTML = txListHtml(); else schedule(); }
  else if (id === 'st-amt') { if (typeof updSettle === 'function') updSettle(); }
    else if (id === 'ex-pct' || id === 'fx-pct') updatePct(id);
  else if (id === 'ex-amt' || id === 'fx-amount') { const p = id === 'ex-amt' ? 'ex-pct' : 'fx-pct'; if (document.getElementById(p)) updatePct(p); }
});
function updatePct(id) {
  if (id === 'ex-pct' && typeof updOwe === 'function') updOwe();
  const amt = id === 'ex-pct' ? (num(val('ex-amt')) || 0) : (num(val('fx-amount')) || 0); const p = num(val(id)) || 0;
  const n = document.getElementById(id + '-t'); if (n) n.textContent = `${NAMES.maxym} ${p} % (${fmt(amt * p / 100)}) · ${NAMES.sasha} ${100 - p} % (${fmt(amt * (100 - p) / 100)})`;
}

/* gestes : balayage horizontal pour changer de semaine / mois / jour */
let tx0 = null;
const swipeOK = t => !t.closest('input,textarea,select,.chips.scroll,.bars');
document.addEventListener('touchstart', e => { const v = e.target.closest('#view'); if (!v || !swipeOK(e.target) || SH || (typeof SEL !== 'undefined' && SEL.on)) { tx0 = null; return; } tx0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.addEventListener('touchend', e => {
  if (!tx0) return; const t = e.changedTouches[0], dx = t.clientX - tx0.x, dy = t.clientY - tx0.y; tx0 = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
  const n = dx < 0 ? 'next' : 'prev';
  if (A.tab === 'plan') ACT['plan-' + n]();
  else if (A.tab === 'meal' && A.meal.sub !== 'recipes') ACT['meal-' + n]();
  else if (A.tab === 'bud' && ['over', 'tx', 'inc'].includes(A.bud.sub)) ACT['bud-' + n]();
}, { passive: true });
/* fermer une feuille en la tirant vers le bas (téléphone) */
let dragY = null, dragEl = null, dragDy = 0;
document.addEventListener('touchstart', e => { const g = e.target.closest('.grab'); if (!g || window.matchMedia('(min-width:760px)').matches) return; dragEl = g.parentElement; dragY = e.touches[0].clientY; dragDy = 0; dragEl.classList.add('drag'); }, { passive: true });
document.addEventListener('touchmove', e => { if (dragY == null) return; dragDy = Math.max(0, e.touches[0].clientY - dragY); dragEl.style.transform = `translateY(${dragDy}px)`; }, { passive: true });
document.addEventListener('touchend', () => { if (dragY == null) return; dragEl.classList.remove('drag'); dragEl.style.transform = ''; const close = dragDy > 90; dragY = null; dragEl = null; if (close) closeSheet(); }, { passive: true });
/* glisser-déposer (ordinateur) : plat -> repas, repas -> repas */
document.addEventListener('dragstart', e => { const s = e.target.closest && e.target.closest('[data-drag]'); if (!s) return; e.dataTransfer.setData('text/plain', s.dataset.drag); e.dataTransfer.effectAllowed = 'copy'; });
document.addEventListener('dragover', e => { const t = e.target.closest && e.target.closest('[data-drop]'); if (!t) return; e.preventDefault(); $$('.dragover').forEach(x => { if (x !== t) x.classList.remove('dragover'); }); t.classList.add('dragover'); });
document.addEventListener('dragleave', e => { const t = e.target.closest && e.target.closest('[data-drop]'); if (t && !t.contains(e.relatedTarget)) t.classList.remove('dragover'); });
document.addEventListener('drop', e => {
  const t = e.target.closest && e.target.closest('[data-drop]'); if (!t) return; e.preventDefault(); $$('.dragover').forEach(x => x.classList.remove('dragover'));
  const [d, k] = t.dataset.drop.split('|'); dropMeal(e.dataTransfer.getData('text/plain'), d, k);
});
