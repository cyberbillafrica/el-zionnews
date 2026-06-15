# Database Migration Guide - El Zion News CMS

## Overview
This migration upgrades the CMS schema to support role-based access control (editors & admins), enhanced article metadata (SEO, social sharing), and real-time admin notifications when editors publish content.

## What Changed

### 1. **Users → Profiles**
- **Old:** `users` table with self-managed UUIDs
- **New:** `profiles` table linked to Supabase `auth.users(id)` with CASCADE delete
  - Ensures profiles are tied to actual authentication users
  - Cleaner role management (editor, admin, super_admin)

### 2. **New Article Fields**
| Field | Type | Purpose |
|-------|------|---------|
| `breaking` | boolean | Mark urgent/breaking news |
| `view_count` | integer | Track article popularity |
| `meta_title` | text | SEO page title |
| `meta_description` | text | SEO meta description |
| `meta_keywords` | text | SEO keywords |
| `meta_image` | text | Social media sharing image |

### 3. **Auto-Update Timestamp Trigger**
- Trigger: `trg_set_updated_at` 
- Automatically updates `updated_at` on any article modification
- Ensures accurate audit trail

### 4. **Admin Notifications**
- **New Table:** `notifications`
- **Trigger:** `trg_notify_admins_on_publish`
- When an editor publishes an article (status = 'published'):
  - Automatically creates notification entries for all admins
  - Admins can mark as read, triggering alerts

### 5. **Enhanced RLS (Row Level Security)**
#### Editor Permissions:
- ✅ Create articles (always with own `author_id`)
- ✅ Read/update/delete their own articles
- ✅ Change own article status (e.g., draft → published)

#### Admin Permissions:
- ✅ Read ANY article (published, draft, all statuses)
- ✅ Update ANY article
- ✅ Delete ANY article
- ✅ Manage user profiles

#### Public Permissions:
- ✅ Read published articles only

## Workflow: Editor → Publish → Admin Review

```
1. Editor creates/edits article in Editor Console
2. Editor clicks "Publish Article"
   → Article status changes to 'published'
   → Database trigger fires: notify_admins_on_publish()
   → Notification row created for each admin

3. Admin Dashboard alerts admin via:
   - Notification badge with count
   - Notification list in dashboard
   - Individual notification items

4. Admin can:
   - View published article
   - Edit content if needed
   - Delete article if violates policy
   - Mark notification as read
```

## Running the Migration

### Option 1: Supabase Dashboard
1. Go to **SQL Editor** in Supabase Dashboard
2. Paste contents of `001_create_tables.sql`
3. Click **Execute**

### Option 2: psql Command Line
```bash
psql -h <host> -U <user> -d <database> -f db/migrations/001_create_tables.sql
```

## Post-Migration Setup

### Step 1: Create Initial Categories
```sql
INSERT INTO categories (name, slug) VALUES
  ('Technology', 'tech'),
  ('Business', 'business'),
  ('Politics', 'politics'),
  ('Entertainment', 'entertainment');
```

### Step 2: Create Initial Admin Profile
1. Go to Supabase **Authentication** → **Users**
2. Create a new user with email & password
3. Copy their `user_id`
4. Insert profile:
```sql
INSERT INTO profiles (id, email, role, full_name) VALUES
  ('<user_id>', 'admin@example.com', 'admin', 'Admin Name');
```

### Step 3: Create Editor Profiles
```sql
INSERT INTO profiles (id, email, role, full_name) VALUES
  ('<editor_user_id>', 'editor@example.com', 'editor', 'Editor Name');
```

## File Changes

| File | Change | Purpose |
|------|--------|---------|
| `db/migrations/001_create_tables.sql` | Updated schema | New tables, triggers, RLS policies |
| `admin/dashboard.html` | **NEW** | Admin console: notifications, article management |
| `admin/editor-console.html` | **NEW** | Editor console: create/publish articles |
| `admin/index.html` | Updated | Role-based redirect (admin → dashboard, editor → console) |
| `admin/supabase.js` | Unchanged | Compatible with new schema |

## Testing the Setup

### Test 1: Editor Publishing
1. Login as editor at `admin/index.html`
2. Create article → Click "Publish Article"
3. Check Admin Dashboard → Should see notification

### Test 2: Admin Notification
1. Login as admin
2. Check Notifications badge → Should increment
3. Click notification → Mark as read

### Test 3: Admin Editing
1. Admin opens published article in dashboard
2. Edit content → Save
3. Article updates without creating duplicate notification

## Troubleshooting

### Issue: "Permission denied for schema public"
- **Cause:** User doesn't have RLS permissions
- **Fix:** Check profile exists and role is set correctly

### Issue: Notifications not appearing
- **Cause:** Trigger might not have fired
- **Fix:** Check article status changed from non-published to 'published' (not 'draft' → 'published')

### Issue: "profiles" table doesn't exist
- **Cause:** Migration wasn't executed
- **Fix:** Run migration script again; check for SQL errors

## Rollback (if needed)

```sql
-- Drop new tables/triggers
DROP TRIGGER IF EXISTS trg_set_updated_at ON articles;
DROP TRIGGER IF EXISTS trg_notify_admins_on_publish ON articles;
DROP FUNCTION IF EXISTS set_updated_at();
DROP FUNCTION IF EXISTS notify_admins_on_publish();
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS article_tags;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS profiles;

-- Recreate old users table (if absolutely necessary)
-- Not recommended - migrate data instead
```

## References
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

## Questions?
Contact: [project-maintainer-email]
