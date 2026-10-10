
/* ---------- 10. Repas : grille, plats, courses partagées ---------- */
const REC_EMO = { pates: '🍝', viande: '🍗', poisson: '🐟', veggie: '🥦', rapide: '⚡', soupe: '🥣', autre: '🍽️' };
const WHERE_S = { home: 'Maison', out: 'Dehors', resto: 'Restaurant', delivery: 'Livraison', family: 'Proches' };
const MK = ['lunch', 'dinner'];
const mkLbl = k => k === 'lunch' ? 'Midi' : 'Soir';
const mealSeg = () => `<div class="seg">${[['week', 'Semaine'], ['recipes', 'Plats'], ['shop', 'Courses']].map(([k, l]) => `<button class="${A.meal.sub === k ? 'on' : ''}" data-act="meal-sub" data-v="${k}">${k === 'shop' ? ico('cart', 16) : ''}${l}</button>`).join('')}</div>`;
const recList = () => Object.entries(D.recipes).map(([id, r]) => ({ id, ...r })).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'fr'));
const weekLabel = w => { const e = addDays(w, 6); return `${pd(w).getDate()}${ymOf(w) !== ymOf(e) ? ' ' + fmtD(w, { month: 'short' }) : ''} – ${fmtD(e, { day: 'numeric', month: 'long' })}`; };
const mealToday = `<button class="chip" data-act="meal-today">Aujourd’hui</button>`;
function vMeal() { const M = A.meal; return M.sub === 'recipes' ? mealRecipes() : M.sub === 'shop' ? mealShop() : (M.level === 'day' ? mealDay() : mealWeek()); }

/* --- grille de la semaine --- */
function mealCell(d, k) {
  const m = mealOf(d, k), drop = `data-drop="${d}|${k}"`;
  if (!m || !m.name) return `<button class="mcell emp" ${drop} data-act="meal-edit" data-d="${d}" data-k="${k}" aria-label="Planifier ${k === 'lunch' ? 'le midi' : 'le soir'}, ${esc(dayLong(d))}">${ico('plus', 20)}</button>`;
  return `<button class="mcell" draggable="true" ${drop} data-drag="${esc(JSON.stringify({ t: 'm', d, k }))}" data-act="meal-edit" data-d="${d}" data-k="${k}"><span class="nm">${esc(m.name)}</span><span class="mt">${whoList(m.who || 'both').map(p => av(p, 15)).join('')}<span>${esc(WHERE_S[m.where] || '')}</span></span></button>`;
}
function mealWeek() {
  const w = A.meal.week, t = today(), days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i));
  let n = 0; days.forEach(d => MK.forEach(k => { if (mealOf(d, k) && mealOf(d, k).name) n++; }));
  const grid = `<div class="mg"><span></span><div class="mgh">Midi</div><div class="mgh">Soir</div>${days.map((d, i) => `<button class="md${d === t ? ' today' : ''}${i >= 5 ? ' we' : ''}" data-act="meal-day" data-d="${d}" aria-label="Voir ${esc(dayLong(d))}">${DAYS[i]}<b>${pd(d).getDate()}</b></button>${MK.map(k => mealCell(d, k)).join('')}`).join('')}</div>`;
  const recs = recList();
  const panel = `<aside class="rpanel card" style="margin-top:0"><h3>${ico('heart', 16)}Mes plats</h3><p class="mut sm">Glisse un plat sur un repas.</p>${recs.length ? recs.map(r => `<div class="rcard" draggable="true" data-drag="${esc(JSON.stringify({ t: 'r', id: r.id }))}"><span>${REC_EMO[r.cat] || '🍽️'}</span><b>${esc(r.name)}</b></div>`).join('') : '<p class="mut sm" style="margin-top:10px">Ajoute des plats dans l’onglet Plats.</p>'}</aside>`;
  return `<div class="page wide">${hdr('Repas', 'Semaine ' + isoWeek(w), { right: mealToday, extra: mealSeg() + navRow('meal-prev', 'meal-next', weekLabel(w)) })}<div class="content">
    <div class="mealwrap"><div><div class="card" style="padding:12px 10px">${grid}</div>
      <div class="row" style="margin-top:14px;flex-wrap:wrap"><span class="pill ok">${n} repas sur 14 planifiés</span><span class="grow"></span><button class="btn btn-s btn-sm" data-act="meal-copy-week">${ico('copy', 18)}Copier la semaine précédente</button></div>
      ${n === 0 ? emptyH('meal', 'Semaine à planifier', 'Touche un repas pour choisir un plat, ou copie la semaine précédente.') : ''}</div>${panel}</div></div></div>`;
}

