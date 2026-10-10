import re
import os
R=os.path.dirname(os.path.abspath(__file__))+'/'
rd=lambda f:open(R+f).read()
head=rd('src/00-head.html'); body=rd('src/10-body.html')
prof=rd('src/35-profile.js')
anchor="${c.demo ? `<button class=\"li\" data-act=\"reset-ask\">"
assert anchor in prof
prof=prof.replace(anchor,"${typeof signOutLi==='function'?signOutLi():''}\n      "+anchor,1)
extra_css="""
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0}
img{max-width:100%}[hidden]{display:none!important}
#auth{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg)}
#auth.on{display:flex}
.auth-card{width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;text-align:center;align-items:stretch}
.auth-card h1{margin:0;font-size:30px;letter-spacing:-.02em}
.auth-card p{margin:0 0 8px}
.auth-card form{display:flex;flex-direction:column;gap:10px;text-align:left}
.auth-logo{align-self:center;width:72px;height:72px;border-radius:22px;display:grid;place-items:center;background:var(--mint);color:var(--accent-ink)}
.auth-msg{min-height:20px;font-size:13px;color:var(--bad)}
"""
head=head.replace('</style>',extra_css+'</style>',1)
title=re.search(r'<title>.*?</title>',head).group(0)
head=head.replace(title,'',1)
body=body.replace('<div id="gate"></div>','<div id="gate"></div>\n<div id="auth"></div>')
js=''.join(rd(f) for f in ['src/20-core.js','src/30-ui.js'])+prof+''.join(rd(f) for f in ['src/40-home.js','src/50-plan.js','src/60-meal.js','src/70-budget.js','src/80-extras.js','src/85-photos.js'])
js+=open(R+'src/15-supabase.js').read()+open(R+'src/91-boot-pwa.js').read()
html=f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}
<meta name="theme-color" content="#F7FAF8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1A15" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Chez nous">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
{head}
</head><body>
{body}
<script src="/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>
{js}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {{}}));
</script>
</body></html>"""
open(R+'public/index.html','w').write(html)
