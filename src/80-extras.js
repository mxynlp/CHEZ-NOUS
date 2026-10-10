
/* ---------- 14. Extras : annuler, modèles, tâches, résumé, créneaux libres, repas, budget, tickets ---------- */
const RC = {};   // tickets de caisse : rempli par la version autonome (Supabase Storage). Vide dans l'artifact.

/* --- Annuler --- */
function offerUndo(fn, msg) {
  const r = $('#toastRoot'), t = document.createElement('div'); t.className = 'toast undo';
  t.innerHTML = `<span>${esc(msg || 'Modifié')}</span><button type="button" class="tundo">Annuler</button>`;
  let done = false; const rm = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
  t.querySelector('button').onclick = async () => { if (done) return; done = true; rm(); await act(fn, 'Rétabli'); };
  r.appendChild(t); setTimeout(rm, 7000);
}
const snapPresence = days => days.map(x => [x, D.presence[x] ? clean(D.presence[x]) : null]);
const restorePresence = snap => async () => { for (const [x, p] of snap) { if (p) await put('presence', x, p); else await del('presence', x, true); } };

/* --- Modèles de semaine --- */
const tplFromWeek = w => { const days = {}; for (let i = 0; i < 7; i++) { const d = addDays(w, i); days[i] = {}; PIDS.forEach(p => { days[i][p] = {}; SLOTS.forEach(s => { days[i][p][s.k] = slotPlace(p, d, s.k) || ''; }); }); } return days; };
const tplList = () => Object.entries(D.templates).map(([id, t]) => ({ id, ...t })).sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr'));
async function applyTpl(id, days) {
  const t = D.templates[id]; if (!t || !days.length) return;
  const snap = snapPresence(days);
  const ok = await act(async () => {
    for (let i = 0; i < days.length; i += 6) await Promise.all(days.slice(i, i + 6).map(day => { const src = (t.days || {})[wdi(day)]; if (!src) return null; const upd = { date: day }; PIDS.forEach(p => { upd[p] = Object.assign({}, src[p] || {}); }); return patch('presence', day, upd); }));
  });
  if (ok) offerUndo(restorePresence(snap), '« ' + t.name + ' » appliqué à ' + days.length + ' jour' + (days.length > 1 ? 's' : ''));
}
ACT['tpl-open'] = () => {
  resetF({});
  openSheet(() => {
    const list = tplList();
    return `<div class="st">Modèles de semaine</div><div class="ss">Enregistre une semaine type (école, télétravail…), puis applique-la en un tap.</div>
    <div style="margin-top:10px">${list.length ? list.map(t => `<div class="li"><span class="ic sm">${ico('repeat', 20)}</span><span class="grow"><div class="t">${esc(t.name)}</div></span><button class="btn btn-s btn-sm" data-act="tpl-apply-week" data-id="${esc(t.id)}">Cette semaine</button><button class="ib flat" data-act="tpl-del" data-id="${esc(t.id)}" aria-label="Supprimer">${ico('trash', 20)}</button></div>`).join('') : `<p class="mut sm">Aucun modèle pour l’instant.</p>`}</div>
    ${lbl('Enregistrer la semaine affichée')}<div class="addrow"><input class="inp" id="tpl-name" maxlength="40" placeholder="Ex. Semaine école" autocomplete="off"><button class="btn btn-p" data-act="tpl-save">Enregistrer</button></div>
    <p class="mut sm" style="margin-top:12px">Pour l’appliquer à plusieurs semaines : bouton ✓ du planning, sélectionne les jours, puis choisis le modèle.</p>`;
  }, { live: true });
};
ACT['tpl-save'] = async () => {
  const name = val('tpl-name').trim(); if (!name) return toast('Donne un nom au modèle', 'err');
  await act(() => put('templates', uid(), { name, days: tplFromWeek(monday(A.plan.date)), ts: Date.now() }), 'Modèle enregistré');
};
ACT['tpl-del'] = d => { const prev = D.templates[d.id]; act(() => del('templates', d.id, true), 'Modèle supprimé').then(() => { if (prev) offerUndo(() => put('templates', d.id, prev), 'Modèle supprimé'); }); };
ACT['tpl-apply-week'] = d => { closeSheet(); const w = monday(A.plan.date); applyTpl(d.id, [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i))); };
ACT['tpl-apply-sel'] = d => { const days = selDays().filter(x => !(F.noWE && wdi(x) >= 5)); closeSheet(); applyTpl(d.id, days).then(() => { selReset(); schedule(); }); };
const tplChips = () => { const l = tplList(); return l.length ? `${lbl('Ou appliquer un modèle')}<div class="chips scroll">${l.map(t => `<button type="button" class="chip" data-act="tpl-apply-sel" data-id="${esc(t.id)}">${esc(t.name)}</button>`).join('')}</div>` : ''; };

