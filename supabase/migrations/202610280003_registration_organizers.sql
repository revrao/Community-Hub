begin;
create table public.registrations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),
 user_id uuid not null references public.profiles(id), status text not null default 'registered' check(status in ('registered','cancelled')),
 created_at timestamptz not null default now(),unique(event_id,user_id)
);
create index registrations_member on public.registrations(user_id,status);
create index registrations_capacity on public.registrations(event_id,status);
create table public.saved_events (
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 primary key(user_id,event_id)
);
alter table public.registrations enable row level security;
alter table public.saved_events enable row level security;
revoke all on public.registrations,public.saved_events from anon,authenticated;
grant select on public.registrations to authenticated;
grant select,insert,delete on public.saved_events to authenticated;
create policy registrations_self on public.registrations for select to authenticated using(user_id=(select auth.uid()));
create policy saved_self_read on public.saved_events for select to authenticated using(user_id=(select auth.uid()));
create policy saved_self_add on public.saved_events for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.events where id=event_id and status='approved'));
create policy saved_self_remove on public.saved_events for delete to authenticated using(user_id=(select auth.uid()));
create policy registered_event_history on public.events for select to authenticated using(exists(select 1 from public.registrations where event_id=events.id and user_id=(select auth.uid())));

create function public.register_for_event(p_event_id uuid) returns void
 language plpgsql security definer set search_path='' as $$
declare e public.events;begin
 if auth.uid() is null then raise exception 'Please sign in to register.';end if;
 select * into e from public.events where id=p_event_id for update;
 if not found or e.status<>'approved' then raise exception 'This event is not accepting registrations.';end if;
 if e.starts_at<=now() then raise exception 'Registration has closed for this event.';end if;
 if exists(select 1 from public.registrations where event_id=e.id and user_id=auth.uid() and status='registered') then return;end if;
 if (select count(*) from public.registrations where event_id=e.id and status='registered')>=e.capacity then raise exception 'This event is full.';end if;
 insert into public.registrations(event_id,user_id) values(e.id,auth.uid())
 on conflict(event_id,user_id) do update set status='registered',created_at=now();
end;$$;
create function public.cancel_registration(p_event_id uuid) returns void
 language plpgsql security definer set search_path='' as $$
declare e public.events;begin
 if auth.uid() is null then raise exception 'Please sign in.';end if;
 select * into e from public.events where id=p_event_id for update;
 if not found then raise exception 'Event unavailable.';end if;
 if e.starts_at<=now() then raise exception 'Cancellation closes when the event starts. Contact the organizer.';end if;
 update public.registrations set status='cancelled' where event_id=e.id and user_id=auth.uid();
end;$$;
create function public.event_availability(p_event_id uuid) returns integer
 language plpgsql stable security definer set search_path='' as $$
declare e public.events;begin
 select * into e from public.events where id=p_event_id;
 if not found or not (e.status='approved' or e.organizer_id=auth.uid() or communityhub_private.is_admin()) then raise exception 'Event unavailable.';end if;
 return greatest(0,e.capacity-(select count(*)::integer from public.registrations where event_id=e.id and status='registered'));
end;$$;
create function public.save_event(p_event_id uuid,p_title text,p_description text,p_category text,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_location_name text,p_address text,p_latitude double precision,p_longitude double precision,p_capacity integer) returns uuid
 language plpgsql security definer set search_path='' as $$
declare e public.events; result uuid;begin
 if not communityhub_private.is_organizer() then raise exception 'Approved organizer access is required.';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Choose a valid IANA timezone.';end if;
 if p_starts_at<=now() then raise exception 'Choose a future start date.';end if;
 if p_event_id is null then
 insert into public.events(organizer_id,title,description,category,starts_at,ends_at,timezone,location_name,address,latitude,longitude,capacity)
 values(auth.uid(),btrim(p_title),btrim(p_description),p_category,p_starts_at,p_ends_at,p_timezone,btrim(p_location_name),btrim(p_address),p_latitude,p_longitude,p_capacity) returning id into result;
 else
 select * into e from public.events where id=p_event_id for update;
 if not found or e.organizer_id<>auth.uid() then raise exception 'You can only edit your own events.';end if;
 if e.status='cancelled' or e.starts_at<=now() then raise exception 'This event can no longer be edited.';end if;
 if p_capacity<(select count(*) from public.registrations where event_id=e.id and status='registered') then raise exception 'Capacity cannot be lower than current registrations.';end if;
 update public.events set title=btrim(p_title),description=btrim(p_description),category=p_category,starts_at=p_starts_at,ends_at=p_ends_at,timezone=p_timezone,location_name=btrim(p_location_name),address=btrim(p_address),latitude=p_latitude,longitude=p_longitude,capacity=p_capacity,status='pending',updated_at=now() where id=e.id returning id into result;
 end if;return result;
end;$$;
create function public.cancel_event(p_event_id uuid) returns void
 language plpgsql security definer set search_path='' as $$
declare e public.events;begin
 select * into e from public.events where id=p_event_id for update;
 if not found or not(communityhub_private.is_admin() or (e.organizer_id=auth.uid() and communityhub_private.is_organizer())) then raise exception 'Not authorized to cancel this event.';end if;
 if e.ends_at<=now() then raise exception 'Completed events cannot be cancelled.';end if;
 update public.events set status='cancelled',updated_at=now() where id=e.id;
end;$$;
create function public.event_registrants(p_event_id uuid) returns table(registration_id uuid,user_id uuid,display_name text,status text)
 language plpgsql stable security definer set search_path='' as $$
begin
 if not(communityhub_private.is_admin() or (communityhub_private.is_organizer() and exists(select 1 from public.events where id=p_event_id and organizer_id=auth.uid()))) then raise exception 'You cannot view these registrations.';end if;
 return query select r.id,r.user_id,p.display_name,r.status from public.registrations r join public.profiles p on p.id=r.user_id where r.event_id=p_event_id order by r.created_at;
end;$$;
revoke all on function public.register_for_event(uuid),public.cancel_registration(uuid),public.event_availability(uuid),public.save_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,double precision,double precision,integer),public.cancel_event(uuid),public.event_registrants(uuid) from public,anon,authenticated;
grant execute on function public.register_for_event(uuid),public.cancel_registration(uuid),public.save_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,double precision,double precision,integer),public.cancel_event(uuid),public.event_registrants(uuid) to authenticated;
grant execute on function public.event_availability(uuid) to anon,authenticated;
commit;
