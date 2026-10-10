
/* ---------- Démarrage de l'appli autonome : connexion Supabase puis lancement ---------- */
const CFG = window.CHEZ_NOUS_CONFIG || {};
let SB = null;
const authEl = () => document.getElementById('auth');
function authView(mode, msg) {
  const el = authEl(); el.classList.add('on');
  const signup = mode === 'signup';
  el.innerHTML = `<div class="auth-card">
    <div class="auth-logo">${ico('home', 34, 1.6)}</div>
    <h1>Chez nous</h1><p class="mut">Votre vie à deux, au même endroit.</p>
    <form id="auth-form" autocomplete="on">
      <input class="inp" id="au-mail" type="email" inputmode="email" autocomplete="email" placeholder="Adresse e-mail" required>
      <input class="inp" id="au-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="Mot de passe${signup ? ' (8 caractères minimum)' : ''}" minlength="${signup ? 8 : 1}" required>
      <div class="auth-msg" id="au-msg" role="alert">${esc(msg || '')}</div>
      <button class="btn btn-p" type="submit" id="au-go" style="width:100%">${signup ? 'Créer mon compte' : 'Se connecter'}</button>
    </form>
    <button class="lk" id="au-sw" type="button">${signup ? 'J’ai déjà un compte' : 'Première visite ? Créer mon compte'}</button></div>`;
  document.getElementById('au-sw').onclick = () => authView(signup ? 'login' : 'signup');
  document.getElementById('auth-form').onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById('au-mail').value.trim(), password = document.getElementById('au-pass').value, b = document.getElementById('au-go');
    b.disabled = true; b.textContent = '…';
    try {
      const r = signup ? await SB.auth.signUp({ email, password }) : await SB.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
      if (!r.data.session) { authView('login', 'Compte créé. Si un e-mail de confirmation est arrivé, valide-le puis connecte-toi.'); return; }
      await startApp(r.data.session);
    } catch (err) {
      const m = /invalid login/i.test(err.message) ? 'E-mail ou mot de passe incorrect.' : /already/i.test(err.message) ? 'Ce compte existe déjà : connecte-toi.' : (err.message || 'Connexion impossible.');
      authView(mode, m);
    }
  };
}
async function startApp(session) {
  UID = session.user.id; A.canWrite = true; A.userEmail = session.user.email;
  DB = makeDB(SB);
  const { data: mem, error: me } = await SB.from('members').select('email').limit(1);
  if (me || !mem || !mem.length) {
    authView('login', 'Cette adresse n’est pas autorisée dans le foyer. Ajoute-la dans la table « members » de Supabase (voir le guide), puis reconnecte-toi.');
    await SB.auth.signOut(); return;
  }
  authEl().classList.remove('on'); authEl().innerHTML = '';
  caps.downloads = { async save({ filename, data }) { const u = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); } };
  RC.upload = async (id, blob) => { const { error } = await SB.storage.from('receipts').upload(id + '.jpg', blob, { upsert: true, contentType: 'image/jpeg' }); if (error) throw error; };
  RC.url = async id => { const { data, error } = await SB.storage.from('receipts').createSignedUrl(id + '.jpg', 600); return error ? null : data.signedUrl; };
  loadLocal();
  try { await Promise.race([subscribeAll(), sleep(8000)]); } catch (e) { console.error(e); }
  if (!A.me) { const p = D.priv.profile; if (p && (p.me === 'maxym' || p.me === 'sasha')) { A.me = p.me; lsSet('cn-me', A.me); } }
  A.ready = true; render(); runShortcut();
}
ACT['sign-out'] = async () => { try { UNS.forEach(u => { try { u(); } catch (e) { /* */ } }); await SB.auth.signOut(); } finally { location.reload(); } };
const signOutLi = () => `<button class="li" data-act="push-open"><span class="ic sm">${ico('bell', 20)}</span><span class="grow"><div class="t">Notifications</div><div class="s">Rappels repas, prélèvements, tâches</div></span>${ico('chevR', 18)}</button><button class="li" data-act="sign-out"><span class="ic sm">${ico('swap', 20)}</span><span class="grow"><div class="t">Se déconnecter</div><div class="s">${esc(A.userEmail || '')}</div></span></button>`;