/* --- Tâches du foyer --- */
const CH_EVERY = [{ id: '1', l: 'Chaque jour' }, { id: '3', l: 'Tous les 3 jours' }, { id: '7', l: 'Chaque semaine' }, { id: '14', l: '2 semaines' }, { id: '30', l: 'Chaque mois' }];
const CH_ICONS = ['✨', '🗑️', '🧹', '🧺', '🚿', '🍽️', '🪴', '🛒', '🐾', '🪟', '🛏️', '🔧', '🧽', '🚗'];
const CH_SUGG = [['🗑️', 'Sortir les poubelles', 3], ['🧹', 'Passer l’aspirateur', 7], ['🧺', 'Faire la lessive', 7], ['🚿', 'Nettoyer la salle de bain', 14], ['🍽️', 'Vider le lave-vaisselle', 2], ['🛏️', 'Changer les draps', 14]];
const chWho = c => c.who === 'rotate' ? (c.turn || PIDS[0]) : (c.who || PIDS[0]);
const chDue = c => (c.last && c.last.date) ? addDays(c.last.date, c.every || 7) : (c.start || today());
const chRel = due => { const n = diffDays(today(), due); return n < 0 ? 'en retard de ' + (-n) + ' j' : n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : 'dans ' + n + ' j'; };
const chList = () => Object.entries(D.chores).map(([id, c]) => ({ id, ...c, due: chDue(c), to: chWho(c) })).sort((a, b) => a.due.localeCompare(b.due));
function choresCard() {
  const all = chList(), t = today(), soon = all.filter(c => diffDays(t, c.due) <= 2);
  const row = c => `<div class="li"><button class="chk${diffDays(t, c.due) < 0 ? ' late' : ''}" data-act="chore-done" data-id="${esc(c.id)}" aria-label="Fait : ${esc(c.title)}">${ico('check', 18, 3)}</button><span class="grow"><div class="t">${esc(c.icon || '✨')} ${esc(c.title)}</div><div class="s" style="${diffDays(t, c.due) < 0 ? 'color:var(--warn)' : ''}">${esc(chRel(c.due))}</div></span>${av(c.to, 26)}</div>`;
  return `<div class="card"><h3>${ico('check', 18)}Tâches du foyer<span class="sp"></span><button class="lk" data-act="chores-open">${all.length ? 'Gérer' : 'Ajouter'}</button></h3>
    ${soon.length ? soon.slice(0, 5).map(row).join('') : all.length ? `<p class="mut sm">Rien d’urgent. Prochaine : ${esc(all[0].title)} ${esc(chRel(all[0].due))}.</p>` : `<p class="mut sm">Répartissez le ménage : chaque tâche passe à l’autre quand elle est faite.</p>`}</div>`;
}
ACT['chore-done'] = async d => {
  const c = D.chores[d.id]; if (!c) return; const prev = clean(c);
  const turn = c.who === 'rotate' ? otherP(c.turn || PIDS[0]) : (c.turn || '');
  const ok = await act(() => patch('chores', d.id, { last: { date: today(), by: A.me }, turn }), 'Bien joué');
  if (ok) offerUndo(() => put('chores', d.id, prev), c.title + ' : fait');
};
ACT['chores-open'] = () => {
  resetF({});
  openSheet(() => {
    const l = chList();
    return `<div class="st">Tâches du foyer</div><div class="ss">Chaque tâche revient à intervalle régulier, au tour de chacun ou toujours à la même personne.</div>
    <div style="margin-top:10px">${l.map(c => `<button class="li" data-act="chore-edit" data-id="${esc(c.id)}"><span class="ic sm">${esc(c.icon || '✨')}</span><span class="grow"><div class="t">${esc(c.title)}</div><div class="s">${esc(CH_EVERY.find(e => e.id === String(c.every))?.l || 'Tous les ' + c.every + ' j')} · ${c.who === 'rotate' ? 'tour à tour' : esc(NAMES[c.who] || '')} · ${esc(chRel(c.due))}</div></span>${av(c.to, 26)}</button>`).join('')}</div>
    <div class="btns"><button class="btn btn-p" data-act="chore-edit" data-id="">${ico('plus', 20, 2.2)}Nouvelle tâche</button></div>`;
  }, { live: true });
};
ACT['chore-edit'] = d => {
  const c = d.id ? D.chores[d.id] : null;
  resetF({ id: d.id || '', every: String(c ? c.every : 7), who: c ? c.who : 'rotate', icon: c ? c.icon || '✨' : '✨' });
  F._onpick = (k, v) => { if (k === 'icon') { const n = document.getElementById('emp-cur'); if (n) n.textContent = v; } };
  openSheet(() => `<div class="st">${c ? 'Modifier la tâche' : 'Nouvelle tâche'}</div>
    ${!c ? `<div class="chips scroll" style="margin-top:10px">${CH_SUGG.map(s => `<button type="button" class="chip" data-act="chore-sugg" data-t="${esc(s[1])}" data-i="${esc(s[0])}" data-e="${s[2]}">${s[0]} ${esc(s[1])}</button>`).join('')}</div>` : ''}
    ${lbl('Tâche')}<input class="inp" id="ch-title" maxlength="50" placeholder="Ex. Sortir les poubelles" value="${esc(c ? c.title : '')}" autocomplete="off">
    ${lbl('Icône')}${emojiPicker(F.icon, CH_ICONS)}
    ${lbl('Fréquence')}${chipsH('every', CH_EVERY, F.every).replace('class="chips"', 'class="chips scroll"')}
    ${lbl('Qui ?')}${segH('who', [{ id: 'rotate', l: 'Tour à tour' }, { id: A.me, l: 'Moi' }, { id: otherP(A.me), l: NAMES[otherP(A.me)] }], F.who)}
    <div class="btns ${c ? 'two' : ''}">${c ? `<button class="btn btn-d" data-act="chore-del" data-id="${esc(d.id)}">Supprimer</button>` : ''}<button class="btn btn-p" data-act="chore-save">Enregistrer</button></div>`, { focus: c ? '' : 'ch-title' });
};
ACT['chore-sugg'] = d => { const n = document.getElementById('ch-title'); if (n) n.value = d.t; F.icon = d.i; { const n = document.getElementById('emp-cur'); if (n) n.textContent = d.i; } F.every = d.e; $$('[data-pick="every"]').forEach(x => x.classList.toggle('on', x.dataset.val === String(d.e))); };
ACT['chore-save'] = async () => {
  const title = val('ch-title').trim(); if (!title) return toast('Donne un nom à la tâche', 'err');
  const old = F.id ? D.chores[F.id] : null, id = F.id || uid();
  const o = { title, icon: F.icon || '✨', every: parseInt(F.every, 10) || 7, who: F.who, turn: F.who === 'rotate' ? ((old && old.turn) || A.me) : '', last: old && old.last ? old.last : { date: '', by: '' }, start: old ? old.start || today() : today(), ts: Date.now() };
  closeSheet(); await act(() => put('chores', id, o), old ? 'Tâche modifiée' : 'Tâche ajoutée');
};
ACT['chore-del'] = d => { const prev = D.chores[d.id]; closeSheet(); act(() => del('chores', d.id, true), 'Tâche supprimée').then(() => { if (prev) offerUndo(() => put('chores', d.id, prev), 'Tâche supprimée'); }); };

