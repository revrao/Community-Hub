begin;
create table public.attendance (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),
 user_id uuid not null references public.profiles(id), registration_id uuid not null unique references public.registrations(id),
 verified_by uuid not null references public.profiles(id),verified_at timestamptz not null default now(),
 volunteer_minutes integer not null check(volunteer_minutes>=0),unique(event_id,user_id),check(verified_by<>user_id)
);
create table public.point_transactions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 attendance_id uuid not null unique references public.attendance(id),points integer not null check(points>0),created_at timestamptz not null default now()
);
create index points_member on public.point_transactions(user_id,created_at);
create index attendance_member on public.attendance(user_id);
create table public.organizer_requests (
 user_id uuid primary key references public.profiles(id),status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),reviewed_by uuid references public.profiles(id),reviewed_at timestamptz
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id),
 event_id uuid not null references public.events(id),reason text not null check(length(btrim(reason)) between 5 and 2000),
 status text not null default 'open' check(status in ('open','dismissed','removed')),created_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id),reviewed_at timestamptz
);
create table public.moderation_actions (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),
 target_id uuid not null,action text not null,reason text not null,created_at timestamptz not null default now()
);
alter table public.attendance enable row level security;
alter table public.point_transactions enable row level security;
alter table public.organizer_requests enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
revoke all on public.attendance,public.point_transactions,public.organizer_requests,public.reports,public.moderation_actions from anon,authenticated;
grant select on public.attendance,public.point_transactions,public.organizer_requests,public.reports,public.moderation_actions to authenticated;
create policy attendance_view on public.attendance for select to authenticated using(user_id=(select auth.uid()) or (select communityhub_private.is_admin()) or ((select communityhub_private.is_organizer()) and exists(select 1 from public.events where id=event_id and organizer_id=(select auth.uid()))));
create policy points_view_self on public.point_transactions for select to authenticated using(user_id=(select auth.uid()));
create policy requests_view on public.organizer_requests for select to authenticated using(user_id=(select auth.uid()) or (select communityhub_private.is_admin()));
create policy reports_view on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or (select communityhub_private.is_admin()));
create policy moderation_view on public.moderation_actions for select to authenticated using((select communityhub_private.is_admin()));

create function public.verify_attendance(p_event_id uuid,p_user_id uuid,p_volunteer_minutes integer) returns void
 language plpgsql security definer set search_path='' as $$
declare e public.events;r public.registrations;a uuid;minutes integer;begin
 select * into e from public.events where id=p_event_id for update;
 if not found or not(communityhub_private.is_admin() or (e.organizer_id=auth.uid() and communityhub_private.is_organizer())) then raise exception 'Not authorized to verify attendance.';end if;
 if auth.uid()=p_user_id then raise exception 'You cannot verify your own attendance.';end if;
 if e.status<>'approved' or e.ends_at>now() then raise exception 'Attendance can only be verified after an approved event ends.';end if;
 select * into r from public.registrations where event_id=e.id and user_id=p_user_id and status='registered';
 if not found then raise exception 'Only registered participants can be verified.';end if;
 if exists(select 1 from public.attendance where event_id=e.id and user_id=p_user_id) then return;end if;
 minutes=case when e.category='volunteering' then p_volunteer_minutes else 0 end;
 if minutes is null or minutes<0 or minutes>floor(extract(epoch from(e.ends_at-e.starts_at))/60) then raise exception 'Volunteer minutes must fit within the event duration.';end if;
 insert into public.attendance(event_id,user_id,registration_id,verified_by,volunteer_minutes) values(e.id,p_user_id,r.id,auth.uid(),minutes) returning id into a;
 insert into public.point_transactions(user_id,attendance_id,points) values(p_user_id,a,case when e.category='volunteering' then 50 else 10 end);
end;$$;
create function public.my_stats() returns table(points bigint,events bigint,hours numeric)
 language sql stable security definer set search_path='' as $$
 select coalesce((select sum(t.points) from public.point_transactions t where t.user_id=auth.uid()),0),count(*),round(coalesce(sum(a.volunteer_minutes),0)/60.0,1) from public.attendance a where a.user_id=auth.uid();
$$;
create function public.community_leaderboard(p_period text default 'month') returns table(user_id uuid,display_name text,points bigint,events bigint,hours numeric)
 language plpgsql stable security definer set search_path='' as $$
