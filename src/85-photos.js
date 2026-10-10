/* ---------- Photos (repas, plats) + Album partagé ----------
   Stockage : Supabase Storage, bucket privé « media » (voir supabase/media.sql). Actif seulement dans la version autonome (PH.ok). */
const PH = { ok: false, sb: null, bucket: 'media', max: 50 * 1048576, quota: 1024 * 1048576 };
const PHC = {};                                   // chemin -> { url, exp }
const phKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const phThumbOf = p => p.replace(/\.[a-z0-9]+$/i, '') + '_t.jpg';
const PH_BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
function phErr(e) {
  const m = String((e && (e.message || e.error)) || e || '');
  if (/bucket not found|not found/i.test(m)) return 'Le stockage photos n’est pas encore activé : lance le fichier media.sql dans Supabase.';
  if (/row-level|policy|unauthor|403|not allowed/i.test(m)) return 'Envoi refusé : vérifie media.sql et que ton adresse est dans « members ».';
  if (/exceed|too large|413|payload|size/i.test(m)) return 'Fichier trop lourd (50 Mo maximum).';
  if (/quota|storage limit|insufficient/i.test(m)) return 'Le stockage gratuit est plein (1 Go).';
  return 'Envoi impossible. Réessaie avec du réseau.';
}
async function phUpload(path, blob, type) {
  const { error } = await PH.sb.storage.from(PH.bucket).upload(path, blob, { upsert: true, contentType: type || blob.type || 'application/octet-stream', cacheControl: '31536000' });
  if (error) throw error;
}
async function phRemove(paths) {
  paths = (paths || []).filter(Boolean); if (!paths.length || !PH.ok) return;
  try { await PH.sb.storage.from(PH.bucket).remove(paths); } catch (e) { console.error(e); }
  paths.forEach(p => { delete PHC[p]; });
}
async function phUrls(paths) {
  if (!PH.ok) return paths.map(() => '');
  const need = [...new Set(paths)].filter(p => p && !(PHC[p] && PHC[p].exp > Date.now()));
  if (need.length) {
    try {
      const { data, error } = await PH.sb.storage.from(PH.bucket).createSignedUrls(need, 21600);
      if (!error && data) data.forEach(r => { if (r && r.signedUrl) PHC[r.path] = { url: r.signedUrl, exp: Date.now() + 5 * 3600000 }; });
    } catch (e) { console.error(e); }
  }
  return paths.map(p => (PHC[p] && PHC[p].url) || '');
}
const phImg = (path, cls) => {
  if (!path) return '';
  const c = PHC[path] && PHC[path].exp > Date.now() ? PHC[path].url : '';
  return `<img class="phi ${cls || ''}" data-ph="${esc(path)}" src="${c ? esc(c) : PH_BLANK}" alt="" loading="lazy" draggable="false">`;
};
let phTimer = 0, phBusy = false;
function phHydrate() {
  if (phBusy || !PH.ok) return;
  const imgs = [...document.querySelectorAll('img[data-ph]:not([data-bad])')].filter(i => !/^https?:/.test(i.getAttribute('src') || ''));
  if (!imgs.length) return;
  phBusy = true;
  phUrls(imgs.map(i => i.dataset.ph)).then(us => { imgs.forEach((i, k) => { if (us[k]) i.src = us[k]; else i.dataset.bad = '1'; }); })
    .finally(() => { phBusy = false; });
}
new MutationObserver(() => { clearTimeout(phTimer); phTimer = setTimeout(phHydrate, 40); }).observe(document.documentElement, { childList: true, subtree: true });
const phBlobOf = (file, max, q) => compressImg(file, max, q);

