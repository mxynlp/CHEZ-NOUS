
/* ---------- 9. Planning de présence : Mois > Semaine > Jour ---------- */
/* ---- Sélection de plusieurs jours (comme l'app Calendrier) ----
   Un ensemble de dates : touche pour (dé)sélectionner, glisse pour peindre, appui long pour démarrer.
   Touche un numéro de semaine (S41) ou une lettre (L, M…) pour tout choisir d'un coup. Persiste d'un mois / d'une semaine à l'autre. */
const SEL = { on: false, set: new Set() };
const selDays = () => [...SEL.set].sort();
const selCls = d => SEL.on && SEL.set.has(d) ? ' sel' : '';
const selReset = () => { SEL.on = false; SEL.set.clear(); };
const selBtn = () => `<button class="chip${SEL.on ? ' on' : ''}" data-act="sel-toggle">${SEL.on ? 'Terminer' : ico('check', 16, 2.6) + 'Sélectionner'}</button>`;
function selSummary() {
  const r = selDays(), n = r.length; if (!n) return 'Touche ou fais glisser';
  const f = d => fmtD(d, { weekday: 'short', day: 'numeric', month: 'short' });
  if (diffDays(r[0], r[n - 1]) === n - 1) return n === 1 ? f(r[0]) : f(r[0]) + ' → ' + f(r[n - 1]);
  const wk = new Set(r.map(d => monday(d))).size; return 'sur ' + wk + ' semaine' + (wk > 1 ? 's' : '');
}
function selCard() {
  if (!SEL.on) return '';
  const wk = A.plan.level === 'week';
  return `<div class="card selcard"><div class="sm" style="font-weight:600">${wk ? 'Touche les jours. Les flèches changent de semaine sans perdre ta sélection.' : 'Touche ou fais glisser. Touche un numéro de semaine ou une lettre pour tout choisir.'}</div>
    <div class="chips" style="margin-top:8px">${wk ? `<button class="chip" data-act="sel-weekview">Toute la semaine</button>` : `<button class="chip" data-act="sel-month">Tout le mois</button>`}<button class="chip" data-act="sel-expand">Semaines entières</button><button class="chip" data-act="sel-clear">Effacer</button></div></div>`;
}
function selBarHtml() {
  const n = SEL.set.size;
  return `<div class="selbar-in"><button class="btn btn-g" data-act="sel-cancel">Annuler</button><div class="selbar-t"><b>${n ? n + ' jour' + (n > 1 ? 's' : '') : 'Aucun jour'}</b><span>${esc(selSummary())}</span></div><button class="btn btn-p" data-act="sel-open"${n ? '' : ' disabled'}>Définir</button></div>`;
}
function renderSelBar() {
  const el = document.getElementById('selbar'); if (!el) return;
  if (SEL.on && A.tab !== 'plan') selReset();
  document.body.classList.toggle('selmode', SEL.on);
  el.classList.toggle('on', SEL.on); el.innerHTML = SEL.on ? selBarHtml() : '';
}
function selPaint(d, on) {
  if (on) SEL.set.add(d); else SEL.set.delete(d);
  document.querySelectorAll('[data-d="' + d + '"].mc, [data-d="' + d + '"].dh').forEach(x => x.classList.toggle('sel', on));
  renderSelBar();
}
const selCells = '.mc[data-d],.dh[data-d]';
let DRAG = null, LP = null, LPS = false;
document.addEventListener('pointerdown', e => {
  const c = e.target.closest && e.target.closest(selCells); if (!c || (e.button && e.button > 0)) return;
  const d = c.dataset.d;
  if (SEL.on) { DRAG = { on: !SEL.set.has(d), last: d }; selPaint(d, DRAG.on); return; }
  if (A.tab === 'plan' && A.plan.level !== 'day' && !SH) {
    LP = { x: e.clientX, y: e.clientY, d, t: setTimeout(() => { if (!LP) return; LP.fired = true; LPS = true; setTimeout(() => { LPS = false; }, 700); SEL.on = true; SEL.set.add(d); if (navigator.vibrate) { try { navigator.vibrate(10); } catch (er) { /* */ } } schedule(); }, 420) };
  }
});
document.addEventListener('pointermove', e => {
  if (DRAG) {
    const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest && el.closest(selCells);
    if (c && c.dataset.d !== DRAG.last) { const a = DRAG.last, b = c.dataset.d, lo = a < b ? a : b, hi = a < b ? b : a; for (let x = lo, i = 0; x <= hi && i < 120; x = addDays(x, 1), i++) selPaint(x, DRAG.on); DRAG.last = b; }
  } else if (LP && !LP.fired && Math.hypot(e.clientX - LP.x, e.clientY - LP.y) > 10) { clearTimeout(LP.t); LP = null; }
});
const endPtr = () => { if (DRAG) { DRAG = null; schedule(); } if (LP) { clearTimeout(LP.t); LP = null; } };
document.addEventListener('pointerup', endPtr); document.addEventListener('pointercancel', endPtr);
document.addEventListener('click', e => {
  if (LPS) { LPS = false; e.stopPropagation(); e.preventDefault(); return; }
  if (!SEL.on || e.detail !== 0) return;               // clic clavier (Entrée / Espace) : le pointeur gère déjà souris et doigt
  const c = e.target.closest && e.target.closest(selCells); if (c) { selPaint(c.dataset.d, !SEL.set.has(c.dataset.d)); schedule(); }
}, true);
const slotLbl = k => SLOTS.find(s => s.k === k).l;
function vPlan() { const l = A.plan.level; return l === 'month' ? planMonth() : l === 'week' ? planWeek() : planDay(); }
const levelSeg = () => `<div class="seg">${[['month', 'Mois'], ['week', 'Semaine'], ['day', 'Jour']].map(([k, l]) => `<button class="${A.plan.level === k ? 'on' : ''}" data-act="plan-level" data-v="${k}">${l}</button>`).join('')}</div>`;
const todayChip = `<button class="chip" data-act="plan-today">Aujourd’hui</button>`;
const legendH = () => `<div class="legend">${cfg().places.map(p => `<span style="--pc:${esc(p.color)}"><i></i>${esc(p.icon)} ${esc(p.label)}</span>`).join('')}</div>`;

