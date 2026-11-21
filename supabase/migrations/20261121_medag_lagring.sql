-- Min dag: lagring på kontoen (brukt i drift fra 21.11.2026, prosjekt me-voteapp)
create table public.medag_lagring (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  noekkel text not null check (noekkel in ('todos','chosen','have','following','interests','joined','dager','sang','sang-utkast','lotto-rekker')),
  verdi jsonb not null check (pg_column_size(verdi) < 200000),
  endret timestamptz not null default now(),
  primary key (user_id, noekkel)
);
alter table public.medag_lagring enable row level security;
create policy medag_lagring_select_own on public.medag_lagring for select to authenticated using ((select auth.uid()) = user_id);
create policy medag_lagring_insert_own on public.medag_lagring for insert to authenticated with check ((select auth.uid()) = user_id);
create policy medag_lagring_update_own on public.medag_lagring for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy medag_lagring_delete_own on public.medag_lagring for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.medag_lagring from anon;
grant select, insert, update, delete on public.medag_lagring to authenticated;
