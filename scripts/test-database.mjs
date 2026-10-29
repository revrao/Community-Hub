import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
// Minimal Supabase Auth/Storage schemas for exercising the real policies locally.
await db.exec(`create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,provider text not null,identity_data jsonb not null default '{}');
create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,owner_id text,metadata jsonb,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon,authenticated;
grant insert,update,delete on storage.objects to authenticated;`);
const migrations = (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const file of migrations) {
  await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  console.log("Migration passed:", file);
}
const member = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  organizer = "00000000-0000-4000-8000-000000000003",
  admin = "00000000-0000-4000-8000-000000000004";
await db.exec(
  `insert into auth.users(id) values('${member}'),('${other}'),('${organizer}'),('${admin}');`,
);
async function asUser(id, sql) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  return db.query(sql);
}
async function denied(id, sql) {
  await assert.rejects(() => asUser(id, sql));
}
assert.equal(
  (await asUser(member, "select * from public.profiles")).rows.length,
  1,
);
await asUser(
  member,
  "update public.profiles set display_name='Saved Member',interests=ARRAY['Environment'] where id=auth.uid()",
);
assert.equal(
  (await asUser(member, "select display_name from public.profiles")).rows[0]
    .display_name,
  "Saved Member",
);
assert.equal(
  (
    await asUser(
      member,
      `update public.profiles set display_name='Hacked' where id='${other}' returning id`,
    )
  ).rows.length,
  0,
);
await denied(
  member,
  `insert into public.user_roles(user_id,role) values('${member}','admin')`,
);
await denied(
  member,
  "update public.profiles set id='00000000-0000-4000-8000-000000000099' where id=auth.uid()",
);
await db.exec(
  "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
);
await assert.rejects(() => db.query("select * from public.profiles"));
console.log(
  "Phase 1: profile creation, persistence, owner-only edits, private reads, and role escalation checks passed.",
);

await db.exec(
  `reset role;insert into public.user_roles(user_id,role) values('${organizer}','organizer'),('${admin}','admin');`,
);
const eventId = "10000000-0000-4000-8000-000000000001";
await db.exec(`insert into public.events(id,organizer_id,title,description,category,starts_at,ends_at,timezone,location_name,address,latitude,longitude,capacity)
 values('${eventId}','${organizer}','Test event','Community cleanup','volunteering',now()+interval '2 days',now()+interval '2 days 3 hours','UTC','Public Park','Park Street',37,-122,1);`);