function slotBtn(p, d, k) {
  const pl = placeById(slotPlace(p, d, k)), rec = isRec(p, d, k), tg = together(d, k);
  return `<button class="sl${pl ? '' : ' empty'}${tg ? ' tg' : ''}"${pl ? ` style="--pc:${esc(pl.color)}"` : ''} data-act="slot" data-p="${p}" data-d="${d}" data-s="${k}" aria-label="${esc(NAMES[p] + ', ' + dayLong(d) + ', ' + slotLbl(k) + ' : ' + (pl ? pl.label : 'non renseigné'))}">${pl ? esc(pl.icon) : '+'}${rec ? `<span class="rp">${ico('repeat', 11, 2.4)}</span>` : ''}</button>`;
}

/* --- vue Mois --- */
function planMonth() {
  const m = A.plan.month, t = today(), first = m + '-01', start = addDays(first, -wdi(first)), rows = Math.ceil((wdi(first) + dim(m)) / 7), sm = SEL.on;
  let cells = '';
  for (let i = 0; i < rows * 7; i++) {
    const d = addDays(start, i), inM = ymOf(d) === m;
    if (sm && i % 7 === 0) cells += `<button class="mw" data-act="sel-week" data-d="${d}" aria-label="Semaine ${isoWeek(d)}">${isoWeek(d)}</button>`;
    cells += `<button class="mc${inM ? '' : ' out'}${wdi(d) >= 5 ? ' we' : ''}${d === t ? ' today' : ''}${togetherCount(d) ? ' tg' : ''}${selCls(d)}"${sm ? '' : ' data-act="plan-week-of"'} data-d="${d}" aria-label="${esc(dayLong(d))}"><span class="n">${pd(d).getDate()}</span>${miniRows(d)}<span class="dots">${dotsFor(eventsOn(d))}</span></button>`;
  }
  const mhead = sm ? `<div class="mh"></div>` + DAYL.map((l, i) => `<button class="mh" data-act="sel-wd" data-i="${i}">${l}</button>`).join('') : DAYL.map(l => `<div class="mh">${l}</div>`).join('');
  return `<div class="page">${hdr('Planning', '', { right: todayChip, extra: `<div class="lvrow">${levelSeg()}${selBtn()}</div>` + navRow('plan-prev', 'plan-next', monthLabel(m)) })}<div class="content">${selCard()}
    <div class="card" style="padding:12px 10px"><div class="month${sm ? ' selm' : ''}">${mhead}${cells}</div></div>
    <div class="legend"><span>${av('maxym', 18)}en haut</span><span>${av('sasha', 18)}en bas</span><span>trois segments : matin, après-midi, soir</span><span><i style="--pc:var(--mint);border-radius:50%"></i>cadre vert : ensemble à la maison</span></div>
    ${legendH()}<p class="mut sm" style="margin-top:14px">${SEL.on ? '' : 'Touche un jour pour voir sa semaine. Pour en choisir plusieurs : « Sélectionner », ou appui long sur un jour.'}</p></div></div>`;
}

