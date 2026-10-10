
/* ---------- 13. Démarrage ---------- */
(async function boot() {
  A.hide = lsGet('cn-hide') === '1';
  const tb = lsGet('cn-tab'); if (['home', 'plan', 'meal', 'bud'].includes(tb)) A.tab = tb;
  const me = lsGet('cn-me'); A.me = me === 'maxym' || me === 'sasha' ? me : null;
  render();                                        // squelette de chargement
  try {
    const cl = window.claude;
    if (cl && cl.use) {
      const user = await cl.use('user');
      if (user) { UID = await user.id(); A.canWrite = await user.can('data.write'); }
      DB = await cl.use('db');
    }
  } catch (e) { console.error(e); DB = null; }
  loadLocal();
  if (!DB) A.sync = 'local';
  else { try { await Promise.race([subscribeAll(), sleep(7000)]); } catch (e) { console.error(e); } }
  if (!A.me) { const p = D.priv.profile; if (p && (p.me === 'maxym' || p.me === 'sasha')) { A.me = p.me; lsSet('cn-me', A.me); } }
  A.ready = true; render();
})();
