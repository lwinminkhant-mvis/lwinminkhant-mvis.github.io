-- Run this once in Supabase SQL Editor.
-- It creates the tables only when missing and enables data isolation with RLS.
-- Existing tables are not altered or dropped.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  business_info text,
  currency text default 'MMK',
  date_format text default 'YYYY-MM-DD',
  default_daily_wage numeric(12,2) default 0,
  theme text default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  employee_code text,
  phone text,
  email text,
  address text,
  daily_wage numeric(12,2) not null default 0,
  employment_status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text,
  description text,
  budget numeric(14,2) default 0,
  start_date date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  assigned_date date not null default current_date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(project_id, employee_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  date date not null,
  status text not null check (status in ('present','absent','half-day')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  expense_date date not null,
  category text not null,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_month text not null,
  working_days numeric(6,2) not null default 0,
  gross_wages numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  net_wages numeric(14,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payment_date date not null,
  payment_type text not null default 'payment',
  amount numeric(14,2) not null check (amount >= 0),
  balance numeric(14,2) not null default 0,
  status text not null default 'paid',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.expenses enable row level security;
alter table public.payroll enable row level security;
alter table public.payments enable row level security;

create or replace function public.is_owner(owner_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select auth.uid() = owner_id $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_owner') then
    create policy profiles_owner on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
  end;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='employees' and policyname='employees_owner') then
    create policy employees_owner on public.employees for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='projects_owner') then
    create policy projects_owner on public.projects for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_assignments' and policyname='project_assignments_owner') then
    create policy project_assignments_owner on public.project_assignments for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance' and policyname='attendance_owner') then
    create policy attendance_owner on public.attendance for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='expenses' and policyname='expenses_owner') then
    create policy expenses_owner on public.expenses for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payroll' and policyname='payroll_owner') then
    create policy payroll_owner on public.payroll for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='payments_owner') then
    create policy payments_owner on public.payments for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));
  end;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
