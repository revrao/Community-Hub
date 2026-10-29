begin;
-- One role per user remains the source of truth. Remember organizer status on promotion.
alter table public.user_roles add column admin_previous_role text check(admin_previous_role='organizer');
create function public.admin_members(p_search text default '', p_admins_only boolean default false)
returns table(user_id uuid,display_name text,role text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not communityhub_private.is_admin() then raise exception 'Administrator access required.'; end if;
 return query select p.id,p.display_name,r.role from public.profiles p
 left join public.user_roles r on r.user_id=p.id
 where (not p_admins_only or r.role='admin') and
 (p_admins_only or (length(btrim(p_search))>=2 and
 (strpos(lower(p.display_name),lower(btrim(p_search)))>0 or p.id::text=btrim(p_search))))
 order by p.display_name,p.id limit 100;
end; $$;
create function public.set_administrator(p_user_id uuid,p_grant boolean) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text; previous_role text;
begin
 -- Serialize grants/removals, then recheck authority after acquiring the lock.
 lock table public.user_roles in share row exclusive mode;
 if not communityhub_private.is_admin() then raise exception 'Administrator access required.'; end if;
 if p_grant is null or p_user_id is null then raise exception 'Choose a member and action.'; end if;
 perform 1 from public.profiles where id=p_user_id;
 if not found then raise exception 'Member not found.'; end if;
 select role,admin_previous_role into old_role,previous_role from public.user_roles where user_id=p_user_id;
 if p_grant then
  if old_role='admin' then return; end if;
  insert into public.user_roles(user_id,role,assigned_by,admin_previous_role)
  values(p_user_id,'admin',auth.uid(),old_role)
  on conflict(user_id) do update set role='admin',assigned_by=auth.uid(),assigned_at=now(),admin_previous_role=excluded.admin_previous_role;
 else
  if old_role is distinct from 'admin' then return; end if;
  if (select count(*) from public.user_roles where role='admin')<=1 then raise exception 'The last administrator cannot be removed.'; end if;
  if previous_role='organizer' then
   update public.user_roles set role='organizer',assigned_by=auth.uid(),assigned_at=now(),admin_previous_role=null where user_id=p_user_id;
  else delete from public.user_roles where user_id=p_user_id; end if;
 end if;
 insert into public.moderation_actions(actor_id,target_id,action,reason)
 values(auth.uid(),p_user_id,case when p_grant then 'admin_granted' else 'admin_removed' end,'Administrator role changed through Manage Admins');
end; $$;
-- Public badges expose only IDs already visible on the opted-in leaderboard.
create function public.leaderboard_administrators(p_user_ids uuid[]) returns table(user_id uuid)
language sql stable security definer set search_path='' as $$
 select r.user_id from public.user_roles r join public.profiles p on p.id=r.user_id
 where r.role='admin' and p.leaderboard_visible and r.user_id=any(p_user_ids[1:100])
 and exists(select 1 from public.point_transactions t where t.user_id=r.user_id);
$$;
revoke all on function public.admin_members(text,boolean),public.set_administrator(uuid,boolean),public.leaderboard_administrators(uuid[]) from public,anon,authenticated;
grant execute on function public.admin_members(text,boolean),public.set_administrator(uuid,boolean) to authenticated;
grant execute on function public.leaderboard_administrators(uuid[]) to anon,authenticated;
commit;