/* --- Résumé de la semaine à venir --- */
function aheadStart() { const t = today(), late = new Date().getHours() >= 17; return (wdi(t) >= 5 || (wdi(t) === 4 && late)) ? addDays(monday(t), 7) : monday(t); }
function fixedIn(a, b) {
  const c = cfg(), out = [], list = [{ label: 'Loyer', amount: Math.max(0, c.rent.amount - c.rent.apl), day: c.rent.day }].concat(c.fixed.map(f => ({ label: f.label, amount: f.amount, day: f.day })));
  for (let d = a; d <= b; d = addDays(d, 1)) { const m = ymOf(d); list.forEach(f => { if (pd(d).getDate() === Math.min(f.day, dim(m))) out.push({ ...f, date: d }); }); }
  return out;
}
function aheadCard() {
  const w = aheadStart(), nxt = w !== monday(today()), tg = [0, 1, 2, 3, 4, 5, 6].reduce((n, i) => n + togetherCount(addDays(w, i)), 0);
  return `<button class="wehl" data-act="ahead-open">${ico('sparkle', 22)}${nxt ? 'Ta semaine à venir' : 'Résumé de la semaine'}<span class="grow"></span><small class="mut" style="font-weight:600">${tg ? tg + ' moment' + (tg > 1 ? 's' : '') + ' ensemble' : ''}</small>${ico('chevR', 20)}</button>`;
}
ACT['ahead-open'] = () => {
  resetF({});
  openSheet(() => {
    const w = aheadStart(), days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i)), end = days[6];
    const tgDays = days.map(d => ({ d, s: SLOTS.filter(s => together(d, s.k)) })).filter(x => x.s.length);
    const evs = []; days.forEach(d => eventsOn(d).forEach(e => evs.push(e)));
    const noDinner = days.filter(d => !mealOf(d, 'dinner')), planned = days.length - noDinner.length;
    const fx = fixedIn(w, end), ch = chList().filter(c => c.due <= end);
    const sec = (ic, t, body) => `<div class="card" style="margin-top:12px"><h3>${ico(ic, 18)}${t}</h3>${body}</div>`;
    return `<div class="st">Semaine du ${esc(fmtD(w, { day: 'numeric', month: 'long' }))}</div><div class="ss">Au ${esc(fmtD(end, { day: 'numeric', month: 'long' }))}</div>
    ${sec('heart', 'Moments ensemble', tgDays.length ? tgDays.map(x => `<div class="li"><span class="grow"><div class="t">${esc(dayLong(x.d))}</div><div class="s">${x.s.map(s => s.l.toLowerCase()).join(', ')}</div></span></div>`).join('') : `<p class="mut sm">Rien de prévu à la maison à deux.</p>`)}
    ${sec('cal', 'Événements', evs.length ? evs.map(e => `<div class="li"><span class="grow"><div class="t">${esc(e.title)}</div><div class="s">${esc(dayLong(e.date))}${e.time ? ' · ' + esc(e.time) : ''}</div></span>${avs(whoList(e.who || 'both'))}</div>`).join('') : `<p class="mut sm">Aucun événement.</p>`)}
    ${sec('meal', 'Repas', `<p class="sm">${planned} dîner${planned > 1 ? 's' : ''} sur 7 prévu${planned > 1 ? 's' : ''}.</p>${noDinner.length && noDinner.length < 7 ? `<p class="mut sm" style="margin-top:4px">Sans dîner : ${noDinner.map(d => DAYL[wdi(d)].toLowerCase()).join(', ')}.</p>` : ''}<div class="btns"><button class="btn btn-s" data-act="ahead-meals" data-d="${w}">Planifier les repas</button></div>`)}
    ${fx.length ? sec('wallet', 'Prélèvements', fx.map(f => `<div class="li"><span class="grow"><div class="t">${esc(f.label)}</div><div class="s">${esc(dayLong(f.date))}</div></span><span class="amount">${fmt(f.amount)}</span></div>`).join('')) : ''}
    ${ch.length ? sec('check', 'Tâches à faire', ch.map(c => `<div class="li"><span class="grow"><div class="t">${esc(c.icon || '✨')} ${esc(c.title)}</div><div class="s">${esc(chRel(c.due))}</div></span>${av(c.to, 26)}</div>`).join('')) : ''}
    <div class="btns"><button class="btn btn-s" data-act="free-open">Trouver un créneau à deux</button></div>`;
  }, { live: true });
};
ACT['ahead-meals'] = d => { closeSheet(); A.tab = 'meal'; A.meal.sub = 'week'; A.meal.level = 'week'; A.meal.week = d.d; A.anim = 'a-zin'; A.resetScroll = true; schedule(); };

