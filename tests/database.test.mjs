import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
let aId, bId;
const migrationDir = new URL("../supabase/migrations/", import.meta.url);
const hardening = readdirSync(migrationDir).find((name) => name.endsWith("_pages_direct_access_hardening.sql"));
async function as(role, id = null) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(id ? { sub: id, role } : {})]);
  await db.exec("set role " + role); // Internal fixed test roles only.
}
async function query(sql, args = []) { return (await db.query(sql, args)).rows; }
before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  await db.exec(readFileSync(new URL("../supabase/bootstrap.sql", import.meta.url), "utf8"));
  for (const name of readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(readFileSync(new URL(name, migrationDir), "utf8"));
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'a@example.invalid',$3),($2,'b@example.invalid',$4)",
    [A, B, JSON.stringify({ first_name: "Alice" }), JSON.stringify({ first_name: "Bob" })]);
  const profiles = await query("select id,auth_user_id from public.users order by id");
  aId = profiles.find((row) => row.auth_user_id === A).id;
  bId = profiles.find((row) => row.auth_user_id === B).id;
});
beforeEach(async () => {
  await as("postgres");
  await db.exec("truncate public.notes, public.global_notes, app_private.publication_events restart identity;");
});
after(async () => { await db.close(); });

test("profiles are provisioned, owner defaults work, and another account cannot read/update/delete a private note", async () => {
  await as("authenticated", A);
  const created = await query("insert into public.notes(title,content) values('Alice secret','private') returning id,title");
  const id = created[0].id;
  await as("authenticated", B);
  assert.equal((await query("select id,title from public.notes")).length, 0);
  assert.equal((await query("update public.notes set title='stolen' where id=$1 returning id",[id])).length, 0);
  assert.equal((await query("delete from public.notes where id=$1 returning id",[id])).length, 0);
  await assert.rejects(db.query("insert into public.notes(user_id,title) values($1,'spoofed')",[aId]), { code: "42501" });
  await as("authenticated", A);
  assert.equal((await query("select id,title from public.notes"))[0].title, "Alice secret");
  assert.equal((await query("select id from public.users")).length, 1);
  await assert.rejects(db.query("update public.users set auth_user_id=$1 where id=$2",[B,aId]), { code:"42501" });
  await assert.rejects(db.query("update public.users set email='spoof@example.invalid' where id=$1",[aId]), { code:"42501" });
});
test("anonymous users can read public text but cannot read owners/private data or write", async () => {
  await as("authenticated", A);
  await query("insert into public.global_notes(title,content) values('Public','Visible')");
  await as("anon");
  assert.equal((await query("select id,title,content from public.global_notes"))[0].content, "Visible");
  for (const sql of ["select id from public.notes","select id from public.users","select user_id from public.global_notes","insert into public.global_notes(title) values('spam')"])
    await assert.rejects(db.query(sql), { code:"42501" });
});
test("authenticated users cannot change public ownership, backdate posts, or delete another owner's post", async () => {
  await as("authenticated", A);
  const [{ id }] = await query("insert into public.global_notes(title) values('Public') returning id");
  await assert.rejects(db.query("update public.global_notes set created_at='2000-01-01' where id=$1",[id]), { code:"42501" });
  await assert.rejects(db.query("update public.global_notes set user_id=$1 where id=$2",[bId,id]), { code:"42501" });
  await as("authenticated", B);
  assert.equal((await query("delete from public.global_notes where id=$1 returning id",[id])).length, 0);
});
test("table-wide privileges and privileged RPC execution are revoked", async () => {
  for (const table of ["users","notes","global_notes"])
    for (const privilege of ["TRUNCATE","TRIGGER","REFERENCES"])
      assert.equal((await query("select has_table_privilege('authenticated',$1,$2) allowed",["public."+table,privilege]))[0].allowed,false);
  await as("authenticated", A);
  await assert.rejects(db.query("select public.provision_profile($1,'fake@example.invalid','Fake')",[A]), { code:"42501" });
  await assert.rejects(db.query("select * from app_private.publication_events"), { code:"42501" });
});
test("private quota blocks note 1001, deletion frees capacity, and another account has its own quota", async () => {
  await db.query("insert into public.notes(user_id,title) select $1,'n'||n from generate_series(1,1000) n",[aId]);
  await as("authenticated", A);
  await assert.rejects(db.query("insert into public.notes(title) values('too many')"), /1,000 private notes/);
  await query("delete from public.notes where id=1");
  await query("insert into public.notes(title) values('room again')");
  await as("authenticated", B);
  await query("insert into public.notes(title) values('independent')");
});
test("bulk publication is atomic and deleting posts does not bypass the ten-minute limit", async () => {
  await as("authenticated", A);
  await assert.rejects(db.query("insert into public.global_notes(title) select 'bulk'||n from generate_series(1,11) n"), /10 Global Notes/);
  assert.equal((await query("select id from public.global_notes")).length,0);
  await query("insert into public.global_notes(title) select 'p'||n from generate_series(1,10) n");
  await query("delete from public.global_notes");
  await assert.rejects(db.query("insert into public.global_notes(title) values('deleted bypass')"), /10 Global Notes/);
  await as("authenticated", B);
  await query("insert into public.global_notes(title) values('other account')");
});
test("rolling daily quota survives deletion and recovers when events expire", async () => {
  await db.query("insert into app_private.publication_events(auth_user_id,created_at) select $1,now()-interval '1 hour' from generate_series(1,100)",[A]);
  await as("authenticated", A);
  await assert.rejects(db.query("insert into public.global_notes(title) values('daily excess')"), /100 Global Notes/);
  await as("postgres");
  await db.exec("update app_private.publication_events set created_at=now()-interval '25 hours'");
  await as("authenticated", A);
  await query("insert into public.global_notes(title) values('new day')");
  await as("postgres");
  assert.equal((await query("select count(*)::int n from app_private.publication_events"))[0].n,1);
});
test("database enforces content/name/theme restrictions, independently of the form", async () => {
  await as("authenticated", A);
  for (const table of ["notes","global_notes"]) {
    await assert.rejects(db.query("insert into public."+table+"(title) values('   ')"), { code:"23514" });
    await assert.rejects(db.query("insert into public."+table+"(title,content) values('large',repeat('x',20001))"), { code:"23514" });
  }
  await assert.rejects(db.query("update public.users set first_name=repeat('x',81)"), { code:"23514" });
  await assert.rejects(db.query("update public.users set theme_preference='untrusted'"), { code:"23514" });
});
test("hardening migration can be reapplied without losing account notes or publication history", async () => {
  await as("authenticated", A);
  await query("insert into public.notes(title) values('Keep')");
  await query("insert into public.global_notes(title) values('Keep public')");
  await as("postgres");
  await db.exec(readFileSync(new URL(hardening, migrationDir),"utf8"));
  assert.equal((await query("select count(*)::int n from public.notes"))[0].n,1);
  assert.equal((await query("select count(*)::int n from app_private.publication_events"))[0].n,1);
});