/* --- vue Jour (zoom) --- */
function mealDay() {
  const d = A.meal.date;
  const card = (k) => {
    const m = mealOf(d, k), has = m && m.name, rec = has && ((m.recipeId && D.recipes[m.recipeId]) || null), wh = has && MEAL_WHERE.find(x => x.id === m.where);
    return `<div class="card"><h3>${ico('meal', 18)}${mkLbl(k)}</h3>${has ? `<div class="big" style="font-size:25px">${esc(m.name)}</div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px"><span class="pill">${avs(whoList(m.who || 'both'))}${esc(whoName(m.who || 'both'))}</span>${wh ? `<span class="pill">${esc(wh.l)}</span>` : ''}${rec && rec.time ? `<span class="pill">${ico('clock', 13)}${rec.time} min</span>` : ''}</div>
      ${m.note ? `<p class="mut" style="margin-top:10px">${esc(m.note)}</p>` : ''}
      ${rec && rec.ingredients && rec.ingredients.length ? `<p class="mut sm" style="margin-top:10px">${rec.ingredients.slice(0, 8).map(i => esc(ingText(i))).join(' · ')}${rec.ingredients.length > 8 ? '…' : ''}</p>` : ''}
      <div class="btns two"><button class="btn btn-s" data-act="meal-edit" data-d="${d}" data-k="${k}">Modifier</button><button class="btn btn-s" data-act="meal-idea-day" data-d="${d}" data-k="${k}">${ico('sparkle', 18)}Autre idée</button></div>`
      : `<p class="mut">Rien de prévu pour ce repas.</p><div class="btns two"><button class="btn btn-p" data-act="meal-edit" data-d="${d}" data-k="${k}">Choisir un plat</button><button class="btn btn-s" data-act="meal-idea-day" data-d="${d}" data-k="${k}">${ico('sparkle', 18)}Idée repas</button></div>`}</div>`;
  };
  return `<div class="page wide">${hdr(dayLong(d), d === today() ? 'Aujourd’hui' : '', { back: 'meal-up', right: mealToday, extra: navRow('meal-prev', 'meal-next', DAYN[wdi(d)].replace(/^./, c => c.toUpperCase()), fmtD(d, { day: 'numeric', month: 'long' })) })}<div class="content">${card('lunch')}${card('dinner')}</div></div>`;
}

/* --- navigation --- */
function mealStep(n) {
  const M = A.meal; if (M.sub === 'recipes') return;
  if (M.level === 'day' && M.sub === 'week') { M.date = addDays(M.date, n); M.week = monday(M.date); }
  else { M.week = addDays(M.week, 7 * n); M.date = addDays(M.date, 7 * n); }
  A.anim = n > 0 ? 'a-slL' : 'a-slR'; schedule();
}
ACT['meal-prev'] = () => mealStep(-1);
ACT['meal-next'] = () => mealStep(1);
ACT['meal-today'] = () => { A.meal.week = monday(today()); A.meal.date = today(); A.anim = 'a-fade'; schedule(); };
ACT['meal-sub'] = d => { A.meal.sub = d.v; A.meal.level = 'week'; A.anim = 'a-fade'; A.resetScroll = true; schedule(); };
ACT['meal-day'] = d => { A.meal.level = 'day'; A.meal.date = d.d; A.anim = 'a-zin'; A.resetScroll = true; schedule(); };
ACT['meal-up'] = () => { A.meal.level = 'week'; A.meal.week = monday(A.meal.date); A.anim = 'a-zout'; A.resetScroll = true; schedule(); };
ACT['rec-cat'] = d => { A.meal.cat = d.v; schedule(); };

