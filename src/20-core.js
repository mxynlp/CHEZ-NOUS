'use strict';
/* =====================================================================
   CHEZ NOUS — application partagée Maxym & Sasha
   Sections : 1 Utilitaires · 2 Icônes · 3 Constantes · 4 Données (stockage partagé)
   5 Sélecteurs · 6 Composants (feuilles, toasts) · 7 Profil · 8 Accueil
   9 Planning · 10 Repas · 11 Budget · 12 Routeur & événements · 13 Démarrage
   ===================================================================== */

/* ---------- 1. Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pd = s => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return dstr(d); };
const today = () => dstr(new Date());
const wdi = s => (pd(s).getDay() + 6) % 7;            // lundi = 0
const monday = s => addDays(s, -wdi(s));
const ymOf = s => s.slice(0, 7);
const addM = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const dim = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); };
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const fmtD = (s, o) => new Intl.DateTimeFormat('fr-FR', o).format(pd(s));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthLabel = m => cap(fmtD(m + '-01', { month: 'long', year: 'numeric' }));
const dayLong = s => cap(fmtD(s, { weekday: 'long', day: 'numeric', month: 'long' }));
const dayShort = s => fmtD(s, { day: 'numeric', month: 'short' });
const isoWeek = s => { const d = pd(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const r2 = n => Math.round(n * 100) / 100;
const fmt = n => { n = r2(n); return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n); };
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : NaN; };
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const clean = o => JSON.parse(JSON.stringify(o));
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
function dm(a, b) { const o = Object.assign({}, a); for (const k in b) o[k] = (isObj(b[k]) && isObj(a && a[k])) ? dm(a[k], b[k]) : b[k]; return o; }
function qtyStr(q) { return Number.isInteger(q) ? String(q) : String(r2(q)).replace('.', ','); }

/* ---------- 2. Icônes (trait fin et arrondi, façon SF Symbols) ---------- */
const IC = {
  home: 'M3.5 10.8 12 3.5l8.5 7.3M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5',
  cal: 'M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5ZM8 3v4M16 3v4M4 10h16',
  meal: 'M7 3.5v7M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5M7 11v9.5M17 20.5v-17c-2.4 1.3-3.5 4-3.5 7V13H17',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1.5M4 7.5v9A2.5 2.5 0 0 0 6.5 19H19a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 19 8H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.5h.01',
  plus: 'M12 5v14M5 12h14',
  chevL: 'M14.5 5.5 8 12l6.5 6.5',
  chevR: 'M9.5 5.5 16 12l-6.5 6.5',
  chevD: 'M5.5 9.5 12 16l6.5-6.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v6M14 11v6',
  edit: 'M4 20l1-4L16.5 4.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8 19l-4 1Z',
  repeat: 'M5 11V9.5A3.5 3.5 0 0 1 8.5 6H19m0 0-3-3m3 3-3 3M19 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5m0 0 3 3m-3-3 3-3',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16.5 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3 2.5 3 5.2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6',
  cart: 'M3.5 4.5H6l2 11h9.5l1.8-8H7M10 20h.01M17 20h.01',
  sparkle: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5ZM18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
  eyeoff: 'M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.2 7.6A15.7 15.7 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8M10 10a2.8 2.8 0 0 0 4 4',
  target: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01',
  download: 'M12 4v11M7.5 11 12 15.5 16.5 11M5 19.5h14',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2',
  note: 'M6 4h9l3.5 3.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9 12h6M9 15.5h4',
  bell: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5ZM10 20.5h4',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  copy: 'M8.5 8.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 19v-9a1.5 1.5 0 0 1 1.5-1.5ZM4.5 15.5v-10A1.5 1.5 0 0 1 6 4h10',
  lock: 'M6.5 10.5h11a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1ZM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
  swap: 'M4 8h14m0 0-3.5-3.5M18 8l-3.5 3.5M20 16H6m0 0 3.5-3.5M6 16l3.5 3.5',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 11v5.5M12 7.8h.01',
  filter: 'M4 6.5h16M7 12h10M10 17.5h4',
  arrowR: 'M5 12h14m-5-5 5 5-5 5'
};
const ico = (n, s = 22, w = 1.8) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n]}"/></svg>`;