/* --- vue Semaine --- */
function planWeek() {
  const w = monday(A.plan.date), t = today(), end = addDays(w, 6), days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i)), order = [A.me, otherP(A.me)];
  const label = `${pd(w).getDate()}${ymOf(w) !== ymOf(end) ? ' ' + fmtD(w, { month: 'short' }) : ''} – ${fmtD(end, { day: 'numeric', month: 'long' })}`;
  let g = `<div class="wk${SEL.on ? ' selm' : ''}"><span></span>${days.map((d, i) => `<button class="dh${d === t ? ' today' : ''}${i >= 5 ? ' we' : ''}${selCls(d)}"${SEL.on ? '' : ' data-act="plan-day-of"'} data-d="${d}" aria-label="${esc(dayLong(d))}">${DAYS[i]}<b>${pd(d).getDate()}</b><span class="dd">${dotsFor(eventsOn(d))}</span></button>`).join('')}`;
  order.forEach(p => { g += `<div class="pl">${av(p, 30)}</div>` + days.map((d, i) => `<div class="c3${i >= 5 ? ' we' : ''}">${SLOTS.map(s => slotBtn(p, d, s.k)).join('')}</div>`).join('') + '<div class="sp6"></div>'; });
  g += '</div>';
  let tog = 0; days.forEach(d => { tog += togetherCount(d); });
  const evs = []; days.forEach(d => eventsOn(d).forEach(e => evs.push(e)));
  const nRec = Object.keys(D.recurring).length;
  return `<div class="page">${hdr('Planning', 'Semaine ' + isoWeek(w), { right: todayChip, extra: `<div class="lvrow">${levelSeg()}${selBtn()}</div>` + navRow('plan-prev', 'plan-next', label) })}<div class="content">${selCard()}
    <div class="card" style="padding:12px 10px">${g}
      <div class="legend" style="padding:0 6px"><span>De haut en bas : matin, après-midi, soir</span>${tog ? `<span class="pill ok">${ico('heart', 13)}${tog} moment${tog > 1 ? 's' : ''} ensemble</span>` : ''}</div></div>
    <button class="wehl" data-act="weekend" data-d="${addDays(w, 5)}">${ico('sparkle', 22)}Programme du week-end<span class="grow"></span>${ico('chevR', 20)}</button>
    <div class="card"><h3>${ico('clock', 18)}Événements<span class="sp"></span><button class="lk" data-act="ev-new">Ajouter</button></h3>
      ${evs.length ? evs.map(e => { const pl = placeById(e.place); return `<button class="evrow" data-act="ev-edit" data-id="${esc(e.id)}"><span class="evd"><small>${esc(DAYS[wdi(e.date)])}</small><b>${pd(e.date).getDate()}</b></span><span class="grow"><div class="t" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.title)}</div><div class="s sm mut">${e.time ? esc(e.time) : 'Toute la journée'}${pl ? ' · ' + esc(pl.icon) + ' ' + esc(pl.label) : ''}</div></span>${avs(whoList(e.who || 'both'))}</button>`; }).join('') : emptyH('cal', 'Rien de prévu cette semaine', 'Ajoute un dîner, un rendez-vous ou un week-end.', `<br><button class="btn btn-s btn-sm" data-act="ev-new">${ico('plus', 18)}Nouvel événement</button>`)}</div>
    ${legendH()}
    <div class="wkrow"><button class="btn btn-s btn-sm" data-act="rec-open">${ico('repeat', 18)}Répétitions${nRec ? ' (' + nRec + ')' : ''}</button><button class="btn btn-s btn-sm" data-act="tpl-open">${ico('copy', 18)}Modèles</button><button class="btn btn-s btn-sm" data-act="free-open">${ico('heart', 18)}À deux</button><button class="btn btn-s btn-sm" data-act="items-open" data-k="places">${ico('sliders', 18)}Lieux</button></div></div></div>`;
}

