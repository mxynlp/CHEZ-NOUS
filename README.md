# Chez nous

Appli à deux (Maxym & Sasha) : planning de présence, repas + courses, budget du foyer, tâches. 100 % gratuite : aucune IA, aucune API payante.

## Fonctions
- **Planning** : mois / semaine / jour, sélection de plusieurs jours ou semaines d'un coup, modèles de semaine, répétitions, créneaux libres à deux, résumé de la semaine à venir.
- **Repas** : grille midi/soir, plats favoris, idée repas (selon l'historique ou selon les achats), restes du soir pour le lendemain, liste de courses partagée en direct avec articles habituels, total de caisse → dépense.
- **Budget** : répartition 50/50 ou sur mesure, loyer - APL, charges fixes automatiques, solde « Régler », budgets cibles avec alerte de dépassement, « qui a avancé quoi », photo du ticket, export CSV. Revenus et dépenses perso privés.
- **Tâches du foyer** : rotation automatique entre vous deux.
- **Annuler** : après une suppression ou une modification en masse, un bouton « Annuler » apparaît 7 secondes.
- **Raccourcis d'icône** (appui long) : nouvelle dépense, courses, planning.
- **Notifications** (facultatives) : repas de demain non prévu, prélèvement du jour, tâche du jour, résumé du dimanche.

## Structure
- `src/` : code source (HTML/CSS/JS sans dépendance), un fichier par module.
- `build.py` : assemble `src/` en `public/index.html` → `python3 build.py` (à relancer après chaque modification dans `src/`).
- `public/` : le site à déployer (Vercel). `config.js` contient l'URL et la clé Supabase (+ clé publique des notifications).
- `supabase/schema.sql` : base, règles de sécurité, tickets, abonnements push.
- `supabase/functions/notify/` + `supabase/push-cron.sql` : notifications (facultatif).

## Coûts : tout reste gratuit
- Vercel « Hobby » : gratuit pour un usage personnel.
- Supabase « Free » : 500 Mo de base, 1 Go de fichiers, 50 000 utilisateurs, fonctions et tâche planifiée incluses. Votre usage en consomme une infime partie. À savoir : un projet gratuit inactif 7 jours est mis en pause (un clic pour le relancer) ; en l'utilisant tous les jours, ça n'arrive pas.
- Notifications : Web Push est gratuit (aucun service tiers).
