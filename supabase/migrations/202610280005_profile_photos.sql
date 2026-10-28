begin;
-- Additive: profile data, names, roles, registrations, and points are preserved.
alter table public.profiles add column avatar_path text;
alter table public.profiles add column google_avatar_url text;
alter table public.profiles add constraint profile_avatar_owned_path check (
 avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$')
);
alter table public.profiles add constraint profile_google_photo_safe check (
 google_avatar_url is null or (length(google_avatar_url)<=2048 and google_avatar_url ~ '^https://([a-z0-9-]+\.)*googleusercontent\.com/[^[:space:]]*$')
);

-- This dedicated PRIVATE bucket stores server-normalized WebP, not original photos.
-- Fails safely on an existing bucket collision rather than changing another bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('avatars','avatars',false,5242880,ARRAY['image/webp']);

create function communityhub_private.avatar_is_public(p_path text) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.avatar_path=p_path and p.leaderboard_visible
  and exists(select 1 from public.attendance a where a.user_id=p.id));
$$;
revoke all on function communityhub_private.avatar_is_public(text) from public;
grant execute on function communityhub_private.avatar_is_public(text) to anon,authenticated;
create policy communityhub_avatar_read on storage.objects for select to anon,authenticated using(
 bucket_id='avatars' and ((select auth.uid())::text=split_part(name,'/',1) or communityhub_private.avatar_is_public(name))
);
create policy communityhub_avatar_insert on storage.objects for insert to authenticated with check(
 bucket_id='avatars' and owner_id=(select auth.uid())::text
 and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$')
);
create policy communityhub_avatar_update on storage.objects for update to authenticated using(
 bucket_id='avatars' and owner_id=(select auth.uid())::text and split_part(name,'/',1)=(select auth.uid())::text
) with check(
 bucket_id='avatars' and owner_id=(select auth.uid())::text
 and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$')
);
create policy communityhub_avatar_delete on storage.objects for delete to authenticated using(
 bucket_id='avatars' and owner_id=(select auth.uid())::text and split_part(name,'/',1)=(select auth.uid())::text
);

create function public.set_profile_avatar(p_path text) returns text
 language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if auth.uid() is null then raise exception 'Please sign in.';end if;
 if p_path is not null then
  if p_path !~ ('^'||auth.uid()::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$') then raise exception 'Invalid picture path.';end if;
  if not exists(select 1 from storage.objects where bucket_id='avatars' and name=p_path
    and owner_id=auth.uid()::text and metadata->>'mimetype'='image/webp'
    and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Your uploaded picture could not be found or is invalid.';end if;
 end if;
 select avatar_path into previous from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found.';end if;
 update public.profiles set avatar_path=p_path where id=auth.uid();return previous;
end;$$;
revoke all on function public.set_profile_avatar(text) from public,anon,authenticated;
grant execute on function public.set_profile_avatar(text) to authenticated;

create function communityhub_private.safe_google_photo(p_url text) returns text
 language sql immutable set search_path='' as $$
 select case when length(p_url)<=2048 and p_url ~ '^https://([a-z0-9-]+\.)*googleusercontent\.com/[^[:space:]]*$' then p_url else null end;
$$;
revoke all on function communityhub_private.safe_google_photo(text) from public,anon,authenticated;
create function communityhub_private.refresh_google_photo(p_user_id uuid) returns void
 language sql security definer set search_path='' as $$
 update public.profiles set google_avatar_url=(
 select coalesce(communityhub_private.safe_google_photo(identity_data->>'avatar_url'),communityhub_private.safe_google_photo(identity_data->>'picture'))
 from auth.identities where user_id=p_user_id and provider='google' limit 1
 ) where id=p_user_id;
$$;
revoke all on function communityhub_private.refresh_google_photo(uuid) from public,anon,authenticated;
create or replace function communityhub_private.handle_new_user() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,
 left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),nullif(btrim(new.raw_user_meta_data->>'full_name'),''),nullif(btrim(new.raw_user_meta_data->>'name'),''),'Community Member'),80)) on conflict(id) do nothing;
 return new;
end;$$;
revoke all on function communityhub_private.handle_new_user() from public,anon,authenticated;
create function communityhub_private.google_identity_changed() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then
  if old.provider='google' then perform communityhub_private.refresh_google_photo(old.user_id);end if;return old;
 end if;
 if new.provider='google' then perform communityhub_private.refresh_google_photo(new.user_id);end if;return new;
end;$$;
revoke all on function communityhub_private.google_identity_changed() from public,anon,authenticated;
create trigger communityhub_google_identity_changed after insert or update or delete on auth.identities for each row execute function communityhub_private.google_identity_changed();
create function public.sync_google_profile() returns void
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in.';end if;
 insert into public.profiles(id,display_name)
 select id,left(coalesce(nullif(btrim(raw_user_meta_data->>'display_name'),''),nullif(btrim(raw_user_meta_data->>'full_name'),''),nullif(btrim(raw_user_meta_data->>'name'),''),'Community Member'),80) from auth.users where id=auth.uid() on conflict(id) do nothing;
 perform communityhub_private.refresh_google_photo(auth.uid());
end;$$;
revoke all on function public.sync_google_profile() from public,anon,authenticated;
grant execute on function public.sync_google_profile() to authenticated;
-- Backfill only the new photo column; existing edited names are left untouched.
select communityhub_private.refresh_google_photo(p.id) from public.profiles p where exists(select 1 from auth.identities i where i.user_id=p.id and i.provider='google');

-- Photos for opted-in, verified leaderboard participants only. No private profiles.
create function public.leaderboard_photos(p_user_ids uuid[]) returns table(user_id uuid,avatar_path text,google_avatar_url text)
 language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(cardinality(p_user_ids),0)>100 then raise exception 'Too many profiles requested.';end if;
 return query select p.id,p.avatar_path,p.google_avatar_url from public.profiles p where p.id=any(p_user_ids) and p.leaderboard_visible and exists(select 1 from public.attendance a where a.user_id=p.id);
end;$$;
revoke all on function public.leaderboard_photos(uuid[]) from public,anon,authenticated;
grant execute on function public.leaderboard_photos(uuid[]) to anon,authenticated;
commit;
