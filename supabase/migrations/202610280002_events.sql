begin;
create table public.events (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references public.profiles(id),
 title text not null check(length(btrim(title)) between 1 and 120),
 description text not null check(length(btrim(description)) between 1 and 10000),
 category text not null check(category in ('volunteering','community_event')),
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 timezone text not null default 'America/Los_Angeles' check(length(timezone)<=80),
 location_name text not null check(length(btrim(location_name)) between 1 and 160),
 address text not null check(length(btrim(address)) between 1 and 300),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 capacity integer not null check(capacity between 1 and 10000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index events_discovery on public.events(status,starts_at);
create index events_organizer on public.events(organizer_id);
alter table public.events enable row level security;
revoke all on public.events from anon,authenticated;
grant select on public.events to anon,authenticated;
create policy events_visible on public.events for select to anon,authenticated using(
 status='approved' or organizer_id=(select auth.uid()) or (select communityhub_private.is_admin())
);
create function public.event_organizer_name(p_event_id uuid) returns text
 language sql stable security definer set search_path='' as $$
 select p.display_name from public.events e join public.profiles p on p.id=e.organizer_id
 where e.id=p_event_id and (e.status='approved' or e.organizer_id=auth.uid() or communityhub_private.is_admin());
$$;
revoke all on function public.event_organizer_name(uuid) from public;
grant execute on function public.event_organizer_name(uuid) to anon,authenticated;
create view public.event_list with (security_invoker=true) as select e.*,public.event_organizer_name(e.id) as organizer_name from public.events e;
grant select on public.event_list to anon,authenticated;
-- Events are changed only by capacity/approval-aware RPC functions in the next migration.
commit;