/* --- vue Jour --- */
function planDay() {
  const d = A.plan.date, t = today(), order = [A.me, otherP(A.me)], evs = eventsOn(d), exps = allExp().filter(e => e.date === d && e.kind !== 'settle');
  const rel = d === t ? 'Aujourd’hui' : d === addDays(t, 1) ? 'Demain' : d === addDays(t, -1) ? 'Hier' : wdi(d) >= 5 ? 'Week-end' : '';
  const tgs = SLOTS.filter(s => together(d, s.k));
  const gro = r2(exps.filter(e => e.cat === 'groceries').reduce((a, e) => a + e.amount, 0));
  const pres = `<div class="pres">${order.map(p => `<div class="presc"><div class="ph">${av(p, 28)}${esc(NAMES[p])}${p === A.me ? '<span class="mut sm" style="font-weight:500">(toi)</span>' : ''}</div>${SLOTS.map(s => { const pl = placeById(slotPlace(p, d, s.k)); return `<button class="pb${together(d, s.k) ? ' tg' : ''}"${pl ? ` style="--pc:${esc(pl.color)}"` : ''} data-act="slot" data-p="${p}" data-d="${d}" data-s="${s.k}"><small>${s.k === 'a' ? 'Après-m.' : s.l}</small><span class="e">${pl ? esc(pl.icon) : '＋'}</span><b>${pl ? esc(pl.label) : 'À définir'}</b></button>`; }).join('')}</div>`).join('')}</div>`;
  const mealRow = (k, l) => { const m = mealOf(d, k); return `<button class="li" data-act="meal-edit" data-d="${d}" data-k="${k}"><span class="ic sm">${ico('meal', 18)}</span><span class="grow"><div class="t">${m ? esc(m.name) : 'Pas encore prévu'}</div><div class="s">${l}${m ? ' · ' + esc(whoName(m.who)) : ''}</div></span>${ico('chevR', 18)}</button>`; };
  return `<div class="page">${hdr(dayLong(d), rel, { back: 'plan-up', right: todayChip, extra: levelSeg() + navRow('plan-prev', 'plan-next', DAYN[wdi(d)].replace(/^./, c => c.toUpperCase()), fmtD(d, { day: 'numeric', month: 'long', year: 'numeric' })) })}<div class="content">
    ${pres}
    ${tgs.length ? `<div class="note info" style="margin-top:12px"><span style="color:var(--accent-ink)">${ico('heart', 22)}</span><div class="grow"><b>Ensemble à la maison</b>${tgs.map(s => s.l.toLowerCase()).join(', ')}</div></div>` : ''}
    <div class="card"><h3>${ico('clock', 18)}Au programme<span class="sp"></span><button class="lk" data-act="ev-new-d" data-d="${d}">Ajouter</button></h3>
      ${evs.length ? `<div class="tl">${evs.map(e => { const pl = placeById(e.place); return `<div class="tr"><span class="tm">${e.time ? esc(e.time) : 'Jour'}</span><button class="evc" data-act="ev-edit" data-id="${esc(e.id)}"><span class="ic sm" style="--pc:${esc(pl ? pl.color : '#7FB89A')}">${pl ? esc(pl.icon) : '🗓️'}</span><span class="grow"><div class="t">${esc(e.title)}</div><div class="s">${pl ? esc(pl.label) : 'Lieu non précisé'}${e.note ? ' · ' + esc(e.note) : ''}</div></span>${e.remind ? `<span style="color:var(--accent-ink)">${ico('bell', 18)}</span>` : ''}${avs(whoList(e.who || 'both'))}</button></div>`; }).join('')}</div>` : `<p class="mut sm">Rien de prévu ce jour-là.</p>`}</div>
    <div class="card"><h3>${ico('meal', 18)}Repas</h3>${mealRow('lunch', 'Midi')}${mealRow('dinner', 'Soir')}</div>
    <div class="card"><h3>${ico('wallet', 18)}Dépenses du jour<span class="sp"></span><button class="lk" data-act="exp-new-d" data-d="${d}">Ajouter</button></h3>
      ${gro > 0 ? `<div class="pill ok" style="margin-bottom:8px">${ico('cart', 14)}Courses : ${fmt(gro)}</div>` : ''}
      ${exps.length ? exps.map(e => { const c = catById(e.cat); return `<button class="li" data-act="exp-edit" data-id="${esc(e.id)}"><span class="ic sm" style="--pc:${esc(c.color)}">${esc(c.icon)}</span><span class="grow"><div class="t">${esc(e.note || c.label)}</div><div class="s">${e.paidBy === A.me ? 'Payé par toi' : 'Payé par ' + esc(NAMES[e.paidBy])}${e._loc === 'priv' ? ' · perso' : ''}</div></span><span class="amount">${fmt(e.amount)}</span></button>`; }).join('') : `<p class="mut sm">Aucune dépense enregistrée ce jour-là.</p>`}</div></div></div>`;
}