await db.exec(
  "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
);
assert.equal(
  (await db.query("select * from public.event_list")).rows.length,
  0,
);
await denied(
  member,
  `select public.review_event('${eventId}',true,'approved')`,
);
await asUser(admin, `select public.review_event('${eventId}',true,'approved')`);
await db.exec(
  "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
);
assert.equal(
  (await db.query("select * from public.event_list")).rows.length,
  1,
);
await assert.rejects(() =>
  db.query(`select public.register_for_event('${eventId}')`),
);
await asUser(member, `select public.register_for_event('${eventId}')`);
await asUser(member, `select public.register_for_event('${eventId}')`);
assert.equal(
  (await asUser(member, `select count(*)::int as n from public.registrations`))
    .rows[0].n,
  1,
);
await denied(other, `select public.register_for_event('${eventId}')`);
await denied(
  member,
  `insert into public.registrations(event_id,user_id) values('${eventId}','${other}')`,
);
await denied(
  member,
  `update public.events set status='approved' where id='${eventId}'`,
);
await denied(member, `select public.event_registrants('${eventId}')`);
assert.equal(
  (
    await asUser(
      organizer,
      `select * from public.event_registrants('${eventId}')`,
    )
  ).rows.length,
  1,
);
await asUser(member, `select public.cancel_registration('${eventId}')`);
await asUser(other, `select public.register_for_event('${eventId}')`);
assert.equal(
  (await asUser(other, `select public.event_availability('${eventId}') as n`))
    .rows[0].n,
  0,
);
await asUser(other, `select public.cancel_registration('${eventId}')`);
await asUser(member, `select public.register_for_event('${eventId}')`);
assert.equal(
  (await asUser(member, `select points from public.my_stats()`)).rows[0].points,
  0,
);
await denied(
  organizer,
  `select public.verify_attendance('${eventId}','${member}',60)`,
);
await denied(
  member,
  `insert into public.point_transactions(user_id,attendance_id,points) values('${member}',gen_random_uuid(),9000)`,
);
await db.exec(
  `reset role;update public.events set starts_at=now()-interval '4 hours',ends_at=now()-interval '1 hour' where id='${eventId}';`,
);
await denied(
  member,
  `select public.verify_attendance('${eventId}','${member}',60)`,
);
await denied(
  organizer,
  `select public.verify_attendance('${eventId}','${organizer}',60)`,
);
await denied(
  organizer,
  `select public.verify_attendance('${eventId}','${other}',60)`,
);
await denied(
  organizer,
  `select public.verify_attendance('${eventId}','${member}',999)`,
);
await asUser(
  organizer,
  `select public.verify_attendance('${eventId}','${member}',120)`,
);
await asUser(
  organizer,
  `select public.verify_attendance('${eventId}','${member}',120)`,
);
const stats = (await asUser(member, "select * from public.my_stats()")).rows[0];
assert.equal(stats.points, 50);
assert.equal(stats.events, 1);
assert.equal(Number(stats.hours), 2);
await denied(member, "update public.attendance set volunteer_minutes=999");
await denied(member, "update public.point_transactions set points=999");
await db.exec(
  "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
);
let board = await db.query("select * from public.community_leaderboard('all')");
assert.equal(board.rows.length, 1);
assert.equal(board.rows[0].points, 50);
await asUser(
  member,
  "update public.profiles set leaderboard_visible=false where id=auth.uid()",
);
await db.exec(
  "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
);
assert.equal(
  (await db.query("select * from public.community_leaderboard('all')")).rows
    .length,
  0,
);
await denied(member, "select * from public.admin_organizer_requests()");
await asUser(other, "select public.request_organizer()");
await denied(member, `select public.review_organizer('${other}',true)`);
await asUser(admin, `select public.review_organizer('${other}',true)`);
assert.equal(
  (await asUser(other, "select role from public.user_roles")).rows[0].role,
  "organizer",
);
await asUser(
  member,
  `select public.report_event('${eventId}','Misleading event description')`,
);
await denied(
  member,
  `select public.report_event('${eventId}','Repeated report')`,
);
const report = (await asUser(member, "select id from public.reports")).rows[0];
await denied(
  member,
  `select public.resolve_report('${report.id}',true,'Not appropriate')`,
);
await asUser(
  admin,
  `select public.resolve_report('${report.id}',true,'Removed after review')`,
);
await db.exec(
  "reset role;set role anon;select set_config('request.jwt.claim.sub','',false);",
);
assert.equal(
  (await db.query("select * from public.event_list")).rows.length,
  0,
);
const created = await asUser(
  other,
  `select public.save_event(null,'New event','Real description','community_event',now()+interval '3 days',now()+interval '3 days 2 hours','UTC','Plaza','Public Plaza',38,-122,25) as id`,
);
assert.ok(created.rows[0].id);
await denied(
  member,
  `select public.save_event(null,'New event','Real description','community_event',now()+interval '3 days',now()+interval '3 days 2 hours','UTC','Plaza','Public Plaza',38,-122,25)`,
);
await denied(
  organizer,
  `select public.save_event('${created.rows[0].id}','Other event','Real description','community_event',now()+interval '3 days',now()+interval '3 days 2 hours','UTC','Plaza','Public Plaza',38,-122,25)`,
);
console.log(
  "Phases 2–4: approved visibility, capacity, duplicate RSVP, cancellation, organizer ownership, attendee privacy, no RSVP points, post-event verification, exactly-once awards, leaderboard opt-out, role approval, and moderation tests passed.",
);

await db.exec("reset role;");
const protectedTables = (
  await db.query(
    "select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'",
  )
).rows;
assert.ok(protectedTables.length >= 10);
assert.ok(protectedTables.every((t) => t.relrowsecurity));
await denied(
  member,
  "update public.profiles set created_at=now() where id=auth.uid()",
);
await denied(member, "delete from public.user_roles");
assert.equal(
  (await asUser(member, "select * from public.moderation_actions")).rows.length,
  0,
);
assert.equal(
  (await asUser(other, "select * from public.point_transactions")).rows.length,
  0,
);
await db.exec("reset role;");
const injected = "00000000-0000-4000-8000-000000000005";
await db.exec(
  `insert into auth.users(id,raw_user_meta_data) values('${injected}','{"display_name":"Signup test","role":"admin"}')`,
);
assert.equal(
  (await asUser(injected, "select * from public.user_roles")).rows.length,
  0,
);
await denied(injected, "select * from public.admin_organizer_requests()");
console.log(
  "Additional security checks passed: RLS on every table, protected profile columns, private moderation/points, and rejected signup-metadata role injection.",
);