/* --- Photo d'un repas / d'un plat (champ dans la feuille) --- */
const phBox = () => {
  const has = F.phPrev || F.photo;
  const pic = F.phPrev ? `<img class="phi" src="${esc(F.phPrev)}" alt="">` : phImg(F.photo ? phThumbOf(F.photo) : '', '');
  return has
    ? `<div class="phprev">${pic}</div><div class="row" style="gap:8px;margin-top:8px"><button type="button" class="btn btn-s btn-sm" data-act="ph-pick">${ico('camera', 18)}Changer</button><button type="button" class="btn btn-g btn-sm" data-act="ph-clear">Retirer</button></div>`
    : `<button type="button" class="phadd" data-act="ph-pick">${ico('camera', 22)}<span>Ajouter une photo</span></button>`;
};
const phField = photo => {
  if (!PH.ok) return '';
  return `${lbl('Photo')}<input type="file" id="ph-file" accept="image/*" hidden><div id="ph-box">${phBox()}</div>`;
};
function phInit(photo) { F.photo = photo || ''; F.phOld = photo || ''; F.phBlob = null; F.phThumb = null; F.phPrev = ''; }
function phRefresh() { const b = document.getElementById('ph-box'); if (b) { b.innerHTML = phBox(); phHydrate(); } }
ACT['ph-pick'] = () => { const f = document.getElementById('ph-file'); if (f) f.click(); };
ACT['ph-clear'] = () => { if (F.phPrev) { try { URL.revokeObjectURL(F.phPrev); } catch (e) { /* */ } } F.photo = ''; F.phBlob = null; F.phThumb = null; F.phPrev = ''; phRefresh(); };
document.addEventListener('change', async e => {
  const t = e.target; if (!t || t.id !== 'ph-file' || !t.files[0]) return;
  const box = document.getElementById('ph-box'); if (box) box.innerHTML = '<p class="mut sm">Préparation de la photo…</p>';
  try {
    const f = t.files[0]; F.phBlob = await phBlobOf(f, 1600, .8); F.phThumb = await phBlobOf(f, 420, .7);
    if (F.phPrev) { try { URL.revokeObjectURL(F.phPrev); } catch (x) { /* */ } }
    F.phPrev = URL.createObjectURL(F.phThumb);
  } catch (er) { F.phBlob = null; F.phThumb = null; F.phPrev = ''; toast('Photo illisible', 'err'); }
  t.value = ''; phRefresh();
});
/* utilisée par un autre repas / plat ? (pour ne pas supprimer un fichier encore référencé) */
function phRefs(p, skip) {
  let n = 0;
  Object.entries(D.meals || {}).forEach(([d, m]) => ['lunch', 'dinner'].forEach(k => { if (m && m[k] && m[k].photo === p && 'meals/' + d + '/' + k !== skip) n++; }));
  Object.entries(D.recipes || {}).forEach(([id, r]) => { if (r && r.photo === p && 'recipes/' + id !== skip) n++; });
  return n;
}
/* envoie la photo choisie et renvoie le chemin à enregistrer ('' si aucune). skip = identifiant de l'objet édité */
async function phCommit(prefix, skip) {
  if (!PH.ok) return F.photo || '';
  if (F.phBlob) {
    const p = prefix + '_' + phKey() + '.jpg';
    await phUpload(p, F.phBlob, 'image/jpeg'); await phUpload(phThumbOf(p), F.phThumb, 'image/jpeg');
    if (F.phOld && !phRefs(F.phOld, skip)) phRemove([F.phOld, phThumbOf(F.phOld)]);
    return p;
  }
  if (!F.photo && F.phOld) { if (!phRefs(F.phOld, skip)) phRemove([F.phOld, phThumbOf(F.phOld)]); return ''; }
  return F.photo || '';
}

/* ======================= ALBUM ======================= */
const AL = { up: null, cur: -1, list: [] };
const albList = () => Object.entries(D.album || {}).map(([id, x]) => Object.assign({ id }, x)).filter(x => x.path).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ts || 0) - (a.ts || 0));
const albUsed = () => Object.values(D.album || {}).reduce((s, x) => s + ((x && x.size) || 0), 0);
const phMo = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' Ko' : n >= 1048576 * 100 ? Math.round(n / 1048576) + ' Mo' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo';
const ymdOf = ms => { const d = new Date(ms || Date.now()), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };

