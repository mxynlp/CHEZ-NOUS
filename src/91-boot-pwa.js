
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
  loadLocal();
  try { await Promise.race([subscribeAll(), sleep(8000)]); } catch (e) { console.error(e); }
  if (!A.me) { const p = D.priv.profile; if (p && (p.me === 'maxym' || p.me === 'sasha')) { A.me = p.me; lsSet('cn-me', A.me); } }
  A.ready = true; render();
}
ACT['sign-out'] = async () => { try { UNS.forEach(u => { try { u(); } catch (e) { /* */ } }); await SB.auth.signOut(); } finally { location.reload(); } };
const signOutLi = () => `<button class="li" data-act="sign-out"><span class="ic sm">${ico('swap', 20)}</span><span class="grow"><div class="t">Se déconnecter</div><div class="s">${esc(A.userEmail || '')}</div></span></button>`;

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
