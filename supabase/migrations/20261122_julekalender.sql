-- Lyskalenderen 2026 (brukt i drift fra 22.11.2026, prosjekt me-voteapp)
-- Anonyme stjerner og juleønsker. Ingen navn, ingen IP. Kun tilgang via funksjonene under.
create table public.jul_stjerner (
  id bigint generated always as identity primary key,
  dag smallint not null check (dag between 1 and 24),
  storrelse text not null check (storrelse in ('liten','middels','tanke')),
  laget timestamptz not null default now()
);
create table public.jul_onsker (
  id bigint generated always as identity primary key,
  aldersgruppe text not null check (aldersgruppe in ('1-6','7-14','15-17','18-25','26-39','40-59','60-120')),
  for_meg text check (char_length(for_meg) <= 500),
  for_andre text check (char_length(for_andre) <= 500),
  samtykke boolean not null check (samtykke = true),
  laget timestamptz not null default now()
);
alter table public.jul_stjerner enable row level security;
alter table public.jul_onsker enable row level security;
revoke all on public.jul_stjerner from anon, authenticated;
revoke all on public.jul_onsker from anon, authenticated;

create or replace function public.jul_tenn_stjerne(p_dag int, p_storrelse text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if p_dag < 1 or p_dag > 24 then raise exception 'ugyldig dag'; end if;
  insert into public.jul_stjerner(dag, storrelse) values (p_dag, p_storrelse);
  return (select count(*) from public.jul_stjerner);
end $$;

create or replace function public.jul_nordlys()
returns bigint language sql security definer stable set search_path = public as $$
  select count(*) from public.jul_stjerner;
$$;

create or replace function public.jul_send_onske(p_alder text, p_for_meg text, p_for_andre text, p_samtykke boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_samtykke,false) = false then raise exception 'samtykke mangler'; end if;
  if coalesce(trim(p_for_meg),'') = '' and coalesce(trim(p_for_andre),'') = '' then raise exception 'tomt'; end if;
  insert into public.jul_onsker(aldersgruppe, for_meg, for_andre, samtykke)
  values (p_alder, nullif(trim(left(p_for_meg,500)),''), nullif(trim(left(p_for_andre,500)),''), true);
  return true;
end $$;

revoke all on function public.jul_tenn_stjerne(int,text) from public;
revoke all on function public.jul_nordlys() from public;
revoke all on function public.jul_send_onske(text,text,text,boolean) from public;
grant execute on function public.jul_tenn_stjerne(int,text) to anon, authenticated;
grant execute on function public.jul_nordlys() to anon, authenticated;
grant execute on function public.jul_send_onske(text,text,text,boolean) to anon, authenticated;
