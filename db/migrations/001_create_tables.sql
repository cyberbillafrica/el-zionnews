-- =====================================================
-- EL-ZION NEWS CMS DATABASE SCHEMA
-- Supabase PostgreSQL
-- =====================================================

create extension if not exists "pgcrypto";

-- =====================================================
-- PROFILES
-- Linked to Supabase Auth
-- =====================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role text not null default 'editor'
    check (role in ('editor','admin','super_admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- =====================================================
-- CATEGORIES
-- =====================================================

create table if not exists categories (
  id serial primary key,
  name text not null,
  slug text unique not null,
  description text,
  sort_order integer not null default 0
);

create index if not exists idx_categories_sort_order
on categories(sort_order);

-- =====================================================
-- TAGS
-- =====================================================

create table if not exists tags (
  id serial primary key,
  name text unique not null
);

-- =====================================================
-- ARTICLES
-- =====================================================

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  slug text unique not null,

  excerpt text,
  body text,

  featured_image text,

  category_id integer references categories(id) on delete restrict,

  author_id uuid references profiles(id) on delete set null,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'review',
        'published',
        'archived'
      )
    ),

  featured boolean not null default false,
  breaking boolean not null default false,

  view_count integer not null default 0,

  source_name text,
  source_url text,

  meta_title text,
  meta_description text,
  meta_keywords text,
  meta_image text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists idx_articles_slug
on articles(slug);

create index if not exists idx_articles_category
on articles(category_id);

create index if not exists idx_articles_status
on articles(status);

create index if not exists idx_articles_published_at
on articles(published_at desc);

create index if not exists idx_articles_viewcount
on articles(view_count desc);

create index if not exists idx_articles_featured
on articles(featured);

create index if not exists idx_articles_breaking
on articles(breaking);

-- =====================================================
-- ARTICLE TAGS
-- Many-to-Many Relationship
-- =====================================================

create table if not exists article_tags (
  article_id uuid references articles(id) on delete cascade,
  tag_id integer references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

create index if not exists idx_article_tags_article
on article_tags(article_id);

create index if not exists idx_article_tags_tag
on article_tags(tag_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),

  admin_id uuid not null
    references profiles(id)
    on delete cascade,

  article_id uuid not null
    references articles(id)
    on delete cascade,

  notification_type text not null default 'article_published',

  message text,

  is_read boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_admin
on notifications(admin_id);

create index if not exists idx_notifications_read
on notifications(is_read);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at on articles;

create trigger trg_set_updated_at
before update on articles
for each row
execute function set_updated_at();

-- =====================================================
-- ADMIN NOTIFICATION TRIGGER
-- Fires on INSERT or UPDATE when article becomes published
-- =====================================================

create or replace function notify_admins_on_publish()
returns trigger
language plpgsql
as $$
declare
  admin_record record;
begin

  if (
    new.status = 'published'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from 'published'
    )
  ) then

    for admin_record in
      select id
      from profiles
      where role in ('admin','super_admin')
    loop

      insert into notifications (
        admin_id,
        article_id,
        notification_type,
        message
      )
      values (
        admin_record.id,
        new.id,
        'article_published',
        'New article published: ' || new.title
      );

    end loop;

  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_on_publish
on articles;

create trigger trg_notify_admins_on_publish
after insert or update
on articles
for each row
execute function notify_admins_on_publish();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table profiles enable row level security;
alter table articles enable row level security;
alter table notifications enable row level security;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

create policy "profiles_select_self"
on profiles
for select
using (id = auth.uid());

create policy "profiles_insert_self"
on profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_self"
on profiles
for update
using (id = auth.uid());

create policy "profiles_admin_select"
on profiles
for select
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role in ('admin','super_admin')
  )
);

create policy "profiles_admin_update"
on profiles
for update
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role in ('admin','super_admin')
  )
);

-- =====================================================
-- ARTICLES POLICIES
-- =====================================================

create policy "public_read_published_articles"
on articles
for select
using (status = 'published');

create policy "author_read_own_articles"
on articles
for select
using (author_id = auth.uid());

create policy "admin_read_all_articles"
on articles
for select
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role in ('admin','super_admin')
  )
);

create policy "author_create_articles"
on articles
for insert
with check (
  author_id = auth.uid()
);

create policy "author_update_own_articles"
on articles
for update
using (
  author_id = auth.uid()
);

create policy "admin_update_all_articles"
on articles
for update
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role in ('admin','super_admin')
  )
);

-- Editors archive instead of delete
create policy "admin_delete_articles"
on articles
for delete
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role in ('admin','super_admin')
  )
);

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

create policy "notifications_read_own"
on notifications
for select
using (
  admin_id = auth.uid()
);

create policy "notifications_update_own"
on notifications
for update
using (
  admin_id = auth.uid()
);

-- =====================================================
-- INITIAL CATEGORIES FOR EL-ZION NEWS
-- =====================================================

insert into categories (name, slug, sort_order)
values
('Business', 'business', 1),
('Crypto', 'crypto', 2),
('Culture', 'culture', 3),
('Education', 'education', 4),
('Entertainment', 'entertainment', 5),
('Estate', 'estate', 6),
('Finance', 'finance', 7),
('Health', 'health', 8),
('Inspirational', 'inspirational', 9),
('International', 'international', 10),
('Jobs', 'jobs', 11),
('Local Politics', 'local-politics', 12),
('Religion', 'religion', 13),
('Scholarship', 'scholarship', 14),
('Security', 'security', 15),
('Sports', 'sports', 16),
('Tech', 'tech', 17),
('Transport', 'transport', 18)
on conflict (slug) do nothing;