/* --- saisie d'un repas --- */
function suggestRecipe(excl) {
  const recs = recList(); if (!recs.length) return null;
  const t = today(), recent = new Set();
  for (let i = -14; i <= 0; i++) { const m = D.meals[addDays(t, i)]; if (m) MK.forEach(k => { if (m[k]) { if (m[k].recipeId) recent.add(m[k].recipeId); recent.add(norm(m[k].name)); } }); }
  let pool = recs.filter(r => !recent.has(r.id) && !recent.has(norm(r.name))); if (!pool.length) pool = recs;
  if (excl && pool.length > 1) pool = pool.filter(r => r.id !== excl);
  return pool[Math.floor(Math.random() * pool.length)];
}
function openMeal(d, k, pre) {
  pre = pre || {}; const ex = mealOf(d, k);
  resetF({ d, k, who: ex ? ex.who || 'both' : 'both', where: ex ? ex.where || 'home' : 'home', recipeId: ex ? ex.recipeId || '' : '', copyK: k });
  let name = ex ? ex.name : '';
  if (pre.suggest) { const r = suggestRecipe(); if (r) { name = r.name; F.recipeId = r.id; F._idea = r.id; } else toast('Ajoute d’abord quelques plats dans l’onglet Plats', 'err'); }
  const recs = recList().slice(0, 14);
  openSheet(() => `<div class="st">${mkLbl(k)} · ${esc(dayLong(d))}</div>
    ${lbl('Plat')}<input class="inp" id="ml-name" maxlength="70" placeholder="Ex. Pâtes au pesto" value="${esc(name)}" autocomplete="off">
    ${recs.length ? `<div class="chips scroll" style="margin-top:10px">${recs.map(r => `<button type="button" class="chip" data-act="ml-pick" data-id="${esc(r.id)}">${r.fav ? '♥ ' : ''}${esc(r.name)}</button>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:8px"><button type="button" class="btn btn-s btn-sm" data-act="ml-idea">${ico('sparkle', 18)}Idée repas</button><button type="button" class="btn btn-s btn-sm" data-act="ml-stock">${ico('cart', 18)}Avec nos achats</button><button type="button" class="btn btn-s btn-sm" data-act="ml-leftover">${ico('repeat', 18)}Restes ${k === 'dinner' ? 'demain midi' : 'ce soir'}</button></div>
    ${lbl('Qui mange')}${segH('who', [{ id: 'both', l: 'Nous deux' }, { id: A.me, l: 'Moi' }, { id: otherP(A.me), l: NAMES[otherP(A.me)] }], F.who)}
    ${lbl('Où')}${chipsH('where', MEAL_WHERE, F.where).replace('class="chips"', 'class="chips scroll"')}
    ${lbl('Note')}<input class="inp" id="ml-note" maxlength="100" placeholder="Facultatif" value="${esc(ex ? ex.note || '' : '')}">
    ${ex ? `${lbl('Dupliquer ce repas')}<div class="row" style="align-items:center"><input class="inp" type="date" id="ml-copy-d" value="${addDays(d, 1)}"><div style="flex:none">${segH('copyK', [{ id: 'lunch', l: 'Midi' }, { id: 'dinner', l: 'Soir' }], F.copyK)}</div></div><button type="button" class="btn btn-s btn-b" style="margin-top:8px" data-act="ml-copy">${ico('copy', 18)}Copier</button>` : ''}
    <div class="btns ${ex ? 'two' : ''}">${ex ? `<button class="btn btn-d" data-act="ml-del">Retirer</button>` : ''}<button class="btn btn-p" data-act="ml-save">Enregistrer</button></div>`);
}
function openMealNext() {
  const t = today(), start = (A.tab === 'meal' && A.meal.level === 'day') ? A.meal.date : t, late = new Date().getHours() >= 14;
  for (let i = 0; i < 14; i++) { const d = addDays(start, i); for (const k of MK) { if (d === t && k === 'lunch' && late) continue; if (!mealOf(d, k)) return openMeal(d, k); } }
  openMeal(start, 'dinner');
}
function saveMeal(d, k, obj, msg) { return act(() => patch('meals', d, { date: d, [k]: obj }), msg || 'Repas enregistré'); }
ACT['meal-edit'] = d => openMeal(d.d, d.k);
ACT['meal-idea-day'] = d => openMeal(d.d, d.k, { suggest: true });
ACT['ml-pick'] = d => { const r = D.recipes[d.id]; if (!r) return; const n = document.getElementById('ml-name'); if (n) n.value = r.name; F.recipeId = d.id; };
ACT['ml-idea'] = () => {
  const r = suggestRecipe(F._idea); if (!r) return toast('Ajoute d’abord quelques plats dans l’onglet Plats', 'err');
  F._idea = r.id; F.recipeId = r.id; const n = document.getElementById('ml-name'); if (n) n.value = r.name; toast('Idée : ' + r.name);
};
ACT['ml-save'] = async () => {
  const name = val('ml-name').trim(); if (!name) return toast('Choisis ou écris un plat', 'err');
  let rid = F.recipeId; if (!(rid && D.recipes[rid] && norm(D.recipes[rid].name) === norm(name))) { const f = Object.entries(D.recipes).find(([, r]) => norm(r.name) === norm(name)); rid = f ? f[0] : ''; }
  const { d, k } = F, obj = { name, recipeId: rid, who: F.who, where: F.where, note: val('ml-note').trim() };
  closeSheet(); await saveMeal(d, k, obj);
};
ACT['ml-del'] = async () => { const { d, k } = F, prev = mealOf(d, k) ? clean(mealOf(d, k)) : null; closeSheet(); const ok = await act(() => patch('meals', d, { [k]: null }), 'Repas retiré'); if (ok && prev) offerUndo(() => patch('meals', d, { date: d, [k]: prev }), 'Repas retiré'); };
ACT['ml-copy'] = async () => {
  const src = mealOf(F.d, F.k), cd = val('ml-copy-d'); if (!src || !cd) return toast('Choisis une date', 'err');
  const ck = F.copyK; closeSheet(); await saveMeal(cd, ck, Object.assign({}, src), 'Repas copié au ' + dayShort(cd));
};
ACT['meal-copy-week'] = async () => {
  const w = A.meal.week, pw = addDays(w, -7); let n = 0; const jobs = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(w, i), src = D.meals[addDays(pw, i)]; if (!src) continue; const upd = { date: d };
    MK.forEach(k => { if (src[k] && src[k].name && !(mealOf(d, k) && mealOf(d, k).name)) { upd[k] = Object.assign({}, src[k]); n++; } });
    if (Object.keys(upd).length > 1) jobs.push(() => patch('meals', d, upd));
  }
  if (!n) return toast('Rien à copier : la semaine précédente est vide ou déjà reprise', 'err');
  await act(async () => { for (const j of jobs) await j(); }, n + ' repas copiés');
};
function dropMeal(raw, d, k) {
  let p; try { p = JSON.parse(raw); } catch (e) { return; }
  if (p.t === 'r') { const r = D.recipes[p.id]; if (r) saveMeal(d, k, { name: r.name, recipeId: p.id, who: 'both', where: 'home', note: '' }, 'Plat ajouté'); }
  else if (p.t === 'm') { const s = mealOf(p.d, p.k); if (s && !(p.d === d && p.k === k)) saveMeal(d, k, Object.assign({}, s), 'Repas copié'); }
}

/* --- bibliothèque de plats --- */
function mealRecipes() {
  const cat = A.meal.cat, list = recList().filter(r => !cat || r.cat === cat), diet = cfg().diet, hasDiet = PIDS.some(p => diet[p]);
  const catChips = `<div class="chips scroll" style="margin-top:6px">${[{ id: '', l: 'Tous' }].concat(REC_CATS).map(c => `<button class="chip${cat === c.id ? ' on' : ''}" data-act="rec-cat" data-v="${c.id}">${c.l}</button>`).join('')}</div>`;
  return `<div class="page wide">${hdr('Repas', '', { extra: mealSeg() })}<div class="content">${catChips}
    <div class="card"><h3>${ico('heart', 18)}Mes plats<span class="sp"></span><button class="lk" data-act="rec-new">Ajouter</button></h3>
      ${list.length ? list.map(r => { const n = (r.ingredients || []).length, cl = (REC_CATS.find(c => c.id === r.cat) || {}).l || 'Autre'; return `<div class="rrow"><button class="main" data-act="rec-edit" data-id="${esc(r.id)}"><span class="ic" style="--pc:var(--sage)">${REC_EMO[r.cat] || '🍽️'}</span><span class="grow"><div class="t" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</div><div class="s sm mut">${esc(cl)}${r.time ? ' · ' + r.time + ' min' : ''}${n ? ` · ${n} ingrédient${n > 1 ? 's' : ''}` : ''}</div></span></button><button class="hb${r.fav ? ' on' : ''}" data-act="rec-fav" data-id="${esc(r.id)}" aria-label="Favori">${ico('heart', 22)}</button></div>`; }).join('')
        : emptyH('meal', cat ? 'Aucun plat dans cette catégorie' : 'Votre bibliothèque est vide', 'Ajoutez les plats que vous cuisinez souvent, avec leurs ingrédients. Les courses se génèrent toutes seules.', `<br><button class="btn btn-p" data-act="rec-new">${ico('plus', 20)}Ajouter un plat</button>`)}</div>
    <div class="card tint"><h3>Régimes et allergies<span class="sp"></span><button class="lk" data-act="diet-edit">${hasDiet ? 'Modifier' : 'Ajouter'}</button></h3>${hasDiet ? PIDS.filter(p => diet[p]).map(p => `<div class="row" style="margin-top:6px">${av(p, 24)}<span>${esc(diet[p])}</span></div>`).join('') : '<p class="mut sm">Facultatif. Note ce que vous évitez pour y penser en choisissant un plat.</p>'}</div></div></div>`;
}
function openRecipe(id) {
  const r = id ? D.recipes[id] : null;
  resetF({ id: id || '', cat: r ? r.cat || 'autre' : 'pates', fav: r ? !!r.fav : false });
  openSheet(() => `<div class="st">${r ? 'Modifier le plat' : 'Nouveau plat'}</div>
    ${lbl('Nom')}<input class="inp" id="rc-name" maxlength="60" value="${esc(r ? r.name : '')}" placeholder="Ex. Gratin dauphinois" autocomplete="off">
    ${lbl('Catégorie')}${chipsH('cat', REC_CATS, F.cat)}
    ${lbl('Temps de préparation (minutes)')}<input class="inp" id="rc-time" inputmode="numeric" value="${r && r.time ? r.time : ''}" placeholder="Ex. 25">
    ${lbl('Ingrédients')}<textarea class="inp" id="rc-ing" style="min-height:130px" placeholder="Un par ligne&#10;200 g pâtes&#10;2 oignons&#10;1 pot crème">${esc(r && r.ingredients ? r.ingredients.map(ingText).join('\n') : '')}</textarea>
    <p class="mut sm" style="margin-top:6px">Quantité, unité puis nom. Les courses se rangent par rayon automatiquement.</p>
    ${lbl('Note')}<input class="inp" id="rc-note" maxlength="120" placeholder="Facultatif" value="${esc(r ? r.note || '' : '')}">
    <div style="margin-top:8px">${swH('fav', 'Plat favori', F.fav)}</div>
    <div class="btns ${r ? 'two' : ''}">${r ? `<button class="btn btn-d" data-act="rec-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="rec-save">Enregistrer</button></div>`, { focus: r ? '' : 'rc-name' });
}
ACT['rec-new'] = () => openRecipe('');
ACT['rec-edit'] = d => openRecipe(d.id);
ACT['rec-fav'] = d => { const r = D.recipes[d.id]; if (r) act(() => patch('recipes', d.id, { fav: !r.fav })); };
ACT['rec-save'] = async () => {
  const name = val('rc-name').trim(); if (!name) return toast('Donne un nom au plat', 'err');
  const ings = val('rc-ing').split('\n').map(parseIng).filter(Boolean), t = num(val('rc-time')), fid = F.id, id = fid || uid();
  const o = { name, cat: F.cat, time: isFinite(t) ? Math.round(t) : 0, ingredients: ings, note: val('rc-note').trim(), fav: !!F.fav, ts: Date.now() };
  closeSheet(); await act(() => put('recipes', id, o), fid ? 'Plat modifié' : 'Plat ajouté');
};
ACT['rec-del'] = async () => { const id = F.id; closeSheet(); await act(() => del('recipes', id), 'Plat supprimé'); };
ACT['diet-edit'] = () => {
  const diet = cfg().diet; resetF();
  openSheet(() => `<div class="st">Régimes et allergies</div><div class="ss">Facultatif.</div>${PIDS.map(p => `${lbl(esc(NAMES[p]))}<input class="inp" id="diet-${p}" maxlength="120" value="${esc(diet[p] || '')}" placeholder="Ex. sans gluten, allergie aux arachides">`).join('')}<div class="btns"><button class="btn btn-p btn-b" data-act="diet-save">Enregistrer</button></div>`);
};
ACT['diet-save'] = async () => { const o = { maxym: val('diet-maxym').trim(), sasha: val('diet-sasha').trim() }; closeSheet(); await act(() => patch('settings', 'main', { diet: o }), 'Enregistré'); };

/* --- liste de courses partagée --- */
function mealShop() {
  const w = A.meal.week, chk = (D.shopchecks[w] && D.shopchecks[w].checked) || {};
  const rows = groceryItems(w).map(i => ({ k: 'a:' + i.key, name: i.name, q: i.hasQty ? qtyStr(r2(i.qty)) + (i.unit ? ' ' + i.unit : '') : '', aisle: i.aisle, done: !!chk[i.key], from: i.from.join(', ') }));
  Object.entries(D.shopitems).filter(([, x]) => x.week === w).forEach(([id, x]) => rows.push({ k: 'm:' + id, name: x.name, q: x.qty != null ? qtyStr(x.qty) + (x.unit ? ' ' + x.unit : '') : '', aisle: x.aisle || 'autre', done: !!x.done, man: true }));
  const total = rows.length, done = rows.filter(r => r.done).length;
  const groups = AISLES.map(a => ({ a, items: rows.filter(r => r.aisle === a.id).sort((x, y) => (x.done - y.done) || x.name.localeCompare(y.name, 'fr')) })).filter(g => g.items.length);
  const ck = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const manDone = rows.filter(r => r.man && r.done).length;
  return `<div class="page wide">${hdr('Repas', 'Semaine ' + isoWeek(w), { right: mealToday, extra: mealSeg() + navRow('meal-prev', 'meal-next', weekLabel(w)) })}<div class="content">
    <div class="card"><div class="addrow"><input class="inp" id="shop-new" placeholder="Ajouter un article (ex. 2 yaourts)" autocomplete="off" enterkeyhint="done"><button class="btn btn-p" data-act="shop-add" aria-label="Ajouter">${ico('plus', 22, 2.2)}</button></div>${freqChips()}
      ${total ? `<div class="row" style="margin-top:14px"><b class="grow">${done} sur ${total} dans le panier</b><span class="mut sm">${Math.round(done / total * 100)} %</span></div><div class="prog"><i style="width:${Math.round(done / total * 100)}%"></i></div>` : ''}</div>
    ${groups.length ? `<div class="card">${groups.map(g => `<div class="aisle">${esc(g.a.l)}</div>${g.items.map(r => `<button class="shop${r.done ? ' done' : ''}" data-act="shop-toggle" data-k="${esc(r.k)}"><span class="ck">${ck}</span><span class="grow" style="min-width:0"><span class="t" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span>${r.from ? `<span class="s sm mut" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.from)}</span>` : ''}</span><span class="q">${esc(r.q)}</span></button>`).join('')}`).join('')}</div>
      <div class="btns"><button class="btn btn-p btn-b" data-act="shop-pay">${ico('wallet', 20)}Enregistrer le passage en caisse</button>${manDone ? `<button class="btn btn-s btn-b" data-act="shop-clear">Retirer mes articles cochés</button>` : ''}</div>`
      : `<div class="card">${emptyH('cart', 'Liste vide', 'Planifiez des repas avec ingrédients : la liste se remplit toute seule. Vous pouvez aussi ajouter un article ci-dessus.')}</div>`}
    <p class="sync-note">Les cases cochées se voient en direct chez ${esc(NAMES[otherP(A.me)])}.</p></div></div>`;
}
ACT['shop-toggle'] = d => {
  const w = A.meal.week, k = d.k;
  if (k.startsWith('m:')) { const id = k.slice(2), x = D.shopitems[id]; if (x) act(() => patch('shopitems', id, { done: !x.done })); }
  else { const key = k.slice(2), cur = !!(D.shopchecks[w] && D.shopchecks[w].checked && D.shopchecks[w].checked[key]); act(() => patch('shopchecks', w, { week: w, checked: { [key]: !cur } })); }
};
ACT['shop-add'] = () => {
  const inp = document.getElementById('shop-new'), txt = inp ? inp.value.trim() : ''; if (!txt) return;
  const ing = parseIng(txt); inp.value = '';
  act(() => put('shopitems', uid(), { week: A.meal.week, name: ing.n, qty: ing.q, unit: ing.u, aisle: ing.a, done: false, by: A.me, ts: Date.now() }));
};
ACT['shop-clear'] = async () => {
  const w = A.meal.week, ids = Object.entries(D.shopitems).filter(([, x]) => x.week === w && x.done).map(([id]) => id);
  await act(async () => { for (const id of ids) await del('shopitems', id); }, 'Articles retirés');
};
ACT['shop-pay'] = () => {
  resetF({ paidBy: A.me });
  openSheet(() => `<div class="st">Passage en caisse</div><div class="ss">Le total est ajouté au budget en dépense « Courses », partagée 50 / 50.</div>
    <div class="amt"><input id="gp-amt" inputmode="decimal" placeholder="0" autocomplete="off"><span>€</span></div>
    ${lbl('Payé par')}${segH('paidBy', [A.me, otherP(A.me)].map(p => ({ id: p, l: p === A.me ? 'Moi' : NAMES[p], i: av(p, 22) })), F.paidBy)}
    ${lbl('Date')}<input class="inp" type="date" id="gp-date" value="${today()}">
    <div class="btns"><button class="btn btn-p btn-b" data-act="shop-pay-save">Ajouter au budget</button></div>`, { focus: 'gp-amt' });
};
ACT['shop-pay-save'] = async () => {
  const amount = num(val('gp-amt')); if (!(amount > 0)) return toast('Saisis le total du ticket', 'err');
  const date = val('gp-date') || today(), paidBy = F.paidBy, w = A.meal.week, a = r2(amount);
  closeSheet(); await act(() => put('expenses', uid(), { kind: 'expense', amount: a, cat: 'groceries', paidBy, mode: '50', shares: buildShares(a, '50', paidBy, 50), date, note: 'Courses · semaine du ' + dayShort(w), createdBy: A.me, ts: Date.now() }), 'Courses ajoutées au budget');
};
