-- MacroMine. Run once in a new Supabase project's SQL editor. No seed data.
begin;

create domain public.macro_value as numeric(12,4)
  check (value >= 0 and value <> 'NaN'::numeric);
create domain public.positive_amount as numeric(12,4)
  check (value > 0 and value <> 'NaN'::numeric);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  brand text check (length(brand) <= 200),
  reference_amount public.positive_amount not null,
  unit text not null check (unit in ('g','ml','pc','tbsp','tsp')),
  calories public.macro_value not null, protein public.macro_value not null,
  fiber public.macro_value not null, fat public.macro_value not null,
  source text not null default 'manual' check (source in ('manual','usda','off')),
  source_id text,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create index ingredients_user_name_idx on public.ingredients(user_id, name);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create index meals_user_idx on public.meals(user_id);

create table public.meal_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meal_id uuid not null,
  kind text not null check (kind in ('ingredient','meal','direct')),
  ingredient_id uuid,
  child_meal_id uuid,
  label text,
  amount public.positive_amount not null,
  reference_amount public.positive_amount not null default 1,
  unit text not null default 'pc' check (unit in ('g','ml','pc','tbsp','tsp')),
  calories public.macro_value, protein public.macro_value,
  fiber public.macro_value, fat public.macro_value,
  position integer not null check (position >= 0),
  foreign key(meal_id, user_id) references public.meals(id, user_id) on delete cascade,
  foreign key(ingredient_id, user_id) references public.ingredients(id, user_id),
  foreign key(child_meal_id, user_id) references public.meals(id, user_id),
  check (
    (kind = 'ingredient' and ingredient_id is not null and child_meal_id is null and label is null and calories is null and protein is null and fiber is null and fat is null)
    or (kind = 'meal' and child_meal_id is not null and ingredient_id is null and label is null and calories is null and protein is null and fiber is null and fat is null)
    or (kind = 'direct' and ingredient_id is null and child_meal_id is null and label is not null and length(trim(label)) between 1 and 200 and calories is not null and protein is not null and fiber is not null and fat is not null)
  ),
  check (child_meal_id is distinct from meal_id)
);
create index meal_components_user_meal_idx on public.meal_components(user_id, meal_id, position);
create index meal_components_child_idx on public.meal_components(child_meal_id, user_id);
create index meal_components_ingredient_idx on public.meal_components(ingredient_id, user_id);

-- Serialize template edits for each owner, including direct Data API writes.
create function public.check_meal_depth() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if new.kind = 'meal' and (
    exists(select 1 from public.meal_components where meal_id = new.child_meal_id and kind = 'meal')
    or exists(select 1 from public.meal_components where child_meal_id = new.meal_id and kind = 'meal')
  ) then
    raise exception 'Saved meals may nest only one level; cycles are not allowed.';
  end if;
  return new;
end; $$;
create trigger meal_depth before insert or update on public.meal_components
  for each row execute function public.check_meal_depth();

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  log_date date not null,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create index log_entries_user_date_idx on public.log_entries(user_id, log_date, created_at);

-- Historical snapshots deliberately have no ingredient/meal foreign keys.
create table public.log_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_id uuid not null,
  label text not null check (length(trim(label)) between 1 and 200),
  amount public.positive_amount not null,
  unit text not null check (unit in ('g','ml','pc','tbsp','tsp')),
  calories public.macro_value not null, protein public.macro_value not null,
  fiber public.macro_value not null, fat public.macro_value not null,
  position integer not null check (position >= 0),
  foreign key(entry_id, user_id) references public.log_entries(id, user_id) on delete cascade
);
create index log_lines_user_entry_idx on public.log_lines(user_id, entry_id, position);

create table public.daily_targets (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  calories public.macro_value not null, protein public.macro_value not null,
  fiber public.macro_value not null, fat public.macro_value not null
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  notes text,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create index workout_sessions_user_idx on public.workout_sessions(user_id);
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  position integer not null check (position >= 0),
  sets integer not null check (sets > 0),
  rest_seconds integer not null default 120 check (rest_seconds >= 0),
  notes text,
  foreign key(session_id, user_id) references public.workout_sessions(id, user_id) on delete cascade
);
create index workout_exercises_user_session_idx on public.workout_exercises(user_id, session_id, position);

-- Every table: indexed ownership, explicit grants, SELECT + USING/WITH CHECK.
do $$ declare t text; begin
  foreach t in array array['ingredients','meals','meal_components','log_entries','log_lines','daily_targets','workout_sessions','workout_exercises'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Atomic replacement avoids partial templates and partial historical entries.
create function public.save_meal(p_id uuid, p_name text, p_components jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result_id uuid; c jsonb; n integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_components is null or jsonb_typeof(p_components) <> 'array' or jsonb_array_length(p_components) not between 1 and 100 then
    raise exception 'Add between 1 and 100 components';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if p_id is null then
    insert into public.meals(name) values(p_name) returning id into result_id;
  else
    update public.meals set name = p_name where id = p_id and user_id = auth.uid() returning id into result_id;
    if result_id is null then raise exception 'Meal not found'; end if;
    delete from public.meal_components where meal_id = result_id;
  end if;
  for c in select * from jsonb_array_elements(p_components) loop
    insert into public.meal_components(meal_id, kind, ingredient_id, child_meal_id, label, amount, reference_amount, unit, calories, protein, fiber, fat, position)
    values(result_id, c->>'kind', (c->>'ingredient_id')::uuid, (c->>'child_meal_id')::uuid, c->>'label', (c->>'amount')::numeric,
      coalesce((c->>'reference_amount')::numeric, 1), coalesce(c->>'unit','pc'), (c->>'calories')::numeric, (c->>'protein')::numeric, (c->>'fiber')::numeric, (c->>'fat')::numeric, n);
    n := n + 1;
  end loop;
  return result_id;
end; $$;

create function public.save_log(p_id uuid, p_date date, p_name text, p_lines jsonb,
  p_meal_id uuid default null, p_meal_name text default null, p_components jsonb default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result_id uuid; c jsonb; n integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'Add between 1 and 100 lines';
  end if;
  if p_meal_name is not null then perform public.save_meal(p_meal_id, p_meal_name, p_components); end if;
  if p_id is null then
    insert into public.log_entries(name, log_date) values(p_name, p_date) returning id into result_id;
  else
    update public.log_entries set name = p_name, log_date = p_date where id = p_id and user_id = auth.uid() returning id into result_id;
    if result_id is null then raise exception 'Log entry not found'; end if;
    delete from public.log_lines where entry_id = result_id;
  end if;
  for c in select * from jsonb_array_elements(p_lines) loop
    insert into public.log_lines(entry_id, label, amount, unit, calories, protein, fiber, fat, position)
    values(result_id, c->>'label', (c->>'amount')::numeric, c->>'unit', (c->>'calories')::numeric, (c->>'protein')::numeric, (c->>'fiber')::numeric, (c->>'fat')::numeric, n);
    n := n + 1;
  end loop;
  return result_id;
end; $$;

revoke all on function public.check_meal_depth() from public, anon;
revoke all on function public.save_meal(uuid,text,jsonb) from public, anon;
revoke all on function public.save_log(uuid,date,text,jsonb,uuid,text,jsonb) from public, anon;
grant execute on function public.save_meal(uuid,text,jsonb) to authenticated;
grant execute on function public.save_log(uuid,date,text,jsonb,uuid,text,jsonb) to authenticated;
commit;
