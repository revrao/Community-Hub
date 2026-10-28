begin;
-- Additive initial migration. It intentionally fails on name collisions.
create schema communityhub_private;
revoke all on schema communityhub_private from public;
grant usage on schema communityhub_private to anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Community Member' check (length(btrim(display_name)) between 1 and 80),
 bio text not null default '' check(length(bio)<=500),
 location_area text not null default '' check(length(location_area)<=120),
 interests text[] not null default '{}' check(cardinality(interests)<=12 and length(interests::text)<=1000),
 leaderboard_visible boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 role text not null check(role in ('organizer','admin')),
 assigned_by uuid references public.profiles(id),
 assigned_at timestamptz not null default now()
);
create function communityhub_private.is_admin() returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin');
$$;
create function communityhub_private.is_organizer() returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('organizer','admin'));
$$;
create function communityhub_private.handle_new_user() returns trigger
 language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,
  left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Community Member'),80));
 return new;
end;
$$;
create trigger communityhub_profile_created after insert on auth.users
 for each row execute function communityhub_private.handle_new_user();
insert into public.profiles(id,display_name)
 select id,left(coalesce(nullif(btrim(raw_user_meta_data->>'display_name'),''),'Community Member'),80) from auth.users
 on conflict(id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
revoke all on public.profiles,public.user_roles from anon,authenticated;
grant select on public.profiles,public.user_roles to authenticated;
grant update(display_name,bio,location_area,interests,leaderboard_visible) on public.profiles to authenticated;
create policy profiles_read_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_edit_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy roles_read_self on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
revoke all on function communityhub_private.handle_new_user() from public,anon,authenticated;
revoke all on function communityhub_private.is_admin(),communityhub_private.is_organizer() from public;
grant execute on function communityhub_private.is_admin(),communityhub_private.is_organizer() to anon,authenticated;
commit;
