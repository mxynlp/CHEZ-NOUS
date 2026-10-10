# Chez nous

Appli à deux (Maxym & Sasha) : planning de présence, repas + courses, budget du foyer.

- `src/` : code source (HTML/CSS/JS sans dépendance), découpé par module.
- `build.py` : assemble `src/` en `public/index.html` → `python3 build.py`
- `public/` : le site à déployer (Vercel). `config.js` contient l'URL et la clé Supabase.
- `supabase/schema.sql` : base de données + règles de sécurité (seuls les e-mails de la table `members` accèdent aux données ; revenus/dépenses perso privés).

Le déploiement (Supabase + Vercel) se fait quand le résultat vous convient.
