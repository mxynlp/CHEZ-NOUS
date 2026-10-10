
/* ---------- 8. Accueil ---------- */
const miniRows = d => PIDS.map(p => `<span class="mini">${SLOTS.map(s => { const pl = placeById(slotPlace(p, d, s.k)); return `<i${pl ? ` style="--pc:${esc(pl.color)}"` : ''}></i>`; }).join('')}</span>`).join('');
const dotsFor = evs => { const ds = []; evs.forEach(e => whoList(e.who || 'both').forEach(p => ds.push(p))); return ds.slice(0, 3).map(p => `<i class="dot" style="--c:var(--${p})"></i>`).join(''); };
function relDays(d) { const n = diffDays(today(), d); return n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : n > 1 ? 'dans ' + n + ' jours' : 'il y a ' + (-n) + ' jours'; }

function vHome() {
  const t = today(), c = cfg(), hr = new Date().getHours();
  const g = hr < 5 ? 'Bonne nuit' : hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir';
  const o = otherP(A.me), evs = eventsOn(t), ml = mealOf(t, 'lunch'), md = mealOf(t, 'dinner');
  const tg = SLOTS.filter(s => together(t, s.k));
  const order = [A.me, o];
  /* aujourd'hui */
  const todayCard = `<div class="card"><h3>${ico(hr >= 6 && hr < 19 ? 'sun' : 'moon', 18)}Aujourd’hui<span class="sp"></span><button class="lk" data-act="go-day" data-d="${t}">Détails</button></h3>
    <div class="tdp"><span></span>${SLOTS.map(s => `<small class="mut" style="text-align:center;font-size:11px;font-weight:700">${s.l}</small>`).join('')}</div>
    ${order.map(p => `<div class="tdp">${av(p, 30)}${SLOTS.map(s => { const pl = placeById(slotPlace(p, t, s.k)); return `<div class="tc${together(t, s.k) ? ' tg' : ''}"${pl ? ` style="--pc:${esc(pl.color)}"` : ''}><b>${pl ? esc(pl.icon) : '–'}</b><span>${pl ? esc(pl.label) : 'Libre'}</span></div>`; }).join('')}</div>`).join('')}
    ${tg.length ? `<div style="margin-top:12px"><span class="pill ok">${ico('heart', 14)}Ensemble à la maison · ${tg.map(s => s.l.toLowerCase()).join(', ')}</span></div>` : ''}
    <div class="meals2">
      <button class="m2" data-act="meal-edit" data-d="${t}" data-k="lunch"><small>Midi</small><b>${ml ? esc(ml.name) : 'Pas encore prévu'}</b></button>
      <button class="m2" data-act="meal-edit" data-d="${t}" data-k="dinner"><small>Soir</small><b>${md ? esc(md.name) : 'Pas encore prévu'}</b></button>
    </div>
    ${evs.length ? `<div style="margin-top:8px">${evs.map(e => `<button class="evrow" data-act="ev-edit" data-id="${esc(e.id)}"><span class="ic sm" style="--pc:${esc((placeById(e.place) || {}).color || '#7FB89A')}">${esc((placeById(e.place) || {}).icon || '🗓️')}</span><span class="grow"><div class="t" style="font-weight:700">${esc(e.title)}</div><div class="s sm mut">${e.time ? esc(e.time) : 'Toute la journée'}${e.remind ? ' · rappel' : ''}</div></span>${avs(whoList(e.who || 'both'))}</button>`).join('')}</div>` : `<p class="mut sm" style="margin-top:12px">Aucun événement aujourd’hui.</p>`}
  </div>`;
  /* semaine */
  const w = monday(t); let wkTog = 0; for (let i = 0; i < 7; i++) wkTog += togetherCount(addDays(w, i));
  const weekCard = `<div class="card"><h3>${ico('cal', 18)}Cette semaine<span class="sp"></span><button class="lk" data-act="go-week" data-d="${t}">Planning</button></h3>
    <div class="strip">${[0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(w, i); return `<button class="sd1${d === t ? ' today' : ''}${i >= 5 ? ' we' : ''}" data-act="go-day" data-d="${d}" aria-label="${esc(dayLong(d))}">${DAYL[i]}<b>${pd(d).getDate()}</b>${miniRows(d)}</button>`; }).join('')}</div>
    <p class="mut sm" style="margin-top:12px">Haut : ${NAMES[PIDS[0]]} · bas : ${NAMES[PIDS[1]]}${wkTog ? ` · <b style="color:var(--accent-ink)">${wkTog} moment${wkTog > 1 ? 's' : ''} ensemble</b> à la maison` : ''}</p></div>`;
  /* budget */
  const bal = myBalance(), nf = nextFixed(), mt = ymOf(t);
  const balTxt = Math.abs(bal) < 0.5 ? `Vous êtes <span style="color:var(--accent-ink)">quittes</span>` : bal > 0 ? `${esc(NAMES[o])} te doit <span style="color:var(--accent-ink)">${fmt(bal)}</span>` : `Tu dois <span style="color:var(--accent-ink)">${fmt(-bal)}</span> à ${esc(NAMES[o])}`;
  const budCard = `<div class="card"><h3>${ico('wallet', 18)}Budget du mois<span class="sp"></span><button class="lk" data-act="go-bud">Ouvrir</button></h3>
    <div class="bal"><div class="grow"><div class="big" style="font-size:27px">${balTxt}</div><div class="mut sm" style="margin-top:6px">Dépenses communes en ${esc(fmtD(mt + '-01', { month: 'long' }))} : <b>${fmt(commonTotal(mt))}</b></div></div>${Math.abs(bal) >= 0.5 ? `<button class="btn btn-p btn-sm" data-act="settle-open">Régler</button>` : ''}</div>
    ${nf ? `<div class="li" style="margin-top:12px;border-top:1px solid var(--line)"><span class="ic sm" style="--pc:${esc(catById(nf.cat).color)}">${esc(catById(nf.cat).icon)}</span><span class="grow"><div class="t">${esc(nf.label)}</div><div class="s">Prochain prélèvement ${relDays(nf.date)} · ${esc(fmtD(nf.date, { day: 'numeric', month: 'short' }))}</div></span><span class="amount">${fmt(nf.amount)}</span></div>` : ''}</div>`;
  const notes = [];
  if (A.canWrite === false) notes.push(`<div class="note"><div class="grow"><b>Lecture seule</b>Demande à Maxym de t’inviter par e-mail comme éditeur (menu Partager, sans lien public) pour modifier les données.</div></div>`);
  if (A.sync === 'local') notes.push(`<div class="note info"><div class="grow"><b>Mode local</b>Rien n’est partagé depuis cet affichage. Ouvre le lien de l’artifact pour synchroniser avec ${esc(NAMES[o])}.</div></div>`);
  if (c.demo) notes.push(`<div class="note info"><span style="color:var(--accent-ink)">${ico('sparkle', 22)}</span><div class="grow"><b>Données d’exemple</b>Elles servent à voir le rendu. Supprime-les quand tu es prêt.<div style="margin-top:8px"><button class="btn btn-s btn-sm" data-act="reset-ask">Repartir de zéro</button></div></div></div>`);
  return `<div class="page">${hdr(g + ' ' + NAMES[A.me], dayLong(t))}<div class="content">
    ${notes.join('')}
    <div class="qa"><button data-act="ev-new"><span class="qi">${ico('cal', 20)}</span>Événement</button><button data-act="exp-new"><span class="qi">${ico('wallet', 20)}</span>Dépense</button><button data-act="meal-new"><span class="qi">${ico('meal', 20)}</span>Repas</button></div>
    ${todayCard}
    <div class="grid2">${weekCard}${budCard}</div>
    <p class="sync-note">${esc(syncText())}</p></div></div>`;
}
ACT['go-day'] = d => { A.tab = 'plan'; A.plan.level = 'day'; A.plan.date = d.d; A.plan.month = ymOf(d.d); A.anim = 'a-zin'; A.resetScroll = true; schedule(); };
ACT['go-week'] = d => { A.tab = 'plan'; A.plan.level = 'week'; A.plan.date = d.d; A.plan.month = ymOf(d.d); A.anim = 'a-zin'; A.resetScroll = true; schedule(); };
ACT['go-bud'] = () => { A.tab = 'bud'; A.bud.sub = 'over'; A.anim = 'a-zin'; A.resetScroll = true; schedule(); };
ACT['ev-new'] = () => openEvent({ date: today() });
ACT['exp-new'] = () => openExpense('');
ACT['meal-new'] = () => openMealNext();
