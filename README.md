# MacroMine

A personal, mobile-first macro journal built with Next.js 16 App Router, strict TypeScript, Tailwind CSS, and Supabase Auth/Postgres. Tracks only calories, protein, fiber, and fat. Gym is a disabled navigation item; its schema is ready for later work.

## Set up

1. Use Node.js 22.12+ and run `npm ci`.
2. Create a Supabase project. In **SQL Editor**, run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) once against a new database. It includes tables, numeric constraints, indexes, owner-only RLS, and transactional save functions. There is no seed data.
3. In **Authentication → Users**, create your own user with an email and password. Confirm the email in the dashboard when creating it.
4. In **Authentication → Sign In / Providers**, disable **Allow new users to sign up**. Only the dashboard-created account should be able to sign in. The app has a login page only.
5. Copy `.env.example` to `.env.local` and fill in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   USDA_API_KEY=your-usda-fooddata-central-key
   OFF_USER_AGENT=MacroMine/1.0 (my-email@example.com)
   ```

   The URL and anon key are public Supabase client configuration; RLS protects all rows. Never use a service-role key here. Obtain a free [USDA API key](https://fdc.nal.usda.gov/api-key-signup/). The food lookup variables are optional: manual entry always works. Replace the contact email in `OFF_USER_AGENT` with yours. This variable is sent verbatim as the **server-side** Open Food Facts `User-Agent`; it is never bundled into client JavaScript.

6. Run `npm run dev` and open `http://localhost:3000`. Sign in and set your daily targets. Missing Supabase configuration displays setup guidance on the login page and keeps protected pages/API routes inaccessible.

## Use MacroMine

- **Ingredients:** add food names, optional brands, a reference amount in g, ml, pc, tbsp, or tsp, and macros for that amount. The picker defaults to that reference portion. Each brand is a separate ingredient.
- **Look up:** optionally submit a USDA or Open Food Facts search. USDA defaults to Foundation and SR Legacy, with an option for Branded. Search results prefill editable values for 100 g (or 100 ml for identified OFF liquids). Missing nutrients are flagged and prefilled as zero. OFF results are unverified. Check portion units and nutrition values before saving.
- **Meals:** combine ingredients, direct macro lines, and another saved meal. One level of nesting is allowed. Cycles and deeper nesting are rejected in the app and database.
- **Today:** switch dates, view totals against targets, log mixed food sources in one sheet, and edit/delete entries. Choosing a meal expands editable lines. **Log only** changes just that entry; **Log and update saved meal** explicitly replaces the chosen template with the shared list; **Save as new meal and log** creates a new template. These saves are atomic. When multiple meals were added, choose which template to replace.
- **History:** each log line stores its label, amount, unit, and four computed macros, without ingredient/meal foreign keys. Library edits and deletions never recalculate past logs. Editing a past log operates on its snapshots. A historical snapshot saved as a meal becomes a direct macro component.
- Light/dark follows your device; the header toggle persists a local preference. Journal dates use your device timezone, falling back to Asia/Manila until the device timezone is available.

## Install on your phone

Deploy with `npm run build` / `npm start` on a Next.js-compatible **HTTPS** host and configure the same environment variables. Localhost is also a secure context for development; an HTTP LAN address is not enough for PWA installation.

- **iPhone / iPad:** open MacroMine in Safari → Share → **Add to Home Screen** → enable **Open as Web App** when offered.
- **Android:** open in Chrome → menu → **Install app** / **Add to home screen**.

The manifest uses `name` and `short_name` **MacroMine**, standalone display, a stable root start URL, and 192/512 px PNG icons plus a safe-area maskable icon. Apple touch metadata/icon are included. The service worker registers in production and caches public icons and a plain offline page only. Journal, authentication, and food API responses are never cached. Reconnect before viewing or changing account data; there is no offline write queue.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Vitest covers the single pure scaling rule, meal expansion and immutable snapshots, food nutrient mapping, validation, and a real PostgreSQL engine (PGlite) migration/RLS integration suite. Production Supabase Auth, cookie refresh, email/password access, provider limits, and phone installation still require verification with your own configured project/HTTPS deployment.

See [verification details](docs/verification.md) for the checks performed and their limits.

## Implementation

- Next.js 16 calls middleware **Proxy**: `proxy.ts` refreshes Supabase cookies and protects pages/API routes. Server actions and food routes independently verify the user; all data access uses their authenticated client and RLS. Public manifest/icons/offline assets bypass auth so installation works before sign-in.
- [Design notes](docs/design-notes.md) document the researched references, self-hosted DM Sans, restrained pine palette, tabular numbers, flat borders, and mobile bottom sheets.
- [Calculation rule](lib/macros.ts): `macros × (amount / reference_amount)`. No calculation rounding before display/persistence. PostgreSQL stores fixed-precision `numeric(12,4)`, calories display as integers and grams to one decimal.
- Food API keys and User-Agent remain on the server in `/api/foods/usda` and `/api/foods/off`. Search is submitted explicitly, with timeouts and readable errors. [USDA](https://fdc.nal.usda.gov/api-guide/) publishes a default 1,000 requests/hour/IP; [Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) limits search to approximately 10/minute/IP. Limits are shared by server egress IP and enforced upstream.
- OFF data attribution: [Open Food Facts contributors](https://world.openfoodfacts.org/), [ODbL](https://world.openfoodfacts.org/terms-of-use). USDA FoodData Central is public-domain data.
- The npm package is private and named `MacroMine` as requested; it is not intended for npm registry publication.
