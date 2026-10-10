
/* ---------- 7. Profil, réglages, lieux et catégories ---------- */
function renderGate() {
  const g = $('#gate'); g.classList.add('on');
  g.innerHTML = `<div class="gate"><div class="gate-logo">${ico('home', 34)}</div><h1>Chez nous</h1><p>Votre vie à deux, au même endroit.</p>${lbl('Qui es-tu ?')}<div class="who">${PIDS.map(p => `<button class="whoc" data-act="pick-me" data-p="${p}">${av(p, 72)}<span>${NAMES[p]}</span></button>`).join('')}</div><p class="fine">Ton choix est retenu sur cet appareil. Tu pourras changer de profil à tout moment.</p></div>`;
}
function setMe(p) {
  A.me = p; lsSet('cn-me', p);
  if (useDb('priv') || localCols().includes('priv')) put('priv', 'profile', { me: p }).catch(() => { });
  A.anim = 'a-fade'; A.resetScroll = true; schedule();
}
ACT['pick-me'] = d => setMe(d.p);
ACT['switch-me'] = () => { closeSheet(); setMe(otherP(A.me)); toast('Profil de ' + NAMES[otherP(A.me)]); };

const syncText = () => ({ live: 'Synchronisé en direct avec ' + NAMES[otherP(A.me)], cache: 'Connexion instable, reprise automatique', local: 'Mode local : les données restent sur cet appareil', off: 'Synchronisation interrompue', boot: 'Connexion…' }[A.sync] || '');
ACT.profile = () => {
  resetF({ hide: A.hide });
  F._ontoggle = (k, v) => { if (k === 'hide') { A.hide = v; lsSet('cn-hide', v ? '1' : '0'); schedule(); } };
  openSheet(() => {
    const c = cfg(), o = otherP(A.me);
    return `<div class="row" style="margin-top:2px">${av(A.me, 54)}<div class="grow"><div class="st">${NAMES[A.me]}</div><div class="ss">${esc(syncText())}</div></div></div>
    ${A.canWrite === false ? `<div class="note"><div class="grow"><b>Lecture seule</b>Demande à Maxym de t’inviter par e-mail comme éditeur dans le menu Partager, sans lien public.</div></div>` : ''}
    ${A.sync === 'local' ? `<div class="note info"><div class="grow"><b>Pas de synchronisation</b>Ouvre la page depuis le lien partagé pour retrouver les données de ${NAMES[o]}.</div></div>` : ''}
    <div style="margin-top:10px">
      ${bgPicker()}
      <button class="li" data-act="switch-me"><span class="ic sm">${ico('swap', 20)}</span><span class="grow t">Passer sur le profil de ${NAMES[o]}</span>${ico('chevR', 18)}</button>
      ${swH('hide', 'Masquer les montants privés', A.hide)}
      <button class="li" data-act="items-open" data-k="places"><span class="ic sm">${ico('cal', 20)}</span><span class="grow t">Lieux de présence</span>${ico('chevR', 18)}</button>
      <button class="li" data-act="items-open" data-k="cats"><span class="ic sm">${ico('wallet', 20)}</span><span class="grow t">Catégories de dépenses</span>${ico('chevR', 18)}</button>
      ${c.demo ? `<button class="li" data-act="reset-ask"><span class="ic sm" style="--pc:var(--warn)">${ico('sparkle', 20)}</span><span class="grow"><div class="t">Repartir de zéro</div><div class="s">Supprime les données d’exemple</div></span>${ico('chevR', 18)}</button>` : ''}
    </div>`;
  });
};
ACT['reset-ask'] = () => confirmSheet({ title: 'Repartir de zéro ?', text: 'Les plannings, repas, plats, dépenses et objectifs d’exemple seront supprimés pour vous deux. Vos réglages (lieux, loyer, charges fixes) sont conservés.', ok: 'Tout supprimer', danger: true, onOk: resetDemo });
async function resetDemo() {
  const jobs = [];
  for (const col of SHARED) for (const [id, d] of Object.entries(D[col])) if (d && d.demo) jobs.push(() => del(col, id, true));
  for (const [id, d] of Object.entries(D.priv)) if (d && d.demo) jobs.push(() => del('priv', id, true));
  await act(async () => { for (let i = 0; i < jobs.length; i += 6) await Promise.all(jobs.slice(i, i + 6).map(f => f())); await patch('settings', 'main', { demo: false }); }, 'Vous repartez de zéro');
}

