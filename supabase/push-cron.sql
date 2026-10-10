-- À exécuter UNE FOIS, après avoir déployé la fonction « notify » (voir LISEZ-MOI, étape notifications).
-- Remplace les deux valeurs entre <...>.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'chez-nous-notify',
  '0 * * * *',                       -- toutes les heures pile ; la fonction décide quoi envoyer selon l'heure de Paris
  $$ select net.http_post(
       url := 'https://<REF_PROJET>.supabase.co/functions/v1/notify',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
       body := '{}'::jsonb
     ); $$
);
-- Pour arrêter : select cron.unschedule('chez-nous-notify');
