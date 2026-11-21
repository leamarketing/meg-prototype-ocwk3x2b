-- Tidssonen på fødestedet, for fødsel utenfor Norge (brukt i drift fra 21.11.2026, prosjekt me-voteapp)
alter table public.members add column if not exists birth_tz text check (birth_tz is null or (length(birth_tz) <= 64 and birth_tz ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$'));
comment on column public.members.birth_tz is 'Tidssonen på fødestedet (IANA, f.eks. America/Maceio). Tom betyr norsk tid.';
