-- Labour Book Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'Labour Book',
  business_info text,
  currency text not null default 'MMK',
  date_format text not null default 'YYYY-MM-DD',
  theme text not null default 'light',
  default_daily_wage numeric(14,2) not null default 0,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  employee_code text not null,
  full_name text not null,
  phone text,
  address text,
  position text,
  daily_wage numeric(14,2) not null default 0,
  hourly_wage numeric(14,2) not null default 0,
  start_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, employee_code),
  constraint employees_full_name_not_blank check (length(btrim(full_name)) > 0),
  constraint employees_wages_nonnegative check (daily_wage >= 0 and hourly_wage >= 0)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  location text,
  start_date date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(btrim(name)) > 0),
  constraint projects_status check (status in ('active','completed','on_hold'))
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(owner_id, project_id, employee_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  date date not null,
  status text not null,
  hours_worked numeric(5,2) not null default 0,
  wage_applicable numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, employee_id, date),
  constraint attendance_status check (status in ('present','absent','half_day')),
  constraint attendance_hours_valid check (hours_worked >= 0 and hours_worked <= 24),
  constraint attendance_wage_nonnegative check (wage_applicable >= 0)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(14,2) not null,
  date date not null,
  category text not null,
  description text,
  project_id uuid references public.projects(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  payment_method text,
  receipt_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_title_not_blank check (length(btrim(title)) > 0),
  constraint expenses_amount_nonnegative check (amount >= 0),
  constraint expense_category check (category in ('Labour','Transportation','Fuel','Food','Equipment','Materials','Maintenance','Accommodation','Other'))
);

create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  full_days integer not null default 0,
  half_days integer not null default 0,
  total_hours numeric(7,2) not null default 0,
  gross_wages numeric(14,2) not null default 0,
  additional_earnings numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  advance_amount numeric(14,2) not null default 0,
  net_wages numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, employee_id, period_start, period_end),
  constraint payroll_period_valid check (period_end >= period_start),
  constraint payroll_values_nonnegative check (
    full_days >= 0 and half_days >= 0 and total_hours >= 0 and gross_wages >= 0
    and additional_earnings >= 0 and deductions >= 0 and advance_amount >= 0
    and paid_amount >= 0
  )
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  payroll_id uuid references public.payroll(id) on delete restrict,
  payment_date date not null,
  amount numeric(14,2) not null,
  payment_method text not null,
  payment_type text not null default 'payment',
  description text,
  reference_number text,
  created_at timestamptz not null default now(),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_type_check check (payment_type in ('payment','advance'))
);

alter table public.payments
  add column if not exists payment_type text not null default 'payment';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_type_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_type_check
      check (payment_type in ('payment','advance'));
  end;
end $$;

create index if not exists idx_employees_owner on public.employees(owner_id);
create index if not exists idx_projects_owner on public.projects(owner_id);
create index if not exists idx_attendance_owner_date on public.attendance(owner_id,date);
create index if not exists idx_attendance_employee on public.attendance(employee_id);
create index if not exists idx_expenses_owner_date on public.expenses(owner_id,date);
create index if not exists idx_expenses_project on public.expenses(project_id);
create index if not exists idx_payroll_owner_period on public.payroll(owner_id,period_start,period_end);
create index if not exists idx_payments_owner_date on public.payments(owner_id,payment_date);

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.expenses enable row level security;
alter table public.payroll enable row level security;
alter table public.payments enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage own employees" on public.employees
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own projects" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own assignments" on public.project_assignments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own attendance" on public.attendance
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own expenses" on public.expenses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own payroll" on public.payroll
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own payments" on public.payments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,business_name)
  values (new.id,coalesce(new.raw_user_meta_data->>'business_name','Labour Book'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();
