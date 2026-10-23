import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
let ingredientId: string;
let mealId: string;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${owner}'), ('${other}');
  `);
  await db.exec(
    readFileSync(
      new URL("../supabase/migrations/0001_init.sql", import.meta.url),
      "utf8",
    ),
  );
  await asUser(owner);
}, 30000);
afterAll(async () => {
  await db.close();
});

describe("Postgres migration, ownership and atomic snapshots", () => {
  it("creates every table with RLS and fixed-precision nutrients", async () => {
    const result = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
    );
    expect(result.rows).toHaveLength(8);
    expect(result.rows.every((row) => row.rowsecurity)).toBe(true);
  });
  it("enforces amount, unit, and macro constraints", async () => {
    await expect(
      db.query(
        "insert into public.ingredients(name,reference_amount,unit,calories,protein,fiber,fat) values('Bad',0,'g',1,1,1,1)",
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.ingredients(name,reference_amount,unit,calories,protein,fiber,fat) values('Bad',10,'cups',1,1,1,1)",
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.ingredients(name,reference_amount,unit,calories,protein,fiber,fat) values('Bad',10,'g',-1,1,1,1)",
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.ingredients(name,reference_amount,unit,calories,protein,fiber,fat) values('Bad',10,'g','NaN',1,1,1)",
      ),
    ).rejects.toThrow();
    const result = await db.query<{ id: string }>(
      "insert into public.ingredients(name,reference_amount,unit,calories,protein,fiber,fat) values('Oats',40,'g',150,5,4,3) returning id",
    );
    ingredientId = result.rows[0].id;
  });
  it("saves templates atomically and rejects deeper nesting/cycles", async () => {
    const c = [{ kind: "ingredient", ingredient_id: ingredientId, amount: 40 }];
    const result = await db.query<{ id: string }>(
      "select public.save_meal(null,$1,$2::jsonb) as id",
      ["Oats", JSON.stringify(c)],
    );
    mealId = result.rows[0].id;
    const parent = await db.query<{ id: string }>(
      "select public.save_meal(null,$1,$2::jsonb) as id",
      [
        "Double oats",
        JSON.stringify([{ kind: "meal", child_meal_id: mealId, amount: 2 }]),
      ],
    );
    await expect(
      db.query("select public.save_meal(null,$1,$2::jsonb)", [
        "Too deep",
        JSON.stringify([
          { kind: "meal", child_meal_id: parent.rows[0].id, amount: 1 },
        ]),
      ]),
    ).rejects.toThrow(/one level/);
    await expect(
      db.query("select public.save_meal($1,$2,$3::jsonb)", [
        mealId,
        "Cycle",
        JSON.stringify([
          { kind: "meal", child_meal_id: parent.rows[0].id, amount: 1 },
        ]),
      ]),
    ).rejects.toThrow();
    const original = await db.query<{ name: string }>(
      "select name from public.meals where id=$1",
      [mealId],
    );
    expect(original.rows[0].name).toBe("Oats");
  });
  it("keeps snapshots unchanged when an ingredient changes", async () => {
    const lines = [
      {
        label: "Oats",
        amount: 60,
        unit: "g",
        calories: 225,
        protein: 7.5,
        fiber: 6,
        fat: 4.5,
      },
    ];
    const log = await db.query<{ id: string }>(
      "select public.save_log(null,$1,$2,$3::jsonb) as id",
      ["2026-10-23", "Breakfast", JSON.stringify(lines)],
    );
    await db.query("update public.ingredients set calories=1 where id=$1", [
      ingredientId,
    ]);
    const snapshot = await db.query<{ calories: string }>(
      "select calories from public.log_lines where entry_id=$1",
      [log.rows[0].id],
    );
    expect(Number(snapshot.rows[0].calories)).toBe(225);
  });
  it("rolls back both log and template when a line fails", async () => {
    await expect(
      db.query("select public.save_log(null,$1,$2,$3::jsonb,$4,$5,$6::jsonb)", [
        "2026-10-23",
        "Invalid",
        JSON.stringify([
          {
            label: "Bad",
            amount: -1,
            unit: "g",
            calories: 1,
            protein: 1,
            fiber: 1,
            fat: 1,
          },
        ]),
        mealId,
        "Must roll back",
        JSON.stringify([
          { kind: "ingredient", ingredient_id: ingredientId, amount: 10 },
        ]),
      ]),
    ).rejects.toThrow();
    const names = await db.query<{ name: string }>(
      "select name from public.meals where id=$1",
      [mealId],
    );
    expect(names.rows[0].name).toBe("Oats");
    expect(
      (await db.query("select id from public.log_entries where name='Invalid'"))
        .rows,
    ).toHaveLength(0);
  });
  it("blocks another user from reading, changing, or linking owner records", async () => {
    await asUser(other);
    expect(
      (await db.query("select id from public.ingredients")).rows,
    ).toHaveLength(0);
    expect((await db.query("select id from public.meals")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select id from public.log_entries")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select id from public.log_lines")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.save_meal($1,$2,$3::jsonb)", [
        mealId,
        "Stolen",
        JSON.stringify([
          { kind: "ingredient", ingredient_id: ingredientId, amount: 40 },
        ]),
      ]),
    ).rejects.toThrow(/not found/);
    await expect(
      db.query("select public.save_meal(null,$1,$2::jsonb)", [
        "Foreign ingredient",
        JSON.stringify([
          { kind: "ingredient", ingredient_id: ingredientId, amount: 40 },
        ]),
      ]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.daily_targets(user_id,calories,protein,fiber,fat) values($1,100,10,10,10)",
        [owner],
      ),
    ).rejects.toThrow(/row-level security/);
    await asUser(owner);
    await expect(
      db.query("update public.ingredients set user_id=$1 where id=$2", [
        other,
        ingredientId,
      ]),
    ).rejects.toThrow(/row-level security/);
  });
  it("defaults rest to 120 seconds and isolates workout ownership", async () => {
    const session = await db.query<{ id: string }>(
      "insert into public.workout_sessions(name) values('Strength') returning id",
    );
    const exercise = await db.query<{ rest_seconds: number }>(
      "insert into public.workout_exercises(session_id,name,position,sets) values($1,'Squat',0,3) returning rest_seconds",
      [session.rows[0].id],
    );
    expect(exercise.rows[0].rest_seconds).toBe(120);
    await asUser(other);
    expect(
      (await db.query("select * from public.workout_exercises")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.workout_exercises(session_id,name,position,sets) values($1,'Squat',0,3)",
        [session.rows[0].id],
      ),
    ).rejects.toThrow();
  });
  it("denies unauthenticated table and function access", async () => {
    await db.exec("reset role; set role anon");
    await expect(db.query("select * from public.ingredients")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("select public.save_meal(null,'Bad','[]'::jsonb)"),
    ).rejects.toThrow(/permission denied/);
  });
});
