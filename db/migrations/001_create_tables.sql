-- Migration: Create core CMS tables for el-zionnews
-- Run this in Supabase SQL editor or via psql connected to your Supabase database

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- profiles table (linked to Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role text not null default 'editor', -- editor, admin, super_admin
  avatar_url text,
  created_at timestamptz not null default now()
);

-- categories
create table if not exists categories (
  id serial primary key,
  name text not null,
  slug text unique not null
);

-- tags
create table if not exists tags (
  id serial primary key,
  name text unique not null
);

-- articles
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category_id integer references categories(id) on delete set null,
  body text,
  excerpt text,
  featured_image text,
  featured boolean not null default false,
  breaking boolean not null default false,
  view_count integer not null default 0,
  -- SEO / Social sharing metadata (WhatsApp, Facebook, Twitter)
  meta_title text,
  meta_description text,
  meta_keywords text,
  meta_image text,
  status text not null default 'draft', -- draft, review, published, archived
  author_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_category on articles(category_id);
create index if not exists idx_articles_viewcount on articles(view_count);

-- article_tags (many-to-many)
create table if not exists article_tags (
  article_id uuid references articles(id) on delete cascade,
  tag_id integer references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- notifications table (for admin alerts when editors publish)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  notification_type text not null default 'article_published', -- article_published, article_updated, article_deleted
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_admin on notifications(admin_id);
create index if not exists idx_notifications_is_read on notifications(is_read);

-- Trigger to update `updated_at` timestamp on updates
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_set_updated_at
  before update on articles
  for each row
  execute function set_updated_at();

-- Trigger to notify admins when an editor publishes an article
create or replace function notify_admins_on_publish()
returns trigger language plpgsql as $$
declare
  admin_id uuid;
begin
  if new.status = 'published' and old.status != 'published' then
    -- Insert notification for each admin
    for admin_id in select id from profiles where role in ('admin', 'super_admin') loop
      insert into notifications (admin_id, article_id, notification_type, message)
      values (admin_id, new.id, 'article_published', 'New article published: ' || new.title);
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_notify_admins_on_publish
  after update on articles
  for each row
  execute function notify_admins_on_publish();

-- Basic Row Level Security (RLS) policies for Supabase
-- Improved: use `profiles` (tied to auth.users) and explicit admin policies.

-- Enable RLS where appropriate
alter table articles enable row level security;
alter table profiles enable row level security;

-- Public can select published articles
create policy "public_select_published_articles"
  on articles for select
  using (status = 'published');

-- Authors can select their own articles (drafts, review, etc.)
create policy "author_select_own" on articles for select
  using (author_id = auth.uid());

-- Admins can select any article
create policy "admin_select_any" on articles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- Authenticated users can insert articles with their own author_id
create policy "authenticated_insert_articles" on articles for insert
  with check (author_id = auth.uid());

-- Authors can update their own articles
create policy "author_update_own" on articles for update
  using (author_id = auth.uid());

-- Admins can update any article
create policy "admin_update_any" on articles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- Authors can delete their own articles
create policy "author_delete_own" on articles for delete
  using (author_id = auth.uid());

-- Admins can delete any article
create policy "admin_delete_any" on articles for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- For profiles table: allow users to manage their own profile
create policy "profiles_select_self" on profiles for select
  using (id = auth.uid());

create policy "profiles_update_self" on profiles for update
  using (id = auth.uid());

create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());

-- Admins can select/update any profile
create policy "profiles_admin_select" on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

create policy "profiles_admin_update" on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- Notifications: users can only view and update their own notifications
alter table notifications enable row level security;

create policy "notifications_select_own" on notifications for select
  using (admin_id = auth.uid());

create policy "notifications_update_own" on notifications for update
  using (admin_id = auth.uid());

-- Notes:
-- - After running migrations, create initial categories and at least one profile with role 'admin' (tied to an auth user).
-- - Adjust role names and policy checks to match your application's RBAC needs.