/* --- Notifications push (gratuites : Web Push + fonction Supabase planifiée) --- */
const PUSH = { prefs: { meals: true, charges: true, chores: true, week: true }, on: false, ok: false };
const PUSH_L = { meals: 'Le soir : repas de demain pas prévu', charges: 'Le matin : prélèvement du jour', chores: 'Le matin : tâche qui t’attend', week: 'Dimanche soir : résumé de la semaine' };
const b64u8 = b => { const p = '='.repeat((4 - b.length % 4) % 4), r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
async function pushLoad() {
  PUSH.ok = !!(CFG.vapidKey && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  if (!PUSH.ok) return;
  const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
  PUSH.on = !!sub && Notification.permission === 'granted';
  if (sub) { const { data } = await SB.from('push_subs').select('prefs').eq('endpoint', sub.endpoint).maybeSingle(); if (data && data.prefs) Object.assign(PUSH.prefs, data.prefs); }
}
async function pushSave() { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (!sub) return; const { error } = await SB.from('push_subs').upsert({ endpoint: sub.endpoint, uid: UID, sub: sub.toJSON(), prefs: PUSH.prefs }); if (error) throw error; }
ACT['push-open'] = async () => {
  try { await pushLoad(); } catch (e) { console.error(e); }
  resetF({});
  openSheet(() => `<div class="st">Notifications</div><div class="ss">Gratuites, envoyées sur ce téléphone seulement.</div>
    ${!PUSH.ok ? `<div class="note" style="margin-top:12px"><div class="grow"><b>Pas disponible ici</b>Sur iPhone, ajoute d’abord l’appli à l’écran d’accueil (Safari, Partager), puis rouvre-la depuis l’icône. Il faut iOS 16.4 ou plus. Vérifie aussi que la clé de notification est dans config.js.</div></div>` : `
    <div class="btns"><button class="btn ${PUSH.on ? 'btn-s' : 'btn-p'}" data-act="${PUSH.on ? 'push-off' : 'push-on'}">${PUSH.on ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}</button></div>
    ${PUSH.on ? `<div style="margin-top:8px">${Object.keys(PUSH_L).map(k => `<button type="button" class="swr" data-act="push-pref" data-k="${k}"><span>${esc(PUSH_L[k])}</span><i class="sw${PUSH.prefs[k] ? ' on' : ''}"></i></button>`).join('')}</div>` : ''}`}`, { live: true });
};
ACT['push-on'] = async () => {
  try {
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return toast('Autorise les notifications dans les réglages du téléphone', 'err', 4200);
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(CFG.vapidKey) });
    PUSH.on = true; await pushSave(); toast('Notifications activées'); schedule();
  } catch (e) { console.error(e); toast('Activation impossible', 'err'); }
};
ACT['push-off'] = async () => {
  try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) { await SB.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); } PUSH.on = false; toast('Notifications désactivées'); schedule(); } catch (e) { console.error(e); }
};
ACT['push-pref'] = async d => { PUSH.prefs[d.k] = !PUSH.prefs[d.k]; schedule(); try { await pushSave(); } catch (e) { toast('Enregistrement impossible', 'err'); } };

(async function bootPwa() {
  A.hide = lsGet('cn-hide') === '1';
  const tb = lsGet('cn-tab'); if (['home', 'plan', 'meal', 'bud'].includes(tb)) A.tab = tb;
  const me = lsGet('cn-me'); A.me = me === 'maxym' || me === 'sasha' ? me : null;
  renderSkel();
  if (!window.supabase || !CFG.url || /VOTRE|xxxx/i.test(CFG.url)) { authView('login', 'Configuration manquante : renseigne config.js (voir le guide).'); return; }
  SB = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const { data } = await SB.auth.getSession();
  if (data && data.session) await startApp(data.session); else authView('login');
})();
