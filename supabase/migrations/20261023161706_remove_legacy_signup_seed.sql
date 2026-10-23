-- Remove orphaned legacy seed hooks referencing deleted foods/default_food_catalog tables.
-- MacroMine uses explicit ingredient entry and does not seed user data.
begin;
drop trigger if exists macromine_seed_foods_on_signup on auth.users;
drop function if exists public.seed_macromine_foods_on_signup();
drop function if exists public.seed_macromine_foods(uuid);
commit;
