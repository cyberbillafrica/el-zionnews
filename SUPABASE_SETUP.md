Supabase Setup Guide for el-zionnews

1) Create a Supabase project
   - Go to https://app.supabase.com and create a new project.
   - Copy the project `URL` and `anon` public key (Settings → API).
   - Store them as environment variables in your deployment: `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

2) Run the database migration
   - Open the SQL editor in the Supabase dashboard and run `db/migrations/001_create_tables.sql`.
   - Alternatively, use the Supabase CLI or `psql` with a `service_role` key to run migrations.

3) Configure Auth
   - Enable email/password provider (and any OAuth providers you want).
   - Editors will sign up via the dashboard; map their `auth.uid()` to records in the `users` table.
   - To create an initial admin, either invite a user then run an `UPDATE users SET role='super_admin' WHERE id='<their-uid>'` in SQL, or insert manually using the `service_role` key.

4) Create a Storage bucket for images
   - In Supabase → Storage create a bucket named `images` (or `public-images`).
   - If you want public image URLs, set the bucket to public. Otherwise use signed URLs.

5) Set RLS and Policies
   - The migration includes example RLS policies for `articles` and `users` — review and customize as needed.

6) Environment variables for the admin dashboard
   - `SUPABASE_URL` - project URL
   - `SUPABASE_ANON_KEY` - anon/public key for client operations
   - `SUPABASE_SERVICE_ROLE_KEY` - only required for server-side operations (keep secret)

7) Next steps in repo
   - The admin dashboard (HTML/JS) will use the anon key for login and client API calls.
   - Use the storage bucket for image uploads from the dashboard; store the resulting public URL in `articles.featured_image`.

Security notes
   - Never commit `SUPABASE_SERVICE_ROLE_KEY` to the repo.
   - Use RLS policies to prevent unauthorized reads/updates.
