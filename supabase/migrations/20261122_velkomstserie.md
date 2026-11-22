Kjørt direkte i Supabase-prosjektet me-voteapp 22.11.2026 (migreringene welcome_series_sending og welcome_series_cron):
- Utvidelsene pg_net og pg_cron er slått på.
- Tabellen email_sends: hver velkomst-e-post per medlem (unik på medlem + e-post, så ingen får samme e-post to ganger).
- Tabellen mail_settings (én rad): enabled (bryter, står AV), start_after (bare medlemmer med prøvetid etter denne datoen får serien), test_email.
- Hemmelig nøkkel velkomst_cron_key: kryptert i Vault, sha256 i app_secrets.
- Timer (pg_cron) "velkomst-utsending" hver time kl. xx:07 kaller funksjonen med mode run. Den sender bare når enabled er true og start_after er satt, og bare mellom kl. 08 og 21 norsk tid.
- Funksjonshemmeligheten RESEND_API_KEY er satt (sendenøkkel for me.voteapp.eu).

Slå på:  update public.mail_settings set enabled = true, start_after = now(), updated_at = now() where id = 1;
Slå av:  update public.mail_settings set enabled = false, updated_at = now() where id = 1;
