-- Triggers /api/send-event-reminders on a schedule via Supabase's own
-- pg_cron + pg_net extensions, calling the endpoint over HTTP every 10
-- minutes. This is the *recommended* path if you're on Vercel's free Hobby
-- plan — Vercel Cron there only runs once a day, which is too infrequent for
-- a "starts in 30 minutes" reminder. (If you're on Vercel Pro, the
-- vercel.json cron already configured in this repo works fine on its own —
-- you don't need this file at all in that case.)
--
-- Setup:
--   1. In the Supabase dashboard: Database → Extensions → enable "pg_cron"
--      and "pg_net" (both are free, built into every project).
--   2. Replace the two placeholders below:
--        <YOUR-DEPLOYED-URL>  → your app's real deployed origin, e.g.
--                               https://vienna-trip.vercel.app
--        <YOUR-CRON-SECRET>   → the same value you set for CRON_SECRET in
--                               your deployment's environment variables
--   3. Run this whole file once in the SQL Editor.
--
-- To check it's firing: SQL Editor → select * from cron.job_run_details
-- order by start_time desc limit 20;
-- To remove it later: select cron.unschedule('send-event-reminders');

select cron.schedule(
  'send-event-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://vienna-trip-jki7.vercel.app//api/send-event-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer 21d80c3ff7a387b943c1643cad084eb147c897e77653fdbf',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
