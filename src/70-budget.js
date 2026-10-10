
/* ---------- 11. Budget du foyer ---------- */
const icoI = (n, s = 14) => ico(n, s).replace('class="i"', 'class="i inl"');
const budSeg = () => `<div class="seg s4">${[['over', 'Aperçu'], ['tx', 'Liste'], ['inc', 'Revenus'], ['goals', 'Épargne']].map(([k, l]) => `<button class="${A.bud.sub === k ? 'on' : ''}" data-act="bud-sub" data-v="${k}">${l}</button>`).join('')}</div>`;
const mixC = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function pgColor(r) { const g = [127, 184, 154], o = [240, 178, 122], rd = [229, 140, 140]; const c = r <= .6 ? g : r <= .9 ? mixC(g, o, (r - .6) / .3) : r <= 1.05 ? mixC(o, rd, (r - .9) / .15) : rd; return 'rgb(' + c.join(',') + ')'; }
function vBud() {
  const s = A.bud.sub, f = A.bud.f;
  const body = s === 'tx' ? budTx() : s === 'inc' ? budInc() : s === 'goals' ? budGoals() : budOver();
  const showNav = s === 'over' || s === 'inc' || (s === 'tx' && f.per === 'month');
  const right = s === 'tx' || s === 'over' ? `<button class="ib" data-act="bud-csv" aria-label="Exporter le mois en CSV">${ico('download')}</button>` : '';
  return `<div class="page">${hdr('Budget', '', { right, extra: budSeg() + (showNav ? navRow('bud-prev', 'bud-next', monthLabel(A.bud.month)) : '') })}<div class="content">${body}</div></div>`;
}

/* charges fixes : générées automatiquement chaque mois (identifiants stables, aucun doublon possible) */
const GEN = {};
function ensureMonth() {
  const m = ymOf(today()); if (GEN[m] || !A.ready || !A.me || A.canWrite === false) return;
  if (D.months[m] && D.months[m].generated) { GEN[m] = 1; return; }
  GEN[m] = 1; genMonth(m);
}
async function genMonth(m) {
  const c = cfg(), items = [{ id: 'rent', label: 'Loyer', cat: 'rent', amount: Math.max(0, r2(c.rent.amount - c.rent.apl)), day: c.rent.day, paidBy: c.rent.paidBy, pct: 50, note: 'Loyer ' + fmt(c.rent.amount) + ' − APL ' + fmt(c.rent.apl) }];
  c.fixed.forEach(f => items.push({ id: f.id, label: f.label, cat: f.cat, amount: f.amount, day: f.day, paidBy: f.paidBy, pct: f.pct, note: f.label }));
  await act(async () => {
    for (const it of items) {
      const id = 'fx_' + it.id + '_' + m; if (D.expenses[id] || !(it.amount > 0)) continue;
      const mode = it.pct === 50 ? '50' : 'custom';
      await put('expenses', id, { kind: 'expense', amount: it.amount, cat: it.cat, paidBy: it.paidBy, mode, shares: buildShares(it.amount, mode, it.paidBy, it.pct), date: m + '-' + pad(Math.min(it.day, dim(m))), note: it.note, auto: true, fixedId: it.id, ts: Date.now() });
    }
    await put('months', m, { generated: true, ts: Date.now() });
  });
}

