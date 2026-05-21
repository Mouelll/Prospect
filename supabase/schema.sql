create extension if not exists "uuid-ossp";

create type prospect_status as enum (
  'to_contact', 'contacted', 'in_discussion',
  'quote_sent', 'client', 'archived'
);

create type interaction_type as enum (
  'email', 'call', 'linkedin', 'meeting', 'other'
);

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sector text,
  naf_code text,
  city text,
  region text,
  postal_code text,
  website text,
  email text,
  phone text,
  siret text unique,
  siren text,
  employees_count integer,
  instagram_handle text,
  google_rating real,
  has_video boolean default false,
  score integer check (score between 1 and 5),
  status prospect_status not null default 'to_contact',
  source text,
  notes text,
  next_followup_date date,
  last_contact_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table contacts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  first_name text,
  last_name text not null,
  role text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now()
);

create table interactions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  type interaction_type not null,
  date timestamptz not null default now(),
  content text not null,
  created_at timestamptz default now()
);

create table templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'email',
  subject text,
  body text not null,
  created_at timestamptz default now()
);

-- RLS désactivé (app solo, pas d'auth)
alter table companies disable row level security;
alter table contacts disable row level security;
alter table interactions disable row level security;
alter table templates disable row level security;

-- Index
create index on companies(status);
create index on companies(sector);
create index on companies(next_followup_date);
create index on contacts(company_id);
create index on interactions(company_id);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger companies_updated_at
  before update on companies
  for each row execute function update_updated_at();
