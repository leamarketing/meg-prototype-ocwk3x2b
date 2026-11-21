Migrering "marketing_consent_and_unsubscribe" ble kjørt direkte i Supabase-prosjektet me-voteapp 19.11.2026.
Nye felt i members: email_opt_in_at, sms_opt_in_at, phone, signup_source, unsub_token.
Ny tabell consent_events (bevis for samtykke, radsikkerhet: medlemmet ser bare sine egne).
Nye funksjoner: set_marketing_consent, set_signup_source (innlogget), unsubscribe (åpen, krever hemmelig token).