/* --- aperçu --- */
function donut(parts, total) {
  const R = 15.9155; let off = 25;
  const segs = parts.map(p => { const pc = p.v / total * 100, d = Math.max(pc - 0.7, 0.2); const s = `<circle cx="21" cy="21" r="${R}" fill="none" stroke="${esc(p.color)}" stroke-width="5.4" stroke-dasharray="${d.toFixed(2)} ${(100 - d).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>`; off -= pc; return s; }).join('');
  return `<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Répartition des dépenses communes"><circle cx="21" cy="21" r="${R}" fill="none" stroke="var(--soft)" stroke-width="5.4"/>${segs}<text x="21" y="21.2" text-anchor="middle" font-size="4.6" font-weight="800" fill="var(--ink)">${esc(fmt(Math.round(total)))}</text><text x="21" y="25.8" text-anchor="middle" font-size="2.7" fill="var(--ink2)">communs</text></svg>`;
}
function budOver() {
  const m = A.bud.month, c = cfg(), o = otherP(A.me), bal = myBalance();
  const shared = monthExp(m).filter(isShared), total = commonTotal(m), prevT = commonTotal(addM(m, -1));
  const byCat = {}; shared.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const parts = Object.entries(byCat).map(([id, v]) => Object.assign({}, catById(id), { v: r2(v) })).sort((a, b) => b.v - a.v);
  let cmp = '';
  if (prevT > 0 && total > 0) { const pc = Math.round((total - prevT) / prevT * 100); cmp = `<span class="pill ${pc > 10 ? 'warn' : pc < 0 ? 'ok' : ''}">${pc > 0 ? '+' : ''}${pc} % par rapport à ${esc(fmtD(addM(m, -1) + '-01', { month: 'long' }))}</span>`; }
  const balTxt = Math.abs(bal) < 0.5 ? `Vous êtes <span style="color:var(--accent-ink)">quittes</span>` : bal > 0 ? `${esc(NAMES[o])} te doit <span style="color:var(--accent-ink)">${fmt(bal)}</span>` : `Tu dois <span style="color:var(--accent-ink)">${fmt(-bal)}</span> à ${esc(NAMES[o])}`;
  const tg = Object.entries(c.targets).filter(([, v]) => v > 0), rn = c.rent, rest = Math.max(0, r2(rn.amount - rn.apl));
  const hist = [5, 4, 3, 2, 1, 0].map(i => { const mm = addM(m, -i); return { m: mm, v: commonTotal(mm) }; }), mx = Math.max(1, ...hist.map(h => h.v));
  const splitTxt = f => f.pct === 50 ? '50 / 50' : `${f.pct} / ${100 - f.pct}`;
  return `${!c.amountsOk ? `<div class="note"><div class="grow"><b>Montants d’exemple</b>Le loyer et les charges fixes sont pré-remplis avec des valeurs indicatives. Touche-les pour mettre les vrais montants.<div style="margin-top:8px"><button class="btn btn-s btn-sm" data-act="amounts-ok">C’est déjà bon</button></div></div></div>` : ''}
    <div class="card"><h3>${ico('swap', 18)}Solde du foyer</h3><div class="bal"><div class="grow"><div class="big" style="font-size:27px">${balTxt}</div></div>${Math.abs(bal) >= 0.5 ? `<button class="btn btn-p" data-act="settle-open">Régler</button>` : `<span class="pill ok">${icoI('check', 14)}À jour</span>`}</div></div>
    <div class="card"><h3>${ico('wallet', 18)}Dépenses communes</h3>
      <div class="row" style="flex-wrap:wrap;gap:8px"><div class="big">${fmt(total)}</div><span class="grow"></span>${cmp}</div>
      ${parts.length ? `<div class="donutw" style="margin-top:14px">${donut(parts, total)}<div class="leg">${parts.map(p => `<div class="legi"><i style="background:${esc(p.color)}"></i><span class="grow">${esc(p.icon)} ${esc(p.label)}</span><b class="amount sm">${fmt(p.v)}</b><span class="mut sm" style="width:38px;text-align:right">${Math.round(p.v / total * 100)} %</span></div>`).join('')}</div></div>` : emptyH('wallet', 'Pas encore de dépense commune', 'Ajoute une dépense avec le bouton +, elle apparaîtra ici.')}</div>
    ${paidCard(m)}
    <div class="grid2">
    <div class="card"><h3>${ico('target', 18)}Budgets cibles<span class="sp"></span><button class="lk" data-act="tgt-edit" data-id="">Ajouter</button></h3>
      ${tg.length ? tg.map(([id, v]) => { const cat = catById(id), spent = r2(byCat[id] || 0), r = spent / v; return `<button class="tgt" data-act="tgt-edit" data-id="${esc(id)}"><div class="row"><span class="ic sm" style="--pc:${esc(cat.color)}">${esc(cat.icon)}</span><span class="grow t" style="font-weight:600">${esc(cat.label)}</span><span class="amount sm">${fmt(spent)} / ${fmt(v)}</span></div><div class="pg"><i style="width:${Math.min(100, Math.round(r * 100))}%;background:${pgColor(r)}"></i></div>${r > 1 ? `<div class="sm" style="color:var(--bad-ink);margin-top:6px">Dépassé de ${fmt(spent - v)}</div>` : ''}</button>`; }).join('') : `<p class="mut sm">Fixe un plafond mensuel par catégorie, par exemple 400 € pour les courses.</p>`}</div>
    <div class="card tap" role="button" tabindex="0" data-act="rent-edit"><h3>${ico('home', 18)}Loyer<span class="sp"></span><span style="font-size:14px;font-weight:600;text-transform:none;letter-spacing:0;color:var(--accent-ink)">Modifier</span></h3>
      <div class="calc"><div class="r"><span>Loyer</span><b>${fmt(rn.amount)}</b></div><div class="r"><span>APL déduite</span><b>− ${fmt(rn.apl)}</b></div><div class="r t"><span>Reste à charge</span><b>${fmt(rest)}</b></div><div class="r sub"><span>Part de chacun (50 / 50)</span><b>${fmt(rest / 2)}</b></div></div>
      <p class="mut sm" style="margin-top:10px">Prélevé le ${rn.day} · avancé par ${esc(NAMES[rn.paidBy])}</p></div></div>
    <div class="card"><h3>${ico('repeat', 18)}Charges fixes<span class="sp"></span><button class="lk" data-act="fx-edit" data-id="">Ajouter</button></h3>
      ${c.fixed.map(f => { const cat = catById(f.cat); return `<button class="li" data-act="fx-edit" data-id="${esc(f.id)}"><span class="ic sm" style="--pc:${esc(cat.color)}">${esc(cat.icon)}</span><span class="grow"><div class="t">${esc(f.label)}</div><div class="s">Le ${f.day} · avancé par ${f.paidBy === A.me ? 'toi' : esc(NAMES[f.paidBy])} · ${splitTxt(f)}</div></span><span class="amount">${fmt(f.amount)}</span></button>`; }).join('') || '<p class="mut sm">Aucune charge fixe.</p>'}</div>
    <div class="card"><h3>${ico('cal', 18)}Historique</h3><div class="bars">${hist.map(h => `<button class="${h.m === m ? 'on' : ''}" data-act="bud-month" data-m="${h.m}" aria-label="${esc(monthLabel(h.m) + ' : ' + fmt(h.v))}"><span>${h.v ? Math.round(h.v) : ''}</span><i style="height:${Math.round(h.v / mx * 70) + 4}px"></i><span>${esc(fmtD(h.m + '-01', { month: 'short' }).replace('.', ''))}</span></button>`).join('')}</div></div>
    <div class="btns"><button class="btn btn-s btn-b" data-act="bud-csv">${ico('download', 20)}Exporter ${esc(fmtD(m + '-01', { month: 'long' }))} en CSV</button></div>`;
}