/* --- Créneaux libres à deux --- */
const evSlot = e => { if (!e.time) return SLOTS.map(s => s.k); const h = parseInt(e.time.slice(0, 2), 10); return [h < 12 ? SLOTS[0].k : h < 18 ? SLOTS[1].k : SLOTS[2].k]; };
function slotFree(p, d, k) {
  const pl = slotPlace(p, d, k); if (['office', 'remote', 'away', 'trip'].includes(pl)) return false;
  return !eventsOn(d).some(e => whoList(e.who || 'both').includes(p) && evSlot(e).includes(k));
}
ACT['free-open'] = () => {
  resetF({});
  openSheet(() => {
    const t = today(), out = [];
    for (let i = 0; i < 21 && out.length < 8; i++) {
      const d = addDays(t, i), we = wdi(d) >= 5;
      SLOTS.forEach(s => { if (d === t && s.k === SLOTS[0].k) return; if (!we && s.k !== SLOTS[2].k) return; if (PIDS.every(p => slotFree(p, d, s.k))) out.push({ d, s }); });
    }
    return `<div class="st">Créneaux libres à deux</div><div class="ss">Soirs en semaine et week-ends où ni l’un ni l’autre n’êtes pris (travail, déplacement, événement).</div>
    <div style="margin-top:10px">${out.length ? out.slice(0, 8).map(x => `<button class="li" data-act="ev-new-d" data-d="${x.d}"><span class="ic sm">${ico('heart', 20)}</span><span class="grow"><div class="t">${esc(dayLong(x.d))}</div><div class="s">${esc(x.s.l)}${together(x.d, x.s.k) ? ' · déjà ensemble à la maison' : ''}</div></span>${ico('chevR', 18)}</button>`).join('') : `<p class="mut sm">Pas de créneau libre commun dans les 3 prochaines semaines.</p>`}</div>
    <p class="mut sm" style="margin-top:10px">Touche un créneau pour y créer un événement.</p>`;
  }, { live: true });
};