function vAlbum() {
  const items = albList(); AL.list = items;
  const used = albUsed(), pct = Math.min(100, Math.round(used / PH.quota * 100));
  const up = AL.up ? `<div class="card"><div class="row" style="align-items:center;gap:10px"><div class="grow"><b>Envoi en cours… ${AL.up.i}/${AL.up.n}</b><div class="sm mut" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(AL.up.name)}</div></div></div><div class="pg" style="margin-top:10px"><i style="width:${Math.round((AL.up.i - 1) / AL.up.n * 100)}%"></i></div></div>` : '';
  const groups = []; items.forEach((x, i) => { const key = (x.date || '').slice(0, 7) || 'x'; let g = groups[groups.length - 1]; if (!g || g.key !== key) { g = { key, items: [] }; groups.push(g); } g.items.push([x, i]); });
  const lab = k => { if (k === 'x') return 'Sans date'; const t = fmtD(k + '-01', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const tile = ([x, i]) => `<button class="alt" data-act="alb-open" data-i="${i}" aria-label="${x.kind === 'video' ? 'Vidéo' : 'Photo'}${x.cap ? ' : ' + esc(x.cap) : ''}">${x.thumb ? phImg(x.thumb, 'cover') : `<span class="alph">${ico('film', 30)}</span>`}${x.kind === 'video' ? `<span class="albdg">${ico('play', 14, 2)}</span>` : ''}</button>`;
  const body = items.length
    ? groups.map(g => `<div class="albm"><h3 class="albh">${esc(lab(g.key))}<span class="mut sm">${g.items.length}</span></h3><div class="albg">${g.items.map(tile).join('')}</div></div>`).join('')
    : emptyH('photo', 'Votre album est vide', 'Ajoutez les photos et vidéos de vos moments à deux. Vous les voyez tous les deux.', `<button class="btn btn-p" style="margin-top:14px" data-act="alb-add">${ico('plus', 18, 2.2)}Ajouter des photos</button>`);
  return `<div class="page wide">${hdr('Album', items.length ? items.length + ' souvenir' + (items.length > 1 ? 's' : '') : 'Vos souvenirs à deux', {})}<div class="content">${up}${body}
    <div class="card tint albq"><div class="row sm" style="justify-content:space-between"><span>Stockage gratuit</span><b>${phMo(used)} / 1 Go</b></div><div class="pg" style="margin-top:8px"><i style="width:${pct}%${pct > 85 ? ';background:var(--warn)' : ''}"></i></div><p class="mut sm" style="margin-top:8px">Vidéos : 50 Mo maximum chacune. Les photos sont réduites automatiquement (environ 300 Ko), il y a de la place pour des milliers.</p></div></div></div>`;
}
ACT['alb-add'] = () => albPick();
function albPick() {
  if (!PH.ok) return;
  if (AL.up) return toast('Un envoi est déjà en cours');
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,video/*'; i.multiple = true; i.hidden = true; document.body.appendChild(i);
  i.addEventListener('change', () => { const fs = [...i.files]; setTimeout(() => i.remove(), 500); albUpload(fs); });
  i.click();
}
function videoThumb(file) {
  return new Promise(res => {
    const u = URL.createObjectURL(file), v = document.createElement('video'); let done = false;
    const fin = b => { if (done) return; done = true; try { URL.revokeObjectURL(u); } catch (e) { /* */ } res(b); };
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = u;
    v.addEventListener('error', () => fin(null));
    v.addEventListener('loadedmetadata', () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 4); } catch (e) { fin(null); } });
    v.addEventListener('seeked', () => {
      try { const k = Math.min(1, 420 / Math.max(v.videoWidth, v.videoHeight, 1)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(v.videoWidth * k)); c.height = Math.max(1, Math.round(v.videoHeight * k)); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(b => fin(b), 'image/jpeg', .7); } catch (e) { fin(null); }
    });
    setTimeout(() => fin(null), 7000);
  });
}
async function albUpload(files) {
  if (!files.length) return;
  let used = albUsed(), ok = 0; const bad = [];
  AL.up = { n: files.length, i: 0, name: '' }; schedule();
  for (const f of files) {
    AL.up.i++; AL.up.name = f.name; schedule();
    const isV = /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f.name);
    try {
      if (isV && f.size > PH.max) { bad.push(f.name + ' : plus de 50 Mo'); continue; }
      if (used + (isV ? f.size : 400000) > PH.quota) { bad.push(f.name + ' : stockage plein'); continue; }
      const id = phKey() + Math.random().toString(36).slice(2, 5), base = 'album/' + id;
      let doc;
      if (isV) {
        const ext = ((f.name.match(/\.([a-z0-9]+)$/i) || [])[1] || 'mp4').toLowerCase(), path = base + '.' + ext, tb = await videoThumb(f);
        await phUpload(path, f, f.type || (ext === 'mov' ? 'video/quicktime' : 'video/mp4'));
        if (tb) await phUpload(phThumbOf(path), tb, 'image/jpeg');
        doc = { kind: 'video', path, thumb: tb ? phThumbOf(path) : '', size: f.size + (tb ? tb.size : 0), vt: f.type || '' };
      } else {
        const full = await phBlobOf(f, 2000, .8), th = await phBlobOf(f, 420, .7), path = base + '.jpg';
        await phUpload(path, full, 'image/jpeg'); await phUpload(phThumbOf(path), th, 'image/jpeg');
        doc = { kind: 'photo', path, thumb: phThumbOf(path), size: full.size + th.size };
      }
      doc.date = ymdOf(f.lastModified); doc.by = A.me; doc.ts = Date.now(); doc.cap = '';
      await put('album', id, doc); used += doc.size; ok++;
    } catch (e) {
      console.error(e); bad.push(f.name + ' : ' + (/createImageBitmap|image/i.test(String(e && e.message)) ? 'format non lu' : phErr(e)));
      if (/pas encore activé|refusé/.test(phErr(e))) break;
    }
  }
  AL.up = null; schedule();
  if (ok) toast(ok + (ok > 1 ? ' éléments ajoutés' : ' élément ajouté') + ' à l’album');
  if (bad.length) toast(bad[0] + (bad.length > 1 ? ' (+' + (bad.length - 1) + ')' : ''), 'err', 5000);
}

