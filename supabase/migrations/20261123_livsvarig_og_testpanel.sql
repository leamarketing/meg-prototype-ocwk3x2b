-- Livsvarig medlemskap og testpanel (23.11.2026)
-- 1) Ny status 'lifetime': tilgang til alle moduler for alltid. Settes bare av Lyse/admin i databasen.
-- 2) Ny status 'testpanel': gratis tilgang i et antall dager (standard 7) via en invitasjonskode.
--    Testeren går gjennom modulen (sjekkliste) og sender svar på minst 16 ord per spørsmål.

alter table public.members drop constraint if exists members_status_check;
alter table public.members add constraint members_status_check
  check (status in ('trial','wants_to_continue','active','ended','lifetime','testpanel'));
alter table public.members add column if not exists access_until timestamptz;
alter table public.members add column if not exists test_module text;

-- Betalingswebhooken skal aldri ta fra noen et livsvarig medlemskap.
create or replace function public.mark_member_ended(p_email text)
 returns uuid language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare v_id uuid;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_id is null then return null; end if;
  update public.members set status = 'ended', updated_at = now() where id = v_id and status <> 'lifetime';
  return v_id;
end $function$;

create or replace function public.mark_member_paid(p_email text, p_ref text)
 returns uuid language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare v_id uuid;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_id is null then return null; end if;
  update public.members
     set status = case when status = 'lifetime' then 'lifetime' else 'active' end,
         paid_until = greatest(coalesce(paid_until, now()), now()) + interval '31 days',
         scale_ref = coalesce(p_ref, scale_ref),
         status_answered_at = coalesce(status_answered_at, now()),
         updated_at = now()
   where id = v_id;
  return v_id;
end $function$;

-- Invitasjoner til testpanelet. Lages av Lyse/admin. Ingen tilgang fra nettleseren direkte.
create table if not exists public.testpanel_invites (
  code text primary key check (code ~ '^[A-Za-z0-9_-]{4,40}$'),
  module text not null check (char_length(module) <= 40),
  access_days int not null default 7 check (access_days between 1 and 60),
  test_days int not null default 3 check (test_days between 1 and 30),
  max_uses int not null default 20 check (max_uses between 1 and 1000),
  used int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.testpanel_invites enable row level security;

-- Testerens gang gjennom modulen og svarene. Én rad per tester og modul.
create table if not exists public.testpanel_runs (
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  invite_code text references public.testpanel_invites(code) on delete set null,
  started_at timestamptz not null default now(),
  test_until timestamptz not null,
  checklist jsonb not null default '{}'::jsonb,
  walked_through_at timestamptz,
  primary key (user_id, module)
);
alter table public.testpanel_runs enable row level security;
create policy testpanel_runs_select_own on public.testpanel_runs for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.testpanel_answers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  question text not null check (char_length(question) <= 300),
  answer text not null check (char_length(answer) <= 5000),
  words int not null check (words > 15),
  created_at timestamptz not null default now()
);
create index if not exists testpanel_answers_user_idx on public.testpanel_answers(user_id, module);
alter table public.testpanel_answers enable row level security;
create policy testpanel_answers_select_own on public.testpanel_answers for select to authenticated
  using ((select auth.uid()) = user_id);