/* lieux et catégories : même éditeur */
const PLACE_EMO = ['🏠', '🏢', '💻', '🏡', '👨‍👩‍👧', '🥂', '🚆', '✈️', '📍', '🏖️', '⛰️', '🏥', '🎓', '🏋️', '🚗', '🛏️', '🏨', '🌳', '🏕️', '🛍️', '☕', '🎭', '🚲', '⛴️'];
const CAT_EMO = ['🏠', '🛒', '⚡', '📺', '📶', '🍽️', '🚗', '💊', '🎬', '🎁', '🧾', '🐾', '👕', '📚', '🧴', '🏋️', '✈️', '🎓', '💇', '🛠️', '☕', '🍷', '🎮', '💳'];
const COLORS = ['#7FB89A', '#A8D5BA', '#7BA7D9', '#8CC3D9', '#A99BD8', '#B9A9E0', '#E8A0B8', '#E58C8C', '#F0B27A', '#F0D58A', '#E5C76B', '#B5BDB8'];
function openItems(kind) {
  resetF();
  openSheet(() => {
    const list = cfg()[kind];
    return `<div class="st">${kind === 'places' ? 'Lieux de présence' : 'Catégories de dépenses'}</div><div class="ss">Touche un élément pour le renommer, changer son icône ou sa couleur.</div>
    <div style="margin-top:10px">${list.map(x => `<button class="li" data-act="item-edit" data-k="${kind}" data-id="${esc(x.id)}"><span class="ic" style="--pc:${esc(x.color)}">${esc(x.icon)}</span><span class="grow t">${esc(x.label)}</span>${ico('chevR', 18)}</button>`).join('')}</div>
    <div class="btns"><button class="btn btn-s btn-b" data-act="item-edit" data-k="${kind}" data-id="">${ico('plus', 20)}Ajouter</button></div>`;
  }, { live: true });
}
ACT['items-open'] = d => openItems(d.k);
ACT['item-edit'] = d => {
  const kind = d.k, list = clone(cfg()[kind]), cur = list.find(x => x.id === d.id) || { id: '', label: '', icon: kind === 'places' ? '📍' : '🧾', color: '#7FB89A' };
  resetF({ kind, id: d.id, icon: cur.icon, color: cur.color });
  const emo = kind === 'places' ? PLACE_EMO : CAT_EMO;
  openSheet(() => `<div class="st">${d.id ? 'Modifier' : 'Nouveau'} ${kind === 'places' ? 'lieu' : 'catégorie'}</div>
    ${lbl('Nom')}<input class="inp" id="it-name" maxlength="40" value="${esc(cur.label)}" placeholder="${kind === 'places' ? 'Ex. Salle de sport' : 'Ex. Animaux'}">
    ${lbl('Icône')}<div class="emojis">${emo.map(x => `<button type="button" data-pick="icon" data-val="${esc(x)}" class="${x === cur.icon ? 'on' : ''}">${x}</button>`).join('')}</div>
    ${lbl('Couleur')}<div class="sw-col">${COLORS.map(c => `<button type="button" data-pick="color" data-val="${c}" style="--c:${c}" class="${c === cur.color ? 'on' : ''}" aria-label="Couleur ${c}"></button>`).join('')}</div>
    <div class="btns ${d.id && list.length > 1 ? 'two' : ''}">${d.id && list.length > 1 ? `<button class="btn btn-d" data-act="item-del">Supprimer</button>` : ''}<button class="btn btn-p" data-act="item-save">Enregistrer</button></div>`, { focus: d.id ? '' : 'it-name' });
};
ACT['item-save'] = async () => {
  const kind = F.kind, name = val('it-name').trim(); if (!name) return toast('Donne un nom', 'err');
  const list = clone(cfg()[kind]); const item = { id: F.id || uid(), label: name, icon: F.icon, color: F.color };
  const i = list.findIndex(x => x.id === F.id); if (i >= 0) list[i] = item; else list.push(item);
  closeSheet(); await act(() => patch('settings', 'main', { [kind]: list }), 'Enregistré'); setTimeout(() => openItems(kind), 340);
};
ACT['item-del'] = async () => {
  const kind = F.kind, list = clone(cfg()[kind]).filter(x => x.id !== F.id);
  closeSheet(); await act(() => patch('settings', 'main', { [kind]: list }), 'Supprimé'); setTimeout(() => openItems(kind), 340);
};

/* --- Apparence : couleur de fond (par appareil) --- */
const BGS = [['menthe', 'Menthe', '#E7F1EA'], ['blanc', 'Blanc', '#F5F7F6'], ['creme', 'Crème', '#F3EFE5'], ['ardoise', 'Ardoise', '#E8EDF1'], ['sauge', 'Sauge', '#CBE4D5']];
function bgPicker() {
  const cur = document.documentElement.dataset.bg || 'menthe';
  return `<div class="li" style="display:block"><div class="t" style="font-weight:600;margin-bottom:10px">Couleur de fond</div><div class="bgp">${BGS.map(b => `<div><button type="button" data-act="bg-set" data-v="${b[0]}" class="${cur === b[0] ? 'on' : ''}" style="--sw:${b[2]}" aria-label="${b[1]}"></button><div class="bgp-l">${b[1]}</div></div>`).join('')}</div></div>`;
}
ACT['bg-set'] = d => { document.documentElement.dataset.bg = d.v; lsSet('cn-bg', d.v); document.querySelectorAll('.bgp button').forEach(x => x.classList.toggle('on', x.dataset.v === d.v)); };
