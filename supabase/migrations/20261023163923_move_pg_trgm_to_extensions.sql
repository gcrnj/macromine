-- Keep extension helpers outside the application's public API schema.
-- Fresh projects without pg_trgm need no change.
begin;
do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
