# Supabase setup for PC Build Bench

This setup enables real email/password authentication, a shared PostgreSQL component catalogue, user-owned saved builds, and administrator-controlled catalogue updates.

## 1. Create/configure a Supabase project

1. Create a Supabase project.
2. Open **Project Settings / API Keys** (or the project's **Connect** dialog) and copy the project URL and publishable key.
3. In the repository root, copy `.env.example` to `.env.local` and set:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   The older `anon` public key can be used as `VITE_SUPABASE_ANON_KEY` if that is what the dashboard gives you. **Never use a service-role or secret key in this React app.**

4. Restart Vite after changing environment values.

## 2. Create the tables and access policies

Open **SQL Editor** in Supabase, paste the contents of:

`supabase/migrations/20261009000100_initial_schema.sql`

Run it once. It creates:

- `profiles` — profile and role (`user`/`admin`)
- `components` — shared component catalogue and specifications
- `saved_builds` — saved configurations owned by a user
- Row Level Security (RLS) policies for the catalogue and per-user saved builds

The migration also adds a trigger that creates a profile when a new auth user signs up.

## 3. Configure email authentication

In **Authentication → URL Configuration**, set the Site URL to your local Vite address while developing, usually `http://localhost:5173`. Add your published GitHub Pages URL as an allowed redirect URL when deploying, for example:

`https://YOUR_GITHUB_USERNAME.github.io/pc-build-bench/`

In **Authentication → Providers**, enable Email. If email confirmation is enabled, sign-up sends a confirmation email; the user must confirm before signing in. Configure SMTP if you need reliable email delivery outside development/testing.

## 4. Create your admin account

1. Run the app and use **Create an account** with your own email.
2. Confirm the email if confirmation is enabled, then sign in once.
3. In Supabase SQL Editor, replace the email below with your own and run:

   ```sql
   insert into public.profiles (id, email, display_name, role)
   select id, email, coalesce(raw_user_meta_data ->> 'display_name', ''), 'admin'
   from auth.users
   where lower(email) = lower('YOUR_EMAIL_HERE')
   on conflict (id) do update set role = 'admin';
   ```

4. Sign out and sign in again. Your account can now access **Administration**.

Profile role cannot be changed from the client. The `is_admin()` function and database policies enforce component write access; hiding the admin page alone is not the security boundary.

## 5. Import the starter component catalogue

Open **Administration → Bulk catalogue import → Select CSV**, then select:

`data/starter-components.csv`

It contains 44 illustrative catalogue records across CPU, motherboard, RAM, GPU, storage, PSU and case. Prices are sample INR values, not guaranteed current retail prices. Verify specifications and update price/source/date before relying on a record for a real purchase decision.

For future updates, use **Export catalogue** before editing the CSV if you want to preserve IDs. Importing uses upsert by `id`; keep IDs stable when updating existing parts.

### CSV columns

`id,category,name,brand,price,power,specs_json,source_url,price_checked_at`

- `category` must be one of `CPU`, `Motherboard`, `RAM`, `GPU`, `Storage`, `PSU`, or `Case`.
- `price` is numeric INR.
- `power` is numeric watts (zero if not applicable).
- `specs_json` is a valid JSON object. Keep technical field names consistent with the existing catalogue, such as `socket`, `ramType`, `type`, `length`, `gpuClearance`, `wattage`, `capacity`, and `performanceScore`.
- `source_url` should identify the manufacturer/retailer page used to verify the specification or price.
- `price_checked_at` uses `YYYY-MM-DD`.

The catalogue importer validates the whole file before writing. Start with small imports and check the compatibility results after adding new products.

## 6. Verify the integration

1. Sign up with a second test user.
2. Save a build under that user.
3. Sign out and sign into the first user; the second user's build should not be visible.
4. As admin, import/update a component and confirm it appears in the catalogue for guests and signed-in users.
5. Try loading the app in a private browser window and confirm catalogue browsing works without signing in, while saved builds remain protected.

## Local-only mode

Without `.env.local`, the app remains usable as a guest with the bundled sample catalogue. Administration can add/edit/delete/import components into browser `localStorage`, but actual account authentication and cross-device saved builds are disabled until Supabase is configured.
