import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL("../migrations/20260808_harden_inquiry_access.sql", import.meta.url);

describe("inquiry access migration", () => {
  it("checks the existing database admin allowlist through a locked-down definer helper", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create or replace function public\.is_decorbeats_admin\(\)/i);
    assert.match(sql, /security definer/i);
    assert.match(sql, /set search_path = pg_catalog, public, pg_temp/i);
    assert.match(sql, /from public\.admins admin_user/i);
    assert.match(sql, /join auth\.users authenticated_user/i);
    assert.match(sql, /authenticated_user\.id = auth\.uid\(\)/i);
    assert.match(sql, /alter function public\.is_decorbeats_admin\(\) owner to postgres/i);
    assert.match(sql, /revoke all on function public\.is_decorbeats_admin\(\) from public, anon, authenticated/i);
    assert.match(sql, /grant execute on function public\.is_decorbeats_admin\(\) to authenticated, service_role/i);
    assert.match(sql, /revoke insert, update, delete on table public\.admins from public, anon, authenticated/i);
  });

  it("uses the database allowlist for every authenticated inquiry policy", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    const policies = sql.slice(sql.indexOf('create policy "Authenticated read inquiries"'));

    assert.equal((policies.match(/select public\.is_decorbeats_admin\(\)/gi) || []).length, 4);
    assert.doesNotMatch(policies, /using\s*\(true\)/i);
    assert.match(sql, /revoke all privileges on table public\.inquiries from public, anon, authenticated/i);
    assert.match(sql, /revoke all privileges on table public\.inquiry_items from public, anon, authenticated/i);
  });
});