/* --- navigation --- */
const planStep = n => { const P = A.plan; if (P.level === 'month') P.month = addM(P.month, n); else P.date = addDays(P.date, P.level === 'week' ? 7 * n : n); A.anim = n > 0 ? 'a-slL' : 'a-slR'; A.resetScroll = P.level === 'day'; schedule(); };
ACT['plan-prev'] = () => planStep(-1);
ACT['plan-next'] = () => planStep(1);
ACT['plan-today'] = () => { A.plan.date = today(); A.plan.month = ymOf(today()); A.anim = 'a-fade'; schedule(); };
ACT['plan-level'] = d => {
  if (d.v === 'day' && SEL.on) selReset();
  const P = A.plan, ord = { month: 0, week: 1, day: 2 }, v = d.v; if (v === P.level) return;
  if (v === 'month') P.month = ymOf(P.date);
  else if (P.level === 'month' && ymOf(P.date) !== P.month) P.date = ymOf(today()) === P.month ? today() : P.month + '-01';
  A.anim = ord[v] > ord[P.level] ? 'a-zin' : 'a-zout'; P.level = v; A.resetScroll = true; schedule();
};
ACT['plan-up'] = () => ACT['plan-level']({ v: A.plan.level === 'day' ? 'week' : 'month' });
ACT['plan-week-of'] = d => { A.plan.date = d.d; A.plan.level = 'week'; A.anim = 'a-zin'; A.resetScroll = true; schedule(); };
ACT['plan-day-of'] = d => { A.plan.date = d.d; A.plan.level = 'day'; A.anim = 'a-zin'; A.resetScroll = true; schedule(); };