// Profile photo policy and Google identity lifecycle checks.
await db.exec('reset role;');
const googleUser='00000000-0000-4000-8000-000000000006';
await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${googleUser}','{"full_name":"Google New Member"}');
insert into auth.identities(user_id,provider,identity_data) values('${googleUser}','google','{"picture":"https://lh3.googleusercontent.com/test-photo"}');`);
let googleProfile=(await asUser(googleUser,'select * from public.profiles')).rows[0];
assert.equal(googleProfile.display_name,'Google New Member');assert.equal(googleProfile.google_avatar_url,'https://lh3.googleusercontent.com/test-photo');
await asUser(googleUser,"update public.profiles set display_name='My edited name' where id=auth.uid()");
await asUser(googleUser,'select public.sync_google_profile()');await asUser(googleUser,'select public.sync_google_profile()');
assert.equal((await asUser(googleUser,'select count(*)::int as n from public.profiles')).rows[0].n,1);
assert.equal((await asUser(googleUser,'select display_name from public.profiles')).rows[0].display_name,'My edited name');
const photo1=googleUser+'/11111111-1111-4111-8111-111111111111.webp';
const photo2=googleUser+'/22222222-2222-4222-8222-222222222222.webp';
await denied(other,`insert into storage.objects(bucket_id,name,owner_id,metadata) values('avatars','${photo1}','${other}','{"mimetype":"image/webp","size":100}')`);
await asUser(googleUser,`insert into storage.objects(bucket_id,name,owner_id,metadata) values('avatars','${photo1}','${googleUser}','{"mimetype":"image/webp","size":100}')`);
await asUser(googleUser,`select public.set_profile_avatar('${photo1}')`);
await denied(other,`select public.set_profile_avatar('${photo1}')`);
await denied(googleUser,`select public.set_profile_avatar('${other}/11111111-1111-4111-8111-111111111111.webp')`);
await denied(googleUser,"update public.profiles set avatar_path=null where id=auth.uid()");
await denied(googleUser,"update public.profiles set google_avatar_url='https://example.com/evil' where id=auth.uid()");
assert.equal((await asUser(other,`select * from storage.objects where name='${photo1}'`)).rows.length,0);
assert.equal((await asUser(other,`delete from storage.objects where name='${photo1}' returning id`)).rows.length,0);
assert.equal((await asUser(other,`update storage.objects set name='${photo2}' where name='${photo1}' returning id`)).rows.length,0);
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
assert.equal((await db.query(`select * from storage.objects where name='${photo1}'`)).rows.length,0);
await assert.rejects(()=>db.query("select public.set_profile_avatar(null)"));
await db.exec(`reset role;update auth.identities set identity_data='{"picture":"https://lh3.googleusercontent.com/updated"}' where user_id='${googleUser}';`);
googleProfile=(await asUser(googleUser,'select * from public.profiles')).rows[0];
assert.equal(googleProfile.avatar_path,photo1);assert.equal(googleProfile.google_avatar_url,'https://lh3.googleusercontent.com/updated');assert.equal(googleProfile.display_name,'My edited name');
await asUser(googleUser,`insert into storage.objects(bucket_id,name,owner_id,metadata) values('avatars','${photo2}','${googleUser}','{"mimetype":"image/webp","size":200}')`);
assert.equal((await asUser(googleUser,`select public.set_profile_avatar('${photo2}') as previous`)).rows[0].previous,photo1);
await asUser(googleUser,`delete from storage.objects where name='${photo1}'`);
assert.equal((await asUser(googleUser,`select public.set_profile_avatar(null) as previous`)).rows[0].previous,photo2);
await asUser(googleUser,`delete from storage.objects where name='${photo2}'`);
googleProfile=(await asUser(googleUser,'select * from public.profiles')).rows[0];assert.equal(googleProfile.avatar_path,null);assert.equal(googleProfile.google_avatar_url,'https://lh3.googleusercontent.com/updated');
await db.exec(`reset role;update auth.identities set identity_data='{"picture":"https://evil.test/pixel"}' where user_id='${googleUser}';`);
assert.equal((await asUser(googleUser,'select google_avatar_url from public.profiles')).rows[0].google_avatar_url,null);
// Only current photos of opted-in verified participants are available to others.
const publicPhoto=member+'/33333333-3333-4333-8333-333333333333.webp';
await asUser(member,`insert into storage.objects(bucket_id,name,owner_id,metadata) values('avatars','${publicPhoto}','${member}','{"mimetype":"image/webp","size":100}')`);
await asUser(member,`select public.set_profile_avatar('${publicPhoto}')`);
await asUser(member,'update public.profiles set leaderboard_visible=true where id=auth.uid()');
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
assert.equal((await db.query(`select * from public.leaderboard_photos(ARRAY['${member}','${googleUser}']::uuid[])`)).rows.length,1);
assert.equal((await db.query(`select * from storage.objects where name='${publicPhoto}'`)).rows.length,1);
await asUser(member,'update public.profiles set leaderboard_visible=false where id=auth.uid()');
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
assert.equal((await db.query(`select * from storage.objects where name='${publicPhoto}'`)).rows.length,0);
console.log('Photo security passed: bucket privacy, ownership, path constraints, replacement/removal, private photos, leaderboard consent, Google fallback, name preservation and idempotent profile sync.');
// Administrator management uses real migrations and authenticated database roles.
await denied(member, "select * from public.admin_members('',true)");
await denied(member, `select public.set_administrator('${member}',true)`);
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
await assert.rejects(() => db.query("select * from public.admin_members('',true)"));
await assert.rejects(() => db.query(`select public.set_administrator('${member}',true)`));
await denied(admin, `select public.set_administrator('${admin}',false)`);
assert.equal((await asUser(admin,"select * from public.admin_members('',true)")).rows.length,1);
await asUser(admin, `select public.set_administrator('${organizer}',true)`);
assert.equal((await asUser(organizer,"select * from public.admin_members('',true)")).rows.length,2);
await asUser(admin, `select public.set_administrator('${organizer}',false)`);
assert.equal((await asUser(organizer,"select role from public.user_roles where user_id=auth.uid()")).rows[0].role,'organizer');
await denied(organizer,"select * from public.admin_members('',true)");
await asUser(admin, `select public.set_administrator('${member}',true)`);
await asUser(member, `select public.set_administrator('${member}',false)`);
await denied(member,"select * from public.admin_members('',true)");
await denied(member, `update public.user_roles set role='admin' where user_id='${member}'`);
await denied(admin, `delete from public.user_roles where user_id='${admin}'`);
await denied(admin, `select public.set_administrator('ffffffff-ffff-4fff-8fff-ffffffffffff',true)`);
const auditChanges = await asUser(admin,"select * from public.moderation_actions where action in ('admin_granted','admin_removed')");
assert.equal(auditChanges.rows.length,4);
assert.ok(auditChanges.rows.every(row => row.actor_id && row.target_id));
assert.equal((await asUser(member,"select * from public.moderation_actions")).rows.length,0);
const directory = (await asUser(admin,"select * from public.admin_members('Saved',false)")).rows;
assert.ok(directory.some(row => row.user_id===member));
assert.ok(directory.every(row => !('email' in row)));
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
assert.equal((await db.query(`select * from public.leaderboard_administrators(ARRAY['${admin}']::uuid[])`)).rows.length,0);
await asUser(admin, `select public.set_administrator('${member}',true)`);
await asUser(member, 'update public.profiles set leaderboard_visible=true where id=auth.uid()');
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
assert.equal((await db.query(`select * from public.leaderboard_administrators(ARRAY['${member}']::uuid[])`)).rows.length,1);
await asUser(member, 'update public.profiles set leaderboard_visible=false where id=auth.uid()');
await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
assert.equal((await db.query(`select * from public.leaderboard_administrators(ARRAY['${member}']::uuid[])`)).rows.length,0);
await asUser(admin, `select public.set_administrator('${member}',false)`);
console.log('Admin management passed: anonymous/member denial, last-admin protection, promotion, organizer restoration, self-removal/revocation, audit logs, private directory and denied direct writes.');
await db.close();