/* --- liste des transactions --- */
function txFiltered() {
  const f = A.bud.f, m = A.bud.month; let list = allExp();
  if (f.per === 'month') list = list.filter(e => e.date && e.date.slice(0, 7) === m);
  else if (f.per === '3m') { const from = addM(ymOf(today()), -2) + '-01'; list = list.filter(e => e.date >= from); }
  if (f.cat) list = list.filter(e => e.cat === f.cat && e.kind !== 'settle');
  if (f.who) list = list.filter(e => e.kind === 'settle' ? e.from === f.who : e.paidBy === f.who);
  if (f.q) { const q = norm(f.q); list = list.filter(e => norm((e.note || '') + ' ' + (e.kind === 'settle' ? 'remboursement' : catById(e.cat).label) + ' ' + String(e.amount).replace('.', ',') + ' ' + e.amount).includes(q)); }
  return list;
}
function txRow(e) {
  if (e.kind === 'settle') return `<button class="li" data-act="exp-edit" data-id="${esc(e.id)}"><span class="ic sm">${ico('swap', 18)}</span><span class="grow"><div class="t">Remboursement</div><div class="s">${esc(NAMES[e.from])} → ${esc(NAMES[e.to])}</div></span><span class="amount">${fmt(e.amount)}</span></button>`;
  const c = catById(e.cat), pm = e.amount > 0 && e.shares ? Math.round((e.shares.maxym || 0) / e.amount * 100) : 50;
  const mode = e.mode === 'perso' ? 'Perso' : e.mode === 'custom' ? `${NAMES.maxym[0]} ${pm} · ${NAMES.sasha[0]} ${100 - pm}` : '50 / 50';
  return `<button class="li" data-act="exp-edit" data-id="${esc(e.id)}"><span class="ic sm" style="--pc:${esc(c.color)}">${esc(c.icon)}</span><span class="grow"><div class="t">${esc(e.note || c.label)}</div><div class="s">${e.paidBy === A.me ? 'Toi' : esc(NAMES[e.paidBy])} · ${esc(c.label)} · ${esc(mode)}${e._loc === 'priv' ? ' ' + icoI('lock', 12) : ''}</div></span><span class="amount">${fmt(e.amount)}</span></button>`;
}
function txListHtml() {
  const f = A.bud.f, list = txFiltered(), lim = f.lim || 80, shown = list.slice(0, lim);
  if (!list.length) return emptyH('wallet', 'Aucune opération', 'Change les filtres ou ajoute une dépense avec le bouton +.');
  const sum = r2(list.filter(e => e.kind !== 'settle').reduce((a, e) => a + e.amount, 0));
  let html = `<div class="row"><b class="grow">${list.length} opération${list.length > 1 ? 's' : ''}</b><span class="amount">${fmt(sum)}</span></div>`, cur = '';
  shown.forEach(e => {
    if (e.date !== cur) { cur = e.date; const dt = r2(list.filter(x => x.date === cur && x.kind !== 'settle').reduce((a, x) => a + x.amount, 0)); html += `<div class="dayh"><span>${esc(dayLong(cur))}</span><span>${dt ? fmt(dt) : ''}</span></div>`; }
    html += txRow(e);
  });
  if (list.length > lim) html += `<button class="btn btn-s btn-b" style="margin-top:12px" data-act="tx-more">Afficher plus (${list.length - lim})</button>`;
  return html;
}
function budTx() {
  const f = A.bud.f, c = cfg();
  return `<div class="fbar"><div class="sbox">${ico('search', 20)}<input class="inp" id="tx-q" type="search" placeholder="Rechercher une dépense" value="${esc(f.q)}" autocomplete="off"></div>
    <div class="seg">${[['month', 'Ce mois'], ['3m', '3 mois'], ['all', 'Tout']].map(([k, l]) => `<button class="${f.per === k ? 'on' : ''}" data-act="tx-per" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chips scroll">${[{ id: '', l: 'Toutes', i: '' }].concat(c.cats.map(x => ({ id: x.id, l: x.label, i: x.icon }))).map(x => `<button class="chip${f.cat === x.id ? ' on' : ''}" data-act="tx-cat" data-v="${esc(x.id)}">${x.i ? esc(x.i) + ' ' : ''}${esc(x.l)}</button>`).join('')}</div>
    <div class="chips">${[{ id: '', l: 'Tous' }].concat(PIDS.map(p => ({ id: p, l: 'Payé par ' + (p === A.me ? 'moi' : NAMES[p]) }))).map(x => `<button class="chip${f.who === x.id ? ' on' : ''}" data-act="tx-who" data-v="${x.id}">${esc(x.l)}</button>`).join('')}</div></div>
    <div class="card" id="tx-list">${txListHtml()}</div>`;
}

/* --- revenus privés et reste à vivre --- */
function myCosts(m) {
  let common = 0, perso = 0;
  monthExp(m).forEach(e => { if (e.mode === 'perso' || e._loc === 'priv') perso += e.amount; else { const sh = e.shares || { maxym: e.amount / 2, sasha: e.amount / 2 }; common += sh[A.me] || 0; } });
  return { common: r2(common), perso: r2(perso) };
}
const incItems = m => { const d = D.priv['income_' + m]; return (d && d.items) || []; };
function budInc() {
  const m = A.bud.month, items = incItems(m), prev = incItems(addM(m, -1)), tot = r2(items.reduce((a, i) => a + i.amount, 0)), cs = myCosts(m), left = r2(tot - cs.common - cs.perso);
  const pv = n => A.hide ? '•••• €' : fmt(n);
  return `<div class="card"><h3>${ico('lock', 16)}Reste à vivre<span class="sp"></span><button class="eye" data-act="hide-toggle">${ico(A.hide ? 'eye' : 'eyeoff', 20)}${A.hide ? 'Afficher' : 'Masquer'}</button></h3>
    <div class="big" style="color:${left < 0 && !A.hide ? 'var(--bad-ink)' : 'var(--ink)'}">${pv(left)}</div>
    <div class="calc" style="margin-top:14px"><div class="r"><span>Revenus du mois</span><b>${pv(tot)}</b></div><div class="r"><span>Ta part des dépenses communes</span><b>− ${pv(cs.common)}</b></div><div class="r"><span>Tes dépenses perso</span><b>− ${pv(cs.perso)}</b></div></div>
    <p class="mut sm" style="margin-top:12px">${icoI('lock', 13)} Visible par toi seul. ${esc(NAMES[otherP(A.me)])} ne voit ni tes revenus ni tes dépenses perso.${DB && !UID ? ' Sur cet appareil uniquement.' : ''}</p></div>
    <div class="card"><h3>${ico('wallet', 18)}Mes rentrées d’argent<span class="sp"></span><button class="lk" data-act="inc-new">Ajouter</button></h3>
      ${items.length ? items.map(i => `<button class="li" data-act="inc-edit" data-id="${esc(i.id)}"><span class="ic sm">${ico('wallet', 18)}</span><span class="grow t">${esc(i.label)}</span><span class="amount">${pv(i.amount)}</span></button>`).join('') : emptyH('wallet', 'Aucune rentrée ce mois-ci', 'Salaire, aides, autres revenus : ils servent à calculer ton reste à vivre.', `<br><button class="btn btn-p" data-act="inc-new">${ico('plus', 20)}Ajouter un revenu</button>`)}
      ${!items.length && prev.length ? `<button class="btn btn-s btn-b" style="margin-top:10px" data-act="inc-copy">Reprendre ceux du mois précédent</button>` : ''}</div>`;
}

/* --- épargne --- */
function goalSums(g) { const by = { maxym: 0, sasha: 0 }; Object.values(D.contribs).forEach(c => { if (c.goalId === g.id) by[c.who] = (by[c.who] || 0) + c.amount; }); return { by, cur: r2(by.maxym + by.sasha) }; }
function budGoals() {
  const goals = Object.entries(D.goals).map(([id, g]) => ({ id, ...g })).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (!goals.length) return `<div class="card">${emptyH('target', 'Un objectif commun', 'Voyage, apport, projet : fixez un montant et suivez la progression à deux.', `<br><button class="btn btn-p" data-act="goal-new">${ico('plus', 20)}Créer un objectif</button>`)}</div>`;
  return goals.map(g => {
    const s = goalSums(g), pc = g.target > 0 ? Math.min(100, Math.round(s.cur / g.target * 100)) : 0;
    const cs = Object.entries(D.contribs).filter(([, c]) => c.goalId === g.id).map(([id, c]) => ({ id, ...c })).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);
    return `<div class="card"><h3>${ico('target', 18)}${esc(g.name)}<span class="sp"></span><button class="lk" data-act="goal-edit" data-id="${esc(g.id)}">Modifier</button></h3>
      <div class="row" style="align-items:baseline"><div class="big">${fmt(s.cur)}</div><span class="mut grow">sur ${fmt(g.target)}</span><b style="color:var(--accent-ink)">${pc} %</b></div>
      <div class="pg"><i style="width:${pc}%;background:var(--sage)"></i></div>
      <div class="row" style="margin-top:14px">${PIDS.map(p => `<div class="grow row">${av(p, 28)}<div><div class="sm mut">${esc(NAMES[p])}</div><b>${fmt(s.by[p] || 0)}</b></div></div>`).join('')}</div>
      ${cs.length ? `<div style="margin-top:10px">${cs.map(c => `<button class="li" data-act="contrib-edit" data-id="${esc(c.id)}"><span>${av(c.who, 26)}</span><span class="grow"><div class="t">${fmt(c.amount)}</div><div class="s">${esc(dayLong(c.date))}</div></span>${ico('chevR', 16)}</button>`).join('')}</div>` : ''}
      <div class="btns"><button class="btn btn-p btn-b" data-act="contrib-new" data-id="${esc(g.id)}">${ico('plus', 20)}Ajouter une contribution</button></div></div>`;
  }).join('') + `<div class="btns"><button class="btn btn-s btn-b" data-act="goal-new">Nouvel objectif</button></div>`;
}

/* --- navigation et filtres --- */
ACT['bud-sub'] = d => { A.bud.sub = d.v; A.anim = 'a-fade'; A.resetScroll = true; schedule(); };
const budStep = n => { A.bud.month = addM(A.bud.month, n); A.anim = n > 0 ? 'a-slL' : 'a-slR'; schedule(); };
ACT['bud-prev'] = () => budStep(-1);
ACT['bud-next'] = () => budStep(1);
ACT['bud-month'] = d => { A.bud.month = d.m; A.anim = 'a-fade'; schedule(); };
ACT['tx-per'] = d => { A.bud.f.per = d.v; A.bud.f.lim = 0; schedule(); };
ACT['tx-cat'] = d => { A.bud.f.cat = d.v; A.bud.f.lim = 0; schedule(); };
ACT['tx-who'] = d => { A.bud.f.who = d.v; A.bud.f.lim = 0; schedule(); };
ACT['tx-more'] = () => { A.bud.f.lim = (A.bud.f.lim || 80) + 80; schedule(); };
ACT['hide-toggle'] = () => { A.hide = !A.hide; lsSet('cn-hide', A.hide ? '1' : '0'); schedule(); };
ACT['amounts-ok'] = () => act(() => patch('settings', 'main', { amountsOk: true }), 'Parfait');

/* --- dépense --- */
const modeHint = v => v === 'perso' ? 'Dépense personnelle : visible par toi seul, sans effet sur le solde.' : v === 'custom' ? 'Choisis la part de chacun avec le curseur.' : 'Chacun paie la moitié, le solde se met à jour tout seul.';
function openExpense(id, pre) {
  pre = pre || {}; const ex = id ? allExp().find(e => e.id === id) : null;
  if (ex && ex.kind === 'settle') return openSettleView(ex);
  const pct = ex && ex.mode === 'custom' && ex.amount ? Math.round((ex.shares.maxym || 0) / ex.amount * 100) : 50;
  resetF({ id: id || '', cat: ex ? ex.cat : (pre.cat || lsGet('cn-lastcat') || 'groceries'), paidBy: ex ? ex.paidBy : A.me, mode: ex ? (ex.mode || '50') : '50' });
  const lockMe = () => { F.paidBy = A.me; $$('[data-pick="paidBy"]').forEach(x => x.classList.toggle('on', x.dataset.val === A.me)); };
  F._onpick = (k, v) => {
    if (k === 'mode') { const cu = document.getElementById('ex-custom'); if (cu) cu.hidden = v !== 'custom'; const h = document.getElementById('ex-hint'); if (h) h.textContent = modeHint(v); if (v === 'perso') lockMe(); updatePct('ex-pct'); }
    if (k === 'paidBy' && F.mode === 'perso') lockMe();
  };
  openSheet(() => `<div class="st">${ex ? 'Modifier la dépense' : 'Nouvelle dépense'}</div>
    <div class="amt"><input id="ex-amt" inputmode="decimal" autocomplete="off" placeholder="0" value="${ex ? String(ex.amount).replace('.', ',') : ''}"><span>€</span></div>
    ${lbl('Catégorie')}<div class="pgrid">${cfg().cats.map(c => `<button type="button" data-pick="cat" data-val="${esc(c.id)}" class="${c.id === F.cat ? 'on' : ''}" style="--pc:${esc(c.color)}"><b>${esc(c.icon)}</b><span>${esc(c.label)}</span></button>`).join('')}</div>
    ${lbl('Payé par')}${segH('paidBy', [A.me, otherP(A.me)].map(p => ({ id: p, l: p === A.me ? 'Moi' : NAMES[p], i: av(p, 22) })), F.paidBy)}
    ${lbl('Répartition')}${segH('mode', [{ id: '50', l: '50 / 50' }, { id: 'perso', l: 'Perso' }, { id: 'custom', l: 'Sur mesure' }], F.mode)}
    <p class="mut sm" id="ex-hint" style="margin-top:8px">${modeHint(F.mode)}</p>
    <div id="ex-custom" ${F.mode === 'custom' ? '' : 'hidden'} style="margin-top:6px"><input type="range" class="range" id="ex-pct" min="0" max="100" step="5" value="${pct}" aria-label="Part de ${NAMES.maxym}"><div class="sm mut" id="ex-pct-t"></div></div>
    <div class="row" style="align-items:flex-start"><div class="grow">${lbl('Date')}<input class="inp" type="date" id="ex-date" value="${esc(ex ? ex.date : (pre.date || today()))}"></div></div>
    ${lbl('Note')}<input class="inp" id="ex-note" maxlength="80" placeholder="Facultatif" value="${esc(ex ? ex.note || '' : '')}" autocomplete="off">
    ${rcptField(ex)}
    <div class="btns ${ex ? 'two' : ''}">${ex ? `<button class="btn btn-d" data-act="exp-del-ask" data-id="${esc(id)}">Supprimer</button>` : ''}<button class="btn btn-p" data-act="exp-save">${ex ? 'Enregistrer' : 'Ajouter'}</button></div>`, { focus: ex ? '' : 'ex-amt' });
  setTimeout(() => updatePct('ex-pct'), 40);
}
ACT['exp-edit'] = d => openExpense(d.id);
ACT['exp-new-d'] = d => openExpense('', { date: d.d });
ACT['exp-save'] = async () => {
  const amount = num(val('ex-amt')); if (!(amount > 0)) return toast('Saisis un montant', 'err');
  const a = r2(amount), mode = F.mode, paidBy = mode === 'perso' ? A.me : F.paidBy, pct = num(val('ex-pct')), fid = F.id;
  const rb = F.rcptBlob, o = { kind: 'expense', amount: a, cat: F.cat, paidBy, mode, shares: buildShares(a, mode, paidBy, isFinite(pct) ? pct : 50), date: val('ex-date') || today(), note: val('ex-note').trim(), createdBy: A.me, ts: Date.now() };
  const old = fid ? allExp().find(e => e.id === fid) : null, loc = mode === 'perso' ? 'priv' : 'shared';
  const id = fid && old && old._loc === loc ? fid : (loc === 'priv' ? 'pexp_' : '') + uid();
  if (rb && RC.upload) o.receipt = true; else if (old && old.receipt) o.receipt = true;
  lsSet('cn-lastcat', F.cat); closeSheet();
  const ok = await act(async () => { if (rb && RC.upload) await RC.upload(id, rb); await put(loc === 'priv' ? 'priv' : 'expenses', id, o); if (old && old._loc !== loc) await del(old._loc === 'priv' ? 'priv' : 'expenses', old.id, true); }, fid ? 'Dépense modifiée' : 'Dépense ajoutée');
  if (ok && loc === 'expenses') budgetAlert(o.cat, o.date.slice(0, 7));
};
ACT['exp-del-ask'] = d => {
  const id = d.id; confirmSheet({ title: 'Supprimer cette opération ?', text: 'Le solde sera recalculé.', ok: 'Supprimer', danger: true, onOk: () => { const e = allExp().find(x => x.id === id); if (e) act(() => del(e._loc === 'priv' ? 'priv' : 'expenses', e.id), 'Supprimée'); } });
};
function openSettleView(e) {
  resetF();
  openSheet(() => `<div class="st">Remboursement</div><div class="ss">${esc(NAMES[e.from])} → ${esc(NAMES[e.to])} · ${esc(dayLong(e.date))}</div><div class="amt"><span style="font-size:44px;font-weight:800;color:var(--ink)">${fmt(e.amount)}</span></div><div class="btns"><button class="btn btn-d" data-act="exp-del-ask" data-id="${esc(e.id)}">Supprimer ce remboursement</button></div>`);
}
ACT['settle-open'] = () => {
  const bal = myBalance(), from = bal < 0 ? A.me : otherP(A.me), to = otherP(from), amt = Math.abs(bal);
  resetF({ dir: from + '>' + to });
  openSheet(() => `<div class="st">Régler le solde</div><div class="ss">Enregistre un remboursement : le solde se remet à jour.</div>
    <div class="amt"><input id="st-amt" inputmode="decimal" autocomplete="off" value="${amt ? String(r2(amt)).replace('.', ',') : ''}"><span>€</span></div>
    ${lbl('Qui rembourse qui ?')}${segH('dir', [{ id: A.me + '>' + otherP(A.me), l: 'Moi → ' + NAMES[otherP(A.me)] }, { id: otherP(A.me) + '>' + A.me, l: NAMES[otherP(A.me)] + ' → moi' }], F.dir)}
    ${lbl('Date')}<input class="inp" type="date" id="st-date" value="${today()}">
    <div class="btns"><button class="btn btn-p btn-b" data-act="settle-save">Enregistrer le remboursement</button></div>`, { focus: 'st-amt' });
};
ACT['settle-save'] = async () => {
  const amount = num(val('st-amt')); if (!(amount > 0)) return toast('Saisis un montant', 'err');
  const [from, to] = F.dir.split('>'), date = val('st-date') || today();
  closeSheet(); await act(() => put('expenses', uid(), { kind: 'settle', from, to, amount: r2(amount), date, createdBy: A.me, ts: Date.now() }), 'Remboursement enregistré');
};

/* --- loyer, charges fixes, budgets cibles --- */
function updateRent() {
  const n = document.getElementById('rn-calc'); if (!n) return;
  const a = num(val('rn-amount')) || 0, p = num(val('rn-apl')) || 0, rest = Math.max(0, r2(a - p));
  n.innerHTML = `<div class="r"><span>Loyer</span><b>${fmt(a)}</b></div><div class="r"><span>APL déduite</span><b>− ${fmt(p)}</b></div><div class="r t"><span>Reste à charge</span><b>${fmt(rest)}</b></div><div class="r sub"><span>Part de chacun</span><b>${fmt(rest / 2)}</b></div>`;
}
ACT['rent-edit'] = () => {
  const r = cfg().rent; resetF({ paidBy: r.paidBy, apply: true });
  openSheet(() => `<div class="st">Loyer</div><div class="ss">Loyer moins APL, le reste à charge est partagé en deux.</div>
    <div class="row" style="align-items:flex-start"><div class="grow">${lbl('Loyer (€)')}<input class="inp" id="rn-amount" inputmode="decimal" value="${String(r.amount).replace('.', ',')}"></div><div class="grow">${lbl('APL (€)')}<input class="inp" id="rn-apl" inputmode="decimal" value="${String(r.apl).replace('.', ',')}"></div></div>
    <div class="card tint" style="margin-top:14px"><div class="calc" id="rn-calc"></div></div>
    <div class="row" style="align-items:flex-start"><div class="grow">${lbl('Jour du prélèvement')}<input class="inp" id="rn-day" inputmode="numeric" value="${r.day}"></div></div>
    ${lbl('Qui avance le loyer')}${segH('paidBy', [A.me, otherP(A.me)].map(p => ({ id: p, l: p === A.me ? 'Moi' : NAMES[p], i: av(p, 22) })), F.paidBy)}
    <div style="margin-top:8px">${swH('apply', 'Appliquer aussi à ce mois', true)}</div>
    <div class="btns"><button class="btn btn-p btn-b" data-act="rent-save">Enregistrer</button></div>`);
  setTimeout(updateRent, 40);
};
ACT['rent-save'] = async () => {
  const amount = num(val('rn-amount')), apl = num(val('rn-apl')), day = Math.round(num(val('rn-day')));
  if (!isFinite(amount) || amount < 0) return toast('Saisis le montant du loyer', 'err');
  const o = { amount: r2(amount), apl: r2(isFinite(apl) ? apl : 0), day: Math.min(31, Math.max(1, isFinite(day) ? day : 1)), paidBy: F.paidBy }, apply = F.apply;
  closeSheet();
  await act(async () => {
    await patch('settings', 'main', { rent: o, amountsOk: true });
    const eid = 'fx_rent_' + ymOf(today());
    if (apply && D.expenses[eid]) { const rest = Math.max(0, r2(o.amount - o.apl)); await patch('expenses', eid, { amount: rest, paidBy: o.paidBy, mode: '50', shares: buildShares(rest, '50', o.paidBy, 50), note: 'Loyer ' + fmt(o.amount) + ' − APL ' + fmt(o.apl) }); }
  }, 'Loyer mis à jour');
};
function openFixed(id) {
  const f = id ? cfg().fixed.find(x => x.id === id) : null;
  resetF({ id: id || '', cat: f ? f.cat : 'subs', paidBy: f ? f.paidBy : A.me, split: f && f.pct !== 50 ? 'custom' : '50', apply: true });
  F._onpick = (k, v) => { if (k === 'split') { const cu = document.getElementById('fx-custom'); if (cu) cu.hidden = v !== 'custom'; updatePct('fx-pct'); } };
  openSheet(() => `<div class="st">${f ? 'Modifier la charge fixe' : 'Nouvelle charge fixe'}</div><div class="ss">Elle s’ajoute toute seule chaque mois.</div>
    ${lbl('Nom')}<input class="inp" id="fx-label" maxlength="40" value="${esc(f ? f.label : '')}" placeholder="Ex. Assurance habitation" autocomplete="off">
    <div class="row" style="align-items:flex-start"><div class="grow">${lbl('Montant par mois (€)')}<input class="inp" id="fx-amount" inputmode="decimal" value="${f ? String(f.amount).replace('.', ',') : ''}" placeholder="0"></div><div class="grow">${lbl('Jour du prélèvement')}<input class="inp" id="fx-day" inputmode="numeric" value="${f ? f.day : 5}"></div></div>
    ${lbl('Catégorie')}${chipsH('cat', cfg().cats.map(c => ({ id: c.id, l: c.label, i: c.icon })), F.cat).replace('class="chips"', 'class="chips scroll"')}
    ${lbl('Qui avance l’argent')}${segH('paidBy', [A.me, otherP(A.me)].map(p => ({ id: p, l: p === A.me ? 'Moi' : NAMES[p], i: av(p, 22) })), F.paidBy)}
    ${lbl('Répartition')}${segH('split', [{ id: '50', l: '50 / 50' }, { id: 'custom', l: 'Sur mesure' }], F.split)}
    <div id="fx-custom" ${F.split === 'custom' ? '' : 'hidden'} style="margin-top:6px"><input type="range" class="range" id="fx-pct" min="0" max="100" step="5" value="${f ? f.pct : 50}" aria-label="Part de ${NAMES.maxym}"><div class="sm mut" id="fx-pct-t"></div></div>
    <div style="margin-top:8px">${swH('apply', 'Appliquer aussi à ce mois', true)}</div>
    <div class="btns ${f ? 'two' : ''}">${f ? `<button class="btn btn-d" data-act="fx-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="fx-save">Enregistrer</button></div>`, { focus: f ? '' : 'fx-label' });
  setTimeout(() => updatePct('fx-pct'), 40);
}
ACT['fx-edit'] = d => openFixed(d.id);
ACT['fx-save'] = async () => {
  const label = val('fx-label').trim(), amount = num(val('fx-amount')), day = Math.round(num(val('fx-day')));
  if (!label) return toast('Donne un nom à la charge', 'err'); if (!(amount > 0)) return toast('Saisis un montant', 'err');
  const pct = F.split === 'custom' ? Math.round(num(val('fx-pct'))) : 50, fid = F.id, id = fid || uid(), apply = F.apply;
  const item = { id, label, cat: F.cat, amount: r2(amount), day: Math.min(31, Math.max(1, isFinite(day) ? day : 1)), paidBy: F.paidBy, pct: isFinite(pct) ? pct : 50 };
  const list = clone(cfg().fixed), i = list.findIndex(x => x.id === id); if (i >= 0) list[i] = item; else list.push(item);
  closeSheet();
  await act(async () => {
    await patch('settings', 'main', { fixed: list, amountsOk: true });
    const eid = 'fx_' + id + '_' + ymOf(today());
    if (apply && D.expenses[eid]) { const mode = item.pct === 50 ? '50' : 'custom'; await patch('expenses', eid, { amount: item.amount, cat: item.cat, paidBy: item.paidBy, mode, shares: buildShares(item.amount, mode, item.paidBy, item.pct), note: item.label }); }
  }, 'Charge enregistrée');
};
ACT['fx-del'] = async () => { const id = F.id, list = clone(cfg().fixed).filter(x => x.id !== id); closeSheet(); await act(() => patch('settings', 'main', { fixed: list }), 'Charge supprimée'); };
ACT['tgt-edit'] = d => {
  const cur = d.id ? (cfg().targets[d.id] || 0) : 0; resetF({ cat: d.id || 'dining' });
  openSheet(() => `<div class="st">Budget cible</div><div class="ss">Plafond mensuel des dépenses communes pour une catégorie.</div>
    <div class="amt"><input id="tg-amt" inputmode="decimal" autocomplete="off" placeholder="0" value="${cur ? String(cur).replace('.', ',') : ''}"><span>€</span></div>
    ${lbl('Catégorie')}<div class="pgrid">${cfg().cats.map(c => `<button type="button" data-pick="cat" data-val="${esc(c.id)}" class="${c.id === F.cat ? 'on' : ''}" style="--pc:${esc(c.color)}"><b>${esc(c.icon)}</b><span>${esc(c.label)}</span></button>`).join('')}</div>
    <div class="btns ${cur ? 'two' : ''}">${cur ? `<button class="btn btn-d" data-act="tgt-del">Retirer</button>` : ''}<button class="btn btn-p" data-act="tgt-save">Enregistrer</button></div>`, { focus: 'tg-amt' });
};
ACT['tgt-save'] = async () => { const a = num(val('tg-amt')); if (!(a > 0)) return toast('Saisis un plafond', 'err'); const cat = F.cat; closeSheet(); await act(() => patch('settings', 'main', { targets: { [cat]: r2(a) } }), 'Budget enregistré'); };
ACT['tgt-del'] = async () => { const cat = F.cat; closeSheet(); await act(() => patch('settings', 'main', { targets: { [cat]: 0 } }), 'Budget retiré'); };