/* --- saisie d'un créneau --- */
ACT.slot = d => {
  resetF({ person: d.p, date: d.d, slot: d.s, whole: false, weekly: false });
  openSheet(() => `<div class="st">${esc(NAMES[d.p])}${d.p === A.me ? ' (toi)' : ''}</div><div class="ss">${esc(dayLong(d.d))} · ${slotLbl(d.s)}</div>
    <div style="margin-top:8px">${swH('whole', 'Appliquer à toute la journée', false)}${swH('weekly', 'Répéter chaque ' + DAYN[wdi(d.d)], false)}</div>
    ${lbl('Où ?')}<div class="pgrid">${cfg().places.map(p => `<button data-act="slot-set" data-v="${esc(p.id)}" style="--pc:${esc(p.color)}"><b>${esc(p.icon)}</b><span>${esc(p.label)}</span></button>`).join('')}</div>
    <div class="btns two"><button class="btn btn-s" data-act="slot-set" data-v="">Effacer</button><button class="btn btn-g" data-act="items-open" data-k="places">Gérer les lieux</button></div>`);
};
ACT['slot-set'] = async d => {
  const place = d.v, { person, date, slot, whole, weekly } = F, slots = whole ? SLOTS.map(s => s.k) : [slot];
  closeSheet();
  await act(async () => {
    if (weekly) {
      if (place === '') { for (const [id, r] of Object.entries(D.recurring)) if (r.person === person && r.wd === wdi(date) && slots.some(s => (r.slots || []).includes(s))) await del('recurring', id); }
      else await put('recurring', uid(), { person, wd: wdi(date), slots, place, from: date, ts: Date.now() });
    }
    const upd = { date }; upd[person] = {}; slots.forEach(s => { upd[person][s] = place; });
    await patch('presence', date, upd);
  }, place ? 'C’est noté' : 'Effacé');
};
ACT['rec-open'] = () => {
  resetF();
  openSheet(() => {
    const list = Object.entries(D.recurring).map(([id, r]) => ({ id, ...r })).sort((a, b) => a.wd - b.wd);
    return `<div class="st">Répétitions chaque semaine</div><div class="ss">Elles remplissent le planning tant que tu ne saisis pas autre chose pour un jour précis.</div>
    <div style="margin-top:10px">${list.length ? list.map(r => { const pl = placeById(r.place); return `<div class="li"><span class="ic sm" style="--pc:${esc(pl ? pl.color : '#B5BDB8')}">${pl ? esc(pl.icon) : '📍'}</span><span class="grow"><div class="t">${esc(NAMES[r.person] || '')} · chaque ${DAYN[r.wd]}</div><div class="s">${pl ? esc(pl.label) : 'Lieu supprimé'} · ${(r.slots || []).map(slotLbl).join(', ')}</div></span><button class="ib flat" data-act="rec-del" data-id="${esc(r.id)}" aria-label="Supprimer">${ico('trash', 20)}</button></div>`; }).join('') : emptyH('repeat', 'Aucune répétition', 'Touche un créneau puis active « Répéter chaque … » pour en créer une.')}</div>`;
  }, { live: true });
};
ACT['rec-del'] = d => act(() => del('recurring', d.id), 'Répétition supprimée');

/* --- programme du week-end --- */
ACT.weekend = d => {
  resetF(); const sat = d.d;
  openSheet(() => {
    const block = day => {
      const evs = eventsOn(day), ml = mealOf(day, 'lunch'), md = mealOf(day, 'dinner'), tgs = SLOTS.filter(s => together(day, s.k));
      return `<div class="card tint" style="margin-top:12px"><div class="row"><b class="grow">${esc(dayLong(day))}</b><button class="btn btn-g" style="min-height:36px" data-act="go-day-close" data-d="${day}">Ouvrir</button></div>
      ${[A.me, otherP(A.me)].map(p => `<div class="row" style="margin-top:8px">${av(p, 26)}<span class="grow sm">${SLOTS.map(s => { const pl = placeById(slotPlace(p, day, s.k)); return `${pl ? esc(pl.icon) : '–'} <span class="mut">${s.k === 'a' ? 'après-midi' : s.l.toLowerCase()}</span>`; }).join('  ·  ')}</span></div>`).join('')}
      ${tgs.length ? `<div style="margin-top:8px"><span class="pill ok">${ico('heart', 13)}Ensemble : ${tgs.map(s => s.l.toLowerCase()).join(', ')}</span></div>` : ''}
      <div class="sm" style="margin-top:10px"><b>Midi</b> ${ml ? esc(ml.name) : '<span class="mut">à prévoir</span>'}<br><b>Soir</b> ${md ? esc(md.name) : '<span class="mut">à prévoir</span>'}</div>
      ${evs.length ? `<div style="margin-top:8px">${evs.map(e => `<div class="sm">${icoI('clock', 14)} ${e.time ? esc(e.time) + ' · ' : ''}<b>${esc(e.title)}</b></div>`).join('')}</div>` : `<div class="sm mut" style="margin-top:8px">Aucun événement</div>`}</div>`;
    };
    return `<div class="st">Programme du week-end</div><div class="ss">${esc(dayShort(sat))} et ${esc(dayShort(addDays(sat, 1)))}</div>${block(sat)}${block(addDays(sat, 1))}`;
  }, { live: true });
};
ACT['go-day-close'] = d => { closeSheet(); ACT['go-day'](d); };