/* --- Repas : restes, idée selon les achats, articles habituels --- */
function boughtSet() {
  const w = A.meal.week, chk = (D.shopchecks[w] && D.shopchecks[w].checked) || {}, s = new Set();
  groceryItems(w).forEach(i => { if (chk[i.key]) s.add(norm(i.name)); });
  Object.values(D.shopitems).forEach(x => { if (x.week === w && x.done) s.add(norm(x.name)); });
  return s;
}
ACT['ml-stock'] = () => {
  const have = boughtSet(); if (!have.size) return toast('Coche d’abord des articles dans la liste de courses', 'err');
  const recent = new Set(); for (let i = -10; i <= 0; i++) { const m = D.meals[addDays(today(), i)]; if (m) MK.forEach(k => { if (m[k]) { if (m[k].recipeId) recent.add(m[k].recipeId); } }); }
  const sc = recList().map(r => { const ing = r.ingredients || [], hit = ing.filter(x => have.has(norm(x.n))).length; return { r, hit, f: ing.length ? hit / ing.length : 0 }; }).filter(x => x.hit > 0 && x.r.id !== F._idea);
  if (!sc.length) return toast('Aucun plat ne correspond à ce que vous avez acheté', 'err');
  sc.sort((a, b) => (b.f - a.f) || (recent.has(a.r.id) - recent.has(b.r.id)) || (b.hit - a.hit));
  const pick = sc[Math.floor(Math.random() * Math.min(3, sc.length))].r;
  F._idea = pick.id; F.recipeId = pick.id; const n = document.getElementById('ml-name'); if (n) n.value = pick.name; toast('Avec vos achats : ' + pick.name);
};
ACT['ml-leftover'] = async () => {
  const name = val('ml-name').trim(); if (!name) return toast('Choisis d’abord le plat', 'err');
  const { d, k } = F, nd = k === 'dinner' ? addDays(d, 1) : d, nk = k === 'dinner' ? 'lunch' : 'dinner';
  if (mealOf(nd, nk)) return toast('Ce repas est déjà prévu', 'err');
  const base = name.replace(/^Restes\s*:\s*/i, '');
  await act(() => patch('meals', nd, { date: nd, [nk]: { name: 'Restes : ' + base, recipeId: '', who: F.who, where: 'home', note: '', leftover: true } }), 'Restes prévus ' + (k === 'dinner' ? 'demain midi' : 'ce soir'));
};
function freqChips() {
  const w = A.meal.week, cur = new Set(Object.values(D.shopitems).filter(x => x.week === w && !x.done).map(x => norm(x.name))), cnt = {};
  Object.values(D.shopitems).forEach(x => { if (x.name) { const k = norm(x.name); (cnt[k] || (cnt[k] = { n: x.name, c: 0, x })).c++; } });
  const top = Object.entries(cnt).filter(([k]) => !cur.has(k)).sort((a, b) => b[1].c - a[1].c).slice(0, 8).map(([, v]) => v);
  return top.length ? `<div class="chips scroll" style="margin-top:10px">${top.map(v => `<button type="button" class="chip" data-act="shop-quick" data-n="${esc(v.n)}" data-a="${esc(v.x.aisle || '')}">+ ${esc(v.n)}</button>`).join('')}</div>` : '';
}
ACT['shop-quick'] = d => act(() => put('shopitems', uid(), { week: A.meal.week, name: d.n, qty: null, unit: '', aisle: d.a || guessAisle(d.n), done: false, by: A.me, ts: Date.now() }));

