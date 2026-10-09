# PC Build Bench — 50% milestone

React + Vite PC configuration decision-support application. The current feature set includes workload evaluation, QFD, component selection, build configuration, compatibility/power/budget checks, FMEA, rule-based recommendations, saved builds, and component catalogue administration.

## Run locally

Requirements: Node.js 20.19+ (Node 22 recommended) and npm.

```bash
npm install
npm run dev
```

The first `npm install` creates a local `package-lock.json`. Commit it if this is your repository so future installs can use `npm ci` consistently.

## Current catalogue

The bundled starter catalogue contains 44 illustrative components across all seven categories. Sample prices are not live market prices and should be checked before using a build as a real purchasing list.

You can add components in **Administration** while running without Supabase, or import/export a CSV. The template is available in the UI. CSV format:

`id,category,name,brand,price,power,specs_json,source_url,price_checked_at`

For a larger shared catalogue and real accounts, configure Supabase using [supabase/SETUP.md](supabase/SETUP.md). That document includes the database schema, row-level security, account creation, admin setup and CSV import steps.

## Supabase features

- Email/password sign-up, sign-in, persistent sessions and password-reset email flow
- PostgreSQL component catalogue
- Saved builds scoped to the signed-in user
- Admin-only shared catalogue create/update/delete/bulk CSV import
- RLS policies protecting profile roles and saved configurations

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Do not expose a service-role or secret key in this frontend. Without these variables, the app stays in local guest mode; real authentication is disabled rather than simulated.

## Checks

```bash
npm run test:logic
npm run build
```

## GitHub Pages

The repository includes `.github/workflows/deploy.yml`. In GitHub, set **Settings → Pages → Source: GitHub Actions**. Configure the `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` repository Actions variables/secrets before deployment if the hosted site should use real auth/database features. Vite embeds `VITE_*` values into the client build; these must contain only the Supabase project URL and publishable key, never a secret/service-role key. Configure Supabase redirect URLs for the published site as described in `supabase/SETUP.md`.

## Notes

- QFD, compatibility, power/budget analysis, FMEA and recommendation logic remain deterministic/rule-based.
- Pareto comparison is not implemented in this milestone.
- The local demo catalogue is illustrative. Component prices and specs should be verified and dated before making purchasing decisions.
