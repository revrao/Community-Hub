-- Manual one-time bootstrap ONLY, run by the project owner in Supabase SQL Editor.
-- First create and email-confirm your account through the CommunityHub signup page.
-- Replace the placeholder with that account's email. No default admin is created.
-- This grants the chosen account administrative access; it is not an application RPC.
do $$
declare chosen_user uuid;
begin
 select id into chosen_user from auth.users
 where lower(email)=lower('REPLACE_WITH_YOUR_CONFIRMED_EMAIL') and email_confirmed_at is not null;
 if chosen_user is null then raise exception 'A confirmed account with that email was not found. No role was changed.'; end if;
 insert into public.user_roles(user_id,role,assigned_by)
 values(chosen_user,'admin',chosen_user)
 on conflict(user_id) do update set role='admin',assigned_by=chosen_user,assigned_at=now();
end;
$$;