/* --- Budget : plafonds, avancé par chacun, tickets --- */
function budgetAlert(cat, m) {
  const tg = (cfg().targets || {})[cat]; if (!(tg > 0)) return;
  const spent = monthExp(m).filter(e => isShared(e) && e.cat === cat).reduce((s, e) => s + e.amount, 0), r = spent / tg, c = catById(cat);
  if (r >= 1) toast(`${c.label} : budget dépassé (${fmt(spent)} sur ${fmt(tg)})`, 'err', 4200);
  else if (r >= 0.8) toast(`${c.label} : ${Math.round(r * 100)} % du budget du mois`, null, 3600);
}
function paidCard(m) {
  const ex = monthExp(m).filter(e => isShared(e) && e.kind !== 'settle'), by = { maxym: 0, sasha: 0 }, n = { maxym: 0, sasha: 0 };
  ex.forEach(e => { if (by[e.paidBy] != null) { by[e.paidBy] += e.amount; n[e.paidBy]++; } });
  const tot = by.maxym + by.sasha; if (!(tot > 0)) return '';
  return `<div class="card"><h3>${ico('swap', 18)}Qui a avancé quoi</h3>${PIDS.map(p => `<div class="li" style="flex-wrap:wrap">${av(p, 28)}<span class="grow"><div class="t">${esc(NAMES[p])}</div><div class="s">${n[p]} dépense${n[p] > 1 ? 's' : ''}</div></span><b class="amount">${fmt(by[p])}</b><div class="pg" style="flex-basis:100%;margin-top:8px"><i style="width:${Math.round(by[p] / tot * 100)}%;background:var(--${p})"></i></div></div>`).join('')}</div>`;
}
async function compressImg(file, max = 1100, q = .62) {
  const bm = await createImageBitmap(file), k = Math.min(1, max / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
  c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('image')), 'image/jpeg', q));
}
const rcptField = ex => !RC.upload ? '' : `${lbl('Ticket de caisse')}<input type="file" id="rc-file" accept="image/*" hidden><div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-s btn-sm" id="rc-btn" data-act="rcpt-pick">${ico('camera', 18)}${ex && ex.receipt ? 'Remplacer la photo' : 'Joindre une photo'}</button>${ex && ex.receipt ? `<button type="button" class="btn btn-g btn-sm" data-act="rcpt-view" data-id="${esc(ex.id)}">Voir le ticket</button>` : ''}</div>`;
ACT['rcpt-pick'] = () => { const f = document.getElementById('rc-file'); if (f) f.click(); };
document.addEventListener('change', async e => {
  if (!e.target || e.target.id !== 'rc-file' || !e.target.files[0]) return;
  const b = document.getElementById('rc-btn');
  try { if (b) b.textContent = 'Compression…'; F.rcptBlob = await compressImg(e.target.files[0]); if (b) b.textContent = 'Photo prête (' + Math.round(F.rcptBlob.size / 1024) + ' Ko)'; }
  catch (er) { F.rcptBlob = null; if (b) b.textContent = 'Photo illisible'; }
});
ACT['rcpt-view'] = async d => {
  const u = RC.url ? await RC.url(d.id) : null; if (!u) return toast('Ticket introuvable', 'err');
  resetF({}); openSheet(() => `<div class="st">Ticket de caisse</div><img src="${esc(u)}" alt="Ticket" style="width:100%;border-radius:16px;margin-top:12px">`);
};