/* --- visionneuse plein écran --- */
function albEl() {
  let v = document.getElementById('albv');
  if (!v) { v = document.createElement('div'); v.id = 'albv'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); document.body.appendChild(v); }
  return v;
}
async function albShow(i) {
  const items = AL.list; if (!items.length) return albClose();
  i = (i + items.length) % items.length; AL.cur = i; const x = items[i], v = albEl(); v.classList.add('on'); document.body.classList.add('albopen');
  const who = x.by && NAMES[x.by] ? NAMES[x.by] : '';
  v.innerHTML = `<div class="albtop"><button class="ib flat" data-act="alb-close" aria-label="Fermer">${ico('x', 24)}</button><span class="albcnt">${i + 1} / ${items.length}</span><span class="sp"></span><button class="ib flat" data-act="alb-dl" aria-label="Enregistrer">${ico('download', 22)}</button><button class="ib flat" data-act="alb-del" aria-label="Supprimer">${ico('trash', 22)}</button></div>
    <div class="albmed" id="albmed"><div class="albspin"></div></div>
    ${items.length > 1 ? `<button class="albnav l" data-act="alb-prev" aria-label="Précédent">${ico('chevL', 28)}</button><button class="albnav r" data-act="alb-next" aria-label="Suivant">${ico('chevR', 28)}</button>` : ''}
    <div class="albcap"><input id="albv-cap" class="inp" maxlength="120" placeholder="Ajouter une légende" value="${esc(x.cap || '')}" data-id="${esc(x.id)}" autocomplete="off"><div class="sm">${who ? esc(who) + ' · ' : ''}${esc(x.date ? fmtD(x.date, { day: 'numeric', month: 'long', year: 'numeric' }) : '')}${x.size ? ' · ' + phMo(x.size) : ''}</div></div>`;
  const [u, tu] = await phUrls([x.path, x.thumb || '']);
  if (AL.cur !== i || !document.getElementById('albmed')) return;
  const m = document.getElementById('albmed');
  if (!u) { m.innerHTML = '<p class="albmsg">Impossible de charger ce média.</p>'; return; }
  m.innerHTML = x.kind === 'video' ? `<video src="${esc(u)}" ${tu ? `poster="${esc(tu)}"` : ''} controls playsinline preload="metadata"></video>` : `<img src="${esc(u)}" alt="${esc(x.cap || '')}">`;
  [items[(i + 1) % items.length], items[(i - 1 + items.length) % items.length]].forEach(n => { if (n && n.kind !== 'video') phUrls([n.path]).then(r => { if (r[0]) new Image().src = r[0]; }); });
}
function albClose() { const v = document.getElementById('albv'); if (v) { v.querySelectorAll('video').forEach(x => x.pause()); v.classList.remove('on'); v.innerHTML = ''; } document.body.classList.remove('albopen'); AL.cur = -1; }
ACT['alb-open'] = d => albShow(+d.i);
ACT['alb-close'] = () => albClose();
ACT['alb-prev'] = () => albShow(AL.cur - 1);
ACT['alb-next'] = () => albShow(AL.cur + 1);
ACT['alb-del'] = () => {
  const x = AL.list[AL.cur]; if (!x) return;
  confirmSheet({ title: x.kind === 'video' ? 'Supprimer cette vidéo ?' : 'Supprimer cette photo ?', text: 'Elle disparaît de l’album pour vous deux. C’est définitif.', ok: 'Supprimer', danger: true, onOk: async () => {
    const ok = await act(async () => { await phRemove([x.path, x.thumb]); await del('album', x.id, true); }, 'Supprimé');
    if (ok) { const n = albList(); AL.list = n; if (!n.length) albClose(); else albShow(Math.min(AL.cur, n.length - 1)); }
  } });
};
ACT['alb-dl'] = async () => {
  const x = AL.list[AL.cur]; if (!x) return;
  try {
    const [u] = await phUrls([x.path]); if (!u) throw new Error('url');
    toast('Préparation…');
    const r = await fetch(u), b = await r.blob(), ext = (x.path.match(/\.([a-z0-9]+)$/i) || [])[1] || 'jpg', name = 'chez-nous-' + (x.date || 'souvenir') + '.' + ext, file = new File([b], name, { type: b.type || (x.kind === 'video' ? 'video/mp4' : 'image/jpeg') });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) { console.error(e); toast('Téléchargement impossible', 'err'); }
};
document.addEventListener('change', e => {
  const t = e.target; if (!t || t.id !== 'albv-cap') return;
  const id = t.dataset.id; if (!id) return; const cap = t.value.trim();
  act(() => patch('album', id, { cap }), 'Légende enregistrée');
});
document.addEventListener('keydown', e => {
  if (AL.cur < 0 || document.getElementById('sheetRoot').classList.contains('open')) return;
  if (e.target && e.target.id === 'albv-cap') { if (e.key === 'Enter') e.target.blur(); return; }
  if (e.key === 'Escape') albClose(); else if (e.key === 'ArrowLeft') albShow(AL.cur - 1); else if (e.key === 'ArrowRight') albShow(AL.cur + 1);
});
(function () {
  let sx = 0, sy = 0, on = false;
  document.addEventListener('touchstart', e => { const m = e.target.closest && e.target.closest('#albmed'); on = !!m && e.touches.length === 1 && !e.target.closest('video'); if (on) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  document.addEventListener('touchend', e => { if (!on) return; on = false; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) albShow(AL.cur + (dx < 0 ? 1 : -1)); else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) albClose(); }, { passive: true });
})();