/* --- événements --- */
function openEvent(o) {
  const ex = o.id ? D.events[o.id] : null;
  resetF({ id: o.id || '', place: ex ? ex.place || '' : '', who: ex ? ex.who || 'both' : 'both', remind: ex ? !!ex.remind : false });
  const places = [{ id: '', l: 'Non précisé' }].concat(cfg().places.map(p => ({ id: p.id, l: p.label, i: p.icon })));
  openSheet(() => `<div class="st">${ex ? 'Modifier l’événement' : 'Nouvel événement'}</div>
    ${lbl('Titre')}<input class="inp" id="ev-title" maxlength="80" placeholder="Ex. Dîner chez les parents" value="${esc(ex ? ex.title : '')}" autocomplete="off">
    <div class="row" style="align-items:flex-start"><div class="grow">${lbl('Date')}<input class="inp" id="ev-date" type="date" value="${esc(ex ? ex.date : (o.date || today()))}"></div><div class="grow">${lbl('Heure')}<input class="inp" id="ev-time" type="time" value="${esc(ex ? ex.time || '' : '')}"></div></div>
    ${lbl('Qui participe')}${segH('who', [{ id: A.me, l: 'Moi' }, { id: otherP(A.me), l: NAMES[otherP(A.me)] }, { id: 'both', l: 'Nous deux' }], F.who)}
    ${lbl('Lieu')}${chipsH('place', places, F.place).replace('class="chips"', 'class="chips scroll"')}
    ${lbl('Note')}<textarea class="inp" id="ev-note" placeholder="Facultatif">${esc(ex ? ex.note || '' : '')}</textarea>
    ${swH('remind', 'Rappel visuel sur l’accueil', F.remind)}
    <div class="btns ${ex ? 'two' : ''}">${ex ? `<button class="btn btn-d" data-act="ev-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="ev-save">Enregistrer</button></div>`, { focus: ex ? '' : 'ev-title' });
}
ACT['ev-edit'] = d => openEvent({ id: d.id });
ACT['ev-new-d'] = d => openEvent({ date: d.d });
ACT['ev-save'] = async () => {
  const title = val('ev-title').trim(), date = val('ev-date');
  if (!title) return toast('Donne un titre à l’événement', 'err'); if (!date) return toast('Choisis une date', 'err');
  const fid = F.id, id = fid || uid();
  const o = { title, date, time: val('ev-time') || '', who: F.who, place: F.place || '', note: val('ev-note').trim(), remind: !!F.remind, createdBy: A.me, ts: Date.now() };
  closeSheet(); await act(() => put('events', id, o), fid ? 'Événement modifié' : 'Événement ajouté');
};
ACT['ev-del'] = async () => { const id = F.id; closeSheet(); await act(() => del('events', id), 'Événement supprimé'); };

/* --- sélection multiple : actions --- */
ACT['sel-toggle'] = () => { if (SEL.on) selReset(); else { SEL.on = true; SEL.set.clear(); if (A.plan.level === 'day') { A.plan.level = 'week'; } } schedule(); };
ACT['sel-cancel'] = () => { selReset(); schedule(); };
ACT['sel-clear'] = () => { SEL.set.clear(); schedule(); };
const toggleMany = days => { const all = days.every(d => SEL.set.has(d)); days.forEach(d => { if (all) SEL.set.delete(d); else SEL.set.add(d); }); schedule(); };
ACT['sel-week'] = d => toggleMany([0, 1, 2, 3, 4, 5, 6].map(i => addDays(d.d, i)));
ACT['sel-weekview'] = () => { const w = monday(A.plan.date); toggleMany([0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i))); };
ACT['sel-month'] = () => { const m = A.plan.month; toggleMany(Array.from({ length: dim(m) }, (_, i) => m + '-' + pad(i + 1))); };
ACT['sel-wd'] = d => { const m = A.plan.month; toggleMany(Array.from({ length: dim(m) }, (_, i) => m + '-' + pad(i + 1)).filter(x => wdi(x) === +d.i)); };
ACT['sel-expand'] = () => { const r = selDays(); if (!r.length) return; new Set(r.map(x => monday(x))).forEach(w => { for (let i = 0; i < 7; i++) SEL.set.add(addDays(w, i)); }); schedule(); };
ACT['sel-open'] = () => {
  const days = selDays(); if (!days.length) return;
  resetF({ who: 'both', s_m: true, s_a: true, s_s: true, noWE: false });
  openSheet(() => {
    const n = days.length, we = days.filter(d => wdi(d) >= 5).length;
    return `<div class="st">${n} jour${n > 1 ? 's' : ''} d’un coup</div><div class="ss">${esc(selSummary())}</div>
    ${lbl('Pour qui ?')}${segH('who', whoOpts(true), F.who)}
    ${lbl('Quels moments ?')}<div class="chips">${SLOTS.map(s => `<button type="button" class="chip${F['s_' + s.k.charAt(0)] ? ' on' : ''}" data-toggle-chip="s_${s.k.charAt(0)}">${s.l}</button>`).join('')}</div>
    ${we ? `<div style="margin-top:8px">${swH('noWE', 'Ignorer les week-ends (' + we + ')', F.noWE)}</div>` : ''}
    ${tplChips()}
    ${lbl('Où ?')}<div class="pgrid">${cfg().places.map(p => `<button data-act="sel-apply" data-v="${esc(p.id)}" style="--pc:${esc(p.color)}"><b>${esc(p.icon)}</b><span>${esc(p.label)}</span></button>`).join('')}</div>
    <div class="btns two"><button class="btn btn-s" data-act="sel-apply" data-v="">Effacer ces créneaux</button><button class="btn btn-g" data-act="items-open" data-k="places">Gérer les lieux</button></div>`;
  }, { live: true });
};
document.addEventListener('click', e => {
  const c = e.target.closest('[data-toggle-chip]'); if (!c) return;
  const k = c.dataset.toggleChip; F[k] = !F[k]; c.classList.toggle('on', !!F[k]);
});
ACT['sel-apply'] = async d => {
  const place = d.v, slots = SLOTS.filter(s => F['s_' + s.k.charAt(0)]).map(s => s.k);
  if (!slots.length) return toast('Choisis au moins un moment', 'err');
  const persons = F.who === 'both' ? PIDS.slice() : [F.who];
  const days = selDays().filter(x => !(F.noWE && wdi(x) >= 5));
  if (!days.length) return toast('Aucun jour à modifier', 'err');
  closeSheet(); const snap = snapPresence(days);
  const ok = await act(async () => {
    for (let i = 0; i < days.length; i += 6) await Promise.all(days.slice(i, i + 6).map(day => { const upd = { date: day }; persons.forEach(p => { upd[p] = {}; slots.forEach(s => { upd[p][s] = place; }); }); return patch('presence', day, upd); }));
  }, place ? days.length + ' jour' + (days.length > 1 ? 's' : '') + ' mis à jour' : 'Créneaux effacés');
  if (ok) { selReset(); schedule(); offerUndo(restorePresence(snap), days.length + ' jour' + (days.length > 1 ? 's' : '') + ' modifié' + (days.length > 1 ? 's' : '')); }
};