/* --- Raccourcis (appui long sur l'icône) --- */
function runShortcut() {
  let a = ''; try { a = new URLSearchParams(location.search).get('a') || ''; history.replaceState(null, '', location.pathname); } catch (e) { /* */ }
  if (!a || !A.me) return;
  if (a === 'exp') openExpense('');
  else if (a === 'shop') { A.tab = 'meal'; A.meal.sub = 'shop'; schedule(); }
  else if (a === 'plan') { A.tab = 'plan'; schedule(); }
  else if (a === 'meal') { A.tab = 'meal'; A.meal.sub = 'week'; schedule(); }
}

/* --- Recherche rapide / palette de commandes (Ctrl-K ou ⌘-K, touche « / ») --- */
const SRCH_ACT = [
  ['exp-new', 'Nouvelle dépense', 'wallet', 'ajouter depense argent'], ['ev-new', 'Nouvel événement', 'cal', 'ajouter evenement rendez-vous'],
  ['meal-new', 'Planifier un repas', 'meal', 'repas manger diner midi'], ['chore-new', 'Nouvelle tâche ménagère', 'check', 'tache menage poubelles'],
  ['free-open', 'Créneaux libres à deux', 'heart', 'sortie libre ensemble'], ['ahead-open', 'Résumé de la semaine', 'sparkle', 'semaine apercu'],
  ['tab:home', 'Aller à l’accueil', 'home', 'accueil'], ['tab:plan', 'Aller au planning', 'cal', 'planning calendrier'],
  ['tab:meal', 'Aller aux repas', 'meal', 'repas plats courses'], ['tab:bud', 'Aller au budget', 'wallet', 'budget depenses'],
  ['sel-start', 'Sélectionner plusieurs jours', 'check', 'selection jours semaines']
];
ACT['search-open'] = () => {
  resetF({});
  openSheet(() => `<div class="srch"><input class="inp" id="q-in" placeholder="Rechercher ou aller à…" autocomplete="off" enterkeyhint="search"></div><div id="q-res"></div>`, { focus: 'q-in' });
  renderSearch('');
};
function renderSearch(q) {
  const box = document.getElementById('q-res'); if (!box) return;
  const n = norm(q.trim()), has = (...t) => !n || t.some(x => norm(String(x || '')).includes(n));
  const row = (ic, t, s, data) => `<button class="srow" data-act="srch-go" ${data}><span class="ic sm">${ic}</span><span class="grow"><div class="t" style="font-weight:600">${esc(t)}</div>${s ? `<div class="s sm mut">${esc(s)}</div>` : ''}</span></button>`;
  const grp = (t, rows) => rows.length ? `<div class="sgrp">${t}</div>${rows.join('')}` : '';
  const acts = SRCH_ACT.filter(a => has(a[1], a[3])).slice(0, n ? 5 : 7).map(a => row(ico(a[2], 20), a[1], '', `data-k="act" data-id="${a[0]}"`));
  let out = grp(n ? 'Actions' : 'Actions rapides', acts);
  if (n) {
    const ev = Object.entries(D.events).filter(([, e]) => has(e.title, e.note)).sort((a, b) => b[1].date.localeCompare(a[1].date)).slice(0, 5).map(([id, e]) => row('🗓️', e.title, dayLong(e.date) + (e.time ? ' · ' + e.time : ''), `data-k="ev" data-id="${esc(id)}"`));
    const rc = recList().filter(r => has(r.name, (r.ingredients || []).map(i => i.n).join(' '))).slice(0, 5).map(r => row(r.fav ? '♥' : '🍽️', r.name, r.time ? r.time + ' min' : '', `data-k="rc" data-id="${esc(r.id)}"`));
    const ml = []; Object.entries(D.meals).sort((a, b) => b[0].localeCompare(a[0])).forEach(([d, m]) => MK.forEach(k => { if (m[k] && has(m[k].name) && ml.length < 5) ml.push(row('🥘', m[k].name, mkLbl(k) + ' · ' + dayLong(d), `data-k="ml" data-id="${d}" data-s="${k}"`)); }));
    const ex = allExp().filter(e => e.kind !== 'settle' && has(e.note, catById(e.cat).label, String(e.amount).replace('.', ','))).slice(0, 6).map(e => row(catById(e.cat).icon, (e.note || catById(e.cat).label) + ' · ' + fmt(e.amount), dayLong(e.date), `data-k="ex" data-id="${esc(e.id)}"`));
    const ch = chList().filter(c => has(c.title)).slice(0, 4).map(c => row(c.icon || '✨', c.title, chRel(c.due), `data-k="ch" data-id="${esc(c.id)}"`));
    out += grp('Événements', ev) + grp('Plats', rc) + grp('Repas prévus', ml) + grp('Dépenses', ex) + grp('Tâches', ch);
    if (out.indexOf('srow') < 0) out = `<p class="mut" style="text-align:center;margin-top:28px">Rien trouvé pour « ${esc(q)} ».</p>`;
  }
  box.innerHTML = out;
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'q-in') renderSearch(e.target.value); });
ACT['srch-go'] = d => {
  closeSheet();
  setTimeout(() => {
    const k = d.k, id = d.id;
    if (k === 'act') {
      if (id.startsWith('tab:')) { A.tab = id.slice(4); A.anim = 'a-fade'; A.resetScroll = true; schedule(); }
      else if (id === 'chore-new') ACT['chore-edit']({ id: '' });
      else if (id === 'sel-start') { A.tab = 'plan'; if (A.plan.level === 'day') A.plan.level = 'week'; SEL.on = true; SEL.set.clear(); schedule(); }
      else ACT[id] && ACT[id]({});
    } else if (k === 'ev') openEvent({ id });
    else if (k === 'rc') openRecipe(id);
    else if (k === 'ml') { A.tab = 'meal'; A.meal.sub = 'week'; A.meal.week = monday(id); schedule(); openMeal(id, d.s); }
    else if (k === 'ex') openExpense(id);
    else if (k === 'ch') ACT['chore-edit']({ id });
  }, 80);
};
document.addEventListener('keydown', e => {
  const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !SH)) { if (!A.ready || !A.me) return; e.preventDefault(); ACT['search-open'](); }
});
