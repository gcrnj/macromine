# MacroMine verification

Verified locally on 23 October 2026.

- `npm run lint`: passed.
- `npm run typecheck`: passed; TypeScript strict mode enabled.
- `npm test`: 27 passed across four suites. Includes calculation precision/invalid inputs, nested-meal expansion, snapshot independence, lookup mapping, validation, and PostgreSQL migration/RLS/transaction tests using PGlite.
- `npm run build`: passed. Journal, library pages, login and food handlers render dynamically; the manifest is static.
- A live USDA search using the public DEMO_KEY confirmed nutrient IDs 1008 (kcal), 1003 (protein), 1004 (fat), and 1079 (fiber), including their response units. No private API key was used.
- Without Supabase configuration: login shows setup guidance; journal redirects to login; food requests return 401; the manifest and public install assets remain accessible.
- Chrome mobile viewport 390 × 844: login and Today have no horizontal overflow; mixed-entry dialog fits viewport; no browser JavaScript errors.
- With a temporary local Supabase API fixture, browser checks covered email/password form submission, Today/library navigation, disabled Gym, reference defaults, saved-meal expansion, mixed entry sources, live totals, and dark-mode switching. Fixture data was temporary and is not shipped or seeded. These UI checks do not verify the live Supabase service.
- Live total example: 60 g oats plus 100 g yogurt computed 285 kcal / 17.5 g protein / 6 g fiber / 4.5 g fat. Adding a 20 kcal direct line and another 100 g yogurt produced 365 / 27.5 / 6 / 4.5 in the same list.
- Production service worker controlled the browser; disconnecting showed the plain offline page. Manifest name/short_name are MacroMine, display is standalone, icons have correct 192/512/180 dimensions, with a separate maskable entry.

Not verified: production Supabase Auth/email/password/session-refresh behavior, hosted PostgREST against the user's project, authenticated live food lookups using personal keys, real 429 responses, and installing from an HTTPS deployment on a physical phone. No project credentials were present. Follow the README setup, then verify these against your own project and device.

## Supabase MCP deployment — 24 October 2026

Connected to the existing **MacroMine** project (`yntwnqxmtqdpnyunniow`, ap-southeast-1) through Supabase MCP. Its public tables had been removed, while older migration history and a signup seed trigger remained.

Applied:

- `20261023161621_init_macromine`: the SQL in `supabase/migrations/0001_init.sql`.
- `20261023161706_remove_legacy_signup_seed`: removes the orphaned signup trigger and its two seed functions, which referenced deleted tables. The matching cleanup migration is retained locally.

Verified against the hosted database: all eight app tables exist with RLS enabled, authenticated CRUD grants, owner policies with both USING and WITH CHECK, and no anonymous SELECT access. Both save RPCs use SECURITY INVOKER, allow authenticated execution, and deny anonymous execution. No ingredients, meals, logs, or seed data were added. Existing migration history was preserved.

The security advisor's legacy seed-function warnings are resolved. A pre-existing [pg_trgm extension placement warning](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) remains; this migration does not change the existing extension.

Live sign-in, Supabase client environment setup, signup settings, and physical-phone installation were not part of this MCP migration operation and remain unverified. The earlier app/browser verification limits still apply.

## Extension advisory resolved — 24 October 2026

Applied `20261023163923_move_pg_trgm_to_extensions` through Supabase MCP. The extension is now in `extensions`; its similarity function was queried successfully and is no longer present in `public`. All eight app tables still have RLS enabled. The security advisor confirms the extension-placement warning is cleared.

A separate Auth advisory now reports [leaked password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auth settings were not changed as part of the extension relocation.
