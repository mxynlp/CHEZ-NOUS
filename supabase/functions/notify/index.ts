// Fonction planifiée (toutes les heures) : envoie les rappels Web Push. Gratuit sur le plan Supabase Free.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const DEF_RENT = { amount: 650, apl: 286, day: 1 };
const DEF_FIXED = [
  { label: "EDF (électricité)", amount: 65, day: 5 }, { label: "Wi-Fi / box internet", amount: 29.99, day: 8 },
  { label: "Netflix", amount: 13.49, day: 12 }, { label: "Disney+", amount: 9.99, day: 18 },
];
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function paris() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, hour: parseInt(p.hour, 10), dow: new Date(date + "T12:00:00Z").getUTCDay() };
}
const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";
const monday = (s: string) => addDays(s, -((new Date(s + "T12:00:00Z").getUTCDay() + 6) % 7));

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });
  const now = paris(), force = new URL(req.url).searchParams.get("hour");
  const hour = force ? parseInt(force, 10) : now.hour;
  const { data: subs } = await sb.from("push_subs").select("endpoint,uid,sub,prefs");
  if (!subs || !subs.length) return Response.json({ sent: 0, reason: "aucun abonné" });

  const get = async (path: string) => (await sb.from("docs").select("data").eq("path", path).maybeSingle()).data?.data ?? null;
  const col = async (c: string) => ((await sb.from("docs").select("id,data").eq("col", c)).data ?? []);
  const settings = (await get("settings/main")) ?? {};
  const rent = { ...DEF_RENT, ...(settings.rent ?? {}) }, fixed: any[] = settings.fixed ?? DEF_FIXED;

  const out: Record<string, { title: string; body: string; url: string; tag: string }[]> = {};
  const push = (uid: string, n: { title: string; body: string; url: string; tag: string }) => { (out[uid] ??= []).push(n); };
  const who: Record<string, string> = {};
  for (const s of subs) { const p = await get(`data/users/${s.uid}/profile`); who[s.uid] = p?.me ?? ""; }
  const wants = (s: any, k: string) => (s.prefs?.[k] ?? true) === true;

  if (hour === 19) {
    const tomorrow = addDays(now.date, 1), m = await get(`meals/${tomorrow}`);
    if (!m?.dinner) for (const s of subs) if (wants(s, "meals")) push(s.uid, { title: "Demain soir", body: "Rien de prévu pour le dîner de demain. On décide ?", url: "/?a=meal", tag: "meals" });
  }
  if (hour === 9) {
    const [y, mo, dom] = now.date.split("-").map(Number);
    const list = [{ label: "Loyer", amount: Math.max(0, rent.amount - rent.apl), day: rent.day }, ...fixed];
    const due = list.filter((f: any) => Math.min(f.day, dim(y, mo)) === dom);
    if (due.length) for (const s of subs) if (wants(s, "charges")) push(s.uid, { title: "Prélèvement aujourd’hui", body: due.map((f: any) => `${f.label} ${fmt(f.amount)}`).join(" · "), url: "/", tag: "charges" });
    const chores = await col("chores");
    for (const s of subs) {
      if (!wants(s, "chores")) continue;
      const mine = chores.filter((c: any) => {
        const d = c.data, assignee = d.who === "rotate" ? (d.turn || "") : d.who, last = d.last?.date;
        const dueDate = last ? addDays(last, d.every || 7) : (d.start || now.date);
        return assignee === who[s.uid] && dueDate <= now.date;
      });
      if (mine.length) push(s.uid, { title: "À faire aujourd’hui", body: mine.slice(0, 3).map((c: any) => c.data.title).join(" · "), url: "/", tag: "chores" });
    }
  }
  if (hour === 18 && now.dow === 0) {
    const w = addDays(monday(now.date), 7), end = addDays(w, 6), evs = (await col("events")).filter((e: any) => e.data.date >= w && e.data.date <= end).length;
    let planned = 0; for (let i = 0; i < 7; i++) if ((await get(`meals/${addDays(w, i)}`))?.dinner) planned++;
    for (const s of subs) if (wants(s, "week")) push(s.uid, { title: "Ta semaine à venir", body: `${evs} événement${evs > 1 ? "s" : ""} · ${planned}/7 dîners prévus`, url: "/", tag: "week" });
  }

  let sent = 0;
  for (const s of subs) {
    for (const n of out[s.uid] ?? []) {
      try { await webpush.sendNotification(s.sub, JSON.stringify(n)); sent++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint); }
    }
  }
  return Response.json({ sent, hour });
});