/* --- revenus --- */
function openIncome(id) {
  const m = A.bud.month, it = id ? incItems(m).find(x => x.id === id) : null;
  resetF({ id: id || '', lab: it ? it.label : 'Salaire' });
  F._onpick = (k, v) => { if (k === 'lab') { const n = document.getElementById('in-label'); if (n) n.value = v; } };
  openSheet(() => `<div class="st">${it ? 'Modifier la rentrée' : 'Nouvelle rentrée'}</div><div class="ss">${esc(monthLabel(m))} · visible par toi seul</div>
    <div class="amt"><input id="in-amt" inputmode="decimal" autocomplete="off" placeholder="0" value="${it ? String(it.amount).replace('.', ',') : ''}"><span>€</span></div>
    ${lbl('Type')}${chipsH('lab', [{ id: 'Salaire', l: 'Salaire' }, { id: 'Aides', l: 'Aides' }, { id: 'Autre', l: 'Autre' }], F.lab)}
    ${lbl('Libellé')}<input class="inp" id="in-label" maxlength="40" value="${esc(it ? it.label : 'Salaire')}" autocomplete="off">
    <div class="btns ${it ? 'two' : ''}">${it ? `<button class="btn btn-d" data-act="inc-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="inc-save">Enregistrer</button></div>`, { focus: it ? '' : 'in-amt' });
}
ACT['inc-new'] = () => openIncome('');
ACT['inc-edit'] = d => openIncome(d.id);
const saveIncomes = (m, items, msg) => act(() => patch('priv', 'income_' + m, { month: m, items }), msg);
ACT['inc-save'] = async () => {
  const a = num(val('in-amt')); if (!(a >= 0) || !isFinite(a)) return toast('Saisis un montant', 'err');
  const m = A.bud.month, items = clone(incItems(m)), fid = F.id, it = { id: fid || uid(), label: val('in-label').trim() || 'Revenu', amount: r2(a) };
  const i = items.findIndex(x => x.id === it.id); if (i >= 0) items[i] = it; else items.push(it);
  closeSheet(); await saveIncomes(m, items, 'Enregistré');
};
ACT['inc-del'] = async () => { const m = A.bud.month, id = F.id, items = clone(incItems(m)).filter(x => x.id !== id); closeSheet(); await saveIncomes(m, items, 'Supprimé'); };
ACT['inc-copy'] = () => { const m = A.bud.month, items = clone(incItems(addM(m, -1))).map(x => Object.assign(x, { id: uid() })); saveIncomes(m, items, 'Rentrées reprises'); };

/* --- épargne --- */
function openGoal(id) {
  const g = id ? D.goals[id] : null; resetF({ id: id || '' });
  openSheet(() => `<div class="st">${g ? 'Modifier l’objectif' : 'Nouvel objectif commun'}</div>
    ${lbl('Nom')}<input class="inp" id="gl-name" maxlength="50" placeholder="Ex. Voyage d’été" value="${esc(g ? g.name : '')}" autocomplete="off">
    ${lbl('Montant à atteindre (€)')}<input class="inp" id="gl-target" inputmode="decimal" placeholder="0" value="${g ? String(g.target).replace('.', ',') : ''}">
    <div class="btns ${g ? 'two' : ''}">${g ? `<button class="btn btn-d" data-act="goal-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="goal-save">Enregistrer</button></div>`, { focus: g ? '' : 'gl-name' });
}
ACT['goal-new'] = () => openGoal('');
ACT['goal-edit'] = d => openGoal(d.id);
ACT['goal-save'] = async () => {
  const name = val('gl-name').trim(), t = num(val('gl-target')); if (!name) return toast('Donne un nom à l’objectif', 'err'); if (!(t > 0)) return toast('Saisis le montant visé', 'err');
  const fid = F.id, id = fid || uid(); closeSheet(); await act(() => patch('goals', id, { name, target: r2(t), ts: (D.goals[id] && D.goals[id].ts) || Date.now() }), 'Objectif enregistré');
};
ACT['goal-del'] = () => {
  const id = F.id; confirmSheet({ title: 'Supprimer l’objectif ?', text: 'Les contributions enregistrées seront supprimées aussi.', ok: 'Supprimer', danger: true, onOk: () => act(async () => { for (const [cid, c] of Object.entries(D.contribs)) if (c.goalId === id) await del('contribs', cid); await del('goals', id); }, 'Objectif supprimé') });
};
function openContrib(goalId, id) {
  const c = id ? D.contribs[id] : null; resetF({ id: id || '', goalId: c ? c.goalId : goalId, who: c ? c.who : A.me });
  openSheet(() => `<div class="st">${c ? 'Modifier la contribution' : 'Nouvelle contribution'}</div>
    <div class="amt"><input id="ct-amt" inputmode="decimal" autocomplete="off" placeholder="0" value="${c ? String(c.amount).replace('.', ',') : ''}"><span>€</span></div>
    ${lbl('Versé par')}${segH('who', [A.me, otherP(A.me)].map(p => ({ id: p, l: p === A.me ? 'Moi' : NAMES[p], i: av(p, 22) })), F.who)}
    ${lbl('Date')}<input class="inp" type="date" id="ct-date" value="${esc(c ? c.date : today())}">
    <div class="btns ${c ? 'two' : ''}">${c ? `<button class="btn btn-d" data-act="contrib-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="contrib-save">Enregistrer</button></div>`, { focus: c ? '' : 'ct-amt' });
}
ACT['contrib-new'] = d => openContrib(d.id, '');
ACT['contrib-edit'] = d => openContrib('', d.id);
ACT['contrib-save'] = async () => {
  const a = num(val('ct-amt')); if (!(a > 0)) return toast('Saisis un montant', 'err');
  const { goalId, who } = F, fid = F.id, id = fid || uid(), date = val('ct-date') || today();
  closeSheet(); await act(() => put('contribs', id, { goalId, who, amount: r2(a), date, ts: Date.now() }), 'Contribution enregistrée');
};
ACT['contrib-del'] = async () => { const id = F.id; closeSheet(); await act(() => del('contribs', id), 'Contribution supprimée'); };

/* --- export CSV du mois --- */
const caps = {};
async function getCap(n) { if (caps[n] !== undefined) return caps[n]; try { caps[n] = window.claude && window.claude.use ? await window.claude.use(n) : null; } catch (e) { caps[n] = null; } return caps[n]; }
const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
const csvNum = n => String(r2(n)).replace('.', ',');
ACT['bud-csv'] = async () => {
  const m = A.bud.month, rows = allExp().filter(e => e.date && e.date.slice(0, 7) === m).slice().reverse();
  if (!rows.length) return toast('Aucune opération ce mois-ci', 'err');
  const lines = [['Date', 'Type', 'Catégorie', 'Description', 'Montant (€)', 'Payé par', 'Répartition', 'Part ' + NAMES.maxym + ' (€)', 'Part ' + NAMES.sasha + ' (€)'].map(csvCell).join(';')];
  rows.forEach(e => {
    if (e.kind === 'settle') lines.push([e.date, 'Remboursement', '', NAMES[e.from] + ' → ' + NAMES[e.to], csvNum(e.amount), NAMES[e.from], '', '', ''].map(csvCell).join(';'));
    else { const sh = e.shares || {}; lines.push([e.date, e._loc === 'priv' ? 'Dépense perso' : 'Dépense commune', catById(e.cat).label, e.note || '', csvNum(e.amount), NAMES[e.paidBy], e.mode === 'perso' ? 'Perso' : e.mode === 'custom' ? 'Sur mesure' : '50/50', csvNum(sh.maxym || 0), csvNum(sh.sasha || 0)].map(csvCell).join(';')); }
  });
  const csv = '﻿' + lines.join('\r\n'), dl = await getCap('downloads');
  if (dl) { try { await dl.save({ filename: 'budget-' + m + '.csv', data: csv }); toast('Export prêt'); return; } catch (e) { if (e && e.code === 'declined') return; } }
  resetF(); openSheet(() => `<div class="st">Export CSV</div><div class="ss">Copie ce texte dans un tableur (séparateur : point-virgule).</div><textarea class="inp" id="csv-box" readonly style="min-height:220px;margin-top:12px;font-family:ui-monospace,Menlo,monospace;font-size:12px">${esc(csv)}</textarea><div class="btns"><button class="btn btn-p btn-b" data-act="csv-copy">${ico('copy', 20)}Copier</button></div>`);
};
ACT['csv-copy'] = async () => {
  const n = document.getElementById('csv-box'); if (!n) return; n.select();
  try { await navigator.clipboard.writeText(n.value); toast('Copié'); } catch (e) { toast('Sélectionné : copie avec ton clavier', 'err'); }
};