/* ---------- 3. Constantes ---------- */
const PIDS = ['maxym', 'sasha'];
const NAMES = { maxym: 'Maxym', sasha: 'Sasha' };
const otherP = p => p === 'maxym' ? 'sasha' : 'maxym';
const SLOTS = [{ k: 'm', l: 'Matin' }, { k: 'a', l: 'Après-midi' }, { k: 's', l: 'Soir' }];
const DAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const DAYL = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAYN = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const DEF_PLACES = [
  { id: 'home', label: 'Maison', icon: '🏠', color: '#7FB89A' },
  { id: 'office', label: 'Bureau / Travail', icon: '🏢', color: '#7BA7D9' },
  { id: 'remote', label: 'Télétravail', icon: '💻', color: '#A99BD8' },
  { id: 'family', label: 'Chez ma famille', icon: '👨‍👩‍👧', color: '#F0B27A' },
  { id: 'friends', label: 'Chez des amis', icon: '🥂', color: '#E8A0B8' },
  { id: 'away', label: 'En déplacement', icon: '🚆', color: '#79BCC4' },
  { id: 'trip', label: 'En voyage', icon: '✈️', color: '#E5C76B' },
  { id: 'other', label: 'Autre', icon: '📍', color: '#B5BDB8' }
];
const DEF_CATS = [
  { id: 'rent', label: 'Loyer', icon: '🏠', color: '#7FB89A' },
  { id: 'groceries', label: 'Courses', icon: '🛒', color: '#A8D5BA' },
  { id: 'energy', label: 'Énergie', icon: '⚡', color: '#F0D58A' },
  { id: 'subs', label: 'Abonnements', icon: '📺', color: '#B9A9E0' },
  { id: 'internet', label: 'Internet', icon: '📶', color: '#8CC3D9' },
  { id: 'dining', label: 'Restaurants et sorties', icon: '🍽️', color: '#F0B27A' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#9DB4C0' },
  { id: 'health', label: 'Santé', icon: '💊', color: '#E58C8C' },
  { id: 'fun', label: 'Loisirs', icon: '🎬', color: '#D9A3C7' },
  { id: 'gifts', label: 'Cadeaux', icon: '🎁', color: '#E8B4A0' },
  { id: 'other', label: 'Autre', icon: '🧾', color: '#BFC8C2' }
];
// Montants d'exemple : à corriger dans Budget > Charges fixes. pct = part de Maxym en %
const DEF_FIXED = [
  { id: 'edf', label: 'EDF (électricité)', cat: 'energy', amount: 65, day: 5, paidBy: 'maxym', pct: 50 },
  { id: 'wifi', label: 'Wi-Fi / box internet', cat: 'internet', amount: 29.99, day: 8, paidBy: 'sasha', pct: 50 },
  { id: 'netflix', label: 'Netflix', cat: 'subs', amount: 13.49, day: 12, paidBy: 'sasha', pct: 50 },
  { id: 'disney', label: 'Disney+', cat: 'subs', amount: 9.99, day: 18, paidBy: 'maxym', pct: 50 }
];
const DEF_RENT = { amount: 650, apl: 286, day: 1, paidBy: 'maxym' };
const DEF_TARGETS = { groceries: 400 };
const MEAL_WHERE = [{ id: 'home', l: 'Maison' }, { id: 'out', l: 'Dehors' }, { id: 'resto', l: 'Restaurant' }, { id: 'delivery', l: 'Livraison' }, { id: 'family', l: 'Chez des proches' }];
const REC_CATS = [{ id: 'pates', l: 'Pâtes' }, { id: 'viande', l: 'Viande' }, { id: 'poisson', l: 'Poisson' }, { id: 'veggie', l: 'Végétarien' }, { id: 'rapide', l: 'Rapide' }, { id: 'soupe', l: 'Soupe & salade' }, { id: 'autre', l: 'Autre' }];
const AISLES = [{ id: 'fruits', l: 'Fruits et légumes' }, { id: 'viande', l: 'Viandes et poissons' }, { id: 'cremerie', l: 'Crèmerie' }, { id: 'pain', l: 'Boulangerie' }, { id: 'epicerie', l: 'Épicerie' }, { id: 'surgele', l: 'Surgelés' }, { id: 'boissons', l: 'Boissons' }, { id: 'maison', l: 'Maison et hygiène' }, { id: 'autre', l: 'Autre' }];
const AISLE_RX = [
  ['fruits', /tomate|salade|carotte|courgette|oignon|\bail\b|poivron|pomme|banane|citron|orange|fraise|champignon|aubergine|epinard|brocoli|patate|concombre|avocat|persil|basilic|coriandre|legume|fruit|poireau|courge|haricot vert|chou|radis|menthe|gingembre|echalote|mangue|raisin|poire|kiwi|ciboulette/],
  ['viande', /poulet|boeuf|bœuf|porc|jambon|lardon|saumon|poisson|thon|crevette|steak|saucisse|dinde|agneau|viande|merguez|cabillaud|bacon|veau|canard|haché|hache/],
  ['cremerie', /lait|beurre|creme|fromage|yaourt|yogourt|oeuf|œuf|mozzarella|parmesan|gruy|emmental|feta|chevre|skyr|raclette|comte|ricotta/],
  ['pain', /\bpain\b|baguette|brioche|tortilla|wrap|pita|burger bun/],
  ['surgele', /surgel|glace|frites/],
  ['boissons', /\beau\b|\bjus\b|\bvin\b|biere|soda|cafe|\bthe\b|sirop|limonade/],
  ['maison', /papier|lessive|eponge|savon|shampo|dentifrice|vaisselle|sac poubelle|essuie|coton/]
];
function guessAisle(name) { const n = norm(name); for (const [a, rx] of AISLE_RX) if (rx.test(n)) return a; return 'epicerie'; }
const UNITS = ['kg', 'g', 'mg', 'cl', 'ml', 'l', 'cas', 'cac', 'cuillere', 'cuilleres', 'pincee', 'pincees', 'tranche', 'tranches', 'boite', 'boites', 'sachet', 'sachets', 'gousse', 'gousses', 'pot', 'pots', 'bouquet', 'bouquets', 'paquet', 'paquets'];
function parseIng(line) {
  line = String(line || '').trim(); if (!line) return null;
  const m = line.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { q: null, u: '', n: line, a: guessAisle(line) };
  const q = num(m[1]); let rest = m[2].trim(), u = '';
  const w = rest.match(/^([A-Za-zÀ-ÿ.]+)\s*(.*)$/);
  if (w && UNITS.includes(norm(w[1].replace(/\.$/, '')))) { u = w[1].replace(/\.$/, '').toLowerCase(); rest = w[2]; }
  rest = rest.replace(/^(de |d'|d’|du |des )/i, '').trim();
  if (!rest) return { q: null, u: '', n: line, a: guessAisle(line) };
  return { q, u, n: rest, a: guessAisle(rest) };
}
const ingText = i => (i.q != null ? qtyStr(i.q) + ' ' : '') + (i.u ? i.u + ' ' : '') + i.n;

/* ---------- 4. Données : stockage partagé (db) avec repli local ---------- */
const A = { me: null, tab: 'home', ready: false, sync: 'boot', hide: false, anim: null, canWrite: null,
  plan: { level: 'week', date: today(), month: ymOf(today()) },
  meal: { sub: 'week', week: monday(today()), level: 'week', date: today(), cat: '' },
  bud: { sub: 'over', month: ymOf(today()), f: { q: '', cat: '', who: '', per: 'month' } } };
let DB = null, UID = null;
const D = { settings: null, presence: {}, events: {}, meals: {}, recipes: {}, expenses: {}, shopitems: {}, shopchecks: {}, recurring: {}, goals: {}, contribs: {}, months: {}, priv: {} };
const SHARED = ['presence', 'events', 'meals', 'recipes', 'expenses', 'shopitems', 'shopchecks', 'recurring', 'goals', 'contribs', 'months'];
const LSK = 'chez-nous-local-v1';
const UNS = [];
const useDb = col => !!DB && (col !== 'priv' || !!UID);
const localCols = () => !DB ? [...SHARED, 'settings', 'priv'] : (!UID ? ['priv'] : []);
function persist() { const cols = localCols(); if (!cols.length) return; const o = {}; cols.forEach(c => { o[c] = D[c]; }); lsSet(LSK, JSON.stringify(o)); }
function loadLocal() { const cols = localCols(); if (!cols.length) return; try { const o = JSON.parse(lsGet(LSK) || '{}'); cols.forEach(c => { if (o[c]) D[c] = o[c]; }); } catch (e) { /* données locales illisibles */ } }
const pth = (col, id) => col === 'priv' ? 'data/users/' + UID + '/' + id : col === 'settings' ? 'settings/main' : col + '/' + id;
const Q = {};
function chain(k, fn) { const p = (Q[k] || Promise.resolve()).catch(() => { }).then(fn); Q[k] = p; return p; }
async function dbDo(fn) { try { return await fn(); } catch (e) { if (e && e.code === 'unavailable') { await sleep(300 + Math.random() * 500); return await fn(); } throw e; } }
function localApply(col, id, data, merge, remove) {
  if (col === 'settings') D.settings = merge ? dm(D.settings || {}, data) : data;
  else if (remove) delete D[col][id];
  else D[col][id] = merge ? dm(D[col][id] || {}, data) : data;
  persist(); schedule();
}
function put(col, id, data) {
  data = clean(data);
  if (!useDb(col)) { localApply(col, id, data, false); return Promise.resolve(); }
  const p = pth(col, id);
  return chain(p, () => dbDo(() => DB.doc(p).set(data)));
}
function patch(col, id, data) {
  data = clean(data);
  const cur = col === 'settings' ? D.settings : (D[col] || {})[id];
  if (cur && cur.demo && data.demo === undefined) data = Object.assign({}, data, { demo: false });
  if (!useDb(col)) { localApply(col, id, data, true); return Promise.resolve(); }
  const p = pth(col, id);
  return chain(p, async () => { try { await dbDo(() => DB.doc(p).update(data)); } catch (e) { if (e && e.code === 'invalid_argument') await dbDo(() => DB.doc(p).set(data)); else throw e; } });
}
function del(col, id) {
  if (!useDb(col)) { localApply(col, id, null, false, true); return Promise.resolve(); }
  const p = pth(col, id);
  return chain(p, () => dbDo(() => DB.doc(p).delete()));
}
let lastErr = 0;
function writeErr(e) {
  console.error(e); const now = Date.now(); if (now - lastErr < 2500) return; lastErr = now;
  const c = e && e.code;
  if (c === 'invalid_argument' || c === 'revoked' || c === 'not_granted') toast('Écriture refusée. Demande à Maxym de t’inviter comme éditeur (menu Partager), sans lien public.', 'err', 5600);
  else if (c === 'quota_exceeded') toast('Le stockage est plein. Supprime d’anciennes données.', 'err');
  else toast('Enregistrement impossible. Vérifie ta connexion et réessaie.', 'err');
}
async function act(fn, ok) { try { await fn(); if (ok) toast(ok); return true; } catch (e) { writeErr(e); return false; } }
function setSync(meta) { const s = meta && meta.fromCache ? 'cache' : 'live'; if (A.sync !== s) { A.sync = s; } }
function dbErr(e) { console.error(e); if (e && e.code === 'revoked') { A.sync = 'off'; toast('Synchronisation interrompue. Recharge la page.', 'err'); } }
function subscribeAll() {
  const ps = [];
  const one = mk => new Promise(res => { let f = true; const done = () => { if (f) { f = false; res(); } }; try { mk(done); } catch (e) { dbErr(e); done(); } });
  SHARED.forEach(col => ps.push(one(done => { UNS.push(DB.collection(col).onSnapshot(s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); D[col] = m; setSync(s.metadata); done(); schedule(); }, e => { dbErr(e); done(); })); })));
  ps.push(one(done => { UNS.push(DB.doc('settings/main').onSnapshot(s => { D.settings = s.exists ? s.data() : null; setSync(s.metadata); done(); schedule(); }, e => { dbErr(e); done(); })); }));
  if (UID) ps.push(one(done => { UNS.push(DB.collection('data/users/' + UID).onSnapshot(s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); D.priv = m; done(); schedule(); }, e => { dbErr(e); done(); })); }));
  return Promise.all(ps);
}
let rq = 0, _ae = null;
function schedule() { _ae = null; if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }

/* ---------- 5. Sélecteurs ---------- */
function cfg() {
  const s = D.settings || {};
  return { places: s.places || DEF_PLACES, cats: s.cats || DEF_CATS, fixed: s.fixed || DEF_FIXED, rent: Object.assign({}, DEF_RENT, s.rent || {}),
    targets: s.targets || DEF_TARGETS, diet: s.diet || {}, demo: !!s.demo, amountsOk: !!s.amountsOk };
}
const placeById = id => cfg().places.find(p => p.id === id) || null;
const catById = id => cfg().cats.find(c => c.id === id) || { id, label: 'Autre', icon: '🧾', color: '#BFC8C2' };
const av = (p, s = 28) => `<span class="av" style="--c:var(--${p});--o:var(--on-${p});--s:${s}px" aria-hidden="true">${NAMES[p][0]}</span>`;
const avs = list => `<span class="avs">${list.map(p => av(p, 26)).join('')}</span>`;
const whoList = w => w === 'both' ? PIDS.slice() : [w];
const whoName = w => w === 'both' ? 'Nous deux' : (w === A.me ? 'Moi' : NAMES[w]);
function slotPlace(p, d, k) {
  const e = D.presence[d] && D.presence[d][p] && D.presence[d][p][k]; if (e) return e;
  const r = recFor(p, d, k); return r ? r.place : '';
}
function recFor(p, d, k) {
  const wd = wdi(d); let best = null;
  for (const r of Object.values(D.recurring)) if (r.person === p && r.wd === wd && (r.slots || []).includes(k) && (!r.from || r.from <= d)) { if (!best || (r.ts || 0) > (best.ts || 0)) best = r; }
  return best;
}
const isRec = (p, d, k) => !(D.presence[d] && D.presence[d][p] && D.presence[d][p][k]) && !!recFor(p, d, k);
const together = (d, k) => slotPlace('maxym', d, k) === 'home' && slotPlace('sasha', d, k) === 'home';
const togetherCount = (d) => SLOTS.filter(s => together(d, s.k)).length;
const eventsOn = d => Object.entries(D.events).filter(([, e]) => e.date === d).map(([id, e]) => ({ id, ...e })).sort((a, b) => (a.time || '').localeCompare(b.time || '') || String(a.title).localeCompare(String(b.title)));
const mealOf = (d, k) => (D.meals[d] && D.meals[d][k]) || null;
function allExp() {
  if (_ae) return _ae; const out = [];
  for (const [id, e] of Object.entries(D.expenses)) out.push({ id, ...e, _loc: 'shared' });
  for (const [id, e] of Object.entries(D.priv)) if (id.startsWith('pexp_')) out.push({ id, ...e, _loc: 'priv' });
  out.sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.ts || 0) - (a.ts || 0));
  return (_ae = out);
}
const isShared = e => e._loc !== 'priv' && e.mode !== 'perso';
function netM() { // > 0 : Sasha doit de l'argent à Maxym
  let n = 0;
  for (const e of allExp()) {
    if (!isShared(e)) continue;
    if (e.kind === 'settle') { n += e.from === 'maxym' ? e.amount : -e.amount; continue; }
    const sh = e.shares || { maxym: e.amount / 2, sasha: e.amount / 2 };
    n += (e.paidBy === 'maxym' ? e.amount : 0) - (sh.maxym || 0);
  }
  return r2(n);
}
const myBalance = () => A.me === 'maxym' ? netM() : -netM();
const monthExp = m => allExp().filter(e => e.kind !== 'settle' && e.date && e.date.slice(0, 7) === m);
const commonTotal = m => r2(monthExp(m).filter(isShared).reduce((a, e) => a + e.amount, 0));
function buildShares(amount, mode, paidBy, pct) {
  if (mode === 'perso') return { [paidBy]: amount, [otherP(paidBy)]: 0 };
  const pm = mode === 'custom' ? Math.min(100, Math.max(0, pct)) : 50;
  const m = Math.round(amount * pm) / 100; return { maxym: m, sasha: r2(amount - m) };
}
function nextFixed() {
  const c = cfg(), t = today(), m = ymOf(t); const list = [{ id: 'rent', label: 'Loyer', amount: Math.max(0, c.rent.amount - c.rent.apl), day: c.rent.day, cat: 'rent' }].concat(c.fixed.map(f => ({ id: f.id, label: f.label, amount: f.amount, day: f.day, cat: f.cat })));
  let best = null;
  for (const f of list) {
    let d = m + '-' + pad(Math.min(f.day, dim(m))); if (d < t) { const m2 = addM(m, 1); d = m2 + '-' + pad(Math.min(f.day, dim(m2))); }
    if (!best || d < best.date) best = { ...f, date: d };
  }
  return best;
}
function groceryItems(week) {
  const agg = {};
  for (let i = 0; i < 7; i++) {
    const m = D.meals[addDays(week, i)]; if (!m) continue;
    for (const k of ['lunch', 'dinner']) {
      const ml = m[k]; if (!ml || !ml.name) continue;
      const rec = (ml.recipeId && D.recipes[ml.recipeId]) || Object.values(D.recipes).find(r => norm(r.name) === norm(ml.name));
      if (!rec || !rec.ingredients) continue;
      for (const ing of rec.ingredients) {
        const key = (norm(ing.n) + '_' + (ing.u || '')).replace(/[^a-z0-9_]/gi, '').slice(0, 60) || 'x';
        const o = agg[key] || (agg[key] = { key, name: ing.n, unit: ing.u || '', qty: 0, hasQty: false, aisle: ing.a || guessAisle(ing.n), from: [] });
        if (ing.q != null) { o.qty += ing.q; o.hasQty = true; }
        if (!o.from.includes(rec.name)) o.from.push(rec.name);
      }
    }
  }
  return Object.values(agg);
}