begin
 if p_period not in ('month','all') then raise exception 'Invalid ranking period.';end if;
 return query select p.id,p.display_name,sum(t.points),count(*),round(sum(a.volunteer_minutes)/60.0,1)
 from public.profiles p join public.point_transactions t on t.user_id=p.id join public.attendance a on a.id=t.attendance_id
 where p.leaderboard_visible and (p_period='all' or t.created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')
 group by p.id,p.display_name order by sum(t.points) desc,min(t.created_at),p.id limit 100;
end;$$;
create function public.request_organizer() returns void
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in.';end if;
 if communityhub_private.is_organizer() then raise exception 'You already have organizer access.';end if;
 insert into public.organizer_requests(user_id) values(auth.uid()) on conflict(user_id) do update set status='pending',created_at=now(),reviewed_by=null,reviewed_at=null where organizer_requests.status='rejected';
end;$$;
create function public.admin_organizer_requests() returns table(user_id uuid,display_name text,status text,created_at timestamptz)
 language plpgsql stable security definer set search_path='' as $$
begin
 if not communityhub_private.is_admin() then raise exception 'Administrator access required.';end if;
 return query select r.user_id,p.display_name,r.status,r.created_at from public.organizer_requests r join public.profiles p on p.id=r.user_id order by r.created_at;
end;$$;
create function public.review_organizer(p_user_id uuid,p_approve boolean) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not communityhub_private.is_admin() then raise exception 'Administrator access required.';end if;
 perform 1 from public.organizer_requests where user_id=p_user_id and status='pending' for update;
 if not found then raise exception 'No pending request found.';end if;
 update public.organizer_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now() where user_id=p_user_id;
 if p_approve then insert into public.user_roles(user_id,role,assigned_by) values(p_user_id,'organizer',auth.uid()) on conflict(user_id) do nothing;end if;
 insert into public.moderation_actions(actor_id,target_id,action,reason) values(auth.uid(),p_user_id,'organizer_review',case when p_approve then 'Approved' else 'Rejected' end);
end;$$;
create function public.review_event(p_event_id uuid,p_approve boolean,p_reason text default '') returns void
 language plpgsql security definer set search_path='' as $$
declare e public.events;begin
 if not communityhub_private.is_admin() then raise exception 'Administrator access required.';end if;
 select * into e from public.events where id=p_event_id for update;
 if not found or e.status<>'pending' then raise exception 'No pending event found.';end if;
 if p_approve and (e.starts_at<=now() or not exists(select 1 from public.user_roles where user_id=e.organizer_id and role in ('organizer','admin'))) then raise exception 'Event needs a future date and an authorized organizer.';end if;
 update public.events set status=case when p_approve then 'approved' else 'rejected' end,updated_at=now() where id=e.id;
 insert into public.moderation_actions(actor_id,target_id,action,reason) values(auth.uid(),e.id,case when p_approve then 'event_approved' else 'event_rejected' end,left(p_reason,2000));
end;$$;
create function public.report_event(p_event_id uuid,p_reason text) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in to report an event.';end if;
 if not exists(select 1 from public.events where id=p_event_id and status='approved') then raise exception 'Event unavailable.';end if;
 if exists(select 1 from public.reports where reporter_id=auth.uid() and event_id=p_event_id and status='open') then raise exception 'You already have an open report for this event.';end if;
 insert into public.reports(reporter_id,event_id,reason) values(auth.uid(),p_event_id,btrim(p_reason));
end;$$;
create function public.resolve_report(p_report_id uuid,p_remove boolean,p_reason text) returns void
 language plpgsql security definer set search_path='' as $$
declare r public.reports;begin
 if not communityhub_private.is_admin() then raise exception 'Administrator access required.';end if;
 select * into r from public.reports where id=p_report_id and status='open' for update;
 if not found then raise exception 'Open report not found.';end if;
 if length(btrim(p_reason))<3 then raise exception 'Record a moderation reason.';end if;
 if p_remove then update public.events set status='cancelled',updated_at=now() where id=r.event_id;end if;
 update public.reports set status=case when p_remove then 'removed' else 'dismissed' end,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 insert into public.moderation_actions(actor_id,target_id,action,reason) values(auth.uid(),r.id,case when p_remove then 'report_removed' else 'report_dismissed' end,left(p_reason,2000));
end;$$;
revoke all on function public.verify_attendance(uuid,uuid,integer),public.my_stats(),public.community_leaderboard(text),public.request_organizer(),public.admin_organizer_requests(),public.review_organizer(uuid,boolean),public.review_event(uuid,boolean,text),public.report_event(uuid,text),public.resolve_report(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.verify_attendance(uuid,uuid,integer),public.my_stats(),public.request_organizer(),public.admin_organizer_requests(),public.review_organizer(uuid,boolean),public.review_event(uuid,boolean,text),public.report_event(uuid,text),public.resolve_report(uuid,boolean,text) to authenticated;
grant execute on function public.community_leaderboard(text) to anon,authenticated;
commit;