-- Bli med i testpanelet med en kode. Gir gratis tilgang i access_days. Et livsvarig eller betalende medlem beholder sin status.
create or replace function public.join_testpanel(p_code text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare inv public.testpanel_invites; me uuid := auth.uid(); st text;
begin
  if me is null then return jsonb_build_object('ok', false, 'why', 'login'); end if;
  select * into inv from public.testpanel_invites where code = trim(p_code) and active for update;
  if not found then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  if exists (select 1 from public.testpanel_runs where user_id = me and module = inv.module) then
    return jsonb_build_object('ok', true, 'module', inv.module, 'again', true);
  end if;
  if inv.used >= inv.max_uses then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  update public.testpanel_invites set used = used + 1 where code = inv.code;
  insert into public.testpanel_runs (user_id, module, invite_code, test_until)
    values (me, inv.module, inv.code, now() + make_interval(days => inv.test_days));
  select status into st from public.members where id = me;
  if st not in ('lifetime', 'active') then
    update public.members
       set status = 'testpanel', test_module = inv.module, updated_at = now(),
           access_until = greatest(coalesce(access_until, now()), now() + make_interval(days => inv.access_days))
     where id = me;
  end if;
  return jsonb_build_object('ok', true, 'module', inv.module, 'access_days', inv.access_days, 'test_days', inv.test_days);
end $function$;

-- Lagrer sjekklisten. Når alle punktene er krysset av, regnes modulen som gjennomgått.
create or replace function public.testpanel_check(p_module text, p_checklist jsonb, p_total int)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return jsonb_build_object('ok', false, 'why', 'login'); end if;
  if jsonb_typeof(p_checklist) <> 'object' or pg_column_size(p_checklist) > 4000 then raise exception 'ugyldig sjekkliste'; end if;
  select count(*) into n from jsonb_each(p_checklist) where value = 'true'::jsonb;
  update public.testpanel_runs
     set checklist = p_checklist,
         walked_through_at = case when p_total > 0 and n >= p_total then coalesce(walked_through_at, now()) else null end
   where user_id = me and module = p_module;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_joined'); end if;
  return jsonb_build_object('ok', true, 'done', p_total > 0 and n >= p_total);
end $function$;

-- Sender svarene. Krever at modulen er gjennomgått og at hvert svar har mer enn 15 ord.
create or replace function public.testpanel_send(p_module text, p_answers jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare me uuid := auth.uid(); r public.testpanel_runs; a jsonb; w int; short int := 0;
begin
  if me is null then return jsonb_build_object('ok', false, 'why', 'login'); end if;
  select * into r from public.testpanel_runs where user_id = me and module = p_module;
  if not found then return jsonb_build_object('ok', false, 'why', 'not_joined'); end if;
  if r.walked_through_at is null then return jsonb_build_object('ok', false, 'why', 'not_walked'); end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 or jsonb_array_length(p_answers) > 20 then raise exception 'ugyldige svar'; end if;
  for a in select * from jsonb_array_elements(p_answers) loop
    w := coalesce(array_length(regexp_split_to_array(trim(a->>'a'), '\s+'), 1), 0);
    if trim(coalesce(a->>'a', '')) = '' or w <= 15 then short := short + 1; end if;
  end loop;
  if short > 0 then return jsonb_build_object('ok', false, 'why', 'short', 'count', short); end if;
  insert into public.testpanel_answers (user_id, module, question, answer, words)
    select me, p_module, left(x->>'q', 300), left(trim(x->>'a'), 5000),
           array_length(regexp_split_to_array(trim(x->>'a'), '\s+'), 1)
      from jsonb_array_elements(p_answers) x;
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.join_testpanel(text) from public, anon;
revoke all on function public.testpanel_check(text, jsonb, int) from public, anon;
revoke all on function public.testpanel_send(text, jsonb) from public, anon;
grant execute on function public.join_testpanel(text) to authenticated;
grant execute on function public.testpanel_check(text, jsonb, int) to authenticated;
grant execute on function public.testpanel_send(text, jsonb) to authenticated;
revoke all on function public.mark_member_paid(text, text) from public, anon, authenticated;
revoke all on function public.mark_member_ended(text) from public, anon, authenticated;

-- En tester som er ferdig, kan også svare «Jeg vil fortsette».
create or replace function public.answer_trial(choice text)
 returns text language plpgsql security definer set search_path to ''
as $function$
begin
  if choice not in ('wants_to_continue','ended') then raise exception 'ugyldig valg'; end if;
  update public.members set status = choice, status_answered_at = now(), updated_at = now()
    where id = auth.uid() and status in ('trial','wants_to_continue','ended','testpanel');
  return choice;
end; $function$;
