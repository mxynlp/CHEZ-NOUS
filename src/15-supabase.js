
/* ---------- Supabase : adaptateur qui imite l'interface « db » utilisée par l'appli ----------
   Table unique `docs` (path, col, id, data jsonb). Temps réel via postgres_changes.        */
function makeDB(sb) {
  const split = p => { const i = p.lastIndexOf('/'); return { col: p.slice(0, i), id: p.slice(i + 1) }; };
  const fail = e => { const x = new Error((e && e.message) || 'erreur'); const c = e && e.code; x.code = c === '42501' || c === 'PGRST301' ? 'not_granted' : (!navigator.onLine || (e && /fetch|network/i.test(e.message || '')) ? 'unavailable' : 'internal'); return x; };
  const subs = new Set();      // { match(rec) -> bool, reload() }
  let ch = null, wasUp = false;
  const reloadAll = () => subs.forEach(s => s.reload());
  function hub() {
    if (ch) return;
    ch = sb.channel('docs-all').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, pl => {
      const rec = pl.eventType === 'DELETE' ? pl.old : pl.new;
      subs.forEach(s => s.apply(pl.eventType, rec));
    }).subscribe(st => {
      if (st === 'SUBSCRIBED') { if (wasUp) reloadAll(); wasUp = true; }
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reloadAll(); });
  window.addEventListener('online', reloadAll);
  const snap = (map, exists) => ({ exists, metadata: { fromCache: false }, data: () => map._one, docs: Object.entries(map).filter(([k]) => k !== '_one').map(([id, d]) => ({ id, data: () => d })) });
  return {
    doc(path) {
      const { col, id } = split(path);
      return {
        async set(data) { const { error } = await sb.from('docs').upsert({ path, col, id, data }); if (error) throw fail(error); },
        async update(data) {
          const { data: row, error } = await sb.from('docs').select('data').eq('path', path).maybeSingle(); if (error) throw fail(error);
          if (!row) { const x = new Error('absent'); x.code = 'invalid_argument'; throw x; }
          const { error: e2 } = await sb.from('docs').upsert({ path, col, id, data: dm(row.data || {}, data) }); if (e2) throw fail(e2);
        },
        async delete() { const { error } = await sb.from('docs').delete().eq('path', path); if (error) throw fail(error); },
        onSnapshot(cb, errCb) {
          let cur = null;
          const emit = () => cb({ exists: cur != null, metadata: { fromCache: false }, data: () => cur });
          const reload = async () => { const { data: row, error } = await sb.from('docs').select('data').eq('path', path).maybeSingle(); if (error) { errCb && errCb(fail(error)); return; } cur = row ? row.data : null; emit(); };
          const s = { reload, apply: (t, rec) => { if (!rec || rec.path !== path) return; cur = t === 'DELETE' ? null : rec.data; emit(); } };
          subs.add(s); hub(); reload();
          return () => subs.delete(s);
        }
      };
    },
    collection(col) {
      return {
        onSnapshot(cb, errCb) {
          const m = {};
          const emit = () => cb({ metadata: { fromCache: false }, docs: Object.entries(m).map(([id, d]) => ({ id, data: () => d })) });
          const reload = async () => {
            const { data: rows, error } = await sb.from('docs').select('id,data').eq('col', col).limit(5000);
            if (error) { errCb && errCb(fail(error)); return; }
            Object.keys(m).forEach(k => delete m[k]); (rows || []).forEach(r => { m[r.id] = r.data; }); emit();
          };
          const s = { reload, apply: (t, rec) => { if (!rec || rec.col !== col) return; if (t === 'DELETE') delete m[rec.id]; else m[rec.id] = rec.data; emit(); } };
          subs.add(s); hub(); reload();
          return () => subs.delete(s);
        }
      };
    }
  };
}
